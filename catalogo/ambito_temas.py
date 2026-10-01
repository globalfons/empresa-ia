"""Acota cada tema a la parte de la ley que le corresponde (títulos/capítulos oficiales), cuando una misma ley se reparte
entre varios temas de una oposición (p. ej. la Constitución en 7 temas). Sin esto, el «test del tema 3: Las Cortes Generales»
mezclaría preguntas de todo el texto constitucional.

Método determinista y explicable (Contenido de TestLey, no oficial):
  - unidades = TÍTULO y CAPÍTULO de cada artículo (estructura oficial del texto consolidado del BOE)
  - se comparan las palabras significativas del título oficial del tema con el nombre de cada unidad
  - una unidad se asigna si comparte ≥ 2 raíces significativas, o 1 raíz poco frecuente en la ley (p. ej. «Corona», «Senado»)
  - si ninguna unidad encaja, el tema conserva la ley entera y queda marcado «sin_precisar» en el control de calidad
Salida: catalogo/temas_ambito.json  (se regenera con construir.py). Correcciones manuales por rangos de artículos en
catalogo/temas_ambito_manual.json (cuando la coincidencia de palabras falla, p. ej. «concurso de delitos»).
"""
import json, os, re, unicodedata, collections
D = os.path.dirname(os.path.abspath(__file__)); DATOS = os.path.join(os.path.dirname(D), "datos")
VACIAS = set("""de la el los las del y en a su sus o u por para con sin sobre entre al lo que se un una unos unas como segun ante tras
desde hasta otros otras otro otra este esta estos estas ese esa general generales especial disposiciones disposicion ley leyes
titulo capitulo seccion articulo articulos preliminar primero segundo tercero cuarto quinto sexto septimo octavo noveno decimo
regimen normas norma principios principio concepto conceptos clases clase caracteres contenido estructura funciones organizacion
constitucion constitucional constitucionales espanola espanol estado""".split())

def raices(t):
    t = unicodedata.normalize("NFD", (t or "").lower()); t = "".join(c for c in t if unicodedata.category(c) != "Mn")
    return {w[:6] for w in re.findall(r"[a-zñ]{4,}", t) if w not in VACIAS}

def unidades(slug):
    arts = json.load(open(os.path.join(DATOS, f"{slug}-articulos.json")))
    u = collections.OrderedDict()
    for a in arts:
        b, c = a.get("bloque") or "", a.get("capitulo") or ""
        u.setdefault(b, {"nombre": b, "arts": []})["arts"].append(a["n"])
        if c: u.setdefault(b + "|" + c, {"nombre": c, "arts": []})["arts"].append(a["n"])
    return u

def asignar(titulo, slug, cache={}):
    """Puntúa cada unidad por las raíces que comparte con el título del tema, pesadas por su rareza en la ley (IDF):
    «Corona» o «Senado» pesan mucho; «Administraciones» o «personal», que salen en muchos títulos, casi nada."""
    import math
    if slug not in cache: cache[slug] = unidades(slug)
    U = cache[slug]; rt = raices(titulo)
    if not rt: return []
    frec = collections.Counter(r for x in U.values() for r in raices(x["nombre"]))
    idf = lambda r: math.log((1 + len(U)) / frec[r])
    punt = []
    for k, x in U.items():
        comun = rt & raices(x["nombre"])
        sc = sum(idf(r) for r in comun)
        if sc > 0: punt.append((sc, k, sorted(comun)))
    if not punt: return []
    # Umbral absoluto por unidad: un tema que abarca varios títulos (p. ej. «De la Corona. De las Cortes…») los recibe todos,
    # y las coincidencias solo con palabras frecuentes en la ley (baja rareza) no bastan.
    elegidas = [(k, c) for sc, k, c in punt if sc >= 2.2]
    titulos = {k for k, _ in elegidas if "|" not in k}  # si se elige un título entero, sus capítulos sobran
    return [(k, c) for k, c in elegidas if "|" not in k or k.split("|")[0] not in titulos]

def por_rangos(slug, rangos):
    """Artículos entre dos números (inclusive), en el orden del texto consolidado."""
    orden = [a["n"] for a in json.load(open(os.path.join(DATOS, f"{slug}-articulos.json")))]
    out = []
    for a, b in rangos:
        if a not in orden or b not in orden: raise ValueError(f"{slug}: artículo {a if a not in orden else b} no existe")
        out += orden[orden.index(a):orden.index(b) + 1]
    return list(dict.fromkeys(out))

def construir(opos):
    manual = json.load(open(os.path.join(D, "temas_ambito_manual.json")))
    previo = json.load(open(os.path.join(D, "temas_ambito.json"))) if os.path.exists(os.path.join(D, "temas_ambito.json")) else {}
    base = {n["id"]: n for n in json.load(open(os.path.join(D, "normas_base.json")))}
    normas = {i: n["slug"] for i, n in base.items()}
    out = {}
    for o in opos:
        uso = collections.Counter(n for t in o["temario"] for n in t["normas"])
        for i, t in enumerate(o["temario"]):
            for n in t["normas"]:
                slug = normas.get(n)
                k = f"{o['id']}#{i}#{slug}"
                # Guía oficial estructurada como el temario (Mossos: «A.1.3»): el tema abarca sus apartados oficiales
                if slug and (base[n].get("tipo") == "guia_oficial") and t.get("codigo"):
                    ruta = os.path.join(os.path.dirname(D), base[n]["articulos"])
                    if os.path.exists(ruta):
                        arts = [a["n"] for a in json.load(open(ruta)) if a["n"].startswith(t["codigo"] + ".")]
                        out[k] = {"tema": t["tema"], "titulo": t["titulo"][:160], "ley": slug, "unidades": [t["codigo"]], "coincidencias": {},
                                  "articulos": arts, "estado": "precisado" if arts else "sin_precisar", "metodo": "apartats oficials de la guia per al codi del tema"}
                    continue
                # Una ley que solo aparece en un tema se incluye completa, salvo corrección manual de su ámbito
                if not slug or (uso[n] < 2 and k not in manual) or not os.path.exists(os.path.join(DATOS, f"{slug}-articulos.json")): continue
                if (previo.get(k) or {}).get("fijado"): out[k] = previo[k]; continue  # corrección manual: se respeta
                if k in manual:  # corrección manual por rangos contra la estructura oficial (temas_ambito_manual.json)
                    out[k] = {"tema": t["tema"], "titulo": t["titulo"][:160], "ley": slug, "unidades": manual[k]["unidades"], "coincidencias": {},
                              "articulos": por_rangos(slug, manual[k]["rangos"]), "estado": "precisado", "metodo": "corrección manual contra la estructura oficial"}
                    continue
                el = asignar(t["titulo"], slug)
                arts = sorted({a for u, _ in el for a in unidades(slug)[u]["arts"]}, key=lambda x: (int(re.match(r"\d+", x).group()) if re.match(r"\d+", x) else 9999, x))
                out[k] = {"tema": t["tema"], "titulo": t["titulo"][:160], "ley": slug, "unidades": [u for u, _ in el], "coincidencias": {u: c for u, c in el},
                          "articulos": arts, "estado": "precisado" if arts else "sin_precisar", "metodo": "similitud con títulos y capítulos oficiales"}
    json.dump(out, open(os.path.join(D, "temas_ambito.json"), "w"), ensure_ascii=False, indent=1)
    return out

if __name__ == "__main__":
    out = construir(json.load(open(os.path.join(D, "oposiciones.json"))))
    c = collections.Counter(v["estado"] for v in out.values())
    print(dict(c))
