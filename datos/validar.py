# Valida que cada pregunta cite literalmente el artículo que referencia.
import json, sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from validar_lib import norm, vigente
arts = {a["n"]: norm(vigente(a["texto"])) for a in json.load(open(sys.argv[1]))}
qs = json.load(open(sys.argv[2]))
bad = desf = 0
for i, q in enumerate(qs):
    if q.get("verification_status") in ("DEPRECATED", "OUTDATED"):  # desfasada por un cambio de la ley: no se publica ni cuenta como error
        desf += 1; continue
    errs = []
    if q["art"] not in arts: errs.append("artículo inexistente")
    elif norm(q["cita"]) not in arts[q["art"]]: errs.append("cita no encontrada literalmente")
    else:
        t, c = arts[q["art"]], norm(q["cita"]); p = t.find(c)
        if (c[0].isalnum() and p > 0 and t[p - 1].isalnum()) or (c[-1].isalnum() and t[p + len(c):p + len(c) + 1].isalnum()):
            errs.append("cita cortada a media palabra")
    if len(q["o"]) != 4 or len(set(q["o"])) != 4: errs.append("opciones")
    if q["a"] not in range(4): errs.append("respuesta")
    if "dif" in q and q["dif"] not in (1, 2, 3): errs.append("dif debe ser 1, 2 o 3")
    if "exp" in q and len(q["exp"].strip()) < 20: errs.append("explicación demasiado corta")
    if errs:
        bad += 1; print(f"#{i} art {q['art']}: {', '.join(errs)} :: {q['cita'][:70]}")
print(f"{len(qs)} preguntas, {bad} con errores" + (f", {desf} desfasadas" if desf else ""))
sys.exit(1 if bad else 0)
