"""Growth Orchestrator: recibe eventos → calcula importancia → evalúa reglas (crecimiento/reglas.json) → crea trabajos → los ejecuta → registra resultados.
Todas las acciones que salen de un mismo evento comparten correlation_id, así que un NEW_CONVOCATION puede seguirse hasta
su artículo, su mensaje de Telegram y su email.

Uso (lo ejecuta .github/workflows/crecimiento.yml):
  python3 -m crecimiento.orquestador [--tick DAILY_TICK|WEEKLY_TICK|RETENTION_SCAN] [--sin-productores]
"""
import os, json, glob, argparse, datetime
from . import nucleo as N, eventos as E, importancia as I, contenido as K, canales as CH, seo, analista
from .jobs import Cola

REGLAS = json.load(open(os.path.join(N.R, "reglas.json")))["reglas"]

def cumple(regla, ev, imp):
    si = regla.get("si", {})
    if si.get("flag") and not N.flag(si["flag"]): return False
    if si.get("importancia_min") and not I.mayor_o_igual(imp, si["importancia_min"]): return False
    if si.get("importancia_max") and not I.mayor_o_igual(si["importancia_max"], imp): return False
    for k, v in si.get("payload", {}).items():
        x = ev["payload"].get(k)
        if (x not in v) if isinstance(v, list) else (x != v): return False
    return True

def planificar(ev, cola):
    """Evalúa las reglas para un evento y encola sus acciones (idempotente por evento + acción)."""
    if not N.flag("growth_engine") and ev["type"] not in ("WEEKLY_TICK",): return []
    imp = I.calcular(ev); ev["_importancia"] = imp
    creados = []
    for r in REGLAS:
        if r["cuando"] != ev["type"] or not cumple(r, ev, imp): continue
        for a in r["entonces"]:
            prio = {"CRITICAL": 1, "HIGH": 2, "MEDIUM": 4, "LOW": 6}[imp]
            j = cola.encolar(a["accion"], {"regla": r["id"], "accion": a, "evento": {k: ev[k] for k in ("id", "type", "entity_type", "entity_id", "payload", "correlation_id")}, "importancia": imp},
                             event_id=ev["id"], clave=f"{ev['id']}:{r['id']}:{a['accion']}", prioridad=prio)
            if j: creados.append(j)
    return creados

# ---------------- Ejecutores ----------------
def _ev(job): return job["data"]["evento"]
def _emitir(tipo, job, **kw):
    ev = _ev(job)
    return E.publicar(tipo, "orquestador", correlation_id=ev["correlation_id"], metadata={"job": job["id"], "evento_origen": ev["id"]}, **kw)

def x_update_seo(job):
    ev = _ev(job); r = seo.evaluar_entidad(ev["entity_type"], ev["entity_id"])
    _emitir("SEO_PAGE_UPDATED", job, entity_type=ev["entity_type"], entity_id=ev["entity_id"], payload=r)
    return r

def cargar_ficha(cid):
    f = os.path.join(N.RAIZ, "catalogo", "convocatorias", cid + ".json")
    if not os.path.exists(f): raise FileNotFoundError(f)
    return json.load(open(f)), [json.load(open(p)) for p in glob.glob(os.path.join(N.RAIZ, "catalogo", "oposiciones", "*.json"))]

def x_generate_content(job):
    ev, a = _ev(job), job["data"]["accion"]
    if ev["entity_type"] != "convocatoria": return {"_status": "skipped", "motivo": "sin plantilla para " + ev["entity_type"]}
    ficha, opos = cargar_ficha(ev["entity_id"])
    h = K.hechos_convocatoria(ficha, opos); h["categoria"] = ev["payload"].get("categoria")
    evento = dict(ev, _importancia=job["data"]["importancia"])
    creados = K.generar(evento, h, a["canales"], a.get("modo", "HUMAN_REVIEW_REQUIRED"), campana=a.get("campana"), categoria=a.get("categoria", "CONVOCATION"))
    for c in creados:
        _emitir({"REJECTED": "CONTENT_REJECTED", "HUMAN_REVIEW": "CONTENT_GENERATED"}.get(c["status"], "CONTENT_APPROVED"), job,
                entity_type="contenido", entity_id=c["id"], payload={"canal": c["type"], "estado": c["status"]})
    return {"contenidos": [c["id"] for c in creados], "estados": {c["id"]: c["status"] for c in creados}, "cost": sum(c.get("cost", 0) for c in creados)}

def x_notify_followers(job):
    """Avisos a quien sigue la oposición/convocatoria: in-app ya sale de novedades.json; el email lo hace el servicio notificar (ciclo)."""
    ev = _ev(job); r = {}
    if N.flag("telegram") and ev["entity_type"] == "oposicion":
        texto = f"🔔 {ev['payload'].get('titulo', 'Nueva publicación oficial')}\n\nFuente oficial: {ev['payload'].get('url', '')}"
        r["telegram"] = CH.Telegram().avisar_seguidores(ev["entity_id"], texto)
    if not N.flag("email"): return dict(r, _status="done" if r else "skipped", motivo="flag email desactivado (los avisos in-app siguen funcionando)")
    r.update(CH.Email().llamar({"accion": "ciclo"}))
    _emitir("EMAIL_SENT", job, entity_type=_ev(job)["entity_type"], entity_id=_ev(job)["entity_id"], payload={"encolados": r.get("encolados", 0)})
    return r

def x_analytics_event(job):
    ev = _ev(job); dia = N.iso()[:10]
    c = N.leer("contadores.json", {})
    c.setdefault(dia, {}); c[dia][ev["type"]] = c[dia].get(ev["type"], 0) + 1
    N.guardar("contadores.json", dict(sorted(c.items())[-120:]))
    return {"dia": dia, "tipo": ev["type"]}

def x_reactivation_email(job):
    r = {}
    for d in job["data"]["accion"].get("dias", [5]): r[str(d)] = CH.Email().reactivacion(d).get("encolados", 0)
    return {"encolados_por_dias": r, "provider": "notificar"}

def x_daily_question(job):
    """Pregunta del día (contenido de TestLey con cita verificada) al canal de Telegram. Determinista, sin LLM."""
    fs = sorted(glob.glob(os.path.join(N.RAIZ, "datos", "preguntas-*.json")))
    dia = N.ahora().date().toordinal()
    f = fs[dia % len(fs)]; qs = [q for q in json.load(open(f)) if q.get("verification_status") != "DEPRECATED"]
    q = qs[dia % len(qs)]; slug = os.path.basename(f)[10:-5]
    url = K.utm(f"{N.config()['url']}{slug}/articulo-{q['art']}/", "telegram", "pregunta-diaria", N.iso()[:10])
    texto = f"❓ Pregunta del día\n\n{q['q']}\n\n" + "\n".join(f"{'abcd'[i]}) {o}" for i, o in enumerate(q["o"])) + f"\n\nSolución con la cita del BOE: {url}"
    cid = f"telegram-pregunta-{N.iso()[:10]}"
    if os.path.exists(K.ruta(cid)): return {"contenido": cid, "_status": "skipped", "motivo": "ya generada hoy"}
    hechos = {"id": cid, "pregunta": q, "url_oficial": url, "verification_status": "OFFICIAL_VERIFIED"}
    c = {"id": cid, "type": "telegram", "category": "QUIZ", "title": "Pregunta del día", "body": texto, "source_event": _ev(job)["id"], "event_type": "DAILY_TICK",
         "target_audience": {"canal": "telegram"}, "opposition_id": None, "campaign_id": "pregunta-diaria", "source_urls": [f"https://www.boe.es/"],
         "facts": hechos, "generated_by": "plantilla", "model": None, "status": "AI_REVIEW", "confidence": 1.0, "cost": 0, "importance": "LOW",
         "created_at": N.iso(), "approved_at": None, "scheduled_for": None, "published_at": None, "updated_at": N.iso(), "history": []}
    prob = K.verificar(texto, hechos, "telegram")
    if prob: K.cambiar(c, "REJECTED", "verificación automática", "; ".join(prob))
    elif K.modo_efectivo("AUTO_PUBLISH", hechos, "telegram") == "AUTO_PUBLISH": K.cambiar(c, "APPROVED", "pregunta verificada"); K.programar(c)
    else: K.cambiar(c, "HUMAN_REVIEW", "telegram sin autopublicación")
    K.guardar(c)
    return {"contenido": cid, "estado": c["status"]}

def x_publish_scheduled(job):
    """Publica lo programado cuyo momento ha llegado. Canales sin API → quedan listos para publicación manual (no se marcan como publicados)."""
    hechos, manual = [], []
    for c in K.todos():
        if c["status"] != "SCHEDULED" or N.parse(c["scheduled_for"]) > N.ahora(): continue
        canal = c["type"]
        if canal in ("articulo", "faq", "cta"):
            if canal == "articulo":  # puerta de calidad SEO: si no la pasa, se publica con noindex
                c["seo"] = seo.calidad_articulo(c, [x for x in K.todos() if x["type"] == "articulo" and x["status"] == "PUBLISHED"])
            K.cambiar(c, "PUBLISHED", "web (build)"); K.guardar(c)
            if canal == "articulo": _emitir("NEW_ARTICLE", job, entity_type="contenido", entity_id=c["id"], payload={"ruta": seo.ruta_articulo(c)})
            hechos.append(c["id"]); continue
        if canal == "telegram" and not N.flag("telegram"): continue
        if canal == "email" and not N.flag("email"): continue
        try:
            if canal == "telegram": r = CH.Telegram().enviar(c["body"])
            elif canal == "email": r = CH.Email().difusion(c, c.get("target_audience") or {})
            else:
                c["publicacion_manual"] = True; K.guardar(c); manual.append(c["id"]); continue
        except CH.SinProveedor as e:
            c.setdefault("history", []).append({"t": N.iso(), "de": c["status"], "a": c["status"], "por": "publicador", "nota": str(e)}); K.guardar(c); continue
        K.cambiar(c, "PUBLISHED", r.get("provider", canal)); K.guardar(c); hechos.append(c["id"])
        _emitir("TELEGRAM_ALERT_SENT" if canal == "telegram" else "EMAIL_SENT", job, entity_type="contenido", entity_id=c["id"], payload={"canal": canal})
    return {"publicados": hechos, "pendientes_manual": manual}

def x_growth_report(job):
    return analista.informe_semanal()

EJECUTORES = {"update_seo": x_update_seo, "generate_content": x_generate_content, "notify_followers": x_notify_followers, "analytics_event": x_analytics_event,
              "reactivation_email": x_reactivation_email, "daily_question": x_daily_question, "publish_scheduled": x_publish_scheduled, "growth_report": x_growth_report}

def ciclo(ticks=(), productores=True):
    import time; t0 = time.time()
    if productores:
        from . import productores as P
        prod = P.producir()
        for t in ticks: P.tick(t)
    else: prod = {}
    est = N.leer("orquestador.json", {"cursor": 0})
    nuevos, total = E.bus().desde(est["cursor"])
    cola = Cola(); planificados = 0
    for ev in nuevos: planificados += len(planificar(ev, cola))
    est["cursor"] = total; cola.guardar(); N.guardar("orquestador.json", est)
    trabajos = cola.trabajar(EJECUTORES)
    # Las acciones generan eventos nuevos (CONTENT_*, SEO_PAGE_UPDATED…): se planifican en la siguiente pasada
    r = {"t": N.iso(), "duracion_s": round(time.time() - t0, 2), "eventos_producidos": prod, "eventos_leidos": len(nuevos), "trabajos_planificados": planificados, "trabajos": trabajos}
    N.anadir("ciclos.jsonl", r)
    return r

if __name__ == "__main__":
    a = argparse.ArgumentParser(); a.add_argument("--tick", action="append", default=[]); a.add_argument("--sin-productores", action="store_true")
    args = a.parse_args()
    print(json.dumps(ciclo(args.tick, not args.sin_productores), ensure_ascii=False))
