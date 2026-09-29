"""Núcleo del motor de ingesta: rutas, estado persistente, registro de ejecuciones y descargas.
El "almacén" es un conjunto de ficheros JSON versionados en git: cada cambio queda auditado en el historial.
"""
import json, os, hashlib, datetime, time, urllib.request, urllib.error, urllib.robotparser, subprocess, re
from urllib.parse import urlparse

R = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.dirname(R)
EST = os.path.join(R, "estado")
DOCS = os.path.join(R, "documentos")
LOGS = os.path.join(R, "logs")
UA = "TestLeyBot/1.0 (+https://globalfons.github.io/empresa-ia/; globalprsx@gmail.com)"
for d in (EST, DOCS, LOGS): os.makedirs(d, exist_ok=True)

def ahora(): return datetime.datetime.now(datetime.timezone.utc).replace(microsecond=0)
def iso(dt): return dt.isoformat().replace("+00:00", "Z")
def leer(nombre, defecto):
    p = os.path.join(EST, nombre)
    return json.load(open(p)) if os.path.exists(p) else defecto
def guardar(nombre, datos):
    p = os.path.join(EST, nombre); tmp = p + ".tmp"
    json.dump(datos, open(tmp, "w"), ensure_ascii=False, indent=1); os.replace(tmp, p)
def fuentes(): return json.load(open(os.path.join(R, "fuentes.json")))
def log(evento, **datos):
    datos.update({"t": iso(ahora()), "evento": evento})
    with open(os.path.join(LOGS, ahora().strftime("%Y-%m") + ".jsonl"), "a") as f: f.write(json.dumps(datos, ensure_ascii=False) + "\n")
def sha256(b): return hashlib.sha256(b if isinstance(b, bytes) else b.encode()).hexdigest()
def doc_id(url): return hashlib.sha1(url.encode()).hexdigest()[:16]

class ErrorFuente(Exception):
    def __init__(self, msg, tipo="error"): super().__init__(msg); self.tipo = tipo  # tipo: error | inaccesible | robots

_robots = {}
def permitido(url):
    u = urlparse(url); base = f"{u.scheme}://{u.netloc}"
    if base not in _robots:
        rp = urllib.robotparser.RobotFileParser(); rp.set_url(base + "/robots.txt")
        try:
            req = urllib.request.Request(base + "/robots.txt", headers={"User-Agent": UA})
            rp.parse(urllib.request.urlopen(req, timeout=15).read().decode("utf-8", "replace").splitlines())
        except Exception:
            rp.parse([])  # sin robots.txt accesible: se permite
        _robots[base] = rp
    return _robots[base].can_fetch(UA, url)

def http(url, accept="*/*", intentos=3, timeout=40):
    """Descarga con reintentos y espera exponencial. Devuelve (bytes, content_type, url_final)."""
    if not permitido(url): raise ErrorFuente(f"robots.txt no permite {url}", "robots")
    ultimo = None
    for i in range(intentos):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": accept, "Accept-Language": "es-ES,es;q=0.9"})
            r = urllib.request.urlopen(req, timeout=timeout)
            return r.read(), r.headers.get("Content-Type", ""), r.geturl()
        except urllib.error.HTTPError as e:
            if e.code in (404, 410): raise ErrorFuente(f"HTTP {e.code} {url}", "error")
            ultimo = f"HTTP {e.code}"
        except Exception as e:
            ultimo = f"{type(e).__name__}: {str(e)[:160]}"
        time.sleep(2 ** (i + 1))
    raise ErrorFuente(f"No accesible tras {intentos} intentos: {ultimo}", "inaccesible")

def navegador(url, espera_ms=2500):
    """Webs dinámicas: renderiza con Playwright (Chromium) mediante un proceso Node."""
    if not permitido(url): raise ErrorFuente(f"robots.txt no permite {url}", "robots")
    p = subprocess.run(["node", os.path.join(R, "crawler_playwright.cjs"), url, str(espera_ms)], capture_output=True, text=True, timeout=120)
    if p.returncode != 0: raise ErrorFuente("Navegador: " + (p.stderr.strip().splitlines() or ["error"])[-1][:200], "inaccesible")
    j = json.loads(p.stdout)
    return j["html"].encode("utf-8"), "text/html; charset=utf-8", j["url"]
