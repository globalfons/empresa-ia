"""SEO Engine: puerta de calidad antes de indexar (catalogo/seo_calidad.json, la misma que usa build.mjs) y rutas de artículos.
Las páginas las genera build.mjs a partir de los datos; aquí se decide si una entidad merece página indexable, se evitan duplicados
y se calcula la ruta. No se crean páginas «keyword + texto IA»: solo entidades reales con datos, fuente y fecha."""
import os, json, re, unicodedata
from . import nucleo as N

Q = json.load(open(os.path.join(N.RAIZ, "catalogo", "seo_calidad.json")))

def util_convocatoria(v):
    q = Q["convocatoria"]
    return len([k for k in v.get("datos", {}) if k not in q["campos_no_utiles"]]) >= q["campos_utiles_min"]

def evaluar_entidad(tipo, eid):
    if tipo == "convocatoria":
        p = os.path.join(N.RAIZ, "catalogo", "convocatorias", eid + ".json")
        if not os.path.exists(p): return {"ruta": None, "indexable": False, "motivo": "no existe"}
        v = json.load(open(p)); ok = util_convocatoria(v)
        return {"ruta": f"convocatorias/{eid}/", "indexable": ok, "motivo": "datos suficientes" if ok else "pocos datos estructurados: noindex", "lastmod": (v.get("last_verified_at") or "")[:10]}
    if tipo == "oposicion":
        return {"ruta": f"oposiciones/{eid}/", "indexable": os.path.exists(os.path.join(N.RAIZ, "catalogo", "oposiciones", eid + ".json")), "motivo": "ficha revisada"}
    return {"ruta": None, "indexable": False, "motivo": "sin página para " + tipo}

def slug(t):
    t = unicodedata.normalize("NFD", t.lower()).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", t).strip("-")[:80]

def ruta_articulo(c):
    return f"noticias/{slug(c['title'])}-{c['facts'].get('id', c['id'])[-8:].lower()}/"

def calidad_articulo(c, publicados=()):
    """Checks: contenido suficiente, fuente oficial, enlace interno (CTA), estado de verificación, unicidad."""
    q = Q["articulo"]; prob = []
    if len(re.findall(r"\w+", c["body"])) < q["palabras_min"]: prob.append("contenido insuficiente")
    if q["requiere_fuente_oficial"] and not any(u in c["body"] for u in c.get("source_urls", [])): prob.append("sin enlace a la fuente oficial")
    if q["requiere_enlace_interno"] and N.config()["url"] not in c["body"]: prob.append("sin enlace interno / CTA")
    if c["facts"].get("verification_status") not in q["estados_verificacion_indexables"]: prob.append("dato oficial no verificado")
    if any(p["facts"].get("id") == c["facts"].get("id") and p["id"] != c["id"] for p in publicados): prob.append("duplicado: ya hay un artículo de esta convocatoria")
    return {"indexable": not prob, "problemas": prob}
