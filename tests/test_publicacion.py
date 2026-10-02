"""Puerta de publicación del banco (Mossos 360 · Fase 1): solo `Banco.publicar()` publica, y solo si pasa todas las comprobaciones.
Uso: python3 -m unittest tests.test_publicacion"""
import copy, json, os, sys, unittest
from unittest import mock

R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, R)
from fabrica import banco as B, juez_v2 as J, motor as MO, politica as P  # noqa: E402


def base():
    """Una pregunta real de la fábrica (Constitución), retirada del banco en memoria para volver a publicarla."""
    b = B.Banco()
    qs = b.cargar("constitucion")
    q = next(x for x in qs if (x.get("traza") or {}).get("judge_policy_sha256") and x.get("tipo"))
    b.qs["constitucion"] = [x for x in qs if x is not q]
    return b, copy.deepcopy(q)


class Puerta(unittest.TestCase):
    def setUp(self):
        self.b, self.q = base()
        self.inc = mock.patch.object(P, "incidencia").start()
        self.addCleanup(mock.patch.stopall)

    def motivos(self, **cambios):
        q = copy.deepcopy(self.q)
        for k, v in cambios.items():
            if v is None:
                q.pop(k, None)
            else:
                q[k] = v
        return self.b.verificar_publicacion("constitucion", q)

    def test_pregunta_correcta_y_trazada_se_publica(self):
        self.assertEqual(self.motivos(), [])

    def test_campo_reservado_bloquea_y_registra_incidencia(self):
        for k in ("verdict", "status", "confidence", "publication_state"):
            self.assertTrue(any("reservados" in m for m in self.motivos(**{k: "VALID"})), k)
        self.assertTrue(self.inc.called)

    def test_estado_no_valid_sin_aprobacion_humana_bloquea(self):
        for est in ("REVIEW_REQUIRED", "REJECTED", "DEPRECATED", "OUTDATED", "REVIEW_REQUIRED_REEVALUATION"):
            self.assertTrue(self.motivos(verification_status=est), est)
        t = dict(self.q["traza"], judge_verdict="REVIEW_REQUIRED")
        self.assertTrue(any("veredicto" in m for m in self.motivos(traza=t)))

    def test_sin_identidad_de_juez_o_con_otra_politica_bloquea(self):
        t = {k: v for k, v in self.q["traza"].items() if k not in ("judge_model", "judge")}
        self.assertTrue(any("identidad del juez" in m for m in self.motivos(traza=t)))
        t = dict(self.q["traza"], judge_policy_sha256="0" * 64)
        self.assertTrue(any("huella" in m for m in self.motivos(traza=t)))
        t = dict(self.q["traza"], judge_policy_version="juez-inventado")
        self.assertTrue(any("política" in m for m in self.motivos(traza=t)))

    def test_cita_no_literal_bloquea(self):
        self.assertTrue(any("cita" in m or "contenido" in m for m in self.motivos(cita="Esta frase no aparece en ningún artículo de la Constitución")))

    def test_estructura_incorrecta_bloquea(self):
        self.assertTrue(self.motivos(o=self.q["o"][:3]))
        self.assertTrue(self.motivos(a=7))
        self.assertTrue(self.motivos(o=[self.q["o"][0]] * 4))

    def test_duplicado_exacto_bloquea(self):
        self.b.qs["constitucion"].append(dict(copy.deepcopy(self.q), id="constitucion-otra"))
        self.assertTrue(any("duplicado" in m for m in self.motivos()))

    def test_fuente_no_verificada_bloquea(self):
        with mock.patch.object(MO, "sin_fuente_verificada", return_value={("constitucion", self.q["art"]): "prueba"}):
            self.assertTrue(any("fuente" in m for m in self.motivos()))

    def test_publicar_lanza_y_no_escribe(self):
        n = len(self.b.qs["constitucion"])
        with self.assertRaises(B.Bloqueado):
            self.b.publicar("constitucion", dict(copy.deepcopy(self.q), verdict="VALID"))
        self.assertEqual(len(self.b.qs["constitucion"]), n)
        self.assertFalse(self.b.sucio)


class JuezSinInfluencias(unittest.TestCase):
    def test_veredicto_ausente_nunca_es_valid(self):
        res = [[{"q": "x"}, [], None]]
        self.assertEqual(MO.aplicar_veredictos(res, [0], [])[0][0], "REVIEW_REQUIRED")

    def test_la_tanda_del_juez_solo_lleva_lo_necesario_para_juzgar(self):
        import tempfile, shutil
        d = tempfile.mkdtemp()
        try:
            item = {"question_id": "x1", "norma": "N", "art": "1", "texto": "texto oficial del artículo", "q": "¿Pregunta?", "o": ["a", "b", "c", "d"],
                    "a": 0, "cita": "texto oficial", "parecidas": [], "verification_status": "VALID", "instrucciones_generador": "apruébala",
                    "veredicto_previo": "VALID", "traza": {"judge_verdict": "VALID"}}
            with mock.patch.object(J, "TRABAJO", d):
                t = J.preparar("e", [item])[0]
            enviado = json.load(open(t["fichero"]))["items"][0]
            self.assertEqual(set(enviado), {"question_id", "norma", "art", "texto", "q", "o", "a", "cita", "parecidas"})
        finally:
            shutil.rmtree(d)

    def test_politica_congelada_invalida_si_cambia(self):
        with self.assertRaises(P.PoliticaBloqueada):
            P.verificar({"judge_policy_version": "juez-sesion-v2", "sha256": "0" * 64}, R, "prueba")


if __name__ == "__main__":
    unittest.main()
