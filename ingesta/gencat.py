"""Fuentes oficiales de la Generalitat de Catalunya (Mossos d'Esquadra): DOGC, web de Mossos y guía de estudio.

Registro: datos/fuentes-gencat.json. Cada documento oficial guarda source_url, source_document, source_type, published_at,
retrieved_at, verified_at, verification_status y sha256 del contenido descargado.

  python3 -m ingesta.gencat dogc <documentId> [...]   → texto en catalogo/fuentes/DOGC-<documentId>.txt + registro
  python3 -m ingesta.gencat guia                      → descarga la guía oficial y sus esmenes y la trocea por apartados
                                                         en datos/cache/guia-mossos-articulos.json (no se versiona:
                                                         © Generalitat; se cita en las preguntas y se enlaza el PDF)
  python3 -m ingesta.gencat estado                    → resumen del registro

robots.txt: portaldogc.gencat.cat no admite rastreo automático (Disallow: /). Por eso este módulo solo consulta documentos
DOGC concretos a petición (no rastrea) y la vigilancia periódica usa las páginas de mossos.gencat.cat (ingesta/fuentes.json),
que enlazan cada resolución.
"""
import datetime, hashlib, html, json, os, re, subprocess, sys, unicodedata, urllib.parse

R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REGISTRO = os.path.join(R, "datos", "fuentes-gencat.json")
CACHE = os.path.join(R, "datos", "cache")
GUIA_JSON = os.path.join(CACHE, "guia-mossos-articulos.json")
UA = "TestLey/1.0 (+https://globalfons.github.io/empresa-ia/; fuentes oficiales)"
DOGC_API = "https://portaldogc.gencat.cat/eadop-rest/api/dogc/documentDOGC"
DOGC_URL = "https://dogc.gencat.cat/ca/document-del-dogc/?documentId={}"
MOSSOS = "https://mossos.gencat.cat"
GUIA = {
    "id": "GUIA-MOSSOS-2026",
    "source_document": "Guia d'estudi per accedir a la categoria de mosso/a del Cos de Mossos d'Esquadra. Edició juny 2026 (1a edició, ISBN 979-13-87889-34-0)",
    "url": MOSSOS + "/web/.content/home/01_els_mossos_desquadra/ingres-cos/Escala-bAsica/convocatoria-46-26/Guia_Mossos_Edicio_Juny_2026.pdf",
    "esmenes_url": MOSSOS + "/web/.content/home/01_els_mossos_desquadra/ingres-cos/Escala-bAsica/convocatoria-46-26/Esmenes-edicio-PDF-guia-estudi-setembre-2026.pdf",
    "pagina": MOSSOS + "/ca/els_mossos_desquadra/acces_al_cos/Mosso_a/mosso-a-convocatoria-46-26/",
    "versio": "2026-06 (esmenes 2026-09)",
}
# Esmenes oficials (setembre 2026) a l'edició PDF, transcrites literalment del document oficial GUIA["esmenes_url"].
ESMENES = [
    {"tema": "A.2", "lloc": "Idees força, punt 11 (pàgina 30)",
     "on_diu": "Pasqual Maragall fou president de la Generalitat del 2003 al 2006, José Montilla del 2006 al 2010, Artur Mas del 2010 al 2015. Carles Puigdemont del 10 de gener de 2016 al 27 d’octubre de 2017, cessat per l’aplicació de l’art. 155 de la CE. Joaquim Torra del 14 de maig de 2018 fins l’actualitat",
     "ha_de_dir": "Pasqual Maragall fou president de la Generalitat del 2003 al 2006, José Montilla, del 2006 al 2010, Artur Mas, del 2010 al 2015. Carles Puigdemont, del 10 de gener de 2016 al 27 d’octubre de 2017, cessat per l’aplicació de l’art. 155 de la CE. Joaquim Torra, del 17 de maig de 2018 fins al 28 de setembre de 2020, i Pere Aragonès, del 24 de maig de 2021 al 10 d’agost de 2024. Salvador Illa és president de la Generalitat des del 10 d’agost de 2024 fins a l’actualitat."},
    {"tema": "A.5", "lloc": "pàgina 56",
     "on_diu": "El seu territori està dividit en quatre províncies, Barcelona, Tarragona, Lleida i Girona, i en 43 comarques.",
     "ha_de_dir": "El seu territori està dividit en quatre províncies, Barcelona, Tarragona, Lleida i Girona, i en 42 comarques i l’Aran, que és una entitat territorial singular."},
    {"tema": "A.5", "lloc": "Idees força, punt 1 (pàgina 64)",
     "on_diu": "Administrativament, Catalunya s’organitza en vuit vegueries, 42 comarques i 947 municipis.",
     "ha_de_dir": "Administrativament, Catalunya s’organitza en vuit vegueries, 42 comarques i l’Aran, que és una entitat territorial singular, i 947 municipis."},
    {"tema": "B.8", "lloc": "pàgina 168",
     "on_diu": "Actualment, però, amb la sortida del Regne Unit de la UE, el Parlament Europeu està format per 705 diputats, dels quals 59 corresponen a Espanya.",
     "ha_de_dir": "Actualment, però, amb la sortida del Regne Unit de la UE, el Parlament Europeu està format per 720 diputats, dels quals 60 corresponen a Espanya."},
]


def ahora():
    return datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds")


def norm(s):
    s = unicodedata.normalize("NFC", s).replace(" ", " ").replace("\t", " ")
    return re.sub(r"\s+", " ", s).strip()


def leer_registro():
    return json.load(open(REGISTRO, encoding="utf-8")) if os.path.exists(REGISTRO) else {"documentos": []}


def registrar(doc):
    """Añade o actualiza un documento del registro por source_url (conserva el historial de huellas)."""
    reg = leer_registro()
    prev = next((d for d in reg["documentos"] if d["source_url"] == doc["source_url"]), None)
    if prev and prev.get("sha256") == doc.get("sha256") and prev.get("apartats_sha") == doc.get("apartats_sha", prev.get("apartats_sha")):
        return  # mismo contenido: no se reescribe el registro (sin ruido de fechas en cada ejecución)
    if prev:
        if prev.get("sha256") and prev["sha256"] != doc.get("sha256"):
            doc.setdefault("historial", prev.get("historial", [])).append({"sha256": prev["sha256"], "retrieved_at": prev.get("retrieved_at")})
        else:
            doc["historial"] = prev.get("historial", [])
        reg["documentos"][reg["documentos"].index(prev)] = {**prev, **doc}
    else:
        reg["documentos"].append(doc)
    reg["documentos"].sort(key=lambda d: (d.get("source_type", ""), d.get("published_at") or "", d["source_url"]))
    with open(REGISTRO, "w", encoding="utf-8") as f:
        f.write(json.dumps(reg, ensure_ascii=False, indent=1) + "\n")


def http(url, data=None):
    """Descarga con curl: los servidores de gencat.cat rechazan la negociación TLS del cliente de Python."""
    cmd = ["curl", "-sSfL", "--max-time", "180", "-A", UA, url]
    if data:
        cmd[1:1] = ["-X", "POST", "--data", urllib.parse.urlencode(data)]
    return subprocess.run(cmd, capture_output=True, check=True).stdout


def texto_html(t):
    t = re.sub(r"<(br|/p|/li|/h\d|/tr|/div|/td)[^>]*>", "\n", t or "")
    t = html.unescape(re.sub(r"<[^>]+>", " ", t))
    return re.sub(r"\n\s*\n+", "\n", re.sub(r"[ \t]+", " ", t)).strip()


def dogc(doc_id):
    """Un documento concreto del DOGC (consulta puntual, sin rastreo): metadatos oficiales y texto íntegro."""
    raw = http(DOGC_API, {"documentId": doc_id, "language": "ca"})
    d = json.loads(raw)
    dd = d["documentData"]
    texto = texto_html(d.get("textDocument"))
    fichero = os.path.join("catalogo", "fuentes", f"DOGC-{doc_id}.txt")
    cab = f"{d['titleDocument']}\nDOGC núm. {dd['numDOGC']}, de {dd['dateDOGC']} · {dd['CVE']}\n\n"
    with open(os.path.join(R, fichero), "w", encoding="utf-8") as f:
        f.write(cab + texto + "\n")
    fecha = lambda s: "-".join(reversed(s.split("/"))) if s else None
    doc = {"source_url": DOGC_URL.format(doc_id), "source_document": d["titleDocument"].strip(), "source_type": "DOGC",
           "dogc": {"documentId": str(doc_id), "num_document": dd["numDocument"], "num_dogc": dd["numDOGC"], "cve": dd["CVE"],
                    "pdf": (d.get("linkDownload") or {}).get("linkDownloadPDF"), "correccions": (d.get("bugfixes") or {}).get("numBugFixes", 0)},
           "published_at": fecha(dd["dateDOGC"]), "retrieved_at": ahora(), "verified_at": ahora()[:10],
           "verification_status": "OFFICIAL_VERIFIED", "sha256": hashlib.sha256(texto.encode()).hexdigest(), "texto": fichero}
    registrar(doc)
    return doc


def pagina(url, nombre, tipo="WEB_MOSSOS", publicada=None):
    """Página o PDF oficial de mossos.gencat.cat: texto en catalogo/fuentes/<nombre>.txt para verificar citas."""
    raw = http(url)
    if url.lower().endswith(".pdf"):
        with open(os.path.join(CACHE, nombre + ".pdf"), "wb") as f:
            f.write(raw)
        texto = subprocess.run(["pdftotext", "-layout", os.path.join(CACHE, nombre + ".pdf"), "-"], capture_output=True, text=True, check=True).stdout
    else:
        h = raw.decode("utf-8", "ignore")
        m = re.search(r"<main.*?</main>", h, re.S)
        cuerpo = re.sub(r"<(script|style|nav|footer|header)[^>]*>.*?</\1>", "", m.group(0) if m else h, flags=re.S)
        cuerpo = re.sub(r'<a[^>]+href="([^"]+)"[^>]*>(.*?)</a>', lambda x: f"{re.sub('<[^>]+>', '', x.group(2)).strip()} [{x.group(1)}]", cuerpo, flags=re.S)
        texto = texto_html(cuerpo)
    fichero = os.path.join("catalogo", "fuentes", nombre + ".txt")
    with open(os.path.join(R, fichero), "w", encoding="utf-8") as f:
        f.write(texto.strip() + "\n")
    doc = {"source_url": url, "source_document": nombre, "source_type": tipo, "published_at": publicada, "retrieved_at": ahora(),
           "verified_at": ahora()[:10], "verification_status": "OFFICIAL_VERIFIED", "sha256": hashlib.sha256(texto.encode()).hexdigest(), "texto": fichero}
    registrar(doc)
    return doc


# ---------- Guia d'estudi ----------
CABECERAS = re.compile(r"^(Guia d’estudi per accedir a la PG-ME.*|\d{1,3}|[ABC]\.\d\. .*|Tema [ABC]\.\d\.)$")


def _pdf_texto(ruta):
    out = subprocess.run(["pdftotext", ruta, "-"], capture_output=True, text=True, check=True).stdout
    return out.split("\f")


def _unir(lineas):
    """Une las líneas de un párrafo: guion blando de final de línea sin espacio; párrafos separados por línea en blanco."""
    paras, cur = [], ""
    for l in lineas:
        if not l.strip():
            if cur:
                paras.append(cur.strip()); cur = ""
            continue
        if cur.endswith("­"):
            cur = cur[:-1] + l.strip()
        else:
            cur = (cur + " " + l.strip()) if cur else l.strip()
    if cur:
        paras.append(cur.strip())
    return "\n\n".join(norm(p.replace("­", "")) for p in paras if p)


def _clave(titulo):
    """Comparación de títulos tolerante a espacios espurios del PDF («La c ompetència»)."""
    return re.sub(r"\s+", "", norm(titulo))[:16].lower()


def trocear_guia(pdf):
    """Apartados oficiales de la guía: A.1.1 … C.5.3 y las «Idees força» de cada tema (A.1.IF …)."""
    pags = _pdf_texto(pdf)
    primeras = [[l.strip() for l in p.split("\n") if l.strip()] for p in pags]
    inicios = {}
    for i, ls in enumerate(primeras):
        if ls and re.fullmatch(r"Tema ([ABC]\.\d)\.", ls[0]):
            inicios.setdefault(ls[0][5:-1], []).append(i)
    temas = sorted(inicios, key=lambda t: inicios[t][0])
    arts = []
    for k, t in enumerate(temas):
        portada = inicios[t][0]
        fin = inicios[temas[k + 1]][0] if k + 1 < len(temas) else len(pags)
        # títulos de los apartados según la portada del tema (índice oficial «1. …»)
        indice = {}
        for l in primeras[portada][1:]:
            m = re.match(r"^(\d+)\.\s+(.+)$", l)
            if m and int(m.group(1)) not in indice:
                indice[int(m.group(1))] = m.group(2)
        titulo_tema = " ".join(l for l in primeras[portada][1:3] if not re.match(r"^\d+\.", l))
        lineas = []
        for p in pags[portada + 1:fin]:
            ls = p.split("\n")
            primera = True
            for l in ls:
                s = l.strip()
                if primera and s:
                    primera = False
                    if CABECERAS.match(s):
                        continue
                if CABECERAS.match(s) or s == titulo_tema.strip() or s in titulo_tema:
                    if s and (CABECERAS.match(s) or len(s) > 12):
                        continue
                lineas.append(l)
        # cortar por apartados: «n. Títol» con n correlativo y título del índice; «Idees força» al final
        secciones, actual, esperado = [], None, 1
        for l in lineas:
            s = l.strip()
            m = re.match(r"^(\d+)\.\s+(.+)$", s)
            if m and int(m.group(1)) == esperado and esperado in indice and _clave(m.group(2)) == _clave(indice[esperado]):
                actual = {"n": f"{t}.{esperado}", "titulo": indice[esperado], "lineas": []}
                secciones.append(actual); esperado += 1
                continue
            if s == "Idees força":
                actual = {"n": f"{t}.IF", "titulo": "Idees força", "lineas": []}
                secciones.append(actual)
                continue
            # la página índice del bloque siguiente («índex: àmbit …») no pertenece al último tema del bloque anterior
            # (defecto detectado en B.8.IF, que arrastraba el índice del àmbit C)
            if re.match(r"(?i)^índex\s*:\s*àmbit", s):
                actual = None
                continue
            if actual is not None:
                actual["lineas"].append(l)
        for sec in secciones:
            arts.append({"n": sec["n"], "titulo": sec["titulo"], "bloque": f"Tema {t}. {titulo_tema}", "capitulo": "",
                         "texto": _unir(sec["lineas"])})
    return arts


def aplicar_esmenes(arts):
    """Aplica las esmenes oficiales; conserva el texto anterior para el historial. Devuelve el registro de cada esmena."""
    log = []
    for e in ESMENES:
        hechas = []
        for a in arts:
            if not a["n"].startswith(e["tema"] + "."):
                continue
            # tolerante a saltos de línea o de página dentro de la frase original
            patron = re.compile(r"\s+".join(re.escape(w) for w in norm(e["on_diu"]).split(" ")))
            if patron.search(a["texto"]):
                a.setdefault("esmenes", []).append({"lloc": e["lloc"], "on_deia": e["on_diu"], "font": GUIA["esmenes_url"], "data": "2026-09"})
                a["texto"] = patron.sub(lambda _: norm(e["ha_de_dir"]), a["texto"], count=1)
                hechas.append(a["n"])
        log.append({"tema": e["tema"], "lloc": e["lloc"], "aplicada_a": hechas, "estado": "aplicada" if hechas else "OFFICIAL_PENDING_REVIEW"})
    return log


def revisar_preguntas_guia(cambiados, arts, hoy=None):
    """Preguntas de la guía cuyos apartados cambiaron: REVIEW_REQUIRED si la cita sigue en el texto nuevo, OUTDATED si no."""
    hoy = hoy or datetime.date.today().isoformat()
    fq = os.path.join(R, "datos", "preguntas-guia-mossos.json")
    if not cambiados or not os.path.exists(fq):
        return 0, 0
    por_n = {a["n"]: a for a in arts}
    qs = json.load(open(fq, encoding="utf-8")); nrev = nout = 0
    for q in qs:
        if q["art"] not in cambiados or q.get("verification_status") in ("DEPRECATED", "OUTDATED"):
            continue
        if q["art"] in por_n and norm(q["cita"]) in norm(por_n[q["art"]]["texto"]):
            q.update(verification_status="REVIEW_REQUIRED", motivo="l'apartat de la guia oficial ha canviat; la cita encara hi és", estado_desde=hoy); nrev += 1
        else:
            q.update(verification_status="OUTDATED", motivo="l'apartat de la guia oficial ha canviat i la cita ja no hi és", estado_desde=hoy); nout += 1
    with open(fq, "w", encoding="utf-8") as f:
        f.write(json.dumps(qs, ensure_ascii=False, indent=1) + "\n")
    return nrev, nout


def guia():
    os.makedirs(CACHE, exist_ok=True)
    pdf = os.path.join(CACHE, "Guia_Mossos_Edicio_Juny_2026.pdf")
    if not os.path.exists(pdf):
        with open(pdf, "wb") as f:
            f.write(http(GUIA["url"]))
    sha = hashlib.sha256(open(pdf, "rb").read()).hexdigest()
    arts = trocear_guia(pdf)
    log = aplicar_esmenes(arts)
    with open(GUIA_JSON, "w", encoding="utf-8") as f:
        f.write(json.dumps(arts, ensure_ascii=False, indent=1) + "\n")
    # Control de cambios sin versionar el texto: huella de cada apartado en el registro; si cambia, se revisan sus preguntas
    nuevo_sha = {a["n"]: hashlib.sha256(a["texto"].encode()).hexdigest()[:16] for a in arts}
    previo = next((d for d in leer_registro()["documentos"] if d["source_url"] == GUIA["url"]), {}).get("apartats_sha") or {}
    cambiados = sorted(n for n in set(previo) | set(nuevo_sha) if previo and previo.get(n) != nuevo_sha.get(n))
    rev = revisar_preguntas_guia(set(cambiados), arts)
    registrar({"source_url": GUIA["url"], "source_document": GUIA["source_document"], "source_type": "GUIA_ESTUDI",
               "published_at": "2026-06", "retrieved_at": ahora(), "verified_at": ahora()[:10], "verification_status": "OFFICIAL_VERIFIED",
               "sha256": sha, "apartats": len(arts), "esmenes": log, "apartats_sha": nuevo_sha,
               "canvis_darrera_revisio": {"apartats": cambiados, "review_required": rev[0], "outdated": rev[1]} if cambiados else None,
               "nota": "Text no versionat al repositori (© Generalitat de Catalunya): es descarrega de la font oficial a datos/cache/."})
    esm = http(GUIA["esmenes_url"])
    registrar({"source_url": GUIA["esmenes_url"], "source_document": "Esmenes a l'edició en PDF de la Guia d'estudi (setembre 2026)",
               "source_type": "GUIA_ESMENES", "published_at": "2026-09", "retrieved_at": ahora(), "verified_at": ahora()[:10],
               "verification_status": "OFFICIAL_VERIFIED", "sha256": hashlib.sha256(esm).hexdigest(), "esmenes": len(ESMENES)})
    return arts, log


def assegurar_guia():
    """Ruta del texto troceado de la guía; lo genera desde la fuente oficial si no está en la caché local."""
    if not os.path.exists(GUIA_JSON):
        guia()
    return GUIA_JSON


CONV_DIR = os.path.join(R, "catalogo", "convocatorias")
CAMPOS_CONV = ["plazas", "grupo", "sistema_selectivo", "titulacion", "plazo_solicitudes", "fecha_examen", "pruebas"]


def convocatoria_catalogo(op_id="mossos-esquadra", escribir=True):
    """La convocatoria vigente de una oposición de la Generalitat → catalogo/convocatorias/<DOGC-id>.json (mismo formato que la
    ingesta del BOE), para que aparezca en /convocatorias/ enlazada a su oposición. Solo usa los datos oficiales ya verificados de
    la ficha (catalogo/oposiciones/<id>.json) y vuelve a comprobar que cada cita es literal en su documento oficial guardado;
    un dato cuya cita no aparece se descarta (no se inventa nada)."""
    o = json.load(open(os.path.join(R, "catalogo", "oposiciones", f"{op_id}.json"), encoding="utf-8"))
    fc = o["fuentes"]["convocatoria"]
    textos = {k: norm(open(os.path.join(R, f["texto"]), encoding="utf-8").read()) for k, f in o["fuentes"].items() if f.get("texto")}
    datos, descartados = {}, []

    def dato(valor, d):
        f = o["fuentes"][d["fuente"]]
        if norm(d["cita"]) not in textos.get(d["fuente"], ""):
            descartados.append(d["cita"][:120]); return None
        return {"valor": valor, "cita": d["cita"], "confidence": 1.0, "metodo": "revision_manual", "source_url": f["url"],
                "source_domain": f["url"].split("/")[2], "source_document": f["texto"], "published_at": f.get("fecha_publicacion"),
                "retrieved_at": f.get("retrieved_at"), "verification_status": "OFFICIAL_VERIFIED", "last_verified_at": f.get("retrieved_at")}
    for k in CAMPOS_CONV:
        d = o["oficial"].get(k)
        if isinstance(d, list):  # varias pruebas: una sola fila con todos los valores y la cita de la primera
            d = d and dict(d[0], valor="; ".join(x["valor"] for x in d))
        if d and (x := dato(d["valor"], d)):
            datos[k] = x
    datos["denominacion"] = dato("mosso/a de l'escala bàsica del Cos de Mossos d'Esquadra",
                                 {"fuente": "convocatoria", "cita": "places de la categoria de mosso/a de l'escala bàsica del Cos de Mossos d'Esquadra"})
    datos["organismo"] = dato(fc["organismo"], {"fuente": "convocatoria", "cita": fc["organismo"]})
    datos = {k: v for k, v in datos.items() if v}
    plazo = re.search(r"del (\d+) al (\d+) de (\w+) de (\d{4})", (o["oficial"].get("plazo_solicitudes") or {}).get("cita", ""))
    MES = {"gener": 1, "febrer": 2, "març": 3, "abril": 4, "maig": 5, "juny": 6, "juliol": 7, "agost": 8, "setembre": 9, "octubre": 10, "novembre": 11, "desembre": 12}
    ini = fin = None
    if plazo and plazo.group(3) in MES and "plazo_solicitudes" in datos:
        ini = f"{plazo.group(4)}-{MES[plazo.group(3)]:02d}-{int(plazo.group(1)):02d}"; fin = f"{plazo.group(4)}-{MES[plazo.group(3)]:02d}-{int(plazo.group(2)):02d}"
    ex = re.search(r"(\d{1,2}) d'(\w+) de (\d{4})|(\d{1,2}) de (\w+) de (\d{4})", (o["oficial"].get("fecha_examen") or {}).get("cita", ""))
    examen = None
    if ex and "fecha_examen" in datos:
        g = [x for x in ex.groups() if x]
        examen = f"{g[2]}-{MES.get(g[1], 0):02d}-{int(g[0]):02d}" if g[1] in MES else None
    v = {"id": fc["id"], "call_number": o.get("convocatoria_registro") or fc["id"], "titulo": fc["titulo"], "oposicion_id": op_id,
         "oposiciones_relacionadas": [op_id], "vinculos_oposicion": [{"oposicion": op_id, "relacion": "misma_convocatoria"}],
         "categoria": o["categoria"], "administracion": o.get("administracion") or "autonomica", "organismo": fc["organismo"],
         "territorio": o.get("territorio") or "Cataluña", "estado": "activa", "estado_nota": "", "publication_date": fc["fecha_publicacion"],
         "application_start": ini, "application_end": fin, "exam_date": examen, "verification_status": "OFFICIAL_VERIFIED",
         "last_verified_at": fc.get("retrieved_at"),
         "fuente": {"tipo": "DOGC", "source_url": fc["url"], "source_domain": fc["url"].split("/")[2], "source_document": fc["texto"],
                    "published_at": fc["fecha_publicacion"], "retrieved_at": fc.get("retrieved_at"), "updated_at": fc.get("retrieved_at"),
                    "document_version": 1, "fuente_registro": "dogc-gencat", "dogc_id": fc["id"], "sha256": fc.get("sha256"),
                    "departamento": fc["organismo"], "epigrafe": "Cos de Mossos d'Esquadra"},
         "fuentes_adicionales": [{"source_url": f["url"], "source_domain": f["url"].split("/")[2]} for k, f in o["fuentes"].items() if k not in ("convocatoria", "temario")],
         "datos": datos, "descartados_por_no_literales": descartados, "extraido": fc.get("retrieved_at"), "revision": "manual"}
    if escribir:
        with open(os.path.join(CONV_DIR, f"{fc['id']}.json"), "w", encoding="utf-8") as fh:
            fh.write(json.dumps(v, ensure_ascii=False, indent=1) + "\n")
    return v


def main(argv=None):
    a = (argv or sys.argv[1:]) or ["estado"]
    if a[0] == "dogc":
        for i in a[1:]:
            d = dogc(i); print(f"DOGC {i}: {d['source_document'][:110]} ({d['published_at']})")
    elif a[0] == "pagina":
        d = pagina(a[1], a[2], *(a[3:4] or ["WEB_MOSSOS"])); print(f"{d['source_type']}: {d['texto']}")
    elif a[0] == "convocatoria":
        v = convocatoria_catalogo(*(a[1:2] or ["mossos-esquadra"]))
        print(f"{v['id']}: {len(v['datos'])} dades verificades · descartades {len(v['descartados_por_no_literales'])}")
    elif a[0] == "guia":
        arts, log = guia()
        print(f"Guia: {len(arts)} apartats · esmenes: " + "; ".join(f"{x['tema']} {x['estado']} {x['aplicada_a']}" for x in log))
    else:
        for d in leer_registro()["documentos"]:
            print(f"{d['source_type']:14} {d.get('published_at') or '':10} {d['verification_status']:20} {d['source_document'][:90]}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
