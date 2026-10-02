// PsychotechnicalEngine (B6): separación OFFICIAL_EXAM / TESTLEY_GENERATED, práctica sin puntuación oficial inventada.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { cargar } from "./entorno.mjs";

const CAT = JSON.parse(fs.readFileSync("catalogo/psicotecnicos.json", "utf8"));
const IDS = CAT.categorias.map((c) => c.id);
const MOSSOS = CAT.pruebas["mossos-esquadra"];
const gen = (i, cat = "numerico", dif = 1) => ({ id: "tl-" + i, categoria: cat, dif, procedencia: "TESTLEY_GENERATED", q: "2, 4, 8, ?", o: ["10", "12", "16", "14"], a: 2 });
const ofi = (i) => ({ id: "of-" + i, categoria: "verbal", procedencia: "OFFICIAL_EXAM", q: "x", o: ["a", "b", "c", "d"], a: 0, fuente: { url: "https://mossos.gencat.cat/x.pdf", documento: "Model oficial" } });
const motor = () => cargar(["web/assets/psicotecnicos.js"]).ctx.TLPsico;

test("estructura oficial de Mossos con cita literal de las bases y sin fórmula inventada", () => {
  const bases = fs.readFileSync("catalogo/fuentes/DOGC-1046460.txt", "utf8").replace(/\s+/g, " ");
  for (const c of MOSSOS.citas) assert.ok(bases.includes(c.replace(/\s+/g, " ")), c.slice(0, 40));
  assert.deepEqual([MOSSOS.preguntas, MOSSOS.minutos, MOSSOS.penalizacion], [80, 35, 0]);
  assert.equal(MOSSOS.formula_verificable, false);
  assert.ok(MOSSOS.categorias.every((c) => IDS.includes(c)));
  for (const c of ["verbal", "numerico", "abstracto", "logico", "atencion", "percepcion", "memoria"]) assert.ok(IDS.includes(c), c);
});

test("validación: procedencia y fuente; lo generado nunca se presenta como oficial", () => {
  const P = motor();
  assert.deepEqual([...P.validar(gen(1), IDS)], []);
  assert.deepEqual([...P.validar(ofi(1), IDS)], []);
  assert.ok(P.validar({ ...ofi(2), fuente: null }, IDS).length, "oficial sin fuente");
  assert.ok(P.validar({ ...gen(3), reproduccion_oficial: true }, IDS).length, "generado que dice ser oficial");
  assert.ok(P.validar({ ...gen(4), procedencia: "OFFICIAL_LIKE" }, IDS).length);
  assert.ok(P.validar({ ...gen(5), categoria: "derecho" }, IDS).length, "nada de preguntas legales aquí");
});

test("una sesión no mezcla OFFICIAL_EXAM y TESTLEY_GENERATED", () => {
  const P = motor();
  assert.throws(() => P.sesion([gen(1), ofi(1)]));
  assert.equal(P.sesion([ofi(1), ofi(2)]).procedencia, "OFFICIAL_EXAM");
});

test("práctica: aciertos, errores, blancos, tiempo, dificultad y progreso; puntuación oficial nula sin fórmula", () => {
  const P = motor();
  const s = P.sesion([gen(1), gen(2, "numerico", 2), gen(3, "abstracto")], { oposicion: "mossos-esquadra", ahora: 1000 });
  P.responder(s, "tl-1", 2, 20); P.responder(s, "tl-2", 0, 30);
  const r = P.terminar(s, MOSSOS, 61000);
  assert.deepEqual([r.aciertos, r.errores, r.blancos, r.segundos], [1, 1, 1, 60]);
  assert.equal(r.puntuacion_oficial, null);
  assert.match(r.motivo_sin_puntuacion, /fórmula verificable/);
  assert.equal(r.porCategoria.numerico.ok, 1);
  assert.equal(r.porDificultad["2"].n, 1);
  const pr = P.progreso("mossos-esquadra");
  assert.equal(pr.numerico.acierto_pct, 50);
  assert.equal(pr.numerico.seg_por_pregunta, 25);
});
