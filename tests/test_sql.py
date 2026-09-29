"""Tests del esquema de Supabase contra un PostgreSQL real (con un stub mínimo de auth: tests/sql/stub_supabase.sql).
Requiere TL_PG="-h /tmp -p 5499 -U postgres" (o se salta). Cada ejecución crea y borra su propia base de datos."""
import os, subprocess, unittest, uuid, json

PG = os.environ.get("TL_PG")
RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB = f"tl_test_{os.getpid()}"

def psql(sql, db=DB, rol=None, uid=None, check=True):
    pre = ""
    if rol:
        pre = f"select set_config('request.jwt.claim.sub', '{uid or ''}', false); select set_config('request.jwt.claim.role', '{rol}', false); set role {rol if rol != 'admin' else 'authenticated'};\n"
    p = subprocess.run(["psql", *PG.split(), "-d", db, "-v", "ON_ERROR_STOP=1", "-Atq"], input=pre + sql, capture_output=True, text=True)
    if check and p.returncode: raise RuntimeError(p.stderr.strip())
    return p.stdout.strip().splitlines()[-1] if p.stdout.strip() else ""

def falla(sql, **kw):
    try: psql(sql, **kw)
    except RuntimeError as e: return str(e)
    return None

@unittest.skipUnless(PG, "sin PostgreSQL local (TL_PG)")
class TestEsquema(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        psql(f"create database {DB}", db="postgres")
        for f in ("tests/sql/stub_supabase.sql", "supabase/esquema.sql"):
            subprocess.run(["psql", *PG.split(), "-d", DB, "-v", "ON_ERROR_STOP=1", "-q", "-f", os.path.join(RAIZ, f)], check=True, capture_output=True)
        cls.A, cls.B, cls.ADM = (str(uuid.uuid4()) for _ in range(3))
        psql(f"insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data) values ('{cls.A}', 'a@x.es', now(), '{{\"alias\":\"usuaria_a\"}}'),"
             f" ('{cls.B}', 'b@x.es', now(), '{{\"alias\":\"usuario_b\"}}'), ('{cls.ADM}', 'adm@x.es', now(), '{{}}'); insert into public.admins values ('{cls.ADM}');")
    @classmethod
    def tearDownClass(cls):
        psql(f"drop database if exists {DB} with (force)", db="postgres")

    def test_eventos_anonimos_validados(self):
        anon = "a" * 20
        self.assertEqual(psql(f"select public.registrar_evento('PAGE_VIEW', '{{}}', '{anon}')", rol="anon"), "t")
        self.assertIn("tipo no permitido", falla(f"select public.registrar_evento('SUBSCRIPTION_STARTED', '{{}}', '{anon}')", rol="anon"))
        self.assertIn("requiere sesión", falla(f"select public.registrar_evento('USER_REGISTERED', '{{}}', '{anon}')", rol="anon"))
        self.assertIn("anon_id inválido", falla("select public.registrar_evento('PAGE_VIEW', '{}', 'X; drop table x')", rol="anon"))
        grande = json.dumps({"x": "y" * 3000})
        self.assertIn("demasiado grande", falla(f"select public.registrar_evento('PAGE_VIEW', '{grande}', '{anon}')", rol="anon"))
        self.assertIn("permission denied", falla("select count(*) from public.eventos", rol="anon"))
        self.assertIn("permission denied", falla("select count(*) from public.eventos", rol="authenticated", uid=self.A))

    def test_idempotencia_y_limite(self):
        anon = "b" * 20
        for _ in range(3): psql(f"select public.registrar_evento('USER_ACTIVATED', '{{}}', '{anon}', '{{}}', 'activacion')", rol="authenticated", uid=self.A)
        self.assertEqual(psql(f"select count(*) from public.eventos where anon_id = '{anon}' and type = 'USER_ACTIVATED'"), "1")
        anon2 = "c" * 20
        psql(f"insert into public.eventos (type, anon_id, ts) select 'PAGE_VIEW', '{anon2}', now() from generate_series(1, 300)")
        self.assertEqual(psql(f"select public.registrar_evento('PAGE_VIEW', '{{}}', '{anon2}')", rol="anon"), "f")

    def test_aislamiento_progreso(self):
        psql(f"insert into public.progreso (user_id, ley, datos) values ('{self.A}', 'ley-39-2015', '{{}}'), ('{self.B}', 'ley-39-2015', '{{}}') on conflict do nothing")
        self.assertEqual(psql("select count(*) from public.progreso", rol="authenticated", uid=self.A), "1")
        self.assertEqual(psql(f"select count(*) from public.progreso where user_id = '{self.B}'", rol="authenticated", uid=self.A), "0")
        self.assertIn("row-level security", falla(f"insert into public.progreso (user_id, ley, datos) values ('{self.B}', 'constitucion', '{{}}')", rol="authenticated", uid=self.A))

    def test_entitlement_servidor(self):
        mi = lambda: json.loads(psql("select public.mi_plan()", rol="authenticated", uid=self.A))["plan"]
        psql("delete from public.suscripciones")
        self.assertEqual(mi(), "free")
        psql(f"insert into public.suscripciones (id, user_id, email, status) values ('s1', '{self.A}', 'a@x.es', 'on_trial')")
        self.assertEqual(mi(), "premium")
        psql("update public.suscripciones set status = 'cancelled', ends_at = now() + interval '3 days'"); self.assertEqual(mi(), "premium")
        psql("update public.suscripciones set status = 'expired', ends_at = now() - interval '1 day'"); self.assertEqual(mi(), "free")
        # Por email (compra hecha sin sesión): solo si el email de la cuenta está confirmado
        psql("update public.suscripciones set status = 'active', user_id = null, email = 'A@x.es'"); self.assertEqual(mi(), "premium")
        psql(f"update auth.users set email_confirmed_at = null where id = '{self.A}'"); self.assertEqual(mi(), "free")
        psql(f"update auth.users set email_confirmed_at = now() where id = '{self.A}'")
        self.assertEqual(psql("select count(*) from public.suscripciones", rol="authenticated", uid=self.B), "0")
        self.assertIn("permission denied", falla("insert into public.suscripciones (id, email, status) values ('x', 'b@x.es', 'active')", rol="authenticated", uid=self.B))

    def test_referidos_antifraude(self):
        cod = psql("select public.mi_codigo_referido()", rol="authenticated", uid=self.A)
        self.assertEqual(psql("select public.mi_codigo_referido()", rol="authenticated", uid=self.A), cod)  # estable
        self.assertEqual(psql(f"select public.registrar_referido('{cod}')", rol="authenticated", uid=self.A), "autorreferido")
        self.assertEqual(psql("select public.registrar_referido('noexiste')", rol="authenticated", uid=self.B), "codigo_desconocido")
        self.assertEqual(psql(f"select public.registrar_referido('{cod}')", rol="authenticated", uid=self.B), "registrado")
        psql(f"select public.registrar_referido('{cod}')", rol="authenticated", uid=self.B)
        self.assertEqual(psql(f"select count(*) from public.referidos where referred = '{self.B}'"), "1")
        # mismo dispositivo que quien refiere → rechazado
        C = str(uuid.uuid4()); psql(f"insert into auth.users (id, email) values ('{C}', 'c@x.es'); insert into public.eventos (type, anon_id, user_id) values ('PAGE_VIEW', '{'d' * 20}', '{self.A}')")
        self.assertEqual(psql(f"select public.registrar_referido('{cod}', '{'d' * 20}')", rol="authenticated", uid=C), "rechazado")
        # cuenta antigua → no cuenta
        D = str(uuid.uuid4()); psql(f"insert into auth.users (id, email, created_at) values ('{D}', 'd@x.es', now() - interval '10 days')")
        self.assertEqual(psql(f"select public.registrar_referido('{cod}')", rol="authenticated", uid=D), "cuenta_antigua")
        self.assertEqual(json.loads(psql("select public.mis_referidos()", rol="authenticated", uid=self.A))["registrados"], 1)

    def test_metricas_solo_admin(self):
        self.assertIn("solo administradores", falla("select public.admin_metricas(30)", rol="authenticated", uid=self.B))
        m = json.loads(psql("select public.admin_metricas(30)", rol="admin", uid=self.ADM))
        self.assertIn("embudo", m); self.assertIn("mrr_eur", m)
        self.assertIn("embudo", json.loads(psql("select public.admin_metricas(7)", rol="service_role")))
        # Conversión por pieza de contenido y campaña (utm_content/utm_campaign del Growth OS, last touch)
        attr = json.dumps({"attr": {"last": {"utm_campaign": "convocatorias-2026-10", "utm_content": "telegram-BOE-A-1-abc"}}})
        psql(f"insert into public.eventos (type, anon_id, user_id, metadata) values ('LANDING_VISIT', '{'e' * 20}', null, '{attr}'), ('USER_REGISTERED', '{'e' * 20}', '{self.B}', '{attr}')")
        m = json.loads(psql("select public.admin_metricas(30)", rol="admin", uid=self.ADM))
        pc = next(x for x in m["por_contenido"] if x["contenido"] == "telegram-BOE-A-1-abc")
        self.assertEqual((pc["visitas"], pc["registros"], pc["premium"]), (1, 1, 0))
        self.assertEqual(next(x for x in m["por_campana"] if x["campana"] == "convocatorias-2026-10")["registros"], 1)
        self.assertIn("solo administradores", falla("select * from public.admin_leads(5)", rol="authenticated", uid=self.B))
        self.assertIn("solo servicio", falla("select * from public.detectar_inactivos(5)", rol="admin", uid=self.ADM))

    def test_retencion_inactivos(self):
        E = str(uuid.uuid4())
        psql(f"insert into auth.users (id, email, created_at) values ('{E}', 'e@x.es', now() - interval '20 days');"
             f"insert into public.progreso (user_id, ley, datos, actualizado) values ('{E}', 'constitucion', '{{}}', now() - interval '5 days')")
        filas = psql("select count(*) from public.detectar_inactivos(5) where email = 'e@x.es'", rol="service_role")
        self.assertEqual(filas, "1")
        psql("select count(*) from public.detectar_inactivos(5)", rol="service_role")  # segunda vez: el evento no se duplica
        self.assertEqual(psql(f"select count(*) from public.eventos where type = 'USER_INACTIVE' and user_id = '{E}'"), "1")

if __name__ == "__main__": unittest.main()
