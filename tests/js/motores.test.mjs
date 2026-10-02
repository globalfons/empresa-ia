// Motores de preparación (Mossos 360 · F10-F14): plan de hoy, tipos de sesión, simulacro sin repetidas, módulos y calendario.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { cargar } from "./entorno.mjs";

const OP = "mossos-esquadra";
const datos = () => {
  const qs = [...Array(60)].map((_, i) => ({ id: "q" + i, ley: "guia-mossos", art: "A.1." + (i % 5), tm: [i % 3], dif: 1 + (i % 3) }));
  const arts = Object.fromEntries([...Array(5)].map((_, i) => ["A.1." + i, { t: "Apartat " + i, b: "Tema A.1" }]));
  const temario = [0, 1, 2].map((i) => ({ i, n: "A." + (i + 1), t: "Tema " + i, b: "Àmbit A", leyes: ["guia-mossos"] }));
  return { qs, arts, temario };
};
const perfil = {
  id: OP, simulacro: { preguntas: 30, minutos: 35 },
  temario: [{ i: 0, id: "A.1", cobertura: "PARCIAL" }, { i: 1, id: "C.5", cobertura: "SIN_PREGUNTAS" }],
  modulos: [{ id: "prueba_fisica", nombre: "Prueba física", tipo: "checklist", acciones: ["Leer el anexo oficial", "Registrar una sesión"] }],
  calendario: [{ fecha: "2026-10-17", hito: "1a prova", caracter: "OFICIAL" }, { fecha: "2026-11-23", hito: "Prova física", caracter: "PREVISIO" }, { fecha: "2026-06-08", hito: "Bases", caracter: "OFICIAL" }],
};
const motor = (cfg = { opos: [OP] }) => cargar(["web/assets/store.js", "web/assets/plan.js", "web/assets/motores.js"], cfg).ctx;

test("TODAY_PLAN: desglose completo y minutos dentro del tiempo disponible", () => {
  const ctx = motor();
  const d = datos();
  d.qs.slice(0, 12).forEach((q, i) => ctx.TL.registrarRespuesta(q.ley, q.id, i % 2 === 0, OP));
  const s = ctx.TL.stats(OP, d);
  const h = ctx.TLMotor.hoy({ s, data: d, aj: { horasSemana: 7, dias: [0, 1, 2, 3, 4, 5, 6] }, perfil, sim: perfil.simulacro, estado: ctx.TL.estado });
  for (const k of ["review", "weak_topics", "new_questions", "difficult_questions", "simulation", "recommended_minutes"]) assert.ok(k in h, k);
  assert.equal(h.descanso, false);
  assert.ok(h.recommended_minutes > 0 && h.recommended_minutes <= h.disponibles, JSON.stringify(h));
  assert.ok(h.review.preguntas >= 1, "las falladas se repasan hoy");
  assert.ok(h.new_questions.preguntas > 0);
  assert.equal(h.simulation, null, "sin 30 respuestas aún no toca simulacro");
  assert.deepEqual([...h.temas_sin_preguntas], ["C.5"]);
});

test("TODAY_PLAN: día de descanso y simulacro cuando toca", () => {
  const ctx = motor();
  const d = datos();
  const s = ctx.TL.stats(OP, d);
  const domingo = new Date("2026-10-04T10:00:00").getTime();
  assert.equal(ctx.TLMotor.hoy({ s, data: d, aj: { dias: [1, 2, 3] }, perfil, estado: ctx.TL.estado, ahora: domingo }).descanso, true);
  const s2 = Object.assign({}, s, { respuestas: 40, sesiones: [] });
  const h = ctx.TLMotor.hoy({ s: s2, data: d, aj: { horasSemana: 14 }, perfil, sim: perfil.simulacro, estado: ctx.TL.estado });
  assert.equal(h.simulation.minutos, 35);
  assert.ok(h.recommended_minutes >= 35);
});

test("sesiones: tipo normalizado y detalle (temas, dificultad, nota, oposición, inicio/fin)", () => {
  const ctx = motor();
  assert.deepEqual(["repaso", "fallos", "simulacro", "oficial", "tema", "medida", "rapido"].map(ctx.TL.tipoSesion),
    ["REVIEW", "WEAKNESS", "SIMULATION", "OFFICIAL_EXAM", "TRAINING", "CUSTOM", "QUICK_TEST"]);
  ctx.TL.registrarSesion(OP, 10, 7, 2, 1, "simulacro", 0.25, 600, { temas: { 0: 6, 1: 4 }, dificultad: { 1: 3, 2: 7 } });
  const x = ctx.TL.stats(OP, datos()).sesiones.pop();
  assert.equal(x[8].tipo, "SIMULATION");
  assert.equal(x[8].oposicion, OP);
  assert.equal(x[8].nota, 6.5);
  assert.equal(x[8].fin - x[8].inicio, 600000);
  assert.deepEqual({ ...x[8].temas }, { 0: 6, 1: 4 });
  ctx.TL.registrarSesion("ley-39-2015", 5, 5, 0, 0, "repaso", 1 / 3, 60); // firma antigua sigue funcionando
  assert.equal(ctx.TL.stats("ley-39-2015", datos()).sesiones.pop()[8].tipo, "REVIEW");
});

test("simulacro: evita las preguntas respondidas en los últimos 7 días si el perfil lo pide", () => {
  const ctx = motor();
  const qs = [...Array(40)].map((_, i) => ({ id: "q" + i, ley: "guia-mossos", tm: [0] }));
  qs.slice(0, 30).forEach((q) => ctx.TL.registrarRespuesta(q.ley, q.id, true, OP));
  const s = ctx.TL.seleccionSimulacro(qs, { preguntas: 10, evitar_repetidas: true });
  assert.ok(s.lista.every((q) => +q.id.slice(1) >= 30), "las 10 son de las no vistas");
  const t = ctx.TL.seleccionSimulacro(qs, { preguntas: 15, evitar_repetidas: true });
  assert.equal(t.lista.length, 15, "si no hay bastantes nuevas, completa con vistas");
});

test("módulos no medibles: checklist y registro manual, sin nota", () => {
  const ctx = motor();
  const m = perfil.modulos[0];
  ctx.TLMotor.marcarAccion(OP, m.id, 0, true);
  assert.equal(ctx.TLMotor.registrarManual(OP, m.id, "  "), false);
  assert.equal(ctx.TLMotor.registrarManual(OP, m.id, "Course Navette: palier 7"), true);
  const e = ctx.TLMotor.estadoModulo(OP, m);
  assert.equal(e.hechas, 1);
  assert.equal(e.total, 2);
  assert.equal(e.registros[0].texto, "Course Navette: palier 7");
  assert.ok(!("nota" in e) && !("puntuacion" in e));
  ctx.TLMotor.marcarAccion(OP, m.id, 0, false);
  assert.equal(ctx.TLMotor.estadoModulo(OP, m).hechas, 0);
});

test("calendario: próximos hitos ordenados, oficial y previsión distinguidos", () => {
  const ctx = motor();
  const p = ctx.TLMotor.proximos(perfil, new Date("2026-10-02T12:00:00").getTime());
  assert.deepEqual(p.map((c) => [c.hito, c.caracter, c.dias]), [["1a prova", "OFICIAL", 15], ["Prova física", "PREVISIO", 52]]);
});

test("build: perfil para el navegador sin preguntas ni respuestas y simulacro con reparto del perfil", () => {
  const p = JSON.parse(fs.readFileSync(`docs/datos/perfil-${OP}.json`, "utf8"));
  const txt = JSON.stringify(p);
  assert.ok(!/"qs"|"preguntes"|"o":\[/.test(txt));
  assert.equal(p.convocatoria.actual.estado, "CURRENT_CALL");
  assert.equal(p.simulacro.distribucion_origen, "OFFICIAL_EXAM");
  assert.ok(p.modulos.some((m) => m.tipo === "checklist"));
  const html = fs.readFileSync(`docs/oposiciones/${OP}/index.html`, "utf8");
  const sim = JSON.parse(html.match(/id="quiz"[^>]*data-sim="([^"]+)"/)[1].replace(/&quot;/g, '"').replace(/&amp;/g, "&"));
  assert.equal(sim.reparto.reduce((a, r) => a + r.preguntas, 0), sim.preguntas);
  assert.equal(sim.evitar_repetidas, true);
});
