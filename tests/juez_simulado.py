"""Juez simulado para los tests del circuito de sesión con el juez de sesión (v2/v3): por cada tanda escribe la transcripción de un juez
que solo LEE su tanda y devuelve un veredicto por pregunta, y la registra con `python3 -m fabrica.juez_v2 registrar` (en la copia)."""
import json, os, subprocess, sys


def aprobar_todo(t, lote, **extra):
    """Veredicto VALID con razón propia para cada pregunta; `extra` añade campos ajenos (la tanda debe rechazarse)."""
    d = os.path.join(t, "fabrica", "sesion", "evaluaciones", lote)
    ev = json.load(open(os.path.join(d, "evaluacion.json")))
    sys.path.insert(0, t)
    from fabrica import juez_v2 as J, politica as P  # criterios de la política de la evaluación (v3: cita_suficiente)
    e = J.espec(P.cargar(ev["judge_policy_version"], t))
    criterios = dict({k: True for k in e["booleanos"]}, **{e["duplicado"]: ""})
    salidas = []
    for tanda in ev["tandas"]:
        fichero = tanda["fichero"]
        with open(fichero, encoding="utf-8") as fh:
            items = json.load(fh)["items"]
        resp = [dict({"question_id": i["question_id"], "verdict": "VALID",
                      "reason": f"La cita del artículo {i['art']} respalda la opción marcada en «{i['q'][:60]}»; las demás opciones no constan.",
                      "criteria_checked": dict(criterios)}, **extra) for i in items]
        tr = os.path.join(d, f"transcripcion-{tanda['tanda']}.jsonl")
        with open(tr, "w", encoding="utf-8") as f:
            for c in ({"type": "tool_use", "name": "Read", "input": {"file_path": fichero}},
                      {"type": "tool_use", "name": "SubagentHandback", "input": {"message": json.dumps(resp, ensure_ascii=False)}}):
                f.write(json.dumps({"type": "assistant", "message": {"role": "assistant", "content": [c]}}) + "\n")
        salidas.append(subprocess.run([sys.executable, "-m", "fabrica.juez_v2", "registrar", lote, tanda["tanda"], tr], cwd=t,
                                      capture_output=True, text=True))
    return salidas


def evaluar(preguntas, tmp, nombre="EV-TEST", veredicto="VALID", raiz=None):
    """Evaluación REAL con el mecanismo del juez (política activa) para fixtures: prepara las tandas en `tmp`, escribe la
    transcripción de un juez que solo lee su tanda, la registra con los guards y la archiva. preguntas: dicts con q, o, a, cita,
    art y question_id. Devuelve (archivo, traza_base) para construir la traza de la pregunta publicada."""
    from unittest import mock
    from fabrica import juez_v2 as J, politica as P
    trabajo, archivo = os.path.join(tmp, "trabajo"), os.path.join(tmp, "archivo")
    e = J.espec(P.cargar())
    crit = dict({k: True for k in e["booleanos"]}, **{e["duplicado"]: ""})
    items = [dict({"norma": "N", "texto": p.get("cita", ""), "parecidas": []}, **p) for p in preguntas]
    with mock.patch.object(J, "TRABAJO", trabajo), mock.patch.object(P, "incidencia"):
        tandas = J.preparar(nombre, items, version=P.registro()["activa"], sesion="sesion-test")
        for t in tandas:
            resp = [{"question_id": i, "verdict": veredicto, "criteria_checked": dict(crit, **({} if veredicto == "VALID" else {"clara": False})),
                     "reason": f"Comprobada la pregunta {i} contra la cita literal: «{next(p['q'] for p in preguntas if p['question_id'] == i)[:50]}»."}
                    for i in t["ids"]]
            tr = os.path.join(tmp, f"tr-{t['tanda']}.jsonl")
            with open(tr, "w", encoding="utf-8") as f:
                for c in ({"type": "tool_use", "name": "Read", "input": {"file_path": t["fichero"]}},
                          {"type": "tool_use", "name": "SubagentHandback", "input": {"message": json.dumps(resp, ensure_ascii=False)}}):
                    f.write(json.dumps({"type": "assistant", "message": {"role": "assistant", "content": [c]}}) + "\n")
            J.registrar(nombre, t["tanda"], tr)
        J.archivar(nombre, destino=archivo)
        ev = J.leer(os.path.join(trabajo, nombre, "evaluacion.json"))
    pol = P.cargar()
    base = {"judge_model": "claude-haiku-4-5", "judge_policy_version": pol["version"], "judge_policy_sha256": pol["sha256"],
            "judge_evaluation": nombre, "judge_session_id": "sesion-test", "judged_at": ev["tandas"][0].get("registrada_el"),
            "judge_prompt_sha256": ev["tandas"][0]["prompt_sha256"], "judge_verdict": veredicto, "validation_status": veredicto}
    return archivo, base
