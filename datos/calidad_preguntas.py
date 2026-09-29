"""Control de calidad de todas las preguntas: STRUCTURE · CONTENT · ANSWER · SOURCE · DUPLICATE.
Escribe datos/calidad.json (lo usa /admin/oposiciones/<id>/quality/) y termina con error si alguna pregunta publicada
tiene un fallo bloqueante. Los casi-duplicados se listan como aviso para revisión humana.
Uso: python3 datos/calidad_preguntas.py
"""
import json, os, re, glob, sys, unicodedata, itertools
D = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, D)
from validar_lib import norm, vigente

# Referencias a otras opciones: con las opciones barajadas dejan de tener sentido (la app baraja siempre)
REF_OPCIONES = re.compile(r"(?i)\b(todas las anteriores|ninguna de las anteriores|las dos anteriores|ambas (respuestas|opciones) (anteriores|son)|"
                          r"(las )?opciones? [a-d] y [a-d]|\b[a-d]\) y [a-d]\)|respuestas? [a-d] y [a-d]|la (primera|segunda|tercera) (opción|respuesta))\b")

def simple(t):
    t = unicodedata.normalize("NFD", t.lower()); t = "".join(c for c in t if unicodedata.category(c) != "Mn")
    return " ".join(re.sub(r"[^a-z0-9 ]", " ", t).split())

def comprobar(q, arts):
    """Lista de problemas de una pregunta: (control, gravedad, mensaje). gravedad: error | aviso."""
    p = []
    # STRUCTURE
    for k, tipo in (("art", str), ("q", str), ("o", list), ("a", int), ("cita", str)):
        if not isinstance(q.get(k), tipo): p.append(("STRUCTURE", "error", f"campo {k} ausente o de tipo incorrecto"))
    if p: return p
    if len(q["o"]) != 4: p.append(("STRUCTURE", "error", "debe tener 4 opciones"))
    if q["a"] not in range(len(q["o"])): p.append(("STRUCTURE", "error", "respuesta fuera de rango"))
    if "dif" in q and q["dif"] not in (1, 2, 3): p.append(("STRUCTURE", "error", "dificultad debe ser 1, 2 o 3"))
    # CONTENT
    if not 15 <= len(q["q"].strip()) <= 500: p.append(("CONTENT", "error", "enunciado demasiado corto o largo"))
    if any(not str(o).strip() or len(str(o)) > 400 for o in q["o"]): p.append(("CONTENT", "error", "opción vacía o demasiado larga"))
    if "exp" in q and len(q["exp"].strip()) < 20: p.append(("CONTENT", "aviso", "explicación demasiado corta"))
    # ANSWER
    if len({simple(str(o)) for o in q["o"]}) != len(q["o"]): p.append(("ANSWER", "error", "opciones repetidas: respuesta ambigua"))
    if any(REF_OPCIONES.search(str(o)) for o in q["o"]): p.append(("ANSWER", "error", "una opción remite a otras opciones y la app las baraja"))
    # SOURCE
    if q["art"] not in arts: p.append(("SOURCE", "error", "el artículo no existe en el texto consolidado"))
    elif norm(q["cita"]) not in arts[q["art"]]: p.append(("SOURCE", "error", "la cita no aparece literalmente en el artículo vigente"))
    return p

def duplicados(todas, umbral=0.88):
    """Duplicados exactos y casi-duplicados (mismas palabras en ≥ 88 % y misma respuesta correcta)."""
    exact, casi, vistos = [], [], {}
    fichas = [(k, set(simple(q["q"]).split()), simple(q["o"][q["a"]])) for k, q in todas]
    for (k, q), (_, w, r) in zip(todas, fichas):
        s = simple(q["q"]) + "|" + r
        if s in vistos: exact.append((vistos[s], k))
        else: vistos[s] = k
    por_resp = {}
    for k, w, r in fichas: por_resp.setdefault(r, []).append((k, w))
    for grupo in por_resp.values():
        for (k1, w1), (k2, w2) in itertools.combinations(grupo, 2):
            if w1 and w2 and len(w1 & w2) / len(w1 | w2) >= umbral and (k1, k2) not in exact: casi.append((k1, k2))
    return exact, casi

def auditar():
    informe, todas = {}, []
    for f in sorted(glob.glob(os.path.join(D, "preguntas-*.json"))):
        slug = os.path.basename(f)[10:-5]
        arts = {a["n"]: norm(vigente(a["texto"])) for a in json.load(open(os.path.join(D, f"{slug}-articulos.json")))}
        qs = json.load(open(f)); r = {"total": len(qs), "estados": {}, "errores": [], "avisos": [], "sin_dificultad": 0, "sin_explicacion": 0}
        for i, q in enumerate(qs):
            est = q.get("verification_status", "VALID"); r["estados"][est] = r["estados"].get(est, 0) + 1
            if est in ("OUTDATED", "DEPRECATED"): continue
            todas.append((f"{slug}#{i}", q))
            r["sin_dificultad"] += "dif" not in q; r["sin_explicacion"] += "exp" not in q
            for control, grav, msg in comprobar(q, arts):
                (r["errores"] if grav == "error" else r["avisos"]).append({"i": i, "art": q.get("art"), "control": control, "mensaje": msg, "q": q.get("q", "")[:120]})
        informe[slug] = r
    exact, casi = duplicados(todas)
    for a, b in exact:
        s, i = b.split("#"); informe[s]["errores"].append({"i": int(i), "control": "DUPLICATE", "mensaje": "duplicada de " + a, "q": dict(todas)[b]["q"][:120]})
    for a, b in casi:
        s, i = b.split("#"); informe[s]["avisos"].append({"i": int(i), "control": "DUPLICATE", "mensaje": "casi idéntica a " + a, "q": dict(todas)[b]["q"][:120]})
    return informe

if __name__ == "__main__":
    inf = auditar()
    json.dump(inf, open(os.path.join(D, "calidad.json"), "w"), ensure_ascii=False, indent=1)
    ne = sum(len(r["errores"]) for r in inf.values()); na = sum(len(r["avisos"]) for r in inf.values())
    for s, r in inf.items():
        for e in r["errores"]: print(f"ERROR {s} #{e['i']} art {e.get('art')} [{e['control']}] {e['mensaje']} :: {e['q'][:80]}")
    print(f"{sum(r['total'] for r in inf.values())} preguntas · {ne} errores · {na} avisos (casi-duplicados, explicaciones cortas)")
    sys.exit(1 if ne else 0)
