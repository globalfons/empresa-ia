"""Parsers por tipo de contenido. Todos devuelven {"texto": str, "enlaces": [(texto, url)], "titulo": str}.
Soporta HTML, PDF, JSON, XML y CSV. El texto es la base de las citas literales que luego se validan.
"""
import re, html as H, json, csv, io
from urllib.parse import urljoin
import xml.etree.ElementTree as ET

def tipo_de(content_type, url):
    c = (content_type or "").lower(); u = url.lower().split("?")[0]
    if "pdf" in c or u.endswith(".pdf"): return "pdf"
    if "json" in c or u.endswith(".json"): return "json"
    if "csv" in c or u.endswith(".csv"): return "csv"
    if "xml" in c or u.endswith(".xml"): return "xml"
    return "html"

def _limpio(t): return re.sub(r"[ \t  ]+", " ", re.sub(r"\n\s*\n+", "\n", t)).strip()

def html(b, url=""):
    s = b.decode("utf-8", "replace") if isinstance(b, bytes) else b
    tit = re.search(r"<title[^>]*>(.*?)</title>", s, re.S | re.I)
    enlaces = [(H.unescape(re.sub(r"<[^>]+>", " ", m.group(2))).strip(), urljoin(url, H.unescape(m.group(1))))
               for m in re.finditer(r'<a\s[^>]*href="([^"#]+)"[^>]*>(.*?)</a>', s, re.S | re.I)]
    # Documentos del BOE: solo el cuerpo de la disposición
    m = re.search(r'<div id="textoxslt"[^>]*>(.*)', s, re.S)
    cuerpo = m.group(1) if m else s
    cuerpo = re.sub(r"<head[^>]*>.*?</head>", " ", cuerpo, flags=re.S | re.I)
    cuerpo = re.sub(r"<(script|style|nav|header|footer|noscript)[^>]*>.*?</\1>", " ", cuerpo, flags=re.S | re.I)
    cuerpo = re.sub(r"</(a|span|strong|em|b|i)>", " ", cuerpo, flags=re.I)
    cuerpo = re.sub(r"<(p|h\d|div|li|tr|br|td|th)[^>]*>", "\n", cuerpo, flags=re.I)
    texto = _limpio(H.unescape(re.sub(r"<[^>]+>", "", cuerpo)))
    return {"texto": texto, "enlaces": enlaces, "titulo": H.unescape(tit.group(1)).strip() if tit else ""}

def pdf(b, url=""):
    try:
        import pypdf  # se importa solo si hace falta
    except Exception as e:
        raise RuntimeError("Falta la librería pypdf para leer PDF (pip install pypdf)") from e
    r = pypdf.PdfReader(io.BytesIO(b))
    texto = "\n".join((p.extract_text() or "") for p in r.pages)
    return {"texto": _limpio(texto), "enlaces": [], "titulo": (r.metadata or {}).get("/Title", "") if r.metadata else ""}

def json_(b, url=""):
    d = json.loads(b)
    return {"texto": json.dumps(d, ensure_ascii=False, indent=1), "enlaces": [], "titulo": "", "datos": d}

def xml(b, url=""):
    raiz = ET.fromstring(b)
    return {"texto": _limpio("\n".join(t.strip() for t in raiz.itertext() if t.strip())), "enlaces": [], "titulo": raiz.tag}

def csv_(b, url=""):
    s = b.decode("utf-8-sig", "replace")
    filas = list(csv.reader(io.StringIO(s), delimiter=";" if s.count(";") > s.count(",") else ","))
    return {"texto": "\n".join(" | ".join(f) for f in filas), "enlaces": [], "titulo": "", "filas": filas}

PARSERS = {"html": html, "pdf": pdf, "json": json_, "xml": xml, "csv": csv_}
def parsear(b, content_type, url): return tipo_de(content_type, url), PARSERS[tipo_de(content_type, url)](b, url)
