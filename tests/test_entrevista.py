"""Interview Scenario Factory (Mossos 360 · Fase 3): validador, juez independiente reutilizado y puerta (solo VALID)."""
import copy, json, os, shutil, sys, tempfile, unittest
from unittest import mock

R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, R)
from fabrica import entrevista as E  # noqa: E402
from fabrica import competencias as C  # noqa: E402

OFI = C.oficiales("mossos-esquadra")
IDS = [x["id"] for x in OFI["lista"]]
LOTE = os.path.join(R, "fabrica", "entrevista", "E00001", "candidatas.json")


def candidatas():
    return copy.deepcopy(C.J.leer(LOTE))


def mal(c, eid):
    return E.validar(c, OFI).get(eid, [])


class Validador(unittest.TestCase):
    def test_lote_real_limpio_y_cubre_las_10_competencias(self):
        c = candidatas()
        self.assertEqual({k: v for k, v in E.validar(c, OFI).items() if v}, {})
        self.assertGreaterEqual(len(c["escenarios"]), 50)
        principales = {e["competency_ids"][0] for e in c["escenarios"]}
        self.assertEqual(principales, set(IDS))
        self.assertTrue(all(set(e["competency_ids"]) <= set(IDS) for e in c["escenarios"]))

    def test_minimo_por_competencia(self):
        c = candidatas()
        c["escenarios"] = [e for e in c["escenarios"] if e["competency_ids"][0] != "motivacio"][:]
        self.assertTrue(E.validar(c, OFI)["_escenarios"])

    def test_competencia_no_oficial(self):
        c = candidatas(); c["escenarios"][0]["competency_ids"] = ["liderazgo"]
        self.assertTrue(any("oficiales" in p for p in mal(c, c["escenarios"][0]["id"])))

    def test_pregunta_abierta_y_repregunta(self):
        c = candidatas(); c["escenarios"][0]["pregunta"] = "Creus que és important complir els horaris?"
        self.assertTrue(any("cerrada" in p for p in mal(c, c["escenarios"][0]["id"])))
        c = candidatas(); c["escenarios"][0]["pregunta"] = "Explica'm un error."
        self.assertTrue(any("abierta" in p for p in mal(c, c["escenarios"][0]["id"])))
        c = candidatas(); c["escenarios"][0]["repregunta"] = "I ja està."
        self.assertTrue(any("repregunta" in p for p in mal(c, c["escenarios"][0]["id"])))

    def test_respuesta_modelo_prediccion_y_diagnostico_prohibidos(self):
        for frase in ("Aquesta és la resposta correcta.", "Amb aquesta resposta aprovaries.", "El tribunal valora molt aquesta actitud.", "Pot indicar un trastorn."):
            c = candidatas(); c["escenarios"][0]["indicadores"][0] = frase + " Explica-ho bé"
            self.assertTrue(any("prohibida" in p for p in mal(c, c["escenarios"][0]["id"])), frase)

    def test_campos_reservados_y_duplicados(self):
        c = candidatas(); c["escenarios"][0]["verification_status"] = "VALID"
        self.assertTrue(any("reservados" in p for p in mal(c, c["escenarios"][0]["id"])))
        c = candidatas(); c["escenarios"][1]["situacion"], c["escenarios"][1]["pregunta"] = c["escenarios"][0]["situacion"], c["escenarios"][0]["pregunta"]
        self.assertTrue(any("casi idéntico" in p for p in mal(c, c["escenarios"][1]["id"])))

    def test_reglas_v2_imperativa_con_interrogante(self):
        c = candidatas(); e = c["escenarios"][0]
        e["pregunta"] = "Explica'm una situació en què vas cometre un error en una tasca de la qual eres responsable?"
        self.assertFalse(any("imperativa" in p for p in mal(c, e["id"])))  # lotes antiguos: sin la regla
        c["reglas"] = 2
        self.assertTrue(any("imperativa" in p for p in mal(c, e["id"])))
        e["pregunta"] = "Explica'm una situació en què vas cometre un error en una tasca. Com el vas gestionar?"
        self.assertFalse(any("imperativa" in p for p in mal(c, e["id"])))

    def test_indicadores_orientativos_acotados(self):
        c = candidatas(); c["escenarios"][0]["indicadores"] = ["Explica el context de la situació"]
        self.assertTrue(any("indicadores" in p for p in mal(c, c["escenarios"][0]["id"])))


def transcripcion(ruta, fichero, respuesta):
    with open(ruta, "w") as f:
        for x in [{"type": "tool_use", "name": "Read", "input": {"file_path": fichero}},
                  {"type": "tool_use", "name": "SubagentHandback", "input": {"message": json.dumps(respuesta, ensure_ascii=False)}}]:
            f.write(json.dumps({"message": {"role": "assistant", "content": [x]}}) + "\n")


def respuesta(items, override=None):
    out = []
    for i in items:
        c = {k: True for k in E.CRITERIOS} | {"duplicado_de": ""}
        c.update((override or {}).get(i["item_id"], {}))
        v = "REJECTED" if c["duplicado_de"] else "VALID" if all(c[k] for k in E.CRITERIOS) else "REVIEW_REQUIRED"
        out.append({"item_id": i["item_id"], "verdict": v, "reason": f"He revisat {i['item_id']}: pregunta oberta i indicadors orientatius coherents.", "criteria_checked": c})
    return out


class Circuito(unittest.TestCase):
    def setUp(self):
        self.t = tempfile.mkdtemp()
        self.p = [mock.patch.object(E, "TRABAJO", self.t), mock.patch.object(E, "DESTINO", os.path.join(self.t, "pub"))]
        for x in self.p:
            x.start()
        os.makedirs(os.path.join(self.t, "L1"))
        C.J.escribir(os.path.join(self.t, "L1", "candidatas.json"), candidatas())

    def tearDown(self):
        for x in self.p:
            x.stop()
        shutil.rmtree(self.t)

    def juzgar(self, override=None, modelo=None, lote="L1", ronda=None):
        ev = E.reevaluar(lote, ronda) if ronda else E.preparar(lote)
        for t in ev["tandas"]:
            tr = os.path.join(self.t, f"tr-{lote}-{ronda}-{t['tanda']}.jsonl")
            transcripcion(tr, t["fichero"], respuesta(C.J.leer(t["fichero"])["items"], override))
            E.registrar(lote, t["tanda"], tr, modelo, ronda)
        return ev

    def test_politica_v2_sin_veredicto_del_modelo_de_referencia_no_publica(self):
        self.juzgar(modelo="claude-haiku-4-5 (test)")
        r = E.publicar("L1")
        self.assertEqual((r["publicados"], len(r["review_required"]), r["politica"]), (0, 60, "juez-entrevista-v2"))

    def test_reevaluacion_con_referencia_combina_de_forma_conservadora(self):
        self.juzgar({"ent-autonomia-1": {"realista": False}}, modelo="claude-haiku-4-5 (test)")
        self.juzgar({"ent-cooperacio-1": {"relevante": False}, "ent-motivacio-2": {"duplicado_de": "ent-motivacio-1"}}, ronda="sonnet")
        r = E.publicar("L1")
        self.assertEqual(r["publicados"], 57)  # haiku REVIEW gana a sonnet VALID; sonnet REVIEW y REJECTED también
        self.assertEqual(r["review_required"], ["ent-autonomia-1", "ent-cooperacio-1"]); self.assertEqual(r["rejected"], ["ent-motivacio-2"])
        e = next(x for x in C.J.leer(os.path.join(self.t, "pub", "mossos-esquadra.json"))["escenarios"] if x["id"] == "ent-responsabilitat-1")
        self.assertEqual(sorted(v["ronda"] for v in e["traza"]["veredictos"]), ["evaluacion-sonnet.json", "evaluacion.json"])
        with self.assertRaises(SystemExit):
            E.reevaluar("L1", "sonnet")  # una ronda nunca se sobrescribe

    def test_politica_o_prompt_alterados_bloquean(self):
        tmp = os.path.join(self.t, "pol"); shutil.copytree(E.POLITICAS, tmp)
        with mock.patch.object(E, "POLITICAS", tmp):
            E.politica()
            v2 = os.path.join(R, C.J.leer(os.path.join(tmp, "registro.json"))["versiones"][1]["fichero"])
            reg = C.J.leer(os.path.join(tmp, "registro.json")); reg["versiones"][1]["sha256"] = "0" * 64
            C.J.escribir(os.path.join(tmp, "registro.json"), reg)
            with self.assertRaises(SystemExit):
                E.politica()
        self.assertTrue(os.path.exists(v2))

    def test_lote_de_complemento_no_repite_ni_borra_lo_publicado(self):
        self.juzgar()
        E.publicar("L1")
        base = candidatas()["escenarios"]
        nuevo = dict(base[0], id="ent-responsabilitat-9", situacion="Experiència en un taller mecànic on vas haver de revisar comandes urgents abans de lliurar-les a clients esperant.",
                     pregunta="Com vas comprovar el teu propi treball abans de donar-lo per acabat quan anaves just de temps?")
        copia = dict(base[1], id="ent-responsabilitat-10")
        os.makedirs(os.path.join(self.t, "L2"))
        C.J.escribir(os.path.join(self.t, "L2", "candidatas.json"), {"oposicion": "mossos-esquadra", "generador": "test", "escenarios": [nuevo, copia]})
        with self.assertRaises(SystemExit):
            E.preparar("L2")  # la copia de un escenario de L1 se detecta entre lotes
        C.J.escribir(os.path.join(self.t, "L2", "candidatas.json"), {"oposicion": "mossos-esquadra", "generador": "test", "escenarios": [nuevo]})
        self.juzgar(lote="L2")
        r = E.publicar("L2")
        pub = C.J.leer(os.path.join(self.t, "pub", "mossos-esquadra.json"))
        self.assertEqual((r["publicados"], len(pub["escenarios"]), pub["lotes"]), (1, 61, ["L1", "L2"]))

    def test_tandas_sin_metadatos_y_prompt_congelado(self):
        ev = E.preparar("L1")
        self.assertTrue(all(len(t["ids"]) <= 10 for t in ev["tandas"]))
        it = C.J.leer(ev["tandas"][0]["fichero"])["items"][0]
        self.assertNotIn("generador", json.dumps(it)); self.assertNotIn("verification_status", it)
        self.assertEqual(ev["judge_prompt_sha256"], C.J.sha(open(E.PROMPT, encoding="utf-8").read()))

    def test_solo_se_publica_lo_valid_con_traza(self):
        self.juzgar({"ent-autonomia-1": {"realista": False}, "ent-motivacio-2": {"duplicado_de": "ent-motivacio-1"}})
        r = E.publicar("L1")
        pub = C.J.leer(os.path.join(self.t, "pub", "mossos-esquadra.json"))
        self.assertEqual(r["publicados"], 58)
        self.assertEqual(pub["cola_revision"], ["ent-autonomia-1"]); self.assertEqual(pub["rechazadas"], ["ent-motivacio-2"])
        for e in pub["escenarios"]:
            self.assertEqual((e["verification_status"], e["source_type"], e["traza"]["verdict"]), ("VALID", "TESTLEY_TRAINING", "VALID"))
            self.assertEqual(e["call_id"], OFI.get("call_id"))

    def test_auditoria_solo_retiene_nunca_aprueba(self):
        self.juzgar({"ent-autonomia-1": {"realista": False}})
        C.J.escribir(os.path.join(self.t, "L1", "auditoria.json"), {"retener": {"ent-cooperacio-1": "duda", "ent-autonomia-1": "intento de aprobar"}})
        r = E.publicar("L1")
        self.assertEqual(r["publicados"], 58)
        self.assertEqual(sorted(r["review_required"]), ["ent-autonomia-1", "ent-cooperacio-1"])

    def test_sin_veredicto_no_se_publica(self):
        E.preparar("L1")
        r = E.publicar("L1")
        self.assertEqual(r["publicados"], 0); self.assertEqual(len(r["review_required"]), 60)

    def test_clave_de_criterio_mal_escrita_rechaza_la_tanda(self):
        ev = E.preparar("L1")
        t = ev["tandas"][0]
        r = respuesta(C.J.leer(t["fichero"])["items"])
        r[0]["criteria_checked"]["sin_diagnostic"] = r[0]["criteria_checked"].pop("sin_diagnostico")
        tr = os.path.join(self.t, "tr.jsonl"); transcripcion(tr, t["fichero"], r)
        self.assertEqual(E.registrar("L1", "01", tr)["estado"], "RECHAZADA")

    def test_cambiar_candidatas_despues_del_juicio_bloquea(self):
        self.juzgar()
        c = C.J.leer(os.path.join(self.t, "L1", "candidatas.json")); c["escenarios"][0]["repregunta"] = "I què més hi afegiries?"
        C.J.escribir(os.path.join(self.t, "L1", "candidatas.json"), c)
        with self.assertRaises(SystemExit):
            E.publicar("L1")


class Publicado(unittest.TestCase):
    F = os.path.join(R, "catalogo", "entrevista", "mossos-esquadra.json")

    @unittest.skipUnless(os.path.exists(F), "sin publicar")
    def test_publicado_solo_valid_y_coherente_con_el_juicio(self):
        pub = C.J.leer(self.F)
        pol = E.politica()
        ver = {i: v["verdict"] for l in pub["lotes"] for i, v in E.combinar(l, pol).items()}
        retenidos = {i for l in pub["lotes"] if os.path.exists(os.path.join(E.TRABAJO, l, "auditoria.json"))
                     for i in C.J.leer(os.path.join(E.TRABAJO, l, "auditoria.json")).get("retener", {})}
        # invariante de servicio: las 10 competencias con al menos 3 escenarios VALID (modo práctica)
        por = {c: sum(1 for e in pub["escenarios"] if e["competency_ids"][0] == c) for c in IDS}
        self.assertTrue(all(n >= 3 for n in por.values()), por)
        for e in pub["escenarios"]:
            self.assertEqual(ver[e["id"]], "VALID", e["id"])
            self.assertNotIn(e["id"], retenidos)
            self.assertEqual(e["traza"]["politica"], pol["version"])
            self.assertTrue(any(pol["modelo_referencia"] in v["modelo"] for v in e["traza"]["veredictos"]), e["id"])
            self.assertEqual(e["source_type"], "TESTLEY_TRAINING")
            self.assertTrue(set(e["competency_ids"]) <= set(IDS))
        self.assertEqual({e["competency_ids"][0] for e in pub["escenarios"]}, set(IDS))


if __name__ == "__main__":
    unittest.main()
