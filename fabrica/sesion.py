"""Fábrica en modo sesión: las preguntas las redacta Claude dentro de una sesión de Claude Code (sin API ni coste extra)
y pasan por EXACTAMENTE los mismos controles que el modo API (fabrica/motor.py): validación determinista, duplicados,
juez semántico (aquí un revisor en la sesión), cola de revisión, métricas y paradas automáticas.

  1) python3 -m fabrica.sesion plan --oposicion auxiliar-administrativo-age --lote 10
       → fabrica/sesion/<lote>/plan.json: artículos elegidos por cobertura, tipos y dificultad pedidos, texto oficial vigente,
         preguntas ya existentes (para no repetir) e instrucciones de redacción.
  2) Redactar fabrica/sesion/<lote>/candidatas.json: [{"s": nº de hueco, "tipo", "dif", "q", "o": [4], "a", "cita", "apartado", "exp", "confianza"}]
     python3 -m fabrica.sesion validar
       → revision.json: las que pasan los controles deterministas, con el artículo y las preguntas parecidas para el juez.
  3) El revisor escribe veredictos.json: [{"r": id, "respaldada", "unica", "clara", "duplicada_de", "motivo"}]
     python3 -m fabrica.sesion cerrar
       → VALID al banco (final del fichero, id siguiente); REVIEW_REQUIRED y REJECTED a datos/candidatas/; lote y métricas.
"""
import argparse, collections, datetime, json, os, sys

R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, R)
from fabrica import motor as MO, fuente as F, banco as B, generador as G, metricas as M  # noqa: E402

DIR = os.path.join(R, "fabrica", "sesion")
ABIERTO = os.path.join(DIR, "abierto.json")
MODELOS = {"generador": "claude-opus-5-5 (sesión de Claude Code)", "juez": "claude-haiku-4-5 (revisor en la sesión)"}


def carpeta():
    ab = B.leer(ABIERTO, None)
    if not ab:
        raise SystemExit("No hay ningún lote de sesión abierto. Empieza con: python3 -m fabrica.sesion plan …")
    return os.path.join(DIR, ab["lote"]), ab


def siguiente_lote(estado):
    """Número del siguiente lote de sesión: nunca repite uno ya usado en el estado, en la cola ni en el banco."""
    import glob, re
    usados = [int(x["id"][1:]) for x in estado.get("lotes", []) if re.fullmatch(r"S\d+", x.get("id", ""))]
    for f in glob.glob(os.path.join(R, "datos", "preguntas-*.json")) + glob.glob(os.path.join(R, "datos", "candidatas", "*.json")):
        usados += [int(q["lote"][1:]) for q in B.leer(f, []) if re.fullmatch(r"S\d+", str(q.get("lote", "")))]
    return max(usados, default=0) + 1


def plan(a, cfg):
    if os.path.exists(ABIERTO) and not a.forzar:
        raise SystemExit(f"Ya hay un lote abierto ({B.leer(ABIERTO, {})['lote']}): ciérralo antes (o --forzar para descartarlo).")
    estado = B.leer(MO.ESTADO, {"lotes": [], "pausa": None})
    if estado.get("pausa") and not a.reanudar:
        raise SystemExit(f"GENERATION_PAUSED: {estado['pausa']['motivo']}. Corrige la causa y usa --reanudar.")
    if a.reanudar and estado.get("pausa"):
        estado.setdefault("pausas_levantadas", []).append(dict(estado["pausa"], levantada=MO.hoy())); estado["pausa"] = None
        B.escribir(MO.ESTADO, estado)
    oposiciones = MO.resolver_oposiciones(a.oposicion, cfg)
    fuentes, banco = F.Fuentes(), B.Banco()
    temas, _ = MO.planificar(cfg, fuentes, oposiciones)
    slots = MO.elegir(temas, fuentes, banco, cfg, max(1, min(a.lote, cfg["lote"]["tamano_maximo"] * 4)), set())
    if not slots:
        raise SystemExit("No quedan artículos con capacidad en los temas con déficit de esas oposiciones.")
    dist = cfg["dificultad_por_oposicion"].get(oposiciones[0], cfg["dificultad_por_defecto"])
    ct, cd = collections.Counter(), collections.Counter()
    lote = f"S{siguiente_lote(estado):05d}"
    huecos = []
    for k, s in enumerate(slots):
        ley = fuentes.ley(s["slug"])
        pedidas = MO.pedir_tipos(ley, s["n"], s["k"], ct, cd, cfg, dist)
        rel = ley.relacionados(s["n"]) if any(p["tipo"] == "relacion_articulos" for p in pedidas) else []
        art = ley.arts[s["n"]]
        huecos.append({"s": k, "ley": s["slug"], "norma": f"{ley.nombre} ({ley.id})", "version": ley.version, "art": s["n"],
                       "ubicacion": " · ".join(x for x in (art.get("bloque"), art.get("capitulo")) if x),
                       "tema": {"oposicion": s["tema"]["oposicion"], "indice": s["tema"]["indice"], "tema": s["tema"]["tema"], "titulo": s["tema"]["titulo"]},
                       "tema_arts": s["tema"]["arts"].get(s["slug"], []), "k": s["k"],
                       "pedidas": [dict(p, descripcion=G.TIPOS_DESC[p["tipo"]]) for p in pedidas],
                       "texto": ley.texto[s["n"]], "relacionados": {r: ley.texto[r] for r in rel},
                       "existentes": [e["q"] for e in banco.existentes(s["slug"], s["n"])][:40]})
    os.makedirs(os.path.join(DIR, lote), exist_ok=True)
    B.escribir(os.path.join(DIR, lote, "plan.json"), {"lote": lote, "fecha": MO.hoy(), "oposiciones": oposiciones,
               "instrucciones": G.SISTEMA_GENERADOR + "\n- Dificultad: 1 = dato explícito; 2 = relación, diferencia, excepción o aplicación; "
               "3 = varias condiciones, comparación o aplicación práctica.\n- Si un tipo pedido no encaja con el contenido del artículo, sustitúyelo por otro "
               "de la lista de tipos que sí encaje (sin forzar); la dificultad final la fija el tipo. Marca confianza «media» o «baja» solo "
               "cuando dudes de la respuesta, no por el encaje del tipo.\n- Formato de salida: candidatas.json = lista de "
               "{\"s\", \"tipo\", \"dif\", \"q\", \"o\" (4), \"a\" (0-3), \"cita\", \"apartado\", \"exp\", \"confianza\"}; como máximo k por hueco.",
               "huecos": huecos})
    B.escribir(ABIERTO, {"lote": lote, "fecha": MO.hoy()})
    print(f"Lote {lote}: {sum(h['k'] for h in huecos)} preguntas en {len(huecos)} artículos → {os.path.relpath(os.path.join(DIR, lote, 'plan.json'), R)}")


def _slot(h, temas_por_id):
    t = {"oposicion": h["tema"]["oposicion"], "indice": h["tema"]["indice"], "titulo": h["tema"]["titulo"], "arts": {h["ley"]: h["tema_arts"]}}
    return {"slug": h["ley"], "n": h["art"], "k": h["k"], "tema": t}


def validar(a, cfg):
    d, ab = carpeta()
    p = B.leer(os.path.join(d, "plan.json"), None)
    cands = B.leer(os.path.join(d, "candidatas.json"), None)
    if cands is None:
        raise SystemExit(f"Falta {os.path.relpath(os.path.join(d, 'candidatas.json'), R)}")
    fuentes, banco = F.Fuentes(), B.Banco()
    por_hueco = collections.defaultdict(list)
    for c in cands:
        por_hueco[c.get("s")].append(c)
    items, estado_val = [], []
    for h in p["huecos"]:
        slot = _slot(h, None)
        res, parecidas, idx = MO.validar_candidatas(slot, por_hueco.get(h["s"], []), fuentes, banco, cfg)
        estado_val.append({"s": h["s"], "res": res, "idx": idx})
        for k, i in enumerate(idx):
            q = res[i][0]
            items.append({"r": f"{h['s']}.{k}", "norma": h["norma"], "art": h["art"], "texto": h["texto"], "q": q["q"], "o": q["o"],
                          "a": q["a"], "cita": q["cita"],
                          "parecidas": [{"id": e.get("id"), "q": e["q"], "respuesta": e["o"][e["a"]]} for e in parecidas.get(i, [])]})
    B.escribir(os.path.join(d, "validacion.json"), estado_val)
    B.escribir(os.path.join(d, "revision.json"), {"instrucciones": G.SISTEMA_JUEZ + " Para cada item devuelve {\"r\", \"respaldada\", "
               "\"unica\", \"clara\", \"duplicada_de\" (id de una parecida que pregunte lo mismo, o \"\"), \"motivo\"} en veredictos.json (lista).",
               "items": items})
    rech = sum(1 for v in estado_val for i, x in enumerate(v["res"]) if i not in v["idx"])
    print(f"{len(cands)} candidatas · {len(items)} pasan los controles deterministas · {rech} rechazadas → revision.json")
    for v in estado_val:
        for i, (q, probs, _) in enumerate(v["res"]):
            if i not in v["idx"]:
                print(f"  hueco {v['s']}: {'; '.join(m for _, m in probs)[:160]} :: {q.get('q', '')[:70]}")


def cerrar(a, cfg):
    d, ab = carpeta()
    p = B.leer(os.path.join(d, "plan.json"), None)
    val = B.leer(os.path.join(d, "validacion.json"), None)
    ver = B.leer(os.path.join(d, "veredictos.json"), None)
    if val is None or ver is None:
        raise SystemExit("Faltan validacion.json (paso validar) o veredictos.json (revisor).")
    fuentes, banco = F.Fuentes(), B.Banco()
    estado = B.leer(MO.ESTADO, {"lotes": [], "pausa": None})
    por_r = {v.get("r"): v for v in ver if isinstance(v, dict)}
    huecos = {h["s"]: h for h in p["huecos"]}
    cnt = collections.Counter()
    for v in val:
        h = huecos[v["s"]]; slot = _slot(h, None); ley = fuentes.ley(h["ley"])
        res = [[q, [tuple(x) for x in probs], dup] for q, probs, dup in v["res"]]
        verd = [dict(por_r[f"{v['s']}.{k}"], i=k) for k in range(len(v["idx"])) if f"{v['s']}.{k}" in por_r]
        for est, q, motivos, dup in MO.aplicar_veredictos(res, v["idx"], verd):
            cnt["generadas"] += 1; cnt[est] += 1; cnt["duplicadas"] += bool(dup and est == "REJECTED")
            banco.anadir(h["ley"], MO.ficha(q, est, motivos, ley, h["art"], slot, MODELOS, p["lote"], cfg, generador="fabrica-v1-sesion"))
    banco.guardar()
    reg = {"id": p["lote"], "fecha": datetime.datetime.now().isoformat(timespec="seconds"), "modo": "sesion", "oposiciones": p["oposiciones"],
           "articulos": len(p["huecos"]), "generadas": cnt["generadas"], "VALID": cnt["VALID"], "REVIEW_REQUIRED": cnt["REVIEW_REQUIRED"],
           "REJECTED": cnt["REJECTED"], "duplicadas": cnt["duplicadas"], "tokens": {}, "coste_usd": 0.0,
           "nota_coste": "redactadas en una sesión de Claude Code: incluido en la suscripción, sin coste de API", "segundos": 0, "incidencias": []}
    estado["lotes"].append(reg)
    motivo = MO.comprobar_calidad(estado, cfg) if cnt["generadas"] else "lote sin ninguna pregunta"
    if motivo:
        estado["pausa"] = {"estado": "GENERATION_PAUSED", "motivo": motivo, "lote": p["lote"], "fecha": MO.hoy()}
    B.escribir(MO.ESTADO, estado)
    M.guardar(M.calcular(estado))
    os.remove(ABIERTO)
    print(f"{p['lote']}: {cnt['generadas']} generadas · {cnt['VALID']} VALID · {cnt['REVIEW_REQUIRED']} a revisión · {cnt['REJECTED']} rechazadas ({cnt['duplicadas']} duplicadas)")
    if motivo:
        print(f"GENERATION_PAUSED: {motivo}")
        return 3
    return 0


def main(argv=None):
    ap = argparse.ArgumentParser(description="Fábrica de preguntas · modo sesión (sin API)")
    ap.add_argument("paso", choices=["plan", "validar", "cerrar"])
    ap.add_argument("--oposicion", default="todas")
    ap.add_argument("--lote", type=int, default=10)
    ap.add_argument("--reanudar", action="store_true")
    ap.add_argument("--forzar", action="store_true")
    a = ap.parse_args(argv)
    cfg = json.load(open(MO.CFG, encoding="utf-8"))
    return {"plan": plan, "validar": validar, "cerrar": cerrar}[a.paso](a, cfg) or 0


if __name__ == "__main__":
    sys.exit(main())
