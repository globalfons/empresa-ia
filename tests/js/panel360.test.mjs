// Panel 360 (Mossos 360 · módulo H): estado por módulo solo con datos reales, recomendaciones, fases, reparto y simulacro combinado.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { cargar } from "./entorno.mjs";

const PERFIL = JSON.parse(fs.readFileSync("docs/datos/perfil-mossos-esquadra.json", "utf8"));
const OP = "mossos-esquadra", AHORA = Date.parse("2026-10-09T10:00:00Z");
const motor = () => { const c = cargar(["web/assets/fisica.js", "web/assets/panel360.js"]); return { P: c.ctx.TLPanel360, F: c.ctx.TLFisica, ls: c.ctx.localStorage }; };
const vacio = { respuestas: 0, sesiones: [], porTema: [], vencidas: 0 };

test("sin datos: todos los módulos «sin empezar», sin porcentajes inventados", () => {
  const { P } = motor();
  const r = P.resumen(OP, PERFIL, { stats: vacio, ajustes: {}, ahora: AHORA, checklists: [{ id: "idiomas", nombre: "Lengua", hechas: 0, total: 4 }] });
  assert.deepEqual([...r.modulos.map((m) => m.id)], ["conocimientos", "aptitud", "competencias", "entrevista", "fisica", "otras"]);
  for (const m of r.modulos.filter((m) => m.id !== "competencias" && m.id !== "otras")) assert.equal(m.valor, null, m.id);
  assert.ok(r.modulos.every((m) => m.estado === "sin_empezar"));
  assert.equal(r.dias, null); assert.equal(r.fase, null);
  assert.equal(r.orientativo, true);
  assert.ok(r.recomendaciones.length > 0 && r.recomendaciones.every((x) => /^Empieza/.test(x.texto)));
});

test("con datos: física por debajo del mínimo → alerta primero; fase y reparto según fecha", () => {
  const { P, F } = motor();
  const d = F.datos(); d.sexo = "homes"; F.guardar(d);
  F.registrar("circuit-agilitat", 25); F.registrar("pressio-banc", 42); F.registrar("cursa-llancadora", 12.5);
  const stats = { respuestas: 40, dominioPct: 35, nota: 4.2, vencidas: 3, sesiones: [[AHORA, 20, 12, 8, 0, "simulacro"]], porTema: [{ t: { n: 4 }, cubierto: true, pct: 10 }, { t: { n: 7 }, cubierto: true, pct: 60 }] };
  const r = P.resumen(OP, PERFIL, { stats, ajustes: { fechaExamen: "2026-11-20", horasSemana: 10 }, ahora: AHORA });
  const fis = r.modulos.find((m) => m.id === "fisica");
  assert.equal(fis.alerta, true);
  assert.equal(r.recomendaciones[0].id, "fisica");
  assert.equal(r.modulos[0].debil, "Tema 4 (10 %)");
  assert.equal(r.dias, 42); assert.equal(r.fase.id, "desarrollo");
  const tot = r.reparto.reduce((a, x) => a + x.min, 0);
  assert.ok(Math.abs(tot - 600) <= 30, String(tot));
  assert.equal(r.simulacro.pasos[0].hecho, true);
  assert.equal(r.simulacro.pasos[1].url.endsWith("aptitudinal/#modo=contrarreloj"), true);
  assert.ok(r.recomendaciones.some((x) => x.id === "repaso"));
});

test("fases orientativas por días al examen", () => {
  const { P } = motor();
  assert.equal(P.fase(120).id, "base"); assert.equal(P.fase(60).id, "desarrollo"); assert.equal(P.fase(10).id, "especifica"); assert.equal(P.fase(3).id, "puesta");
});
