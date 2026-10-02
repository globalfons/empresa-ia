"""CoverageEngine: qué preguntas faltan, tema a tema, expresado como necesidades concretas
(«8 preguntas de tipo aplicación, dificultad 2, del tema C.5 sobre los apartados C.5.1, C.5.2»).

Lee el perfil de la oposición (catalogo/perfiles/<id>.json), el texto oficial por artículo (fabrica.fuente: capacidad de cada
artículo y tipos que su texto admite) y la configuración de la fábrica (distribución de dificultad y dificultad de cada tipo).
NO genera nada: es la entrada del planificador cuando la fábrica esté autorizada (hoy GENERATION_PAUSED).

Reglas:
  - Objetivo por tema: catalogo.perfil.OBJETIVO_TEMA, limitado por la capacidad real de sus artículos (no se fuerzan preguntas).
  - Solo artículos con texto oficial verificado y no excluidos (fabrica_excluir / sin_fuente_verificada) → si no, BLOQUEADO.
  - Las preguntas OFFICIAL_EXAM no cuentan como cobertura (se informan aparte); REVIEW_REQUIRED y retiradas tampoco.
  - Tipos mínimos por tema: fabrica.fuente.SIEMPRE (los que todo texto admite).
Uso: python3 -m fabrica.cobertura <oposicion> [--json]   → documentacion/cobertura-<oposicion>.json + resumen
"""
import collections, json, math, os, sys

R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, R)
from catalogo import perfil as PF  # noqa: E402
from fabrica import fuente as F, motor as MO  # noqa: E402

NOMBRE_TIPO = {"literal": "literal", "definiciones": "definiciones", "plazos": "plazos", "organos": "órganos", "conceptual": "conceptual",
               "competencias": "competencias", "requisitos": "requisitos", "procedimiento": "procedimiento", "aplicacion": "aplicación",
               "comparativa": "comparativa", "excepcion": "excepción", "negativa": "negativa", "caso_practico": "caso práctico",
               "relacion_articulos": "relación entre artículos", "dificil": "difícil"}
SOBREUSO = 3  # un artículo con más del triple de la media de su tema está sobreexplotado


def cfg():
    return json.load(open(os.path.join(R, "fabrica", "config.json"), encoding="utf-8"))


def preguntas_vivas(perfil):
    """Preguntas TESTLEY_GENERATED servidas por (ley, artículo), con su tipo y dificultad."""
    banco = PF.cargar_banco()
    leyes = {a["ley"] for t in perfil["temario"] for a in t["articulos"]}
    out = collections.defaultdict(list)
    for slug in leyes:
        for q in banco.get(slug, []):
            if PF.estado_pregunta(q) == "TESTLEY_GENERATED":
                out[(slug, q.get("art"))].append(q)
    return out


def analizar(oid, perfil=None, fuentes=None, conf=None):
    perfil = perfil or PF.leer(f"catalogo/perfiles/{oid}.json") or PF.construir(oid)
    fuentes = fuentes or F.Fuentes()
    conf = conf or cfg()
    dist = conf.get("dificultad_por_oposicion", {}).get(oid) or conf["dificultad_por_defecto"]
    dif_tipo = {t: v["dif"] for t, v in conf["tipos"].items()}
    vetadas = MO.sin_fuente_verificada()
    vivas = preguntas_vivas(perfil)
    temas, necesidades, bloqueos = [], [], []
    for t in perfil["temario"]:
        arts, sin_texto = [], []
        for a in t["articulos"]:
            ley = fuentes.ley(a["ley"])
            if a.get("excluido") or (a["ley"], a["art"]) in vetadas or not ley or a["art"] not in ley.arts:
                sin_texto.append(a["art"])
                continue
            cap = ley.capacidad(a["art"], conf)
            if cap:
                arts.append({"ley": a["ley"], "art": a["art"], "cap": cap, "qs": vivas.get((a["ley"], a["art"]), []),
                             "tipos": ley.tipos_posibles(a["art"])})
        pend = [l["nombre"] for l in t.get("leyes_pendientes", [])]
        if not t["documentos"] or (not arts and (pend or sin_texto)):
            bloqueos.append({"tema": t["id"], "motivo": "sin fuente oficial de referencia" if not t["documentos"] else
                             "solo apartados con fuente pendiente de verificar", "leyes_pendientes": pend, "apartados": sin_texto})
        capacidad = sum(a["cap"] for a in arts)
        actuales = sum(len(a["qs"]) for a in arts)
        objetivo = min(PF.OBJETIVO_TEMA, capacidad)
        falta = max(0, objetivo - actuales)
        dif_act = collections.Counter(int(q["dif"]) for a in arts for q in a["qs"] if str(q.get("dif")) in ("1", "2", "3"))
        tipos_act = collections.Counter(q.get("tipo") for a in arts for q in a["qs"])
        media = actuales / max(1, len(arts))
        sobre = [a["art"] for a in arts if len(a["qs"]) > a["cap"] or (media >= 1 and len(a["qs"]) > SOBREUSO * media)]
        sin_preg = [a["art"] for a in arts if not a["qs"]]
        # Reparto del déficit por dificultad (restos mayores sobre el objetivo) y, dentro, por tipos que el texto admite
        por_dif = deficit_dificultad(objetivo, dif_act, dist, falta)
        posibles = collections.Counter(tp for a in arts for tp in a["tipos"])
        for d, n in por_dif.items():
            tipos = sorted((tp for tp in posibles if dif_tipo.get(tp) == d and tp != "relacion_articulos"),
                           key=lambda tp: (tp not in F.SIEMPRE or tipos_act[tp] > 0, tipos_act[tp], tp))
            if not n or not tipos:
                continue
            reparto = collections.Counter()
            for i in range(n):
                reparto[tipos[i % len(tipos)]] += 1
            for tp, k in reparto.items():
                # artículos donde cabe ese tipo: primero los que no tienen preguntas, luego los menos usados respecto a su capacidad
                cand = sorted((a for a in arts if tp in a["tipos"] and len(a["qs"]) < a["cap"]),
                              key=lambda a: (len(a["qs"]) > 0, len(a["qs"]) / a["cap"], a["art"]))[:max(1, min(k, 6))]
                if not cand:
                    continue
                necesidades.append({"tema": t["id"], "titulo": t["titulo"], "tipo": tp, "dificultad": d, "n": k,
                                    "articulos": [f"{a['ley']}:{a['art']}" for a in cand],
                                    "revision_humana": tp in conf.get("tipos_revision_obligatoria", []),
                                    "texto": f"{k} pregunta{'s' if k > 1 else ''} de tipo {NOMBRE_TIPO.get(tp, tp)} (dificultad {d}) del tema {t['id']} "
                                             f"sobre {'los apartados' if len(cand) > 1 else 'el apartado'} {', '.join(a['art'] for a in cand)}",
                                    "prioridad": prioridad(t, actuales, objetivo)})
        sin_fuente = not t["documentos"] or (not arts and bool(pend or sin_texto))
        temas.append({"tema": t["id"], "titulo": t["titulo"], "tipo_gap": "FUENTE" if sin_fuente else ("GENERACION" if falta else None),
                      "apartados_sin_fuente": len(sin_texto), "objetivo": objetivo, "capacidad": capacidad, "actuales": actuales,
                      "falta": falta, "OFFICIAL_EXAM": t["preguntas"]["OFFICIAL_EXAM"], "REVIEW_REQUIRED": t["preguntas"]["REVIEW_REQUIRED"],
                      "dificultad": {str(d): dif_act[d] for d in (1, 2, 3)}, "tipos": dict(tipos_act),
                      "tipos_minimos_ausentes": [tp for tp in F.SIEMPRE if not tipos_act[tp] and posibles[tp]],
                      "articulos_sin_preguntas": sin_preg, "articulos_sobreexplotados": sobre, "apartados_bloqueados": sin_texto,
                      "leyes_pendientes": pend})
    necesidades.sort(key=lambda x: (-x["prioridad"], x["tema"], x["dificultad"], x["tipo"]))
    return {"oposicion": oid, "generado": perfil.get("generado"), "objetivo_tema": PF.OBJETIVO_TEMA, "distribucion_dificultad": dist,
            "estado_fabrica": estado_fabrica(), "temas": temas, "necesidades": necesidades, "bloqueados": bloqueos,
            "total_necesario": sum(x["n"] for x in necesidades),
            "gaps_fuente": [t["tema"] for t in temas if t["tipo_gap"] == "FUENTE"] + [f"{t['tema']} ({t['apartados_sin_fuente']} apartados)" for t in temas
                                                                                       if t["tipo_gap"] != "FUENTE" and t["apartados_sin_fuente"]]}


def deficit_dificultad(objetivo, actual, dist, falta):
    """Cuántas preguntas faltan de cada dificultad para acercarse a la distribución objetivo (suma = falta)."""
    if not falta:
        return {1: 0, 2: 0, 3: 0}
    meta = {d: objetivo * dist[str(d)] for d in (1, 2, 3)}
    hueco = {d: max(0.0, meta[d] - actual[d]) for d in (1, 2, 3)}
    tot = sum(hueco.values()) or 1
    base = {d: math.floor(falta * hueco[d] / tot) for d in (1, 2, 3)}
    resto = falta - sum(base.values())
    for d in sorted((1, 2, 3), key=lambda d: -(falta * hueco[d] / tot - base[d]))[:resto]:
        base[d] += 1
    if sum(base.values()) < falta:  # todas las dificultades ya en su cuota: el resto, a la media
        base[2] += falta - sum(base.values())
    return base


def prioridad(t, actuales, objetivo):
    """Más prioridad: temas sin preguntas, luego los más lejos del objetivo; los exámenes oficiales indican peso real en el examen."""
    peso_examen = t["preguntas"]["OFFICIAL_EXAM"]
    return round((1 - actuales / max(1, objetivo)) * 100 + min(peso_examen, 40) / 4, 1)


def estado_fabrica():
    """Estado real de la fábrica (fabrica/estado/estado.json → pausa): GENERATION_PAUSED o ACTIVE."""
    pausa = (PF.leer("fabrica/estado/estado.json") or {}).get("pausa")
    return (pausa or {}).get("estado", "GENERATION_PAUSED") if pausa else "ACTIVE"


def informe(res):
    lineas = [f"{res['oposicion']}: {res['total_necesario']} preguntas necesarias en {len(res['necesidades'])} necesidades · fábrica {res['estado_fabrica']}"]
    for t in res["temas"]:
        lineas.append(f"  {t['tema']:5} {t['actuales']:>3}/{t['objetivo']:<3} (cap. {t['capacidad']}, oficiales {t['OFFICIAL_EXAM']}) "
                      f"sin preguntas: {len(t['articulos_sin_preguntas'])} · bloqueados: {len(t['apartados_bloqueados'])}")
    lineas += ["  · " + n["texto"] for n in res["necesidades"][:15]]
    lineas += [f"  BLOQUEADO {b['tema']}: {b['motivo']} {b['leyes_pendientes'] or ''}" for b in res["bloqueados"]]
    return "\n".join(lineas)


if __name__ == "__main__":
    oid = sys.argv[1] if len(sys.argv) > 1 else "mossos-esquadra"
    res = analizar(oid)
    with open(os.path.join(R, "documentacion", f"cobertura-{oid}.json"), "w", encoding="utf-8") as f:
        f.write(json.dumps(res, ensure_ascii=False, indent=1) + "\n")
    print(json.dumps(res, ensure_ascii=False, indent=1) if "--json" in sys.argv else informe(res))
