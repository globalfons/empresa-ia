"""Content Factory + Repurposing Engine + verificación de datos.

EVENTO OFICIAL → HECHOS (solo datos estructurados con su fuente) → CONTENIDO MAESTRO → variantes por canal
→ VERIFICACIÓN (fact check determinista) → HUMAN_REVIEW | APPROVED → SCHEDULED → PUBLISHED.

Por defecto las variantes salen de plantillas deterministas (coste 0). Si el flag ai_growth está activo y hay clave,
el artículo se redacta con el LLM (nivel BALANCED) y pasa la misma verificación; si no la pasa, se usa la plantilla.
Nada se inventa: cada número, fecha y enlace del texto tiene que estar en los hechos o en la plantilla.
"""
import os, re, json, datetime, unicodedata
from . import nucleo as N, llm

ESTADOS = ["DRAFT", "AI_REVIEW", "HUMAN_REVIEW", "APPROVED", "SCHEDULED", "PUBLISHED", "REJECTED", "ARCHIVED"]
CANALES = {  # límite de caracteres y si el canal puede autopublicarse cuando todo está verificado
    "articulo": {"max": 6000, "auto": True}, "faq": {"max": 3000, "auto": True}, "telegram": {"max": 900, "auto": True},
    "email": {"max": 3000, "auto": True}, "x": {"max": 280, "auto": False}, "instagram": {"max": 2200, "auto": False},
    "facebook": {"max": 1500, "auto": False}, "tiktok": {"max": 1500, "auto": False}, "youtube_short": {"max": 1500, "auto": False},
    "youtube_descripcion": {"max": 2000, "auto": False}, "anuncio": {"max": 200, "auto": False}, "cta": {"max": 200, "auto": True},
}
CATEGORIAS = ["EDUCATIONAL", "NEWS", "QUIZ", "MOTIVATION", "CONVOCATION", "LEGAL", "STUDY_TIPS", "PRODUCT", "COMMUNITY"]
DIR = "contenidos"
PROHIBIDO = [  # claims sin evidencia, promesas y testimonios: nunca
    r"(?i)garantiz", r"(?i)aprobar(á|as)? seguro", r"(?i)\b100 ?% (de )?aprobad", r"(?i)plaza asegurada", r"(?i)éxito garantizado",
    r"(?i)testimonio", r"(?i)miles de (alumnos|opositores) (ya )?(han )?aprobad", r"(?i)el mejor (temario|test) de españa", r"(?i)sueldo|salario|€ ?(al|/) ?mes",
]

def sitio(): return N.config()["url"]
def utm(url, canal, campana, contenido):
    sep = "&" if "?" in url else "?"
    return f"{url}{sep}utm_source={canal}&utm_medium={'email' if canal == 'email' else 'social' if canal not in ('articulo', 'faq', 'cta') else 'web'}&utm_campaign={campana}&utm_content={contenido}"

def fmt_n(n): return f"{n:,}".replace(",", ".")
def fmt_f(f): return "/".join(reversed(f.split("-"))) if f else ""

# ---------------- Hechos ----------------
def hechos_convocatoria(ficha, opos=None):
    """Solo datos presentes en la ficha oficial, cada uno con su cita y su URL. Nada calculado ni deducido."""
    d = ficha.get("datos", {})
    val = lambda k: (d.get(k) or {}).get("valor")
    op = next((o for o in (opos or []) if o["id"] == ficha.get("oposicion_id")), None)
    h = {"id": ficha["id"], "titulo_oficial": ficha["titulo"], "organismo": ficha.get("organismo") or None, "territorio": ficha.get("territorio") or None,
         "denominacion": val("denominacion"), "plazas": val("plazas"), "plazo": val("plazo_solicitudes"), "sistema": val("sistema_selectivo"),
         "grupo": val("grupo"), "publicado": ficha["fuente"].get("published_at"), "url_oficial": ficha["fuente"]["source_url"],
         "url_ficha": f"{sitio()}convocatorias/{ficha['id']}/", "oposicion_id": ficha.get("oposicion_id"),
         "oposicion_nombre": op["nombre"] if op else None, "url_oposicion": f"{sitio()}oposiciones/{op['id']}/" if op else None,
         "verification_status": ficha.get("verification_status"), "citas": {k: v.get("cita") for k, v in d.items()}}
    return {k: v for k, v in h.items() if v not in (None, "")}

# ---------------- Plantillas por canal (deterministas) ----------------
def nombre_plaza(h):
    """Denominación oficial; si no se extrajo, el asunto literal del título oficial (sin «Resolución de…, del Organismo,»)."""
    x = h.get("denominacion") or h.get("oposicion_nombre")
    if not x:
        t = re.sub(r"^(Resolución|Anuncio|Orden|Acuerdo|Decreto)[^,]*,\s*(del?|de la|de l')\s[^,]+,\s*", "", h.get("titulo_oficial", "")).rstrip(".")
        x = re.sub(r"^(por la que|referente a|relativa? a|sobre)\s+(se\s+)?", "", t)[:120] or "Convocatoria de empleo público"
    return x[0].upper() + x[1:]

def plantillas(h, campana, cid):
    P = nombre_plaza(h); org = h.get("organismo", ""); pl = h.get("plazas")
    pl_txt = f"{fmt_n(pl)} plaza{'s' if pl != 1 else ''}" if pl else "plazas"
    enlace = lambda canal: utm(h.get("url_oposicion") or h["url_ficha"], canal, campana, cid)
    lineas = [f"• Plazas: {fmt_n(pl)}" if pl else None, f"• Plazo de solicitudes: {h['plazo']}" if h.get("plazo") else None,
              f"• Sistema: {h['sistema']}" if h.get("sistema") else None, f"• Grupo: {h['grupo']}" if h.get("grupo") else None,
              f"• Territorio: {h['territorio']}" if h.get("territorio") and h.get("territorio") != "España" else None]
    datos = "\n".join(x for x in lineas if x)
    fuente = f"Fuente oficial: {h['url_oficial']} (publicado el {fmt_f(h.get('publicado', ''))})"
    prep = lambda canal: f"Prepárala con tests citados del BOE: {enlace(canal)}" if h.get("url_oposicion") else f"Ficha completa y avisos: {enlace(canal)}"
    T = {}
    T["telegram"] = f"📢 Nueva convocatoria: {P}\n{org}\n\n{datos}\n\n{fuente}\n{prep('telegram')}"
    cola_x = f" ({org[:60]}). {pl_txt.capitalize()}. Datos y fuente oficial: "
    T["x"] = f"Nueva convocatoria: {P[: max(20, 280 - 23 - len(cola_x) - 22)]}" + cola_x + enlace("x")
    T["email"] = f"Asunto: Nueva convocatoria: {P}\n\n{org} ha publicado la convocatoria de {P}.\n\n{datos}\n\n{fuente}\n\n{prep('email')}\n\nRecibes este email porque sigues esta categoría en TestLey. Puedes cambiar tus avisos en tu panel."
    T["instagram"] = f"📢 {P}\n\n{org} convoca {pl_txt}.\n\n{datos}\n\nToda la información, con la frase literal del boletín oficial, en el enlace de la bio.\n\n#oposiciones #empleopublico #convocatoria"
    T["facebook"] = f"Nueva convocatoria: {P}\n{org}\n\n{datos}\n\n{fuente}\n{enlace('facebook')}"
    T["tiktok"] = (f"[GANCHO] ¿Buscas oposición? {org} convoca {pl_txt}.\n[ESCENA] Qué se convoca: {P}.\n"
                   + (f"[ESCENA] Plazo: {h['plazo']}.\n" if h.get("plazo") else "") + (f"[ESCENA] Sistema: {h['sistema']}.\n" if h.get("sistema") else "")
                   + "[CTA] Toda la información con la fuente oficial en TestLey (enlace en la bio).\n[TEXTO EN PANTALLA] Fuente: boletín oficial")
    T["youtube_short"] = T["tiktok"]
    T["youtube_descripcion"] = f"{P} — {org}.\n\n{datos}\n\n{fuente}\n\nMás información: {enlace('youtube')}"
    T["anuncio"] = f"Titular: {P[:30]}\nDescripción: {pl_txt.capitalize()} en {org}. Consulta requisitos y fuente oficial."[:200]
    T["cta"] = f"Nueva convocatoria de {P}: {pl_txt}. Ver ficha oficial →"
    faq = [(f"¿Cuántas plazas se convocan?", f"{pl_txt.capitalize()}, según la publicación oficial." if pl else None),
           ("¿Cuál es el plazo de solicitudes?", f"{h['plazo']}, según las bases." if h.get("plazo") else None),
           ("¿Cuál es el sistema selectivo?", f"{h['sistema']}." if h.get("sistema") else None),
           ("¿Dónde está la convocatoria oficial?", f"En {h['url_oficial']}")]
    T["faq"] = "\n\n".join(f"P: {q}\nR: {a}" for q, a in faq if a)
    T["articulo"] = (f"# {P}: nueva convocatoria de {org}\n\n{org} ha publicado la convocatoria de {P}. Resumimos los datos oficiales; cada uno sale literalmente del boletín.\n\n"
                     f"## Datos de la convocatoria\n\n{datos}\n\n## Fuente oficial\n\n{fuente}\n\n## Cómo prepararla\n\n{prep('articulo')}\n\n"
                     f"Si quieres enterarte de las listas, fechas de examen y modificaciones, sigue la convocatoria en su ficha.")
    return T

# ---------------- Verificación de datos ----------------
def _sin_acentos(t): return unicodedata.normalize("NFD", t).encode("ascii", "ignore").decode()
def numeros(texto): return set(re.findall(r"\d+(?:[.,]\d+)*", re.sub(r"https?://\S+", "", texto)))

def verificar(texto, h, canal, extra_permitidos=()):
    """Fact check determinista. Devuelve lista de problemas (vacía = OK)."""
    prob = []
    fuentes_txt = json.dumps(h, ensure_ascii=False)
    permitidos = numeros(fuentes_txt) | {fmt_n(h["plazas"]) for _ in [0] if h.get("plazas")} | set(extra_permitidos)
    permitidos |= {fmt_f(h.get("publicado", ""))} | set(fmt_f(h.get("publicado", "")).split("/"))
    for n in numeros(texto):
        if n not in permitidos and n.replace(".", "") not in permitidos: prob.append(f"número no verificado: {n}")
    for u in re.findall(r"https?://[^\s)]+", texto):
        if not (u.startswith(sitio()) or u == h.get("url_oficial")): prob.append(f"enlace no permitido: {u}")
    for rx in PROHIBIDO:
        if re.search(rx, texto): prob.append(f"afirmación prohibida ({rx})")
    largo = len(re.sub(r"https?://\S+", "x" * 23, texto)) if canal == "x" else len(texto)  # X cuenta cada enlace como 23 caracteres
    if largo > CANALES[canal]["max"]: prob.append(f"demasiado largo para {canal} ({largo} > {CANALES[canal]['max']})")
    return prob

# ---------------- Contenido ----------------
def ruta(cid): return os.path.join(N.EST, DIR, cid + ".json")
def cargar(cid): return json.load(open(ruta(cid)))
def guardar(c):
    os.makedirs(os.path.join(N.EST, DIR), exist_ok=True)
    c["updated_at"] = N.iso(); json.dump(c, open(ruta(c["id"]), "w"), ensure_ascii=False, indent=1); return c
def todos():
    d = os.path.join(N.EST, DIR)
    return [json.load(open(os.path.join(d, f))) for f in sorted(os.listdir(d)) if f.endswith(".json")] if os.path.isdir(d) else []

def modo_efectivo(modo_regla, h, canal):
    """AUTO_PUBLISH solo si: la regla lo permite, el canal lo permite, está activado en config y el dato oficial está VERIFICADO."""
    cfg = N.config().get("crecimiento", {}).get("modo_publicacion", {})
    if modo_regla == "AUTO_PUBLISH" and CANALES[canal]["auto"] and cfg.get(canal) == "AUTO_PUBLISH" and h.get("verification_status") == "OFFICIAL_VERIFIED":
        return "AUTO_PUBLISH"
    return "HUMAN_REVIEW_REQUIRED"

def generar(evento, h, canales, modo_regla="HUMAN_REVIEW_REQUIRED", campana=None, categoria="CONVOCATION", audiencia=None):
    """Genera un contenido por canal a partir del mismo evento. Idempotente: el id depende del evento y el canal."""
    campana = campana or "convocatorias-" + N.iso()[:7]
    creados = []
    for canal in canales:
        cid = f"{canal}-{re.sub(r'[^A-Za-z0-9-]', '-', h['id'])}-{evento['id'][:8]}"
        if os.path.exists(ruta(cid)): continue
        texto = plantillas(h, campana, cid)[canal]
        gen, modelo, conf, coste = "plantilla", None, 0.9, 0.0
        if canal == "articulo" and N.flag("ai_growth"):
            r = llm.completar("articulo", "BALANCED", "Redacta un artículo breve y útil en español (markdown, 250-400 palabras) sobre esta convocatoria. "
                              "Incluye solo estos hechos y enlaza la fuente oficial y la ficha.\n<hechos>" + json.dumps(h, ensure_ascii=False) + "</hechos>",
                              evento=evento["id"], campana=campana)
            coste = r["cost"]
            if r["texto"] and not verificar(r["texto"], h, canal): texto, gen, modelo, conf = r["texto"], "llm", r["model"], 0.7
        c = {"id": cid, "type": canal, "category": categoria, "title": texto.splitlines()[0].lstrip("# ").replace("Asunto: ", "")[:140], "body": texto,
             "source_event": evento["id"], "event_type": evento["type"], "target_audience": audiencia or {"categoria": h.get("categoria"), "oposicion": h.get("oposicion_id")},
             "opposition_id": h.get("oposicion_id"), "campaign_id": campana, "source_urls": [h["url_oficial"]], "facts": h,
             "generated_by": gen, "model": modelo, "status": "DRAFT", "confidence": conf, "cost": coste, "importance": evento.get("_importancia"),
             "created_at": N.iso(), "approved_at": None, "scheduled_for": None, "published_at": None, "updated_at": N.iso(), "history": []}
        # DRAFT → AI_REVIEW (verificación automática)
        c["status"] = "AI_REVIEW"
        prob = verificar(c["body"], h, canal)
        if prob:
            cambiar(c, "REJECTED", "verificación automática", "; ".join(prob))
        elif modo_efectivo(modo_regla, h, canal) == "AUTO_PUBLISH":
            cambiar(c, "APPROVED", "regla AUTO_PUBLISH + dato OFFICIAL_VERIFIED"); programar(c)
        else:
            cambiar(c, "HUMAN_REVIEW", "requiere revisión humana (dato no verificado por una persona o canal sin autopublicación)")
        creados.append(guardar(c))
    return creados

def cambiar(c, estado, quien, nota=""):
    assert estado in ESTADOS
    c["history"].append({"t": N.iso(), "de": c["status"], "a": estado, "por": quien, "nota": nota})
    c["status"] = estado
    if estado == "APPROVED": c["approved_at"] = N.iso()
    if estado == "PUBLISHED": c["published_at"] = N.iso()
    return c

def programar(c, cuando=None):
    """Calendario: alertas al momento; social en huecos (09:30 y 18:30 hora peninsular aprox.), máx. N por canal y día."""
    if cuando: c["scheduled_for"] = cuando
    elif c["type"] in ("telegram", "email", "articulo", "faq", "cta"): c["scheduled_for"] = N.iso()
    else:
        max_dia = N.config().get("crecimiento", {}).get("max_por_canal_y_dia", 2)
        ocupados = {}
        for x in todos():
            if x["type"] == c["type"] and x.get("scheduled_for") and x["status"] in ("SCHEDULED", "PUBLISHED"):
                ocupados[x["scheduled_for"][:10]] = ocupados.get(x["scheduled_for"][:10], 0) + 1
        d = N.ahora().date()
        while ocupados.get(d.isoformat(), 0) >= max_dia: d += datetime.timedelta(1)
        hora = "07:30:00Z" if ocupados.get(d.isoformat(), 0) == 0 else "16:30:00Z"
        c["scheduled_for"] = f"{d.isoformat()}T{hora}"
    cambiar(c, "SCHEDULED", "calendario")
    return c

# Acciones humanas (CLI / admin)
def aprobar(cid, quien="admin"):
    c = cargar(cid)
    if c["status"] not in ("HUMAN_REVIEW", "REJECTED", "DRAFT"): raise ValueError(f"no se puede aprobar en estado {c['status']}")
    prob = verificar(c["body"], c["facts"], c["type"])
    if prob: raise ValueError("no pasa la verificación: " + "; ".join(prob))
    cambiar(c, "APPROVED", quien); programar(c); return guardar(c)
def rechazar(cid, motivo, quien="admin"): c = cargar(cid); cambiar(c, "REJECTED", quien, motivo); return guardar(c)
def editar(cid, cuerpo, quien="admin"):
    c = cargar(cid); prob = verificar(cuerpo, c["facts"], c["type"])
    if prob: raise ValueError("el texto editado no pasa la verificación: " + "; ".join(prob))
    c["body"] = cuerpo; c["generated_by"] += "+editado"; cambiar(c, "HUMAN_REVIEW", quien, "editado"); return guardar(c)
def reprogramar(cid, cuando, quien="admin"):
    c = cargar(cid)
    if c["status"] not in ("APPROVED", "SCHEDULED"): raise ValueError("solo se reprograma contenido aprobado")
    N.parse(cuando); c["scheduled_for"] = cuando; cambiar(c, "SCHEDULED", quien, "reprogramado"); return guardar(c)
def archivar(cid, quien="admin"): c = cargar(cid); cambiar(c, "ARCHIVED", quien); return guardar(c)
