// Physical Engine (Mossos 360 · módulo F): lectura de los barems oficiales, mínimos, plan orientativo y persistencia local.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { cargar } from "./entorno.mjs";

const OF = JSON.parse(fs.readFileSync("catalogo/perfiles/mossos-esquadra.json", "utf8")).motor360.modulos.physical.oficial;
const F = () => cargar(["web/assets/fisica.js"]).ctx.TLFisica;
const pr = (id) => OF.pruebas.find((p) => p.id === id);

test("puntuar: extremos del barem oficial (tiempo menor y repeticiones mayor)", () => {
  const T = F(), CA = OF.barems.homes.CA, PB = OF.barems.homes.PB;
  assert.equal(T.puntuar(pr("circuit-agilitat"), 22, CA), 0);
  assert.equal(T.puntuar(pr("circuit-agilitat"), 21.5, CA), 1);
  assert.equal(T.puntuar(pr("circuit-agilitat"), 16.3, CA), 9);
  assert.equal(T.puntuar(pr("circuit-agilitat"), 16.2, CA), 10);
  assert.equal(T.puntuar(pr("pressio-banc"), 23, PB), 0);
  assert.equal(T.puntuar(pr("pressio-banc"), 24, PB), 1);
  assert.equal(T.puntuar(pr("pressio-banc"), 42, PB), 9);
  assert.equal(T.puntuar(pr("pressio-banc"), 43, PB), 10);
  assert.equal(T.puntuar(pr("cursa-llancadora"), 5, OF.barems.dones.CL), 3);
  assert.equal(T.puntuar(pr("cursa-llancadora"), "x", OF.barems.dones.CL), null);
});

test("nota: ponderación oficial y mínimos (1 por ejercicio, 5 en total)", () => {
  const T = F();
  const ok = T.nota(OF, "homes", { "circuit-agilitat": 18.4, "pressio-banc": 33, "cursa-llancadora": 9.5 });
  assert.equal(ok.completas, true);
  assert.equal(ok.minimos_ok, true);
  assert.ok(Math.abs(ok.total - 6) < 0.05);
  const ko = T.nota(OF, "homes", { "circuit-agilitat": 25, "pressio-banc": 42, "cursa-llancadora": 12.5 });
  assert.equal(ko.minimos_ok, false);
  assert.deepEqual([...ko.por_debajo_minimo].map((x) => x.id || x), ["circuit-agilitat"]);
  assert.equal(T.nota(OF, "homes", { "pressio-banc": 30 }).completas, false);
});

test("plan: orientativo, prioriza la prueba más débil y se ajusta a la fecha", () => {
  const T = F(), ahora = Date.parse("2026-10-09T10:00:00Z");
  const marcas = { "circuit-agilitat": 21, "pressio-banc": 39, "cursa-llancadora": 11 };
  const sin = T.plan(OF, "homes", marcas, null, ahora);
  assert.equal(sin.orientativo, true);
  assert.equal(sin.semanas, 12);
  assert.equal(sin.prioridad[0], "circuit-agilitat");
  const con = T.plan(OF, "homes", marcas, "2026-11-20", ahora);
  assert.ok(con.semanas >= 1 && con.semanas <= 7);
  assert.equal(con.semanas_plan.length, con.semanas);
  assert.equal(T.plan(OF, "homes", marcas, "2027-12-01", ahora).semanas, 16);
});

test("registro local y resumen para el panel 360", () => {
  const T = F();
  assert.equal(T.resumen(OF).estado, "sin_registros");
  T.registrar("pressio-banc", 30, Date.parse("2026-10-01"));
  T.registrar("pressio-banc", 34, Date.parse("2026-10-05"));
  assert.equal(T.mejores(OF, T.datos().registros)["pressio-banc"], 34);
});
