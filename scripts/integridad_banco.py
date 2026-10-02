"""Comprobaciones de integridad del banco y de lo que se sirve en la web (solo lectura).
  python3 scripts/integridad_banco.py  → resumen y código de salida ≠ 0 si algo falla."""
import collections, glob, json, os, re, sys, unicodedata
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NO_SERVIR = {"REVIEW_REQUIRED", "REJECTED", "DEPRECATED", "OUTDATED", "REVIEW_REQUIRED_REEVALUATION"}
TRAZA = ("batch_id", "judge_policy_version", "judge_verdict", "validation_status", "source_document", "source_version", "generator_model")


def norm(t):
    t = unicodedata.normalize("NFKD", (t or "").lower())
    return re.sub(r"\W+", " ", "".join(c for c in t if not unicodedata.combining(c))).strip()


def trazabilidad_v3(banco, raiz=R, archivo=None):
    """Ninguna pregunta entra en producción sin el juez: toda pregunta servida que no estaba en el banco al activar
    juez-sesion-v3 (fabrica/estado/banco-pre-v3.json) necesita su evaluación archivada (veredicto recalculado VALID y pregunta
    idéntica a la juzgada) o una aprobación humana; y toda republicación tras una reevaluación v3, la suya."""
    sys.path.insert(0, raiz)
    from fabrica import juez_v2 as J
    previas = set(json.load(open(os.path.join(raiz, "fabrica", "estado", "banco-pre-v3.json"), encoding="utf-8"))["ids"])
    archivo = archivo or os.path.join(raiz, "fabrica", "estado", "archivo", "evaluaciones")
    out = []
    for f, q in banco:
        if q.get("verification_status") in NO_SERVIR or (q.get("aprobacion_humana") or {}).get("decision") == "aprobar":
            continue
        ree = (q.get("reevaluaciones") or [{}])[-1]
        if ree.get("policy_version") == "juez-sesion-v3":
            m = J.veredicto_archivado(ree.get("evaluacion"), q["id"], q, archivo, raiz)
        elif q["id"] not in previas:
            t = q.get("traza") or {}
            m = J.veredicto_archivado(t.get("judge_evaluation"), t.get("judge_question_id"), q, archivo, raiz) if t.get("judge_evaluation") \
                else ["sin evaluación archivada del juez ni aprobación humana"]
        else:
            continue
        out += [f"{f}: {q['id']} servida sin veredicto trazable: {x}" for x in m]
    return out


def main():
    fallos, avisos, banco = [], [], []
    for f in sorted(glob.glob(os.path.join(R, "datos", "preguntas-*.json"))):
        for q in json.load(open(f, encoding="utf-8")):
            banco.append((os.path.basename(f), q))
    ids = collections.Counter(q["id"] for _, q in banco)
    fallos += [f"ID duplicado en el banco: {i} ×{n}" for i, n in ids.items() if n > 1]
    ex = [q for f in glob.glob(os.path.join(R, "datos", "examens-oficials", "*.json")) for e in json.load(open(f))["examenes"] for q in e["preguntes"]]
    fallos += [f"ID oficial repetido en el banco: {q['id']}" for q in ex if q["id"] in ids]
    fallos += [f"pregunta oficial sin procedencia OFFICIAL_EXAM: {q['id']}" for q in ex if q.get("procedencia") != "OFFICIAL_EXAM"]
    fallos += [f"{f}: {q['id']} con procedencia OFFICIAL_EXAM en el banco generado" for f, q in banco if q.get("procedencia") == "OFFICIAL_EXAM"]
    vivos = [(f, q) for f, q in banco if q.get("verification_status") not in NO_SERVIR]
    textos = collections.defaultdict(list)
    for f, q in vivos:
        textos[(norm(q["q"]), norm(q["o"][q["a"]]))].append(q["id"])
    dup_txt = {k: v for k, v in textos.items() if len(v) > 1}
    avisos += [f"texto y respuesta idénticos: {v}" for v in dup_txt.values()]
    fab = [(f, q) for f, q in banco if str(q.get("generador", "")).startswith("fabrica")]
    for f, q in fab:
        t = q.get("traza")
        if t is None:
            avisos.append(f"fábrica sin traza (lote anterior a la traza): {q['id']}")
        elif any(k not in t for k in TRAZA):
            fallos.append(f"traza incompleta: {q['id']} falta {[k for k in TRAZA if k not in t]}")
        if "legacy_verdict" in q and not all(k in q for k in ("legacy_policy_version", "legacy_judge", "legacy_batch")):
            fallos.append(f"histórico legacy_* incompleto: {q['id']}")
    servidas = 0
    for f in glob.glob(os.path.join(R, "docs", "datos", "*.json")):
        d = json.load(open(f, encoding="utf-8"))
        if not isinstance(d, dict) or not isinstance(d.get("qs"), list):
            continue
        examen = os.path.basename(f).startswith("examen-")
        for q in d["qs"]:
            servidas += 1
            if not examen and q.get("verification_status") in NO_SERVIR:
                fallos.append(f"servida con {q.get('verification_status')}: {q.get('id')} en {os.path.basename(f)}")
            if examen and q.get("procedencia") != "OFFICIAL_EXAM":
                fallos.append(f"pregunta no oficial en un examen oficial: {q.get('id')} ({os.path.basename(f)})")
            if not examen and q.get("procedencia") == "OFFICIAL_EXAM":
                fallos.append(f"pregunta oficial mezclada en {os.path.basename(f)}: {q.get('id')}")
    fallos += trazabilidad_v3(banco)
    cola = [q for f in glob.glob(os.path.join(R, "datos", "candidatas", "*.json")) for q in json.load(open(f))]
    est = collections.Counter(q.get("verification_status", "VALID") for _, q in banco)
    print(f"banco: {len(banco)} preguntas {dict(est)} · cola: {len(cola)} {dict(collections.Counter(q.get('verification_status') for q in cola))}")
    print(f"oficiales: {len(ex)} · servidas (docs/datos, con repeticiones entre oposiciones): {servidas} · fábrica: {len(fab)}")
    print(f"IDs duplicados: {sum(1 for n in ids.values() if n > 1)} · textos duplicados (pregunta+respuesta): {len(dup_txt)}")
    for a in avisos[:15]:
        print("AVISO", a)
    if len(avisos) > 15:
        print(f"AVISO … y {len(avisos) - 15} más")
    for x in fallos:
        print("FALLO", x)
    print("OK" if not fallos else f"{len(fallos)} FALLOS")
    return 1 if fallos else 0


if __name__ == "__main__":
    sys.exit(main())
