"""Productores de eventos a partir de lo que ya genera el motor de ingesta (no se duplica ninguna detección):
  catalogo/convocatorias/*.json            → NEW_CONVOCATION
  catalogo/novedades-convocatorias.json    → CONVOCATION_UPDATED (cambios de datos detectados al re-extraer)
  catalogo/novedades.json (vigilar_boe)    → EXAM_DATE_CHANGED · OFFICIAL_LIST_PUBLISHED · CONVOCATION_UPDATED (oposiciones del catálogo)
  ingesta/estado/cambios.jsonl             → OFFICIAL_DOCUMENT_CHANGED
  ingesta/estado/fuentes-estado.json       → OFFICIAL_SOURCE_FAILED
  catalogo/oposiciones/*.json              → NEW_OPPOSITION · SYLLABUS_UPDATED (hash del temario)
Solo se anuncian novedades recientes (config.json → crecimiento.ventana_novedad_dias): el histórico no genera difusión.
La idempotencia del bus garantiza que ejecutar esto varias veces no duplica eventos.
"""
import os, json, glob, datetime
from . import nucleo as N, eventos as E

CAT = os.path.join(N.RAIZ, "catalogo"); ING = os.path.join(N.RAIZ, "ingesta", "estado")
def _j(p, d): return json.load(open(p)) if os.path.exists(p) else d

def reciente(fecha, dias):
    if not fecha: return False
    return (N.ahora().date() - datetime.date.fromisoformat(fecha[:10])).days <= dias

def producir():
    cfg = N.config().get("crecimiento", {}); ventana = cfg.get("ventana_novedad_dias", 3)
    n = {}
    def pub(tipo, **kw):
        if E.publicar(tipo, "ingesta", **kw): n[tipo] = n.get(tipo, 0) + 1

    for f in sorted(glob.glob(os.path.join(CAT, "convocatorias", "*.json"))):
        v = json.load(open(f))
        if not reciente(v["fuente"].get("published_at"), ventana): continue
        d = v.get("datos", {})
        pub("NEW_CONVOCATION", entity_type="convocatoria", entity_id=v["id"], idempotency_key="NEW_CONVOCATION:" + v["id"],
            payload={"titulo": v["titulo"][:300], "categoria": v["categoria"], "administracion": v.get("administracion"), "plazas": (d.get("plazas") or {}).get("valor"),
                     "oposicion_id": v.get("oposicion_id"), "verification_status": v.get("verification_status"), "url": v["fuente"]["source_url"], "publicado": v["fuente"].get("published_at"),
                     "relacion": next((x["relacion"] for x in v.get("vinculos_oposicion", []) if x["oposicion"] == v.get("oposicion_id")), None)})

    for x in _j(os.path.join(CAT, "novedades-convocatorias.json"), []):
        if not reciente(x.get("detectado"), ventana): continue
        cid = x["oposicion"].removeprefix("conv-")
        campos = [c.split(":")[0].strip() for c in x["titulo"].split(":", 1)[-1].split(";")]
        mapa = {"plazas": "plazas", "plazo de solicitudes": "plazo_solicitudes", "sistema selectivo": "sistema_selectivo", "titulación": "titulacion", "grupo": "grupo", "plaza": "denominacion"}
        pub("CONVOCATION_UPDATED", entity_type="convocatoria", entity_id=cid, idempotency_key="CONVOCATION_UPDATED:" + x["id"],
            payload={"campos": [mapa.get(c, c) for c in campos], "titulo": x["titulo"], "url": x["url"], "seguidores": x["oposicion"]})

    TIPO = {"fecha_examen": "EXAM_DATE_CHANGED", "listas": "OFFICIAL_LIST_PUBLISHED", "aprobados": "OFFICIAL_LIST_PUBLISHED", "modificacion": "CONVOCATION_UPDATED", "correccion": "CONVOCATION_UPDATED"}
    for x in _j(os.path.join(CAT, "novedades.json"), []):
        t = TIPO.get(x.get("tipo"))
        if not t or x.get("relevancia") != "convocatoria" or not reciente(x.get("detectado") or x.get("fecha"), ventana): continue
        pub(t, entity_type="oposicion", entity_id=x["oposicion"], idempotency_key=f"{t}:{x['oposicion']}:{x['id']}",
            payload={"titulo": x["titulo"][:300], "url": x["url"], "boe_id": x["id"], "fecha": x.get("fecha"), "campos": ["fecha_examen"] if t == "EXAM_DATE_CHANGED" else [],
                     "verification_status": "OFFICIAL_VERIFIED" if x.get("relevancia") == "convocatoria" else "OFFICIAL_PENDING_REVIEW"})

    p = os.path.join(ING, "cambios.jsonl")
    for l in (open(p) if os.path.exists(p) else []):
        c = json.loads(l)
        if c.get("cambio") != "modificado" or not reciente(c["t"], ventana): continue
        pub("OFFICIAL_DOCUMENT_CHANGED", entity_type="documento", entity_id=c["doc_id"], idempotency_key=f"OFFICIAL_DOCUMENT_CHANGED:{c['doc_id']}:{c.get('version') or c['sha_nuevo']}",
            payload={"fuente": c["fuente"], "url": c["url"], "titulo": c.get("titulo", ""), "diff": c.get("diff")})

    for fid, e in _j(os.path.join(ING, "fuentes-estado.json"), {}).items():
        if e.get("estado") in ("error", "inaccesible"):
            pub("OFFICIAL_SOURCE_FAILED", entity_type="fuente", entity_id=fid, idempotency_key=f"OFFICIAL_SOURCE_FAILED:{fid}:{e.get('ultimo_escaneo')}",
                payload={"estado": e["estado"], "errores_consecutivos": e.get("errores_consecutivos", 0), "error": (e.get("ultimo_error") or "")[:200]})

    est = N.leer("productores.json", {"temarios": {}})
    primera = not est["temarios"]
    for f in sorted(glob.glob(os.path.join(CAT, "oposiciones", "*.json"))):
        o = json.load(open(f)); h = N.huella(o.get("temario", {}))
        prev = est["temarios"].get(o["id"])
        if prev is None and not primera:
            pub("NEW_OPPOSITION", entity_type="oposicion", entity_id=o["id"], idempotency_key="NEW_OPPOSITION:" + o["id"], payload={"nombre": o["nombre"], "categoria": o["categoria"]})
        elif prev and prev != h:
            pub("SYLLABUS_UPDATED", entity_type="oposicion", entity_id=o["id"], idempotency_key=f"SYLLABUS_UPDATED:{o['id']}:{h}", payload={"nombre": o["nombre"]})
        est["temarios"][o["id"]] = h
    N.guardar("productores.json", est)
    return n

def tick(tipo):
    """Eventos de planificación (cron): uno por día/semana gracias a la clave de idempotencia."""
    hoy = N.ahora().date()
    clave = {"DAILY_TICK": hoy.isoformat(), "RETENTION_SCAN": hoy.isoformat(), "WEEKLY_TICK": "%d-W%02d" % hoy.isocalendar()[:2]}[tipo]
    return E.publicar(tipo, "cron", entity_type="calendario", entity_id=clave, idempotency_key=f"{tipo}:{clave}")
