# Valida que cada pregunta cite literalmente el artículo que referencia.
import json, re, sys, unicodedata
def norm(s):
    s = unicodedata.normalize("NFC", s)
    s = s.replace(" ", " ").replace("\t", " ")
    return re.sub(r"\s+", " ", s).strip()
arts = {a["n"]: norm(a["texto"]) for a in json.load(open(sys.argv[1]))}
qs = json.load(open(sys.argv[2]))
bad = 0
for i, q in enumerate(qs):
    errs = []
    if q["art"] not in arts: errs.append("artículo inexistente")
    elif norm(q["cita"]) not in arts[q["art"]]: errs.append("cita no encontrada literalmente")
    if len(q["o"]) != 4 or len(set(q["o"])) != 4: errs.append("opciones")
    if q["a"] not in range(4): errs.append("respuesta")
    if errs:
        bad += 1; print(f"#{i} art {q['art']}: {', '.join(errs)} :: {q['cita'][:70]}")
print(f"{len(qs)} preguntas, {bad} con errores")
sys.exit(1 if bad else 0)
