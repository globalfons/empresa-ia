"""Juez v2 (juez-sesion-v2): cada pregunta recibe una evaluación individual demostrable.
Los 14 casos pedidos (TEST 1 … TEST 14) más la integridad de la política. Uso: python3 -m unittest tests.test_juez_v2"""
import copy, json, os, shutil, sys, tempfile, unittest
from unittest import mock

R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, R)
from fabrica import juez_v2 as J, reevaluacion as RV, politica as P  # noqa: E402


def items(n=10):
    return [{"question_id": f"q{k}", "norma": "Ley X", "art": str(k), "texto": f"El plazo de recurso número {k} es de un mes desde la notificación.",
             "q": f"¿Cuál es el plazo del recurso número {k} según el artículo?", "o": ["Un mes", "Dos meses", "Diez días", "Un año"], "a": 0,
             "cita": "es de un mes desde la notificación", "parecidas": []} for k in range(n)]


def ver(i, verdict="VALID", **c):
    crit = dict(respaldada=True, unica=True, clara=True, duplicada_de="")
    crit.update(c)
    return {"question_id": i["question_id"], "verdict": verdict, "criteria_checked": crit,
            "reason": f"La cita del artículo {i['art']} fija el plazo del recurso número {i['art']} en un mes; las demás opciones no aparecen."}


def transcripcion(ruta, mensaje, herramientas=(("Read", {"file_path": "TANDA"}),)):
    with open(ruta, "w", encoding="utf-8") as f:
        for nombre, entrada in herramientas:
            f.write(json.dumps({"type": "assistant", "message": {"role": "assistant", "content": [{"type": "tool_use", "name": nombre, "input": entrada}]}}) + "\n")
        f.write(json.dumps({"type": "assistant", "message": {"role": "assistant", "content": [
            {"type": "tool_use", "name": "SubagentHandback", "input": {"message": mensaje}}]}}) + "\n")


class Guards(unittest.TestCase):
    def test_01_diez_preguntas_diez_veredictos(self):
        it = items()
        self.assertEqual(len(J.comprobar(it, [ver(i) for i in it])), 10)

    def test_02_nueve_veredictos_falla(self):
        it = items()
        with self.assertRaises(J.JuezInvalido) as e:
            J.comprobar(it, [ver(i) for i in it[:9]])
        self.assertEqual(e.exception.codigo, "RECUENTO")

    def test_03_once_veredictos_falla(self):
        it = items()
        extra = dict(ver(it[0]), question_id="q99")
        with self.assertRaises(J.JuezInvalido):
            J.comprobar(it, [ver(i) for i in it] + [extra])

    def test_04_id_duplicado_falla(self):
        it = items()
        vs = [ver(i) for i in it]
        vs[9] = dict(vs[0], reason=vs[0]["reason"] + " (bis)")
        with self.assertRaises(J.JuezInvalido) as e:
            J.comprobar(it, vs)
        self.assertEqual(e.exception.codigo, "ID_DUPLICADO")

    def test_05_id_inexistente_falla(self):
        it = items()
        vs = [ver(i) for i in it]
        vs[3] = dict(vs[3], question_id="no-existe")
        with self.assertRaises(J.JuezInvalido) as e:
            J.comprobar(it, vs)
        self.assertEqual(e.exception.codigo, "ID_INEXISTENTE")

    def test_06_respuesta_todas_valid_falla(self):
        for texto in ("Todas VALID", "OK para todas", '{"todas": "VALID"}', "Las anteriores son correctas.\n[]",
                      '[{"question_id": "q0", "verdict": "VALID"}] y el resto también'):
            with self.assertRaises(J.JuezInvalido, msg=texto):
                J.comprobar(items(), J.parsear(texto))
        it = items(2)
        vs = [ver(i) for i in it]
        vs[1]["reason"] = "Todas las preguntas son válidas y correctas según el texto."
        with self.assertRaises(J.JuezInvalido) as e:
            J.comprobar(it, vs)
        self.assertEqual(e.exception.codigo, "RESPUESTA_AGREGADA")
        # una razón individual que menciona «todos sus miembros» no es una valoración agregada
        vs[1]["reason"] = "El artículo 33.1 exige en primera convocatoria la asistencia de todos sus miembros; es la única respuesta correcta."
        self.assertEqual(len(J.comprobar(it, vs)), 2)

    def test_07_un_script_no_puede_completar_un_veredicto_ausente(self):
        it = items()
        vs = [ver(i) for i in it[:9]]
        # un script que rellena el que falta con valores por defecto deja huella: sin razón propia ni criterios → se rechaza
        relleno = {"question_id": "q9", "verdict": "VALID", "reason": "", "criteria_checked": {}}
        with self.assertRaises(J.JuezInvalido):
            J.comprobar(it, vs + [relleno])
        # y una tanda cuya transcripción muestra un script (Bash) se rechaza aunque la respuesta esté completa
        d = tempfile.mkdtemp()
        try:
            with mock.patch.object(J, "TRABAJO", d), mock.patch.object(P, "incidencia"):
                J.preparar("t7", it)
                fichero = J.leer(os.path.join(d, "t7", "evaluacion.json"))["tandas"][0]["fichero"]
                tr = os.path.join(d, "tr.jsonl")
                transcripcion(tr, json.dumps([ver(i) for i in it]), (("Read", {"file_path": fichero}), ("Bash", {"command": "python3 juez.py"})))
                t = J.registrar("t7", "01", tr)
                self.assertEqual(t["estado"], "RECHAZADA")
                self.assertIn("JUDGE_INVALID", t["intentos"][-1]["resultado"])
                self.assertIsNone(J.resultado("t7"))
        finally:
            shutil.rmtree(d)
        # en la publicación no existe veredicto por defecto
        with self.assertRaises(J.JuezInvalido):
            J.publicables({"q0": "VALID", "q1": None})

    def test_08_todo_valid_con_evidencia_individual_pasa(self):
        d = tempfile.mkdtemp()
        try:
            with mock.patch.object(J, "TRABAJO", d), mock.patch.object(P, "incidencia"):
                it = items()
                J.preparar("t8", it)
                fichero = J.leer(os.path.join(d, "t8", "evaluacion.json"))["tandas"][0]["fichero"]
                tr = os.path.join(d, "tr.jsonl")
                transcripcion(tr, json.dumps([ver(i) for i in it]), (("Read", {"file_path": fichero}),))
                self.assertEqual(J.registrar("t8", "01", tr)["estado"], "ACEPTADA")
                res = J.resultado("t8")
                self.assertEqual(res["alerta"], "ALL_VALID_REVIEW_REQUIRED")
                self.assertTrue(res["segunda_comprobacion"]["ok"])
                self.assertEqual(res["porcentajes"]["VALID"], 100.0)
        finally:
            shutil.rmtree(d)

    def test_09_todo_valid_sin_evidencia_individual_falla(self):
        it = items(3)
        vs = J.comprobar(it, [dict(ver(i), reason=f"Correcto y revisado conforme, sin observaciones (item {k})") for k, i in enumerate(it)])
        ev = J.evidencia_individual(it, vs, [{"tanda": "01", "ok": True}])
        self.assertFalse(ev["ok"])  # razones que no hablan de la pregunta
        vs_ok = J.comprobar(it, [ver(i) for i in it])
        self.assertFalse(J.evidencia_individual(it, vs_ok, [{"tanda": "01", "ok": False}])["ok"])  # tanda con herramientas no permitidas
        self.assertTrue(J.evidencia_individual(it, vs_ok, [{"tanda": "01", "ok": True}])["ok"])


class Publicacion(unittest.TestCase):
    def test_10_review_required_no_se_publica(self):
        with self.assertRaises(J.JuezInvalido):
            J.exigir_publicable("q1", "REVIEW_REQUIRED")
        self.assertEqual(J.publicables({"q1": "REVIEW_REQUIRED"}), [])

    def test_11_rejected_no_se_publica(self):
        with self.assertRaises(J.JuezInvalido):
            J.exigir_publicable("q1", "REJECTED")
        self.assertEqual(J.publicables({"q1": "REJECTED"}), [])

    def test_12_valid_se_publica(self):
        self.assertTrue(J.exigir_publicable("q1", "VALID"))
        self.assertEqual(J.publicables({"q1": "VALID", "q2": "REJECTED"}), ["q1"])

    def test_veredicto_nunca_mas_permisivo_que_sus_criterios(self):
        it = items(2)
        vs = J.comprobar(it, [ver(it[0], "VALID", unica=False), ver(it[1], "VALID", duplicada_de="q-x")])
        self.assertEqual([v["verdict"] for v in vs], ["REVIEW_REQUIRED", "REJECTED"])
        self.assertFalse(vs[0]["coherente"])


class _Datos(unittest.TestCase):
    def setUp(self):
        self.d = tempfile.mkdtemp()
        os.makedirs(os.path.join(self.d, "datos"))
        self.qs = [{"id": f"guia-mossos-{k}", "art": "A.1.1", "q": f"Pregunta {k}", "o": ["a", "b", "c", "d"], "a": 1, "cita": "x" * 20,
                    "exp": "e", "lote": "S00017", "traza": {"judge_verdict": "VALID", "judge_policy_version": "juez-sesion-v1",
                                                         "judge_model": "claude-haiku-4-5", "judge_flags": {"respaldada": True}}} for k in range(3)]
        self.qs.append({"id": "otra-0", "art": "1", "q": "Otra", "o": ["a", "b", "c", "d"], "a": 0, "cita": "y" * 20, "lote": "S00016"})
        json.dump(self.qs, open(os.path.join(self.d, "datos", "preguntas-guia-mossos.json"), "w"))

    def tearDown(self):
        shutil.rmtree(self.d)

    def banco(self):
        return {q["id"]: q for q in json.load(open(os.path.join(self.d, "datos", "preguntas-guia-mossos.json")))}

class Historico(_Datos):
    def test_13_s00017_conserva_sus_veredictos_historicos(self):
        self.assertEqual(RV.marcar("S00017", raiz=self.d), 3)
        b = self.banco()
        for k in range(3):
            q = b[f"guia-mossos-{k}"]
            self.assertEqual((q["legacy_verdict"], q["legacy_policy_version"], q["legacy_judge"], q["legacy_batch"], q["current_status"]),
                             ("VALID", "juez-sesion-v1", "claude-haiku-4-5", "S00017", "PUBLISHED_LEGACY"))
            self.assertEqual(q["verification_status"], "REVIEW_REQUIRED_REEVALUATION")
            self.assertEqual(q["traza"], self.qs[k]["traza"])
        self.assertNotIn("legacy_verdict", b["otra-0"])
        self.assertEqual(RV.marcar("S00017", raiz=self.d), 0)  # idempotente: no reescribe el histórico

    def test_14_nuevo_veredicto_sin_sobrescribir_el_historico(self):
        RV.marcar("S00017", raiz=self.d)
        res = {"judge_policy_version": "juez-sesion-v2", "policy_hash": "h", "veredictos": [
            {"question_id": "guia-mossos-0", "verdict": "VALID", "reason": "r0" * 12, "criteria_checked": {}},
            {"question_id": "guia-mossos-1", "verdict": "REVIEW_REQUIRED", "reason": "r1" * 12, "criteria_checked": {}},
            {"question_id": "guia-mossos-2", "verdict": "REJECTED", "reason": "r2" * 12, "criteria_checked": {}}]}
        with mock.patch.object(RV.B.Banco, "verificar_publicacion", return_value=[]):  # aquí se prueba el histórico; la puerta tiene su test
            self.assertEqual(RV.aplicar("S00017", "S00017-v2", raiz=self.d, res=res), {"VALID": 1, "REVIEW_REQUIRED": 1, "REJECTED": 1})
        b = self.banco()
        for k, (est, cur) in enumerate([(None, "PUBLISHED"), ("REVIEW_REQUIRED_REEVALUATION", "HUMAN_REVIEW_QUEUE"), ("DEPRECATED", "WITHDRAWN")]):
            q = b[f"guia-mossos-{k}"]
            self.assertEqual(q.get("verification_status"), est)
            self.assertEqual(q["current_status"], cur)
            self.assertEqual(q["legacy_verdict"], "VALID")  # el histórico sigue intacto
            self.assertEqual(q["reevaluation_policy_version"], "juez-sesion-v2")
            self.assertEqual((q["q"], q["o"], q["a"], q["id"]), (self.qs[k]["q"], self.qs[k]["o"], self.qs[k]["a"], self.qs[k]["id"]))
            self.assertEqual(len(q["reevaluaciones"]), 1)


class PuertaRepublicacion(_Datos):
    def test_valid_que_no_pasa_la_puerta_sigue_en_revision(self):
        RV.marcar("S00017", raiz=self.d)
        res = {"judge_policy_version": "juez-sesion-v2", "policy_hash": "no-registrada", "veredictos": [
            {"question_id": "guia-mossos-0", "verdict": "VALID", "reason": "r0" * 12, "criteria_checked": {}}]}
        RV.aplicar("S00017", "S00017-v2", raiz=self.d, res=res)
        q = self.banco()["guia-mossos-0"]
        self.assertEqual(q["verification_status"], "REVIEW_REQUIRED_REEVALUATION")  # no se sirve
        self.assertIn("puerta de publicación", q["motivo"])
        self.assertEqual(q["reevaluation_verdict"], "VALID")  # el veredicto del juez queda registrado, sin publicar
        self.assertEqual(q["legacy_verdict"], "VALID")


class Politica(unittest.TestCase):
    def test_v2_registrada_con_huella_y_mismos_criterios_que_v1(self):
        reg = P.registro()
        e = next(x for x in reg["versiones"] if x["version"] == "juez-sesion-v2")
        self.assertEqual(P.huella(os.path.join(R, e["fichero"])), e["sha256"])
        v1 = P.cargar("juez-sesion-v1")["componentes"]; v2 = P.cargar("juez-sesion-v2")["componentes"]
        crit = v1["prompt_revisor"].split("For EACH item decide, using ONLY the article text:\n")[1].split("\n- motivo:")[0]
        self.assertIn(crit, v2["prompt_revisor_tanda"])  # criterios sustantivos idénticos
        self.assertEqual(v2["mecanismo"]["tamano_tanda"], 10)
        self.assertIn("ONLY tool you may use is Read", v2["prompt_revisor_tanda"])
        for k in ("sistema", "criterios_api", "prompt_revisor"):
            self.assertEqual(v1[k], v2[k])

    def test_tandas_de_maximo_diez(self):
        d = tempfile.mkdtemp()
        try:
            with mock.patch.object(J, "TRABAJO", d):
                ts = J.preparar("t", items(23))
            self.assertEqual([len(t["ids"]) for t in ts], [10, 10, 3])
            with self.assertRaises(SystemExit), mock.patch.object(J, "TRABAJO", d):
                J.preparar("t", items(3))  # una evaluación nunca se reescribe
        finally:
            shutil.rmtree(d)


if __name__ == "__main__":
    unittest.main()
