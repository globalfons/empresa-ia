"""Banco de preguntas (datos/preguntas-<ley>.json) y cola de candidatas (datos/candidatas/<ley>.json).

- Solo las VALID entran en el banco, siempre al final y con el siguiente id («<prefijo>-<n>»): los ids congelados no cambian.
- REVIEW_REQUIRED y REJECTED van a la cola (no se publican); la cola sirve también para no volver a generar lo rechazado.
- Escritura atómica (fichero temporal + rename) y comprobación de que ningún secreto acaba en disco.
"""
import json, os, tempfile

R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RETIRADAS = {"OUTDATED", "DEPRECATED"}


class Bloqueado(SystemExit):
    """Intento de publicar algo que no puede publicarse (REVIEW_REQUIRED sin aprobación humana, veredicto no VALID…)."""


def publicable(q):
    """Solo entran al banco: VALID (validación determinista + juez) o REVIEW_REQUIRED con aprobación humana explícita."""
    humana = q.get("aprobacion_humana") or {}
    if humana.get("decision") == "aprobar" and humana.get("revisor") and humana.get("fecha"):
        return True
    if q.get("verification_status") not in (None, "VALID"):
        return False
    t = q.get("traza")
    return t is None or (t.get("validation_status") == "VALID" and t.get("judge_verdict") == "VALID")


def escribir(ruta, obj, indent=1):
    texto = json.dumps(obj, ensure_ascii=False, indent=indent) + "\n"
    clave = os.environ.get("ANTHROPIC_API_KEY")
    if clave and len(clave) > 8 and clave in texto:
        raise SystemExit("Posible filtración de la clave de la API en un fichero de datos: se detiene la fábrica sin escribir.")
    carpeta = os.path.dirname(os.path.abspath(ruta))  # también para rutas relativas sin carpeta («informe.json»)
    os.makedirs(carpeta, exist_ok=True)
    fd, tmp = tempfile.mkstemp(dir=carpeta, suffix=".tmp")
    with os.fdopen(fd, "w", encoding="utf-8") as f:
        f.write(texto)
    os.replace(tmp, ruta)


def leer(ruta, defecto):
    return json.load(open(ruta, encoding="utf-8")) if os.path.exists(ruta) else defecto


# Exámenes oficiales anteriores cuyas preguntas llevan el apartado de la guía (apartat_guia): entran en la deduplicación
EXAMENES_OFICIALES = {"guia-mossos": os.path.join("datos", "examens-oficials", "mossos-esquadra.json")}


class Banco:
    def __init__(self, raiz=R):
        self.raiz = raiz
        self.manifiesto = leer(os.path.join(raiz, "datos", "ids-congelados.json"), {"leyes": {}})["leyes"]
        self.qs, self.cola, self.sangria, self.sucio = {}, {}, {}, set()

    def _fq(self, slug):
        return os.path.join(self.raiz, "datos", f"preguntas-{slug}.json")

    def _fc(self, slug):
        return os.path.join(self.raiz, "datos", "candidatas", f"{slug}.json")

    def cargar(self, slug):
        if slug not in self.qs:
            f = self._fq(slug)
            raw = open(f, encoding="utf-8").read() if os.path.exists(f) else "[]"
            self.sangria[slug] = 0 if raw.startswith("[\n{") else 1
            self.qs[slug] = json.loads(raw)
            self.cola[slug] = leer(self._fc(slug), [])
        return self.qs[slug]

    def prefijo(self, slug):
        return (self.manifiesto.get(slug) or {}).get("prefijo", "l39" if slug == "ley-39-2015" else slug)

    def existentes(self, slug, n):
        """Todas las preguntas del artículo (banco no retirado + cola entera + preguntas de exámenes oficiales del mismo
        apartado): base de la deduplicación. Las oficiales solo se comparan; no cuentan como cobertura ni se tocan."""
        self.cargar(slug)
        return [q for q in self.qs[slug] if q["art"] == n and q.get("verification_status") not in RETIRADAS] + \
               [q for q in self.cola[slug] if q["art"] == n] + self.oficiales(slug, n)

    def oficiales(self, slug, n):
        f = EXAMENES_OFICIALES.get(slug)
        if not f or not os.path.exists(os.path.join(self.raiz, f)):
            return []
        ex = leer(os.path.join(self.raiz, f), {"examenes": []})["examenes"]
        return [{"id": q["id"], "q": q["q"], "o": q["o"], "a": q["a"], "art": n, "procedencia": "OFFICIAL_EXAM"}
                for e in ex for q in e["preguntes"] if q.get("apartat_guia") == n]

    def cuenta(self, slug, n):
        """Preguntas que ya ocupan el artículo: publicadas y pendientes de revisión (las rechazadas no cuentan)."""
        self.cargar(slug)
        return sum(1 for q in self.qs[slug] if q["art"] == n and q.get("verification_status") not in RETIRADAS) + \
            sum(1 for q in self.cola[slug] if q["art"] == n and q.get("verification_status") == "REVIEW_REQUIRED")

    def rechazos(self, slug, n):
        self.cargar(slug)
        return sum(1 for q in self.cola[slug] if q["art"] == n and q.get("verification_status") == "REJECTED")

    def anadir(self, slug, q):
        """VALID → banco (publicación); cualquier otro estado → cola. Nunca publica una REVIEW_REQUIRED."""
        self.cargar(slug)
        if q.get("verification_status") in (None, "VALID"):
            return self.publicar(slug, q)
        q["id"] = f"cand-{slug}-{len(self.cola[slug])}"
        if isinstance(q.get("traza"), dict):
            q["traza"]["id"] = q["id"]
        self.cola[slug].append(q)
        self.sucio.add(slug)
        return q["id"]

    def publicar(self, slug, q):
        """Única puerta de entrada al banco publicado."""
        self.cargar(slug)
        if not publicable(q):
            raise Bloqueado(f"BLOQUEADO: no se publica {q.get('id') or q.get('q', '')[:60]!r}: solo VALID o REVIEW_REQUIRED con aprobación humana explícita.")
        q.pop("verification_status", None)
        q["id"] = f"{self.prefijo(slug)}-{len(self.qs[slug])}"
        if isinstance(q.get("traza"), dict):
            q["traza"]["id"] = q["id"]
        self.qs[slug].append(q)
        self.sucio.add(slug)
        return q["id"]

    def guardar(self):
        for slug in sorted(self.sucio):
            escribir(self._fq(slug), self.qs[slug], self.sangria[slug])
            escribir(self._fc(slug), self.cola[slug])
            if slug not in self.manifiesto:  # ley nueva en el banco: su numeración empieza en 0 y queda registrada
                self.manifiesto[slug] = {"prefijo": self.prefijo(slug), "congeladas": 0}
                ruta = os.path.join(self.raiz, "datos", "ids-congelados.json")
                m = leer(ruta, {"leyes": {}}); m["leyes"][slug] = self.manifiesto[slug]; escribir(ruta, m)
        self.sucio.clear()
