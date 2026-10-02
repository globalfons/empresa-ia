"""Crawler de enlaces internos de la web generada (docs/): cada href/src relativo de cada página debe existir
(fichero, o carpeta con index.html). Los enlaces externos, mailto:, tel:, javascript: y anclas (#) no se comprueban.
Uso: node build.mjs && python3 scripts/crawler_enlaces.py   → código de salida ≠ 0 si hay enlaces rotos."""
import html, os, re, sys
from urllib.parse import unquote, urlsplit

R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DOCS = os.path.join(R, "docs")
BASE = "/empresa-ia/"  # ruta del sitio en GitHub Pages
ATTR = re.compile(r'\s(?:href|src)="([^"]*)"')


def destino(pagina, url):
    u = urlsplit(html.unescape(url))
    if u.scheme or u.netloc or not u.path or url.startswith(("#", "mailto:", "tel:", "javascript:", "data:")):
        return None
    if u.path.startswith(BASE):  # rutas absolutas del sitio publicado (p. ej. 404.html): /empresa-ia/… → docs/…
        return os.path.normpath(os.path.join(DOCS, unquote(u.path[len(BASE):])))
    p = os.path.normpath(os.path.join(os.path.dirname(pagina), unquote(u.path)))
    return p


def existe(p):
    return os.path.isfile(p) or os.path.isfile(os.path.join(p, "index.html"))


def main():
    rotos, paginas, enlaces = [], 0, 0
    for raiz, _, fs in os.walk(DOCS):
        for f in fs:
            if not f.endswith(".html"):
                continue
            pag = os.path.join(raiz, f)
            paginas += 1
            for url in set(ATTR.findall(open(pag, encoding="utf-8").read())):
                d = destino(pag, url)
                if d is None:
                    continue
                enlaces += 1
                if not d.startswith(DOCS) or not existe(d):
                    rotos.append((os.path.relpath(pag, DOCS), url))
    print(f"{paginas} páginas · {enlaces} enlaces internos · {len(rotos)} rotos")
    for p, u in rotos[:30]:
        print(f"  ROTO {p} → {u}")
    return 1 if rotos else 0


if __name__ == "__main__":
    sys.exit(main())
