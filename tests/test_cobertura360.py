"""Content Coverage 360 (Mossos): cifras recalculables desde los datos, objetivos razonados, prioridades, tandas y pausa de la fábrica."""
import json, os, sys, unittest
from unittest import mock

R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, R)
from fabrica import cobertura360 as K  # noqa: E402
from catalogo import perfil as PF  # noqa: E402

A = K.auditar("mossos-esquadra", muestreo=False)


class Conocimientos(unittest.TestCase):
    def test_cifras_coinciden_con_los_datos(self):
        p = PF.construir("mossos-esquadra")
        k = A["knowledge"]
        self.assertEqual(len(k["temas"]), len(p["temario"]))
        self.assertEqual(sum(t["TESTLEY_VALID"] for t in k["temas"]), p["motor360"]["modulos"]["knowledge"]["contenido"]["TESTLEY_GENERATED"])
        ex = json.load(open(os.path.join(R, "datos", "examens-oficials", "mossos-esquadra.json"), encoding="utf-8"))["examenes"]
        total = sum(len(e["preguntes"]) for e in ex)
        mapeadas = sum(t["OFFICIAL_EXAM_VALID"] + t["OFFICIAL_EXAM_REVIEW"] + t["OFFICIAL_EXAM_OUTDATED"] for t in k["temas"])
        self.assertEqual(mapeadas + sum(k["oficial_sin_apartado"].values()), total)

    def test_objetivo_razonado_y_limitado_por_el_texto_oficial(self):
        n = A["knowledge"]["formato_simulacro"]["preguntas"]
        for t in A["knowledge"]["temas"]:
            self.assertLessEqual(t["objetivo"], t["capacidad"], t["tema"])
            esperado = min(t["capacidad"], max(K.PARAMETROS["min_por_apartado"] * t["apartados_con_fuente"],
                                               -(-n * t["peso_examenes"] * K.PARAMETROS["simulacros_disjuntos"] // 1)))
            self.assertEqual(t["objetivo"], int(esperado), t["tema"])
            self.assertEqual(t["faltan"], max(0, t["objetivo"] - t["TESTLEY_VALID"]))

    def test_prioridades(self):
        for t in A["knowledge"]["temas"]:
            servibles = t["TESTLEY_VALID"] + t["OFFICIAL_EXAM_VALID"]
            if t["prioridad"] == "P0":
                self.assertLess(servibles, K.PARAMETROS["min_test_tema"], t["tema"])
            if t["tema"] == "D":
                self.assertIn("fuente", t["motivo"])  # sin documento oficial: no se genera
        self.assertTrue(any(t["concentracion_excesiva"] for t in A["knowledge"]["temas"]))


class Modulos(unittest.TestCase):
    def test_aptitud_separada_en_las_5_aptitudes_oficiales(self):
        cats = [c["categoria"] for c in A["aptitude"]["categorias"]]
        self.assertEqual(sorted(cats), sorted(A["aptitude"]["oficial"]["categorias"]))
        verbal = next(c for c in A["aptitude"]["categorias"] if c["categoria"] == "verbal")
        self.assertEqual(verbal["prioridad"], "P1")
        self.assertEqual(A["aptitude"]["generador"]["source_type"], "TESTLEY_GENERATED")

    def test_muestreo_real_del_generador(self):
        apt = K.aptitud("mossos-esquadra", PF.construir("mossos-esquadra"), muestreo=True)
        for c in apt["categorias"]:
            self.assertEqual(c["errores_verificacion"], 0, c["categoria"])
            self.assertGreater(c["min_distintos_por_combinacion"], 100, c["categoria"])

    def test_competencias_y_entrevista_las_10_oficiales(self):
        self.assertEqual(len(A["competencies"]["competencias"]), 10)
        self.assertEqual(len(A["interview"]["competencias"]), 10)
        pub = json.load(open(os.path.join(R, "catalogo", "entrevista", "mossos-esquadra.json"), encoding="utf-8"))
        self.assertEqual(sum(c["VALID"] for c in A["interview"]["competencias"]), len(pub["escenarios"]))

    def test_idiomas_y_fisica_solo_oficial(self):
        self.assertEqual(A["language"]["contenido_testley"], 0)
        self.assertEqual(A["language"]["catala"]["verification_status"], "OFFICIAL_VERIFIED")
        self.assertEqual(A["physical"]["verification_status"], "OFFICIAL_VERIFIED")
        self.assertTrue(A["physical"]["pruebas"])


class Plan(unittest.TestCase):
    def test_tandas_de_conocimiento_concretas_y_bloqueadas_por_la_pausa(self):
        tam = K.CV.cfg()["lote"]["tamano_inicial"]
        kn = [t for t in A["tandas"] if t["area"] == "KNOWLEDGE" and t["tipo"] == "generacion"]
        self.assertTrue(kn)
        for t in kn:
            self.assertLessEqual(t["cantidad"], tam)
            self.assertEqual(t["cantidad"], sum(t["tipos"].values()))
            self.assertTrue(t["fuente"])
        with mock.patch.object(K, "estado_fabrica", return_value="GENERATION_PAUSED"):
            s = K.siguientes(n=50, area="KNOWLEDGE", a=A)
            self.assertTrue(all(not t["ejecutable"] for t in s))
            self.assertEqual(K.siguientes(n=50, area="KNOWLEDGE", solo_ejecutables=True, a=A), [])
        with mock.patch.object(K, "estado_fabrica", return_value="ACTIVE"):
            self.assertTrue(all(t["ejecutable"] for t in K.siguientes(n=50, area="KNOWLEDGE", a=A) if t["tipo"] == "generacion"))

    def test_siguientes_por_prioridad(self):
        s = K.siguientes(n=100, a=A)
        orden = [{"P0": 0, "P1": 1, "P2": 2, "P3": 3}[t["prioridad"]] for t in s]
        self.assertEqual(orden, sorted(orden))
        self.assertEqual(s[0]["id"], "MOSSOS-SOURCES-001")  # primero corregir fuentes

    def test_documentos_generados(self):
        md = K.md_cobertura(A)
        for h in ("## 1. Knowledge", "## 2. Aptitude", "## 3. Competencies", "## 4. Interview", "## 5. Language", "## 6. Physical", "## 7. Simulations",
                  "| AREA | SUBAREA | ACTUAL | VALID | REVIEW | OFICIAL | OBJETIVO | FALTAN | PRIORIDAD |"):
            self.assertIn(h, md)
        self.assertIn("nunca requisitos oficiales", md)
        plan = K.md_plan(A)
        self.assertIn("## BATCH MOSSOS-KNOWLEDGE-001", plan)
        self.assertIn("criterio de publicación", plan)


if __name__ == "__main__":
    unittest.main()
