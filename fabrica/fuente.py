"""Fuente oficial de la fábrica: texto consolidado del BOE por artículo (datos/<ley>-articulos.json), su versión
(datos/leyes-meta.json) y su URL. Sin llamadas a la red: la vigilancia del BOE (datos/vigilar_leyes.py) mantiene estos ficheros.
"""
import json, os, re, sys

R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(R, "datos"))
from validar_lib import norm, vigente  # noqa: E402

SIN_VIGENCIA = re.compile(r"^\W*\((derogad|suprimid|sin contenido|sin vigencia)", re.I)
# Señales del texto que permiten cada tipo de pregunta (si el texto no las tiene, no se pide ese tipo)
SENALES = {
    "plazos": r"\b(d[ií]as?|mes(es)?|años?|horas?|plazo|semanas?)\b",
    "organos": r"\b(Gobierno|Consejo|Ministr|Tribunal|Presidente|Cortes|Congreso|Senado|Delegad|Secretar|Director|Junta|Pleno|Comisi[oó]n|Alcalde|Defensor|Fiscal|[oó]rgano)",
    "competencias": r"\b(corresponde|compete|competencia|atribu|facultad)",
    "definiciones": r"\b(se entiende por|se entender[aá] por|a (los )?efectos de (esta|la presente|este)|se considera(n|r[aá]n)?\b|tendr[aá]n la consideraci[oó]n)",
    "requisitos": r"\b(requisito|deber[aá]|ser[aá] necesario|podr[aá]n|exig|condici[oó]n)",
    "procedimiento": r"\b(procedimiento|solicitud|tr[aá]mite|resoluci[oó]n|notific|recurso|expediente|audiencia)",
    "excepcion": r"\b(salvo|excepto|no obstante|sin perjuicio|excepci[oó]n|en ning[uú]n caso|únicamente|solo podr)",
    "comparativa": r"(\n\s*(\d+\.|[a-z]\)|\d+\.?º)\s.*){2,}",
}
SIEMPRE = ["literal", "conceptual", "aplicacion", "negativa", "dificil", "caso_practico"]


def J(*p):
    with open(os.path.join(R, *p), encoding="utf-8") as f:
        return json.load(f)


class Ley:
    def __init__(self, slug, norma, meta):
        self.slug, self.id, self.nombre = slug, norma["id"], norma.get("nombre", slug)
        self.version = meta.get(norma["id"], "")
        self.url = f"https://www.boe.es/buscar/act.php?id={norma['id']}"
        arts = J("datos", f"{slug}-articulos.json")
        self.orden = [a["n"] for a in arts]
        self.arts = {a["n"]: a for a in arts}
        self.texto = {a["n"]: norm(vigente(a["texto"])) for a in arts}

    def vigente(self, n):
        a = self.arts.get(n)
        return bool(a) and a.get("vigencia") != "SIN_VIGENCIA" and not SIN_VIGENCIA.match(self.texto.get(n, ""))

    def palabras(self, n):
        return len(self.texto.get(n, "").split())

    def capacidad(self, n, cfg):
        """Preguntas distintas que razonablemente admite un artículo (0 si no está vigente o es demasiado corto)."""
        c = cfg["cobertura"]
        if n in cfg.get("articulos_excluidos", {}).get(self.slug, {}).get("arts", []):
            return 0  # texto que no es de la norma (ver motivo en config)
        if not self.vigente(n) or self.palabras(n) < c["min_palabras_articulo"]:
            return 0
        return max(1, min(c["max_preguntas_por_articulo"], self.palabras(n) // c["palabras_por_pregunta"]))

    def tipos_posibles(self, n):
        t = vigente(self.arts[n]["texto"])
        tipos = list(SIEMPRE) + [k for k, rx in SENALES.items() if re.search(rx, t, re.I)]
        if self.relacionados(n):
            tipos.append("relacion_articulos")
        return tipos

    def relacionados(self, n):
        """Artículos de la misma ley citados expresamente en el texto («artículo 23»): contexto para preguntas de relación."""
        # solo referencias a la MISMA norma: se descarta «artículo 96 de la Constitución», «artículo 11.6 de la Ley 9/2017», etc.
        otra = r"(?:(?!\.\s)[^;]){0,40}?\b(?:de\s+la|del)\s+(?:Constituci|Ley\b|Ley\s+\d|Ley\s+Org|Real|Reglamento|C[oó]digo|Estatuto|Directiva|Texto|Decreto|Orden|Tratado|Convenio)"
        refs = [m.group(1) for m in re.finditer(r"art[ií]culos?\s+(\d+(?:\s?(?:bis|ter|quater))?)", self.texto.get(n, ""), re.I)
                if not re.match(otra, self.texto.get(n, "")[m.end():m.end() + 80], re.I)]
        return [r.replace(" ", "") for r in dict.fromkeys(refs) if r.replace(" ", "") != n and self.vigente(r.replace(" ", ""))][:2]


class Fuentes:
    def __init__(self):
        self.meta = J("datos", "leyes-meta.json")
        self.normas = {n["slug"]: n for n in J("catalogo", "normas_base.json")}
        self._leyes = {}

    def ley(self, slug):
        if slug not in self._leyes:
            if slug not in self.normas or not os.path.exists(os.path.join(R, "datos", f"{slug}-articulos.json")):
                return None
            self._leyes[slug] = Ley(slug, self.normas[slug], self.meta)
        return self._leyes[slug]
