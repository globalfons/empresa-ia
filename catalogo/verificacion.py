"""Estados de verificación comunes (ver catalogo/estados_verificacion.json) y reglas para asignarlos."""
import json, os

ESTADOS = {k: v for k, v in json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "estados_verificacion.json"))).items() if not k.startswith("_")}
OFFICIAL_VERIFIED, OFFICIAL_PENDING_REVIEW, SOURCE_TEMPORARILY_UNAVAILABLE = "OFFICIAL_VERIFIED", "OFFICIAL_PENDING_REVIEW", "SOURCE_TEMPORARILY_UNAVAILABLE"
AI_GENERATED, AI_GENERATED_REVIEW_REQUIRED, DEPRECATED = "AI_GENERATED", "AI_GENERATED_REVIEW_REQUIRED", "DEPRECATED"
# De más fiable a menos: el estado de un registro es el peor de sus datos.
ORDEN = [OFFICIAL_VERIFIED, OFFICIAL_PENDING_REVIEW, SOURCE_TEMPORARILY_UNAVAILABLE, AI_GENERATED_REVIEW_REQUIRED, AI_GENERATED, DEPRECATED]

def de_dato(metodo, revision="automatica"):
    """Estado de un dato extraído: revisado a mano → verificado; reglas → pendiente de revisión; IA → requiere revisión."""
    if revision == "manual": return OFFICIAL_VERIFIED
    return AI_GENERATED_REVIEW_REQUIRED if metodo == "claude" else OFFICIAL_PENDING_REVIEW

def de_registro(estados):
    """El registro hereda el estado menos fiable de sus datos (sin datos: pendiente de revisión)."""
    estados = [e for e in estados if e in ORDEN]
    return max(estados, key=ORDEN.index) if estados else OFFICIAL_PENDING_REVIEW

def con_fuente(estado, estado_fuente):
    """Si la fuente está caída, el dato se conserva pero se marca como no disponible temporalmente."""
    if estado_fuente in ("error", "inaccesible") and estado in (OFFICIAL_VERIFIED, OFFICIAL_PENDING_REVIEW):
        return SOURCE_TEMPORARILY_UNAVAILABLE
    return estado
