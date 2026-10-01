"""Validación determinista de las preguntas candidatas (sin modelo). Reutiliza los controles del banco
(datos/calidad_preguntas.py: estructura, contenido, respuesta, fuente) y añade los de la fábrica.

Cada control devuelve (estado, motivo): REJECTED si incumple una regla objetiva; REVIEW_REQUIRED si necesita a una persona.
"""
import re, sys, os, statistics

R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(R, "datos"))
import calidad_preguntas as CQ  # noqa: E402
from validar_lib import norm  # noqa: E402

OFICIAL = re.compile(r"(?i)\b(examen oficial|pregunta oficial|convocatoria de 20\d\d, pregunta)")
CONFIANZA_OK = "alta"
# Campos que solo fijan el juez, la revisión humana o el banco: si el generador los trae, intenta aprobarse a sí mismo
RESERVADOS = {"verification_status", "estado", "veredicto", "respaldada", "unica", "clara", "duplicada_de", "judge_verdict",
              "judge_policy_version", "judge_reason", "validation_status", "aprobacion_humana", "revision_humana", "traza",
              "juez", "motivo", "published_at", "reviewed_at"}
ABSOLUTAS = re.compile(r"(?i)\b(solo|sólo|solamente|exclusivamente|únicamente|siempre|nunca|en ningún caso|en todo caso|todos?|ninguno)\b")


def simple(t):
    return CQ.simple(str(t))


def palabras(t):
    return set(simple(t).split())


def jaccard(a, b):
    a, b = palabras(a), palabras(b)
    return len(a & b) / len(a | b) if a and b else 0.0


def numero(n):
    """Parte numérica del artículo («78bis» → «78»): la explicación puede escribir «78 bis»."""
    m = re.match(r"\d+", n)
    return m.group() if m else n


def cita_cortada(texto, cita):
    t, c = texto, norm(cita)
    p = t.find(c)
    return p >= 0 and ((c[0].isalnum() and p > 0 and t[p - 1].isalnum()) or (c[-1].isalnum() and t[p + len(c):p + len(c) + 1].isalnum()))


def dificultad(q, cfg):
    """Dificultad por criterios verificables: la del tipo; los tipos «flexibles» admiten ±1 si el enunciado lo justifica
    (varias condiciones o una negación/excepción suben; un dato explícito aislado baja)."""
    t = cfg["tipos"][q["tipo"]]
    base = t["dif"]
    if not t["flexible"]:
        return base
    enunciado = q["q"].lower()
    condiciones = len(re.findall(r"\b(y|cuando|si|salvo|excepto|aunque|siempre que)\b", enunciado))
    if (condiciones >= 3 or re.search(r"\b(no|incorrecta|falsa|excepto|salvo)\b", enunciado)) and q.get("dif") == base + 1:
        return min(3, base + 1)
    if condiciones == 0 and q.get("dif") == base - 1:
        return max(1, base - 1)
    return base


def comprobar(q, ley, n, tema_arts, cfg):
    """Controles deterministas. Devuelve lista de (estado, motivo); vacía = sin problemas."""
    p = []
    propios = sorted(RESERVADOS & set(q))
    if propios:
        return [("REJECTED", f"separación de funciones: el generador no puede fijar estado ni veredicto ({', '.join(propios)})")]
    req = {"tipo": str, "q": str, "o": list, "a": int, "cita": str, "exp": str, "dif": int}
    for k, tipo in req.items():
        if not isinstance(q.get(k), tipo):
            return [("REJECTED", f"schema: campo {k} ausente o de tipo incorrecto")]
    if q["tipo"] not in cfg["tipos"]:
        p.append(("REJECTED", f"tipo desconocido: {q['tipo']}"))
    # Fuente: norma, artículo vigente, cita literal y entera, artículo dentro del tema
    if ley is None:
        return p + [("REJECTED", "norma inexistente")]
    if n not in ley.arts:
        return p + [("REJECTED", "artículo inexistente")]
    if not ley.vigente(n):
        p.append(("REJECTED", "artículo sin vigencia"))
    if not ley.version:
        p.append(("REJECTED", "sin versión del texto consolidado"))
    if tema_arts is not None and n not in tema_arts:
        p.append(("REJECTED", "el artículo no pertenece al ámbito del tema"))
    txt = ley.texto[n]
    if len(norm(q["cita"])) < 12:
        p.append(("REJECTED", "cita demasiado corta para justificar la respuesta"))
    # Estructura, contenido, respuesta y cita literal: los mismos controles que el banco publicado
    base = {"art": n, "q": q["q"], "o": q["o"], "a": q["a"], "cita": q["cita"], "dif": q["dif"], "exp": q["exp"]}
    for control, grav, msg in CQ.comprobar(base, {n: txt}):
        p.append(("REJECTED" if grav == "error" else "REVIEW_REQUIRED", f"{control}: {msg}"))
    if norm(q["cita"]) in txt and cita_cortada(txt, q["cita"]):
        p.append(("REJECTED", "cita cortada a media palabra"))
    # Opciones: pista por longitud, respuesta dentro del enunciado, opciones muy cortas
    if len(q["o"]) == 4 and q["a"] in range(4):
        largos = [len(str(o)) for o in q["o"]]
        otros = [x for i, x in enumerate(largos) if i != q["a"]]
        if largos[q["a"]] > 40 and largos[q["a"]] > 1.8 * max(otros):
            p.append(("REJECTED", "opciones: la correcta es mucho más larga que las demás (pista)"))
        if min(largos) * 4 < statistics.median(largos) and min(largos) < 6:
            p.append(("REJECTED", "opciones: una opción es desproporcionadamente corta"))
        corr = simple(q["o"][q["a"]])
        absolutas = [bool(ABSOLUTAS.search(str(o))) for o in q["o"]]
        if not absolutas[q["a"]] and sum(absolutas) == 3:
            p.append(("REJECTED", "opciones: solo los distractores usan términos absolutos (solo, exclusivamente, siempre…): pista"))
        if len(corr) > 12 and corr in simple(q["q"]):
            p.append(("REJECTED", "la respuesta correcta aparece literalmente en el enunciado"))
    # Explicación: justifica con la fuente y cita el artículo
    if len(q["exp"].strip()) < 40:
        p.append(("REJECTED", "explicación demasiado corta"))
    elif not re.search(r"art(\.|[ií]culo)\s*" + re.escape(numero(n)), q["exp"], re.I):
        p.append(("REJECTED", "la explicación no cita el artículo"))
    if OFICIAL.search(q["q"] + " " + q["exp"]):
        p.append(("REJECTED", "se presenta como pregunta oficial"))
    # Dificultad por criterios (la del modelo solo se acepta si es coherente con el tipo)
    if q["tipo"] in cfg["tipos"] and q["dif"] not in (1, 2, 3):
        p.append(("REJECTED", "dificultad fuera de rango"))
    # Duda declarada por el generador o tipo de alto riesgo: revisión humana
    if q.get("confianza", "baja") != CONFIANZA_OK:
        p.append(("REVIEW_REQUIRED", f"el generador declara confianza {q.get('confianza', 'no indicada')}"))
    if q["tipo"] in cfg["tipos_revision_obligatoria"]:
        p.append(("REVIEW_REQUIRED", f"tipo {q['tipo']}: revisión humana obligatoria en esta fase"))
    return p


def duplicado(q, existentes, cfg):
    """Duplicado exacto o léxico frente a las preguntas ya existentes del mismo artículo (banco, cola y lote).
    Devuelve (tipo, id) con tipo 'exacto' | 'lexico' | 'sospecha' | None. Las sospechas van al juez semántico."""
    corr = simple(q["o"][q["a"]]) if q.get("o") and q.get("a") in range(len(q["o"])) else ""
    firma = simple(q["q"]) + "|" + corr
    opciones = sorted(simple(o) for o in q.get("o", []))
    sospechosas = []
    for e in existentes:
        ecorr = simple(e["o"][e["a"]])
        if simple(e["q"]) + "|" + ecorr == firma or (simple(e["q"]) == simple(q["q"]) and sorted(simple(o) for o in e["o"]) == opciones):
            return "exacto", e.get("id"), []
        s = jaccard(e["q"], q["q"])
        if s >= cfg["similitud"]["duplicado_lexico"] and ecorr == corr:
            return "lexico", e.get("id"), []
        if s >= cfg["similitud"]["sospecha_semantica"] or (ecorr == corr and s >= cfg["similitud"]["sospecha_semantica"] / 2):
            sospechosas.append((s, e))
    sospechosas.sort(key=lambda x: -x[0])
    return (("sospecha" if sospechosas else None), None, [e for _, e in sospechosas[:5]])
