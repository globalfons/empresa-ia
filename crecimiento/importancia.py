"""Importance Engine: no todas las novedades merecen la misma difusión (evita spam). Determinista, sin LLM."""
NIVELES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"]

def mayor_o_igual(a, b): return NIVELES.index(a) >= NIVELES.index(b)

def calcular(ev):
    t, p = ev["type"], ev.get("payload", {})
    if t == "EXAM_DATE_CHANGED": return "CRITICAL"
    if t in ("CONVOCATION_CLOSED", "OFFICIAL_LIST_PUBLISHED", "SYLLABUS_UPDATED"): return "HIGH"
    if t == "NEW_CONVOCATION":
        plazas = p.get("plazas") or 0
        if p.get("oposicion_id") or plazas >= 100: return "HIGH"   # oposición del catálogo o convocatoria grande
        return "MEDIUM" if plazas >= 10 else "LOW"
    if t == "CONVOCATION_UPDATED":
        campos = set(p.get("campos", []))
        if campos & {"plazas", "plazo_solicitudes", "fecha_examen"}: return "HIGH"
        return "MEDIUM" if campos else "LOW"
    if t == "OFFICIAL_DOCUMENT_CHANGED":
        d = p.get("diff") or {}
        return "MEDIUM" if (d.get("lineas_anadidas", 0) + d.get("lineas_quitadas", 0)) > 20 else "LOW"
    if t == "OFFICIAL_SOURCE_FAILED": return "MEDIUM" if p.get("errores_consecutivos", 0) >= 3 else "LOW"
    return "LOW"
