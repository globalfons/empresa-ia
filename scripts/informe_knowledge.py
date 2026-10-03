"""Knowledge Engine · cobertura REAL de una oposición (Mossos 360 §4), generada desde los datos (nada a mano).
Desglose por ámbito, tema, apartado/artículo, fuente, dificultad, tipo y origen; solo preguntas servidas (sin REVIEW/DEPRECATED).
Origen: OFFICIAL_EXAM (banco oficial aparte) · FACTORY_GENERATED (fábrica, con juez) · MANUAL («Redactada por TestLey»)
· SIN_METADATOS_DE_ORIGEN (preguntas antiguas sin campo de origen; no se les atribuye ninguno).
Uso: python3 scripts/informe_knowledge.py [oposicion] → documentacion/MOSSOS_360_KNOWLEDGE.md (Mossos) o KNOWLEDGE-<id>.md"""
import collections, json, os, sys

R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, R)
from catalogo import perfil as P  # noqa: E402


def origen(q):
    if str(q.get("generador", "")).startswith("fabrica"):
        return "FACTORY_GENERATED"
    if str(q.get("origen", "")).startswith("Redactada por TestLey"):
        return "MANUAL"
    return "SIN_METADATOS_DE_ORIGEN"


def recoger(oid):
    o = P.leer(f"catalogo/oposiciones/{oid}.json")
    normas = {n["id"]: n for n in P.leer("catalogo/normas_base.json", [])}
    ambito = P.leer("catalogo/temas_ambito.json", {})
    banco = P.cargar_banco()
    filas, vistos = [], set()
    for i, t in enumerate(o["temario"]["temas"]):
        cod = t.get("codigo") or str(t["tema"])
        for nid in t["normas"]:
            n = normas.get(nid, {})
            slug = n.get("slug")
            arts = (ambito.get(f"{oid}#{i}#{slug}") or {}).get("articulos") or []
            for q in banco.get(slug, []):
                if q.get("_cola") or P.estado_pregunta(q) != "TESTLEY_GENERATED" or (arts and q.get("art") not in arts):
                    continue
                k = (slug, q.get("id") or q["q"])
                if k in vistos:
                    continue
                vistos.add(k)
                filas.append({"ambito": cod.split(".")[0], "tema": cod, "fuente": slug, "art": q.get("art"), "dif": str(q.get("dif", "?")),
                              "tipo": q.get("tipo") or "sin_tipo", "origen": origen(q)})
    ex = P.leer(f"datos/examens-oficials/{oid}.json", {"examenes": []})["examenes"]
    of = [{"ambito": (q.get("apartat_guia") or "?").split(".")[0], "tema": ".".join((q.get("apartat_guia") or "?").split(".")[:2]),
           "art": q.get("apartat_guia")} for e in ex for q in e["preguntes"] if q.get("verification_status") != "DEPRECATED"]
    return o, filas, of


def tabla(titulo, filas, clave, columnas):
    c = collections.defaultdict(collections.Counter)
    for f in filas:
        c[f[clave]][f[columnas]] += 1
    cols = sorted({f[columnas] for f in filas})
    L = [f"### {titulo}", "", f"| {clave} | total | " + " | ".join(cols) + " |", "|---|---|" + "---|" * len(cols)]
    for k in sorted(c):
        L.append(f"| {k} | {sum(c[k].values())} | " + " | ".join(str(c[k][x]) for x in cols) + " |")
    return L + [""]


def informe(oid="mossos-esquadra"):
    o, filas, of = recoger(oid)
    p = P.leer(f"catalogo/perfiles/{oid}.json", {})
    temas = {t["id"]: t for t in p.get("temario", [])}
    total = collections.Counter(f["origen"] for f in filas)
    L = [f"# Knowledge Engine · cobertura real ({o['nombre']})", "",
         "Generado por `scripts/informe_knowledge.py` desde el banco servido y los exámenes oficiales. No incluye preguntas en revisión ni retiradas.", "",
         f"- Preguntas TestLey servidas en el temario: **{len(filas)}** ({', '.join(f'{k} {v}' for k, v in sorted(total.items()))})",
         f"- OFFICIAL_EXAM (banco aparte, nunca mezclado): **{len(of)}**",
         "- MANUAL y SIN_METADATOS_DE_ORIGEN son preguntas anteriores a la fábrica. El repositorio no registra si se redactaron con ayuda de IA: "
         "no se etiquetan como AI_GENERATED ni se afirma lo contrario. Desde la fábrica, toda pregunta generada pasa por validación, juez y puerta.", ""]
    L += tabla("Por ámbito y origen", filas, "ambito", "origen")
    L += tabla("Por ámbito (exámenes oficiales)", [dict(f, origen="OFFICIAL_EXAM") for f in of], "ambito", "origen")
    L += tabla("Por tema y dificultad", filas, "tema", "dif")
    L += tabla("Por tema y tipo", filas, "tema", "tipo")
    L += tabla("Por fuente y origen", filas, "fuente", "origen")
    L += ["### Por apartado/artículo (temas de la guía)", "", "| tema | apartado | TestLey | OFFICIAL_EXAM |", "|---|---|---|---|"]
    a = collections.Counter((f["tema"], f["art"]) for f in filas if f["fuente"] == "guia-mossos")
    b = collections.Counter((f["tema"], f["art"]) for f in of)
    for k in sorted(set(a) | set(b), key=lambda x: (str(x[0]), str(x[1]))):
        L.append(f"| {k[0]} | {k[1]} | {a[k]} | {b[k]} |")
    L += ["", "### Estado por tema (perfil)", "", "| tema | cobertura | TestLey | oficiales | revisión |", "|---|---|---|---|---|"]
    for k, t in temas.items():
        L.append(f"| {k} | {t['cobertura']} | {t['preguntas']['TESTLEY_GENERATED']} | {t['preguntas']['OFFICIAL_EXAM']} | {t['preguntas']['REVIEW_REQUIRED']} |")
    L += ["", "Lectura: la cobertura útil se mide por apartados con preguntas y su equilibrio de dificultad, no por un número arbitrario. "
          "Los huecos concretos (qué falta, de qué tipo y dificultad) están en `MOSSOS_360_COVERAGE_MATRIX.md` (CoverageEngine)."]
    nombre = "MOSSOS_360_KNOWLEDGE.md" if oid == "mossos-esquadra" else f"KNOWLEDGE-{oid}.md"
    with open(os.path.join(R, "documentacion", nombre), "w", encoding="utf-8") as f:
        f.write("\n".join(L) + "\n")
    return filas, of


if __name__ == "__main__":
    f, of = informe(*(sys.argv[1:] or []))
    print(len(f), "TestLey ·", len(of), "OFFICIAL_EXAM")
