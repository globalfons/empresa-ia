// Interview Engine (Mossos 360 · Fase 3): rúbrica explicable de entrenamiento, respuesta preparada para voz, sesiones,
// persistencia local, métricas reales, SELF_ASSESSMENT separado, sin predicción ni diagnóstico, build y enlaces.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { cargar } from "./entorno.mjs";

const motor = () => { const c = cargar(["web/assets/entrevista.js"]); return { E: c.ctx.TLEntrevista, almacen: c.almacen }; };
const PREP = JSON.parse(fs.readFileSync("catalogo/preparacion/mossos-esquadra.json", "utf8")).convocatorias["46/26"].competencias;
const COMPS = PREP.lista.map((c) => ({ id: c.id, nombre: c.nombre }));
const esc = (comp, n, extra = {}) => ({ id: `ent-${comp}-${n}`, competency_ids: [comp], tipo: "conductual", categoria: "equip", dificultad: 2,
  situacion: "Experiència en què el candidat va cometre un error a la feina i el va haver d'assumir davant l'equip.",
  pregunta: "Explica'm una vegada que vas cometre un error a la feina. Com el vas gestionar?", indicadores: ["a", "b", "c"], errores_frecuentes: ["x", "y"], repregunta: "Què faries diferent?", ...extra });
const D = { oposicion: "mossos-esquadra", call_id: "46/26", competencias: COMPS,
  escenarios: COMPS.flatMap((c) => [1, 2, 3].map((n) => esc(c.id, n, n === 3 ? { tipo: "situacional", categoria: "conflicte" } : {}))) };
const BONA = "Una vegada, quan treballava al supermercat l'any 2022, vaig cometre un error amb l'inventari de la setmana. Primer vaig parlar amb la responsable i li vaig explicar l'error, perquè era responsabilitat meva. Després vam revisar junts les dades amb l'equip i vaig proposar un sistema de doble revisió. Al final es va resoldre abans del tancament. Vaig aprendre que comunicar l'error de seguida és millor que amagar-lo.";
const POBRA = "Sempre faig les coses bé.";

test("evaluación de entrenamiento: dimensiones explicables, determinista y sin respuesta modelo", () => {
  const { E } = motor(), e = D.escenarios[0];
  const a = E.evaluar(e, BONA), b = E.evaluar(e, BONA), p = E.evaluar(e, POBRA);
  assert.deepEqual(a, b);
  assert.equal(a.tipo, "INTERVIEW_OBJECTIVE_TRAINING_SCORE");
  assert.deepEqual(Object.keys(a.dimensiones).sort(), ["claridad", "concrecion", "estructura", "reflexion", "relacion"]);
  assert.deepEqual(Object.keys(a.competency_scores), ["responsabilitat"]);
  assert.ok(a.total > p.total + 3, `${a.total} vs ${p.total}`);
  assert.ok(a.dimensiones.estructura >= 7 && a.dimensiones.reflexion >= 7);
  assert.ok(a.strengths.length > 0 && p.weaknesses.length > 0 && p.improvement_points.length > 0);
  for (const v of [...Object.values(a.dimensiones), ...Object.values(a.competency_scores), a.total]) assert.ok(v >= 0 && v <= 10);
  assert.match(a.feedback[0], /No es la valoración del tribunal/);
  assert.ok(!("respuesta_modelo" in a) && !("respuesta_correcta" in a));
});

test("una respuesta más larga no puntúa más solo por ser larga", () => {
  const { E } = motor(), e = D.escenarios[0];
  const relleno = Array(60).fill("i ho repeteixo sense aportar res més al que deia").join(" ") + ".";
  assert.ok(E.evaluar(e, POBRA + " " + relleno).total < E.evaluar(e, BONA).total);
  assert.ok(E.evaluar(e, BONA + " " + relleno).improvement_points.some((x) => /Resume/.test(x)));
});

test("InterviewAnswer preparado para voz: type voice con transcript se analiza igual que el texto", () => {
  const { E } = motor(), e = D.escenarios[0];
  const voz = E.evaluar(e, { type: "voice", text: null, audio_reference: "audio://x", transcript: BONA });
  assert.equal(voz.answer_type, "voice");
  assert.equal(voz.total, E.evaluar(e, { type: "text", text: BONA }).total);
});

test("sesiones por modo, persistencia local con forma InterviewSession y métricas solo con datos reales", () => {
  const { E, almacen } = motor();
  const m0 = E.metricas("mossos-esquadra", D);
  assert.equal(m0.sesiones, 0); assert.equal(m0.media, null); assert.equal(m0.area_a_reforzar, null); assert.equal(m0.competencias_total, 10);
  const pr = E.nuevaSesion(D, { modo: "practica", competencia: "autocontrol" }, 7, 1000);
  assert.equal(pr.scenario_ids.length, 3);
  assert.ok(pr.scenario_ids.every((id) => id.startsWith("ent-autocontrol-")));
  for (const k of ["id", "user_id", "opposition_id", "call_id", "started_at", "completed_at", "mode", "scenario_ids", "answers", "evaluations"]) assert.ok(k in pr, k);
  const mx = E.nuevaSesion(D, { modo: "mixta" }, 3, 1000);
  assert.equal(new Set(mx.scenario_ids.map((id) => id.split("-").slice(1, -1).join("-"))).size, 5);
  const si = E.nuevaSesion(D, { modo: "simulada" }, 3, 1000);
  assert.equal(si.scenario_ids.length, 8); assert.match(si.scenario_ids[0], /^ent-motivacio-/);
  const di = E.nuevaSesion(D, { modo: "dificiles" }, 3, 1000);
  assert.ok(di.scenario_ids.length === 4 && di.scenario_ids.every((id) => id.endsWith("-3")));

  const ent = (id) => D.escenarios.find((x) => x.id === id);
  E.responder(pr, ent(pr.scenario_ids[0]), BONA);
  E.responder(pr, ent(pr.scenario_ids[1]), POBRA);
  assert.equal(pr.answers[0].answer.type, "text");
  const inf = E.terminar(pr, 5000);
  assert.equal(inf.preguntas, 2);
  assert.ok(inf.errores_recurrentes.length >= 0 && inf.evolucion === null);
  const h = JSON.parse(almacen.get(E.LS));
  assert.equal(h.sesiones.length, 1); assert.equal(h.sesiones[0].completed_at, 5000);
  const m1 = E.metricas("mossos-esquadra", D);
  assert.equal(m1.sesiones, 1); assert.equal(m1.competencias_entrenadas, 1); assert.equal(m1.ultima_sesion, 5000);
  assert.ok(m1.media != null && m1.area_mas_debil && m1.area_a_reforzar);
  assert.notEqual(m1.area_a_reforzar, "autocontrol"); // las no practicadas van primero
  const s2 = E.nuevaSesion(D, { modo: "practica", competencia: "autocontrol" }, 9, 6000);
  E.responder(s2, ent(s2.scenario_ids[0]), BONA);
  assert.ok(E.terminar(s2, 7000).evolucion.diferencia != null);
  assert.equal(E.metricas("otra-oposicion", D).sesiones, 0);
});

test("SELF_ASSESSMENT_SCORE se guarda aparte y no altera la puntuación de entrenamiento", () => {
  const { E } = motor(), s = E.nuevaSesion(D, { modo: "practica", competencia: "cooperacio" }, 1, 1);
  const e = D.escenarios.find((x) => x.id === s.scenario_ids[0]);
  const ev = E.responder(s, e, BONA), antes = ev.total;
  const a = E.autoevaluar(s, e, [0, 2]);
  assert.deepEqual([a.tipo, a.marcados, a.total], ["SELF_ASSESSMENT_SCORE", 2, 3]);
  assert.equal(s.evaluations[0].total, antes);
  const inf = E.terminar(s, 2);
  assert.equal(inf.tipo, "INTERVIEW_OBJECTIVE_TRAINING_SCORE");
  assert.equal(inf.autoevaluacion.tipo, "SELF_ASSESSMENT_SCORE");
});

test("sin predicción de aprobado ni diagnóstico en el motor ni en la interfaz", () => {
  for (const f of ["web/assets/entrevista.js", "web/assets/entrevista-ui.js"]) {
    // Los avisos que niegan la predicción («ni predice si aprobarás», «ni probabilidad de aprobar») son obligatorios: se excluyen
    const src = fs.readFileSync(f, "utf8").toLowerCase().replace(/ni (predice si aprobarás|probabilidad de aprobar)/g, "");
    assert.doesNotMatch(src, /probabilidad de aprobar|vas a aprobar|aprobarás|trastorno|diagn[oó]stic[oa] (de|psicol)|personalidad (patol|desajust)/, f);
  }
  const { E } = motor(), s = E.nuevaSesion(D, { modo: "practica", competencia: "autocontrol" }, 1, 1);
  E.responder(s, D.escenarios.find((x) => x.id === s.scenario_ids[0]), BONA);
  assert.match(E.terminar(s, 2).aviso, /no es la puntuación del tribunal ni predice/i);
});

test("config: el entrenador completo es del Pase; sin Pase hay muestra", () => {
  const cfg = JSON.parse(fs.readFileSync("config.json", "utf8"));
  assert.equal(cfg.planes.free.entrevista_completa, false);
  assert.ok(cfg.planes.free.entrevista_muestra >= 1);
  assert.equal(cfg.planes.premium.entrevista_completa, true);
});

test("build: página de entrevista, datos sin trazas, enlaces desde la oposición y competencias", { skip: !fs.existsSync("docs/datos/entrevista-mossos-esquadra.json") }, () => {
  const web = JSON.parse(fs.readFileSync("docs/datos/entrevista-mossos-esquadra.json", "utf8"));
  assert.equal(web.competencias.length, 10);
  assert.equal(web.oficial.verification_status, "OFFICIAL_VERIFIED");
  for (const c of web.competencias) assert.ok(web.escenarios.filter((e) => e.competency_ids[0] === c.id).length >= 3, c.id); // modo práctica
  for (const e of web.escenarios) {
    assert.equal(e.verification_status, "VALID"); assert.equal(e.source_type, "TESTLEY_TRAINING");
    assert.ok(!("traza" in e) && !("generated_by" in e));
    assert.ok(e.competency_ids.every((c) => web.competencias.some((x) => x.id === c)));
  }
  const html = fs.readFileSync("docs/oposiciones/mossos-esquadra/entrevista/index.html", "utf8");
  assert.match(html, /id="entrevista"/); assert.match(html, /entrevista\.js/); assert.match(html, /criterios de entrenamiento de TestLey/i);
  assert.match(fs.readFileSync("docs/oposiciones/mossos-esquadra/index.html", "utf8"), /entrevista\/"/);
  assert.match(fs.readFileSync("docs/oposiciones/mossos-esquadra/competencias/index.html", "utf8"), /entrevista\/"/);
  assert.ok(!fs.existsSync("docs/oposiciones/policia-nacional-escala-basica/entrevista/index.html"));
});
