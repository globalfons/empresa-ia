"""Sella cada pregunta con la versión del texto legal contra la que se ha verificado su cita (versionado de preguntas).
  verificada_contra: fecha de la versión consolidada del BOE (datos/leyes-meta.json) contra la que pasó datos/validar.py
  verificada_el:     día de esa verificación
Solo sella preguntas VALID (o REVIEW_REQUIRED ya revisadas que vuelven a validar: ver --revisadas). Idempotente.
Uso: python3 datos/sellar_preguntas.py [--revisadas slug:art ...]
"""
import json, os, glob, sys, datetime
D = os.path.dirname(os.path.abspath(__file__)); RAIZ = os.path.dirname(D)
sys.path.insert(0, D)
from validar_lib import norm, vigente, ruta_articulos

def sellar(slug, boe_id, meta, hoy=None):
    hoy = hoy or datetime.date.today().isoformat()
    fq, fa = os.path.join(D, f"preguntas-{slug}.json"), os.path.join(D, f"{slug}-articulos.json")
    if not os.path.exists(fa):  # fuentes no versionadas (guía oficial de Mossos): ruta de normas_base.json
        fa = ruta_articulos(slug)
    qs = json.load(open(fq)); arts = {a["n"]: norm(vigente(a["texto"])) for a in json.load(open(fa))}
    n = 0
    for q in qs:
        if q.get("verification_status") in ("OUTDATED", "DEPRECATED", "REVIEW_REQUIRED"): continue
        if q["art"] in arts and norm(q["cita"]) in arts[q["art"]] and q.get("verificada_contra") != meta.get(boe_id):
            q["verificada_contra"] = meta.get(boe_id); q["verificada_el"] = hoy; n += 1
    if n: json.dump(qs, open(fq, "w"), ensure_ascii=False, indent=1)
    return n

if __name__ == "__main__":
    normas = {x["slug"]: x["id"] for x in json.load(open(os.path.join(RAIZ, "catalogo", "normas_base.json")))}
    meta = json.load(open(os.path.join(D, "leyes-meta.json"))); total = 0
    if "--revisadas" in sys.argv:  # tras revisar a mano: slug:art vuelve a VALID si su cita sigue siendo literal
        for x in sys.argv[sys.argv.index("--revisadas") + 1:]:
            slug, art = x.split(":"); fq = os.path.join(D, f"preguntas-{slug}.json"); qs = json.load(open(fq))
            for q in qs:
                if q["art"] == art and q.get("verification_status") == "REVIEW_REQUIRED":
                    for k in ("verification_status", "motivo", "estado_desde"): q.pop(k, None)
            json.dump(qs, open(fq, "w"), ensure_ascii=False, indent=1)
    for f in sorted(glob.glob(os.path.join(D, "preguntas-*.json"))):
        s = os.path.basename(f)[10:-5]
        if s in normas: total += sellar(s, normas[s], meta)
    print(f"{total} preguntas selladas con su versión del texto legal")
