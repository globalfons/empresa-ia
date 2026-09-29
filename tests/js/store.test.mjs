import test from "node:test";
import assert from "node:assert/strict";
import { cargar } from "./entorno.mjs";
const PLANES = { free: { tests_completos: false, plan_estudio: false, alertas: false, leyes_completas: ["ley-39-2015"] }, premium: { tests_completos: true, plan_estudio: true, alertas: true } };

test("entitlement: sin pagos configurados todo abierto; con pagos, free por defecto", () => {
  assert.equal(cargar(["web/assets/store.js"], {}).ctx.TL.puede("plan_estudio"), true);
  const { ctx } = cargar(["web/assets/store.js"], { pase: true, planes: PLANES });
  assert.equal(ctx.TL.puede("plan_estudio"), false);
  assert.equal(ctx.TL.esGratis("ley-39-2015"), true);
  assert.equal(ctx.TL.esGratis("constitucion"), false);
});

test("entitlement por servidor solo vale para la misma cuenta", () => {
  const { ctx, almacen } = cargar(["web/assets/store.js"], { pase: true, planes: PLANES });
  almacen.set("testley:sesion", JSON.stringify({ access_token: "t", user: { id: "u1", email: "a@x.es" }, expires_at: Date.now() + 1e7 }));
  almacen.set("testley:plan-servidor", JSON.stringify({ plan: "premium", uid: "u2", t: Date.now() }));
  assert.equal(ctx.TL.pase(), null, "plan de otra cuenta no cuenta");
  almacen.set("testley:plan-servidor", JSON.stringify({ plan: "premium", uid: "u1", t: Date.now() }));
  assert.equal(ctx.TL.pase().fuente, "servidor");
  assert.equal(ctx.TL.puede("plan_estudio"), true);
});

test("simulacros: comparación con el anterior y la media", () => {
  const { ctx } = cargar(["web/assets/store.js"]);
  const ses = [[1, 10, 6, 3, 1, "simulacro", 1 / 3], [2, 10, 8, 1, 1, "simulacro", 1 / 3], [3, 10, 10, 0, 0, "repaso", 1 / 3]];
  const c = ctx.TL.comparaSimulacros(ses, "simulacro");
  assert.equal(c.n, 2); assert.equal(c.diferencia, 2.7); assert.equal(Math.round(c.ultima * 10) / 10, 7.7);
  assert.equal(ctx.TL.comparaSimulacros([], "simulacro"), null);
});

test("gamificación: premia constancia y precisión, no el volumen", () => {
  const { ctx } = cargar(["web/assets/store.js"]);
  const ahora = Date.now(), d = 864e5;
  const base = { racha: 0, cuenta: { dominada: 0 } };
  const volumen = ctx.TL.puntos({ ...base, sesiones: [[ahora, 200, 100, 100, 0]] }, ahora);        // 200 preguntas un día, 50 %
  const constante = ctx.TL.puntos({ ...base, racha: 4, sesiones: [0, 1, 2, 3].map((i) => [ahora - i * d, 20, 16, 4, 0]) }, ahora); // 4 días, 80 %
  assert.ok(constante.constancia > volumen.constancia);
  assert.equal(volumen.precision, 100); assert.equal(constante.precision, 128); // la precisión ≥ 70 % dobla
  const o = ctx.TL.objetivoSemanal(constante, 6);
  assert.equal(o.diasObjetivo, 4); assert.equal(o.cumplido, true);
});
