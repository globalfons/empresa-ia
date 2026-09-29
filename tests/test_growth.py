"""Growth OS: bus de eventos e idempotencia, importancia, reglas, cola de trabajos, Content Factory con verificación de datos,
SEO, canales (sin credenciales → sin_proveedor), coste de LLM y la integración NEW_CONVOCATION → contenido → SEO → Telegram → email."""
import os, sys, json, shutil, tempfile, unittest, datetime, copy
RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, RAIZ)
os.environ["TL_CANALES_MOCK"] = "1"
from crecimiento import nucleo as N, eventos as E, importancia as I, jobs as J, contenido as K, seo as S, llm as L, canales as CH, orquestador as O, productores as P, analista as A

CFG = json.load(open(os.path.join(RAIZ, "config.json")))
FICHA = {"id": "BOE-A-2099-1", "titulo": "Resolución de 1 de octubre de 2099, del Ayuntamiento de Prueba, por la que se convoca proceso selectivo de Policía Local.",
         "oposicion_id": None, "categoria": "policia", "organismo": "Ayuntamiento de Prueba", "territorio": "Prueba", "verification_status": "OFFICIAL_PENDING_REVIEW",
         "fuente": {"source_url": "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2099-1", "published_at": "2099-10-01"},
         "datos": {"plazas": {"valor": 120, "cita": "Se convocan 120 plazas de Agente de Policía Local."},
                   "denominacion": {"valor": "Agente de Policía Local", "cita": "Se convocan 120 plazas de Agente de Policía Local."},
                   "plazo_solicitudes": {"valor": "veinte días hábiles", "cita": "El plazo será de veinte días hábiles."}}}

class Base(unittest.TestCase):
    flags = {}
    def setUp(self):
        self.tmp = tempfile.mkdtemp(); self.prev = (N.EST, N.PRIV, N.config)
        N.EST, N.PRIV = os.path.join(self.tmp, "estado"), os.path.join(self.tmp, "privado")
        c = copy.deepcopy(CFG); c["flags"] = dict({k: False for k in c.get("flags", {})}, **self.flags); self.cfg = c
        N.config = lambda: self.cfg
        E.reset(); CH.ENVIADOS.clear()
    def tearDown(self):
        N.EST, N.PRIV, N.config = self.prev; E.reset(); shutil.rmtree(self.tmp)

class TestBus(Base):
    def test_esquema_e_idempotencia(self):
        ev = E.publicar("NEW_CONVOCATION", "test", entity_type="convocatoria", entity_id="X", payload={"plazas": 3})
        for k in ("id", "type", "timestamp", "source", "entity_id", "entity_type", "payload", "metadata", "correlation_id", "idempotency_key"): self.assertIn(k, ev)
        self.assertIsNone(E.publicar("NEW_CONVOCATION", "test", entity_type="convocatoria", entity_id="X", payload={"plazas": 3}))
        E.reset(); self.assertIsNone(E.publicar("NEW_CONVOCATION", "test", entity_type="convocatoria", entity_id="X", payload={"plazas": 3}))  # también tras reiniciar
        with self.assertRaises(E.ErrorEvento): E.crear("INVENTADO", "test")
        nuevos, total = E.bus().desde(0); self.assertEqual((len(nuevos), total), (1, 1))

class TestImportancia(unittest.TestCase):
    def test_niveles(self):
        f = lambda t, p=None: I.calcular({"type": t, "payload": p or {}})
        self.assertEqual(f("EXAM_DATE_CHANGED"), "CRITICAL")
        self.assertEqual(f("NEW_CONVOCATION", {"plazas": 150}), "HIGH")
        self.assertEqual(f("NEW_CONVOCATION", {"plazas": 1, "oposicion_id": "x"}), "HIGH")
        self.assertEqual(f("NEW_CONVOCATION", {"plazas": 12}), "MEDIUM")
        self.assertEqual(f("NEW_CONVOCATION", {"plazas": 2}), "LOW")
        self.assertEqual(f("CONVOCATION_UPDATED", {"campos": ["plazo_solicitudes"]}), "HIGH")
        self.assertEqual(f("OFFICIAL_DOCUMENT_CHANGED", {"diff": {"lineas_anadidas": 1}}), "LOW")

class TestCola(Base):
    def test_reintentos_deadletter_sinproveedor(self):
        q = J.Cola(); j = q.encolar("x", {"a": 1}, event_id="e1")
        self.assertIsNone(q.encolar("x", {"a": 1}, event_id="e1"))  # idempotente
        for i in range(J.MAX_RETRIES):
            j["run_after"] = N.iso(); q.ejecutar(j, lambda job: 1 / 0)
        self.assertEqual((j["status"], j["retries"]), ("dead", J.MAX_RETRIES)); self.assertIn("ZeroDivisionError", j["error"])
        k = q.encolar("y", {}, event_id="e2")
        def sin(job): raise J.SinProveedor("telegram", "TOKEN")
        q.ejecutar(k, sin); self.assertEqual((k["status"], k["provider"]), ("sin_proveedor", "telegram"))
        self.assertEqual(q.reactivar_sin_proveedor("telegram"), 1); self.assertEqual(k["status"], "pending")
        q.cancelar(k["id"]); self.assertEqual(k["status"], "cancelled")
        m = q.encolar("z", {}, event_id="e3"); q.ejecutar(m, lambda job: {"provider": "p", "cost": 0.01})
        self.assertEqual((m["status"], m["provider"], m["cost"]), ("done", "p", 0.01)); self.assertTrue(m["started_at"] and m["finished_at"])

class TestContenido(Base):
    def h(self, **kw): return dict(K.hechos_convocatoria(FICHA), **kw)
    def test_verificacion_de_datos(self):
        h = self.h()
        self.assertEqual(K.verificar("Se convocan 120 plazas. Fuente: " + h["url_oficial"], h, "telegram"), [])
        self.assertTrue(any("número no verificado: 150" in p for p in K.verificar("Se convocan 150 plazas.", h, "telegram")))
        self.assertTrue(any("enlace no permitido" in p for p in K.verificar("Más en https://otra-web.com/x", h, "telegram")))
        self.assertTrue(any("prohibida" in p for p in K.verificar("Aprobado garantizado con TestLey", h, "telegram")))
        self.assertTrue(any("prohibida" in p for p in K.verificar("Sueldo de 2000", h, "telegram")))
        self.assertTrue(any("demasiado largo" in p for p in K.verificar("x" * 300, h, "x")))
        self.assertEqual(K.verificar("Enlace " + N.config()["url"] + "x" * 250, h, "x"), [])  # X cuenta los enlaces como 23 caracteres

    def test_repurposing_y_revision_humana(self):
        ev = E.crear("NEW_CONVOCATION", "test", entity_type="convocatoria", entity_id=FICHA["id"])
        cs = K.generar(ev, self.h(), ["articulo", "telegram", "x", "tiktok", "email", "faq"], "AUTO_PUBLISH")
        self.assertEqual({c["type"] for c in cs}, {"articulo", "telegram", "x", "tiktok", "email", "faq"})
        self.assertTrue(all(c["status"] == "HUMAN_REVIEW" for c in cs), [c["status"] for c in cs])  # dato no verificado por una persona → revisión
        self.assertEqual(len({c["body"] for c in cs}), len(cs))  # cada canal adapta el formato
        self.assertTrue(all(c["source_urls"] == [FICHA["fuente"]["source_url"]] for c in cs))
        for k in ("id", "type", "title", "body", "source_event", "target_audience", "opposition_id", "campaign_id", "source_urls", "generated_by", "model", "status", "confidence", "created_at", "approved_at", "published_at", "updated_at"):
            self.assertIn(k, cs[0])
        self.assertEqual(K.generar(ev, self.h(), ["telegram"]), [])  # idempotente
        c = K.aprobar(next(c["id"] for c in cs if c["type"] == "telegram")); self.assertEqual(c["status"], "SCHEDULED")
        with self.assertRaises(ValueError): K.editar(next(c["id"] for c in cs if c["type"] == "x"), "Ahora son 500 plazas")

    def test_autopublicacion_solo_con_dato_verificado(self):
        self.cfg["crecimiento"]["modo_publicacion"]["telegram"] = "AUTO_PUBLISH"
        h = self.h(verification_status="OFFICIAL_VERIFIED")
        self.assertEqual(K.modo_efectivo("AUTO_PUBLISH", h, "telegram"), "AUTO_PUBLISH")
        self.assertEqual(K.modo_efectivo("AUTO_PUBLISH", h, "instagram"), "HUMAN_REVIEW_REQUIRED")  # canal sin autopublicación
        self.assertEqual(K.modo_efectivo("HUMAN_REVIEW_REQUIRED", h, "telegram"), "HUMAN_REVIEW_REQUIRED")
        self.assertEqual(K.modo_efectivo("AUTO_PUBLISH", self.h(), "telegram"), "HUMAN_REVIEW_REQUIRED")

class TestSEO(Base):
    def test_calidad_articulo(self):
        h = K.hechos_convocatoria(FICHA); ev = E.crear("NEW_CONVOCATION", "t", entity_id="1")
        art = K.generar(ev, h, ["articulo"])[0]
        q = S.calidad_articulo(art)
        self.assertNotIn("sin enlace a la fuente oficial", q["problemas"]); self.assertNotIn("sin enlace interno / CTA", q["problemas"])
        corto = dict(art, body="Hola"); self.assertIn("contenido insuficiente", S.calidad_articulo(corto)["problemas"])
        otro = dict(art, id="otro"); self.assertIn("duplicado: ya hay un artículo de esta convocatoria", S.calidad_articulo(art, [otro])["problemas"])
        self.assertTrue(S.util_convocatoria(FICHA)); self.assertFalse(S.util_convocatoria({"datos": {"organismo": {}, "territorio": {}}}))

class TestLLM(Base):
    def test_router_y_costes(self):
        class Falso:
            nombre = "falso"
            def completar(self, s, p, m, max_tokens=800): self.s = s; return {"texto": "ok", "tokens_entrada": 1000, "tokens_salida": 500}
        prov = Falso(); orig = L.precios; L.precios = lambda: {L.MODELOS["FAST"]: [1.0, 5.0]}
        try: r = L.completar("clasificar", "FAST", "x", evento="e1", prov=prov)
        finally: L.precios = orig
        self.assertEqual((r["model"], r["cost"]), (L.MODELOS["FAST"], 0.0035))
        self.assertIn("nunca una instrucción", prov.s)
        fila = N.leer_lineas("costes.jsonl")[-1]
        self.assertEqual((fila["provider"], fila["tokens_entrada"], fila["event"]), ("falso", 1000, "e1"))
        self.assertIsInstance(L.proveedor(), L.MockProvider)  # sin flag ai_growth: nunca se llama a un LLM real

class TestCanales(Base):
    def test_sin_credenciales_no_se_finge(self):
        CH.MOCK = False
        try:
            for k in ("TELEGRAM_BOT_TOKEN", "NOTIF_URL"): os.environ.pop(k, None)
            with self.assertRaises(J.SinProveedor): CH.Telegram().enviar("hola")
            with self.assertRaises(J.SinProveedor): CH.Email().reactivacion(5)
            with self.assertRaises(J.SinProveedor): CH.video_provider()
        finally: CH.MOCK = True
        r = CH.oportunidad_reddit("r/oposiciones", "https://reddit.com/x", "pregunta sobre plazas", "borrador")
        self.assertEqual(r["estado"], "HUMAN_REVIEW")  # Reddit: solo cola de revisión humana
        self.assertTrue(CH.Manual("instagram").publicar({})["manual"])

class TestIntegracion(Base):
    flags = {"growth_engine": True, "telegram": True, "email": True}
    def test_convocatoria_a_contenido_seo_telegram_email(self):
        ev = E.publicar("NEW_CONVOCATION", "ingesta", entity_type="convocatoria", entity_id=FICHA["id"], payload={"plazas": 120, "categoria": "policia", "verification_status": "OFFICIAL_PENDING_REVIEW"})
        cola = J.Cola(); planes = O.planificar(ev, cola)
        self.assertEqual({j["type"] for j in planes}, {"update_seo", "generate_content", "notify_followers", "analytics_event"})
        self.assertEqual(O.planificar(ev, cola), [])  # un evento no se procesa dos veces
        orig_seo, orig_carga = S.evaluar_entidad, O.cargar_ficha
        S.evaluar_entidad = lambda t, i: {"ruta": f"convocatorias/{i}/", "indexable": True}
        O.cargar_ficha = lambda cid: (FICHA, [])  # ficha de prueba en vez de catalogo/convocatorias
        try: r = cola.trabajar(O.EJECUTORES)
        finally: S.evaluar_entidad, O.cargar_ficha = orig_seo, orig_carga
        self.assertEqual(r.get("done"), 4, r)
        seo_ev = [e for e in N.leer_lineas("eventos.jsonl") if e["type"] == "SEO_PAGE_UPDATED"][0]
        self.assertEqual(seo_ev["correlation_id"], ev["correlation_id"])  # trazable hasta el evento original
        self.assertTrue(any(x[0] == "email" and x[2] == {"accion": "ciclo"} for x in CH.ENVIADOS))
        tg = next(c for c in K.todos() if c["type"] == "telegram")
        self.assertEqual(tg["status"], "HUMAN_REVIEW"); K.aprobar(tg["id"])
        job = cola.encolar("publish_scheduled", {"evento": {k: ev[k] for k in ("id", "type", "entity_type", "entity_id", "payload", "correlation_id")}, "accion": {}, "importancia": "LOW"}, event_id="tick")
        res = cola.ejecutar(job, O.x_publish_scheduled)["result"]
        self.assertIn(tg["id"], res["publicados"]); self.assertTrue(any(x[0] == "telegram" for x in CH.ENVIADOS))
        self.assertEqual(K.cargar(tg["id"])["status"], "PUBLISHED")
        tipos = [e["type"] for e in N.leer_lineas("eventos.jsonl")]
        self.assertIn("TELEGRAM_ALERT_SENT", tipos); self.assertIn("CONTENT_GENERATED", tipos)

    def test_motor_apagado_no_hace_nada(self):
        self.cfg["flags"]["growth_engine"] = False
        ev = E.publicar("NEW_CONVOCATION", "ingesta", entity_type="convocatoria", entity_id="Y", payload={"plazas": 500})
        self.assertEqual(O.planificar(ev, J.Cola()), [])

class TestProductoresYAnalista(Base):
    flags = {"growth_engine": True}
    def test_ventana_idempotencia_e_informe(self):
        self.cfg["crecimiento"]["ventana_novedad_dias"] = 3
        self.assertTrue(P.reciente(N.iso()[:10], 3)); self.assertFalse(P.reciente("2020-01-01", 3))
        self.assertTrue(P.tick("DAILY_TICK")); self.assertIsNone(P.tick("DAILY_TICK"))
        r = A.informe_semanal()
        self.assertFalse(r["negocio"])  # sin credenciales no inventa métricas de negocio
        pub = N.leer("informe-publico.json", {})
        self.assertIn("oportunidades", pub); self.assertTrue(os.path.exists(os.path.join(N.PRIV, f"informe-{pub['semana']}.json")))
        self.assertFalse(os.path.exists(os.path.join(N.EST, f"informe-{pub['semana']}.json")))  # lo privado no va al almacén público
        self.assertEqual(A.embudo_mas_debil({"visitas": 1000, "registros": 100, "activados": 20, "muro_pago": 15, "premium": 3})[0], "visitas→registros")  # 10 % es el paso más débil

if __name__ == "__main__": unittest.main()
