"""Job Queue: EVENT → JOB → QUEUE → WORKER → RESULT.
Almacén: crecimiento/estado/jobs.json (sin datos personales). Cada trabajo registra
started_at, finished_at, status, error, retries, provider, cost, event_id.
Estados: pending → running → done | failed (reintento con espera exponencial) → dead (dead-letter tras max_retries)
         | sin_proveedor (falta credencial: se reintenta cuando se configure) | cancelled | skipped.
Idempotencia: un trabajo con la misma clave (evento + acción + objetivo) no se crea dos veces.
"""
import datetime
from . import nucleo as N

FICHERO = "jobs.json"
MAX_RETRIES = 4

class SinProveedor(Exception):
    """La integración externa no tiene credencial configurada. No es un fallo: el trabajo espera."""
    def __init__(self, proveedor, falta): super().__init__(f"{proveedor}: falta {falta}"); self.proveedor = proveedor

class Cola:
    def __init__(self):
        self.jobs = N.leer(FICHERO, {})
    MAX_TERMINADOS = 3000
    def guardar(self):
        """Compacta: conserva todo lo no terminado y los últimos MAX_TERMINADOS terminados (el historial completo queda en git)."""
        fin = sorted((j for j in self.jobs.values() if j["status"] in ("done", "skipped", "cancelled")), key=lambda j: j.get("finished_at") or "")
        for j in fin[: max(0, len(fin) - self.MAX_TERMINADOS)]: del self.jobs[j["id"]]
        N.guardar(FICHERO, self.jobs)

    def encolar(self, tipo, datos, event_id=None, clave=None, prioridad=5, programado=None):
        clave = clave or f"{event_id}:{tipo}:{N.huella(datos)}"
        if clave in self.jobs: return None
        self.jobs[clave] = {"id": clave, "type": tipo, "data": datos, "event_id": event_id, "status": "pending", "priority": prioridad,
                            "retries": 0, "created_at": N.iso(), "run_after": programado or N.iso(), "started_at": None, "finished_at": None,
                            "error": None, "provider": None, "cost": 0.0, "result": None}
        return self.jobs[clave]

    def listos(self, ahora=None):
        ahora = ahora or N.ahora()
        L = [j for j in self.jobs.values() if j["status"] in ("pending", "failed") and N.parse(j["run_after"]) <= ahora]
        return sorted(L, key=lambda j: (j["priority"], j["created_at"]))

    def ejecutar(self, job, fn):
        job.update(status="running", started_at=N.iso(), error=None)
        try:
            r = fn(job) or {}
            job.update(status=r.pop("_status", "done"), result=r, provider=r.get("provider"), cost=round(job["cost"] + float(r.get("cost", 0) or 0), 6))
        except SinProveedor as e:
            job.update(status="sin_proveedor", error=str(e), provider=e.proveedor)
        except Exception as e:
            job["retries"] += 1
            job["error"] = f"{type(e).__name__}: {str(e)[:300]}"
            if job["retries"] >= MAX_RETRIES: job["status"] = "dead"
            else:
                job["status"] = "failed"
                job["run_after"] = N.iso(N.ahora() + datetime.timedelta(minutes=5 * 2 ** (job["retries"] - 1)))
        job["finished_at"] = N.iso()
        return job

    def trabajar(self, ejecutores, limite=200):
        n = {}
        for job in self.listos()[:limite]:
            fn = ejecutores.get(job["type"])
            if not fn: job.update(status="dead", error="sin ejecutor para " + job["type"], finished_at=N.iso())
            else: self.ejecutar(job, fn)
            n[job["status"]] = n.get(job["status"], 0) + 1
            self.guardar()  # tras cada trabajo: si el worker muere, no se repite lo ya hecho
        self.guardar()
        return n

    # Operaciones de administración (CLI y /admin/growth/jobs)
    def reintentar(self, clave):
        j = self.jobs[clave]; j.update(status="pending", run_after=N.iso(), error=None); return j
    def cancelar(self, clave):
        j = self.jobs[clave]
        if j["status"] in ("pending", "failed", "sin_proveedor"): j.update(status="cancelled", finished_at=N.iso())
        return j
    def reactivar_sin_proveedor(self, proveedor):
        n = 0
        for j in self.jobs.values():
            if j["status"] == "sin_proveedor" and j.get("provider") == proveedor: j.update(status="pending", run_after=N.iso()); n += 1
        return n
