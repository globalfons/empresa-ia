"""Revisión humana de la cola (datos/candidatas/): la ÚNICA vía para que una REVIEW_REQUIRED llegue al banco.

  python3 -m fabrica.revision listar [--ley <slug>]
  python3 -m fabrica.revision decidir --id cand-<ley>-<n> --decision aprobar|rechazar --revisor "Nombre Apellido" --motivo "…"

Reservado a personas: el generador, el juez y el coordinador de la fábrica (Claude) no lo ejecutan. Queda registrado quién
decide, cuándo y por qué (aprobacion_humana / revision_humana en la pregunta y fabrica/estado/revisiones-humanas.json).
Antes de publicar se repiten los controles deterministas contra el texto vigente: si la ley cambió, no se publica.
"""
import argparse, datetime, glob, json, os, re, sys

R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, R)
from fabrica import banco as B, fuente as F, validacion as V  # noqa: E402

NO_HUMANOS = re.compile(r"(?i)\b(claude|anthropic|opus|sonnet|haiku|fable|juez|generador|redactor|f[aá]brica|coordinador|bot|ia|ai|gpt|modelo)\b")


def listar(a, raiz=R):
    n = 0
    for f in sorted(glob.glob(os.path.join(raiz, "datos", "candidatas", "*.json"))):
        slug = os.path.basename(f)[:-5]
        if a.ley and slug != a.ley:
            continue
        for q in B.leer(f, []):
            if q.get("verification_status") == "REVIEW_REQUIRED":
                n += 1
                print(f"{q['id']} · {slug} art. {q['art']} · {q.get('motivo', '')[:120]}\n   {q['q']}\n   ✔ {q['o'][q['a']]}")
    print(f"{n} preguntas pendientes de revisión humana")


def decidir(id_, decision, revisor, motivo, raiz=R):
    if decision not in ("aprobar", "rechazar"):
        raise B.Bloqueado("BLOQUEADO: la decisión debe ser «aprobar» o «rechazar».")
    if not revisor or len(revisor.strip()) < 3 or NO_HUMANOS.search(revisor):
        raise B.Bloqueado("BLOQUEADO: la revisión de REVIEW_REQUIRED la hace una persona identificada (no el generador, el juez ni la fábrica).")
    if not motivo or len(motivo.strip()) < 5:
        raise B.Bloqueado("BLOQUEADO: indica el motivo de la decisión.")
    m = re.fullmatch(r"cand-(.+)-(\d+)", id_ or "")
    if not m:
        raise B.Bloqueado(f"BLOQUEADO: {id_!r} no es un id de la cola (cand-<ley>-<n>).")
    slug = m.group(1)
    banco = B.Banco(raiz)
    banco.cargar(slug)
    q = next((x for x in banco.cola[slug] if x.get("id") == id_), None)
    if q is None or q.get("verification_status") != "REVIEW_REQUIRED":
        raise B.Bloqueado(f"BLOQUEADO: {id_} no está pendiente de revisión humana.")
    ahora = datetime.datetime.now().isoformat(timespec="seconds")
    nota = {"decision": decision, "revisor": revisor.strip(), "fecha": ahora, "motivo": motivo.strip()}
    publicada = None
    if decision == "aprobar":
        ley = F.Fuentes().ley(slug)
        cand = {k: q[k] for k in ("tipo", "q", "o", "a", "cita", "exp", "dif", "apartado") if k in q}
        graves = [m for e, m in V.comprobar(dict(cand, confianza="alta"), ley, q["art"], None, json.load(open(os.path.join(R, "fabrica", "config.json"))))
                  if e == "REJECTED"] if ley else ["norma inexistente"]
        if graves:
            raise B.Bloqueado(f"BLOQUEADO: {id_} no supera los controles deterministas contra el texto vigente: {'; '.join(graves)[:300]}")
        nueva = {k: v for k, v in q.items() if k not in ("id", "verification_status", "motivo", "estado_desde")}
        nueva["aprobacion_humana"] = nota
        if isinstance(nueva.get("traza"), dict):
            nueva["traza"] = dict(nueva["traza"], reviewed_at=ahora, published_at=ahora, human_decision="aprobar", cola_id=id_)
        publicada = banco.publicar(slug, nueva)
        q.update(verification_status="APROBADA_REVISION_HUMANA", revision_humana=nota, publicada_como=publicada)
    else:
        q.update(verification_status="REJECTED", revision_humana=nota, estado_desde=ahora[:10])
    if isinstance(q.get("traza"), dict):
        q["traza"].update(reviewed_at=ahora, human_decision=decision)
    banco.sucio.add(slug)
    banco.guardar()
    ruta = os.path.join(raiz, "fabrica", "estado", "revisiones-humanas.json")
    log = B.leer(ruta, [])
    log.append(dict(nota, id=id_, publicada_como=publicada))
    B.escribir(ruta, log)
    return publicada


def main(argv=None):
    ap = argparse.ArgumentParser(description="Revisión humana de la cola de la fábrica")
    ap.add_argument("paso", choices=["listar", "decidir"])
    ap.add_argument("--ley")
    ap.add_argument("--id")
    ap.add_argument("--decision")
    ap.add_argument("--revisor")
    ap.add_argument("--motivo")
    a = ap.parse_args(argv)
    if a.paso == "listar":
        return listar(a) or 0
    pid = decidir(a.id, a.decision, a.revisor, a.motivo)
    print(f"{a.id}: {a.decision}" + (f" → publicada como {pid}" if pid else ""))
    return 0


if __name__ == "__main__":
    sys.exit(main())
