"""Compatibilidad del progreso de los usuarios: el id de cada pregunta existente no cambia nunca.

El progreso (navegador y tabla Supabase `progreso`) guarda las respuestas por id de pregunta. Hasta el 29/09/2026 el id
era posicional («<prefijo>-<índice>»); ahora está escrito en cada pregunta y congelado en datos/ids-congelados.json.
"""
import json, os, glob, unittest

R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MAN = json.load(open(os.path.join(R, "datos", "ids-congelados.json")))


def preguntas(slug):
    return json.load(open(os.path.join(R, "datos", f"preguntas-{slug}.json")))


class TestIdsEstables(unittest.TestCase):
    def test_las_congeladas_conservan_su_id_posicional(self):
        for slug, m in MAN["leyes"].items():
            qs = preguntas(slug)
            self.assertGreaterEqual(len(qs), m["congeladas"], f"{slug}: se han borrado preguntas congeladas")
            for i in range(m["congeladas"]):
                self.assertEqual(qs[i].get("id"), f"{m['prefijo']}-{i}", f"{slug} #{i}: id cambiado o pregunta reordenada")

    def test_ids_unicos_y_presentes_en_todo_el_banco(self):
        vistos = set()
        for f in glob.glob(os.path.join(R, "datos", "preguntas-*.json")):
            slug = os.path.basename(f)[len("preguntas-"):-len(".json")]
            self.assertIn(slug, MAN["leyes"], f"{slug}: fichero de preguntas sin entrada en ids-congelados.json")
            for i, q in enumerate(json.load(open(f))):
                self.assertTrue(q.get("id"), f"{slug} #{i} sin id")
                self.assertNotIn(q["id"], vistos, f"id repetido: {q['id']}")
                vistos.add(q["id"])

    def test_las_nuevas_siguen_la_numeracion_sin_reutilizar(self):
        for slug, m in MAN["leyes"].items():
            for i, q in enumerate(preguntas(slug)):
                self.assertEqual(q["id"], f"{m['prefijo']}-{i}", f"{slug} #{i}: las nuevas se añaden al final con el siguiente número")

    def test_procedencia_explicita(self):
        for f in glob.glob(os.path.join(R, "datos", "preguntas-*.json")):
            for q in json.load(open(f)):
                self.assertIn(q.get("procedencia"), ("TESTLEY_GENERATED", "OFFICIAL_EXAM"))
                if q["procedencia"] == "OFFICIAL_EXAM":  # una pregunta oficial necesita su referencia documental
                    for k in ("organismo", "convocatoria", "fecha_examen", "url_oficial", "documento"):
                        self.assertTrue((q.get("examen_oficial") or {}).get(k), f"{q['id']}: falta examen_oficial.{k}")

    def test_build_usa_el_id_guardado(self):
        p = os.path.join(R, "docs", "datos", "constitucion.json")
        if not os.path.exists(p): self.skipTest("sin build")
        pub = {q["id"] for q in json.load(open(p))["qs"]}
        ids = {q["id"] for q in preguntas("constitucion") if q.get("verification_status") not in ("OUTDATED", "DEPRECATED")}
        self.assertEqual(pub, ids)


if __name__ == "__main__":
    unittest.main()
