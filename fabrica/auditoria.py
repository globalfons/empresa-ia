"""Auditoría de calidad de las preguntas generadas por la fábrica (banco + cola), sin modelo y sin modificar nada.

  python3 -m fabrica.auditoria  → documentacion/QUESTION-FACTORY-AUDIT.md + fabrica/estado/auditoria.json

Mide estados, duplicados y casi duplicados, reparto por oposición/tema/artículo, dificultad y tipos, concentración por
artículo, cambios normativos, citas y explicaciones débiles, y señala lo que necesita una persona (sin cambiar preguntas).
"""
import collections, datetime, glob, json, os, re, sys

R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, R)
sys.path.insert(0, os.path.join(R, "scripts"))
from fabrica import fuente as F, validacion as V, motor as MO, politica as P  # noqa: E402
import brecha_preguntas as BR  # noqa: E402
from validar_lib import norm  # noqa: E402

INFORME = os.path.join(R, "documentacion", "QUESTION-FACTORY-AUDIT.md")
SALIDA = os.path.join(R, "fabrica", "estado", "auditoria.json")
CASI = 0.60          # Jaccard de enunciados a partir del cual dos preguntas del mismo artículo son «casi iguales»
MISMO_DATO = 0.35    # con la misma respuesta correcta, a partir de aquí se sospecha que preguntan el mismo dato
INTERPRETATIVOS = {"aplicacion", "caso_practico", "dificil", "relacion_articulos"}


def cargar():
    banco, cola = [], []
    for f in sorted(glob.glob(os.path.join(R, "datos", "preguntas-*.json"))):
        slug = os.path.basename(f)[len("preguntas-"):-5]
        banco += [dict(q, _ley=slug) for q in json.load(open(f, encoding="utf-8"))]
    for f in sorted(glob.glob(os.path.join(R, "datos", "candidatas", "*.json"))):
        slug = os.path.basename(f)[:-5]
        cola += [dict(q, _ley=slug) for q in json.load(open(f, encoding="utf-8"))]
    return banco, cola


def pct(a, b):
    return round(100 * a / b, 1) if b else 0.0


def calcular():
    cfg = json.load(open(MO.CFG, encoding="utf-8"))
    fu = F.Fuentes()
    banco, cola = cargar()
    fab = [q for q in banco if str(q.get("generador", "")).startswith("fabrica")]
    fab_cola = [q for q in cola if str(q.get("generador", "")).startswith("fabrica")]
    est = collections.Counter(q.get("verification_status") or "VALID" for q in fab_cola)
    generadas = len(fab) + len(fab_cola)
    por_art_todas = collections.defaultdict(list)
    for q in banco:
        if q.get("verification_status") not in ("OUTDATED", "DEPRECATED"):
            por_art_todas[(q["_ley"], q["art"])].append(q)

    # Duplicados exactos y casi duplicados (cada pregunta de la fábrica contra todo el banco del mismo artículo)
    exactos, casi, mismo_dato = [], [], []
    for q in fab:
        for e in por_art_todas[(q["_ley"], q["art"])]:
            if e.get("id") == q.get("id"):
                continue
            par = tuple(sorted((q["id"], e["id"])))
            s = V.jaccard(q["q"], e["q"])
            mc = V.simple(q["o"][q["a"]]) == V.simple(e["o"][e["a"]])
            if V.simple(q["q"]) == V.simple(e["q"]) and mc:
                exactos.append(par)
            elif s >= CASI:
                casi.append((par, round(s, 2), mc))
            elif mc and s >= MISMO_DATO:
                mismo_dato.append((par, round(s, 2)))
    uniq = lambda xs: sorted({x[0] if isinstance(x, tuple) and isinstance(x[0], tuple) else x: x for x in xs}.values())
    exactos, casi, mismo_dato = sorted(set(exactos)), uniq(casi), uniq(mismo_dato)

    # Reparto
    por_op = collections.Counter((q.get("tema_objetivo") or "#").split("#")[0] for q in fab)
    por_tema = collections.Counter(q.get("tema_objetivo") for q in fab)
    por_art = collections.Counter((q["_ley"], q["art"]) for q in fab)
    dif = collections.Counter(q.get("dif") for q in fab)
    tipos = collections.Counter(q.get("tipo") for q in fab)
    por_ley = collections.Counter(q["_ley"] for q in fab)

    # Concentración por artículo: banco completo del artículo frente a su capacidad
    sobre, conc = [], []
    for (slug, n), c in por_art.items():
        ley = fu.ley(slug)
        cap = ley.capacidad(n, cfg) if ley and n in ley.arts else 0
        total = len(por_art_todas[(slug, n)])
        conc.append(c)
        if cap and total > cap:
            sobre.append({"ley": slug, "art": n, "preguntas_banco": total, "de_fabrica": c, "capacidad": cap})
    conc.sort(reverse=True)
    hhi = round(sum((c / len(fab)) ** 2 for c in conc), 4) if fab else 0
    top10 = pct(sum(conc[:10]), len(fab))

    # Fuente: cambios normativos, citas y explicaciones
    cambio, cita_debil, cita_ausente, exp_debil = [], [], [], []
    for q in fab:
        ley = fu.ley(q["_ley"])
        if not ley or q["art"] not in ley.arts:
            cita_ausente.append(q["id"]); continue
        if q.get("verificada_contra") and ley.version and q["verificada_contra"] != ley.version:
            cambio.append({"id": q["id"], "ley": q["_ley"], "art": q["art"], "verificada_contra": q["verificada_contra"], "vigente": ley.version})
        if norm(q["cita"]) not in ley.texto[q["art"]]:
            cita_ausente.append(q["id"])
        elif len(norm(q["cita"])) < 25:
            cita_debil.append(q["id"])
        if len(q.get("exp", "")) < 90:
            exp_debil.append(q["id"])

    # Cola: motivos de revisión agrupados
    motivos = collections.Counter()
    for q in fab_cola:
        if q.get("verification_status") != "REVIEW_REQUIRED":
            continue
        m = q.get("motivo", "")
        clave = ("revisión obligatoria por tipo" if "revisión humana obligatoria" in m else
                 "el generador declaró confianza media/baja" if "confianza" in m else
                 "juez: depende de otro artículo" if re.search(r"(?i)art[ií]culo.*no (est[aá] )?incluido|depende", m) else
                 "juez: más de una opción defendible" if re.search(r"(?i)[uú]nica|varias|otra opci|también", m) else
                 "juez: no respaldada por el texto" if re.search(r"(?i)respald|no (se )?justific|no dice|no aparece", m) else
                 "juez: enunciado poco claro o trivial" if re.search(r"(?i)clar|ambig|trivial|memori|literal", m) else "otros")
        motivos[clave] += 1
    interpretativas = [q["id"] for q in fab if q.get("tipo") in INTERPRETATIVOS]

    # Cobertura de temas (todas las oposiciones del plan)
    salida = BR.calcular(MO.objetivo_de(fu, cfg))
    temas = [t for t in salida["temas"]]
    insuf = sorted(({"tema": f"{t['oposicion']}#{t['indice']}", "titulo": t["titulo"][:80], "preguntas": t["preguntas"], "objetivo": t["objetivo"]}
                    for t in temas if t["preguntas"] < min(cfg["cobertura"]["objetivo_tema_min"], t["objetivo"])),
                   key=lambda x: x["preguntas"] / max(1, x["objetivo"]))
    articulos_ambito = {(L["ley"], a) for t in temas for L in t["leyes"] for a in L["_arts"]}
    cubiertos = {k for k in articulos_ambito if por_art_todas.get(k)}

    lotes = MO.B.leer(MO.ESTADO, {"lotes": []})["lotes"]
    rev_humana = len(MO.B.leer(os.path.join(R, "fabrica", "estado", "revisiones-humanas.json"), []))
    return {
        "fecha": datetime.datetime.now().isoformat(timespec="seconds"),
        "politica_activa": P.registro(R)["activa"],
        "lotes": [{k: x.get(k) for k in ("id", "generadas", "VALID", "REVIEW_REQUIRED", "REJECTED", "duplicadas", "judge_policy_version")} for x in lotes],
        "totales": {"generadas": generadas, "VALID": len(fab), "REVIEW_REQUIRED": est["REVIEW_REQUIRED"], "REJECTED": est["REJECTED"],
                    "APROBADA_REVISION_HUMANA": est["APROBADA_REVISION_HUMANA"], "revisiones_humanas": rev_humana},
        "FACTORY_VALID_RATE": pct(len(fab), generadas), "FACTORY_REVIEW_RATE": pct(est["REVIEW_REQUIRED"], generadas),
        "FACTORY_REJECTION_RATE": pct(est["REJECTED"], generadas),
        "DUPLICATE_RATE": pct(len(exactos) + sum(1 for x in fab_cola if "duplicad" in x.get("motivo", "")), generadas),
        "duplicados_exactos": exactos, "casi_duplicados": [{"par": p, "jaccard": s, "misma_respuesta": m} for p, s, m in casi],
        "mismo_dato_sospecha": [{"par": p, "jaccard": s} for p, s in mismo_dato],
        "ARTICLE_CONCENTRATION": {"articulos_distintos": len(por_art), "max_por_articulo": conc[0] if conc else 0,
                                  "media_por_articulo": round(len(fab) / max(1, len(por_art)), 2), "top10_pct": top10, "hhi": hhi,
                                  "sobreexplotados": sorted(sobre, key=lambda x: -x["preguntas_banco"] / x["capacidad"])},
        "TOPIC_COVERAGE": {"temas": len(temas), "temas_sin_fuente": len(salida["temas_sin_fuente"]), "temas_con_fabrica": len(por_tema), "temas_bajo_objetivo": len(insuf),
                           "articulos_ambito": len(articulos_ambito), "articulos_ambito_con_preguntas": len(cubiertos),
                           "pct_articulos_cubiertos": pct(len(cubiertos), len(articulos_ambito)), "insuficientes": insuf},
        "DIFFICULTY_DISTRIBUTION": {str(k): pct(v, len(fab)) for k, v in sorted(dif.items(), key=lambda x: str(x[0]))},
        "QUESTION_TYPE_DISTRIBUTION": {k: v for k, v in tipos.most_common()},
        "por_oposicion": dict(por_op.most_common()), "por_ley": dict(por_ley.most_common()),
        "por_tema_top": por_tema.most_common(15), "por_articulo_top": [[f"{a}:{b}", c] for (a, b), c in por_art.most_common(15)],
        "cambios_normativos": cambio, "citas_insuficientes": cita_debil, "citas_no_encontradas": cita_ausente,
        "explicaciones_debiles": exp_debil, "motivos_revision": dict(motivos.most_common()),
        "interpretativas": {"total": len(interpretativas), "por_tipo": {t: tipos[t] for t in INTERPRETATIVOS}},
    }


def informe(a):
    t, c, ac = a["totales"], a["TOPIC_COVERAGE"], a["ARTICLE_CONCENTRATION"]
    L = [f"# Auditoría de la Question Factory — {a['fecha'][:10]}", "",
         "Generado por `python3 -m fabrica.auditoria` (determinista, sin modelo, sin modificar preguntas). Datos completos en `fabrica/estado/auditoria.json`.", "",
         f"Política del juez activa: **{a['politica_activa']}** (ver `fabrica/politica_juez/registro.json`).", "",
         "## 1. Indicadores", "", "| Indicador | Valor |", "|---|---|",
         f"| Preguntas generadas por la fábrica (banco + cola) | {t['generadas']} |",
         f"| VALID publicadas | {t['VALID']} |", f"| REVIEW_REQUIRED (pendientes de revisión humana) | {t['REVIEW_REQUIRED']} |",
         f"| REJECTED | {t['REJECTED']} |", f"| Aprobadas por revisión humana | {t['APROBADA_REVISION_HUMANA']} |",
         f"| FACTORY_VALID_RATE | {a['FACTORY_VALID_RATE']} % |", f"| FACTORY_REVIEW_RATE | {a['FACTORY_REVIEW_RATE']} % |",
         f"| FACTORY_REJECTION_RATE | {a['FACTORY_REJECTION_RATE']} % |", f"| DUPLICATE_RATE | {a['DUPLICATE_RATE']} % |",
         f"| Duplicados exactos en el banco | {len(a['duplicados_exactos'])} |",
         f"| Casi duplicados (enunciado ≥ {int(CASI * 100)} % igual, mismo artículo) | {len(a['casi_duplicados'])} |",
         f"| Sospecha de mismo dato (misma respuesta, enunciado ≥ {int(MISMO_DATO * 100)} %) | {len(a['mismo_dato_sospecha'])} |",
         f"| Citas que ya no están en el texto vigente | {len(a['citas_no_encontradas'])} |",
         f"| Citas cortas (< 25 caracteres) | {len(a['citas_insuficientes'])} |",
         f"| Explicaciones breves (< 90 caracteres) | {len(a['explicaciones_debiles'])} |",
         f"| Preguntas sobre artículos cuya ley ha cambiado desde la generación | {len(a['cambios_normativos'])} |", "",
         "## 2. Lotes", "", "| Lote | Generadas | VALID | Revisión | Rechazadas | Política del juez |", "|---|---|---|---|---|---|"]
    L += [f"| {x['id']} | {x['generadas']} | {x['VALID']} | {x['REVIEW_REQUIRED']} | {x['REJECTED']} | {x.get('judge_policy_version') or '—'} |" for x in a["lotes"]]
    L += ["", "## 3. Reparto", "", "**Por oposición (tema objetivo de la generación)**", "", "| Oposición | VALID |", "|---|---|"]
    L += [f"| {k} | {v} |" for k, v in a["por_oposicion"].items()]
    L += ["", "**Por ley**", "", "| Ley | VALID |", "|---|---|"] + [f"| {k} | {v} |" for k, v in a["por_ley"].items()]
    L += ["", "**DIFFICULTY_DISTRIBUTION** (objetivo 30/50/20): " + " · ".join(f"dif {k}: {v} %" for k, v in a["DIFFICULTY_DISTRIBUTION"].items()), "",
          "**QUESTION_TYPE_DISTRIBUTION**: " + " · ".join(f"{k} {v}" for k, v in a["QUESTION_TYPE_DISTRIBUTION"].items()), "",
          "**Temas con más preguntas de la fábrica**: " + " · ".join(f"{k} ({v})" for k, v in a["por_tema_top"]), "",
          "## 4. ARTICLE_CONCENTRATION", "",
          f"- Artículos distintos: {ac['articulos_distintos']} · media {ac['media_por_articulo']} preguntas/artículo · máximo {ac['max_por_articulo']}",
          f"- Los 10 artículos más usados concentran el {ac['top10_pct']} % · índice HHI {ac['hhi']} (0 = disperso, 1 = todo en uno)",
          "- Más usados: " + " · ".join(f"{k} ({v})" for k, v in a["por_articulo_top"]),
          f"- Artículos por encima de su capacidad (banco completo > palabras/40): {len(ac['sobreexplotados'])}"]
    L += [f"  - {x['ley']} art. {x['art']}: {x['preguntas_banco']} en el banco ({x['de_fabrica']} de la fábrica) · capacidad {x['capacidad']}" for x in ac["sobreexplotados"][:15]]
    L += ["", "## 5. TOPIC_COVERAGE", "",
          f"- Temas con fuente en el plan: {c['temas']} (todos por debajo de su objetivo de 100–200 preguntas) · con preguntas de la fábrica: "
          f"{c['temas_con_fabrica']} · por debajo de 100 (o de su capacidad, si es menor): {c['temas_bajo_objetivo']} · sin fuente asignada: {c['temas_sin_fuente']}",
          f"- Artículos del ámbito de los temas con alguna pregunta: {c['articulos_ambito_con_preguntas']} de {c['articulos_ambito']} ({c['pct_articulos_cubiertos']} %)",
          "- Temas menos cubiertos:"]
    L += [f"  - {x['tema']} — {x['titulo']}: {x['preguntas']}/{x['objetivo']}" for x in c["insuficientes"][:20]]
    L += ["", "## 6. Revisión y riesgos", "", "**Motivos de las REVIEW_REQUIRED pendientes**", ""]
    L += [f"- {k}: {v}" for k, v in a["motivos_revision"].items()]
    L += ["", f"**Preguntas de tipo interpretativo publicadas** (aplicación, caso práctico, difícil, relación de artículos): {a['interpretativas']['total']} — "
          + ", ".join(f"{k} {v}" for k, v in a["interpretativas"]["por_tipo"].items()) + ". Son las que más dependen de la lectura del artículo; "
          "el juez las aprobó una a una contra el texto, pero son las primeras candidatas a una revisión humana por muestreo.", ""]
    if a["casi_duplicados"] or a["mismo_dato_sospecha"]:
        L += ["**Pares a revisar por una persona (posible mismo dato)**", ""]
        L += [f"- {p['par'][0]} ↔ {p['par'][1]} (enunciados {int(p['jaccard'] * 100)} % iguales{', misma respuesta' if p.get('misma_respuesta') else ''})" for p in a["casi_duplicados"][:30]]
        L += [f"- {p['par'][0]} ↔ {p['par'][1]} (misma respuesta, enunciados {int(p['jaccard'] * 100)} % iguales)" for p in a["mismo_dato_sospecha"][:30]]
        L += [""]
    if a["cambios_normativos"]:
        L += ["**Preguntas cuya ley cambió después de generarlas** (la vigilancia del BOE las pasa a revisión si el artículo cambió):", ""]
        L += [f"- {x['id']}: {x['ley']} art. {x['art']} (generada sobre {x['verificada_contra']}, vigente {x['vigente']})" for x in a["cambios_normativos"][:30]] + [""]
    return "\n".join(L) + "\n"


def main():
    a = calcular()
    MO.B.escribir(SALIDA, a)
    with open(INFORME, "w", encoding="utf-8") as f:
        f.write(informe(a))
    print(f"Auditoría: {a['totales']} · VALID_RATE {a['FACTORY_VALID_RATE']} % · DUP {a['DUPLICATE_RATE']} % · casi duplicados {len(a['casi_duplicados'])}"
          f" · mismo dato {len(a['mismo_dato_sospecha'])} → {os.path.relpath(INFORME, R)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
