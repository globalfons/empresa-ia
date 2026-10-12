"""Convierte el texto consolidado de la API de datos abiertos del BOE (XML) al Markdown que espera datos/parse_boe.py.
Se usa cuando el espejo legalize-es no tiene la norma. Toma la última versión (vigente) de cada bloque.
Uso: python3 datos/boe_xml_md.py fuente.xml salida.md
"""
import re, sys, xml.etree.ElementTree as ET

src, out = sys.argv[1], sys.argv[2]
raiz = ET.parse(src).getroot()
L = []
txt = lambda p: re.sub(r"\s+", " ", "".join(p.itertext())).strip()
for b in raiz.iter("bloque"):
    vs = b.findall("version")
    if not vs:
        continue
    ps = [(p.get("class") or "", txt(p)) for p in vs[-1].iter("p") if txt(p)]
    tipo = b.get("tipo")
    if tipo == "encabezado":
        num = next((t for c, t in ps if c.endswith("_num")), b.get("titulo") or "")
        tit = next((t for c, t in ps if c.endswith("_tit")), "")
        nivel = "##" if num.upper().startswith(("TÍTULO", "TITULO", "LIBRO")) else "###"
        L.append(f"{nivel} {num}{'. ' + tit if tit else ''}")
    elif tipo == "precepto":
        cab = next((t for c, t in ps if c == "articulo"), b.get("titulo") or "")
        L.append(f"##### {cab}")
        L += [t for c, t in ps if c != "articulo"]
    L.append("")
open(out, "w", encoding="utf-8").write("\n".join(L) + "\n")
