"""CoverageEngine (Mossos 360 · Fases 8-9): necesidades concretas por tema, sin generar nada.
Uso: python3 -m unittest tests.test_cobertura"""
import re, collections, os, sys, unittest

R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, R)
from fabrica import cobertura as C, fuente as F  # noqa: E402

_RES = {}


def res():
    if "m" not in _RES:
        _RES["m"] = C.analizar("mossos-esquadra")
    return _RES["m"]


class Cobertura(unittest.TestCase):
    def test_necesidades_concretas_con_tema_tipo_dificultad_y_apartados(self):
        r = res()
        self.assertTrue(r["necesidades"])
        for n in r["necesidades"]:
            self.assertTrue(n["n"] > 0 and n["articulos"] and n["dificultad"] in (1, 2, 3))
            self.assertIn(f"del tema {n['tema']}", n["texto"])
            self.assertTrue(n["texto"].startswith(f"{n['n']} pregunta"))

    def test_nunca_pide_sobre_fuentes_no_verificadas_ni_excluidas(self):
        r = res()
        excluidos = {f"guia-mossos:{a}" for t in r["temas"] for a in t["apartados_bloqueados"]}
        pedidos = {a for n in r["necesidades"] for a in n["articulos"]}
        self.assertFalse(pedidos & excluidos)
        self.assertFalse([a for a in pedidos if re.search(r"10/1994|4/2003|16/1991|llei-(4-2003|10-1994|16-1991)", a)],
                         "las leyes catalanas sin texto oficial verificado nunca son fuente")
        self.assertTrue(any(b["tema"] == "D" for b in r["bloqueados"]))
        self.assertFalse([n for n in r["necesidades"] if n["tema"] == "D"])

    def test_el_deficit_cuadra_con_el_objetivo_y_no_supera_la_capacidad(self):
        r = res()
        por_tema = collections.Counter()
        for n in r["necesidades"]:
            por_tema[n["tema"]] += n["n"]
        for t in r["temas"]:
            self.assertLessEqual(t["objetivo"], t["capacidad"])
            self.assertLessEqual(por_tema[t["tema"]], t["falta"], t["tema"])
        for t in r["temas"]:  # todo tema con hueco de generación tiene necesidades (y uno en objetivo, ninguna)
            if t["tipo_gap"] == "GENERACION":
                self.assertGreater(por_tema[t["tema"]], 0, t["tema"])
            if t["falta"] == 0:
                self.assertEqual(por_tema[t["tema"]], 0, t["tema"])

    def test_oficiales_no_cuentan_como_cobertura(self):
        c2 = next(t for t in res()["temas"] if t["tema"] == "C.2")
        self.assertGreater(c2["OFFICIAL_EXAM"], c2["actuales"])
        self.assertGreater(c2["falta"], 0)

    def test_tipos_minimos_y_revision_humana(self):
        r = res()
        tipos = {n["tipo"] for n in r["necesidades"]}
        self.assertTrue(set(F.SIEMPRE) - {"caso_practico"} <= tipos | {"dificil"})
        self.assertTrue(all(n["revision_humana"] for n in r["necesidades"] if n["tipo"] == "caso_practico"))

    def test_reparto_por_dificultad(self):
        d = C.deficit_dificultad(30, collections.Counter({2: 10}), {"1": 0.3, "2": 0.5, "3": 0.2}, 20)
        self.assertEqual(sum(d.values()), 20)
        self.assertEqual(d, {1: 9, 2: 5, 3: 6})
        self.assertEqual(C.deficit_dificultad(30, collections.Counter(), {"1": 0.3, "2": 0.5, "3": 0.2}, 0), {1: 0, 2: 0, 3: 0})

    def test_no_genera_y_respeta_la_pausa(self):
        import json
        pausa = json.load(open(os.path.join(R, "fabrica", "estado", "estado.json"), encoding="utf-8")).get("pausa")
        self.assertEqual(res()["estado_fabrica"], "GENERATION_PAUSED" if pausa else "ACTIVE")
        src = open(os.path.join(R, "fabrica", "cobertura.py"), encoding="utf-8").read()
        for p in ("generador", "anthropic", "publicar(", "anadir("):
            self.assertNotIn(p, src.split('"""', 2)[2])


if __name__ == "__main__":
    unittest.main()


class PlanControlado(unittest.TestCase):
    def test_plan_desde_cobertura_usa_exactamente_sus_necesidades(self):
        from fabrica import sesion as S, fuente as F
        sl = S.slots_desde_cobertura("mossos-esquadra", ["C.5", "C.3", "C.2"], 15, F.Fuentes())
        self.assertEqual(sum(s["k"] for s in sl), 15)
        self.assertEqual({s["n"].rsplit(".", 1)[0] for s in sl} <= {"C.5", "C.3", "C.2"}, True)
        nec = {(n["tema"], n["tipo"], n["dificultad"]) for n in res()["necesidades"]}
        for s in sl:
            self.assertEqual(len(s["pedidas"]), s["k"])
            for p in s["pedidas"]:
                self.assertIn((s["n"].rsplit(".", 1)[0], p["tipo"], p["dif"]), nec)
            self.assertNotIn(s["n"].split(".")[0], {"D"}, "nunca temas sin fuente oficial")
        difs = collections.Counter(p["dif"] for s in sl for p in s["pedidas"])
        self.assertLess(difs[1], 15 * 0.5, f"no se llena con preguntas fáciles: {difs}")
