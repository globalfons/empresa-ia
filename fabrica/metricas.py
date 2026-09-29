"""Métricas de la fábrica y del banco (fabrica/estado/metricas.json). Solo cuentan como producción las preguntas VALID
publicadas; REVIEW_REQUIRED, REJECTED, OUTDATED y DEPRECATED se informan aparte."""
import collections, glob, json, os

R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SALIDA = os.path.join(R, "fabrica", "estado", "metricas.json")


def _leer(p, d):
    return json.load(open(p, encoding="utf-8")) if os.path.exists(p) else d


def calcular(estado, raiz=R):
    est = collections.Counter()
    por_ley, fabrica_validas = {}, 0
    for f in sorted(glob.glob(os.path.join(raiz, "datos", "preguntas-*.json"))):
        slug = os.path.basename(f)[len("preguntas-"):-len(".json")]
        qs = _leer(f, [])
        arts = _leer(os.path.join(raiz, "datos", f"{slug}-articulos.json"), [])
        vivos = [q for q in qs if q.get("verification_status") not in ("OUTDATED", "DEPRECATED")]
        for q in qs:
            est[q.get("verification_status", "VALID")] += 1
            fabrica_validas += str(q.get("generador", "")).startswith("fabrica-v1") and "verification_status" not in q
        con = {q["art"] for q in vivos}
        por_ley[slug] = {"validas": sum(1 for q in qs if "verification_status" not in q), "articulos": len(arts),
                         "articulos_con_preguntas": len(con), "cobertura_articulos": round(len(con) / len(arts), 3) if arts else 0}
    cola = collections.Counter()
    for f in glob.glob(os.path.join(raiz, "datos", "candidatas", "*.json")):
        for q in _leer(f, []):
            cola[q.get("verification_status")] += 1
    lotes = [x for x in estado.get("lotes", []) if x.get("modo") in ("real", "sesion")]
    gen = sum(x["generadas"] for x in lotes)
    tok = collections.defaultdict(lambda: {"entrada": 0, "salida": 0})
    for x in lotes:
        for m, v in x.get("tokens", {}).items():
            tok[m]["entrada"] += v["entrada"]; tok[m]["salida"] += v["salida"]
    cob = _leer(os.path.join(raiz, "docs", "datos", "cobertura.json"), [])
    por_op = {}
    for o in cob:
        leg = [t for t in o.get("temas", []) if t.get("legislativo")]
        n = sorted(t["preguntas"] for t in leg)
        por_op[o["id"]] = {"preguntas": o.get("preguntas"), "temas_legislativos": len(leg), "temas_con_preguntas": sum(1 for x in n if x),
                           "minimo_por_tema": n[0] if n else 0, "mediana_por_tema": n[len(n) // 2] if n else 0}
    return {
        "questions_total": sum(est.values()) + sum(cola.values()),
        "questions_valid": est["VALID"],
        "questions_review": est["REVIEW_REQUIRED"] + cola["REVIEW_REQUIRED"],
        "questions_rejected": cola["REJECTED"],
        "questions_outdated": est["OUTDATED"],
        "questions_deprecated": est["DEPRECATED"],
        "questions_valid_fabrica": fabrica_validas,
        "coverage_by_opposition": por_op,
        "coverage_by_topic": {o["id"]: [{"tema": t["tema"], "preguntas": t["preguntas"]} for t in o.get("temas", []) if t.get("legislativo")] for o in cob},
        "coverage_by_law": {k: v["validas"] for k, v in por_ley.items()},
        "coverage_by_article": {k: {x: v[x] for x in ("articulos", "articulos_con_preguntas", "cobertura_articulos")} for k, v in por_ley.items()},
        "duplicate_rate": round(sum(x["duplicadas"] for x in lotes) / gen, 4) if gen else 0,
        "validation_rate": round(sum(x["VALID"] for x in lotes) / gen, 4) if gen else 0,
        "rejection_rate": round(sum(x["REJECTED"] for x in lotes) / gen, 4) if gen else 0,
        "review_rate": round(sum(x["REVIEW_REQUIRED"] for x in lotes) / gen, 4) if gen else 0,
        "generation_cost": round(sum(x["coste_usd"] for x in lotes), 4),
        "generation_tokens": dict(tok),
        "generation_time": round(sum(x["segundos"] for x in lotes), 1),
        "lotes": len(lotes),
        "pausa": estado.get("pausa"),
    }


def guardar(m, ruta=SALIDA):
    from fabrica.banco import escribir
    escribir(ruta, m)
    return m
