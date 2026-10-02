"""OppositionProfile (Mossos 360 · Fases 2-7): perfil declarativo generado solo desde datos verificados.
Uso: python3 -m unittest tests.test_perfil"""
import copy, glob, json, os, sys, unittest

R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, R)
from catalogo import perfil as P  # noqa: E402

PROCEDENCIA = ("source_url", "source_document", "published_at", "retrieved_at", "verified_at", "verification_status")
CLAVES = ("schema", "id", "nombre", "convocatoria", "contenido", "fuentes", "datos_oficiales", "temario", "guia", "examen",
          "modulos", "calendario", "alertas", "pendientes")
_CACHE = {}


def perfil(oid="mossos-esquadra"):
    if "banco" not in _CACHE:
        _CACHE["banco"], _CACHE["reg"] = P.cargar_banco(), P.registro_fuentes()
    if oid not in _CACHE:
        _CACHE[oid] = P.construir(oid, _CACHE["banco"], _CACHE["reg"], hoy="2026-10-02")
    return _CACHE[oid]


def texto(fuente):
    return " ".join(open(os.path.join(R, fuente["texto"]), encoding="utf-8").read().split())


class Esquema(unittest.TestCase):
    def test_todas_las_oposiciones_tienen_perfil_con_el_mismo_esquema(self):
        for oid in P.todas():
            p = perfil(oid)
            self.assertEqual(p["schema"], P.ESQUEMA)
            self.assertTrue(all(k in p for k in CLAVES), oid)
            for t in p["temario"]:
                for k in ("id", "titulo", "fuente", "leyes", "articulos", "cobertura", "preguntas", "dificultad", "tipos", "ultima_actualizacion", "cambios_recientes"):
                    self.assertIn(k, t, f"{oid} {t.get('id')} sin {k}")

    def test_el_perfil_versionado_esta_al_dia(self):
        for f in glob.glob(os.path.join(P.SALIDA, "*.json")):
            guardado = json.load(open(f, encoding="utf-8"))
            nuevo = P.construir(guardado["id"], _CACHE.get("banco") or P.cargar_banco(), _CACHE.get("reg") or P.registro_fuentes(), hoy=guardado["generado"])
            for k in ("contenido", "datos_oficiales", "calendario", "examen", "modulos"):
                self.assertEqual(guardado[k], nuevo[k], f"{guardado['id']}.{k}: ejecuta python3 catalogo/perfil.py")

    def test_ninguna_oposicion_tiene_datos_en_el_codigo(self):
        src = open(os.path.join(R, "catalogo", "perfil.py"), encoding="utf-8").read()
        for o in ("1587", "1.587", "46/26", "Mossos"):
            self.assertNotIn(o, src.split('"""', 2)[2], o)


class Mossos(unittest.TestCase):
    def setUp(self):
        self.p = perfil()

    def test_convocatoria_vigente_e_historicas_separadas(self):
        c = self.p["convocatoria"]
        self.assertEqual((c["actual"]["estado"], c["actual"]["codigo"]), ("CURRENT_CALL", "46/26"))
        self.assertEqual(c["actual"]["seguir"], "Mossos d'Esquadra 46/26")
        self.assertTrue(c["historicas"])
        self.assertTrue(all(h["estado"] == "HISTORICAL_CALL" and h["codigo"] != "46/26" for h in c["historicas"]))

    def test_cada_dato_oficial_tiene_cita_literal_y_procedencia_completa(self):
        for k, d in self.p["datos_oficiales"].items():
            for e in d.get("elementos") or [d]:
                f = e["fuente"]
                self.assertTrue(f and all(f.get(x) for x in PROCEDENCIA), f"{k}: procedencia incompleta {f}")
                self.assertIn(" ".join(e["cita"].split()), texto(f), f"{k}: cita no literal")

    def test_oficial_y_generado_nunca_se_mezclan(self):
        c = self.p["contenido"]
        ex = json.load(open(os.path.join(R, "datos", "examens-oficials", "mossos-esquadra.json")))["examenes"]
        self.assertEqual(c["OFFICIAL_EXAM"], sum(len(e["preguntes"]) for e in ex))
        ids_ofi = {q["id"] for e in ex for q in e["preguntes"]}
        for qs in _CACHE["banco"].values():
            self.assertFalse(ids_ofi & {q.get("id") for q in qs})
        for t in self.p["temario"]:
            self.assertGreaterEqual(sum(t["dificultad"].values()), 0)
            self.assertEqual(sum(t["dificultad"].values()), t["preguntas"]["TESTLEY_GENERATED"], t["id"])

    def test_review_required_y_retiradas_no_cuentan_como_cobertura(self):
        c = self.p["contenido"]
        self.assertGreaterEqual(c["REVIEW_REQUIRED"], 6)  # las 6 de S00018 en cola humana
        self.assertEqual(sum(t["preguntas"]["TESTLEY_GENERATED"] for t in self.p["temario"]), c["TESTLEY_GENERATED"])

    def test_temario_21_temas_con_alcance_oficial_y_leyes_catalanas_pendientes(self):
        temas = {t["id"]: t for t in self.p["temario"]}
        self.assertEqual(len(temas), 21)
        self.assertEqual(temas["D"]["cobertura"], "SIN_FUENTE_OFICIAL")
        self.assertEqual(temas["C.4"]["alcance_oficial"][0], "1. La Llei orgànica 2/1986, de 13 de març, de forces i cossos de seguretat. Principis bàsics d'actuació.")
        pend = [l for t in temas.values() for l in t["leyes_pendientes"]]
        self.assertEqual(sorted(l["nombre"][:13] for l in pend), ["Llei 10/1994,", "Llei 16/1991,", "Llei 4/2003, "])
        for l in pend:
            self.assertEqual(l["verification_status"], "OFFICIAL_PENDING_REVIEW")
            self.assertIn(" ".join(l["cita"].split()), texto(l["fuente"]))
        self.assertTrue(all(a.get("excluido") for a in temas["C.4"]["articulos"] if a["art"] in ("C.4.2", "C.4.3")))

    def test_esmenes_original_correccion_y_valor_vigente(self):
        cs = self.p["guia"]["correcciones"]
        self.assertEqual(len(cs), 4)
        for c in cs:
            self.assertNotEqual(c["ORIGINAL"], c["CORRECTION"])
            self.assertEqual(c["CURRENT_VALUE"], c["CORRECTION"] if c["estado"] == "aplicada" else c["ORIGINAL"])
            self.assertTrue(c["fuente"].startswith("https://mossos.gencat.cat/"))
        self.assertTrue(any(c["tema"] == "A.5" for c in next(t for t in self.p["temario"] if t["id"] == "A.5")["cambios_recientes"]))

    def test_esmena_no_aplicada_conserva_el_original(self):
        reg = {"esmenes": [{"tema": "A.2", "lloc": "Idees força, punt 11 (pàgina 30)", "aplicada_a": [], "estado": "OFFICIAL_PENDING_REVIEW"}]}
        c = next(x for x in P.correcciones(reg) if x["tema"] == "A.2")
        self.assertEqual((c["estado"], c["CURRENT_VALUE"]), ("OFFICIAL_PENDING_REVIEW", c["ORIGINAL"]))

    def test_modulos_no_medibles_no_inventan_medicion(self):
        mods = {m["id"]: m for m in self.p["modulos"]}
        self.assertEqual(set(mods), {"conocimientos", "examenes_oficiales", "psicotecnicos", "prueba_fisica", "adecuacion_psicoprofesional", "entrevista",
                                     "idiomas", "requisitos", "reconocimiento_medico", "documentacion", "calendario"})
        for m in mods.values():
            if m["tipo"] != "test":
                self.assertFalse({"nota", "puntuacion", "score", "medicion"} & set(m), m["id"])
        self.assertEqual(mods["prueba_fisica"]["parte_oficial"], "2a prova · física")
        self.assertIn("prova_fisica", mods["prueba_fisica"]["datos_oficiales"])

    def test_simulacro_con_reglas_oficiales_y_distribucion_real(self):
        s = self.p["examen"]["simulacro"]
        self.assertEqual((s["preguntas"], s["minutos"], s["penalizacion"]), (30, 35, 0.25))
        self.assertEqual(s["distribucion_origen"], "OFFICIAL_EXAM")
        self.assertAlmostEqual(sum(s["distribucion"].values()), 1, places=2)
        self.assertNotIn("D", s["distribucion"])

    def test_calendario_distingue_oficial_de_previsio(self):
        cal = self.p["calendario"]
        self.assertTrue(all(c["caracter"] in ("OFICIAL", "PREVISIO") and c["fuente"]["verification_status"] for c in cal))
        self.assertEqual(next(c for c in cal if c["tipo"] == "examen")["caracter"], "OFICIAL")


class Eventos(unittest.TestCase):
    def test_cada_novedad_tiene_evento_tipificado(self):
        for n in json.load(open(os.path.join(R, "catalogo", "novedades.json"), encoding="utf-8")):
            self.assertIn(n["evento"], P.EVENTOS, n["id"])
        self.assertEqual(P.evento_de({"tipo": "correccion"}), "NEW_CORRECTION")
        self.assertEqual(P.evento_de({"tipo": "fecha_examen"}), "NEW_TRIBUNAL_NOTICE")

    def test_cambios_de_fecha_y_de_datos_generan_eventos(self):
        a = perfil()
        b = copy.deepcopy(a)
        for c in b["calendario"]:
            if c["tipo"] == "examen":
                c["fecha"] = "2026-10-24"
            if c["tipo"] == "plazo_fin":
                c["fecha"] = "2026-06-29"
        b["datos_oficiales"]["plazas"]["valor"] = 1600
        ev = {e["evento"] for e in P.eventos_por_cambio(a, b)}
        self.assertEqual(ev, {"EXAM_DATE_CHANGED", "CALL_DEADLINE_CHANGED", "CALL_UPDATED"})
        self.assertEqual(P.eventos_por_cambio(a, copy.deepcopy(a)), [])
        self.assertEqual(P.eventos_por_cambio(None, a), [])


if __name__ == "__main__":
    unittest.main()
