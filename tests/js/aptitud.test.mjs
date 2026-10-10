// Aptitude Engine (Mossos 360 · Fase 1): ejercicios originales, deterministas, resolubles y con respuesta única.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { cargar } from "./entorno.mjs";

const ctx = () => cargar(["web/assets/psicotecnicos.js", "web/assets/aptitud.js"]).ctx;
const A = ctx().TLAptitud;
const CAMPOS = ["id", "opposition_id", "category", "subtype", "difficulty", "prompt", "stimulus", "options", "correct_answer", "explanation",
  "estimated_time", "source_type", "source_reference", "verification_status", "generator", "created_at"];
const todos = (n, idioma = "ca") => A.CATEGORIAS.flatMap((c) => A.SUBTIPOS[c].flatMap((s) => [1, 2, 3].flatMap((d) =>
  Array.from({ length: n }, (_, i) => A.ejercicio(c, s, d, i * 131 + 7, "mossos-esquadra", idioma)))));

test("esquema AptitudeExercise completo y nunca presentado como oficial", () => {
  for (const e of todos(3)) {
    for (const k of CAMPOS) assert.ok(k in e, k);
    assert.equal(e.source_type, "TESTLEY_GENERATED");
    assert.equal(e.verification_status, "VERIFIED_BY_COMPUTATION");
    assert.ok(e.estimated_time >= 15 && e.estimated_time <= 60, "tiempo plausible");
  }
  const e = A.ejercicio("numerico", "serie", 1, 5);
  assert.ok(A.verificar({ ...e, reproduccion_oficial: true }).length);
  assert.ok(A.verificar({ ...e, source_type: "OFFICIAL_EXAM" }).length);
});

test("solubilidad y unicidad: cada ejercicio se reproduce desde su id, 4 opciones distintas y una sola correcta", () => {
  for (const e of todos(150)) assert.deepEqual([...A.verificar(e)], [], e.id);
});

test("respuestas correctas comprobadas con cálculo independiente del generador", () => {
  const corr = (e) => e.options[e.correct_answer];
  for (const e of todos(60, "es")) {
    if (e.subtype === "porcentaje") { const [, p, n] = e.prompt.match(/el (\d+) % de (\d+)/); assert.equal(+corr(e), (+p * +n) / 100); }
    if (e.subtype === "proporcion") { const [, u, t, c] = e.prompt.match(/Si (\d+) unidades cuestan (\d+) €, ¿cuánto cuestan (\d+)/); assert.equal(+corr(e), (+t / +u) * +c); }
    if (e.subtype === "pares_identicos") assert.equal(+corr(e), e.stimulus.pares.filter(([a, b]) => a === b).length);
    if (e.subtype === "contar_simbolo") { const s = e.prompt.match(/«(.)»/)[1]; assert.equal(+corr(e), e.stimulus.texto.split(s).length - 1); }
    if (e.subtype === "serie_letras") {
      const L = e.stimulus.texto.split(" · ").slice(0, 5).map((c) => c.charCodeAt(0) - 65), d = L.slice(1).map((v, i) => v - L[i]);
      const per = [1, 2, 3].find((p) => d.every((v, i) => v === d[i % p])); // menor periodo de los saltos
      assert.ok(per, e.id);
      assert.equal(corr(e).charCodeAt(0) - 65, L[4] + d[4 % per]);
    }
    if (e.subtype === "anagrama") {
      const ord = (w) => [...w].sort().join(""), base = ord(e.stimulus.texto);
      assert.equal(e.options.filter((o) => ord(o) === base).length, 1, e.id);
      assert.equal(ord(corr(e)), base);
    }
    if (e.subtype === "codificacion") {
      const [, a, b, w] = e.prompt.match(/«([A-Z]+)» se codifica como «([A-Z]+)», ¿cómo se codifica «([A-Z]+)»/);
      const d = [...a].map((c, i) => (b.charCodeAt(i) - c.charCodeAt(0) + 26) % 26);
      const per = [1, 2].find((p) => d.every((v, i) => v === d[i % p]));
      assert.ok(per, e.id);
      assert.equal(corr(e), [...w].map((c, i) => String.fromCharCode(65 + (c.charCodeAt(0) - 65 + d[i % per]) % 26)).join(""));
    }
    if (e.subtype === "orden_alfabetico") { const ws = e.stimulus.texto.split(", ").sort(); const p = +e.prompt.match(/posición (\d+)/)[1]; assert.equal(corr(e), ws[p - 1]); }
    if (e.subtype === "rotacion") {
      const v = +e.prompt.match(/(\d+)°/)[1] / 90; let g = e.stimulus.cuadricula;
      for (let i = 0; i < v; i++) g = g.map((_, r) => g.map((f) => f[r]).reverse());
      assert.equal(JSON.stringify(corr(e)), JSON.stringify(g));
      const espejo = JSON.stringify(g.map((f) => f.slice().reverse()));
      assert.ok(!e.options.some((o) => JSON.stringify(o) === espejo && o !== corr(e)) || JSON.stringify(corr(e)) !== espejo);
    }
  }
});

test("deterministas y variados: misma semilla, mismo ejercicio; semillas distintas, ejercicios distintos", () => {
  assert.deepEqual(A.ejercicio("abstracto", "serie_figuras", 2, 42), A.ejercicio("abstracto", "serie_figuras", 2, 42));
  for (const c of A.CATEGORIAS) for (const s of A.SUBTIPOS[c]) {
    const vistos = new Set(Array.from({ length: 100 }, (_, i) => JSON.stringify([A.ejercicio(c, s, 2, i * 977 + 3).stimulus, A.ejercicio(c, s, 2, i * 977 + 3).prompt, A.ejercicio(c, s, 2, i * 977 + 3).options])));
    assert.ok(vistos.size >= 70, `${c}/${s}: ${vistos.size} distintos de 100`);
  }
});

test("modos: por categoría, por dificultad, mixto y contrarreloj al ritmo oficial", () => {
  assert.ok(A.lote({ categoria: "espacial", n: 8, semilla: 1 }).items.every((e) => e.category === "espacial"));
  assert.ok(A.lote({ dificultad: 3, n: 8, semilla: 2 }).items.every((e) => e.difficulty === 3));
  assert.equal(new Set(A.lote({ modo: "mixto", n: 10, semilla: 3 }).items.map((e) => e.category)).size, 5);
  assert.equal(A.lote({ modo: "contrarreloj", n: 20, semilla: 4 }).segundos, 20 * A.SEG_OFICIAL);
  assert.equal(A.SEG_OFICIAL, 26);
});

test("adaptativo: sube tras 2 aciertos, baja tras un fallo y prioriza la aptitud más débil", () => {
  const est = {}, conf = { semilla: 9, categorias: ["numerico", "verbal"] };
  const e1 = A.siguiente(est, conf);
  assert.equal(e1.category, "numerico"); assert.equal(e1.difficulty, 1);
  A.registrar(est, e1, true); A.registrar(est, e1, true);
  assert.equal(est.cat.numerico.dif, 2);
  A.registrar(est, e1, false);
  assert.equal(est.cat.numerico.dif, 1);
  assert.equal(A.siguiente(est, conf).category, "verbal"); // sin datos → primero
  A.registrar(est, { category: "verbal" }, true);
  assert.equal(A.siguiente(est, conf).category, "numerico"); // 2/3 frente a 1/1 → la más débil
});

test("progreso: precisión y velocidad por subtipo, errores recurrentes y evolución (TLPsico)", () => {
  const c = ctx(), P = c.TLPsico, Ap = c.TLAptitud;
  for (let s = 0; s < 2; s++) {
    const items = Ap.lote({ categoria: "numerico", dificultad: 1, n: 6, semilla: 10 + s }).items.map(Ap.item);
    const S = P.sesion(items, { oposicion: "mossos-esquadra", modo: "categoria", ahora: 1000 });
    items.forEach((it) => P.responder(S, it.id, it.subtipo === "serie" ? (it.a + 1) % 4 : it.a, 20));
    P.terminar(S, null, 61000);
  }
  const d = P.detalle("mossos-esquadra");
  assert.ok(d.porSubtipo["numerico/serie"].n >= 1);
  assert.equal(d.porSubtipo["numerico/serie"].acierto_pct, 0);
  assert.equal(d.porSubtipo["numerico/serie"].seg_por_pregunta, 20);
  if (d.porSubtipo["numerico/serie"].n >= 4) assert.ok(d.errores_recurrentes.includes("numerico/serie"));
  assert.equal(d.evolucion.length, 2);
  assert.equal(P.detalle("otra").evolucion.length, 0); // sin datos → vacío, sin inventar
});

test("build: entrenador solo donde hay estructura aptitudinal oficial; gate por configuración", () => {
  const html = fs.readFileSync("docs/oposiciones/mossos-esquadra/aptitudinal/index.html", "utf8");
  for (const s of ["psicotecnicos.js", "aptitud.js", "aptitud-ui.js"]) assert.match(html, new RegExp(`assets/${s.replace(".", "\\.")}`));
  assert.match(html, /data-idioma="ca"/);
  assert.match(html, /80 preguntes adreçat a avaluar/);
  assert.ok(!fs.existsSync("docs/oposiciones/policia-nacional-escala-basica/aptitudinal/index.html"));
  assert.match(fs.readFileSync("docs/oposiciones/mossos-esquadra/index.html", "utf8"), /aptitudinal\/">Entrenar la aptitudinal/);
  const cfg = JSON.parse(fs.readFileSync("config.json", "utf8")).planes;
  assert.equal(cfg.free.aptitud_completo, false); assert.equal(cfg.free.aptitud_muestra, 10); assert.equal(cfg.premium.aptitud_completo, true);
});

test("aptitud verbal semántica: banco HUMAN_REVIEW, nunca generado ni servido", () => {
  const b = JSON.parse(fs.readFileSync("catalogo/aptitud/verbal-semantica-mossos-esquadra.json", "utf8"));
  assert.equal(b.estado, "HUMAN_REVIEW"); assert.equal(b.verification_status, "REVIEW_REQUIRED");
  assert.equal(b.publicable, false); assert.equal(b.servido_en_web, false);
  for (const it of b.items) assert.ok(it.human_review && it.human_review.aprobado_por, "ítem sin aprobación humana");
  assert.deepEqual([...A.SUBTIPOS.verbal], b.analisis_cobertura.cubierto_por_calculo); // el motor solo genera lo calculable
  for (const f of ["sinonimos", "antonimos", "analogias", "vocabulario", "comprension_lectora"]) assert.ok(!A.SUBTIPOS.verbal.includes(f), f);
  if (fs.existsSync("docs")) assert.ok(!fs.existsSync("docs/datos/verbal-semantica-mossos-esquadra.json"));
});

test("verbal semántica revisada: solo se sirven ítems con aprobación humana y referencia", () => {
  const X = cargar(["web/assets/aptitud.js"]).ctx.TLAptitud;
  const base = { formato: "sinonimos", idioma: "es", dificultad: 2, enunciado: "Sinónimo de prueba", opciones: ["a", "b", "c", "d"], correcta: 1, explicacion: "Explicación de prueba suficientemente larga", referencia: { fuente: "DLE", url: "https://dle.rae.es/x" } };
  assert.equal(X.cargarRevisados([{ ...base, id: "sin-1" }, { ...base, id: "sin-2", human_review: { aprobado_por: "Persona", fecha: "2026-10-10" } }]), 1);
  const items = X.lote({ categoria: "verbal", n: 40, semilla: 7 }).items;
  const sem = items.filter((e) => /^apt-verbal-rev-/.test(e.id));
  assert.ok(sem.length > 0 && sem.every((e) => e.id === "apt-verbal-rev-sin-2" && e.verification_status === "HUMAN_REVIEWED" && X.verificar(e).length === 0));
  assert.ok(items.filter((e) => !/^apt-verbal-rev-/.test(e.id)).every((e) => X.verificar(e).length === 0));
  X.cargarRevisados([]);
  assert.ok(X.lote({ categoria: "verbal", n: 20, semilla: 7 }).items.every((e) => !/^apt-verbal-rev-/.test(e.id)));
});
