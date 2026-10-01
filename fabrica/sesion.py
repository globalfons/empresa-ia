"""Fábrica en modo sesión: las preguntas las redacta Claude dentro de una sesión de Claude Code (sin API ni coste extra)
y pasan por EXACTAMENTE los mismos controles que el modo API (fabrica/motor.py): validación determinista, duplicados,
juez semántico (aquí un revisor en la sesión), cola de revisión, métricas y paradas automáticas.

  1) python3 -m fabrica.sesion plan --oposicion auxiliar-administrativo-age --lote 10
       → fabrica/sesion/<lote>/plan.json: artículos elegidos por cobertura, tipos y dificultad pedidos, texto oficial vigente,
         preguntas ya existentes (para no repetir) e instrucciones de redacción.
  2) Redactar fabrica/sesion/<lote>/candidatas.json: [{"s": nº de hueco, "tipo", "dif", "q", "o": [4], "a", "cita", "apartado", "exp", "confianza"}]
     python3 -m fabrica.sesion validar
       → revision.json: las que pasan los controles deterministas, con el artículo y las preguntas parecidas para el juez.
  3) El juez (un revisor independiente) recibe EXACTAMENTE prompt_juez.txt, generado desde la política congelada del lote
     (fabrica/politica_juez, versionada y de solo lectura), y escribe veredictos.json:
     [{"r": id, "respaldada", "unica", "clara", "duplicada_de", "motivo"}]
     python3 -m fabrica.sesion cerrar
       → VALID al banco (final del fichero, id siguiente); REVIEW_REQUIRED y REJECTED a datos/candidatas/; lote, archivo y métricas.

Separación de funciones: el redactor solo escribe candidatas.json; no puede fijar estados ni veredictos (campos reservados →
REJECTED), ni escribir veredictos antes de la revisión, ni cambiar la política (huella congelada al planificar: si cambia,
validar/cerrar se bloquean, se registra el intento y no se publica). El cierre no tiene ninguna opción para alterar veredictos:
una REVIEW_REQUIRED solo se publica con aprobación humana explícita (python3 -m fabrica.revision).
"""
import argparse, collections, datetime, json, os, shutil, sys

R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, R)
from fabrica import motor as MO, fuente as F, banco as B, generador as G, metricas as M, politica as P  # noqa: E402

DIR = os.path.join(R, "fabrica", "sesion")
ABIERTO = os.path.join(DIR, "abierto.json")
ARCHIVO = os.path.join(R, "fabrica", "estado", "archivo")
MODELOS = {"generador": "claude-opus-5-5 (sesión de Claude Code)", "juez": "claude-haiku-4-5 (revisor en la sesión)"}
REDACTOR = {"version": "redactor-sesion-v2", "fichero": os.path.join(R, "fabrica", "prompts", "redactor-sesion-v2.txt")}
VEREDICTO_CAMPOS = {"r", "respaldada", "unica", "clara", "duplicada_de", "motivo"}


def sha(ruta):
    return P.huella(ruta) if os.path.exists(ruta) else None


def sesion_id():
    return os.environ.get("CLAUDE_CODE_REMOTE_SESSION_ID") or os.environ.get("CLAUDE_CODE_SESSION_ID") or "local"


def sin_veredictos_ajenos(d, lote):
    """El juez trabaja en la carpeta del lote: no puede haber en ella veredictos de otra evaluación que pueda copiar o seguir."""
    import glob
    otros = [os.path.basename(f) for f in glob.glob(os.path.join(d, "veredictos*")) if os.path.basename(f) != "veredictos.json"]
    if otros:
        bloquear(f"hay veredictos de otra evaluación en la carpeta del juez ({', '.join(otros)}): archívalos fuera antes de juzgar",
                 "veredictos_ajenos", lote)


def bloquear(msg, tipo, lote):
    P.incidencia(tipo, msg, R, lote)
    raise P.PoliticaBloqueada(f"BLOQUEADO ({tipo}): {msg}. No se publica nada.")


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
    politica = P.congelar(R)  # la política activa queda congelada para todo el lote (bloquea si el fichero no es el registrado)
    oposiciones = MO.resolver_oposiciones(a.oposicion, cfg)
    fuentes, banco = F.Fuentes(), B.Banco()
    temas, _ = MO.planificar(cfg, fuentes, oposiciones)
    agotados = {tuple(k.split("|", 1)) for k, v in estado.get("omitidos", {}).items() if v >= 2}  # artículos que no dan más preguntas
    slots = MO.elegir(temas, fuentes, banco, cfg, max(1, min(a.lote, cfg["lote"]["tamano_maximo"] * 4)), agotados)
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
        huecos.append({"s": k, "ley": s["slug"], "norma": f"{ley.nombre} ({ley.id})", "version": ley.version, "art": s["n"], "idioma": ley.idioma,
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
    with open(os.path.join(DIR, lote, "prompt_redactor.txt"), "w", encoding="utf-8") as f:
        f.write(open(REDACTOR["fichero"], encoding="utf-8").read().replace("{LOTE}", lote))
    B.escribir(os.path.join(DIR, lote, "politica.json"), politica)
    B.escribir(ABIERTO, {"lote": lote, "fecha": MO.hoy(), "politica": politica, "session_id": sesion_id(),
                         "generator_prompt_version": REDACTOR["version"], "generator_prompt_sha256": sha(REDACTOR["fichero"])})
    print(f"Lote {lote}: {sum(h['k'] for h in huecos)} preguntas en {len(huecos)} artículos → {os.path.relpath(os.path.join(DIR, lote, 'plan.json'), R)}")


def _slot(h, temas_por_id):
    t = {"oposicion": h["tema"]["oposicion"], "indice": h["tema"]["indice"], "titulo": h["tema"]["titulo"], "arts": {h["ley"]: h["tema_arts"]}}
    return {"slug": h["ley"], "n": h["art"], "k": h["k"], "tema": t}


def validar(a, cfg):
    d, ab = carpeta()
    pol = P.verificar(ab.get("politica"), R, ab["lote"])
    sin_veredictos_ajenos(d, ab["lote"])
    if os.path.exists(os.path.join(d, "veredictos.json")):
        bloquear("veredictos.json existe antes de la revisión: solo el juez lo escribe, después de validar", "veredicto_anticipado", ab["lote"])
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
    c = pol["componentes"]
    B.escribir(os.path.join(d, "revision.json"), {"instrucciones": c["sistema"] + c["formato_revision"], "items": items})
    with open(os.path.join(d, "prompt_juez.txt"), "w", encoding="utf-8") as f:
        f.write(P.prompt_revisor(pol, ab["lote"]))
    ab.update(revision_sha256=sha(os.path.join(d, "revision.json")), candidatas_sha256=sha(os.path.join(d, "candidatas.json")),
              prompt_juez_sha256=sha(os.path.join(d, "prompt_juez.txt")))
    B.escribir(ABIERTO, ab)
    rech = sum(1 for v in estado_val for i, x in enumerate(v["res"]) if i not in v["idx"])
    print(f"{len(cands)} candidatas · {len(items)} pasan los controles deterministas · {rech} rechazadas → revision.json")
    print(f"Juez: pásale EXACTAMENTE {os.path.relpath(os.path.join(d, 'prompt_juez.txt'), R)} (política {pol['version']})")
    for v in estado_val:
        for i, (q, probs, _) in enumerate(v["res"]):
            if i not in v["idx"]:
                print(f"  hueco {v['s']}: {'; '.join(m for _, m in probs)[:160]} :: {q.get('q', '')[:70]}")


def comprobar_veredictos(ver, rev, lote):
    """Veredictos tal como los escribe el juez: lista, solo los campos del juez, un veredicto por item, sin ids ajenos."""
    if not isinstance(ver, list):
        bloquear("veredictos.json no es una lista", "veredicto_invalido", lote)
    rs = {i["r"] for i in rev["items"]}
    vistos = set()
    for v in ver:
        if not isinstance(v, dict) or set(v) - VEREDICTO_CAMPOS:
            bloquear(f"veredicto con campos no permitidos {sorted(set(v) - VEREDICTO_CAMPOS) if isinstance(v, dict) else v}", "veredicto_invalido", lote)
        if v.get("r") not in rs or v["r"] in vistos:
            bloquear(f"veredicto para un item inexistente o repetido: {v.get('r')}", "veredicto_invalido", lote)
        if not all(isinstance(v.get(k), bool) for k in ("respaldada", "unica", "clara")):
            bloquear(f"veredicto {v['r']} sin respaldada/unica/clara booleanos", "veredicto_invalido", lote)
        vistos.add(v["r"])


def resultado_juez(v):
    if v is None:
        return "SIN_VEREDICTO"
    if v.get("duplicada_de"):
        return "REJECTED"
    return "VALID" if v.get("respaldada") and v.get("unica") and v.get("clara") else "REVIEW_REQUIRED"


def archivar(d, lote):
    """Copia auditable del lote (lo que vio y devolvió el juez); revision.json sin el texto del artículo (está en datos/)."""
    dst = os.path.join(ARCHIVO, lote)
    os.makedirs(dst, exist_ok=True)
    for f in ("candidatas.json", "validacion.json", "veredictos.json", "politica.json", "prompt_juez.txt", "prompt_redactor.txt"):
        if os.path.exists(os.path.join(d, f)):
            shutil.copyfile(os.path.join(d, f), os.path.join(dst, f))
    rev = B.leer(os.path.join(d, "revision.json"), {"items": []})
    B.escribir(os.path.join(dst, "revision.json"), dict(rev, items=[{k: x for k, x in i.items() if k != "texto"} for i in rev["items"]]))


def cerrar(a, cfg):
    d, ab = carpeta()
    lote = ab["lote"]
    pol = P.verificar(ab.get("politica"), R, lote)  # política intacta desde el plan; si no, se bloquea sin publicar
    sin_veredictos_ajenos(d, lote)
    p = B.leer(os.path.join(d, "plan.json"), None)
    val = B.leer(os.path.join(d, "validacion.json"), None)
    ver = B.leer(os.path.join(d, "veredictos.json"), None)
    if val is None or ver is None:
        raise SystemExit("Faltan validacion.json (paso validar) o veredictos.json (revisor).")
    for f, k in (("revision.json", "revision_sha256"), ("candidatas.json", "candidatas_sha256"), ("prompt_juez.txt", "prompt_juez_sha256")):
        if ab.get(k) != sha(os.path.join(d, f)):
            bloquear(f"{f} ha cambiado después de validar", "lote_alterado", lote)
    rev = B.leer(os.path.join(d, "revision.json"), {"items": []})
    comprobar_veredictos(ver, rev, lote)
    fuentes, banco = F.Fuentes(), B.Banco()
    estado = B.leer(MO.ESTADO, {"lotes": [], "pausa": None})
    por_r = {v.get("r"): v for v in ver if isinstance(v, dict)}
    huecos = {h["s"]: h for h in p["huecos"]}
    cnt = collections.Counter()
    for h in p["huecos"]:  # huecos sin ninguna candidata: el redactor no encontró preguntas que no fueran forzadas
        if not any(v["s"] == h["s"] and v["res"] for v in val):
            clave = f"{h['ley']}|{h['art']}"
            estado.setdefault("omitidos", {})[clave] = estado.get("omitidos", {}).get(clave, 0) + 1
    ahora = datetime.datetime.now().isoformat(timespec="seconds")
    for v in val:
        h = huecos[v["s"]]; slot = _slot(h, None); ley = fuentes.ley(h["ley"])
        res = [[q, [tuple(x) for x in probs], dup] for q, probs, dup in v["res"]]
        verd = [dict(por_r[f"{v['s']}.{k}"], i=k) for k in range(len(v["idx"])) if f"{v['s']}.{k}" in por_r]
        del_juez = {i: por_r.get(f"{v['s']}.{k}") for k, i in enumerate(v["idx"])}
        for i, (est, q, motivos, dup) in enumerate(MO.aplicar_veredictos(res, v["idx"], verd)):
            cnt["generadas"] += 1; cnt[est] += 1; cnt["duplicadas"] += bool(dup and est == "REJECTED")
            vj = del_juez.get(i)
            traza = {"batch_id": lote, "session_id": ab.get("session_id"), "opposition_id": h["tema"]["oposicion"],
                     "topic_id": f"{h['tema']['oposicion']}#{h['tema']['indice']}", "article": h["art"], "source_document": ley.id,
                     "source_url": ley.url, "source_version": ley.version, "generator": "fabrica-v1-sesion",
                     "generator_model": "claude-opus-5-5", "generator_prompt_version": ab.get("generator_prompt_version"),
                     "judge": "revisor independiente (subagente de la sesión)", "judge_model": "claude-haiku-4-5",
                     "judge_policy_version": pol["version"], "judge_policy_sha256": pol["sha256"],
                     "judge_verdict": resultado_juez(vj) if i in del_juez else "NO_JUZGADA (rechazada por la validación determinista)",
                     "judge_flags": {k: vj.get(k) for k in ("respaldada", "unica", "clara", "duplicada_de")} if vj else None,
                     "judge_reason": (vj or {}).get("motivo", ""), "validation_status": est, "created_at": ab.get("fecha"),
                     "validated_at": ahora, "reviewed_at": None, "published_at": ahora if est == "VALID" else None}
            banco.anadir(h["ley"], MO.ficha(q, est, motivos, ley, h["art"], slot, MODELOS, p["lote"], cfg, generador="fabrica-v1-sesion", traza=traza))
    banco.guardar()
    reg = {"id": p["lote"], "fecha": datetime.datetime.now().isoformat(timespec="seconds"), "modo": "sesion", "oposiciones": p["oposiciones"],
           "articulos": len(p["huecos"]), "generadas": cnt["generadas"], "VALID": cnt["VALID"], "REVIEW_REQUIRED": cnt["REVIEW_REQUIRED"],
           "REJECTED": cnt["REJECTED"], "duplicadas": cnt["duplicadas"], "tokens": {}, "coste_usd": 0.0,
           "nota_coste": "redactadas en una sesión de Claude Code: incluido en la suscripción, sin coste de API", "segundos": 0, "incidencias": [],
           "judge_policy_version": pol["version"], "judge_policy_sha256": pol["sha256"], "session_id": ab.get("session_id"),
           "generator_prompt_version": ab.get("generator_prompt_version"),
           "huellas": {"candidatas": ab.get("candidatas_sha256"), "revision": ab.get("revision_sha256"),
                       "veredictos": sha(os.path.join(d, "veredictos.json")), "prompt_juez": ab.get("prompt_juez_sha256")}}
    estado["lotes"].append(reg)
    motivo = MO.comprobar_calidad(estado, cfg) if cnt["generadas"] else "lote sin ninguna pregunta"
    if motivo:
        estado["pausa"] = {"estado": "GENERATION_PAUSED", "motivo": motivo, "lote": p["lote"], "fecha": MO.hoy()}
    B.escribir(MO.ESTADO, estado)
    M.guardar(M.calcular(estado))
    archivar(d, lote)
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
