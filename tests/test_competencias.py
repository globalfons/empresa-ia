"""Competency Exercise Factory (Mossos 360 · Fase 2): validador determinista, juez independiente y puerta (solo VALID)."""
import copy, json, os, shutil, sys, tempfile, unittest
from unittest import mock

R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, R)
from fabrica import competencias as C  # noqa: E402

OFI = C.oficiales("mossos-esquadra")
IDS = [x["id"] for x in OFI["lista"]]
CTX = ["una botiga", "un equip de futbol", "una biblioteca", "un voluntariat", "una acadèmia", "un magatzem", "una oficina", "un hospital",
       "un mercat", "un poliesportiu", "una escola", "un restaurant", "un museu", "una fàbrica", "un hotel", "una associació", "un centre cívic",
       "una farmàcia", "un taller", "una cooperativa"]


def paraula(i, k):
    """Paraula sintètica única per escenari (sense dígits: el detector de duplicats compta paraules de 4+ lletres)."""
    abc = "bcdfghjklmnpqrstvxz"
    return "mot" + abc[i % 19] + abc[(i // 19) % 19] + abc[k % 19] + "a"


def ficha(cid):
    return {"id": cid, "explicacion": f"Explicació de la competència {cid} pensada per a l'entrenament dels candidats.",
            "preparacion": "Practica-la cada setmana amb situacions reals i revisa què has fet bé i què pots millorar.",
            "comportamientos": ["Complir els compromisos", "Revisar la feina", "Demanar ajuda quan cal"],
            "autoevaluacion": [{"id": f"aa-{cid}-1", "texto": "Acabo les tasques que començo.", "invertido": False},
                               {"id": f"aa-{cid}-2", "texto": "Sovint deixo les tasques a mitges.", "invertido": True}],
            "preguntas_reflexion": ["Quan vas assumir una responsabilitat difícil?"],
            "relacion_entrevista": "Pots explicar experiències concretes de la teva trajectòria personal i professional relacionades."}


def escenario(cid, n, formato="eleccion"):
    pts = [{cid: 2, "cooperacio": 1}, {cid: 1}, {cid: 0}, {cid: 0, "cooperacio": 0}] if cid != "cooperacio" else [{cid: 2}, {cid: 1}, {cid: 0}, {}]
    e = {"id": f"esc-{cid}-{n}", "competency_id": cid, "formato": formato, "dificultad": 2,
         "situacion": f"A {CTX[(IDS.index(cid) * 2 + n) % len(CTX)]} passa això: " + " ".join(paraula(IDS.index(cid) * 10 + n, k) for k in range(14)) + ".",
         "contexto": "feina", "pregunta": "Què faries en aquest cas?",
         "opciones": [{"texto": f"Actuació {k} per a {cid}" + " i bé" * ((k + IDS.index(cid) + n) % 4), "puntos": p} for k, p in enumerate(pts)],
         "justificacion": "L'actuació recomanada combina responsabilitat i comunicació amb l'equip sense deixar el problema sense resoldre.",
         "expected_dimensions": sorted({k for p in pts for k in p})}
    if formato == "ranking":
        e["opciones"][3]["puntos"] = {cid: 0}
        e["opciones"][2]["puntos"] = {cid: 1, "cooperacio": 0} if cid != "cooperacio" else {cid: 1}
        e["opciones"][1]["puntos"] = {cid: 2} if cid != "cooperacio" else {cid: 2}
        e["opciones"][0]["puntos"] = {cid: 2, "cooperacio": 1} if cid != "cooperacio" else {cid: 2, "autonomia": 1}
        e["expected_dimensions"] = sorted({k for o in e["opciones"] for k in o["puntos"]})
        e["orden_recomendado"] = [0, 1, 2, 3]
    return e


def candidatas():
    return {"oposicion": "mossos-esquadra", "generador": "test", "competencias": [ficha(c) for c in IDS],
            "escenarios": [escenario(c, 1) for c in IDS] + [escenario(c, 2, "ranking") for c in IDS]}


class Validador(unittest.TestCase):
    def test_contenido_correcto_pasa(self):
        v = C.validar(candidatas(), OFI)
        self.assertEqual({k: x for k, x in v.items() if x}, {})

    def test_solo_las_10_competencias_oficiales(self):
        c = candidatas(); c["competencias"].append(ficha("liderazgo"))
        self.assertTrue(C.validar(c, OFI)["_competencias"])
        c = candidatas(); c["escenarios"][0]["competency_id"] = "empatia"
        self.assertIn("competencia no oficial", C.validar(c, OFI)["esc-responsabilitat-1"])

    def test_afirmaciones_oficiales_y_diagnosticos_prohibidos(self):
        for frase in ("El tribunal valora molt aquesta actitud.", "Aquest és el criteri oficial.", "Amb això aprovaràs.", "Pot indicar un trastorn."):
            c = candidatas(); c["escenarios"][0]["justificacion"] += " " + frase
            self.assertTrue(any("prohibida" in p for p in C.validar(c, OFI)["esc-responsabilitat-1"]), frase)

    def test_clave_unica_y_ranking_coherente(self):
        c = candidatas(); c["escenarios"][0]["opciones"][1]["puntos"] = c["escenarios"][0]["opciones"][0]["puntos"]
        self.assertTrue(any("única" in p for p in C.validar(c, OFI)["esc-responsabilitat-1"]))
        c = candidatas(); c["escenarios"][10]["orden_recomendado"] = [1, 0, 2, 3]
        self.assertTrue(any("ranking" in p for p in C.validar(c, OFI)[c["escenarios"][10]["id"]]))

    def test_campos_reservados_y_duplicados(self):
        c = candidatas(); c["escenarios"][0]["verification_status"] = "VALID"
        self.assertTrue(any("reservados" in p for p in C.validar(c, OFI)["esc-responsabilitat-1"]))
        c = candidatas(); c["escenarios"][1]["situacion"] = c["escenarios"][0]["situacion"]
        self.assertTrue(any("casi idéntica" in p for p in C.validar(c, OFI)[c["escenarios"][1]["id"]]))

    def test_pista_por_longitud(self):
        c = candidatas()
        for e in c["escenarios"]:
            b = C.totales(e).index(max(C.totales(e)))
            e["opciones"][b]["texto"] += " i a més ho explico amb molt de detall a tothom"
        self.assertTrue(any("pista por longitud" in p for p in C.validar(c, OFI).get("_escenarios", [])))

    def test_pista_por_posicion_de_longitud(self):
        c = candidatas()
        for e in c["escenarios"]:
            b = C.totales(e).index(max(C.totales(e)))
            larga = max(range(4), key=lambda i: len(e["opciones"][i]["texto"]) if i != b else -1)
            e["opciones"][larga]["texto"] += " amb una explicació molt i molt llarga"
            e["opciones"][b]["texto"] += " amb una explicació llarga"
        self.assertTrue(any("posición 2" in p for p in C.validar(c, OFI).get("_escenarios", [])))

    def test_autoevaluacion_con_item_invertido(self):
        c = candidatas(); c["competencias"][0]["autoevaluacion"][1]["invertido"] = False
        self.assertTrue(C.validar(c, OFI)["ficha-responsabilitat"])


def transcripcion(ruta, fichero, respuesta, extra=()):
    with open(ruta, "w") as f:
        for x in [{"type": "tool_use", "name": "Read", "input": {"file_path": fichero}}, *extra,
                  {"type": "tool_use", "name": "SubagentHandback", "input": {"message": json.dumps(respuesta, ensure_ascii=False)}}]:
            f.write(json.dumps({"message": {"role": "assistant", "content": [x]}}) + "\n")


def respuesta(items, override=None):
    out = []
    for i in items:
        c = {k: True for k in C.CRITERIOS} | {"duplicado_de": ""}
        c.update((override or {}).get(i["item_id"], {}))
        out.append({"item_id": i["item_id"], "verdict": C.J.esperado(c, C.ESPEC), "reason": f"He revisat {i['item_id']}: situació clara i actuació recomanada coherent.", "criteria_checked": c})
    return out


class Circuito(unittest.TestCase):
    def setUp(self):
        self.t = tempfile.mkdtemp()
        self.p = [mock.patch.object(C, "TRABAJO", self.t), mock.patch.object(C, "DESTINO", os.path.join(self.t, "pub"))]
        for x in self.p:
            x.start()
        os.makedirs(os.path.join(self.t, "L1"))
        C.J.escribir(os.path.join(self.t, "L1", "candidatas.json"), candidatas())

    def tearDown(self):
        for x in self.p:
            x.stop()
        shutil.rmtree(self.t)

    def juzgar(self, override=None, extra=()):
        ev = C.preparar("L1")
        for t in ev["tandas"]:
            items = C.J.leer(t["fichero"])["items"]
            tr = os.path.join(self.t, f"tr-{t['tanda']}.jsonl")
            transcripcion(tr, t["fichero"], respuesta(items, override), extra)
            C.registrar("L1", t["tanda"], tr)
        return ev

    def test_tandas_de_10_sin_metadatos_del_generador(self):
        ev = C.preparar("L1")
        self.assertEqual([len(t["ids"]) for t in ev["tandas"]], [10, 10, 10])
        it = C.J.leer(ev["tandas"][1]["fichero"])["items"][0]
        self.assertNotIn("generador", json.dumps(it))
        self.assertNotIn("verification_status", it)

    def test_solo_se_publica_lo_valid(self):
        self.juzgar({"esc-autonomia-1": {"clave_defendible": False}, "ficha-motivacio": {"coherente": False}})
        r = C.publicar("L1")
        pub = C.J.leer(os.path.join(self.t, "pub", "mossos-esquadra.json"))
        self.assertEqual((r["publicadas_fichas"], r["publicados_escenarios"]), (9, 19))
        self.assertEqual(sorted(pub["cola_revision"]), ["esc-autonomia-1", "ficha-motivacio"])
        self.assertTrue(all(e["verification_status"] == "VALID" and e["traza"]["verdict"] == "VALID" for e in pub["escenarios"]))
        self.assertTrue(all(e["source_type"] == "TESTLEY_GENERATED" and e["interview_question_ids"] == [] for e in pub["escenarios"]))

    def test_sin_veredicto_no_se_publica(self):
        C.preparar("L1")
        r = C.publicar("L1")
        self.assertEqual((r["publicadas_fichas"], r["publicados_escenarios"]), (0, 0))
        self.assertEqual(len(r["review_required"]), 30)

    def test_juez_con_herramientas_no_permitidas_se_rechaza(self):
        ev = self.juzgar(extra=[{"type": "tool_use", "name": "Bash", "input": {"command": "ls"}}])
        self.assertTrue(all(t["estado"] == "RECHAZADA" for t in C.J.leer(os.path.join(self.t, "L1", "evaluacion.json"))["tandas"]))
        self.assertEqual(C.publicar("L1")["publicados_escenarios"], 0)

    def test_respuesta_agregada_o_incompleta_se_rechaza(self):
        ev = C.preparar("L1")
        t = ev["tandas"][0]
        items = C.J.leer(t["fichero"])["items"]
        tr = os.path.join(self.t, "tr.jsonl")
        transcripcion(tr, t["fichero"], respuesta(items)[:-1])
        self.assertEqual(C.registrar("L1", "01", tr)["estado"], "RECHAZADA")
        r = respuesta(items); r[0]["reason"] = "Todas las preguntas son correctas y válidas."
        transcripcion(tr, t["fichero"], r)
        self.assertEqual(C.registrar("L1", "01", tr)["estado"], "RECHAZADA")

    def test_guard_agregado_no_confunde_una_comparacion(self):
        self.assertFalse(C.agregada("Escenario sobre material perdido: situación diferente de las anteriores y bien escrita."))
        self.assertTrue(C.agregada("Este es correcto y las anteriores también son válidas."))
        self.assertTrue(C.agregada("Todas las preguntas son correctas."))

    def test_veredicto_inconsistente_gana_el_mas_conservador(self):
        ev = C.preparar("L1")
        t = ev["tandas"][1]
        items = C.J.leer(t["fichero"])["items"]
        r = respuesta(items); r[0]["criteria_checked"]["relevante"] = False  # el juez dice VALID con un criterio falso
        tr = os.path.join(self.t, "tr.jsonl"); transcripcion(tr, t["fichero"], r)
        reg = C.registrar("L1", t["tanda"], tr)
        self.assertEqual(reg["veredictos"][0]["verdict"], "REVIEW_REQUIRED")

    def test_cambiar_candidatas_despues_del_juicio_bloquea(self):
        self.juzgar()
        c = C.J.leer(os.path.join(self.t, "L1", "candidatas.json")); c["escenarios"][0]["justificacion"] += " Canvi."
        C.J.escribir(os.path.join(self.t, "L1", "candidatas.json"), c)
        with self.assertRaises(SystemExit):
            C.publicar("L1")

    def test_veredictos_aceptados_no_se_sobrescriben(self):
        ev = self.juzgar()
        with self.assertRaises(SystemExit):
            C.registrar("L1", "01", os.path.join(self.t, "tr-01.jsonl"))


class Publicado(unittest.TestCase):
    def test_contenido_publicado_de_mossos(self):
        f = os.path.join(R, "catalogo", "competencias", "mossos-esquadra.json")
        if not os.path.exists(f):
            self.skipTest("sin contenido publicado")
        pub = json.load(open(f, encoding="utf-8"))
        ids = {x["id"] for x in OFI["lista"]}
        self.assertTrue({f["id"] for f in pub["competencias"]} <= ids)
        self.assertTrue(all(e["competency_id"] in ids and e["verification_status"] == "VALID" and e["traza"]["verdict"] == "VALID" for e in pub["escenarios"]))
        self.assertEqual(len({e["id"] for e in pub["escenarios"]}), len(pub["escenarios"]))
        self.assertFalse(any(C.PROHIBIDO.search(json.dumps(x, ensure_ascii=False)) for x in pub["competencias"] + pub["escenarios"]))
        pol = C.politica()  # cada item publicado es VALID en las rondas de SU lote (lotes complementarios incluidos)
        for lote in pub["lotes"]:
            comb = C.combinar_de(C.TRABAJO, lote, pol)
            for x in pub["competencias"] + pub["escenarios"]:
                if x["traza"]["lote"] == lote:
                    clave = "ficha-" + x["id"] if "explicacion" in x else x["id"]
                    self.assertEqual(comb[clave]["verdict"], "VALID", clave)


if __name__ == "__main__":
    unittest.main()


class PoliticaVersionada(unittest.TestCase):
    """juez-competencias-v2: Sonnet como referencia, mismos criterios, rondas nuevas sin tocar las anteriores."""

    def test_v2_activa_con_referencia_sonnet_y_v1_historica_intacta(self):
        reg = json.load(open(os.path.join(C.POLITICAS, "registro.json"), encoding="utf-8"))
        self.assertEqual(reg["activa"], "juez-competencias-v2")
        p2, p1 = C.politica(), C.politica("juez-competencias-v1")
        self.assertIn("sonnet", p2["modelo_referencia"])
        self.assertEqual(p2["criterios"], p1["criterios"])  # no se cambian criterios para subir VALID
        self.assertEqual(p2["prompt_sha256"], p1["prompt_sha256"])

    def test_politica_manipulada_bloquea(self):
        d = tempfile.mkdtemp(); self.addCleanup(shutil.rmtree, d, True)
        shutil.copytree(C.POLITICAS, os.path.join(d, "p"))
        f = os.path.join(d, "p", "juez-competencias-v2.json")
        with open(f, "a", encoding="utf-8") as h:
            h.write(" ")
        reg = json.load(open(os.path.join(d, "p", "registro.json"), encoding="utf-8"))
        for e in reg["versiones"]:
            e["fichero"] = os.path.relpath(os.path.join(d, "p", os.path.basename(e["fichero"])), R)
        json.dump(reg, open(os.path.join(d, "p", "registro.json"), "w"))
        with self.assertRaises(SystemExit):
            C.politica_de(os.path.join(d, "p"), C.CRITERIOS)
        with self.assertRaises(SystemExit):
            C.politica_de(C.POLITICAS, C.CRITERIOS + ["otro"])

    def _lote(self, d, rondas):
        os.makedirs(os.path.join(d, "L"))
        for f, modelo, vs in rondas:
            json.dump({"judge_model": modelo, "tandas": [{"tanda": "01", "estado": "ACEPTADA", "registrada_el": "t",
                                                          "veredictos": [{"item_id": i, "verdict": v} for i, v in vs.items()]}]},
                      open(os.path.join(d, "L", f), "w"))

    def test_combinacion_conservadora_y_solo_valid_con_la_referencia(self):
        d = tempfile.mkdtemp(); self.addCleanup(shutil.rmtree, d, True)
        self._lote(d, [("evaluacion.json", "claude-haiku-4-5", {"a": "VALID", "b": "VALID", "c": "REVIEW_REQUIRED", "d": "VALID", "e": "REJECTED"}),
                       ("evaluacion-sonnet.json", "claude-sonnet-4-5", {"a": "VALID", "b": "REVIEW_REQUIRED", "c": "VALID", "e": "VALID"})])
        r = C.combinar_de(d, "L", {"modelo_referencia": "sonnet"})
        self.assertEqual({i: x["verdict"] for i, x in r.items()},
                         {"a": "VALID", "b": "REVIEW_REQUIRED", "c": "REVIEW_REQUIRED", "d": "REVIEW_REQUIRED", "e": "REJECTED"})
        self.assertEqual(len(r["a"]["veredictos"]), 2)  # se conservan los veredictos históricos

    def test_reevaluar_no_sobrescribe_rondas(self):
        d = tempfile.mkdtemp(); self.addCleanup(shutil.rmtree, d, True)
        os.makedirs(os.path.join(d, "L"))
        base = {k: "x" for k in ("lote", "oposicion", "call_id", "judge_prompt", "judge_prompt_sha256", "candidatas_sha256")}
        base["tandas"] = [{"tanda": "01", "ids": [], "fichero": "f", "prompt_sha256": "p", "huellas": {}, "estado": "ACEPTADA", "veredictos": []}]
        json.dump(base, open(os.path.join(d, "L", "evaluacion.json"), "w"))
        pol = {"version": "v2", "sha256": "s", "modelo_referencia": "sonnet-4-5"}
        ev = C.reevaluar_de(d, "L", "sonnet", pol)
        self.assertEqual(ev["tandas"][0]["estado"], "PENDIENTE")
        self.assertEqual(json.load(open(os.path.join(d, "L", "evaluacion.json")))["tandas"][0]["estado"], "ACEPTADA")
        with self.assertRaises(SystemExit):
            C.reevaluar_de(d, "L", "sonnet", pol)
