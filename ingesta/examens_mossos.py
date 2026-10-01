"""Exámenes oficiales anteriores de Mossos d'Esquadra (mosso/a) → datos/examens-oficials/mossos-esquadra.json.

Fuente: «Preguntes i plantilla de respostes de la subprova de coneixements» publicadas por la Generalitat
(mossos.gencat.cat). Transcripción del MODEL 01 y respuesta de la plantilla oficial: datos/examens-oficials/transcripcions/.
Cada pregunta es procedencia OFFICIAL_EXAM (nunca se mezcla con las de la fábrica) y conserva su referencia documental.

Vigencia frente a la guía de estudio actual (<stem>.verif.json, auditoría contra la guía oficial 2026 con esmenes):
  CONFORME_GUIA  → VALID: la guía vigente respalda la respuesta oficial (se guarda la cita literal y se comprueba aquí)
  ACTUALITAT     → VALID: actualidad (àmbit D) de la fecha del examen; la respuesta es la oficial de entonces
  NO_CONSTA_GUIA → REVIEW_REQUIRED: la guía vigente no la desarrolla; revisión humana antes de usarla fuera del examen
  CONTRADIU_GUIA → OUTDATED: la guía vigente dice otra cosa; solo se ve en el examen histórico, con aviso
Uso: python3 -m ingesta.examens_mossos
"""
import hashlib, json, os, re, sys, unicodedata

R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, R)
from ingesta import gencat as G  # noqa: E402

DIR = os.path.join(R, "datos", "examens-oficials")
TR = os.path.join(DIR, "transcripcions")
SALIDA = os.path.join(DIR, "mossos-esquadra.json")
PAG = G.MOSSOS + "/ca/els_mossos_desquadra/acces_al_cos/Mosso_a/models-i-respostes-de-la-1a-prova-danteriors-convocatories/"
B = G.MOSSOS + "/web/.content/home/01_els_mossos_desquadra/ingres-cos/Escala-bAsica/"
# (stem, ruta del PDF oficial, minutos indicados en el propio cuadernillo o None si el documento no lo indica)
EXAMENES = [
    ("46-25", "46_25-maig-25-mosso_a/Preguntes-i-plantilla-de-respostes-de-la-subprova-de-coneixements.pdf", 35),
    ("46-24", "46_25-maig-25-mosso_a/4.-Preguntes-i-plantilla-de-respostes-de-la-subprova-de-coneixements.pdf", 35),
    ("46-002-23", "46_002_23_mossoa_2023/Preguntes-i-plantilla-de-respostes-de-la-subprova-de-coneixement.pdf", 35),
    ("46-23", "46_002_23_mossoa_2023/CONEIXEMENTS-MODEL-01-02-I-PLANTILLA-RESPOSTES-4623.pdf", 35),
    ("46-22", "46_23_acces_mosso_2023/subprova-i-plantilla-coneixements.pdf", None),
    ("46-21", "modelsirespostes/0-PLANTILLA-PREGUNTES-I-RESPOSTES-CONEIXEMENTS-46-21.pdf", None),
    ("46-19", "46_002_19_mossoa_2019/06_1a_Coneixements/Documents/Models-subprova-coneixements-i-plantilles-correccio-4619.pdf", None),
    ("46-002-19", "modelsirespostes/0-PLANTILLA-PREGUNTES-I-RESPOSTES-CONEIXEMENTS-46-002-19.pdf", None),
    ("46-17", "46_002_19_mossoa_2019/06_1a_Coneixements/Documents/Subprova-coneixements-Model-01-4617.pdf", None),
]
ESTADO = {"CONFORME_GUIA": "VALID", "ACTUALITAT": "VALID", "NO_CONSTA_GUIA": "REVIEW_REQUIRED", "CONTRADIU_GUIA": "OUTDATED"}


def norm(s):
    return re.sub(r"\s+", " ", unicodedata.normalize("NFC", s or "")).strip()


def construir(descargar=True):
    guia = {a["n"]: norm(a["texto"]) for a in json.load(open(G.assegurar_guia(), encoding="utf-8"))}
    examenes, problemas = [], []
    for stem, ruta, minutos in EXAMENES:
        t = json.load(open(os.path.join(TR, f"{stem}.json"), encoding="utf-8"))
        fv = os.path.join(TR, f"{stem}.verif.json")
        ver = {v["n"]: v for v in json.load(open(fv, encoding="utf-8"))} if os.path.exists(fv) else {}
        url = B + ruta
        doc = {"source_url": url, "source_document": f"Preguntes i plantilla de respostes de la subprova de coneixements · convocatòria {t['convocatoria']}",
               "source_type": "EXAMEN_OFICIAL", "published_at": t.get("data_document"), "verification_status": "OFFICIAL_VERIFIED"}
        if descargar:
            raw = G.http(url)
            doc.update(sha256=hashlib.sha256(raw).hexdigest(), retrieved_at=G.ahora(), verified_at=G.ahora()[:10])
            G.registrar(doc)
        conv = t["convocatoria"]
        qs = []
        for p in t["preguntes"]:
            v = ver.get(p["n"]) or {}
            estat = v.get("estat") or "PENDENT_AUDITORIA"
            cita = norm(v.get("cita_guia"))
            if cita and (v.get("apartat") not in guia or cita not in guia[v["apartat"]]):
                problemas.append(f"{stem} #{p['n']}: la cita de la guia no és literal a {v.get('apartat')}")
                estat = "NO_CONSTA_GUIA"; cita = ""
            # respaldo solo por eliminación (la nota lo explica): no es una cita explícita → revisión humana
            dudosa = estat == "CONFORME_GUIA" and bool(v.get("nota"))
            q = {"id": f"mx{stem}-{p['n']}", "n": p["n"], "q": p["q"], "o": p["o"], "a": p["a"], "lletra_oficial": p.get("lletra"),
                 "procedencia": "OFFICIAL_EXAM",
                 "examen_oficial": {"organismo": "Generalitat de Catalunya · Mossos d'Esquadra", "convocatoria": f"Convocatòria {conv} (mosso/a)",
                                    "fecha_examen": t.get("data_document") or "data no indicada al document", "url_oficial": url,
                                    "documento": "Preguntes i plantilla de respostes (model 01)"},
                 "tema": v.get("tema"), "apartat_guia": v.get("apartat"), "vigencia_guia": estat,
                 "verification_status": "REVIEW_REQUIRED" if dudosa and not p.get("anullada") else "VALID" if not p.get("anullada") and estat in ("CONFORME_GUIA", "ACTUALITAT") else
                                        ("DEPRECATED" if p.get("anullada") else ESTADO.get(estat, "REVIEW_REQUIRED"))}
            if cita:
                q["cita_guia"] = cita
            if v.get("nota"):
                q["nota_vigencia"] = v["nota"]
            if p.get("nota"):
                q["nota_transcripcio"] = p["nota"]
            qs.append(q)
        examenes.append({"id": stem, "convocatoria": conv, "model": t.get("model", "01"), "preguntes_total": len(qs), "minuts": minutos,
                         "data_document": t.get("data_document"), "escanejat": t.get("escanejat", False), "font": url, "pagina": PAG,
                         "transcripcio": "Model 01; text dels PDF de text copiat literalment; PDF escanejats transcrits i revisats contra les imatges de cada pàgina",
                         "preguntes": qs})
    out = {"oposicion": "mossos-esquadra", "generado": G.ahora()[:10], "pagina_oficial": PAG,
           "nota": "Preguntes oficials publicades per la Generalitat. La resposta correcta és la de la plantilla oficial. La vigència es contrasta amb la Guia d'estudi 2026 (amb les esmenes de setembre 2026).",
           "examenes": examenes}
    with open(SALIDA, "w", encoding="utf-8") as f:
        f.write(json.dumps(out, ensure_ascii=False, indent=1) + "\n")
    return out, problemas


if __name__ == "__main__":
    out, prob = construir(descargar="--sin-red" not in sys.argv)
    from collections import Counter
    for e in out["examenes"]:
        print(e["id"], e["preguntes_total"], dict(Counter(q["verification_status"] for q in e["preguntes"])))
    for p in prob:
        print("AVÍS", p)
