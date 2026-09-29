"""Revisa las preguntas contra el texto vigente de cada ley (tras actualizar datos/<ley>-articulos.json).
Si la cita de una pregunta ya no aparece literalmente en su artículo, la pregunta se marca OUTDATED
(no se borra: se conserva con el motivo y la fecha, deja de publicarse y queda en la cola de revisión del admin).
Si una pregunta desfasada vuelve a coincidir (p. ej. se corrigió la cita), se reactiva.
Uso: python3 datos/revisar_vigencia.py [slug ...]
"""
import json, glob, os, sys, datetime
D = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, D)
from validar_lib import norm, vigente

def revisar(slug, hoy=None):
    hoy = hoy or datetime.date.today().isoformat()
    fa, fq = os.path.join(D, f"{slug}-articulos.json"), os.path.join(D, f"preguntas-{slug}.json")
    arts = {a["n"]: norm(vigente(a["texto"])) for a in json.load(open(fa))}
    qs = json.load(open(fq)); n = {"desfasadas": 0, "reactivadas": 0}
    for q in qs:
        ok = q["art"] in arts and norm(q["cita"]) in arts[q["art"]]
        if not ok and q.get("verification_status") not in ("DEPRECATED", "OUTDATED"):
            q.update({"verification_status": "OUTDATED", "desfasada_el": hoy,
                      "motivo": "artículo derogado o renumerado" if q["art"] not in arts else "la cita ya no aparece en el texto vigente"}); n["desfasadas"] += 1
        elif ok and q.get("verification_status") == "OUTDATED":
            for k in ("verification_status", "desfasada_el", "motivo"): q.pop(k, None)
            n["reactivadas"] += 1
    if n["desfasadas"] or n["reactivadas"]:
        json.dump(qs, open(fq, "w"), ensure_ascii=False, indent=1)
    return n

if __name__ == "__main__":
    slugs = sys.argv[1:] or [os.path.basename(f)[10:-5] for f in sorted(glob.glob(os.path.join(D, "preguntas-*.json")))]
    for s in slugs:
        n = revisar(s)
        if n["desfasadas"] or n["reactivadas"]: print(s, n)
    print("Revisión de vigencia terminada.")
