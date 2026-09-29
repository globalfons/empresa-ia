"""AI Growth Analyst (determinista por defecto; resumen con LLM opcional). PROPONE, nunca ejecuta cambios comerciales.
Entradas: contadores de eventos, cola de contenido, trabajos, costes, salud de fuentes, SEO y, si hay credenciales,
las métricas de negocio de Postgres (RPC admin_metricas con la clave de servicio, solo en el worker).
Salidas: crecimiento/privado/informes/<semana>.json (con métricas de negocio: nunca se publica) y
crecimiento/estado/informe-publico.json (solo operación: contenido, trabajos, fuentes, SEO) + eventos CONTENT_OPPORTUNITY."""
import os, json, glob, datetime, urllib.request
from . import nucleo as N, eventos as E, contenido as K, seo, llm

def metricas_negocio():
    url, key = N.config().get("supabaseUrl"), N.secreto("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key: return None
    req = urllib.request.Request(url + "/rest/v1/rpc/admin_metricas", data=b'{"p_dias": 7}', headers={"apikey": key, "Authorization": "Bearer " + key, "content-type": "application/json"})
    try: return json.load(urllib.request.urlopen(req, timeout=60))
    except Exception as e: return {"error": str(e)[:200]}

def embudo_mas_debil(m):
    pasos = [("visitas", "registros"), ("registros", "activados"), ("activados", "muro_pago"), ("muro_pago", "premium")]
    tasas = [(a + "→" + b, (m.get(b, 0) / m[a]) if m.get(a) else None) for a, b in pasos]
    tasas = [t for t in tasas if t[1] is not None]
    return min(tasas, key=lambda t: t[1]) if tasas else None

import re, unicodedata, collections
VACIAS = r"\b(de la|de los|de las|del|de|la|el|los|las|y|en|a|o|plazas?|personal|funcionario|carrera|categoria|escala|subescala|clase|puestos?|plantilla|laboral|fijo)\b"
def denominacion_tipo(t):
    """Normaliza la denominación oficial de la plaza para agrupar convocatorias del mismo tipo (p. ej. «Agente de Policía Local»)."""
    t = unicodedata.normalize("NFD", (t or "").lower()); t = "".join(c for c in t if unicodedata.category(c) != "Mn")
    t = re.sub(r"[^a-z ]", " ", t.replace("/", " ")); t = re.sub(VACIAS, " ", t)
    return " ".join(t.split()[:4])

def candidatas(convs, opos_cats, minimo=15):
    """Oposiciones candidatas a entrar en el catálogo: tipos de plaza que más se repiten en convocatorias oficiales reales.
    Solo se proponen (con los identificadores oficiales de ejemplo); crear la ficha exige verificar sus bases y temario."""
    c = collections.defaultdict(list)
    for v in convs:
        den = denominacion_tipo((v.get("datos", {}).get("denominacion") or {}).get("valor"))
        if den: c[(v["categoria"], den)].append(v["id"])
    out = [{"categoria": k[0], "tipo_plaza": k[1], "convocatorias": len(ids), "ejemplos": sorted(ids)[-3:], "categoria_con_ficha": k[0] in opos_cats}
           for k, ids in c.items() if len(ids) >= minimo]
    return sorted(out, key=lambda x: -x["convocatorias"])

def informe_semanal():
    hoy = N.ahora().date(); semana = "%d-W%02d" % hoy.isocalendar()[:2]
    conts = K.todos(); jobs = N.leer("jobs.json", {})
    hace7 = (N.ahora() - datetime.timedelta(days=7)).isoformat()[:10]
    costes = [c for c in N.leer_lineas("costes.jsonl") if c["t"][:10] >= hace7]
    convs = [json.load(open(f)) for f in glob.glob(os.path.join(N.RAIZ, "catalogo", "convocatorias", "*.json"))]
    opos = {json.load(open(f))["categoria"] for f in glob.glob(os.path.join(N.RAIZ, "catalogo", "oposiciones", "*.json"))}
    fuentes = json.load(open(os.path.join(N.RAIZ, "ingesta", "estado", "fuentes-estado.json"))) if os.path.exists(os.path.join(N.RAIZ, "ingesta", "estado", "fuentes-estado.json")) else {}
    publico = {
        "semana": semana, "generado": N.iso(),
        "contenido": {e: sum(1 for c in conts if c["status"] == e) for e in K.ESTADOS},
        "contenido_por_canal": {c: sum(1 for x in conts if x["type"] == c) for c in K.CANALES},
        "motivos_rechazo": sorted({h["nota"] for c in conts if c["status"] == "REJECTED" for h in c["history"][-1:] if h.get("nota")})[:10],
        "trabajos": {s: sum(1 for j in jobs.values() if j["status"] == s) for s in ("pending", "done", "failed", "dead", "sin_proveedor", "cancelled", "skipped")},
        "coste_llm_7d_eur": round(sum(c["estimated_cost"] for c in costes), 4), "llamadas_llm_7d": len(costes),
        "fuentes_con_fallo": [k for k, v in fuentes.items() if v.get("estado") in ("error", "inaccesible")],
        "seo": {"convocatorias": len(convs), "indexables": sum(1 for v in convs if seo.util_convocatoria(v))},
    }
    # Oportunidades deterministas (sin datos personales)
    ops = []
    por_cat = {}
    for v in convs: por_cat[v["categoria"]] = por_cat.get(v["categoria"], 0) + 1
    for cat, n in sorted(por_cat.items(), key=lambda x: -x[1]):
        if cat not in opos and n >= 20: ops.append({"tipo": "catalogo", "prioridad": "alta" if n >= 100 else "media", "propuesta": f"Incorporar una oposición con temario y tests de «{cat}»: {n} convocatorias oficiales y ninguna ficha preparada."})
    if publico["contenido"]["HUMAN_REVIEW"] >= 10: ops.append({"tipo": "operacion", "prioridad": "media", "propuesta": f"{publico['contenido']['HUMAN_REVIEW']} contenidos esperan revisión humana: revísalos en /admin/growth/ (o con crecimiento/cli.py)."})
    if publico["fuentes_con_fallo"]: ops.append({"tipo": "datos", "prioridad": "alta", "propuesta": "Fuentes oficiales caídas: " + ", ".join(publico["fuentes_con_fallo"]) + ". Revisa la red del worker o la URL."})
    if publico["seo"]["convocatorias"] and publico["seo"]["indexables"] / publico["seo"]["convocatorias"] < 0.6:
        ops.append({"tipo": "seo", "prioridad": "media", "propuesta": "Menos del 60 % de las fichas de convocatoria son indexables: mejorar la extracción de plazas y plazos."})
    negocio = metricas_negocio()
    if negocio and not negocio.get("error"):
        d = embudo_mas_debil(negocio.get("embudo", {}))
        if d: ops.append({"tipo": "embudo", "prioridad": "alta", "propuesta": f"Paso más débil del embudo: {d[0]} ({round(100 * d[1], 1)} %). Proponer un experimento sobre ese paso."})
        for b in (negocio.get("busquedas_sin_resultado") or [])[:5]:
            ops.append({"tipo": "contenido", "prioridad": "media", "propuesta": f"Búsqueda sin resultados «{b['q']}» ({b['n']} veces): crear o enlazar una página útil si existe la oposición."})
    publico["candidatas_catalogo"] = candidatas(convs, opos)
    for x in publico["candidatas_catalogo"][:5]:
        ops.append({"tipo": "catalogo", "prioridad": "alta" if x["convocatorias"] >= 50 else "media",
                    "propuesta": f"Candidata a oposición del catálogo: «{x['tipo_plaza']}» ({x['categoria']}), {x['convocatorias']} convocatorias oficiales. Ejemplos: {', '.join(x['ejemplos'])}."})
    publico["oportunidades"] = ops
    for o in ops:
        E.publicar("CONTENT_OPPORTUNITY", "analista", entity_type="oportunidad", entity_id=semana, payload=o, idempotency_key=f"CONTENT_OPPORTUNITY:{semana}:{N.huella(o)}")
    resumen = None
    if N.flag("ai_growth"):
        r = llm.completar("growth_analyst", "ADVANCED", "Resume en 5 viñetas qué ha pasado esta semana y qué experimento propones. Solo con estos datos:\n<hechos>"
                          + json.dumps({"operacion": publico, "negocio": negocio}, ensure_ascii=False) + "</hechos>")
        resumen = r["texto"] or None
    N.guardar("informe-publico.json", publico)
    N.guardar(f"informe-{semana}.json", {"publico": publico, "negocio": negocio, "resumen_ia": resumen, "resumen_es_ia": bool(resumen)}, privado=True)
    return {"semana": semana, "oportunidades": len(ops), "negocio": bool(negocio and not negocio.get("error"))}
