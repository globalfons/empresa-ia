"""Vínculo entre publicaciones oficiales y oposiciones del catálogo. Una sola regla para todo el sistema
(vigilar_boe.py, ingesta/extraer.py, Growth OS): «vigilancia.grupos» de cada oposición (todos los términos de un grupo en el título).
Relación:
  misma_convocatoria  → es la convocatoria que ya usa la ficha (fuentes.convocatoria.id)
  nueva_convocatoria  → otra convocatoria del mismo cuerpo (p. ej. la del año siguiente): la ficha debe revisarse
  mismo_cuerpo        → otra publicación del cuerpo (listas, fechas, nombramientos…)
"""
import os, re, json, glob
D = os.path.dirname(os.path.abspath(__file__))
ES_CONVOCATORIA = re.compile(r"(?i)\bse convoca|\bconvocan\b|por la que se convoca|proceso selectivo para (el )?ingreso")
NO_CONVOCATORIA = re.compile(r"(?i)correcci[oó]n de errores|se modifica|admitid|excluid|aprobad|superado|relaci[oó]n de aspirantes|convocad[oa] por|"
                             r"se nombra|nombramiento|fecha|lugar de celebraci|tribunal|obtenci[oó]n de la especialidad")

def cargar_oposiciones():
    return [json.load(open(p)) for p in sorted(glob.glob(os.path.join(D, "oposiciones", "*.json")))]

def coincide(titulo, grupos):
    t = (titulo or "").lower()
    return any(all(term.lower() in t for term in g) for g in grupos or [])

def vincular(pub_id, titulo, opos=None):
    """Oposiciones del catálogo afectadas por una publicación oficial, con el tipo de relación."""
    out = []
    for o in (cargar_oposiciones() if opos is None else opos):
        actual = (o.get("fuentes", {}).get("convocatoria") or {}).get("id")
        if pub_id and pub_id == actual:
            out.append({"oposicion": o["id"], "relacion": "misma_convocatoria"}); continue
        if not coincide(titulo, (o.get("vigilancia") or {}).get("grupos")): continue
        nueva = ES_CONVOCATORIA.search(titulo or "") and not NO_CONVOCATORIA.search(titulo or "")
        out.append({"oposicion": o["id"], "relacion": "nueva_convocatoria" if nueva else "mismo_cuerpo"})
    return out
