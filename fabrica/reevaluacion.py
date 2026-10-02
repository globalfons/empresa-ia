"""Reevaluación con el juez vigente (juez-sesion-v2/v3) de preguntas YA PUBLICADAS (p. ej. el lote S00017), sin borrar nada ni tocar su historia.

  1) marcar <lote>: cada pregunta del lote conserva su veredicto histórico (legacy_*), pasa a current_status PUBLISHED_LEGACY
     y a verification_status REVIEW_REQUIRED_REEVALUATION: deja de servirse a los usuarios (build.mjs) pero mantiene su id,
     así que el progreso de los usuarios no se rompe.
  2) El juez v2 evalúa las preguntas (fabrica/juez_v2.py, evaluación «<lote>-v2»).
  3) aplicar <lote> <evaluacion>: se AÑADE el nuevo veredicto (reevaluation_*; el histórico no se sobrescribe):
       VALID → vuelve a publicarse · REVIEW_REQUIRED → cola humana (no se sirve) · REJECTED → retirada (DEPRECATED, no se sirve).
     Solo con la evaluación completa y aceptada por los guards; si no, no cambia nada.
El texto de la pregunta, sus opciones, su respuesta y su id nunca se modifican.
"""
import datetime, glob, json, os, sys

R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, R)
from fabrica import juez_v2 as J, banco as B  # noqa: E402

EN_REEVALUACION = "REVIEW_REQUIRED_REEVALUATION"
DESTINO = {"VALID": None, "REVIEW_REQUIRED": EN_REEVALUACION, "REJECTED": "DEPRECATED"}
INMUTABLES = ("id", "q", "o", "a", "cita", "art", "exp", "lote", "traza", "legacy_verdict", "legacy_policy_version", "legacy_judge", "legacy_batch")


def ficheros(raiz=R):
    return sorted(glob.glob(os.path.join(raiz, "datos", "preguntas-*.json")))


def _leer(f):
    raw = open(f, encoding="utf-8").read()
    return json.loads(raw), (None if raw.startswith("[\n{") else 1)


def _escribir(f, qs, sangria):
    with open(f, "w", encoding="utf-8") as fh:
        fh.write(json.dumps(qs, ensure_ascii=False, indent=sangria) + "\n")


def marcar(lote, raiz=R):
    n = 0
    for f in ficheros(raiz):
        qs, sangria = _leer(f)
        cambio = False
        for q in qs:
            if q.get("lote") != lote or "legacy_verdict" in q:
                continue
            t = q.get("traza") or {}
            q.update(current_status="PUBLISHED_LEGACY", legacy_verdict=t.get("judge_verdict") or q.get("verification_status") or "VALID",
                     legacy_flags=t.get("judge_flags"), legacy_reason=t.get("judge_reason", ""),
                     legacy_policy_version=t.get("judge_policy_version"), legacy_judge=t.get("judge_model") or q.get("juez"),
                     legacy_batch=lote, verification_status=EN_REEVALUACION,
                     motivo=f"reevaluación con el juez vigente (incidencia del juez v1 en {lote})",
                     estado_desde=datetime.date.today().isoformat())
            n += 1; cambio = True
        if cambio:
            _escribir(f, qs, sangria)
    return n


def aplicar(lote, evaluacion, raiz=R, res=None, publicar_nuevas=False):
    """publicar_nuevas=False (por defecto): un VALID solo mantiene servida una pregunta que ya lo estaba; una que no se servía se
    queda sin publicar, con el veredicto registrado, hasta autorización explícita (nunca se publica nada automáticamente)."""
    res = res or J.resultado(evaluacion)
    if res is None:
        raise SystemExit(f"La evaluación {evaluacion} no está completa y aceptada: no se cambia ninguna pregunta.")
    por = {v["question_id"]: v for v in res["veredictos"]}
    hechas, cuenta = set(), {"VALID": 0, "REVIEW_REQUIRED": 0, "REJECTED": 0}
    ahora = datetime.datetime.now().isoformat(timespec="seconds")
    banco = None
    for f in ficheros(raiz):
        qs, sangria = _leer(f)
        cambio = False
        for q in qs:
            v = por.get(q.get("id"))
            if not v or q.get("legacy_batch") != lote:
                continue
            antes = {k: q.get(k) for k in INMUTABLES}
            # servida ahora, o publicada antes y retirada solo para esta reevaluación (marcar → PUBLISHED_LEGACY): puede volver
            servida = q.get("verification_status") not in (EN_REEVALUACION, "REVIEW_REQUIRED", "DEPRECATED", "OUTDATED", "REJECTED") \
                or q.get("current_status") == "PUBLISHED_LEGACY"
            q.setdefault("reevaluaciones", []).append({"verdict": v["verdict"], "reason": v["reason"], "criteria_checked": v["criteria_checked"],
                                                     "policy_version": res["judge_policy_version"], "policy_hash": res["policy_hash"],
                                                     "evaluacion": evaluacion, "at": ahora})
            q.update(reevaluation_verdict=v["verdict"], reevaluation_reason=v["reason"], reevaluation_policy_version=res["judge_policy_version"],
                     reevaluation_judge=f"claude-haiku-4-5 (subagente de la sesión, {res['judge_policy_version']})", reevaluation_at=ahora, estado_desde=ahora[:10])
            destino = DESTINO[v["verdict"]]
            if destino is None and not servida and not publicar_nuevas:
                q.update(motivo=f"{res['judge_policy_version']}: VALID; sin publicar hasta autorización explícita", estado_desde=ahora[:10])
                assert {k: q.get(k) for k in INMUTABLES} == antes
                hechas.add(q["id"]); cuenta["VALID"] += 1; cambio = True
                continue
            if destino is None:  # vuelve a publicarse solo si pasa la puerta de publicación del banco
                if banco is None:
                    banco = B.Banco(raiz)
                slug = os.path.basename(f)[len("preguntas-"):-len(".json")]
                banco.qs[slug] = qs; banco.cola.setdefault(slug, B.leer(banco._fc(slug), []))
                motivos = banco.verificar_publicacion(slug, dict(q, verification_status=None), republicar=True)
                if motivos:
                    destino = EN_REEVALUACION
                    q.update(verification_status=destino, current_status="HUMAN_REVIEW_QUEUE",
                             motivo="puerta de publicación: " + " · ".join(motivos)[:300])
                    hechas.add(q["id"]); cuenta["VALID"] += 1; cambio = True
                    continue
            if destino is None:
                q.pop("verification_status", None); q.pop("motivo", None); q["current_status"] = "PUBLISHED"
            else:
                q["verification_status"] = destino
                q["current_status"] = "HUMAN_REVIEW_QUEUE" if v["verdict"] == "REVIEW_REQUIRED" else "WITHDRAWN"
                q["motivo"] = f"{res['judge_policy_version']}: {v['reason'][:200]}"
            assert {k: q.get(k) for k in INMUTABLES} == antes, "la reevaluación no puede tocar la pregunta ni su historia"
            hechas.add(q["id"]); cuenta[v["verdict"]] += 1; cambio = True
        if cambio:
            _escribir(f, qs, sangria)
    faltan = set(por) - hechas
    if faltan:
        raise SystemExit(f"Veredictos sin pregunta del lote {lote}: {sorted(faltan)[:5]}")
    return cuenta


if __name__ == "__main__":
    a = sys.argv[1:]
    if a[0] == "marcar":
        print(f"{a[1]}: {marcar(a[1])} preguntas en {EN_REEVALUACION}")
    elif a[0] == "aplicar":
        print(aplicar(a[1], a[2]))
