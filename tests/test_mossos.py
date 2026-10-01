"""Mossos d'Esquadra (Generalitat): fuentes oficiales, convocatoria 46/26, guía de estudio y esmenes, exámenes oficiales,
vigilancia sin falsos positivos, revisión de preguntas cuando cambia la guía y páginas generadas.
Uso: python3 -m unittest tests.test_mossos"""
import copy, glob, json, os, shutil, sys, tempfile, unittest
from unittest import mock

R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, R)
from ingesta import gencat as G  # noqa: E402
from catalogo import vigilar_gencat as V  # noqa: E402

OP = json.load(open(os.path.join(R, "catalogo", "oposiciones", "mossos-esquadra.json"), encoding="utf-8"))
EX = json.load(open(os.path.join(R, "datos", "examens-oficials", "mossos-esquadra.json"), encoding="utf-8"))
DOCS = os.path.join(R, "docs")


def texto_fuente(clave):
    return G.norm(open(os.path.join(R, OP["fuentes"][clave]["texto"]), encoding="utf-8").read())


def datos_oficiales():
    for k, d in OP["oficial"].items():
        for x in (d if isinstance(d, list) else [d]):
            if isinstance(x, dict) and "cita" in x:
                yield k, x


class Fuentes(unittest.TestCase):
    def test_todas_las_fuentes_son_oficiales_y_trazables(self):
        for k, f in OP["fuentes"].items():
            dominio = f["url"].split("/")[2]
            self.assertTrue(dominio.endswith("gencat.cat"), f"{k}: {dominio} no es una fuente oficial de la Generalitat")
            for campo in ("url", "texto", "fecha_publicacion", "retrieved_at", "verification_status", "sha256"):
                self.assertTrue(f.get(campo), f"{k} sin {campo}")
            self.assertTrue(os.path.exists(os.path.join(R, f["texto"])), f["texto"])

    def test_registro_con_procedencia_completa(self):
        reg = G.leer_registro()["documentos"]
        self.assertTrue(reg)
        for d in reg:
            for campo in ("source_url", "source_document", "source_type", "retrieved_at", "verification_status"):
                self.assertIn(campo, d, f"{d.get('source_url')} sin {campo}")
            self.assertTrue(d["source_url"].split("/")[2].endswith("gencat.cat"), d["source_url"])


class Convocatoria(unittest.TestCase):
    def test_cada_dato_oficial_es_cita_literal_de_su_fuente(self):
        n = 0
        for k, d in datos_oficiales():
            self.assertIn(G.norm(d["cita"]), texto_fuente(d["fuente"]), f"{k}: cita no literal en {d['fuente']}")
            n += 1
        self.assertGreaterEqual(n, 10)

    def test_datos_clave_46_26(self):
        o = OP["oficial"]
        self.assertEqual(o["plazas"]["valor"], 1587)
        self.assertEqual(o["grupo"]["valor"], "C1")
        self.assertEqual(OP["fuentes"]["convocatoria"]["id"], "DOGC-1046460")
        self.assertEqual(OP["examen"]["oficial"]["preguntas"], 30)
        self.assertEqual(OP["examen"]["oficial"]["minutos"], 35)

    def test_registro_en_catalogo_nacional_reverificado(self):
        v = G.convocatoria_catalogo(escribir=False)
        self.assertEqual(v["oposicion_id"], "mossos-esquadra")
        self.assertEqual(v["fuente"]["tipo"], "DOGC")
        self.assertEqual(v["descartados_por_no_literales"], [])
        self.assertEqual((v["application_start"], v["application_end"], v["exam_date"]), ("2026-06-09", "2026-06-22", "2026-10-17"))
        for k, d in v["datos"].items():
            fuente = d["source_document"]
            self.assertIn(G.norm(d["cita"]), G.norm(open(os.path.join(R, fuente), encoding="utf-8").read()), k)
            self.assertEqual(d["verification_status"], "OFFICIAL_VERIFIED")
        guardada = json.load(open(os.path.join(R, "catalogo", "convocatorias", "DOGC-1046460.json"), encoding="utf-8"))
        self.assertEqual(guardada["datos"].keys(), v["datos"].keys(), "catalogo/convocatorias/DOGC-1046460.json desactualizado")

    def test_cita_inventada_se_descarta(self):
        falsa = copy.deepcopy(OP)
        falsa["oficial"]["plazas"] = dict(falsa["oficial"]["plazas"], cita="Convocar 9.999 places de mosso/a")
        with mock.patch.object(G.json, "load", side_effect=[falsa]):
            v = G.convocatoria_catalogo(escribir=False)
        self.assertNotIn("plazas", v["datos"])
        self.assertTrue(v["descartados_por_no_literales"])


class Guia(unittest.TestCase):
    ARTS = [{"n": "A.5.1", "texto": "Intro. El seu territori està dividit en quatre províncies, Barcelona, Tarragona, Lleida i Girona, i en 43 comarques. Fi."},
            {"n": "B.8.1", "texto": "Actualment, però, amb la sortida del Regne Unit de la UE, el Parlament Europeu està\nformat per 705 diputats, dels quals 59 corresponen a Espanya."}]

    def test_esmenes_se_aplican_y_guardan_historial(self):
        arts = copy.deepcopy(self.ARTS)
        log = G.aplicar_esmenes(arts)
        self.assertIn("42 comarques i l’Aran", arts[0]["texto"])
        self.assertIn("720 diputats", arts[1]["texto"])  # tolera el salto de línea dentro de la frase original
        self.assertEqual(arts[1]["esmenes"][0]["on_deia"].split(",")[0], "Actualment")
        estados = {(x["tema"], x["estado"]) for x in log}
        self.assertIn(("A.2", "OFFICIAL_PENDING_REVIEW"), estados, "una esmena que no encuentra su texto queda pendiente, no se inventa")

    def test_cambio_de_apartado_manda_preguntas_a_revision(self):
        tmp = tempfile.mkdtemp()
        try:
            os.makedirs(os.path.join(tmp, "datos"))
            qs = [{"id": "g1", "art": "A.5.1", "cita": "quatre províncies", "verification_status": "VALID"},
                  {"id": "g2", "art": "A.5.1", "cita": "43 comarques", "verification_status": "VALID"},
                  {"id": "g3", "art": "B.1.1", "cita": "x", "verification_status": "VALID"}]
            json.dump(qs, open(os.path.join(tmp, "datos", "preguntas-guia-mossos.json"), "w"))
            arts = copy.deepcopy(self.ARTS); G.aplicar_esmenes(arts)
            with mock.patch.object(G, "R", tmp):
                self.assertEqual(G.revisar_preguntas_guia({"A.5.1"}, arts, hoy="2026-10-01"), (1, 1))
            out = {q["id"]: q["verification_status"] for q in json.load(open(os.path.join(tmp, "datos", "preguntas-guia-mossos.json")))}
            self.assertEqual(out, {"g1": "REVIEW_REQUIRED", "g2": "OUTDATED", "g3": "VALID"})
        finally:
            shutil.rmtree(tmp)

    def test_preguntas_publicadas_de_la_guia(self):
        fq = os.path.join(R, "datos", "preguntas-guia-mossos.json")
        qs = json.load(open(fq, encoding="utf-8"))
        self.assertTrue(qs)
        for q in qs:
            self.assertEqual(q.get("verification_status", "VALID"), "VALID", f"{q['id']}: solo se publican VALID")
            self.assertTrue(q.get("cita") and q.get("art"))
            self.assertIn("Guia d'estudi", q["origen"])
            self.assertRegex(q.get("exp") or "", r"(?i)apartat|tema|guia d.estudi")
        cache = G.GUIA_JSON
        if os.path.exists(cache):
            arts = {a["n"]: G.norm(a["texto"]) for a in json.load(open(cache, encoding="utf-8"))}
            for q in qs:
                self.assertIn(G.norm(q["cita"]), arts.get(q["art"], ""), f"{q['id']}: cita no literal en el apartat {q['art']}")


class ExamenesOficiales(unittest.TestCase):
    def test_nueve_examenes_con_procedencia_oficial(self):
        ids = [e["id"] for e in EX["examenes"]]
        self.assertEqual(ids, ["46-25", "46-24", "46-002-23", "46-23", "46-22", "46-21", "46-19", "46-002-19", "46-17"])
        self.assertEqual(sum(e["preguntes_total"] for e in EX["examenes"]), 290)
        for e in EX["examenes"]:
            self.assertTrue(e["font"].startswith(G.MOSSOS), e["font"])
            for q in e["preguntes"]:
                self.assertEqual(q["procedencia"], "OFFICIAL_EXAM")
                self.assertTrue(q["id"].startswith(f"mx{e['id']}-"))
                self.assertEqual(len(q["o"]), 4)
                self.assertIn(q["a"], range(4))
                if q.get("lletra_oficial"):
                    self.assertEqual("abcd".index(q["lletra_oficial"].lower()), q["a"], f"{q['id']}: respuesta ≠ plantilla oficial")
                self.assertIn(q["verification_status"], ("VALID", "REVIEW_REQUIRED", "OUTDATED", "DEPRECATED"))
                if q["vigencia_guia"] == "CONTRADIU_GUIA":
                    self.assertEqual(q["verification_status"], "OUTDATED")

    def test_no_se_mezclan_con_las_de_la_fabrica(self):
        ids_ex = {q["id"] for e in EX["examenes"] for q in e["preguntes"]}
        for f in glob.glob(os.path.join(R, "datos", "preguntas-*.json")):
            for q in json.load(open(f, encoding="utf-8")):
                self.assertNotIn(q.get("id"), ids_ex, f"{f}: pregunta oficial mezclada con el banco generado")
                self.assertNotEqual(q.get("procedencia"), "OFFICIAL_EXAM", f)

    def test_citas_de_la_guia_literales(self):
        if not os.path.exists(G.GUIA_JSON):
            self.skipTest("guía no descargada (python3 -m ingesta.gencat guia)")
        from ingesta import examens_mossos as M
        with mock.patch.object(M, "SALIDA", os.path.join(tempfile.mkdtemp(), "x.json")):
            out, problemas = M.construir(descargar=False)
        self.assertEqual(problemas, [])
        self.assertEqual([len(e["preguntes"]) for e in out["examenes"]], [e["preguntes_total"] for e in EX["examenes"]])


HTML_CONV = """<main><h2>Llista definitiva [#bloc1_llista]</h2><p>21/09/2026</p>
<p><a href="https://dogc.gencat.cat/ca/document-del-dogc/?documentId=1054777">Resolució ISP/xxxx/2026</a></p>
<h2>Sol·licitud de participació [#bloc2_sol]</h2><p>08/06/2026</p><p><a href="/web/.content/bases.pdf">Bases</a></p>
<p><a href="/web/.content/home/Guia_Mossos_Edicio_Juny_2026.pdf">Guia</a></p></main>"""
HTML_IND = """<main><a href="/ca/els_mossos_desquadra/acces_al_cos/Mosso_a/mosso-a-convocatoria-46-26/">46/26</a>
<a href="/ca/els_mossos_desquadra/acces_al_cos/Mosso_a/preguntes-frequents/">FAQ</a>
<a href="/ca/els_mossos_desquadra/acces_al_cos/Mosso_a/mosso-a-46-25/">46/25</a>{extra}</main>"""


class Vigilancia(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp()
        self.p = [mock.patch.object(V, "NOV", os.path.join(self.tmp, "nov.json")), mock.patch.object(V, "EST", os.path.join(self.tmp, "est.json"))]
        for p in self.p:
            p.start()
        self.op = copy.deepcopy(OP)
        self.op["vigilancia"]["web"]["conocidas"] = [G.MOSSOS + "/ca/els_mossos_desquadra/acces_al_cos/Mosso_a/mosso-a-46-25/"]

    def tearDown(self):
        for p in self.p:
            p.stop()
        shutil.rmtree(self.tmp)

    def fetch(self, extra=""):
        w = self.op["vigilancia"]["web"]
        return lambda u: HTML_CONV if u == w["convocatoria"] else HTML_IND.format(extra=extra)

    def test_sin_falsos_positivos_y_sin_duplicados(self):
        nuevas, _ = V.vigilar([self.op], fetch=self.fetch(), hoy="2026-10-01")
        self.assertEqual([n["tipo"] for n in nuevas], ["listas", "convocatoria"])
        self.assertTrue(all(n["verification_status"] == "OFFICIAL_VERIFIED" for n in nuevas))
        self.assertEqual(nuevas[0]["id"], "DOGC-1054777")
        nuevas2, avisos = V.vigilar([self.op], fetch=self.fetch(), hoy="2026-10-02")
        self.assertEqual((nuevas2, avisos), ([], []), "una segunda pasada sin cambios no genera alertas")

    def test_convocatoria_nueva_queda_pendiente_de_revision(self):
        V.vigilar([self.op], fetch=self.fetch(), hoy="2026-10-01")
        extra = '<a href="/ca/els_mossos_desquadra/acces_al_cos/Mosso_a/mosso-a-convocatoria-46-27/">46/27</a>'
        nuevas, _ = V.vigilar([self.op], fetch=self.fetch(extra), hoy="2026-10-02")
        self.assertEqual(len(nuevas), 1)
        self.assertEqual(nuevas[0]["verification_status"], "OFFICIAL_PENDING_REVIEW")
        self.assertIn("46-27", nuevas[0]["url"])

    def test_web_caida_no_borra_nada(self):
        V.vigilar([self.op], fetch=self.fetch(), hoy="2026-10-01")
        def falla(u):
            raise OSError("timeout")
        nuevas, _ = V.vigilar([self.op], fetch=falla, hoy="2026-10-02")
        self.assertEqual(nuevas, [])
        self.assertEqual(len(json.load(open(V.NOV))), 2)
        self.assertIn("timeout", json.load(open(V.EST))["mossos-esquadra"]["error"])

    def test_cambio_en_la_guia_avisa(self):
        V.vigilar([self.op], fetch=self.fetch(), hoy="2026-10-01")
        w = self.op["vigilancia"]["web"]
        html = HTML_CONV.replace("</main>", '<p><a href="/web/.content/home/Esmenes-guia-2027.pdf">Esmenes</a></p></main>')
        nuevas, avisos = V.vigilar([self.op], fetch=lambda u: html if u == w["convocatoria"] else HTML_IND.format(extra=""), hoy="2026-10-03")
        self.assertEqual([a["tipo"] for a in avisos], ["guia_cambiada"])
        self.assertEqual(nuevas[-1]["verification_status"], "OFFICIAL_PENDING_REVIEW")


@unittest.skipUnless(os.path.exists(os.path.join(DOCS, "oposiciones", "mossos-esquadra", "index.html")), "sin build (npm run build)")
class Paginas(unittest.TestCase):
    def leer(self, ruta):
        return open(os.path.join(DOCS, ruta, "index.html"), encoding="utf-8").read()

    def test_ficha_examenes_y_convocatoria_enlazados(self):
        ficha = self.leer("oposiciones/mossos-esquadra")
        self.assertIn("examenes-oficiales/", ficha)
        self.assertIn("convocatorias/DOGC-1046460/", ficha)
        conv = self.leer("convocatorias/DOGC-1046460")
        self.assertIn("oposiciones/mossos-esquadra/", conv)
        self.assertIn("documentId=1046460", conv)
        self.assertIn("mossos-esquadra", self.leer("oposiciones/categoria/policia"))
        ex = self.leer("oposiciones/mossos-esquadra/examenes-oficiales/46-25")
        self.assertIn("Examen oficial", ex)

    def test_guia_no_se_republica(self):
        self.assertFalse(os.path.exists(os.path.join(DOCS, "guia-mossos")), "el texto de la guía (© Generalitat) no se publica")
        sm = "".join(open(f, encoding="utf-8").read() for f in glob.glob(os.path.join(DOCS, "sitemap*.xml")))
        self.assertNotIn("/guia-mossos/", sm)
        self.assertIn("/oposiciones/mossos-esquadra/examenes-oficiales/", sm)
        self.assertIn("/convocatorias/DOGC-1046460/", sm)

    def test_datos_del_test_solo_con_validas(self):
        d = json.load(open(os.path.join(DOCS, "datos", "mossos-esquadra.json"), encoding="utf-8"))
        self.assertTrue(d["privadas"]["guia-mossos"].startswith(G.MOSSOS))
        self.assertFalse([q for q in d["qs"] if q.get("verification_status") in ("REVIEW_REQUIRED", "OUTDATED", "DEPRECATED")])


if __name__ == "__main__":
    unittest.main()
