"""Banco verbal semántico: solo se publica lo aprobado por una persona (terminal interactivo, nombre y confirmación)."""
import json, os, shutil, sys, tempfile, unittest
from unittest import mock

R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, R)
from fabrica import verbal as V  # noqa: E402

CSV = ("id,formato,idioma,dificultad,enunciado,texto,opcion_a,opcion_b,opcion_c,opcion_d,correcta,explicacion,fuente,url,autor\n"
       "sin-prueba-1,sinonimos,es,2,Elige el sinónimo de la palabra propuesta en el enunciado,,uno,dos,tres,cuatro,a,"
       "Explicación de prueba con la acepción concreta del diccionario,DLE,https://dle.rae.es/x,Autora Prueba\n")


class Banco(unittest.TestCase):
    def setUp(self):
        self.t = tempfile.mkdtemp()
        self.f = os.path.join(self.t, "banco.json")
        shutil.copy(V.ruta("mossos-esquadra"), self.f)
        self.p = mock.patch.object(V, "ruta", lambda op: self.f); self.p.start()
        self.csv = os.path.join(self.t, "i.csv"); open(self.csv, "w", encoding="utf-8").write(CSV)

    def tearDown(self):
        self.p.stop(); shutil.rmtree(self.t)

    def test_real_sin_aprobados_sin_validar(self):
        self.p.stop()
        b = V.leer("mossos-esquadra")
        self.assertTrue(all(not V.validar_item(x) for x in b["items"]))
        self.p.start()

    def test_importa_como_borrador_y_no_publica(self):
        self.assertEqual(V.importar("x", self.csv), 1)
        b = V.leer("x")
        self.assertEqual(b["items"][-1]["estado"], "BORRADOR")
        self.assertEqual(V.publicables(b), [])

    def test_csv_invalido_no_importa_nada(self):
        open(self.csv, "w", encoding="utf-8").write(CSV.replace("https://dle.rae.es/x", "http://x"))
        with self.assertRaises(SystemExit):
            V.importar("x", self.csv)
        self.assertEqual(len(V.leer("x")["items"]), 0)

    def test_aprobar_exige_tty_persona_y_confirmacion(self):
        V.importar("x", self.csv)
        with self.assertRaises(SystemExit):
            V.decidir("x", "sin-prueba-1", "APROBAR", tty=False)
        for respuestas in (["Claude", "APROBAR"], ["Autora Prueba", "APROBAR"], ["Revisor Humano", "no"]):
            it = iter(respuestas)
            with self.assertRaises(SystemExit):
                V.decidir("x", "sin-prueba-1", "APROBAR", entrada=lambda _: next(it), tty=True)
        self.assertEqual(V.publicables(V.leer("x")), [])
        it = iter(["Revisor Humano", "APROBAR"])
        self.assertEqual(V.decidir("x", "sin-prueba-1", "APROBAR", entrada=lambda _: next(it), tty=True), "APROBADO_HUMANO")
        self.assertEqual([x["id"] for x in V.publicables(V.leer("x"))], ["sin-prueba-1"])


if __name__ == "__main__":
    unittest.main()
