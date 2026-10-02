"""Vigila las páginas oficiales de acceso de mossos.gencat.cat y registra en catalogo/novedades.json las publicaciones que
afectan a las oposiciones de la Generalitat (Mossos d'Esquadra), igual que vigilar_boe.py hace con el BOE.

- Página de la convocatoria vigente (vigilancia.web.convocatoria): cada bloque fechado («Llista definitiva…», «Indicacions per a
  la 1a prova…», «Sol·licitud de participació…») es una publicación: título literal, fecha, enlaces (resolución del DOGC si la hay).
- Índice «Accés al cos» (vigilancia.web.indice): un enlace nuevo de convocatoria de la misma categoría (p. ej. 46/27) es una
  posible convocatoria nueva → novedad con verification_status OFFICIAL_PENDING_REVIEW (no se aplica sola al catálogo).
- Guía de estudio (vigilancia.web.guia): si cambia el PDF oficial o aparecen esmenes nuevas → aviso para revisar las preguntas.

Todo procede de la web oficial (título y enlace literales); la clasificación por tipo es automática y se indica como tal.
robots.txt de mossos.gencat.cat permite el acceso; el portal del DOGC (portaldogc.gencat.cat) no, por eso no se rastrea.
Uso: python3 catalogo/vigilar_gencat.py [--sin-red fichero.html]   (estado en catalogo/vigilancia-gencat-estado.json)
"""
import datetime, hashlib, html, json, os, re, sys
D = os.path.dirname(os.path.abspath(__file__))
R = os.path.dirname(D)
sys.path.insert(0, R)
from ingesta import gencat as G  # noqa: E402
from catalogo.perfil import evento_de  # noqa: E402

NOV = os.path.join(D, "novedades.json")
EST = os.path.join(D, "vigilancia-gencat-estado.json")
TIPOS = [  # (tipo, regex sobre el título catalán). El primero que encaja gana.
    ("correccion", r"(?i)correcci[óo] d'errades|correcci[óo] d’errades|esmen"),
    ("modificacion", r"(?i)modificaci[óo]|\bes modifica"),
    ("aprobados", r"(?i)aprovad|resultats|qualificacions|puntuacions|aptes"),
    ("listas", r"(?i)admeses|excloses|admesos|exclosos|llista (provisional|definitiva)"),
    ("fecha_examen", r"(?i)indicacions per a la|convocades? a (la|realitzar)|calendari|data de (realitzaci|la prova)|\bprova\b"),
    ("nombramiento", r"(?i)nomenament"),
    ("convocatoria", r"(?i)bases de la convocat|sol·licitud de participaci|nova convocat|convocat[òo]ria"),
]


def tipo(t):
    for k, rx in TIPOS:
        if re.search(rx, t):
            return k
    return "otro"


def texto(h):
    m = re.search(r"<main.*?</main>", h, re.S)
    b = re.sub(r"<(script|style|nav|footer|header)[^>]*>.*?</\1>", "", m.group(0) if m else h, flags=re.S)
    b = re.sub(r'<a[^>]+href="([^"]+)"[^>]*>(.*?)</a>', lambda x: f"{re.sub('<[^>]+>', '', x.group(2)).strip()} [{x.group(1)}]", b, flags=re.S)
    return G.texto_html(b)


def absoluta(u):
    return u if u.startswith("http") else G.MOSSOS + u


def bloques(t):
    """Bloques fechados de una página de convocatoria: «Títol [#blocN_…]» seguido de «dd/mm/aaaa» y su contenido."""
    out, cur = [], None
    for l in t.split("\n"):
        s = l.strip()
        m = re.match(r"^(.+?) \[#bloc\d+_[^\]]+\]$", s)
        if m:
            cur = {"titulo": m.group(1).strip(), "fecha": None, "enlaces": []}
            out.append(cur); continue
        if cur is not None and cur["fecha"] is None:
            f = re.fullmatch(r"(\d{2})/(\d{2})/(\d{4})", s)
            if f:
                cur["fecha"] = f"{f.group(3)}-{f.group(2)}-{f.group(1)}"; continue
        if cur is not None:
            for txt, u in re.findall(r"([^\[\]]{3,}?)\s*\[([^\]#][^\]]*)\]", s):
                cur["enlaces"].append({"texto": txt.strip(" .·"), "url": absoluta(u)})
    return [b for b in out if b["fecha"]]


def novedades_convocatoria(o, t):
    w = o["vigilancia"]["web"]
    res = []
    for b in bloques(t):
        dogc = next((e["url"] for e in b["enlaces"] if "documentId=" in e["url"]), None)
        url = dogc or w["convocatoria"]
        ndoc = re.search(r"documentId=(\d+)", dogc).group(1) if dogc else None
        ident = f"DOGC-{ndoc}" if ndoc else "MOSSOS-" + hashlib.sha1((b["titulo"] + b["fecha"]).encode()).hexdigest()[:10]
        res.append({"oposicion": o["id"], "fecha": b["fecha"], "id": ident, "titulo": b["titulo"], "url": url, "tipo": tipo(b["titulo"]),
                    "fuente": "mossos.gencat.cat", "pagina": w["convocatoria"], "relevancia": "convocatoria",
                    "verification_status": "OFFICIAL_VERIFIED", "documentos": [e for e in b["enlaces"] if e["url"].lower().endswith(".pdf") or "documentId=" in e["url"]][:8]})
    return res


def convocatorias_nuevas(o, t, conocidas):
    w = o["vigilancia"]["web"]
    patron = re.compile(w["patron_convocatoria"])
    res = []
    for txt, u in re.findall(r"([^\[\]]{3,}?)\s*\[([^\]]+)\]", t):
        u = absoluta(u.split("#")[0])
        if patron.search(u) and u.rstrip("/") + "/" not in conocidas:
            res.append({"oposicion": o["id"], "fecha": datetime.date.today().isoformat(), "id": "MOSSOS-" + hashlib.sha1(u.encode()).hexdigest()[:10],
                        "titulo": txt.strip(), "url": u, "tipo": "convocatoria", "fuente": "mossos.gencat.cat", "relevancia": "convocatoria",
                        "verification_status": "OFFICIAL_PENDING_REVIEW",
                        "nota": "Possible convocatòria nova detectada a l'índex oficial d'accés: cal revisar-la i incorporar-la amb les seves bases del DOGC."})
    return res


def vigilar(opos, fetch=lambda u: G.http(u).decode("utf-8", "ignore"), hoy=None):
    hoy = hoy or datetime.date.today().isoformat()
    nov = json.load(open(NOV)) if os.path.exists(NOV) else []
    est = json.load(open(EST)) if os.path.exists(EST) else {}
    vistos = {(n["oposicion"], n["id"]) for n in nov}
    nuevas, avisos = [], []
    for o in opos:
        w = (o.get("vigilancia") or {}).get("web")
        if not w:
            continue
        e = est.setdefault(o["id"], {})
        try:
            t = texto(fetch(w["convocatoria"]))
            for n in novedades_convocatoria(o, t):
                if (n["oposicion"], n["id"]) not in vistos:
                    n["detectado"] = hoy; nuevas.append(n); vistos.add((n["oposicion"], n["id"]))
            ti = texto(fetch(w["indice"]))
            for n in convocatorias_nuevas(o, ti, set(w.get("conocidas", [])) | {w["convocatoria"]}):
                if (n["oposicion"], n["id"]) not in vistos:
                    n["detectado"] = hoy; nuevas.append(n); vistos.add((n["oposicion"], n["id"]))
            if w.get("guia"):
                pdfs = sorted(set(u for _, u in re.findall(r"([^\[\]]{3,}?)\s*\[([^\]]+\.pdf)\]", t) if re.search(r"(?i)guia|esmen", u)))
                if e.get("pdfs_guia") is not None and pdfs != e["pdfs_guia"]:
                    avisos.append({"oposicion": o["id"], "tipo": "guia_cambiada", "antes": e["pdfs_guia"], "ahora": pdfs, "fecha": hoy})
                    nuevas.append({"oposicion": o["id"], "fecha": hoy, "id": "MOSSOS-GUIA-" + hashlib.sha1("".join(pdfs).encode()).hexdigest()[:8],
                                   "titulo": "Canvis a la guia d'estudi o a les seves esmenes (documents publicats a la web oficial)", "url": w["convocatoria"],
                                   "tipo": "correccion", "fuente": "mossos.gencat.cat", "relevancia": "convocatoria", "verification_status": "OFFICIAL_PENDING_REVIEW",
                                   "documentos": [{"texto": os.path.basename(u), "url": absoluta(u)} for u in pdfs], "detectado": hoy})
                e["pdfs_guia"] = pdfs
            e.update(ultimo_ok=hoy, error=None)
        except Exception as ex:  # una caída de la web no borra nada: se registra y se reintenta en la próxima ejecución
            e.update(error=f"{type(ex).__name__}: {str(ex)[:160]}", ultimo_error=hoy)
    for n in nuevas:
        n["evento"] = evento_de(n)
    nov += nuevas
    nov.sort(key=lambda n: (n["fecha"], n["id"]), reverse=True)
    with open(NOV, "w", encoding="utf-8") as f:
        f.write(json.dumps(nov, ensure_ascii=False, indent=1) + "\n")
    with open(EST, "w", encoding="utf-8") as f:
        f.write(json.dumps(est, ensure_ascii=False, indent=1) + "\n")
    return nuevas, avisos


if __name__ == "__main__":
    opos = [json.load(open(p)) for p in sorted(__import__("glob").glob(os.path.join(D, "oposiciones", "*.json")))]
    nuevas, avisos = vigilar(opos)
    print(f"Mossos/Generalitat: {len(nuevas)} publicacions noves" + "".join(f"\n  {n['fecha']} [{n['tipo']}] {n['titulo'][:90]} ({n['verification_status']})" for n in nuevas))
    for a in avisos:
        print(f"  AVÍS: {a['tipo']} {a['oposicion']}")
