"""Revisión humana y operación del Growth OS desde la terminal (o desde una rutina de Claude).
  python3 -m crecimiento.cli estado
  python3 -m crecimiento.cli contenidos [ESTADO]
  python3 -m crecimiento.cli ver ID
  python3 -m crecimiento.cli aprobar ID | rechazar ID "motivo" | editar ID fichero.txt | reprogramar ID 2026-10-01T07:30:00Z | archivar ID
  python3 -m crecimiento.cli publicado ID URL          (canales manuales: marca como publicado tras publicarlo a mano)
  python3 -m crecimiento.cli jobs [ESTADO] | reintentar CLAVE | cancelar CLAVE | reactivar PROVEEDOR
  python3 -m crecimiento.cli propuestas | propuesta-aplicada ID | propuesta-descartada ID "motivo"   (actualizar una oposición por nueva convocatoria)
  python3 -m crecimiento.cli reddit COMUNIDAD URL "contexto" "borrador"   (solo registra; nunca publica)
"""
import sys, json
from . import contenido as K, canales as CH, nucleo as N
from .jobs import Cola

def main(a):
    if not a or a[0] == "estado":
        c = K.todos(); j = Cola().jobs
        print(json.dumps({"contenidos": {e: sum(1 for x in c if x["status"] == e) for e in K.ESTADOS},
                          "jobs": {s: sum(1 for x in j.values() if x["status"] == s) for s in {x["status"] for x in j.values()}},
                          "flags": N.config().get("flags", {})}, ensure_ascii=False, indent=1)); return
    cmd, r = a[0], a[1:]
    if cmd == "contenidos":
        for x in K.todos():
            if not r or x["status"] == r[0]: print(f"{x['status']:13} {x['type']:12} {x['id']}  {x['title'][:70]}")
    elif cmd == "ver": print(json.dumps(K.cargar(r[0]), ensure_ascii=False, indent=1))
    elif cmd == "aprobar": print(K.aprobar(r[0])["status"])
    elif cmd == "rechazar": print(K.rechazar(r[0], r[1])["status"])
    elif cmd == "editar": print(K.editar(r[0], open(r[1]).read())["status"])
    elif cmd == "reprogramar": print(K.reprogramar(r[0], r[1])["scheduled_for"])
    elif cmd == "archivar": print(K.archivar(r[0])["status"])
    elif cmd == "publicado":
        c = K.cargar(r[0])
        if c["status"] != "SCHEDULED": raise SystemExit("solo contenido programado")
        c["url_publicacion"] = r[1]; K.cambiar(c, "PUBLISHED", "manual"); K.guardar(c); print("PUBLISHED")
    elif cmd == "jobs":
        for x in Cola().jobs.values():
            if not r or x["status"] == r[0]: print(f"{x['status']:13} {x['type']:18} retries={x['retries']} {x['id'][:60]} {x.get('error') or ''}")
    elif cmd in ("reintentar", "cancelar"):
        q = Cola(); getattr(q, cmd)(r[0]); q.guardar(); print(q.jobs[r[0]]["status"])
    elif cmd == "reactivar": q = Cola(); print(q.reactivar_sin_proveedor(r[0])); q.guardar()
    elif cmd == "propuestas":
        import glob, os
        for f in sorted(glob.glob(os.path.join(N.EST, "actualizaciones", "*.json"))):
            x = json.load(open(f)); print(f"{x['estado']:13} {x['id']}  cambios: {[c['campo'] for c in x['cambios'] if c['cambia']]}")
    elif cmd in ("propuesta-aplicada", "propuesta-descartada"):
        import os
        f = os.path.join(N.EST, "actualizaciones", r[0] + ".json"); x = json.load(open(f))
        x.update(estado="APLICADA" if cmd == "propuesta-aplicada" else "DESCARTADA", resuelto=N.iso(), nota=" ".join(r[1:]) or None)
        json.dump(x, open(f, "w"), ensure_ascii=False, indent=1); print(x["estado"])
    elif cmd == "reddit": print(CH.oportunidad_reddit(*r[:4])["id"])
    else: print(__doc__)

if __name__ == "__main__": main(sys.argv[1:])
