"""Auditoría de calidad automática (independiente del juez): duplicados semánticos, reglas de contenido y aplicación segura."""
import copy, json, os, shutil, sys, tempfile, unittest

R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, R)
from fabrica import auditoria_calidad as A  # noqa: E402


def q(id_, art, pregunta, ops, a, cita, **k):
    return dict(id=id_, art=art, q=pregunta, o=ops, a=a, cita=cita, **k)


Q51 = q("guia-mossos-51", "C.5.2", "Segons la Guia d'estudi, quin òrgan va adoptar la Recomanació REC(2001)10, sobre el Codi europeu d'ètica de la policia?",
        ["La Comissió Europea", "El Parlament Europeu", "El Comitè de Ministres del Consell d'Europa", "L'Assemblea General de les Nacions Unides"], 2,
        "El Comitè de Ministres del Consell d'Europa, en la Recomanació REC(2001)10, sobre el Codi europeu d'ètica de la policia")
Q67 = q("guia-mossos-67", "C.5.IF", "Segons la Guia d'estudi, quin organisme, mitjançant la Recomanació REC(2001)10, aconsella als seus estats membres seguir el Codi europeu d'ètica de la policia?",
        ["La Comissió Europea", "El Parlament Europeu", "El Consell d'Europa", "L'Organització de les Nacions Unides"], 2,
        "El Consell d'Europa, a la Recomanació REC(2001)10, aconsella als seus estats membres seguir el Codi europeu d'ètica de la policia")


class Duplicados(unittest.TestCase):
    def test_misma_idea_con_otra_redaccion_y_otro_apartado(self):
        firmes, _ = A.duplicados(Q67, [Q51], {"guia-mossos-51": 51, "guia-mossos-67": 67})
        self.assertEqual([x["id"] for x, _ in firmes], ["guia-mossos-51"])
        self.assertEqual(firmes[0][1]["ambito"], "idees_forca")

    def test_solo_se_retira_la_posterior(self):
        firmes, _ = A.duplicados(Q51, [Q67], {"guia-mossos-51": 51, "guia-mossos-67": 67})
        self.assertEqual(firmes, [])

    def test_mismo_enunciado_con_respuesta_reformulada(self):
        a = q("x-1", "C.5.2", "A més dels serveis de policia tradicionals, a quins òrgans s'aplica el Codi europeu?",
              ["Als controlats pels poders públics per mantenir l'ordre", "b", "c", "d"], 0,
              "s'aplica als serveis de policia tradicionals i als òrgans controlats pels poders públics per mantenir l'ordre")
        b = dict(copy.deepcopy(a), id="x-2", o=["Als òrgans controlats pels poders públics que mantenen l'ordre públic", "b", "c", "d"])
        self.assertTrue(A.duplicados(b, [a], {"x-1": 1, "x-2": 2})[0])

    def test_hechos_distintos_del_mismo_apartado_no_son_duplicados(self):
        otra = q("guia-mossos-52", "C.5.2", "A quins òrgans s'aplica el Codi europeu d'ètica de la policia?",
                 ["Als controlats pels poders públics per mantenir l'ordre", "b", "c", "d"], 0, "s'aplica als serveis de policia tradicionals")
        self.assertEqual(A.duplicados(otra, [Q51], {"guia-mossos-51": 51, "guia-mossos-52": 52}), ([], []))

    def test_no_usa_el_veredicto_del_juez(self):
        con = dict(Q67, traza={"verdict": "VALID"}, judge_verdict="VALID")
        sin = dict(Q67, traza={"verdict": "REJECTED"}, judge_verdict="REJECTED")
        o = {"guia-mossos-51": 51, "guia-mossos-67": 67}
        self.assertEqual(A.duplicados(con, [Q51], o)[0][0][1], A.duplicados(sin, [Q51], o)[0][0][1])


class Contenido(unittest.TestCase):
    def test_cap_a_no_es_absoluto(self):
        self.assertIsNone(A.ABSOLUTAS.search("ha de mostrar respecte cap als drets"))
        self.assertIsNotNone(A.ABSOLUTAS.search("no ha comès cap infracció"))

    def test_trivialidad_de_norma(self):
        self.assertTrue(A.PIDE_NORMA.search("quina norma recull les funcions?") and A.NORMA.search("El Decret 57/2023, de 21 de març"))


class Aplicar(unittest.TestCase):
    def setUp(self):
        self.t = tempfile.mkdtemp()
        os.makedirs(os.path.join(self.t, "datos"))
        self.qs = [dict(Q51, lote="S1", traza={"verdict": "VALID"}), dict(Q67, lote="S2", traza={"verdict": "VALID"}, judge_policy_version="v3")]
        json.dump(self.qs, open(os.path.join(self.t, A.BANCO), "w"))

    def tearDown(self):
        shutil.rmtree(self.t)

    def test_retira_sin_tocar_el_juez_y_es_idempotente(self):
        res = [{"question_id": "guia-mossos-67", "clasificacion": "REJECTED_DUPLICATE", "duplicate_id": "guia-mossos-51", "motivos": []},
               {"question_id": "guia-mossos-51", "clasificacion": "KEEP", "duplicate_id": None, "motivos": []}]
        self.assertEqual(A.aplicar(res, "propietario", self.t), {"guia-mossos-67": "DEPRECATED"})
        qs = {x["id"]: x for x in json.load(open(os.path.join(self.t, A.BANCO)))}
        self.assertEqual(qs["guia-mossos-67"]["traza"], {"verdict": "VALID"})
        self.assertEqual(qs["guia-mossos-67"]["judge_policy_version"], "v3")
        self.assertEqual(qs["guia-mossos-67"]["auditoria_calidad"]["estado_anterior"], "VALID")
        self.assertNotIn("verification_status", qs["guia-mossos-51"])
        antes = open(os.path.join(self.t, A.BANCO)).read()
        A.aplicar(res, "propietario", self.t)
        self.assertEqual(json.loads(antes), json.load(open(os.path.join(self.t, A.BANCO))))

    def test_revision_saca_del_servicio(self):
        A.aplicar([{"question_id": "guia-mossos-51", "clasificacion": "REVIEW_REQUIRED", "duplicate_id": None, "motivos": ["x"]}], "propietario", self.t)
        self.assertEqual(json.load(open(os.path.join(self.t, A.BANCO)))[0]["verification_status"], "REVIEW_REQUIRED_REEVALUATION")


class Real(unittest.TestCase):
    def test_banco_mossos_auditado(self):
        d = json.load(open(os.path.join(R, A.INFORME), encoding="utf-8"))
        c = {r["question_id"]: r["clasificacion"] for r in d["resultado"]}
        self.assertEqual(len(c), 27)
        self.assertEqual(c["guia-mossos-67"], "REJECTED_DUPLICATE")
        qs = {x["id"]: x for x in json.load(open(os.path.join(R, A.BANCO), encoding="utf-8"))}
        self.assertEqual(qs["guia-mossos-67"]["verification_status"], "DEPRECATED")
        for i, cl in c.items():
            self.assertEqual(qs[i].get("verification_status") in (None, "VALID"), cl == "KEEP", i)


if __name__ == "__main__":
    unittest.main()
