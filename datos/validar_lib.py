"""Normalización común para comparar citas con el texto oficial."""
import json, os, re, subprocess, sys, unicodedata
def norm(s):
    s = unicodedata.normalize("NFC", s)
    s = s.replace(" ", " ").replace("\t", " ")
    return re.sub(r"\s+", " ", s).strip()
def vigente(t):  # descarta notas y redacciones anteriores (líneas citadas con ">")
    return "\n".join(l for l in t.split("\n") if not l.lstrip().startswith(">"))

_R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def ruta_articulos(slug):
    """Texto por artículo de una norma: datos/<slug>-articulos.json, o la ruta indicada en catalogo/normas_base.json para
    fuentes oficiales que no se versionan (guía de Mossos en datos/cache/, descargada de su fuente oficial si falta)."""
    n = next((x for x in json.load(open(os.path.join(_R, "catalogo", "normas_base.json"))) if x["slug"] == slug), {})
    if not n.get("articulos"):
        return os.path.join(_R, "datos", f"{slug}-articulos.json")
    ruta = os.path.join(_R, n["articulos"])
    if not os.path.exists(ruta) and n.get("tipo") == "guia_oficial":
        subprocess.run([sys.executable, "-m", "ingesta.gencat", "guia"], cwd=_R, check=True, capture_output=True)
    return ruta
