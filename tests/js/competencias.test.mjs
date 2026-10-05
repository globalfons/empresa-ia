// Competency Engine + Psychometric foundation (Mossos 360 · Fase 2): perfiles, OBJECTIVE_SCORE determinista,
// SELF_ASSESSMENT separado, contrato adaptativo, persistencia local, contenido publicado y build.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { cargar } from "./entorno.mjs";

const motor = () => { const c = cargar(["web/assets/competencias.js"]); return { C: c.ctx.TLCompetencias, almacen: c.almacen }; };
const PREP = JSON.parse(fs.readFileSync("catalogo/preparacion/mossos-esquadra.json", "utf8")).convocatorias["46/26"].competencias;
const D = {
  oposicion: "mossos-esquadra",
  oficial: { lista: PREP.lista, clave: PREP.clave, escala: [1, 10], apte: PREP.apte, citas: PREP.citas, fuente: "https://dogc.gencat.cat/x", documento: "Bases", call_id: "46/26", verification_status: "OFFICIAL_VERIFIED" },
  competencias: [{ id: "autocontrol", explicacion: "x", preparacion: "y", comportamientos: ["a", "b", "c"], preguntas_reflexion: ["p"], relacion_entrevista: "r", verification_status: "VALID",
    autoevaluacion: [{ id: "aa-autocontrol-1", texto: "Mantinc la calma.", invertido: false }, { id: "aa-autocontrol-2", texto: "Perdo els nervis sovint.", invertido: true }] },
  { id: "cooperacio", explicacion: "x", preparacion: "y", comportamientos: ["a", "b", "c"], preguntas_reflexion: ["p"], relacion_entrevista: "r", verification_status: "VALID",
    autoevaluacion: [{ id: "aa-cooperacio-1", texto: "Ajudo l'equip.", invertido: false }, { id: "aa-cooperacio-2", texto: "Prefereixo treballar sol.", invertido: true }] }],
  escenarios: [
    { id: "esc-autocontrol-1", competency_id: "autocontrol", formato: "eleccion", dificultad: 2, situacion: "s", pregunta: "q", justificacion: "j", expected_dimensions: ["autocontrol", "habilitats-socials"],
      opciones: [{ texto: "a", puntos: { autocontrol: 1 } }, { texto: "b", puntos: { autocontrol: 2, "habilitats-socials": 2 } }, { texto: "c", puntos: { autocontrol: 0 } }, { texto: "d", puntos: { "habilitats-socials": 1 } }] },
    { id: "esc-cooperacio-1", competency_id: "cooperacio", formato: "ranking", dificultad: 2, situacion: "s", pregunta: "q", justificacion: "j", expected_dimensions: ["cooperacio"], orden_recomendado: [2, 0, 3, 1],
      opciones: [{ texto: "a", puntos: { cooperacio: 2 } }, { texto: "b", puntos: { cooperacio: 0 } }, { texto: "c", puntos: { cooperacio: 2, autonomia: 1 } }, { texto: "d", puntos: { cooperacio: 1 } }] }],
};

test("CompetencyProfile: las 10 competencias oficiales con cita y fuente; entrenamiento marcado aparte", () => {
  const { C } = motor(), P = C.perfiles(D);
  assert.equal(P.length, 10);
  assert.deepEqual(P.filter((p) => p.clave).map((p) => p.id), ["responsabilitat", "autocontrol", "autogestio"]);
  for (const p of P) {
    assert.equal(p.verification_status, "OFFICIAL_VERIFIED");
    assert.equal(p.call_id, "46/26");
    assert.ok(p.citation.toLowerCase().includes(p.official_name.toLowerCase()), p.id);
    assert.equal(p.official_definition, null); // las bases no definen las competencias: no se inventa
    assert.deepEqual([...p.interview_question_ids], []);
  }
  const a = P.find((p) => p.id === "autocontrol");
  assert.equal(a.training.source_type, "TESTLEY_TRAINING");
  assert.equal(a.observable_behaviours.source_type, "TESTLEY_TRAINING");
  assert.equal(a.training_scenarios.source_type, "TESTLEY_GENERATED");
  assert.equal(P.find((p) => p.id === "motivacio").training, null);
});

test("OBJECTIVE_SCORE determinista: elección por dimensiones y ranking por distancia al orden recomendado", () => {
  const { C } = motor(), [e, r] = D.escenarios;
  const best = C.puntuar(e, 1);
  assert.equal(best.tipo, "OBJECTIVE_SCORE"); assert.equal(best.total, 10); assert.equal(best.recomendada, 1);
  assert.equal(best.dimensiones.autocontrol, 10); assert.equal(best.dimensiones["habilitats-socials"], 10);
  const peor = C.puntuar(e, 2);
  assert.equal(peor.total, 0); assert.equal(peor.dimensiones.autocontrol, 0);
  assert.equal(C.puntuar(e, 0).dimensiones["habilitats-socials"], 0);
  assert.equal(C.puntuar(r, [2, 0, 3, 1]).total, 10);
  assert.equal(C.puntuar(r, [1, 3, 0, 2]).total, 0); // orden inverso: distancia máxima
  assert.equal(C.puntuar(r, [0, 2, 3, 1]).total, 8);
  assert.throws(() => C.puntuar(r, [2, 0]));
});

test("SELF_ASSESSMENT: escala por competencia con ítem invertido, consistencia y sin respuesta correcta ni diagnóstico", () => {
  const { C } = motor();
  const r = C.evaluarCuestionario(D, { "aa-autocontrol-1": 5, "aa-autocontrol-2": 1, "aa-cooperacio-1": 5, "aa-cooperacio-2": 5 });
  assert.equal(r.tipo, "SELF_ASSESSMENT");
  assert.equal(r.escalas.autocontrol, 10);   // 5 y (6-1)=5 → media 5 → 10/10
  assert.equal(r.escalas.cooperacio, 6);     // 5 y (6-5)=1 → media 3 → 6/10
  assert.deepEqual([...r.poco_consistentes], ["cooperacio"]);
  assert.equal(r.consistencia_pct, 50);
  assert.match(r.aviso, /No es una nota.*ni un diagnóstico/);
  assert.ok(!/aprob|apte|correct/i.test(JSON.stringify(r).replace(r.aviso, "")));
});

test("progreso y contrato adaptativo: strength solo desde OBJECTIVE_SCORE; la autopercepción va aparte; recommended_next explicable", () => {
  const { C, almacen } = motor();
  let st = C.estado("mossos-esquadra", D);
  assert.equal(st.recommended_next, "autocontrol"); // sin entrenar y clave
  assert.equal(st.competencias.autocontrol.competency_strength, null);
  C.registrar("mossos-esquadra", D.escenarios[0], C.puntuar(D.escenarios[0], 2), 1000);
  C.guardarCuestionario("mossos-esquadra", C.evaluarCuestionario(D, { "aa-autocontrol-1": 5, "aa-autocontrol-2": 1 }), 2000);
  st = C.estado("mossos-esquadra", D);
  const a = st.competencias.autocontrol;
  assert.deepEqual([a.competency_strength, a.competency_training_count, a.last_training, a.self_assessment], [0, 1, 1000, 10]);
  assert.equal(st.recommended_next, "cooperacio"); // la siguiente sin entrenar
  assert.equal(st.resumen.ejercicios_completados, 1); assert.equal(st.resumen.competencias_entrenadas, 1); assert.equal(st.resumen.competencias_pendientes, 9);
  assert.equal(st.evolucion_autopercepcion.length, 1);
  assert.ok(almacen.has(C.LS)); // persistencia local
  for (const k of ["competency_strength", "competency_training_count", "last_training", "recommended_next"]) assert.ok(k in a, k);
  assert.equal(C.estado("otra-oposicion", D).resumen.ejercicios_completados, 0);
});

test("contenido publicado y build: solo VALID, sin afirmaciones oficiales y página con datos sin trazas internas", { skip: !fs.existsSync("catalogo/competencias/mossos-esquadra.json") }, () => {
  const pub = JSON.parse(fs.readFileSync("catalogo/competencias/mossos-esquadra.json", "utf8"));
  const ids = new Set(PREP.lista.map((c) => c.id));
  // juez-competencias-v2 (Sonnet de referencia) dejó 45 VALID y pasó 16 a REVIEW_REQUIRED: no se regenera volumen para compensar
  assert.ok(pub.escenarios.length >= 45, "≥45 escenarios publicados");
  for (const e of pub.escenarios) {
    assert.equal(e.traza.politica, "juez-competencias-v2", e.id);
    assert.ok(e.traza.veredictos.some((v) => /sonnet/i.test(v.modelo) && v.verdict === "VALID"), e.id); // VALID solo con la referencia
    assert.ok(e.traza.veredictos.every((v) => v.verdict === "VALID"), e.id); // ningún veredicto aceptado más conservador
  }
  assert.ok(!pub.escenarios.some((e) => pub.cola_revision.includes(e.id)));
  for (const c of ids) assert.ok(pub.escenarios.filter((e) => e.competency_id === c).length >= 4, c);
  assert.ok(pub.escenarios.every((e) => ids.has(e.competency_id) && e.verification_status === "VALID" && e.source_type === "TESTLEY_GENERATED"));
  assert.ok(!/aprovar[àa]s|criteri oficial|el tribunal valora|diagn[òo]stic|trastorn/i.test(JSON.stringify(pub.escenarios.concat(pub.competencias))));
  const web = JSON.parse(fs.readFileSync("docs/datos/competencias-mossos-esquadra.json", "utf8"));
  assert.equal(web.oficial.lista.length, 10);
  assert.ok(!JSON.stringify(web).includes('"traza"'));
  const html = fs.readFileSync("docs/oposiciones/mossos-esquadra/competencias/index.html", "utf8");
  assert.match(html, /assets\/competencias\.js/); assert.match(html, /Es valoren les competències següents/);
  assert.match(fs.readFileSync("docs/oposiciones/mossos-esquadra/index.html", "utf8"), /competencias\/">Competencias y autoconocimiento/);
  assert.ok(!fs.existsSync("docs/oposiciones/policia-nacional-escala-basica/competencias/index.html"));
  const cfg = JSON.parse(fs.readFileSync("config.json", "utf8")).planes;
  assert.equal(cfg.free.competencias_completo, false); assert.equal(cfg.premium.competencias_completo, true);
});
