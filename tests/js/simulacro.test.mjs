// Simulacros desde el banco: reparto por temas, reparto oficial si la convocatoria lo fija, reserva y sin repeticiones.
import test from "node:test";
import assert from "node:assert/strict";
import { cargar } from "./entorno.mjs";

let semilla = 7;
const azar = () => ((semilla = (semilla * 16807) % 2147483647) / 2147483647);
// 3 temas con 60, 30 y 10 preguntas
const banco = [...Array(100)].map((_, i) => ({ id: "q" + i, tm: [i < 60 ? 0 : i < 90 ? 1 : 2] }));
const porTema = (lista) => lista.reduce((m, q) => ((m[q.tm[0]] = (m[q.tm[0]] || 0) + 1), m), {});

test("simulacro: número exacto, sin repetidas y proporcional a cada tema", () => {
  const { ctx } = cargar(["web/assets/store.js"]);
  const s = ctx.TL.seleccionSimulacro(banco, { preguntas: 20, minutos: 20 }, azar);
  assert.equal(s.lista.length, 20);
  assert.equal(new Set(s.lista.map((q) => q.id)).size, 20);
  assert.deepEqual(porTema(s.lista), { 0: 12, 1: 6, 2: 2 });
  assert.equal(s.reserva.length, 0); // sin reserva si la convocatoria no la prevé
});

test("simulacro: todos los temas cubiertos aunque sean pequeños y reserva aparte", () => {
  const { ctx } = cargar(["web/assets/store.js"]);
  const s = ctx.TL.seleccionSimulacro(banco, { preguntas: 10, reserva: 3 }, azar);
  const t = porTema(s.lista);
  assert.equal(s.lista.length, 10);
  assert.ok(t[0] && t[1] && t[2], JSON.stringify(t));
  assert.equal(s.reserva.length, 3);
  const ids = new Set(s.lista.map((q) => q.id));
  assert.ok(s.reserva.every((q) => !ids.has(q.id)), "la reserva no repite preguntas del simulacro");
});

test("simulacro: reparto oficial por temas cuando la convocatoria lo fija", () => {
  const { ctx } = cargar(["web/assets/store.js"]);
  const s = ctx.TL.seleccionSimulacro(banco, { preguntas: 15, reparto: [{ temas: [2], preguntas: 10 }, { temas: [0, 1], preguntas: 5 }] }, azar);
  assert.equal(s.lista.length, 15);
  assert.equal(porTema(s.lista)[2], 10);
});

test("simulacro: banco pequeño o sin temas", () => {
  const { ctx } = cargar(["web/assets/store.js"]);
  const pocos = banco.slice(0, 5).map((q) => ({ id: q.id }));
  assert.equal(ctx.TL.seleccionSimulacro(pocos, { preguntas: 30 }, azar).lista.length, 5);
});
