"""Opposition Engine (Mossos 360 · Fase 0): datos oficiales de preparación por convocatoria, verificados contra la fuente."""
import json, os, sys, unittest

R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, R)
from catalogo import perfil as P  # noqa: E402

PREP = json.load(open(os.path.join(R, "catalogo", "preparacion", "mossos-esquadra.json"), encoding="utf-8"))
C = PREP["convocatorias"]["46/26"]
FUENTE = P._norm(open(os.path.join(R, "catalogo", "fuentes", "DOGC-1046460.txt"), encoding="utf-8").read())


class DatosOficiales(unittest.TestCase):
    def test_cada_bloque_cita_literalmente_las_bases(self):
        for k, b in C.items():
            if isinstance(b, dict):
                v = P.verificar_bloque(b, FUENTE)
                self.assertEqual(v["verification_status"], "OFFICIAL_VERIFIED", f"{k}: {v['citas_no_encontradas']}")

    def test_cita_alterada_queda_pendiente(self):
        b = dict(C["fisica"], citas=C["fisica"]["citas"] + ["Per superar-la s'ha d'obtenir una puntuació mínima de 6 punts."])
        self.assertEqual(P.verificar_bloque(b, FUENTE)["verification_status"], "OFFICIAL_PENDING_REVIEW")
        self.assertEqual(P.verificar_bloque(C["fisica"], "")["verification_status"], "OFFICIAL_PENDING_REVIEW")

    def test_barems_identicos_al_annex_2(self):
        f = C["fisica"]
        for cat, rotulo in (("homes", "1. Homes"), ("dones", "2. Dones")):
            b = f["barems"][cat]
            filas = " ".join(f"{p} {b['CA'][p]} {b['PB'][p]} {b['CL'][p]}" for p in range(11))
            self.assertIn(f"{rotulo} P CA PB CL {filas}", FUENTE, cat)

    def test_reglas_fisicas(self):
        f = C["fisica"]
        self.assertEqual([x["id"] for x in f["pruebas"]], list(f["ponderacion"]))
        self.assertAlmostEqual(sum(f["ponderacion"].values()), 99.99, places=2)
        self.assertEqual((f["minimo_por_ejercicio"], f["minimo_total"]), (1, 5))
        self.assertEqual({x["barem"] for x in f["pruebas"]}, {"CA", "PB", "CL"})

    def test_competencias_oficiales(self):
        c = C["competencias"]
        ids = [x["id"] for x in c["lista"]]
        self.assertEqual(len(ids), 10)
        self.assertTrue(set(c["clave"]) <= set(ids) and len(c["clave"]) == 3)
        for x in c["lista"]:
            self.assertIn(x["nombre"].lower(), P._norm(c["citas"][0]).lower())
        self.assertEqual(c["apte"], {"total_minimo": 50, "clave_mayor_que": 3})

    def test_capitulos_medicos(self):
        for i, cap in enumerate(C["medica"]["capitulos"], 1):
            self.assertIn(f"{i}. {cap}.", FUENTE)
        self.assertIn("no evalúa ni determina", C["medica"]["aviso"])


class Motor(unittest.TestCase):
    def test_perfil_mossos_por_convocatoria(self):
        p = P.construir("mossos-esquadra")
        m = p["motor360"]
        self.assertEqual(m["call_id"], "46/26")
        self.assertEqual(list(m["modulos"]), list(P.MOTORES))
        for k in ("aptitude", "competency", "interview", "physical", "medical_information"):
            self.assertEqual(m["modulos"][k]["oficial"]["verification_status"], "OFFICIAL_VERIFIED", k)
            self.assertEqual(m["modulos"][k]["oficial"]["call_id"], "46/26")
        self.assertTrue(m["modulos"]["medical_information"]["solo_informativo"])

    def test_otra_convocatoria_no_hereda_datos(self):
        import unittest.mock as mk
        o = json.load(open(os.path.join(R, "catalogo", "oposiciones", "mossos-esquadra.json"), encoding="utf-8"))
        o["convocatoria_registro"] = "99/99"
        m = P.motor360("mossos-esquadra", o, {}, {}, {}, [])
        self.assertIsNone(m["call_id"])
        self.assertIsNone(m["modulos"]["physical"]["oficial"])

    def test_oposicion_sin_datos_de_preparacion(self):
        m = P.construir("policia-nacional-escala-basica")["motor360"]
        self.assertIsNone(m["call_id"])
        self.assertTrue(all(m["modulos"][k].get("oficial") in (None, {}) or k in ("knowledge", "simulation", "language") for k in P.MOTORES))


if __name__ == "__main__":
    unittest.main()
