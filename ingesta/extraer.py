"""EXTRACCIÓN → JSON ESTRUCTURADO → VALIDACIÓN.
Para cada documento descargado pendiente de extraer:
 1) Reglas deterministas: frases literales con plazas, plazo, sistema, titulación, grupo, organismo, territorio.
 2) Claude (si hay ANTHROPIC_API_KEY): interpreta el documento y devuelve JSON con una cita literal por dato.
 3) Validación: se descarta todo dato cuya cita no aparezca literalmente en el documento. Nunca se inventa.
Salida: catalogo/convocatorias/<id>.json (una convocatoria por fichero) con la procedencia de cada dato.
Uso: python3 ingesta/extraer.py [--max N] [--rehacer]
"""
import sys, os, re, json, argparse, urllib.request
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import nucleo as N

REGLAS = json.load(open(os.path.join(N.R, "reglas.json")))
SALIDA = os.path.join(N.RAIZ, "catalogo", "convocatorias")
os.makedirs(SALIDA, exist_ok=True)
norm = lambda s: re.sub(r"\s+", " ", s.replace(" ", " ").replace("\xa0", " ")).strip()
NUM = REGLAS["numeros"]

def frases(texto):
    return [f.strip() for f in re.split(r"(?<=[.;:])\s+|\n", texto) if 15 < len(f.strip()) < 700]

def primera(fr, rx):
    r = re.compile(rx)
    for f in fr:
        if r.search(f): return f
    return None

def categoria(txt):
    for cat, rx in REGLAS["categorias"]:
        if re.search(rx, txt): return cat
    return "administracion-estado"

def reglas(doc, texto):
    """Extracción determinista: cada dato es la frase literal del documento que lo contiene."""
    fr = frases(texto); tit = doc.get("titulo", ""); meta = doc.get("meta", {}); datos = {}
    def pon(campo, valor, cita, conf=0.6):
        if valor not in (None, "") and cita: datos[campo] = {"valor": valor, "cita": cita, "confidence": conf, "metodo": "reglas"}
    # Plazas: "Se convocan 2.704 plazas", "1.700 plazas", "una plaza de Agente de Policía Local"
    f = primera(fr, r"(?i)\b(\d[\d.]*|" + "|".join(NUM) + r")\s+plazas?\b")
    if f:
        m = re.search(r"(?i)\b(\d[\d.]*|" + "|".join(NUM) + r")\s+plazas?\b(?:\s+de\s+([^,.;:(]{3,90}))?", f)
        v = m.group(1).lower(); n = NUM.get(v) or int(v.replace(".", "")) if (v in NUM or v.replace(".", "").isdigit()) else None
        if n and n < 100000: pon("plazas", n, f)
        if m.group(2) and not re.match(r"(?i)(igual|la misma|similar|nueva|dicha|esta|estas|las mismas)\b", m.group(2).strip()): pon("denominacion", re.sub(r"(?i)^(la|el|las|los)\s+", "", m.group(2).strip()), f, 0.5)
    f = primera(fr, r"(?i)(plazo de presentaci[oó]n|presentaci[oó]n de (las )?solicitudes|d[ií]as h[aá]biles contados)")
    if f:
        m = re.search(r"(?i)\b((?:\w+|\d+)(?:\s*\(\d+\))? d[ií]as (?:h[aá]biles|naturales))", f)
        pon("plazo_solicitudes", m.group(1) if m else "Ver texto oficial", f)
    f = primera(fr, r"(?i)concurso-oposici[oó]n|oposici[oó]n libre|sistema (selectivo )?de (oposici[oó]n|concurso)")
    if f: pon("sistema_selectivo", "Concurso-oposición" if re.search(r"(?i)concurso-oposici", f) else "Oposición" if re.search(r"(?i)oposici", f) else "Concurso", f)
    f = primera(fr, r"(?i)(estar en posesi[oó]n|en condiciones de obtener)[^.]{0,40}t[ií]tulo")
    if f: pon("titulacion", "Ver texto oficial", f)
    f = primera(fr, r"(?i)\b(sub)?grupo\s+(A1|A2|B|C1|C2|E)\b")
    if f: pon("grupo", re.search(r"(?i)\b(?:sub)?grupo\s+(A1|A2|B|C1|C2|E)\b", f).group(1).upper(), f)
    f = primera(fr, r"(?i)Bolet[ií]n Oficial de (la Provincia|la Comunidad|la Regi[oó]n|Castilla|Arag[oó]n|Canarias|Navarra|Cantabria|La Rioja|las Illes|Madrid|Andaluc|la Junta)|Diari Oficial|Diario Oficial|BOP\b|B\.O\.P")
    pon("boletin_bases", "Bases publicadas en el boletín oficial citado", f, 0.7)
    # Organismo y territorio: del título oficial y del departamento del BOE
    org = re.search(r"(?i)(?:del?|de la|de l') ?(Ayuntamiento de [^,]+|Diputaci[oó]n (Provincial |Foral )?de [^,]+|Cabildo (Insular )?de [^,]+|Consell (Insular|Comarcal) de[l]? [^,]+|Universi(?:dad|tat|dade)[^,]+|Comarca [^,]+|Mancomunidad [^,]+|Consorcio [^,]+|Organismo Aut[oó]nomo [^,]+|Patronato [^,]+|Instituto Municipal [^,]+)", tit)
    organismo = org.group(1).strip() if org else re.sub(r"\b(De|Del|La|Las|Los|Y|E|Para|Con|En|El)\b", lambda m: m.group(1).lower(), (meta.get("departamento") or "").title())
    if organismo: datos["organismo"] = {"valor": organismo, "cita": tit if org else meta.get("departamento", ""), "confidence": 0.9, "metodo": "reglas", "cita_en": "titulo" if org else "sumario"}
    prov = re.search(r"(?i)Bolet[ií]n Oficial de la Provincia de ([A-ZÁÉÍÓÚÑ][\wáéíóúñ/ -]+?)[»,\"”]", texto)
    terr = (re.split(r" del? ", org.group(1), 1)[-1] if org and re.match(r"(?i)ayuntamiento|diputaci|cabildo|consell|comarca|mancomunidad", org.group(1)) else "")
    if terr: datos["territorio"] = {"valor": terr + (f" ({prov.group(1).strip()})" if prov and "(" not in terr and prov.group(1).strip() != terr else ""), "cita": tit, "confidence": 0.8, "metodo": "reglas", "cita_en": "titulo"}
    return datos

def claude(doc, texto):
    """Interpreta el documento con Claude (API) y devuelve datos con cita literal. Solo si hay clave configurada."""
    key = os.environ.get("ANTHROPIC_API_KEY")
    if not key: return {}
    prompt = ("Extrae datos de esta convocatoria oficial española. Devuelve SOLO JSON con esta forma (omite lo que no aparezca): "
              '{"denominacion":{"valor":"...","cita":"..."},"plazas":{"valor":123,"cita":"..."},"grupo":{"valor":"C1","cita":"..."},'
              '"titulacion":{"valor":"...","cita":"..."},"sistema_selectivo":{"valor":"...","cita":"..."},"plazo_solicitudes":{"valor":"...","cita":"..."},'
              '"pruebas":{"valor":"...","cita":"..."},"temario":{"valor":"anexo con temario oficial | sin temario | remite a otra norma","cita":"..."}}. '
              "Cada 'cita' debe ser un fragmento COPIADO LITERALMENTE del documento. No deduzcas ni completes nada.\n\n<documento>\n" + texto[:60000] + "\n</documento>")
    body = json.dumps({"model": os.environ.get("INGESTA_MODEL", "claude-haiku-4-5-20251001"), "max_tokens": 1500, "messages": [{"role": "user", "content": prompt}]}).encode()
    req = urllib.request.Request(os.environ.get("ANTHROPIC_BASE_URL", "https://api.anthropic.com") + "/v1/messages", data=body,
                                 headers={"x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json"})
    try:
        r = json.load(urllib.request.urlopen(req, timeout=120))
        t = "".join(c.get("text", "") for c in r.get("content", []))
        d = json.loads(t[t.index("{"): t.rindex("}") + 1])
    except Exception as e:
        N.log("extraccion_claude_error", doc=doc["doc_id"], error=str(e)[:200]); return {}
    return {k: {"valor": v.get("valor"), "cita": v.get("cita", ""), "confidence": 0.8, "metodo": "claude"} for k, v in d.items() if isinstance(v, dict)}

def validar(datos, texto, titulo, meta):
    """Solo sobreviven los datos cuya cita aparece literalmente en su origen (documento, título oficial o sumario)."""
    t = norm(texto); ok, fuera = {}, []
    for k, d in datos.items():
        origen = {"titulo": norm(titulo), "sumario": norm(meta.get("departamento", ""))}.get(d.get("cita_en"), t)
        if d.get("cita") and norm(d["cita"]) in origen: ok[k] = d
        else: fuera.append(k)
    return ok, fuera

def estado_conv(pub):
    import datetime
    if not pub: return "activa"
    dias = (datetime.date.today() - datetime.date.fromisoformat(pub[:10])).days
    return "activa" if dias <= 540 else "historica"

def procesar(doc, rehacer=False):
    texto = open(os.path.join(N.RAIZ, doc["texto"])).read()
    meta = doc.get("meta", {}); tit = doc.get("titulo", "")
    datos = reglas(doc, texto)
    for k, v in claude(doc, texto).items():  # Claude mejora a las reglas si su cita se valida
        if v.get("cita"): datos[k] = v
    datos, descartados = validar(datos, texto, tit, meta)
    if "plazas" not in datos and "denominacion" not in datos and not re.search(r"(?i)convoca", tit):
        return "descartado", None
    cid = meta.get("boe_id") or doc["doc_id"]
    t = N.iso(N.ahora())
    proc = {"source_url": doc["url"], "source_domain": doc["domain"], "source_document": doc["texto"], "published_at": doc.get("published_at"),
            "retrieved_at": doc["retrieved_at"], "updated_at": doc["updated_at"]}
    for d in datos.values():
        d.update(proc); d["verification_status"] = "cita_verificada_automaticamente"
    ficha = {"id": cid, "titulo": tit, "categoria": categoria(" ".join([tit, (datos.get("denominacion") or {}).get("valor", ""), meta.get("departamento", "")])),
             "organismo": (datos.get("organismo") or {}).get("valor", ""), "territorio": (datos.get("territorio") or {}).get("valor", "España" if not re.search(r"(?i)ayuntamiento|diputaci|cabildo|consell|comarca|mancomunidad|universi|comunidad|junta|generalitat|gobierno de|xunta|servicio .{0,20}salud|osakidetza", tit) else ""),
             "estado": estado_conv(doc.get("published_at")), "estado_nota": "Calculado: activa si se publicó hace menos de 18 meses; se actualizará con las publicaciones posteriores.",
             "fuente": {"tipo": "BOE" if doc["domain"].endswith("boe.es") else "Web oficial", **proc, "fuente_registro": doc["fuente"], "boe_id": meta.get("boe_id"), "departamento": meta.get("departamento"), "epigrafe": meta.get("epigrafe")},
             "datos": datos, "descartados_por_no_literales": descartados, "extraido": t, "revision": "automatica"}
    p = os.path.join(SALIDA, re.sub(r"[^A-Za-z0-9-]", "-", cid) + ".json")
    if os.path.exists(p) and not rehacer:
        prev = json.load(open(p))
        if prev.get("revision") == "manual": return "conservado", prev  # nunca se pisa una revisión manual
    json.dump(ficha, open(p, "w"), ensure_ascii=False, indent=1)
    return "extraido", ficha

if __name__ == "__main__":
    a = argparse.ArgumentParser(); a.add_argument("--max", type=int, default=0); a.add_argument("--rehacer", action="store_true"); args = a.parse_args()
    docs = N.leer("documentos.json", {}); n = {}
    pend = [d for d in docs.values() if d.get("extraccion") == "pendiente" or args.rehacer]
    for i, d in enumerate(pend):
        if args.max and i >= args.max: break
        try:
            r, _ = procesar(d, args.rehacer)
        except Exception as e:
            r = "error"; N.log("extraccion_error", doc=d["doc_id"], error=str(e)[:200])
        d["extraccion"] = {"extraido": "hecha", "descartado": "descartada", "conservado": "hecha"}.get(r, "error")
        n[r] = n.get(r, 0) + 1
    N.guardar("documentos.json", docs)
    N.log("extraccion", **n); print(n)
