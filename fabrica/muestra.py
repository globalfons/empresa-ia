"""Muestra aleatoria estratificada de preguntas VALID de la fábrica para una auditoría HUMANA de calidad (solo lectura).

  python3 -m fabrica.muestra [--semilla 20261001]
  → documentacion/MUESTRA-CALIBRACION.md + fabrica/estado/muestra-calibracion.json

Cuotas por tipo; si un tipo no tiene suficientes preguntas se indica y se completa con otros tipos existentes.
No modifica ninguna pregunta.
"""
import argparse, glob, json, os, random, sys

R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, R)
from fabrica import banco as B  # noqa: E402

CUOTAS = [("literal", 10), ("aplicacion", 10), ("dificil", 10), ("negativa", 5), ("comparativa", 5), ("excepcion", 5), ("plazos", 5)]
SALIDA_MD = os.path.join(R, "documentacion", "MUESTRA-CALIBRACION.md")
SALIDA_JSON = os.path.join(R, "fabrica", "estado", "muestra-calibracion.json")


def temas():
    """(oposicion, indice) → (nombre de la oposición, número y título del tema) desde el catálogo."""
    out, nombres = {}, {}
    for o in json.load(open(os.path.join(R, "catalogo", "oposiciones.json"), encoding="utf-8")):
        nombres[o["id"]] = o.get("nombre", o["id"])
        for i, t in enumerate(o.get("temario", {}).get("temas", []) if isinstance(o.get("temario"), dict) else o.get("temario", []) or []):
            if isinstance(t, dict):
                out[(o["id"], str(i))] = (t.get("n") or t.get("tema") or i + 1, t.get("titulo") or t.get("t") or "")
    return nombres, out


def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument("--semilla", type=int, default=20261001)
    a = ap.parse_args(argv)
    rnd = random.Random(a.semilla)
    pool = []
    for f in sorted(glob.glob(os.path.join(R, "datos", "preguntas-*.json"))):
        pool += [q for q in json.load(open(f, encoding="utf-8")) if str(q.get("generador", "")).startswith("fabrica") and isinstance(q.get("traza"), dict)
                 and q.get("verification_status") in (None, "VALID")]
    por_tipo = {}
    for q in sorted(pool, key=lambda q: q["id"]):
        por_tipo.setdefault(q.get("tipo"), []).append(q)
    muestra, avisos, usados = [], [], set()
    for tipo, n in CUOTAS:
        disp = por_tipo.get(tipo, [])
        elegidas = rnd.sample(disp, min(n, len(disp)))
        if len(disp) < n:
            avisos.append(f"{tipo}: solo {len(disp)} disponibles de {n}")
        muestra += elegidas; usados.update(q["id"] for q in elegidas)
    falta = sum(n for _, n in CUOTAS) - len(muestra)
    if falta:
        resto = [q for q in sorted(pool, key=lambda q: q["id"]) if q["id"] not in usados and q.get("tipo") not in dict(CUOTAS)]
        extra = rnd.sample(resto, min(falta, len(resto)))
        muestra += extra
        avisos.append(f"completadas con {len(extra)} de otros tipos existentes: {', '.join(sorted({q['tipo'] for q in extra}))}")
    nombres, titulos = temas()
    filas = []
    for k, q in enumerate(muestra, 1):
        t = q["traza"]
        op, idx = (t.get("topic_id") or "#").split("#", 1)
        n_tema, titulo = titulos.get((op, idx), (int(idx) + 1 if idx.isdigit() else idx, ""))
        filas.append({"n": k, "id": q["id"], "oposicion": nombres.get(op, op), "tema": f"Tema {n_tema}" + (f" — {titulo}" if titulo else ""),
                      "norma": t.get("source_document"), "articulo": q["art"] + (f" (apdo. {q['apartado']})" if q.get("apartado") else ""),
                      "tipo": q.get("tipo"), "dificultad": q.get("dif"), "pregunta": q["q"], "opciones": q["o"],
                      "respuesta_correcta": f"{'ABCD'[q['a']]}) {q['o'][q['a']]}", "cita": q["cita"], "explicacion": q["exp"],
                      "veredicto_juez": t.get("judge_verdict"), "judge_policy_version": t.get("judge_policy_version"), "lote": t.get("batch_id")})
    B.escribir(SALIDA_JSON, {"semilla": a.semilla, "poblacion": len(pool), "avisos": avisos, "muestra": filas})
    L = ["# Muestra de calibración — auditoría humana de calidad", "",
         f"Muestra aleatoria estratificada de {len(filas)} preguntas VALID de la fábrica ya publicadas (población: {len(pool)}). "
         f"Semilla {a.semilla} (`python3 -m fabrica.muestra` la reproduce). Ninguna pregunta se ha modificado.", "",
         "Cuotas: " + " · ".join(f"{t} {n}" for t, n in CUOTAS) + ". " + ("Avisos: " + "; ".join(avisos) if avisos else "Todas las cuotas cubiertas."), "",
         "Para cada pregunta, la persona revisora anota: **Correcta (sí/no)** · **Única (sí/no)** · **Clara (sí/no)** · **Comentario**.", ""]
    for r in filas:
        L += [f"## {r['n']}. {r['id']} · {r['tipo']} · dificultad {r['dificultad']}", "",
              f"- **Oposición:** {r['oposicion']}", f"- **Tema:** {r['tema']}", f"- **Norma / artículo:** {r['norma']} · art. {r['articulo']}",
              f"- **Pregunta:** {r['pregunta']}"] + [f"  - {'ABCD'[i]}) {o}" for i, o in enumerate(r["opciones"])] + [
              f"- **Respuesta correcta:** {r['respuesta_correcta']}", f"- **Cita:** «{r['cita']}»", f"- **Explicación:** {r['explicacion']}",
              f"- **Veredicto del juez:** {r['veredicto_juez']} · **judge_policy_version:** {r['judge_policy_version']} · lote {r['lote']}",
              "- **Revisión humana:** Correcta ☐ sí ☐ no · Única ☐ sí ☐ no · Clara ☐ sí ☐ no · Comentario: ", ""]
    with open(SALIDA_MD, "w", encoding="utf-8") as f:
        f.write("\n".join(L) + "\n")
    print(f"Muestra: {len(filas)} preguntas de {len(pool)} · avisos: {avisos or 'ninguno'} → {os.path.relpath(SALIDA_MD, R)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
