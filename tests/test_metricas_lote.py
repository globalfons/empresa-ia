"""Métricas por lote (generación controlada): la auditoría y los defectos del circuito pausan la generación."""
import os, sys, unittest
from unittest import mock

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "scripts"))
import metricas_lote as M  # noqa: E402


def calcular(auditoria=(), incidencias=()):
    datos = {"fabrica/estado/estado.json": {"lotes": [{"id": "SX", "fecha": "f", "generadas": 10, "VALID": 10, "REVIEW_REQUIRED": 0, "REJECTED": 0, "duplicadas": 0}]},
             "fabrica/estado/archivo/SX/validacion.json": [], "fabrica/estado/auditoria-lotes.json": list(auditoria),
             "fabrica/estado/incidencias-politica.json": list(incidencias)}
    with mock.patch.object(M, "leer", lambda p, d=None: datos.get(p, d)), mock.patch.object(M.glob, "glob", lambda p: []):
        return M.calcular("SX", 10)


class MetricasLote(unittest.TestCase):
    def test_lote_limpio_sigue(self):
        self.assertEqual(calcular()["decision"], "OK_SIGUIENTE_TANDA")

    def test_minor_no_pausa_pero_el_duplicado_cuenta(self):
        m = calcular([{"lote": "SX", "tipo": "duplicado", "gravedad": "MINOR"}])
        self.assertEqual((m["duplicate"], m["decision"]), (1, "OK_SIGUIENTE_TANDA"))

    def test_major_de_auditoria_pausa(self):
        self.assertEqual(calcular([{"lote": "SX", "tipo": "calidad", "gravedad": "MAJOR"}])["decision"], "PAUSE_GENERATION")

    def test_defecto_del_circuito_pausa_sin_contar_como_seguridad(self):
        m = calcular(incidencias=[{"lote": "SX", "tipo": "deduplicacion_incompleta"}])
        self.assertEqual((m["security_incidents"], m["process_incidents"], m["decision"]), (0, 1, "PAUSE_GENERATION"))
        self.assertEqual(calcular(incidencias=[{"lote": "SX", "tipo": "campos_reservados"}])["security_incidents"], 1)


if __name__ == "__main__":
    unittest.main()
