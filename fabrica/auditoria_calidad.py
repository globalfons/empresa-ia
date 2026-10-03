"""Auditoría de calidad automática de lotes publicados (independiente del juez: no lee ningún veredicto).

Para cada pregunta del lote compara, contra el banco Mossos completo (servidas, retiradas y en revisión), las preguntas de
exámenes oficiales y el resto de los lotes auditados:
  apartado de la guía (mismo apartado, «Idees força» ↔ apartados del tema, mismo tema), idea-fuerza/hecho evaluado
  (tokens de contenido de la cita frente a enunciado+respuesta+cita del otro), respuesta correcta (contención de tokens)
  y enunciado (Jaccard de tokens de contenido). Así detecta preguntas que evalúan el mismo conocimiento con otra redacción.
Además repite los controles deterministas contra el texto vigente y aplica reglas de calidad (cita que no sostiene la
respuesta, términos absolutos solo en distractores, identificación trivial de una norma, respuesta delatada por longitud).

Clasificación: KEEP · REVIEW_REQUIRED · REJECTED_DUPLICATE · REJECTED_CONTENT.
Solo REJECTED_* retira (DEPRECATED); REVIEW_REQUIRED saca la pregunta del servicio (REVIEW_REQUIRED_REEVALUATION) hasta
decisión humana. Nunca toca los campos del juez (judge_*, traza.verdict…): añade `auditoria_calidad` y el estado.

  python3 -m fabrica.auditoria_calidad auditar S00019 S00020          → fabrica/estado/auditoria-calidad.json (solo informe)
  python3 -m fabrica.auditoria_calidad aplicar S00019 S00020          → además cambia el estado de REVIEW/REJECTED
  python3 -m fabrica.auditoria_calidad candidatas <items.json>         → deduplica preguntas no publicadas (p. ej. S00018)
"""
import datetime, json, os, re, sys

R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, R)
from fabrica import banco as B, fuente as F, validacion as V  # noqa: E402

SLUG = "guia-mossos"
BANCO = f"datos/preguntas-{SLUG}.json"
OFICIALES = "datos/examens-oficials/mossos-esquadra.json"
INFORME = "fabrica/estado/auditoria-calidad.json"
VACIAS = set(("segons guia estudi quin quina quins quines quan qual com que què per amb sense dels les los una uns unes del "
              "de la el els al als a i o en es és no ni sí son són seva seu seus seves aquest aquesta aquests aquestes altre "
              "altres cada tot tots tota totes mateix mateixa pot poden han ha hi ho li lo ser fer fa fins entre sobre sota "
              "cap més menys molt només també perquè dins idees força").split())
ABSOLUTAS = re.compile(r"(?i)\b(només|solament|exclusivament|únicament|sempre|mai|en cap cas|tots|totes|cap(?!\s+(?:a|al|als|a\s+l)\b)|ningú|"
                       r"solo|sólo|solamente|exclusivamente|únicamente|siempre|nunca|en ningún caso|todos|ninguno)\b")
NORMA = re.compile(r"(?i)\b(decret|llei|ordre|resolució|decreto|ley|orden|resolución)\s+\d+/\d{4}")
PIDE_NORMA = re.compile(r"(?i)\bquin(a)?\s+(norma|decret|llei|disposició)\b")
# Umbrales (calibrados sobre el banco Mossos el 2026-10-03; ver MOSSOS_FINAL_QUALITY_AUDIT.md)
DUP_RESPUESTA, DUP_HECHO, DUP_ENUNCIADO = 0.8, 0.6, 0.3      # duplicado inequívoco: misma respuesta Y mismo hecho…
DUP2_ENUNCIADO, DUP2_HECHO, DUP2_RESPUESTA = 0.8, 0.8, 0.5    # …o mismo enunciado y hecho con la respuesta reformulada
SOSP_RESPUESTA, SOSP_HECHO = 0.5, 0.4                          # sospecha: respuesta y hecho parecidos → revisión


def tokens(t):
    return {w for w in V.simple(t).split() if (len(w) > 3 or w.isdigit()) and w not in VACIAS}


def contencion(a, b):
    return len(a & b) / min(len(a), len(b)) if a and b else 0.0


def tema(art):
    return ".".join(str(art).split(".")[:2])


def ambito(a, b):
    """Relación entre apartados: mismo apartado, Idees força ↔ apartado del tema, mismo tema, o ninguna."""
    if a == b:
        return "apartado"
    if B.afin(a, b):
        return "idees_forca"
    return "tema" if tema(a) == tema(b) else None


def comparar(t, x):
    resp_t, resp_x = tokens(t["o"][t["a"]]), tokens(x["o"][x["a"]])
    todo_x = tokens(x["q"]) | resp_x | tokens(x.get("cita", ""))
    qt, qx = tokens(t["q"]), tokens(x["q"])
    return {"respuesta": round(contencion(resp_t, resp_x), 2),
            "hecho": round(contencion(tokens(t.get("cita", "")) or qt, todo_x), 2),
            "enunciado": round(len(qt & qx) / len(qt | qx), 2) if qt and qx else 0.0,
            "ambito": ambito(t["art"], x["art"])}


def anterior(x, t, orden):
    """¿x es anterior a t? (las oficiales y el banco previo siempre lo son; dentro de los lotes, por orden de publicación)."""
    return orden.get(x["id"], -1) < orden.get(t["id"], -1)


def duplicados(t, universo, orden):
    """(inequívocos, sospechas) frente a preguntas anteriores; nunca usa veredictos del juez."""
    firmes, sosp = [], []
    for x in universo:
        if x["id"] == t["id"] or not anterior(x, t, orden):
            continue
        s = comparar(t, x)
        if not s["ambito"]:
            continue
        if (s["respuesta"] >= DUP_RESPUESTA and s["hecho"] >= DUP_HECHO and s["enunciado"] >= DUP_ENUNCIADO) or \
                (s["enunciado"] >= DUP2_ENUNCIADO and s["hecho"] >= DUP2_HECHO and s["respuesta"] >= DUP2_RESPUESTA):
            firmes.append((x, s))
        elif s["respuesta"] >= SOSP_RESPUESTA and s["hecho"] >= SOSP_HECHO:
            sosp.append((x, s))
    return firmes, sosp


def calidad(q, ley, cfg):
    """Problemas de contenido: (gravedad, motivo). REJECTED = falla un control determinista contra el texto vigente."""
    p = [("REJECTED_CONTENT", m) for e, m in V.comprobar(dict({k: q[k] for k in ("tipo", "q", "o", "a", "cita", "exp", "dif", "apartado") if k in q},
                                                               confianza="alta"), ley, q["art"], None, cfg) if e == "REJECTED"]
    cita, ops, corr = tokens(q["cita"]), q["o"], q["o"][q["a"]]
    if q.get("tipo") == "negativa":
        fuera = [o for i, o in enumerate(ops) if i != q["a"] and contencion(tokens(o), cita) < 0.5]
        if fuera:
            p.append(("REVIEW_REQUIRED", f"negativa: la cita no muestra que figuren {len(fuera)} de las otras opciones"))
    elif contencion(tokens(corr), cita | tokens(q["q"])) < 0.5:
        p.append(("REVIEW_REQUIRED", "la cita no contiene los elementos de la respuesta correcta"))
    absol = [bool(ABSOLUTAS.search(o)) for o in ops]
    if not absol[q["a"]] and any(absol) and len(corr) >= max(len(o) for o in ops):
        p.append(("REVIEW_REQUIRED", "calidad de distractores: los términos absolutos solo aparecen en distractores y la correcta es la más larga"))
    if PIDE_NORMA.search(q["q"]) and NORMA.search(corr):
        p.append(("REVIEW_REQUIRED", "trivialidad límite: solo pide identificar una norma por su número y fecha"))
    largo = max(len(o) for i, o in enumerate(ops) if i != q["a"])
    if len(corr) > 1.8 * largo:
        p.append(("REVIEW_REQUIRED", "la respuesta correcta es mucho más larga que los distractores (pista)"))
    return p


def cargar(raiz=R):
    banco = json.load(open(os.path.join(raiz, BANCO), encoding="utf-8"))
    of = os.path.join(raiz, OFICIALES)
    oficiales = [dict(id=q["id"], art=q.get("apartat_guia") or "", q=q["q"], o=q["o"], a=q["a"], cita="", procedencia="OFFICIAL_EXAM")
                 for e in (json.load(open(of, encoding="utf-8"))["examenes"] if os.path.exists(of) else []) for q in e["preguntes"]]
    return banco, oficiales


def numero(id_):
    m = re.search(r"(\d+)$", id_)
    return int(m.group(1)) if m else -1


def auditar(lotes, raiz=R):
    banco, oficiales = cargar(raiz)
    ley = F.Fuentes().ley(SLUG)
    cfg = json.load(open(os.path.join(raiz, "fabrica", "config.json"), encoding="utf-8"))
    orden = {q["id"]: -1 for q in oficiales}
    orden.update({q["id"]: numero(q["id"]) for q in banco})
    universo = banco + oficiales
    res = []
    for t in [q for q in banco if q.get("lote") in lotes]:
        firmes, sosp = duplicados(t, universo, orden)
        prob = calidad(t, ley, cfg)
        if any(g == "REJECTED_CONTENT" for g, _ in prob):
            clase = "REJECTED_CONTENT"
        elif firmes:
            clase = "REJECTED_DUPLICATE"
        elif sosp or prob:
            clase = "REVIEW_REQUIRED"
        else:
            clase = "KEEP"
        x, s = firmes[0] if firmes else (None, None)
        res.append({"question_id": t["id"], "lote": t["lote"], "art": t["art"], "clasificacion": clase,
                    "estado_actual": t.get("verification_status") or "VALID",
                    "duplicate_id": x["id"] if x else None, "similitud": s,
                    "hecho_comun": (x.get("cita") or x["o"][x["a"]]) if x else None,
                    "sospechas": [{"id": y["id"], **ss} for y, ss in sosp],
                    "motivos": [m for _, m in prob]})
    return res


ESTADO = {"REVIEW_REQUIRED": "REVIEW_REQUIRED_REEVALUATION", "REJECTED_DUPLICATE": "DEPRECATED", "REJECTED_CONTENT": "DEPRECATED"}


def aplicar(res, autorizado_por, raiz=R):
    """Cambia SOLO el estado de servicio; los campos del juez quedan intactos. Devuelve {id: estado nuevo}."""
    ruta = os.path.join(raiz, BANCO)
    banco = json.load(open(ruta, encoding="utf-8"))
    por_id = {q["id"]: q for q in banco}
    hoy = datetime.date.today().isoformat()
    cambios = {}
    for r in res:
        nuevo = ESTADO.get(r["clasificacion"])
        q = por_id[r["question_id"]]
        if not nuevo:
            continue
        if (q.get("auditoria_calidad") or {}).get("clasificacion") == r["clasificacion"]:  # idempotente: ya aplicada
            cambios[q["id"]] = q.get("verification_status")
            continue
        if q.get("verification_status") in ("DEPRECATED", "OUTDATED"):
            continue
        motivo = (f"duplicado de {r['duplicate_id']}" if r["clasificacion"] == "REJECTED_DUPLICATE" else "; ".join(r["motivos"]))
        q["auditoria_calidad"] = {"fecha": hoy, "clasificacion": r["clasificacion"], "motivo": motivo, "duplicate_id": r["duplicate_id"],
                                  "estado_anterior": q.get("verification_status") or "VALID", "autorizado_por": autorizado_por,
                                  "independiente_del_juez": True}
        q.update(verification_status=nuevo, estado_desde=hoy, motivo=f"Auditoría de calidad: {motivo}")
        cambios[q["id"]] = nuevo
    with open(ruta, "w", encoding="utf-8") as f:
        f.write(json.dumps(banco, ensure_ascii=False, indent=1) + "\n")
    return cambios


def candidatas(items, raiz=R):
    """Deduplica preguntas NO publicadas (items con question_id, art, q, o, a, cita) contra el banco SERVIDO y las oficiales,
    y entre ellas (en su orden). No publica ni cambia nada."""
    banco, oficiales = cargar(raiz)
    servidas = [q for q in banco if q.get("verification_status") not in B.RETIRADAS | {"REVIEW_REQUIRED_REEVALUATION", "REVIEW_REQUIRED"}]
    previas = []
    out = []
    for i, it in enumerate(items):
        t = dict(it, id=it["question_id"])
        orden = {x["id"]: -1 for x in servidas + oficiales + previas}
        orden[t["id"]] = 0
        firmes, sosp = duplicados(t, servidas + oficiales + previas, orden)
        out.append({"question_id": t["id"], "art": t["art"], "duplicado_de": [x["id"] for x, _ in firmes],
                    "sospechas": [x["id"] for x, _ in sosp], "similitud": [s for _, s in firmes + sosp]})
        previas.append(t)
    return out


def main(argv=None):
    a = argv or sys.argv[1:]
    if not a or a[0] not in ("auditar", "aplicar", "candidatas"):
        raise SystemExit(__doc__)
    if a[0] == "candidatas":
        out = candidatas(json.load(open(a[1], encoding="utf-8")))
        print(json.dumps(out, ensure_ascii=False, indent=1))
        return out
    res = auditar(a[1:])
    informe = {"fecha": datetime.datetime.now().isoformat(timespec="seconds"), "lotes": a[1:], "independiente_del_juez": True,
               "umbrales": {"duplicado": [DUP_RESPUESTA, DUP_HECHO, DUP_ENUNCIADO], "duplicado_reformulado": [DUP2_ENUNCIADO, DUP2_HECHO, DUP2_RESPUESTA], "sospecha": [SOSP_RESPUESTA, SOSP_HECHO]},
               "resultado": res}
    if a[0] == "aplicar":
        informe["cambios"] = aplicar(res, "propietario de TestLey (instrucción del 2026-10-03: retirar duplicados inequívocos)")
    with open(os.path.join(R, INFORME), "w", encoding="utf-8") as f:
        f.write(json.dumps(informe, ensure_ascii=False, indent=1) + "\n")
    for r in res:
        print(f"{r['question_id']:16}{r['clasificacion']:20}{r['duplicate_id'] or ''} {'; '.join(r['motivos'])[:110]}")
    return informe


if __name__ == "__main__":
    main()
