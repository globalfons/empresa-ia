"""Event Bus. Un único esquema de evento para todo TestLey:
  {id, type, timestamp, source, entity_type, entity_id, payload, metadata, correlation_id, idempotency_key}
Transportes:
  - FileStore (crecimiento/estado/eventos.jsonl, versionado en git): eventos del sistema y de datos oficiales. Sin datos personales.
  - Supabase (tabla public.eventos, RPC registrar_evento): eventos de producto del navegador. Ver supabase/esquema.sql v4.
Idempotencia: un evento con la misma idempotency_key no se publica dos veces.
"""
from . import nucleo as N

TIPOS = {
    # producto / usuarios (normalmente llegan por Supabase)
    "USER_REGISTERED", "USER_ACTIVATED", "USER_INACTIVE", "TEST_STARTED", "TEST_COMPLETED", "SIMULATION_STARTED", "SIMULATION_COMPLETED",
    "PAYWALL_REACHED", "FREE_LIMIT_REACHED", "ONBOARDING_COMPLETED", "CHECKOUT_STARTED",
    "SUBSCRIPTION_STARTED", "SUBSCRIPTION_CANCELLED", "SUBSCRIPTION_RENEWED", "SUBSCRIPTION_EXPIRED", "PAYMENT_FAILED",
    # datos oficiales
    "NEW_OPPOSITION", "NEW_CONVOCATION", "CONVOCATION_UPDATED", "CONVOCATION_CLOSED", "EXAM_DATE_CHANGED", "SYLLABUS_UPDATED",
    "OFFICIAL_DOCUMENT_CHANGED", "OFFICIAL_SOURCE_FAILED", "OFFICIAL_LIST_PUBLISHED", "OPPOSITION_UPDATE_PROPOSED",
    # contenido y SEO
    "NEW_ARTICLE", "SEO_PAGE_UPDATED", "CONTENT_GENERATED", "CONTENT_APPROVED", "CONTENT_REJECTED", "CONTENT_PUBLISHED", "CONTENT_OPPORTUNITY",
    # canales y campañas
    "TELEGRAM_ALERT_SENT", "EMAIL_SENT", "CAMPAIGN_STARTED", "CAMPAIGN_COMPLETED",
    # referidos y afiliados
    "REFERRAL_CREATED", "REFERRAL_CONVERTED", "AFFILIATE_CONVERSION",
    # planificación (cron)
    "DAILY_TICK", "WEEKLY_TICK", "RETENTION_SCAN",
}

class ErrorEvento(ValueError): pass

def crear(tipo, source, entity_type="", entity_id="", payload=None, metadata=None, correlation_id=None, idempotency_key=None):
    if tipo not in TIPOS: raise ErrorEvento(f"tipo de evento desconocido: {tipo}")
    if not source: raise ErrorEvento("source obligatorio")
    payload = payload or {}
    ev = {"id": N.nuevo_id(), "type": tipo, "timestamp": N.iso(), "source": source, "entity_type": entity_type, "entity_id": str(entity_id),
          "payload": payload, "metadata": metadata or {}, "correlation_id": correlation_id}
    ev["correlation_id"] = correlation_id or ev["id"]
    ev["idempotency_key"] = idempotency_key or f"{tipo}:{entity_type}:{entity_id}:{N.huella(payload)}"
    return ev

class FileStore:
    """Almacén append-only en JSONL. El índice de claves se reconstruye al abrir (miles de eventos: trivial)."""
    FICHERO = "eventos.jsonl"
    def __init__(self):
        self.claves = {e["idempotency_key"] for e in N.leer_lineas(self.FICHERO)}
    def publicar(self, ev):
        """Devuelve el evento si es nuevo, o None si ya existía (idempotencia)."""
        if ev["idempotency_key"] in self.claves: return None
        N.anadir(self.FICHERO, ev); self.claves.add(ev["idempotency_key"])
        return ev
    def desde(self, posicion):
        """Eventos a partir de la posición (cursor = nº de eventos ya procesados)."""
        todos = N.leer_lineas(self.FICHERO)
        return todos[posicion:], len(todos)

_bus = None
def bus():
    global _bus
    if _bus is None: _bus = FileStore()
    return _bus
def reset():  # tests
    global _bus; _bus = None

def publicar(tipo, source, **kw):
    return bus().publicar(crear(tipo, source, **kw))
