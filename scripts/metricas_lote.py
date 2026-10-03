"""Métricas de calidad de un lote de la fábrica (generación controlada, Mossos 360): las calcula de los datos, no se escriben a mano.
generated · validated · judge_valid · review_required · rejected · published · duplicate · citation_errors · source_errors · security_incidents
y validation_rate · publication_rate · review_rate · reject_rate · duplicate_rate. Marca ANOMALIA y deja la fábrica en GENERATION_PAUSED (estado.json) si:
publicación con incidentes de seguridad, hallazgos CRITICAL/MAJOR de la auditoría (fabrica/estado/auditoria-lotes.json; sus duplicados cuentan en duplicate), errores de cita o de fuente, duplicados > 20 %, rechazo > 30 %, o revisión > 45 %.
Uso: python3 scripts/metricas_lote.py S00019 [--planificadas N]   → fabrica/estado/metricas-lotes.json"""
import collections, glob, json, os, sys

R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


PROCESO = {"deduplicacion_incompleta"}  # defectos del circuito (no de seguridad): también pausan


def leer(p, d=None):
    p = os.path.join(R, p)
    return json.load(open(p, encoding="utf-8")) if os.path.exists(p) else d


def calcular(lote, planificadas=None):
    reg = next((x for x in leer("fabrica/estado/estado.json", {}).get("lotes", []) if x["id"] == lote), None)
    if not reg:
        raise SystemExit(f"{lote} no está cerrado en fabrica/estado/estado.json")
    val = leer(f"fabrica/estado/archivo/{lote}/validacion.json", [])
    rech_det = collections.Counter()
    for v in val:
        for i, (q, probs, dup) in enumerate(v["res"]):
            if i not in v["idx"]:
                for e, m in probs:
                    rech_det["cita" if "cita" in m.lower() else "fuente" if "fuente" in m.lower() or "artículo" in m.lower() else "otros"] += 1
    banco = [q for f in glob.glob(os.path.join(R, "datos", "preguntas-*.json")) for q in json.load(open(f, encoding="utf-8")) if q.get("lote") == lote]
    cola = [q for f in glob.glob(os.path.join(R, "datos", "candidatas", "*.json")) for q in json.load(open(f, encoding="utf-8")) if q.get("lote") == lote]
    publicadas = [q for q in banco if q.get("verification_status") in (None, "VALID")]
    aud = [x for x in leer("fabrica/estado/auditoria-lotes.json", []) if x.get("lote") == lote]
    todas = [x for x in leer("fabrica/estado/incidencias-politica.json", []) if x.get("lote") == lote and x.get("tipo") != "guard_falso_positivo"]
    proceso = [x for x in todas if x.get("tipo") in PROCESO]
    inc = [x for x in todas if x.get("tipo") not in PROCESO]
    gen = reg["generadas"]
    m = {"lote": lote, "fecha": reg["fecha"], "planificadas": planificadas, "generated": gen,
         "validated": gen - sum(1 for v in val for i in range(len(v["res"])) if i not in v["idx"]),
         "judge_valid": reg["VALID"], "review_required": reg["REVIEW_REQUIRED"], "rejected": reg["REJECTED"], "published": len(publicadas),
         "duplicate": reg["duplicadas"] + sum(1 for x in aud if x["tipo"] == "duplicado"), "citation_errors": rech_det["cita"], "source_errors": rech_det["fuente"], "security_incidents": len(inc), "process_incidents": len(proceso),
         "audit_findings": {g: sum(1 for x in aud if x["gravedad"] == g) for g in ("CRITICAL", "MAJOR", "MINOR")},
         "en_cola_revision": len(cola), "judge_policy_version": reg.get("judge_policy_version")}
    pct = lambda a, b: round(100 * a / b, 1) if b else 0.0
    m.update(validation_rate=pct(m["validated"], gen), publication_rate=pct(m["published"], gen), review_rate=pct(m["review_required"], gen),
             reject_rate=pct(m["rejected"], gen), duplicate_rate=pct(m["duplicate"], gen))
    motivos = []
    if m["security_incidents"]:
        motivos.append("incidentes de seguridad")
    if m["process_incidents"]:
        motivos.append("defecto del circuito detectado en el lote (corregido; se revisa antes de la siguiente tanda)")
    if m["published"] and (m["citation_errors"] or m["source_errors"]):
        motivos.append("errores de cita o de fuente en un lote con publicadas")
    if m["audit_findings"]["CRITICAL"] or m["audit_findings"]["MAJOR"]:
        motivos.append("la auditoría encuentra errores CRITICAL/MAJOR que el juez aprobó")
    if m["duplicate_rate"] > 20:
        motivos.append("duplicados > 20 %")
    if m["reject_rate"] > 30:
        motivos.append("rechazo > 30 %")
    if m["review_rate"] > 45:
        motivos.append("revisión > 45 %")
    m["anomalia"] = motivos or None
    m["decision"] = "PAUSE_GENERATION" if motivos else "OK_SIGUIENTE_TANDA"
    return m


if __name__ == "__main__":
    lote = sys.argv[1]
    plan = int(sys.argv[sys.argv.index("--planificadas") + 1]) if "--planificadas" in sys.argv else None
    m = calcular(lote, plan)
    todos = [x for x in leer("fabrica/estado/metricas-lotes.json", []) if x["lote"] != lote] + [m]
    with open(os.path.join(R, "fabrica", "estado", "metricas-lotes.json"), "w", encoding="utf-8") as f:
        f.write(json.dumps(todos, ensure_ascii=False, indent=1) + "\n")
    if m["decision"] == "PAUSE_GENERATION":  # la pausa es real: fabrica.sesion plan no arranca sin --reanudar
        ruta = os.path.join(R, "fabrica", "estado", "estado.json")
        est = leer("fabrica/estado/estado.json", {})
        if not est.get("pausa"):
            est["pausa"] = {"estado": "GENERATION_PAUSED", "motivo": f"Métricas del lote {lote}: " + "; ".join(m["anomalia"]) +
                            ". Revisar fabrica/estado/metricas-lotes.json y auditoria-lotes.json antes de reanudar (--reanudar).", "lote": lote, "fecha": m["fecha"][:10]}
            with open(ruta, "w", encoding="utf-8") as f:
                f.write(json.dumps(est, ensure_ascii=False, indent=1) + "\n")
    print(json.dumps(m, ensure_ascii=False))
