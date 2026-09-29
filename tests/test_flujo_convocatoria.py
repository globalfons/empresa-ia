"""Flujo completo NUEVA CONVOCATORIA: detección → vínculo con la oposición del catálogo → evento → propuesta de actualización
(HUMAN_REVIEW, nunca se aplica sola) + SEO + contenido (Telegram, email, social en revisión) + analítica.
Idempotencia: la misma convocatoria dos veces no se duplica; reintentar trabajos no duplica nada; la misma convocatoria desde otra web
oficial se fusiona como fuente adicional."""
import os, sys, json, shutil, tempfile, unittest, copy
RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, RAIZ); sys.path.insert(0, os.path.join(RAIZ, "catalogo")); sys.path.insert(0, os.path.join(RAIZ, "ingesta"))
os.environ["TL_CANALES_MOCK"] = "1"
import vinculos as V
from crecimiento import nucleo as N, eventos as E, jobs as J, contenido as K, orquestador as O, seo as S, canales as CH, analista as A

OP = {"id": "policia-nacional-escala-basica", "nombre": "Policía Nacional, Escala Básica", "categoria": "policia",
      "fuentes": {"convocatoria": {"id": "BOE-A-2026-15055", "titulo": "Resolución de 7 de julio de 2026", "url": "https://www.boe.es/x"}},
      "oficial": {"plazas": {"valor": 2704, "fuente": "convocatoria", "cita": "Se convocan 2.704 plazas"}},
      "vigilancia": {"grupos": [["Escala Básica", "Policía Nacional"]]}}
NUEVA = {"id": "BOE-A-2027-12345", "titulo": "Resolución de 6 de julio de 2027, de la Dirección General de la Policía, por la que se convoca oposición libre para el ingreso en la Escala Básica de la Policía Nacional.",
         "categoria": "policia", "oposicion_id": "policia-nacional-escala-basica", "verification_status": "OFFICIAL_PENDING_REVIEW", "organismo": "Dirección General de la Policía",
         "fuente": {"source_url": "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2027-12345", "published_at": "2027-07-08"},
         "datos": {"plazas": {"valor": 3000, "cita": "Se convocan 3.000 plazas de la Escala Básica.", "verification_status": "OFFICIAL_PENDING_REVIEW"},
                   "plazo_solicitudes": {"valor": "veinte días naturales", "cita": "El plazo será de veinte días naturales.", "verification_status": "OFFICIAL_PENDING_REVIEW"}}}

class TestVinculos(unittest.TestCase):
    def test_relaciones(self):
        f = lambda i, t: [(x["oposicion"], x["relacion"]) for x in V.vincular(i, t, [OP])]
        self.assertEqual(f("BOE-A-2026-15055", "cualquier título"), [(OP["id"], "misma_convocatoria")])
        self.assertEqual(f("X", NUEVA["titulo"]), [(OP["id"], "nueva_convocatoria")])
        self.assertEqual(f("X", "Resolución … por la que se publica la relación de aspirantes que han superado el proceso selectivo para ingreso en la Escala Básica de la Policía Nacional"), [(OP["id"], "mismo_cuerpo")])
        self.assertEqual(f("X", "Resolución … por la que se aprueba la lista de admitidos, Escala Básica de la Policía Nacional"), [(OP["id"], "mismo_cuerpo")])
        self.assertEqual(f("X", "convocatoria de Policía Local de Galicia, Escala Básica"), [])

class TestFlujo(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp(); self.prev = (N.EST, N.PRIV, N.config, O.cargar_ficha)
        N.EST, N.PRIV = os.path.join(self.tmp, "e"), os.path.join(self.tmp, "p")
        cfg = copy.deepcopy(json.load(open(os.path.join(RAIZ, "config.json")))); cfg["flags"] = {"growth_engine": True, "telegram": True, "email": True}
        N.config = lambda: cfg
        O.cargar_ficha = lambda cid: (NUEVA, [OP])
        self.seo = S.evaluar_entidad; S.evaluar_entidad = lambda t, i: {"ruta": f"convocatorias/{i}/", "indexable": True}
        E.reset(); CH.ENVIADOS.clear()
    def tearDown(self):
        N.EST, N.PRIV, N.config, O.cargar_ficha = self.prev; S.evaluar_entidad = self.seo; E.reset(); shutil.rmtree(self.tmp)

    def publicar(self):
        return E.publicar("NEW_CONVOCATION", "ingesta", entity_type="convocatoria", entity_id=NUEVA["id"], idempotency_key="NEW_CONVOCATION:" + NUEVA["id"],
                          payload={"plazas": 3000, "categoria": "policia", "oposicion_id": OP["id"], "relacion": "nueva_convocatoria", "verification_status": "OFFICIAL_PENDING_REVIEW"})

    def test_flujo_completo_e_idempotencia(self):
        ev = self.publicar(); self.assertIsNotNone(ev)
        self.assertIsNone(self.publicar())  # la misma convocatoria detectada otra vez: no se duplica
        cola = J.Cola(); planes = O.planificar(ev, cola)
        self.assertEqual({j["type"] for j in planes}, {"update_opposition", "update_seo", "generate_content", "notify_followers", "analytics_event"})
        r = cola.trabajar(O.EJECUTORES); self.assertEqual(r, {"done": 5}, r)
        prop = json.load(open(os.path.join(N.EST, "actualizaciones", f"{OP['id']}--{NUEVA['id']}.json")))
        self.assertEqual(prop["estado"], "HUMAN_REVIEW")  # nunca se aplica sola
        plz = next(c for c in prop["cambios"] if c["campo"] == "plazas")
        self.assertEqual((plz["actual"], plz["nuevo"], plz["cambia"]), (2704, 3000, True)); self.assertIn("3.000", plz["cita_nueva"])
        cs = K.todos()
        self.assertTrue({"articulo", "telegram", "email", "x", "instagram", "tiktok", "faq"} <= {c["type"] for c in cs})
        self.assertTrue(all(c["status"] in ("HUMAN_REVIEW", "REJECTED") for c in cs))  # dato no verificado por una persona: nada se publica solo
        self.assertTrue(any(c["type"] == "telegram" and c["status"] == "HUMAN_REVIEW" for c in cs))
        tipos = [e["type"] for e in N.leer_lineas("eventos.jsonl")]
        for t in ("OPPOSITION_UPDATE_PROPOSED", "SEO_PAGE_UPDATED", "CONTENT_GENERATED", "EMAIL_SENT"): self.assertIn(t, tipos)
        self.assertEqual(len({e["correlation_id"] for e in N.leer_lineas("eventos.jsonl")}), 1)  # todo trazable al mismo evento
        self.assertEqual(N.leer("contadores.json", {}).popitem()[1].get("NEW_CONVOCATION"), 1)  # analítica registrada
        # Reintentos: volver a ejecutar las mismas acciones no duplica propuesta ni contenidos
        n_cont = len(cs)
        for j in cola.jobs.values(): cola.reintentar(j["id"])
        cola.trabajar(O.EJECUTORES)
        self.assertEqual(len(K.todos()), n_cont)
        self.assertEqual(len(os.listdir(os.path.join(N.EST, "actualizaciones"))), 1)
        self.assertEqual(O.planificar(ev, cola), [])  # el evento no se vuelve a planificar

    def test_fallo_y_reintento_sin_duplicados(self):
        ev = self.publicar(); cola = J.Cola(); O.planificar(ev, cola)
        falla = {"n": 0}; real = O.EJECUTORES["generate_content"]
        def a_medias(job):  # genera los contenidos y luego falla (p. ej. se cae la red)
            real(job); falla["n"] += 1; raise ConnectionError("red caída")
        O.EJECUTORES["generate_content"] = a_medias
        try: cola.trabajar(O.EJECUTORES)
        finally: O.EJECUTORES["generate_content"] = real
        j = next(x for x in cola.jobs.values() if x["type"] == "generate_content")
        self.assertEqual((j["status"], j["retries"]), ("failed", 1))
        n = len(K.todos()); cola.reintentar(j["id"]); cola.trabajar(O.EJECUTORES)
        self.assertEqual(j["status"], "done"); self.assertEqual(len(K.todos()), n)

    def test_candidatas_de_catalogo(self):
        convs = [{"id": f"BOE-A-2026-{i}", "categoria": "policia", "datos": {"denominacion": {"valor": "Agente de Policía Local" if i % 2 else "agente/a de la Policía Local"}}} for i in range(20)]
        c = A.candidatas(convs, set(), minimo=15)
        self.assertEqual((c[0]["tipo_plaza"], c[0]["convocatorias"]), ("agente policia local", 20))
        self.assertEqual(A.candidatas(convs[:5], set(), minimo=15), [])

class TestFusionFuentes(unittest.TestCase):
    def test_misma_convocatoria_en_otra_web_se_fusiona(self):
        import extraer as X
        tmp = tempfile.mkdtemp(); prev = X.SALIDA; X.SALIDA = tmp
        try:
            json.dump({"id": "BOE-A-2026-15055", "datos": {}}, open(os.path.join(tmp, "BOE-A-2026-15055.json"), "w"))
            doc = {"domain": "www.policia.es", "url": "https://www.policia.es/convocatoria.pdf", "titulo": "Convocatoria Escala Básica", "retrieved_at": "t", "fuente": "policia-nacional"}
            texto = "Bases publicadas en el BOE (BOE-A-2026-15055) de 10 de julio."
            f = X.fusionar_si_duplicada(doc, texto); X.fusionar_si_duplicada(doc, texto)
            extra = json.load(open(os.path.join(tmp, "BOE-A-2026-15055.json")))["fuentes_adicionales"]
            self.assertEqual(len(extra), 1); self.assertEqual(extra[0]["source_domain"], "www.policia.es")
            self.assertEqual(len(os.listdir(tmp)), 1)  # ninguna ficha nueva
            self.assertIsNone(X.fusionar_si_duplicada(dict(doc, domain="www.boe.es"), texto))
            self.assertIsNone(X.fusionar_si_duplicada(doc, "sin referencia al BOE"))
        finally: X.SALIDA = prev; shutil.rmtree(tmp)

if __name__ == "__main__": unittest.main()
