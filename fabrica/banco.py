"""Banco de preguntas (datos/preguntas-<ley>.json) y cola de candidatas (datos/candidatas/<ley>.json).

- Solo las VALID entran en el banco, siempre al final y con el siguiente id («<prefijo>-<n>»): los ids congelados no cambian.
- REVIEW_REQUIRED y REJECTED van a la cola (no se publican); la cola sirve también para no volver a generar lo rechazado.
- Escritura atómica (fichero temporal + rename) y comprobación de que ningún secreto acaba en disco.
"""
import json, os, tempfile

R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RETIRADAS = {"OUTDATED", "DEPRECATED"}
# Campos que nunca puede traer una pregunta en su raíz al publicarse (el veredicto vive en la traza, escrito por el cierre del lote)
RAIZ_PROHIBIDA = {"verdict", "status", "confidence", "publication_state", "veredicto", "respaldada", "unica", "clara", "duplicada_de",
                  "judge_verdict", "published", "publicada"}


class Bloqueado(SystemExit):
    """Intento de publicar algo que no puede publicarse (REVIEW_REQUIRED sin aprobación humana, veredicto no VALID…)."""


def publicable(q):
    """Solo entran al banco: VALID (validación determinista + juez) o REVIEW_REQUIRED con aprobación humana explícita."""
    humana = q.get("aprobacion_humana") or {}
    if humana.get("decision") == "aprobar" and humana.get("revisor") and humana.get("fecha"):
        return True
    if q.get("verification_status") not in (None, "VALID"):
        return False
    if "reevaluation_verdict" in q:  # reevaluada con el juez v2: manda el veredicto nuevo
        return q["reevaluation_verdict"] == "VALID"
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

    def verificar_publicacion(self, slug, q, republicar=False):
        """Puerta de publicación (Fase 1 de Mossos 360). Devuelve la lista de motivos que impiden publicar (vacía = publicable):
        estructura · contenido (controles deterministas contra el texto vigente) · cita literal · estado de la fuente ·
        veredicto válido · identidad del juez y huella de su política · no duplicado (banco y exámenes oficiales) · no retirada.
        `republicar`: pregunta ya publicada que vuelve a VALID tras una reevaluación (el juez es el de la reevaluación)."""
        from fabrica import fuente as F, validacion as V, politica as P, motor as MO
        self.cargar(slug)
        p = []
        # 1. Campos reservados en la raíz: nadie salvo el juez/banco fija veredicto o estado de publicación
        raros = sorted(RAIZ_PROHIBIDA & set(q))
        if raros:
            P.incidencia("campo_reservado", f"{slug}: intento de publicar con campos reservados {raros}", self.raiz)
            p.append(f"campos reservados en la pregunta: {raros}")
        # 2. Estructura
        o = q.get("o")
        if not isinstance(q.get("q"), str) or len(q["q"].strip()) < 10:
            p.append("estructura: enunciado ausente o demasiado corto")
        if not (isinstance(o, list) and len(o) == 4 and all(isinstance(x, str) and x.strip() for x in o) and len({x.strip().lower() for x in o}) == 4):
            p.append("estructura: se exigen 4 opciones de texto distintas")
        if not isinstance(q.get("a"), int) or q.get("a") not in range(4):
            p.append("estructura: respuesta fuera de rango")
        if not isinstance(q.get("cita"), str) or len(q.get("cita", "").strip()) < 12 or not q.get("art"):
            p.append("estructura: falta cita o artículo")
        if p and any(x.startswith("estructura") for x in p):
            return p
        # 3. Estado: retiradas, en revisión o sin veredicto válido
        if q.get("verification_status") in RETIRADAS | {"REVIEW_REQUIRED_REEVALUATION", "REJECTED"}:
            p.append(f"estado {q['verification_status']}: no publicable")
        if not republicar and not publicable(q):
            p.append("veredicto: solo VALID (validación + juez) o REVIEW_REQUIRED con aprobación humana explícita")
        # 4. Identidad del juez y huella de su política (o aprobación humana completa)
        humana = (q.get("aprobacion_humana") or {}).get("decision") == "aprobar"
        if republicar:
            ult = (q.get("reevaluaciones") or [{}])[-1]
            ver, huella = ult.get("policy_version"), ult.get("policy_hash")
        else:
            t = q.get("traza") or {}
            ver, huella = t.get("judge_policy_version"), t.get("judge_policy_sha256")
            if not humana and not (t.get("judge_model") or t.get("judge")):
                p.append("juez: falta la identidad del juez en la traza")
        if not humana or republicar:
            try:
                reg = {e["version"]: e["sha256"] for e in P.registro(self.raiz)["versiones"]}
            except Exception:
                reg = {}
            if not ver or reg.get(ver) != huella:
                p.append(f"juez: política {ver!r} ausente o con huella distinta de la registrada")
        # 5. Fuente: norma con texto vigente, no excluida por fuente no verificada, cita literal y controles de contenido
        if not hasattr(self, "_fuentes"):
            self._fuentes = F.Fuentes()
        ley = self._fuentes.ley(slug)
        if ley is None or q["art"] not in ley.texto:
            p.append("fuente: norma o artículo sin texto oficial vigente")
        else:
            if (slug, q["art"]) in MO.sin_fuente_verificada():
                p.append("fuente: apartado/artículo excluido por fuente oficial no verificada (OFFICIAL_PENDING_REVIEW)")
            cand = {k: q[k] for k in ("tipo", "q", "o", "a", "cita", "exp", "dif", "apartado") if k in q}
            if {"tipo", "exp", "dif"} <= set(cand):
                cfg = json.load(open(os.path.join(R, "fabrica", "config.json"), encoding="utf-8"))
                graves = [m for e, m in V.comprobar(dict(cand, confianza="alta"), ley, q["art"], None, cfg) if e == "REJECTED"]
                p += [f"contenido: {m}" for m in graves]
            elif V.norm(q["cita"]) not in ley.texto[q["art"]]:
                p.append("fuente: la cita no es literal del texto vigente")
        # 6. Duplicado exacto (enunciado + respuesta) en el banco publicado o en los exámenes oficiales del mismo apartado
        clave = (V.simple(q["q"]), V.simple(q["o"][q["a"]]))
        otros = [x for x in self.qs[slug] if x is not q and x.get("id") != q.get("id") and x.get("verification_status") not in RETIRADAS]
        if any((V.simple(x["q"]), V.simple(x["o"][x["a"]])) == clave for x in otros + self.oficiales(slug, q["art"])):
            p.append("duplicado: misma pregunta y respuesta que otra publicada u oficial")
        return p

    def publicar(self, slug, q):
        """Única puerta de entrada al banco publicado: solo si `verificar_publicacion` no encuentra ningún motivo."""
        self.cargar(slug)
        motivos = self.verificar_publicacion(slug, q)
        if motivos:
            raise Bloqueado(f"BLOQUEADO: no se publica {q.get('id') or q.get('q', '')[:60]!r}: " + " · ".join(motivos)[:600])
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
