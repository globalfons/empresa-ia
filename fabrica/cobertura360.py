"""Content Coverage 360: auditoría REAL de cobertura de contenido de una oposición con Opposition Engine (Mossos 360), objetivos
razonados, plan de generación por tandas y «siguientes tandas» para las fábricas. Todo se calcula desde los datos del repositorio:

  conocimientos  catalogo/perfiles/<id>.json (temario oficial, recuentos por estado) + fabrica.cobertura (capacidad por apartado
                 con texto oficial, apartados sin preguntas, sobreexplotados, bloqueados) + datos/examens-oficials/<id>.json
  aptitud        web/assets/aptitud.js (generadores; espacio real muestreado ejecutando el generador con node) + catalogo/psicotecnicos.json
  competencias   catalogo/competencias/<id>.json + fabrica/competencias/<lote>/evaluacion.json (modelo del juez)
  entrevista     catalogo/entrevista/<id>.json + fabrica.entrevista.combinar (veredicto vigente de cada escenario de cada lote)
  idiomas/física catalogo/perfiles/<id>.json → motor360 (datos OFFICIAL_VERIFIED por convocatoria)

Estados que nunca se mezclan: OFFICIAL_EXAM (preguntas de exámenes oficiales), OFFICIAL_VERIFIED (datos de las bases),
TESTLEY_GENERATED / TESTLEY_TRAINING (contenido propio), REVIEW_REQUIRED, DEPRECATED/OUTDATED.

Los OBJETIVOS no son una cifra arbitraria: se derivan de la estructura oficial (temas, apartados, formato del examen), del peso
histórico de cada tema en los exámenes oficiales, de la capacidad del texto oficial de cada apartado (no se fuerzan preguntas) y de
parámetros de entrenamiento de TestLey declarados aquí (PARAMETROS), que NUNCA se presentan como requisitos oficiales.

  python3 -m fabrica.cobertura360 informe [oposicion]          → documentacion/MOSSOS_360_CONTENT_COVERAGE.md, _GENERATION_PLAN.md y .json
  python3 -m fabrica.cobertura360 siguientes [oposicion] [--n 3] [--area KNOWLEDGE] [--prioridad P0]
"""
import collections, json, math, os, subprocess, sys

R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, R)
from catalogo import perfil as PF  # noqa: E402
from fabrica import cobertura as CV  # noqa: E402

# Parámetros de entrenamiento de TestLey (no oficiales): cada uno con su porqué en el informe.
PARAMETROS = {
    "simulacros_disjuntos": 10,      # simulacros completos sin repetir ninguna pregunta TestLey, con el reparto histórico de temas
    "min_por_apartado": 2,           # cobertura mínima por apartado con texto oficial: una pregunta sencilla y una de aplicación
    "min_test_tema": 10,             # por debajo de 10 preguntas servibles (TestLey + oficiales) no se puede hacer ni un test del tema
    "entrevista_por_competencia": 6, # 1 escenario por competencia en cada simulación de entrevista → 6 simulaciones sin repetir
    "entrevista_situacionales": 2,   # de ellos, al menos 2 situacionales («què faries…»)
    "situaciones_por_competencia": 6,
    "tanda_inicial": None,           # se lee de fabrica/config.json → lote.tamano_inicial
}
NOMBRE_APT = {"numerico": "numerical", "abstracto": "abstract", "espacial": "spatial", "perceptivo": "perceptive", "verbal": "verbal"}


def leer(rel, defecto=None):
    p = os.path.join(R, rel)
    return json.load(open(p, encoding="utf-8")) if os.path.exists(p) else defecto


def estado_fabrica():
    return CV.estado_fabrica()


# ------------------------------------------------------------------ KNOWLEDGE
def conocimientos(oid, perfil, cob):
    ex = leer(f"datos/examens-oficials/{oid}.json", {"examenes": []})["examenes"]
    of = collections.defaultdict(collections.Counter)
    sin_apartado = collections.Counter()
    for e in ex:
        for q in e["preguntes"]:
            ap = q.get("apartat_guia")
            st = q.get("verification_status") or "VALID"
            if not ap:
                sin_apartado[st] += 1
                continue
            of[".".join(ap.split(".")[:2])][st] += 1
    dist = (perfil.get("examen") or {}).get("simulacro", {}).get("distribucion") or {}
    sim = (perfil.get("examen") or {}).get("simulacro") or {}
    n_sim = sim.get("preguntas") or 30
    cobt = {t["tema"]: t for t in cob["temas"]}
    tot_testley = sum(t["preguntas"]["TESTLEY_GENERATED"] for t in perfil["temario"])
    filas = []
    for t in perfil["temario"]:
        c = cobt.get(t["id"], {})
        pq = t["preguntas"]
        w = dist.get(t["id"], 0)
        apartados_fuente = len([a for a in t["articulos"]]) - len(c.get("apartados_bloqueados", []))
        capacidad = c.get("capacidad", 0)
        por_simulacros = math.ceil(n_sim * w * PARAMETROS["simulacros_disjuntos"])
        minimo = PARAMETROS["min_por_apartado"] * apartados_fuente
        objetivo = min(capacidad, max(minimo, por_simulacros))
        valid = pq["TESTLEY_GENERATED"]
        oficial_valid = of[t["id"]]["VALID"]
        share_t = valid / tot_testley if tot_testley else 0
        concentracion = valid >= 10 and w and share_t > 2 * w
        faltan = max(0, objetivo - valid)
        if c.get("tipo_gap") == "FUENTE" or (not t["documentos"]):
            prio, motivo = "P1", "sin fuente oficial de referencia: primero hay que fijar la fuente (no se genera nada)"
        elif valid + oficial_valid < PARAMETROS["min_test_tema"]:
            prio, motivo = "P0", f"menos de {PARAMETROS['min_test_tema']} preguntas servibles (TestLey + oficiales): no hay ni un test del tema"
        elif valid < 0.5 * objetivo:
            prio, motivo = "P1", "menos de la mitad del objetivo"
        elif faltan:
            prio, motivo = "P2", "por debajo del objetivo"
        else:
            prio, motivo = "P3", "objetivo cubierto"
        filas.append({
            "tema": t["id"], "titulo": t["titulo"], "bloque": t.get("bloque"), "apartados": len(t["articulos"]),
            "apartados_con_fuente": apartados_fuente, "apartados_bloqueados": c.get("apartados_bloqueados", []),
            "apartados_sin_preguntas": c.get("articulos_sin_preguntas", []), "sobreexplotados": c.get("articulos_sobreexplotados", []),
            "capacidad": capacidad, "peso_examenes": w, "TESTLEY_VALID": valid, "REVIEW_REQUIRED": pq["REVIEW_REQUIRED"],
            "DEPRECATED": pq["DEPRECATED"] + pq.get("OUTDATED", 0), "OFFICIAL_EXAM_VALID": oficial_valid,
            "OFFICIAL_EXAM_REVIEW": of[t["id"]]["REVIEW_REQUIRED"], "OFFICIAL_EXAM_OUTDATED": of[t["id"]]["OUTDATED"],
            "dificultad": c.get("dificultad", {}), "tipos_minimos_ausentes": c.get("tipos_minimos_ausentes", []),
            "objetivo": objetivo, "objetivo_por_simulacros": por_simulacros, "objetivo_minimo_apartados": minimo,
            "faltan": faltan, "concentracion_excesiva": bool(concentracion), "cuota_testley": round(share_t, 3),
            "prioridad": prio, "motivo": motivo})
    return {"temas": filas, "oficial_sin_apartado": dict(sin_apartado), "examenes_oficiales": len(ex),
            "examenes": [{"id": e["id"], "preguntas": len(e["preguntes"]),
                          "VALID": sum(1 for q in e["preguntes"] if (q.get("verification_status") or "VALID") == "VALID")} for e in ex],
            "formato_simulacro": {k: sim.get(k) for k in ("preguntas", "minutos", "penalizacion", "origen")}}


# ------------------------------------------------------------------ APTITUDE
def muestreo_aptitud(n=2000):
    """Ejecuta el generador real (node) y cuenta ejercicios distintos y fallos de verificación por (categoría, subtipo, dificultad)."""
    js = ("import {cargar} from '" + os.path.join(R, "tests", "js", "entorno.mjs") + "';"
          "const A=cargar(['web/assets/aptitud.js']).ctx.TLAptitud;const o={};"
          "for(const c of A.CATEGORIAS)for(const s of A.SUBTIPOS[c])for(const d of [1,2,3]){const v=new Set();let e=0;"
          f"for(let i=0;i<{n};i++){{try{{const x=A.ejercicio(c,s,d,i*104729+17,'mossos-esquadra','ca');"
          "v.add(JSON.stringify([x.prompt,x.stimulus,x.options]));if(A.verificar(x).length)e++}catch(_){e++}}"
          "o[c+'/'+s+'/'+d]={distintos:v.size,errores:e}}console.log(JSON.stringify(o))")
    try:
        out = subprocess.run(["node", "--input-type=module", "-e", js], cwd=R, capture_output=True, text=True, timeout=300)
        return json.loads(out.stdout), n
    except Exception:  # noqa: BLE001 (sin node: el informe lo dice, no inventa cifras)
        return None, n


def aptitud(oid, perfil, muestreo=True):
    m = perfil["motor360"]["modulos"]["aptitude"]
    gen = (m.get("contenido") or {}).get("generador") or {}
    psico = ((leer("catalogo/psicotecnicos.json", {}) or {}).get("pruebas") or {}).get(oid) or {}
    banco = {k: len(v) for k, v in (psico.get("bancos") or {}).items()}
    mu, n = muestreo_aptitud() if muestreo else (None, 0)
    filas = []
    for cat in (m.get("oficial") or {}).get("categorias") or []:
        subt = (gen.get("subtipos") or {}).get(cat, [])
        dist = {f"{s}/d{d}": (mu or {}).get(f"{cat}/{s}/{d}") for s in subt for d in (1, 2, 3)} if mu else {}
        minimo = min((x["distintos"] for x in dist.values() if x), default=0)
        errores = sum(x["errores"] for x in dist.values() if x)
        huecos = []
        if not subt:
            huecos.append("sin generador")
        if len(subt) == 1:
            huecos.append("un solo formato de ejercicio")
        if cat == "verbal":
            huecos.append("solo formatos formales (series de letras, orden alfabético): sin vocabulario, sinónimos, antónimos, analogías ni comprensión; "
                          "las bases solo dicen «aptitud verbal», no publican formatos")
        prio = "P1" if cat == "verbal" else ("P2" if len(subt) <= 1 else "P3")
        filas.append({"categoria": cat, "area": NOMBRE_APT.get(cat, cat), "subtipos": subt, "dificultades": gen.get("dificultades", []),
                      "banco_oficial_o_revisado": banco.get(cat, 0), "muestreo": dist, "min_distintos_por_combinacion": minimo,
                      "errores_verificacion": errores, "huecos": huecos, "prioridad": prio})
    return {"oficial": {k: (m.get("oficial") or {}).get(k) for k in ("preguntas", "minutos", "penalizacion", "minimo_apte", "categorias", "nota",
                                                                     "verification_status")},
            "generador": {k: gen.get(k) for k in ("fichero", "verification_status", "source_type")}, "semillas_muestreadas": n,
            "categorias": filas}


# ------------------------------------------------------------------ COMPETENCIES / INTERVIEW
def competencias(oid, perfil):
    lista = perfil["motor360"]["modulos"]["competency"]["oficial"]["lista"]
    pub = leer(f"catalogo/competencias/{oid}.json", {}) or {}
    modelos = set()
    for l in pub.get("lotes", []):
        ev = leer(f"fabrica/competencias/{l}/evaluacion.json", {}) or {}
        modelos |= {t.get("judge_model", ev.get("judge_model", "?")).split(" ")[0] for t in ev.get("tandas", []) if t.get("estado") == "ACEPTADA"}
    filas = []
    for c in lista:
        esc = [e for e in pub.get("escenarios", []) if e.get("competency_id") == c["id"]]
        ficha = [f for f in pub.get("competencias", []) if f["id"] == c["id"]]
        valid = sum(1 for e in esc if e.get("verification_status") == "VALID")
        rr = sum(1 for i in pub.get("cola_revision", []) if i.startswith(f"esc-{c['id']}-"))
        obj = PARAMETROS["situaciones_por_competencia"]
        filas.append({"id": c["id"], "nombre": c["nombre"], "perfil_valid": int(any(f.get("verification_status") == "VALID" for f in ficha)),
                      "situaciones": len(esc), "VALID": valid, "REVIEW_REQUIRED": rr,
                      "formatos": dict(collections.Counter(e.get("formato") for e in esc)),
                      "autoevaluacion": sum(len(f.get("autoevaluacion") or []) for f in ficha),
                      "objetivo": obj, "faltan": max(0, obj - valid)})
    recal = bool(modelos) and not any("sonnet" in m for m in modelos)
    return {"lotes": pub.get("lotes", []), "modelos_juez": sorted(modelos), "requiere_recalibracion": recal, "competencias": filas}


def entrevista(oid, perfil):
    from fabrica import entrevista as E
    lista = perfil["motor360"]["modulos"]["competency"]["oficial"]["lista"]
    pub = leer(f"catalogo/entrevista/{oid}.json", {}) or {}
    pol = E.politica()
    ver, cand = {}, {}
    for l in pub.get("lotes", []):
        aud = leer(f"fabrica/entrevista/{l}/auditoria.json", {}) or {}
        for i, v in E.combinar(l, pol).items():
            ver[i] = "REVIEW_REQUIRED" if v["verdict"] == "VALID" and i in aud.get("retener", {}) else v["verdict"]
        for e in (leer(f"fabrica/entrevista/{l}/candidatas.json", {}) or {}).get("escenarios", []):
            cand[e["id"]] = e
    sustituidos = {e.get("sustituye") for e in cand.values() if e.get("sustituye") and ver.get(e["id"]) == "VALID"}
    filas = []
    for c in lista:
        mios = [e for e in cand.values() if e["competency_ids"][0] == c["id"]]
        valid = [e for e in pub.get("escenarios", []) if e["competency_ids"][0] == c["id"]]
        rr = [e["id"] for e in mios if ver.get(e["id"], "REVIEW_REQUIRED") == "REVIEW_REQUIRED"]
        sit = sum(1 for e in valid if e.get("tipo") == "situacional")
        obj = PARAMETROS["entrevista_por_competencia"]
        falta_sit = max(0, PARAMETROS["entrevista_situacionales"] - sit)
        faltan = max(obj - len(valid), falta_sit)
        filas.append({"id": c["id"], "nombre": c["nombre"], "escenarios": len(mios), "VALID": len(valid),
                      "REVIEW_REQUIRED": len(rr), "review_ids": rr, "review_sustituidos": sorted(set(rr) & sustituidos),
                      "situacionales_valid": sit, "secundaria_en": sum(1 for e in pub.get("escenarios", []) if c["id"] in e["competency_ids"][1:]),
                      "objetivo": obj, "faltan": faltan,
                      "prioridad": "P0" if len(valid) < 3 else ("P1" if faltan else "P3")})
    return {"lotes": pub.get("lotes", []), "politica": pol["version"], "modelo_referencia": pol.get("modelo_referencia"), "competencias": filas}


# ------------------------------------------------------------------ LANGUAGE / PHYSICAL / SIMULATIONS
def idiomas(perfil):
    l = perfil["motor360"]["modulos"]["language"]["oficial"]
    return {"catala": l.get("catala"), "idiomas_voluntarios": l.get("idiomas_voluntarios"), "contenido_testley": 0,
            "nota": "TestLey no tiene contenido de catalán ni de idiomas: todo lo listado es OFFICIAL_VERIFIED de las bases."}


def fisica(perfil):
    f = perfil["motor360"]["modulos"]["physical"]["oficial"] or {}
    return {"pruebas": [{k: p.get(k) for k in ("id", "nombre", "unidad", "mejor", "intentos", "barem", "carga_kg", "tiempo_max_s", "cita")} for p in f.get("pruebas", [])],
            "barems": {s: {k: len(v) for k, v in b.items()} for s, b in (f.get("barems") or {}).items()},
            "verification_status": f.get("verification_status"), "call_id": f.get("call_id"), "fuente": f.get("fuente"),
            "otros": {k: v for k, v in f.items() if k not in ("pruebas", "barems", "citas", "fuente", "documento", "call_id", "verification_status", "citas_no_encontradas")}}


def simulaciones(k, ent, apt):
    fmt = k["formato_simulacro"]
    n = fmt.get("preguntas") or 30
    temas = [t for t in k["temas"] if t["peso_examenes"]]
    por_tema = {t["tema"]: (t["TESTLEY_VALID"] / (n * t["peso_examenes"])) for t in temas}
    disjuntos_testley = math.floor(min(por_tema.values())) if por_tema else 0
    limitantes = sorted(por_tema, key=por_tema.get)[:5]
    pool_valid = sum(t["TESTLEY_VALID"] for t in k["temas"])
    pool_of = sum(t["OFFICIAL_EXAM_VALID"] for t in k["temas"]) + k["oficial_sin_apartado"].get("VALID", 0)
    disjuntos_mixtos = math.floor(min((t["TESTLEY_VALID"] + t["OFFICIAL_EXAM_VALID"]) / (n * t["peso_examenes"]) for t in temas)) if temas else 0
    examenes_completos = sum(1 for e in k["examenes"] if e["VALID"] >= n)
    min_ent = min((c["VALID"] for c in ent["competencias"]), default=0)
    return {"conocimientos": {"formato": fmt, "simulacros_testley_disjuntos_con_reparto_oficial": disjuntos_testley,
                              "temas_limitantes": limitantes, "simulacros_disjuntos_testley_mas_oficiales": disjuntos_mixtos,
                              "simulacros_disjuntos_sin_reparto": (pool_valid + pool_of) // n, "examenes_oficiales_completos": examenes_completos,
                              "examenes_oficiales": len(k["examenes"]), "objetivo": PARAMETROS["simulacros_disjuntos"]},
            "aptitud": {"estado": "práctica cronometrada al ritmo oficial con ejercicios generados (ilimitada); NO es una réplica de la subprueba: "
                                  "las bases no publican el reparto por aptitudes y la verbal es parcial",
                        "generador_ok": all(c["errores_verificacion"] == 0 for c in apt["categorias"])},
            "entrevista": {"simulaciones_sin_repetir": min_ent, "limitante": [c["id"] for c in ent["competencias"] if c["VALID"] == min_ent],
                           "objetivo": PARAMETROS["entrevista_por_competencia"]},
            "prueba_completa_1a": "no disponible: combinaría conocimientos (simulable), aptitudinal (solo práctica) e idiomas (sin contenido)"}


# ------------------------------------------------------------------ OBJETIVOS + TANDAS
def objetivos(k, apt, comp, ent, idi):
    filas = []
    for t in k["temas"]:
        actual = t["TESTLEY_VALID"] + t["REVIEW_REQUIRED"] + t["DEPRECATED"]
        filas.append({"area": "KNOWLEDGE", "subarea": f"{t['tema']} {t['titulo'][:38]}", "actual": actual, "valid": t["TESTLEY_VALID"],
                      "review": t["REVIEW_REQUIRED"], "oficial": t["OFFICIAL_EXAM_VALID"], "objetivo": t["objetivo"], "faltan": t["faltan"],
                      "prioridad": t["prioridad"], "motivo": t["motivo"]})
    for c in apt["categorias"]:
        filas.append({"area": "APTITUDE", "subarea": c["area"], "actual": len(c["subtipos"]), "valid": len(c["subtipos"]), "review": 0,
                      "oficial": c["banco_oficial_o_revisado"], "objetivo": "formatos" if c["categoria"] != "verbal" else "formatos semánticos",
                      "faltan": "; ".join(c["huecos"]) or "—", "prioridad": c["prioridad"],
                      "motivo": f"generador: {len(c['subtipos'])} formatos × 3 dificultades, ≥{c['min_distintos_por_combinacion']} distintos/combinación"})
    for c in comp["competencias"]:
        filas.append({"area": "COMPETENCIES", "subarea": c["id"], "actual": c["situaciones"], "valid": c["VALID"], "review": c["REVIEW_REQUIRED"],
                      "oficial": "nombre", "objetivo": c["objetivo"], "faltan": c["faltan"],
                      "prioridad": "P1" if comp["requiere_recalibracion"] else ("P1" if c["faltan"] else "P3"),
                      "motivo": "juzgadas solo con un modelo que la calibración de entrevista mostró laxo: rejuzgar con el de referencia"
                      if comp["requiere_recalibracion"] else "—"})
    for c in ent["competencias"]:
        filas.append({"area": "INTERVIEW", "subarea": c["id"], "actual": c["escenarios"], "valid": c["VALID"], "review": c["REVIEW_REQUIRED"],
                      "oficial": "nombre", "objetivo": c["objetivo"], "faltan": c["faltan"], "prioridad": c["prioridad"],
                      "motivo": f"{c['situacionales_valid']} situacionales VALID (mín. {PARAMETROS['entrevista_situacionales']})"})
    filas.append({"area": "LANGUAGE", "subarea": "català (C1)", "actual": 0, "valid": 0, "review": 0, "oficial": "requisito y estructura de la prueba",
                  "objetivo": "—", "faltan": "todo el contenido de práctica", "prioridad": "P2",
                  "motivo": "obligatoria y eliminatoria solo sin C1 acreditado; producto aparte (redacción, sintaxis, comprensión, oral)"})
    filas.append({"area": "LANGUAGE", "subarea": "idiomes voluntaris", "actual": 0, "valid": 0, "review": 0, "oficial": "6 preguntas por idioma, máx. 2, 1,5 p",
                  "objetivo": "—", "faltan": "comprensión oral (audio)", "prioridad": "P3", "motivo": "mérito voluntario; requiere audio"})
    filas.append({"area": "PHYSICAL", "subarea": "registro y barems", "actual": 0, "valid": 0, "review": 0, "oficial": "pruebas y barems verificados",
                  "objetivo": "motor (Fase 4)", "faltan": "Physical Engine", "prioridad": "P1", "motivo": "no es contenido: es la Fase 4 (no iniciada)"})
    return filas


def tandas(oid, k, cob, apt, comp, ent):
    cfg = CV.cfg()
    tam = cfg["lote"]["tamano_inicial"]
    pausa = estado_fabrica()
    out = []
    # 0) Fuentes: no se genera nada sobre apartados sin texto oficial
    bloqueados = [t for t in k["temas"] if t["apartados_bloqueados"]] + [t for t in k["temas"] if t["prioridad"] == "P1" and "fuente" in t["motivo"]]
    if bloqueados:
        out.append({"id": "MOSSOS-SOURCES-001", "area": "KNOWLEDGE", "prioridad": "P0", "tipo": "fuentes",
                    "temas": sorted({t["tema"] for t in bloqueados}),
                    "subtemas": sorted({a for t in bloqueados for a in t["apartados_bloqueados"]}),
                    "cantidad": 0, "accion": "verificar o fijar la fuente oficial de los apartados bloqueados (texto oficial en catalogo/fuentes, "
                                             "fabrica.fuente); el tema D no tiene documento de referencia oficial: no se genera hasta tenerlo",
                    "validacion": "catalogo/perfil.py → verificar_bloque / fabrica.fuente", "judge": "—", "publicacion": "no aplica",
                    "ejecutable": False, "bloqueo": "requiere fuentes oficiales (trabajo de ingesta, no generación)"})
    # 1) Conocimientos: P0 → P1 → P2, por prioridad del CoverageEngine; tandas de tamano_inicial con sus necesidades concretas
    nec = collections.defaultdict(list)
    for n in cob["necesidades"]:
        nec[n["tema"]].append(n)
    orden = {"P0": 0, "P1": 1, "P2": 2, "P3": 3}
    temas = sorted((t for t in k["temas"] if t["faltan"] and t["prioridad"] in ("P0", "P1", "P2") and nec.get(t["tema"])),
                   key=lambda t: (orden[t["prioridad"]], -t["peso_examenes"], t["tema"]))
    i = 0
    for t in temas:
        restante, cola = t["faltan"], list(nec[t["tema"]])
        while restante > 0 and cola:
            i += 1
            lote, n = [], 0
            while cola and n < min(tam, restante):
                x = dict(cola.pop(0))
                x["n"] = min(x["n"], min(tam, restante) - n)
                lote.append(x)
                n += x["n"]
            out.append({"id": f"MOSSOS-KNOWLEDGE-{i:03d}", "area": "KNOWLEDGE", "prioridad": t["prioridad"], "tipo": "generacion",
                        "temas": [t["tema"]], "subtemas": sorted({a.split(":")[1] for x in lote for a in x["articulos"]}),
                        "cantidad": n, "dificultad": dict(collections.Counter({str(x["dificultad"]): 0 for x in lote}) +
                                                          collections.Counter({str(x["dificultad"]): x["n"] for x in lote})),
                        "tipos": {x["tipo"]: x["n"] for x in lote},
                        "fuente": sorted({a for x in lote for a in x["articulos"]}),
                        "validacion": "fabrica.validacion (estructura, respuesta única, cita literal, duplicados) + fabrica.fuente",
                        "judge": "juez independiente con la política activa (fabrica/politica_juez/registro.json), tandas de solo lectura",
                        "publicacion": "solo VALID por la puerta de la fábrica (fabrica.sesion/motor); REVIEW_REQUIRED a revisión humana",
                        "revision_humana": any(x["revision_humana"] for x in lote),
                        "ejecutable": pausa != "GENERATION_PAUSED", "bloqueo": pausa if pausa == "GENERATION_PAUSED" else None})
            restante -= n
    # 2) Entrevista: competencias por debajo del objetivo (lote de complemento por fabrica.entrevista)
    falt = [c for c in ent["competencias"] if c["faltan"]]
    if falt:
        out.append({"id": "MOSSOS-INTERVIEW-001", "area": "INTERVIEW", "prioridad": min((c["prioridad"] for c in falt), key=orden.get), "tipo": "generacion",
                    "temas": [c["id"] for c in falt], "subtemas": [], "cantidad": sum(c["faltan"] for c in falt),
                    "por_competencia": {c["id"]: c["faltan"] for c in falt},
                    "dificultad": "1-3 (repartida)", "tipos": "conductual y situacional (mín. 2 situacionales por competencia)",
                    "fuente": "nombres oficiales de las competencias (catalogo/preparacion); el contenido es TESTLEY_TRAINING",
                    "validacion": "fabrica.entrevista.validar (reglas v2, sin duplicados con lotes anteriores)",
                    "judge": f"política {ent['politica']} (modelo de referencia: {ent['modelo_referencia']})",
                    "publicacion": "puerta de fabrica.entrevista: VALID del modelo de referencia, ningún veredicto más conservador, sin retención de auditoría",
                    "ejecutable": True, "bloqueo": None})
    # 3) Competencias: recalibración del juez antes de ampliar
    if comp["requiere_recalibracion"]:
        out.append({"id": "MOSSOS-COMPETENCY-REJUDGE-001", "area": "COMPETENCIES", "prioridad": "P1", "tipo": "reevaluacion",
                    "temas": comp["lotes"], "subtemas": [], "cantidad": sum(c["situaciones"] + c["perfil_valid"] for c in comp["competencias"]),
                    "accion": "rejuzgar fichas y situaciones con el modelo de referencia y el mismo prompt congelado (juez-competencias-v1), "
                              "combinación conservadora como en entrevista; no se genera contenido nuevo",
                    "validacion": "fabrica.competencias.validar (sin cambios)", "judge": "Sonnet (referencia) · prompt congelado",
                    "publicacion": "solo VALID del modelo de referencia sin veredicto más conservador", "ejecutable": True, "bloqueo": None})
    # 4) Aptitud verbal semántica
    for c in apt["categorias"]:
        if c["categoria"] == "verbal" and c["huecos"]:
            out.append({"id": "MOSSOS-APTITUDE-VERBAL-001", "area": "APTITUDE", "prioridad": "P1", "tipo": "banco_revisado",
                        "temas": ["verbal"], "subtemas": ["vocabulario/sinónimos", "antónimos", "analogías", "comprensión de frases"],
                        "cantidad": 60, "cantidad_motivo": "3 dificultades × 4 formatos × 5 ítems: mínimo para practicar cada formato sin repetir en una sesión",
                        "fuente": "ninguna oficial (las bases no publican ejercicios): contenido TESTLEY_GENERATED",
                        "validacion": "respuesta única comprobable (diccionario normativo IEC/DIEC como referencia), 4 opciones, sin ambigüedad",
                        "judge": "juez independiente + REVISIÓN HUMANA obligatoria (decisión de la Fase 1: la verbal semántica no se verifica por cálculo)",
                        "publicacion": "solo tras revisión humana", "ejecutable": False, "bloqueo": "requiere revisor humano de catalán"})
    return out


# ------------------------------------------------------------------ INFORME
def auditar(oid="mossos-esquadra", muestreo=True):
    perfil = PF.construir(oid)
    cob = CV.analizar(oid, perfil=perfil)
    k = conocimientos(oid, perfil, cob)
    apt = aptitud(oid, perfil, muestreo)
    comp = competencias(oid, perfil)
    ent = entrevista(oid, perfil)
    idi = idiomas(perfil)
    fis = fisica(perfil)
    sim = simulaciones(k, ent, apt)
    obj = objetivos(k, apt, comp, ent, idi)
    return {"oposicion": oid, "call_id": perfil["motor360"].get("call_id"), "generado": perfil.get("generado"), "estado_fabrica": estado_fabrica(),
            "parametros": dict(PARAMETROS, tanda_inicial=CV.cfg()["lote"]["tamano_inicial"]),
            "knowledge": k, "aptitude": apt, "competencies": comp, "interview": ent, "language": idi, "physical": fis,
            "simulations": sim, "objetivos": obj, "tandas": tandas(oid, k, cob, apt, comp, ent)}


def _t(cab, filas):
    return ["| " + " | ".join(cab) + " |", "|" + "---|" * len(cab)] + ["| " + " | ".join(str(x) for x in f) + " |" for f in filas] + [""]


def md_cobertura(a):
    k, apt, comp, ent, idi, fis, sim = (a[x] for x in ("knowledge", "aptitude", "competencies", "interview", "language", "physical", "simulations"))
    tt = lambda c: sum(t[c] for t in k["temas"])  # noqa: E731
    L = ["# Mossos 360 · Content Coverage (auditoría real)", "",
         f"Generado por `python3 -m fabrica.cobertura360 informe {a['oposicion']}` desde los datos del repositorio (nada a mano). "
         f"Convocatoria {a['call_id']} · fábrica de preguntas: **{a['estado_fabrica']}**.", "",
         "Estados: **OFFICIAL_EXAM** = pregunta de un examen oficial · **OFFICIAL_VERIFIED** = dato de las bases verificado contra el texto · "
         "**TESTLEY_GENERATED/TESTLEY_TRAINING** = contenido propio · **REVIEW_REQUIRED** = no se sirve · **DEPRECATED/OUTDATED** = retirado. "
         "Los objetivos usan parámetros de entrenamiento de TestLey (abajo), nunca requisitos oficiales.", "",
         "## Resumen", ""]
    L += _t(["área", "contenido servido", "en revisión", "retirado", "oficial"], [
        ["Conocimientos", f"{tt('TESTLEY_VALID')} TestLey", tt("REVIEW_REQUIRED"), tt("DEPRECATED"),
         f"{tt('OFFICIAL_EXAM_VALID') + k['oficial_sin_apartado'].get('VALID', 0)} OFFICIAL_EXAM VALID ({k['examenes_oficiales']} exámenes)"],
        ["Aptitud", f"generadores: {sum(len(c['subtipos']) for c in apt['categorias'])} formatos × 3 dificultades", 0, 0, "estructura (80 preguntas, 35 min); sin ejercicios oficiales"],
        ["Competencias", f"{sum(c['VALID'] for c in comp['competencias'])} situaciones + {sum(c['perfil_valid'] for c in comp['competencias'])} fichas",
         sum(c["REVIEW_REQUIRED"] for c in comp["competencias"]), 0, "10 nombres de competencias"],
        ["Entrevista", f"{sum(c['VALID'] for c in ent['competencias'])} escenarios", sum(c["REVIEW_REQUIRED"] for c in ent["competencias"]), 0,
         "objeto de la entrevista y 10 competencias"],
        ["Idiomas", "0", 0, 0, "requisito C1, estructura de la prueba e idiomas voluntarios"],
        ["Física", "— (Fase 4)", 0, 0, f"{len(fis['pruebas'])} pruebas con barems verificados"]])
    L += ["## 1. Knowledge", "",
          f"Formato oficial del simulacro: {k['formato_simulacro']['preguntas']} preguntas, {k['formato_simulacro']['minutos']} min, penalización "
          f"{k['formato_simulacro']['penalizacion']}. Peso de cada tema = su proporción en los exámenes oficiales transcritos. "
          f"Preguntas oficiales sin apartado asignado: {sum(k['oficial_sin_apartado'].values())} ({k['oficial_sin_apartado']}).", ""]
    L += _t(["tema", "apartados (con fuente)", "TestLey VALID", "REVIEW", "DEPRECATED", "oficial VALID / REVIEW / OUTDATED", "peso exámenes", "capacidad",
             "objetivo", "faltan", "prioridad"],
            [[f"{t['tema']} {t['titulo'][:34]}", f"{t['apartados']} ({t['apartados_con_fuente']})", t["TESTLEY_VALID"], t["REVIEW_REQUIRED"], t["DEPRECATED"],
              f"{t['OFFICIAL_EXAM_VALID']} / {t['OFFICIAL_EXAM_REVIEW']} / {t['OFFICIAL_EXAM_OUTDATED']}", f"{t['peso_examenes']:.1%}", t["capacidad"],
              t["objetivo"], t["faltan"], t["prioridad"]] for t in k["temas"]])
    L += ["### Apartados sin cobertura, bloqueados y concentración", ""]
    L += _t(["tema", "apartados sin preguntas", "apartados bloqueados (sin texto oficial)", "sobreexplotados", "concentración excesiva", "tipos mínimos ausentes"],
            [[t["tema"], ", ".join(t["apartados_sin_preguntas"]) or "—", ", ".join(t["apartados_bloqueados"]) or "—", ", ".join(t["sobreexplotados"]) or "—",
              f"sí: {t['cuota_testley']:.0%} del banco TestLey frente a {t['peso_examenes']:.0%} del examen" if t["concentracion_excesiva"] else "—",
              ", ".join(t["tipos_minimos_ausentes"]) or "—"] for t in k["temas"]])
    L += ["## 2. Aptitude", "", f"Oficial (OFFICIAL_VERIFIED): {apt['oficial']['preguntas']} preguntas, {apt['oficial']['minutos']} min, sin penalización, "
          f"mínimo {apt['oficial']['minimo_apte']}; aptitudes: {', '.join(apt['oficial']['categorias'] or [])}. {apt['oficial']['nota']} "
          f"Contenido: generadores deterministas ({apt['generador']['fichero']}, {apt['generador']['verification_status']}, {apt['generador']['source_type']}); "
          f"espacio real medido ejecutando el generador con {apt['semillas_muestreadas']} semillas por combinación.", ""]
    L += _t(["aptitud", "formatos (subtipos)", "dificultades", "banco oficial/revisado", "mín. ejercicios distintos por combinación", "errores de verificación", "huecos", "prioridad"],
            [[c["area"], ", ".join(c["subtipos"]), "1-3", c["banco_oficial_o_revisado"], c["min_distintos_por_combinacion"], c["errores_verificacion"],
              "; ".join(c["huecos"]) or "—", c["prioridad"]] for c in apt["categorias"]])
    L += ["## 3. Competencies", "", f"Lotes publicados: {', '.join(comp['lotes'])} · modelos del juez: {', '.join(comp['modelos_juez'])}" +
          (" · **requiere recalibración** (solo juzgado con un modelo que en entrevista resultó laxo)" if comp["requiere_recalibracion"] else ""), ""]
    L += _t(["competencia oficial", "ficha VALID", "situaciones", "VALID", "REVIEW", "formatos", "ítems de autoevaluación", "objetivo", "faltan"],
            [[c["nombre"], c["perfil_valid"], c["situaciones"], c["VALID"], c["REVIEW_REQUIRED"], c["formatos"], c["autoevaluacion"], c["objetivo"], c["faltan"]]
             for c in comp["competencias"]])
    L += ["## 4. Interview", "", f"Lotes: {', '.join(ent['lotes'])} · política del juez {ent['politica']} (referencia: {ent['modelo_referencia']}).", ""]
    L += _t(["competencia oficial", "escenarios (todos los lotes)", "VALID", "REVIEW", "situacionales VALID", "como secundaria", "objetivo", "faltan", "prioridad"],
            [[c["nombre"], c["escenarios"], c["VALID"], c["REVIEW_REQUIRED"], c["situacionales_valid"], c["secundaria_en"], c["objetivo"], c["faltan"], c["prioridad"]]
             for c in ent["competencias"]])
    rr = [i for c in ent["competencias"] for i in c["review_ids"]]
    L += [f"En REVIEW_REQUIRED (no se sirven): {', '.join(rr) or '—'}. Sustituidos por una versión corregida VALID: "
          f"{', '.join(i for c in ent['competencias'] for i in c['review_sustituidos']) or '—'}.", ""]
    ca, iv = idi["catala"] or {}, idi["idiomas_voluntarios"] or {}
    L += ["## 5. Language", "", "**Oficial (OFFICIAL_VERIFIED, bases " + str(ca.get("call_id")) + "):**", "",
          f"- Català: {ca.get('requisito')}. Exención: {ca.get('exencion')}. Prueba: " +
          "; ".join(f"parte {p['parte']}: {p['contenido']} ({p['minutos']} min)" for p in (ca.get("prueba") or {}).get("partes", [])) +
          f"; resultado {(ca.get('prueba') or {}).get('resultado')}, mínimo {(ca.get('prueba') or {}).get('minimo_pct')} %.",
          f"- Idiomas voluntarios: {iv.get('preguntas_por_idioma')} preguntas por idioma tras una grabación, máximo {iv.get('max_idiomas')} idiomas, "
          f"{iv.get('puntos_por_idioma')} puntos por idioma (máx. {iv.get('maximo')}).", "",
          f"**TestLey:** {idi['contenido_testley']} ejercicios. {idi['nota']}", ""]
    L += ["## 6. Physical (solo documentación; el engine es la Fase 4, no iniciada)", "",
          f"Datos OFFICIAL_VERIFIED ({fis['call_id']}, {fis['fuente']}):", ""]
    L += _t(["prueba", "unidad", "mejor", "intentos", "barem", "condiciones"],
            [[p["nombre"], p["unidad"], p["mejor"], p["intentos"], p["barem"], ", ".join(f"{k}: {v}" for k, v in p.items()
                                                                                    if k in ("carga_kg", "tiempo_max_s") and v) or "—"] for p in fis["pruebas"]])
    L += [f"Barems disponibles (filas por sexo y prueba): {fis['barems']}. Otros datos: {json.dumps(fis['otros'], ensure_ascii=False)}.", "",
          "Lo que necesitará la Fase 4: registro de marcas por prueba e intento; puntuación según el barem de la convocatoria (`call_id`, sexo y edad si "
          "el barem la usa); mejor marca y evolución; objetivo y proximidad al mínimo; recomendaciones de entrenamiento etiquetadas como TestLey (no "
          "oficiales); persistencia local migrable; tests contra los barems verificados. No hace falta contenido generado.", ""]
    s = sim
    L += ["## 7. Simulations", "",
          f"- Conocimientos: {s['conocimientos']['examenes_oficiales_completos']} de {s['conocimientos']['examenes_oficiales']} exámenes oficiales "
          f"con todas sus preguntas VALID (simulacro oficial real). Simulacros TestLey disjuntos respetando el reparto oficial: "
          f"**{s['conocimientos']['simulacros_testley_disjuntos_con_reparto_oficial']}** (limitan: {', '.join(s['conocimientos']['temas_limitantes'])}); "
          f"mezclando TestLey y oficiales: {s['conocimientos']['simulacros_disjuntos_testley_mas_oficiales']}; sin respetar el reparto: "
          f"{s['conocimientos']['simulacros_disjuntos_sin_reparto']}. Objetivo: {s['conocimientos']['objetivo']}.",
          f"- Aptitud: {s['aptitud']['estado']}.",
          f"- Entrevista: {s['entrevista']['simulaciones_sin_repetir']} simulaciones completas sin repetir escenario (limitan: "
          f"{', '.join(s['entrevista']['limitante'])}); objetivo {s['entrevista']['objetivo']}.",
          f"- Primera prueba completa: {s['prueba_completa_1a']}.", ""]
    L += ["## Content targets", "", "Cómo se calcula cada objetivo:",
          f"- **Conocimientos**: objetivo = min(capacidad del texto oficial, max({PARAMETROS['min_por_apartado']} × apartados con fuente, "
          f"⌈{s['conocimientos']['formato']['preguntas']} × peso del tema × {PARAMETROS['simulacros_disjuntos']} simulacros disjuntos⌉)). "
          "Capacidad = lo que admite el texto oficial de cada apartado (fabrica.cobertura); peso = frecuencia histórica en exámenes oficiales; "
          "las OFFICIAL_EXAM no cuentan para el objetivo TestLey (son un banco aparte). P0 = menos de "
          f"{PARAMETROS['min_test_tema']} preguntas servibles en el tema; P1 = menos de la mitad del objetivo o sin fuente; P2 = por debajo; P3 = cubierto.",
          "- **Aptitud**: no hay número oficial por aptitud; el objetivo es de formatos (variedad) con generadores verificados por cálculo.",
          f"- **Competencias**: {PARAMETROS['situaciones_por_competencia']} situaciones por competencia; **Entrevista**: "
          f"{PARAMETROS['entrevista_por_competencia']} escenarios por competencia (una simulación usa uno por competencia), "
          f"≥ {PARAMETROS['entrevista_situacionales']} situacionales.", ""]
    L += _t(["AREA", "SUBAREA", "ACTUAL", "VALID", "REVIEW", "OFICIAL", "OBJETIVO", "FALTAN", "PRIORIDAD"],
            [[o["area"], o["subarea"], o["actual"], o["valid"], o["review"], o["oficial"], o["objetivo"], o["faltan"], o["prioridad"]] for o in a["objetivos"]])
    p0 = [o for o in a["objetivos"] if o["prioridad"] == "P0"]
    L += ["### Huecos P0", ""] + [f"- {o['area']} {o['subarea']}: {o['motivo']}" for o in p0] + ["" if p0 else "- ninguno", ""]
    return "\n".join(L) + "\n"


def md_plan(a):
    L = ["# Mossos 360 · Content Generation Plan", "",
         f"Generado por `python3 -m fabrica.cobertura360 informe {a['oposicion']}` a partir de `MOSSOS_360_CONTENT_COVERAGE.md` (mismos datos). "
         f"Fábrica de preguntas: **{a['estado_fabrica']}**: las tandas de conocimientos quedan preparadas pero NO se ejecutan hasta levantar la pausa "
         "(`python3 -m fabrica.motor --reanudar` tras revisar las métricas, como exige la fábrica).", "",
         "Orden: primero lo que corrige fuentes y calidad (P0 de fuentes, recalibración), después la cobertura P0/P1 y por último la ampliación. "
         f"Tamaño de tanda de conocimientos = `lote.tamano_inicial` de la fábrica ({a['parametros']['tanda_inicial']}) tras una pausa.", "",
         "Siguientes tandas en cualquier momento: `python3 -m fabrica.cobertura360 siguientes mossos-esquadra --n 3`.", ""]
    tot = collections.Counter()
    for t in a["tandas"]:
        tot[(t["area"], t["prioridad"])] += t["cantidad"] if isinstance(t["cantidad"], int) else 0
    L += _t(["área", "prioridad", "elementos planificados"], [[k[0], k[1], v] for k, v in sorted(tot.items())])
    for t in a["tandas"]:
        L += [f"## BATCH {t['id']}", "",
              f"- prioridad: {t['prioridad']} · tipo: {t['tipo']} · ejecutable ahora: {'sí' if t['ejecutable'] else 'no — ' + str(t['bloqueo'])}",
              f"- temas: {', '.join(t['temas'])}"]
        if t.get("subtemas"):
            L.append(f"- subtemas: {', '.join(t['subtemas'])}")
        L.append(f"- cantidad: {t['cantidad']}" + (f" ({t['cantidad_motivo']})" if t.get("cantidad_motivo") else "") +
                 (f" · por competencia: {t['por_competencia']}" if t.get("por_competencia") else ""))
        for c in ("accion", "dificultad", "tipos", "fuente", "validacion", "judge", "publicacion"):
            if t.get(c) not in (None, ""):
                v = t[c]
                L.append(f"- {c.replace('publicacion', 'criterio de publicación')}: " + (", ".join(v) if isinstance(v, list) else
                                                                                        json.dumps(v, ensure_ascii=False) if isinstance(v, dict) else str(v)))
        if t.get("revision_humana"):
            L.append("- revisión humana obligatoria (tipo de pregunta con revisión obligatoria)")
        L.append("")
    return "\n".join(L) + "\n"


def informe(oid="mossos-esquadra", muestreo=True):
    a = auditar(oid, muestreo)
    base = "MOSSOS_360" if oid == "mossos-esquadra" else f"OPOSICION_360_{oid}"
    d = os.path.join(R, "documentacion")
    open(os.path.join(d, f"{base}_CONTENT_COVERAGE.md"), "w", encoding="utf-8").write(md_cobertura(a))
    open(os.path.join(d, f"{base}_CONTENT_GENERATION_PLAN.md"), "w", encoding="utf-8").write(md_plan(a))
    open(os.path.join(d, f"cobertura360-{oid}.json"), "w", encoding="utf-8").write(json.dumps(a, ensure_ascii=False, indent=1) + "\n")
    return a


def siguientes(oid="mossos-esquadra", n=3, area=None, prioridad=None, solo_ejecutables=False, a=None):
    """Siguientes tandas por prioridad (P0 → P3), leídas del último informe (o recalculadas). Nunca ejecuta nada: devuelve la
    especificación con su estado; las de conocimientos no son ejecutables mientras la fábrica esté en GENERATION_PAUSED."""
    if a is None:
        f = os.path.join(R, "documentacion", f"cobertura360-{oid}.json")
        a = json.load(open(f, encoding="utf-8")) if os.path.exists(f) else auditar(oid, muestreo=False)
    pausa = estado_fabrica()
    out = []
    # misma prioridad: primero corregir fuentes y calidad (fuentes, reevaluación), después generar
    previo = {"fuentes": 0, "reevaluacion": 1, "banco_revisado": 2, "generacion": 3}
    for t in sorted(a["tandas"], key=lambda t: ({"P0": 0, "P1": 1, "P2": 2, "P3": 3}[t["prioridad"]], previo.get(t["tipo"], 9), t["id"])):
        t = dict(t)
        if t["area"] == "KNOWLEDGE" and t["tipo"] == "generacion":  # el estado de la pausa se lee AHORA, no del informe
            t["ejecutable"], t["bloqueo"] = pausa != "GENERATION_PAUSED", pausa if pausa == "GENERATION_PAUSED" else None
        if (area and t["area"] != area) or (prioridad and t["prioridad"] != prioridad) or (solo_ejecutables and not t["ejecutable"]):
            continue
        out.append(t)
    return out[:n]


def main(argv=None):
    a = argv or sys.argv[1:]
    if not a:
        raise SystemExit(__doc__)
    oid = next((x for x in a[1:] if not x.startswith("--") and not x.isdigit() and x not in ("KNOWLEDGE", "APTITUDE", "COMPETENCIES", "INTERVIEW")
                and not x.startswith("P")), "mossos-esquadra")
    op = lambda k, d=None: a[a.index(k) + 1] if k in a else d  # noqa: E731
    if a[0] == "informe":
        r = informe(oid, muestreo="--sin-muestreo" not in a)
        print(f"{oid}: {len(r['objetivos'])} filas de objetivos · {len(r['tandas'])} tandas · fábrica {r['estado_fabrica']}")
    elif a[0] == "siguientes":
        for t in siguientes(oid, int(op("--n", 3)), op("--area"), op("--prioridad"), "--ejecutables" in a):
            print(f"{t['id']:32} {t['prioridad']} {t['area']:12} {t['cantidad']:>4} · {'EJECUTABLE' if t['ejecutable'] else 'BLOQUEADA: ' + str(t['bloqueo'])}")
    else:
        raise SystemExit(__doc__)


if __name__ == "__main__":
    sys.exit(main())
