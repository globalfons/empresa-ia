"""Vigila los textos consolidados del BOE de las leyes con preguntas y detecta qué ARTÍCULOS han cambiado.

Fuente oficial: API de datos abiertos del BOE (legislación consolidada):
  /legislacion-consolidada/id/<ID>/texto/indice      → fecha de la última modificación de cada bloque (artículo)
  /legislacion-consolidada/id/<ID>/texto/bloque/<id> → versiones del artículo; la última es la vigente
(La fecha de los «metadatos» cambia sin que cambie el texto: por eso se usa el índice por bloque.)

Si un artículo cambió después de la versión que tenemos (datos/leyes-meta.json):
  1. Se guarda la versión anterior del artículo en datos/versiones/<slug>.json (historial; nunca se borra).
  2. Se actualiza el artículo en datos/<slug>-articulos.json con el texto vigente del BOE.
  3. Sus preguntas pasan a REVIEW_REQUIRED (la cita sigue en el texto nuevo: revisar que la respuesta siga siendo correcta)
     u OUTDATED (la cita ya no está: se retira de los tests). Las demás preguntas no se tocan.
  4. Se publica el evento LAW_UPDATED en el bus del Growth OS (revisión en /admin/oposiciones/<id>/quality/).
Uso: python3 datos/vigilar_leyes.py [slug ...]
"""
import json, os, re, sys, glob, datetime, urllib.request, time, xml.etree.ElementTree as ET
D = os.path.dirname(os.path.abspath(__file__)); RAIZ = os.path.dirname(D)
sys.path.insert(0, D); sys.path.insert(0, RAIZ)
from validar_lib import norm, vigente
API = "https://www.boe.es/datosabiertos/api/legislacion-consolidada/id/"

def http(url, accept):
    for i in range(3):
        try:
            return urllib.request.urlopen(urllib.request.Request(url, headers={"Accept": accept, "User-Agent": "TestLeyBot/1.0"}), timeout=40).read()
        except Exception:
            if i == 2: raise
            time.sleep(2 * (i + 1))

def indice(boe_id, fetch=http):
    d = json.loads(fetch(API + boe_id + "/texto/indice", "application/json"))["data"]
    return d[0]["bloque"] if isinstance(d, list) else d["bloque"]

def texto_bloque(boe_id, bloque_id, fetch=http):
    """Texto vigente de un artículo: la última <version> del bloque, párrafos separados por línea en blanco."""
    r = ET.fromstring(fetch(API + boe_id + "/texto/bloque/" + bloque_id, "application/xml"))
    versiones = r.findall(".//version")
    if not versiones: return None, None
    v = versiones[-1]
    parrafos = ["".join(p.itertext()).strip() for p in v.findall("p") if p.get("class") not in ("articulo", "titulo_num", "titulo_tit")]
    return "\n\n".join(x for x in parrafos if x), v.get("fecha_publicacion")

LATINOS = "bis|ter|quater|quinquies|sexies|septies|octies|nonies|decies"
def num_articulo(titulo):
    """«Artículo 31 bis» → 31bis; «Artículo 588 bis a)» → 588bisa; «Art 239 bis» → 239bis; «Artículo 570 quáter» → 570quater."""
    # El índice del BOE usa «Artículo 1» o «Art 1» / «Art. 1» (Código Civil) y a veces «quáter» con tilde.
    t = (titulo or "").replace("\xa0", " ").translate(str.maketrans("áéíóú", "aeiou"))
    if re.match(r"(?i)arts?\.?\s+\d+\w*(?:\s+(?:bis|ter|quater))?\s+al?\s+\d+", t): return None  # rango («Art. 1231 A 1253»): no es un artículo
    m = re.match(rf"(?i)art(?:iculo|\.)?\s+(\d+)\s*(?:({LATINOS})\s*(\d+)?)?\s*(?:((?-i:[a-z]))(?![a-zñ]))?", t)
    return "".join((g or "").lower() for g in m.groups()) if m else None

def limpio(t): return norm(re.sub(r"[*_#>`]", " ", vigente(t or "")))

def revisar(slug, boe_id, meta, fetch=http, hoy=None):
    hoy = hoy or datetime.date.today().isoformat()
    base = (meta.get(boe_id) or "0000-00-00").replace("-", "")
    fa, fq, fv = (os.path.join(D, f) for f in (f"{slug}-articulos.json", f"preguntas-{slug}.json", os.path.join("versiones", f"{slug}.json")))
    arts = json.load(open(fa)); por_n = {a["n"]: a for a in arts}
    cambiados, ultima = [], base
    for b in indice(boe_id, fetch):
        f = b.get("fecha_actualizacion", "")
        ultima = max(ultima, f)
        n = num_articulo(b.get("titulo"))
        if f <= base or not n or n not in por_n: continue
        nuevo, pub = texto_bloque(boe_id, b["id"], fetch)
        if nuevo is None or limpio(nuevo) == limpio(por_n[n]["texto"]): continue
        cambiados.append((n, por_n[n]["texto"], nuevo, f))
    if not cambiados:
        return {"slug": slug, "articulos_cambiados": 0, "review_required": 0, "outdated": 0, "texto_hasta": ultima}
    hist = json.load(open(fv)) if os.path.exists(fv) else []
    for n, viejo, nuevo, f in cambiados:
        hist.append({"n": n, "texto": viejo, "vigente_hasta": f, "sustituido_el": hoy})
        por_n[n]["texto"] = nuevo; por_n[n]["actualizado"] = f
    os.makedirs(os.path.dirname(fv), exist_ok=True)
    json.dump(hist, open(fv, "w"), ensure_ascii=False, indent=1)
    json.dump(arts, open(fa, "w"), ensure_ascii=False, indent=1)
    qs = json.load(open(fq)); nrev = nout = 0; afectados = {n for n, *_ in cambiados}
    for q in qs:
        if q["art"] not in afectados or q.get("verification_status") in ("DEPRECATED", "OUTDATED"): continue
        if norm(q["cita"]) in limpio(por_n[q["art"]]["texto"]):
            q.update(verification_status="REVIEW_REQUIRED", motivo="el artículo cambió; la cita sigue en el texto vigente", estado_desde=hoy); nrev += 1
        else:
            q.update(verification_status="OUTDATED", motivo="el artículo cambió y la cita ya no está en el texto vigente", estado_desde=hoy); nout += 1
    json.dump(qs, open(fq, "w"), ensure_ascii=False, indent=1)
    meta[boe_id] = f"{ultima[:4]}-{ultima[4:6]}-{ultima[6:8]}"
    return {"slug": slug, "articulos_cambiados": len(cambiados), "articulos": sorted(afectados), "review_required": nrev, "outdated": nout, "texto_hasta": ultima}

if __name__ == "__main__":
    normas = {n["slug"]: n["id"] for n in json.load(open(os.path.join(RAIZ, "catalogo", "normas_base.json")))}
    meta_p = os.path.join(D, "leyes-meta.json"); meta = json.load(open(meta_p))
    slugs = sys.argv[1:] or sorted(os.path.basename(f)[10:-5] for f in glob.glob(os.path.join(D, "preguntas-*.json")))
    total = []
    for s in slugs:
        if s not in normas or not normas[s].startswith("BOE-"): continue  # solo textos consolidados del BOE (la guía de Mossos: ingesta/gencat.py)
        try: r = revisar(s, normas[s], meta)
        except Exception as e:
            print(f"✘ {s}: {str(e)[:120]} (se conserva el texto actual)"); continue
        if r["articulos_cambiados"]:
            total.append(r); print(f"• {s}: {r['articulos_cambiados']} artículos cambiados, {r['review_required']} preguntas a revisar, {r['outdated']} desfasadas")
            try:
                from crecimiento import eventos as E
                E.publicar("LAW_UPDATED", "vigilar_leyes", entity_type="norma", entity_id=normas[s], idempotency_key=f"LAW_UPDATED:{normas[s]}:{r['texto_hasta']}", payload=r)
            except Exception as e: print("  (evento no registrado:", str(e)[:80], ")")
    json.dump(meta, open(meta_p, "w"), ensure_ascii=False, indent=1)
    print(f"Revisadas {len(slugs)} leyes; {len(total)} con cambios.")
