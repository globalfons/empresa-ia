"""Juez simulado para los tests del circuito de sesión con juez-sesion-v2: por cada tanda escribe la transcripción de un juez
que solo LEE su tanda y devuelve un veredicto por pregunta, y la registra con `python3 -m fabrica.juez_v2 registrar` (en la copia)."""
import json, os, subprocess, sys


def aprobar_todo(t, lote, **extra):
    """Veredicto VALID con razón propia para cada pregunta; `extra` añade campos ajenos (la tanda debe rechazarse)."""
    d = os.path.join(t, "fabrica", "sesion", "evaluaciones", lote)
    ev = json.load(open(os.path.join(d, "evaluacion.json")))
    salidas = []
    for tanda in ev["tandas"]:
        fichero = tanda["fichero"]
        with open(fichero, encoding="utf-8") as fh:
            items = json.load(fh)["items"]
        resp = [dict({"question_id": i["question_id"], "verdict": "VALID",
                      "reason": f"La cita del artículo {i['art']} respalda la opción marcada en «{i['q'][:60]}»; las demás opciones no constan.",
                      "criteria_checked": {"respaldada": True, "unica": True, "clara": True, "duplicada_de": ""}}, **extra) for i in items]
        tr = os.path.join(d, f"transcripcion-{tanda['tanda']}.jsonl")
        with open(tr, "w", encoding="utf-8") as f:
            for c in ({"type": "tool_use", "name": "Read", "input": {"file_path": fichero}},
                      {"type": "tool_use", "name": "SubagentHandback", "input": {"message": json.dumps(resp, ensure_ascii=False)}}):
                f.write(json.dumps({"type": "assistant", "message": {"role": "assistant", "content": [c]}}) + "\n")
        salidas.append(subprocess.run([sys.executable, "-m", "fabrica.juez_v2", "registrar", lote, tanda["tanda"], tr], cwd=t,
                                      capture_output=True, text=True))
    return salidas
