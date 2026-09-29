"""Calidad y trazabilidad de las oposiciones: vigilancia de leyes (artículo cambiado → REVIEW_REQUIRED / OUTDATED con historial),
control de calidad de preguntas, ámbito de cada tema dentro de su ley y estructura oficial del examen."""
import os, sys, json, shutil, tempfile, unittest
RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(RAIZ, "datos")); sys.path.insert(0, os.path.join(RAIZ, "catalogo"))
import vigilar_leyes as VL, calidad_preguntas as CQ, sellar_preguntas as SP, ambito_temas as AT

ART1 = "1. El plazo máximo será de tres meses.\n\n2. El silencio tendrá efecto estimatorio."
ART2 = "Los interesados podrán presentar alegaciones."

def falso_boe(indice, bloques):
    """fetch() simulado de la API del BOE: índice por bloque y XML del bloque con sus versiones."""
    def fetch(url, accept):
        if url.endswith("/texto/indice"): return json.dumps({"data": {"bloque": indice}}).encode()
        bid = url.rsplit("/", 1)[1]
        vers = "".join(f'<version fecha_publicacion="{f}"><p class="articulo">Artículo</p>' + "".join(f"<p>{p}</p>" for p in t.split("\n\n")) + "</version>"
                       for f, t in bloques[bid])
        return f"<response><data><bloque>{vers}</bloque></data></response>".encode()
    return fetch

class TestVigilarLeyes(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp(); self.prev = VL.D; VL.D = self.tmp
        json.dump([{"n": "1", "texto": ART1}, {"n": "2", "texto": ART2}], open(os.path.join(self.tmp, "ley-x-articulos.json"), "w"))
        q = lambda art, cita: {"art": art, "q": "¿Pregunta de prueba sobre el artículo?", "o": ["a", "b", "c", "d"], "a": 0, "cita": cita}
        json.dump([q("1", "El silencio tendrá efecto estimatorio."), q("1", "El plazo máximo será de tres meses."), q("2", ART2)],
                  open(os.path.join(self.tmp, "preguntas-ley-x.json"), "w"))
    def tearDown(self): VL.D = self.prev; shutil.rmtree(self.tmp)

    def test_articulo_modificado_revision_o_retirada_con_historial(self):
        nuevo = "1. El plazo máximo será de seis meses.\n\n2. El silencio tendrá efecto estimatorio."
        indice = [{"id": "a1", "titulo": "Artículo 1", "fecha_actualizacion": "20260901"},
                  {"id": "a2", "titulo": "Artículo 2", "fecha_actualizacion": "20200101"}]
        meta = {"BOE-X": "2025-01-01"}
        r = VL.revisar("ley-x", "BOE-X", meta, fetch=falso_boe(indice, {"a1": [("20150101", ART1), ("20260901", nuevo)]}), hoy="2026-09-29")
        self.assertEqual((r["articulos_cambiados"], r["review_required"], r["outdated"]), (1, 1, 1))
        qs = json.load(open(os.path.join(self.tmp, "preguntas-ley-x.json")))
        self.assertEqual(qs[0]["verification_status"], "REVIEW_REQUIRED")  # su cita sigue en el texto nuevo
        self.assertEqual(qs[1]["verification_status"], "OUTDATED")         # su cita ya no está
        self.assertNotIn("verification_status", qs[2])                     # artículo 2 no cambió
        hist = json.load(open(os.path.join(self.tmp, "versiones", "ley-x.json")))
        self.assertEqual(hist[0]["n"], "1"); self.assertIn("tres meses", hist[0]["texto"])  # el texto anterior se conserva
        arts = json.load(open(os.path.join(self.tmp, "ley-x-articulos.json")))
        self.assertIn("seis meses", arts[0]["texto"]); self.assertEqual(meta["BOE-X"], "2026-09-01")
        self.assertEqual(len(qs), 3, "no se borra ninguna pregunta")

    def test_sin_cambios_reales_no_toca_nada(self):
        indice = [{"id": "a1", "titulo": "Artículo 1", "fecha_actualizacion": "20260901"}]
        r = VL.revisar("ley-x", "BOE-X", {"BOE-X": "2025-01-01"}, fetch=falso_boe(indice, {"a1": [("20260901", ART1)]}))
        self.assertEqual(r["articulos_cambiados"], 0)
        self.assertFalse(os.path.exists(os.path.join(self.tmp, "versiones", "ley-x.json")))

    def test_numero_de_articulo(self):
        self.assertEqual(VL.num_articulo("Artículo 31 bis"), "31bis")
        self.assertEqual(VL.num_articulo("Artículo\xa0588 bis a)"), "588bisa")
        self.assertEqual(VL.num_articulo("Artículo 172 quater"), "172quater")
        self.assertEqual(VL.num_articulo("Artículo 216 bis 2"), "216bis2")
        self.assertEqual(VL.num_articulo("Artículo 1. Objeto"), "1")
        self.assertIsNone(VL.num_articulo("Disposición adicional primera"))

class TestSellado(unittest.TestCase):
    def test_sella_con_la_version_del_texto_y_respeta_las_retiradas(self):
        tmp = tempfile.mkdtemp(); prev = SP.D; SP.D = tmp
        try:
            json.dump([{"n": "1", "texto": ART1}], open(os.path.join(tmp, "ley-x-articulos.json"), "w"))
            json.dump([{"art": "1", "cita": "El plazo máximo será de tres meses."}, {"art": "1", "cita": "otra", "verification_status": "OUTDATED"}],
                      open(os.path.join(tmp, "preguntas-ley-x.json"), "w"))
            self.assertEqual(SP.sellar("ley-x", "BOE-X", {"BOE-X": "2026-07-01"}, "2026-09-29"), 1)
            qs = json.load(open(os.path.join(tmp, "preguntas-ley-x.json")))
            self.assertEqual((qs[0]["verificada_contra"], qs[0]["verificada_el"]), ("2026-07-01", "2026-09-29"))
            self.assertNotIn("verificada_contra", qs[1])
            self.assertEqual(SP.sellar("ley-x", "BOE-X", {"BOE-X": "2026-07-01"}), 0, "idempotente")
        finally: SP.D = prev; shutil.rmtree(tmp)

class TestCalidadPreguntas(unittest.TestCase):
    ARTS = {"1": "El plazo máximo será de tres meses."}
    BUENA = {"art": "1", "q": "¿Cuál es el plazo máximo?", "o": ["Tres meses", "Seis meses", "Un mes", "Un año"], "a": 0, "cita": "El plazo máximo será de tres meses.", "dif": 1, "exp": "Lo fija el artículo 1 de la ley."}

    def test_pregunta_correcta_sin_problemas(self):
        self.assertEqual(CQ.comprobar(dict(self.BUENA), self.ARTS), [])

    def test_detecta_cada_tipo_de_fallo(self):
        casos = {
            "STRUCTURE": {"a": 7}, "CONTENT": {"q": "¿Plazo?"},
            "ANSWER": {"o": ["Tres meses", "tres meses", "Un mes", "Un año"]},
            "SOURCE": {"cita": "El plazo máximo será de seis meses."},
        }
        for control, cambio in casos.items():
            p = CQ.comprobar({**self.BUENA, **cambio}, self.ARTS)
            self.assertIn(control, [x[0] for x in p], control)
        p = CQ.comprobar({**self.BUENA, "o": ["Tres meses", "Seis meses", "Todas las anteriores", "Un año"]}, self.ARTS)
        self.assertIn("ANSWER", [x[0] for x in p], "una opción que remite a otras no vale: la app baraja")
        self.assertIn("SOURCE", [x[0] for x in CQ.comprobar({**self.BUENA, "art": "99"}, self.ARTS)])

    def test_duplicados_exactos_y_casi(self):
        a = dict(self.BUENA); b = dict(self.BUENA); c = {**self.BUENA, "q": "¿Cuál es el plazo máximo del procedimiento?"}
        d = {**self.BUENA, "q": "¿Qué órgano resuelve?", "o": ["El Ministro", "b", "c", "d"]}
        exact, casi = CQ.duplicados([("x#0", a), ("x#1", b), ("x#2", c), ("x#3", d)], umbral=0.6)
        self.assertEqual(exact, [("x#0", "x#1")])
        self.assertTrue(any("x#2" in par for par in casi)); self.assertFalse(any("x#3" in par for par in casi))

    def test_banco_real_sin_errores_bloqueantes(self):
        inf = CQ.auditar()
        self.assertEqual(sum(len(r["errores"]) for r in inf.values()), 0)
        self.assertGreater(sum(r["total"] for r in inf.values()), 2000)

class TestAmbitoTemas(unittest.TestCase):
    def test_corona_y_cortes_van_a_sus_titulos(self):
        corona = [u for u, _ in AT.asignar("La Corona. Funciones constitucionales del Rey. Sucesión y regencia.", "constitucion")]
        self.assertTrue(any(u.startswith("TÍTULO II.") for u in corona), corona)
        self.assertFalse(any(u.startswith("TÍTULO III.") for u in corona))
        cortes = [u for u, _ in AT.asignar("Las Cortes Generales: composición, atribuciones y funcionamiento.", "constitucion")]
        self.assertTrue(any(u.startswith("TÍTULO III.") for u in cortes), cortes)

    def test_correccion_manual_por_rangos(self):
        arts = AT.por_rangos("codigo-penal", [["8", "8"], ["73", "78bis"]])
        self.assertEqual(arts, ["8", "73", "74", "75", "76", "77", "78", "78bis"])
        with self.assertRaises(ValueError): AT.por_rangos("codigo-penal", [["1", "9999"]])

    def test_ambito_generado_respeta_las_correcciones(self):
        amb = json.load(open(os.path.join(RAIZ, "catalogo", "temas_ambito.json")))
        manual = json.load(open(os.path.join(RAIZ, "catalogo", "temas_ambito_manual.json")))
        for k in (k for k in manual if not k.startswith("_")):
            if k in amb:
                self.assertEqual(amb[k]["metodo"], "corrección manual contra la estructura oficial", k)
                self.assertEqual(amb[k]["articulos"], AT.por_rangos(amb[k]["ley"], manual[k]["rangos"]), k)
        concursos = amb["policia-nacional-escala-ejecutiva#31#codigo-penal"]["articulos"]
        self.assertIn("77", concursos); self.assertNotIn("262", concursos)  # «concurso de delitos», no «alteración de precios en concursos»

class TestEstructuraExamen(unittest.TestCase):
    def setUp(self):
        self.op = {os.path.basename(p)[:-5]: json.load(open(p)) for p in __import__("glob").glob(os.path.join(RAIZ, "catalogo", "oposiciones", "*.json"))}

    def test_cada_parte_tiene_cita_y_explica_lo_que_no_se_simula(self):
        for oid, o in self.op.items():
            est = (o.get("examen") or {}).get("estructura") or []
            self.assertTrue(est, oid)
            self.assertTrue(any(p["en_simulacro"] for p in est), f"{oid}: nada simulable")
            for p in est:
                self.assertTrue(p.get("cita") and p.get("fuente"), f"{oid}: {p.get('parte')}")
                if not p["en_simulacro"]: self.assertTrue(p.get("motivo"), f"{oid}: {p['parte']} sin motivo")

    def test_policia_nacional_basica_regla_oficial(self):
        s = self.op["policia-nacional-escala-basica"]["examen"]["simulacro"]
        self.assertEqual((s["preguntas"], s["minutos"], s["opciones"]), (100, 50, 3))

    def test_guardia_civil_temario_pendiente_y_explicado(self):
        o = self.op["guardia-civil-cabos-guardias"]
        self.assertEqual(o["temario"]["tipo"], "pendiente")
        self.assertTrue(any(x["campo"] == "temario" and x["motivo"] for x in o.get("pendientes", [])))

if __name__ == "__main__": unittest.main()
