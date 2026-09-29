"""Fábrica de preguntas: validación, dificultad, duplicados, selección, circuito completo (proveedor simulado, sin API),
continuidad, pausa automática, modo de prueba, secretos y workflow."""
import glob, hashlib, json, os, shutil, subprocess, sys, tempfile, unittest

R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, R)
from fabrica import fuente as F, validacion as V, banco as B, generador as G  # noqa: E402

CFG = json.load(open(os.path.join(R, "fabrica", "config.json")))
HAY_BUILD = os.path.exists(os.path.join(R, "docs", "datos", "cobertura.json"))


def buena(**cambios):
    q = {"tipo": "literal", "dif": 1, "q": "Según la Constitución, ¿cuáles son los valores superiores del ordenamiento jurídico?",
         "o": ["La libertad, la justicia, la igualdad y el pluralismo político", "La libertad, la seguridad, la igualdad y la unidad",
               "La justicia, la solidaridad, la legalidad y el pluralismo", "La dignidad, la igualdad, la libertad y la democracia"],
         "a": 0, "cita": "la libertad, la justicia, la igualdad y el pluralismo político", "apartado": "1",
         "exp": "Según el artículo 1 de la Constitución, los valores superiores son la libertad, la justicia, la igualdad y el pluralismo político.",
         "confianza": "alta"}
    q.update(cambios)
    return q


class TestValidacion(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.fu = F.Fuentes()
        cls.ce = cls.fu.ley("constitucion")

    def estados(self, q, n="1", tema=None):
        return [e for e, _ in V.comprobar(q, self.ce, n, tema, CFG)]

    def test_pregunta_correcta_sin_problemas(self):
        self.assertEqual(V.comprobar(buena(), self.ce, "1", {"1", "2"}, CFG), [])

    def test_rechazos_objetivos(self):
        casos = {
            "cita no literal": buena(cita="los valores superiores son la paz y la concordia entre pueblos"),
            "cita cortada": buena(cita="a libertad, la justicia, la igualdad"),
            "opción que remite a otras": buena(o=["Todas las anteriores", "La libertad", "La justicia", "La igualdad"]),
            "correcta muy larga": buena(o=["La libertad, la justicia, la igualdad y el pluralismo político como valores", "Paz", "Orden", "Unidad"]),
            "respuesta en el enunciado": buena(q="¿Son la libertad, la justicia, la igualdad y el pluralismo político los valores superiores?"),
            "explicación sin artículo": buena(exp="Los valores superiores son la libertad, la justicia, la igualdad y el pluralismo político."),
            "tipo desconocido": buena(tipo="adivinanza"),
            "se presenta como oficial": buena(q="Pregunta de examen oficial: ¿cuáles son los valores superiores del ordenamiento?"),
            "schema": buena(o="no es una lista"),
        }
        for nombre, q in casos.items():
            self.assertIn("REJECTED", self.estados(q), nombre)

    def test_articulo_fuera_del_tema_o_sin_vigencia(self):
        self.assertIn("REJECTED", self.estados(buena(), tema={"2", "3"}))
        cp = self.fu.ley("codigo-penal")
        self.assertFalse(cp.vigente("183ter"))  # sin vigencia (LO 10/2022): nunca se genera sobre él
        self.assertEqual(cp.capacidad("183ter", CFG), 0)

    def test_dudas_a_revision(self):
        self.assertEqual(self.estados(buena(confianza="media")), ["REVIEW_REQUIRED"])
        self.assertIn("REVIEW_REQUIRED", self.estados(buena(tipo="caso_practico", dif=3)))

    def test_dificultad_por_criterios(self):
        self.assertEqual(V.dificultad(buena(tipo="literal", dif=3), CFG), 1)  # el modelo no puede inflarla
        self.assertEqual(V.dificultad(buena(tipo="caso_practico", dif=1), CFG), 3)
        self.assertEqual(V.dificultad(buena(tipo="excepcion", dif=3, q="¿Qué NO corresponde salvo cuando y si procede y aunque?"), CFG), 3)
        self.assertEqual(V.dificultad(buena(tipo="excepcion", dif=3, q="¿Cuál es el plazo general?"), CFG), 2)


class TestDuplicados(unittest.TestCase):
    def test_exacto_reordenado_lexico_y_sospecha(self):
        e = dict(buena(), id="constitucion-0")
        self.assertEqual(V.duplicado(buena(), [e], CFG)[0], "exacto")
        re_ord = buena(o=list(reversed(buena()["o"])), a=3)
        self.assertEqual(V.duplicado(re_ord, [e], CFG)[0], "exacto")  # mismas opciones en otro orden
        casi = buena(q="Según la Constitución, ¿cuáles son los valores superiores del ordenamiento jurídico español?")
        self.assertEqual(V.duplicado(casi, [e], CFG)[0], "lexico")
        sin = buena(q="¿Qué valores propugna como superiores el Estado social y democrático de Derecho según la Constitución?")
        self.assertEqual(V.duplicado(sin, [e], CFG)[0], "sospecha")  # sinónimos: lo decide el juez semántico
        otra = buena(q="¿Qué forma política tiene el Estado español?", o=["Monarquía parlamentaria", "República", "Monarquía absoluta", "Federal"])
        self.assertIsNone(V.duplicado(otra, [e], CFG)[0])


@unittest.skipUnless(HAY_BUILD, "requiere docs/datos (build)")
class TestCircuito(unittest.TestCase):
    """Circuito completo sobre una copia temporal del repositorio con el proveedor simulado (sin API ni coste)."""

    def setUp(self):
        self.t = tempfile.mkdtemp()
        for d in ("datos", "scripts", "fabrica"):
            shutil.copytree(os.path.join(R, d), os.path.join(self.t, d), ignore=shutil.ignore_patterns("estado", "__pycache__", "versiones"))
        os.makedirs(os.path.join(self.t, "catalogo"))
        for f in ("oposiciones.json", "normas_base.json", "temas_ambito.json"):
            shutil.copy(os.path.join(R, "catalogo", f), os.path.join(self.t, "catalogo", f))
        os.makedirs(os.path.join(self.t, "docs", "datos"))
        for f in glob.glob(os.path.join(R, "docs", "datos", "*.json")):
            if os.path.basename(f) == "cobertura.json" or os.path.basename(f).startswith(("age-", "policia-", "guardia-")):
                shutil.copy(f, os.path.join(self.t, "docs", "datos"))

    def tearDown(self):
        shutil.rmtree(self.t)

    def run_motor(self, *args, env=None):
        e = dict(os.environ, **(env or {}))
        e.pop("ANTHROPIC_API_KEY", None) if env is None else None
        return subprocess.run([sys.executable, "-m", "fabrica.motor", "--oposicion", "auxiliar-administrativo-age", *args],
                              cwd=self.t, capture_output=True, text=True, env=e)

    def huellas(self):
        return {f: hashlib.sha1(open(f, "rb").read()).hexdigest() for f in glob.glob(os.path.join(self.t, "datos", "**", "*.json"), recursive=True)}

    def test_dry_run_no_toca_nada(self):
        antes = self.huellas()
        r = self.run_motor("--dry-run", "--lotes", "2", "--informe", os.path.join(self.t, "plan.json"))
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertEqual(antes, self.huellas())
        plan = json.load(open(os.path.join(self.t, "plan.json")))
        self.assertEqual(plan["modo"], "dry-run")
        self.assertTrue(plan["lotes"] and plan["lotes"][0]["preguntas"] <= 10)

    def test_sin_clave_no_genera(self):
        r = self.run_motor("--lotes", "1")
        self.assertNotEqual(r.returncode, 0)
        self.assertIn("ANTHROPIC_API_KEY", r.stdout + r.stderr)

    def test_lote_simulado_trazable_ids_y_continuidad(self):
        ids_antes = {slug: [q["id"] for q in json.load(open(os.path.join(self.t, "datos", f"preguntas-{slug}.json")))] for slug in ("ley-19-2013", "lo-3-2018", "ley-40-2015")}
        r = self.run_motor("--simulado", "--lote", "10", "--lotes", "2", "--objetivo", "20")
        self.assertEqual(r.returncode, 0, r.stdout + r.stderr)
        r2 = self.run_motor("--simulado", "--lote", "10", "--lotes", "1", "--objetivo", "10")  # continuación
        self.assertEqual(r2.returncode, 0, r2.stdout + r2.stderr)
        man = json.load(open(os.path.join(self.t, "datos", "ids-congelados.json")))["leyes"]
        nuevas, firmas = 0, set()
        for slug, antes in ids_antes.items():
            qs = json.load(open(os.path.join(self.t, "datos", f"preguntas-{slug}.json")))
            self.assertEqual([q["id"] for q in qs[:len(antes)]], antes)  # congeladas intactas
            for i, q in enumerate(qs):
                self.assertEqual(q["id"], f"{man[slug]['prefijo']}-{i}")
            for q in qs[len(antes):]:
                nuevas += 1
                self.assertNotIn("verification_status", q)
                for k in ("art", "cita", "fuente_url", "verificada_contra", "verificada_el", "tipo", "dif", "exp", "modelo", "lote", "tema_objetivo"):
                    self.assertTrue(q.get(k), f"{q['id']}: falta {k}")
                self.assertEqual(q["procedencia"], "TESTLEY_GENERATED")
                firma = (slug, q["art"], q["q"])
                self.assertNotIn(firma, firmas); firmas.add(firma)
        self.assertGreaterEqual(nuevas, 20)
        estado = json.load(open(os.path.join(self.t, "fabrica", "estado", "estado.json")))
        self.assertEqual([x["id"] for x in estado["lotes"]], ["L00001", "L00002", "L00003"])
        m = json.load(open(os.path.join(self.t, "fabrica", "estado", "metricas.json")))
        for k in ("questions_total", "questions_valid", "questions_review", "questions_rejected", "coverage_by_opposition",
                  "coverage_by_law", "coverage_by_article", "duplicate_rate", "validation_rate", "rejection_rate",
                  "generation_cost", "generation_tokens", "generation_time"):
            self.assertIn(k, m)
        # los tipos de alto riesgo nunca entran directos: quedan en la cola, sin publicar
        for f in glob.glob(os.path.join(self.t, "datos", "candidatas", "*.json")):
            for q in json.load(open(f)):
                self.assertIn(q["verification_status"], ("REVIEW_REQUIRED", "REJECTED"))
        for f in glob.glob(os.path.join(self.t, "datos", "preguntas-*.json")):
            for q in json.load(open(f)):
                self.assertNotIn(q.get("tipo"), ("caso_practico", "relacion_articulos"))

    def test_pausa_por_rechazo_y_reanudacion(self):
        r = self.run_motor("--simulado", "--simulado-fallos", "0.5", "--lote", "10", "--lotes", "3")
        self.assertEqual(r.returncode, 3, r.stdout + r.stderr)
        self.assertIn("GENERATION_PAUSED", r.stdout)
        estado = json.load(open(os.path.join(self.t, "fabrica", "estado", "estado.json")))
        self.assertEqual(len(estado["lotes"]), 1)  # se detiene en el primer lote malo
        r2 = self.run_motor("--simulado", "--lotes", "1")
        self.assertEqual(r2.returncode, 3)  # sigue en pausa hasta que alguien la levante
        r3 = self.run_motor("--simulado", "--lotes", "1", "--reanudar", "--objetivo", "5")
        self.assertEqual(r3.returncode, 0, r3.stdout + r3.stderr)


class TestSeguridad(unittest.TestCase):
    def test_no_escribe_la_clave(self):
        t = tempfile.mkdtemp()
        try:
            os.environ["ANTHROPIC_API_KEY"] = "sk-ant-prueba-1234567890"
            with self.assertRaises(SystemExit):
                B.escribir(os.path.join(t, "x.json"), [{"q": "sk-ant-prueba-1234567890"}])
            self.assertFalse(os.path.exists(os.path.join(t, "x.json")))
        finally:
            os.environ.pop("ANTHROPIC_API_KEY", None); shutil.rmtree(t)

    def test_codigo_sin_claves_ni_impresiones_del_secreto(self):
        for f in glob.glob(os.path.join(R, "fabrica", "*.py")) + [os.path.join(R, ".github", "workflows", "question-factory.yml")]:
            s = open(f).read()
            self.assertNotRegex(s, r"sk-ant-[A-Za-z0-9]", f)
            # nunca se imprime el VALOR (expansión $ANTHROPIC_API_KEY o lectura del entorno dentro de un print)
            self.assertNotRegex(s, r"print\([^)]*environ[^)]*ANTHROPIC_API_KEY|echo[^\n]*\$\{?ANTHROPIC_API_KEY", f)

    def test_workflow_manual_con_parametros(self):
        w = open(os.path.join(R, ".github", "workflows", "question-factory.yml")).read()
        on = w.split("\non:", 1)[1].split("\njobs:", 1)[0]
        self.assertIn("workflow_dispatch", on)
        self.assertNotRegex(on, r"\n  (push|pull_request|schedule):")  # nunca en cada push
        for p in ("opposition", "batch_size", "target_questions", "dry_run"):
            self.assertIn(f"{p}:", on)
        self.assertIn("${{ secrets.ANTHROPIC_API_KEY }}", w)
        self.assertIn("concurrency:", w)  # nunca dos generaciones a la vez


if __name__ == "__main__":
    unittest.main()
