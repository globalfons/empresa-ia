"""Normalización común para comparar citas con el texto oficial."""
import re, unicodedata
def norm(s):
    s = unicodedata.normalize("NFC", s)
    s = s.replace(" ", " ").replace("\t", " ")
    return re.sub(r"\s+", " ", s).strip()
def vigente(t):  # descarta notas y redacciones anteriores (líneas citadas con ">")
    return "\n".join(l for l in t.split("\n") if not l.lstrip().startswith(">"))
