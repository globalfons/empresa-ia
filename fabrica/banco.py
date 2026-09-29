"""Banco de preguntas (datos/preguntas-<ley>.json) y cola de candidatas (datos/candidatas/<ley>.json).

- Solo las VALID entran en el banco, siempre al final y con el siguiente id («<prefijo>-<n>»): los ids congelados no cambian.
- REVIEW_REQUIRED y REJECTED van a la cola (no se publican); la cola sirve también para no volver a generar lo rechazado.
- Escritura atómica (fichero temporal + rename) y comprobación de que ningún secreto acaba en disco.
"""
import json, os, tempfile

R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RETIRADAS = {"OUTDATED", "DEPRECATED"}


def escribir(ruta, obj, indent=1):
    texto = json.dumps(obj, ensure_ascii=False, indent=indent) + "\n"
    clave = os.environ.get("ANTHROPIC_API_KEY")
    if clave and len(clave) > 8 and clave in texto:
        raise SystemExit("Posible filtración de la clave de la API en un fichero de datos: se detiene la fábrica sin escribir.")
    os.makedirs(os.path.dirname(ruta), exist_ok=True)
    fd, tmp = tempfile.mkstemp(dir=os.path.dirname(ruta), suffix=".tmp")
    with os.fdopen(fd, "w", encoding="utf-8") as f:
        f.write(texto)
    os.replace(tmp, ruta)


def leer(ruta, defecto):
    return json.load(open(ruta, encoding="utf-8")) if os.path.exists(ruta) else defecto


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
        """Todas las preguntas del artículo (banco no retirado + cola entera): base de la deduplicación."""
        self.cargar(slug)
        return [q for q in self.qs[slug] if q["art"] == n and q.get("verification_status") not in RETIRADAS] + \
               [q for q in self.cola[slug] if q["art"] == n]

    def cuenta(self, slug, n):
        """Preguntas que ya ocupan el artículo: publicadas y pendientes de revisión (las rechazadas no cuentan)."""
        self.cargar(slug)
        return sum(1 for q in self.qs[slug] if q["art"] == n and q.get("verification_status") not in RETIRADAS) + \
            sum(1 for q in self.cola[slug] if q["art"] == n and q.get("verification_status") == "REVIEW_REQUIRED")

    def rechazos(self, slug, n):
        self.cargar(slug)
        return sum(1 for q in self.cola[slug] if q["art"] == n and q.get("verification_status") == "REJECTED")

    def anadir(self, slug, q):
        self.cargar(slug)
        if q.get("verification_status") in (None, "VALID"):
            q.pop("verification_status", None)
            q["id"] = f"{self.prefijo(slug)}-{len(self.qs[slug])}"
            self.qs[slug].append(q)
        else:
            q["id"] = f"cand-{slug}-{len(self.cola[slug])}"
            self.cola[slug].append(q)
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
