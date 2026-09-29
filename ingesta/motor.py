"""Motor de ingesta de fuentes oficiales.
SOURCE → CRAWL → DOWNLOAD → CHANGE DETECTION → PARSE → (cola de extracción) → EXTRACCIÓN → VALIDACIÓN → CATÁLOGO

Uso:
  python3 ingesta/motor.py                 # ejecuta las fuentes que tocan según su frecuencia
  python3 ingesta/motor.py --fuente boe-sumario [--forzar] [--desde AAAA-MM-DD] [--max-docs N]

Política de fallos: una fuente que falla NO borra nada. Se conservan los documentos y datos anteriores,
la fuente se marca como "error" o "inaccesible" con el motivo, y se reintenta con espera creciente (1 h, 2 h, 4 h… hasta su frecuencia).
"""
import sys, os, re, json, datetime, argparse, time, urllib.parse
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import nucleo as N
import parsers as P

def estado_fuentes(): return N.leer("fuentes-estado.json", {})
def documentos(): return N.leer("documentos.json", {})

def guardar_documento(docs, fuente, url, contenido, ctype, meta):
    """Guarda el texto parseado; detecta si es nuevo, ha cambiado o sigue igual (por hash del contenido)."""
    did = N.doc_id(url); h = N.sha256(contenido); t = N.iso(N.ahora())
    prev = docs.get(did)
    if prev and prev["sha256"] == h:
        prev["retrieved_at"] = t; prev["estado"] = "sin_cambios"; return prev, "sin_cambios"
    tipo, res = P.parsear(contenido, ctype, url)
    carpeta = os.path.join(N.DOCS, fuente["id"]); os.makedirs(carpeta, exist_ok=True)
    ruta = os.path.join(carpeta, did + ".txt")
    open(ruta, "w").write(res["texto"])
    cambio = "modificado" if prev else "nuevo"
    d = dict(prev or {}, **{
        "doc_id": did, "fuente": fuente["id"], "url": url, "domain": urllib.parse.urlparse(url).netloc, "tipo": tipo,
        "titulo": meta.get("titulo") or res.get("titulo", ""), "published_at": meta.get("published_at") or (prev or {}).get("published_at"),
        "retrieved_at": t, "updated_at": t, "sha256": h, "bytes": len(contenido), "texto": os.path.relpath(ruta, N.RAIZ),
        "estado": cambio, "extraccion": "pendiente", "meta": {**(prev or {}).get("meta", {}), **meta.get("meta", {})},
    })
    docs[did] = d
    with open(os.path.join(N.EST, "cambios.jsonl"), "a") as f:
        f.write(json.dumps({"t": t, "fuente": fuente["id"], "doc_id": did, "url": url, "cambio": cambio,
                            "sha_anterior": (prev or {}).get("sha256"), "sha_nuevo": h, "titulo": d["titulo"][:200]}, ensure_ascii=False) + "\n")
    return d, cambio

def lista(x):
    """El sumario del BOE puede traer cada nivel como lista, objeto o texto: se normaliza a lista de objetos."""
    if x is None: return []
    return [y for y in (x if isinstance(x, list) else [x]) if isinstance(y, dict)]

# ---------------- Crawlers ----------------
def crawl_boe_api(fuente, est, docs, args):
    """BOE: sumario diario por API de datos abiertos; descarga cada disposición que encaja con los filtros."""
    o = fuente["opciones"]; inc = re.compile(o["incluir"]); exc = re.compile(o["excluir"])
    hoy = datetime.date.today()
    if args.desde: desde = datetime.date.fromisoformat(args.desde)
    elif est.get("cursor"): desde = datetime.date.fromisoformat(est["cursor"]) + datetime.timedelta(1)
    else: desde = hoy - datetime.timedelta(o.get("dias_primera_vez", 30))
    n = {"nuevo": 0, "modificado": 0, "sin_cambios": 0}; d = desde; bajados = 0
    while d <= hoy:
        try:
            b, _, _ = N.http(fuente["url"].format(fecha=d.strftime("%Y%m%d")), accept="application/json")
        except N.ErrorFuente as e:
            if "404" in str(e): d += datetime.timedelta(1); continue  # día sin BOE
            raise
        s = json.loads(b)["data"]["sumario"]
        for diario in lista(s.get("diario")):
            for sec in lista(diario.get("seccion")):
                if sec.get("codigo") not in o["secciones"]: continue
                for dep in lista(sec.get("departamento")):
                    items = [(e.get("nombre", ""), it) for e in lista(dep.get("epigrafe")) for it in lista(e.get("item"))]
                    items += [("", it) for it in lista(dep.get("item"))]
                    for epi, it in items:
                        if not it.get("identificador") or not it.get("titulo"): continue
                        t = it["titulo"]
                        if not inc.search(t) or exc.search(t): continue
                        url = f"https://www.boe.es/diario_boe/txt.php?id={it['identificador']}"
                        if N.doc_id(url) in docs and not args.forzar: continue  # las disposiciones del BOE no cambian
                        if args.max_docs and bajados >= args.max_docs:
                            N.guardar("documentos.json", docs); return n, None  # el cursor no avanza: se sigue ese día la próxima vez
                        try:
                            c, ct, _ = N.http(url, accept="text/html")
                        except N.ErrorFuente as e:
                            N.log("documento_error", fuente=fuente["id"], url=url, error=str(e)); continue
                        _, cambio = guardar_documento(docs, fuente, url, c, ct, {"titulo": t, "published_at": d.isoformat(),
                            "meta": {"boe_id": it["identificador"], "departamento": dep.get("nombre", ""), "epigrafe": epi, "seccion": sec["codigo"]}})
                        n[cambio] += 1; bajados += 1
        est["cursor"] = d.isoformat()
        N.guardar("documentos.json", docs)  # progreso guardado día a día
        d += datetime.timedelta(1)
    return n, None

def crawl_listado(fuente, est, docs, args, render=False):
    """Webs oficiales: descarga el listado (HTTP o navegador), detecta cambios y baja los documentos enlazados que encajan."""
    b, ct, final = (N.navegador if render else N.http)(fuente["url"])
    h = N.sha256(b)
    n = {"nuevo": 0, "modificado": 0, "sin_cambios": 0}
    if est.get("hash") == h and not args.forzar: return n, h
    _, res = P.parsear(b, ct, final)
    inc = re.compile(fuente["opciones"].get("incluir", "."))
    vistos, enl = set(), []
    for txt, u in res["enlaces"]:
        if u in vistos or not u.startswith("http") or not (inc.search(txt) or inc.search(u)): continue
        vistos.add(u); enl.append((txt, u))
    for txt, u in enl[: fuente["opciones"].get("max_documentos", 30)]:
        try:
            c, ct2, fin = N.http(u)
        except N.ErrorFuente as e:
            N.log("documento_error", fuente=fuente["id"], url=u, error=str(e)); continue
        _, cambio = guardar_documento(docs, fuente, fin, c, ct2, {"titulo": txt[:300], "meta": {"listado": fuente["url"]}})
        n[cambio] += 1
    return n, h

CRAWLERS = {"boe_api": crawl_boe_api, "http": crawl_listado, "playwright": lambda f, e, d, a: crawl_listado(f, e, d, a, render=True)}

def toca(f, e, forzar):
    if forzar: return True
    prox = e.get("proximo_escaneo")
    return not prox or N.ahora() >= datetime.datetime.fromisoformat(prox.replace("Z", "+00:00"))

def ejecutar(args):
    est_all, docs = estado_fuentes(), documentos()
    for f in sorted(N.fuentes(), key=lambda x: x["prioridad"]):
        if args.fuente and f["id"] != args.fuente: continue
        if not f.get("activo") or f["crawler"] not in CRAWLERS: continue
        e = est_all.setdefault(f["id"], {"estado": "pendiente", "errores_consecutivos": 0})
        if not toca(f, e, args.forzar or bool(args.fuente)): continue
        t0 = time.time(); e["ultimo_escaneo"] = N.iso(N.ahora())
        try:
            n, h = CRAWLERS[f["crawler"]](f, e, docs, args)
            e.update({"estado": "ok", "ultimo_exito": e["ultimo_escaneo"], "errores_consecutivos": 0, "ultimo_error": None,
                      "ultimo_resultado": n, "proximo_escaneo": N.iso(N.ahora() + datetime.timedelta(hours=f["frecuencia_horas"]))})
            if h: e["hash"] = h
            N.log("fuente_ok", fuente=f["id"], **n, segundos=round(time.time() - t0, 1))
            print(f"✔ {f['id']}: {n}")
        except Exception as ex:
            tipo = getattr(ex, "tipo", "error"); e["errores_consecutivos"] = e.get("errores_consecutivos", 0) + 1
            espera = min(f["frecuencia_horas"], 2 ** (e["errores_consecutivos"] - 1))
            e.update({"estado": "inaccesible" if tipo in ("inaccesible", "robots") else "error", "ultimo_error": str(ex)[:300],
                      "proximo_escaneo": N.iso(N.ahora() + datetime.timedelta(hours=espera))})
            N.log("fuente_error", fuente=f["id"], tipo=tipo, error=str(ex)[:300])
            print(f"✘ {f['id']}: {tipo}: {str(ex)[:160]} (se conservan los datos anteriores; reintento en {espera} h)")
        e["documentos"] = sum(1 for d in docs.values() if d["fuente"] == f["id"])
        e["ultima_duracion_s"] = round(time.time() - t0, 1)
        N.guardar("fuentes-estado.json", est_all); N.guardar("documentos.json", docs)

if __name__ == "__main__":
    a = argparse.ArgumentParser(); a.add_argument("--fuente"); a.add_argument("--forzar", action="store_true")
    a.add_argument("--desde"); a.add_argument("--max-docs", type=int, default=0)
    ejecutar(a.parse_args())
