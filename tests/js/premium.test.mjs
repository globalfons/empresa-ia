// B1 · Protección premium: build real con bancoPrivado en carpetas temporales (no toca docs/).
// FREE no puede obtener contenido premium de los recursos públicos; PREMIUM lo obtiene solo vía la función «banco».
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { cargar } from "./entorno.mjs";

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "tl-premium-"));
const OUT = path.join(tmp, "web"), PRIV = path.join(tmp, "privado");
execFileSync("node", ["build.mjs"], { env: { ...process.env, TL_OUT: OUT, TL_PRIV: PRIV, TL_BANCO_PRIVADO: "1" }, stdio: "ignore" });
const privado = Object.fromEntries(fs.readdirSync(PRIV).map((f) => [f.replace(/\.json$/, ""), JSON.parse(fs.readFileSync(path.join(PRIV, f), "utf8"))]));
const ENTRENO = /^(competencias|entrevista)-/; // escenarios de entrenamiento premium (no son preguntas)
const premium = Object.entries(privado).filter(([k]) => !ENTRENO.test(k)).flatMap(([, x]) => x.qs);
const guia = JSON.parse(fs.readFileSync("datos/preguntas-guia-mossos.json", "utf8")).filter((q) => !["DEPRECATED", "OUTDATED"].includes(q.verification_status));

function todosLosFicheros(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? todosLosFicheros(path.join(dir, e.name)) : [path.join(dir, e.name)]));
}

test("el banco premium se genera fuera de la web pública y solo con lo premium (guía de Mossos)", () => {
  assert.ok(premium.length >= guia.length - 10 - 1, `${premium.length} premium de ${guia.length}`);
  assert.ok(!PRIV.startsWith(OUT));
  assert.deepEqual(Object.keys(privado).sort(), ["competencias-mossos-esquadra", "entrevista-mossos-esquadra", "guia-mossos", "mossos-esquadra"]);
  assert.ok(premium.every((q) => (q.ley || "guia-mossos") === "guia-mossos"), "nada de leyes del BOE (gratis por artículo)");
});

test("FREE: ningún recurso público (datos ni HTML) contiene una pregunta premium", () => {
  const ids = new Set(premium.map((q) => q.id));
  // prefijo de 60 caracteres de cada pregunta premium; si una pregunta pública empieza igual (fórmula común «Segons les idees força
  // del tema…»), ese prefijo no prueba nada y se comprueba el enunciado completo
  const ficheros = todosLosFicheros(OUT).filter((f) => /\.(json|html|js)$/.test(f));
  const pub = new Set(ficheros.filter((f) => f.endsWith(".json")).flatMap((f) => { try { return (JSON.parse(fs.readFileSync(f, "utf8")).qs || []).map((q) => (q.q || "").slice(0, 60)); } catch (e) { return []; } }));
  const textos = premium.map((q) => (pub.has(q.q.slice(0, 60)) ? q.q : q.q.slice(0, 60)));
  for (const f of ficheros) {
    const t = fs.readFileSync(f, "utf8");
    if (f.endsWith(".json") && t.includes('"qs"')) for (const q of JSON.parse(t).qs || []) assert.ok(!ids.has(q.id), `${q.id} en ${path.relative(OUT, f)}`);
    for (const x of textos) assert.ok(!t.includes(x), `texto premium en ${path.relative(OUT, f)}`);
  }
});

test("FREE conserva lo gratuito: muestra de 10 de la guía, leyes del BOE completas y exámenes oficiales", () => {
  const mossos = JSON.parse(fs.readFileSync(path.join(OUT, "datos/mossos-esquadra.json"), "utf8"));
  assert.equal(mossos.premium, true);
  assert.equal(mossos.qs.filter((q) => q.ley === "guia-mossos").length, 10);
  const pub = JSON.parse(fs.readFileSync("docs/datos/constitucion.json", "utf8")).qs.length;
  assert.equal(JSON.parse(fs.readFileSync(path.join(OUT, "datos/constitucion.json"), "utf8")).qs.length, pub);
  assert.ok(fs.existsSync(path.join(OUT, "datos/examen-mossos-esquadra-46-25.json")));
  assert.match(fs.readFileSync(path.join(OUT, "index.html"), "utf8"), /"bancoPrivado":true/);
});

const cfg = { root: "./", supabaseUrl: "https://sb.test", supabaseAnonKey: "anon", pase: true, bancoPrivado: true, planes: { free: { leyes_completas: ["ley-39-2015"] }, premium: {} }, opos: ["mossos-esquadra"] };
const publico = () => JSON.parse(fs.readFileSync(path.join(OUT, "datos/mossos-esquadra.json"), "utf8"));
function cliente(respuestaFuncion) {
  const llamadas = [];
  const fetch = (u, o) => {
    llamadas.push({ u, o });
    if (u.includes("/functions/v1/banco")) return Promise.resolve({ ok: respuestaFuncion.status === 200, json: () => Promise.resolve(respuestaFuncion.body) });
    return Promise.resolve({ ok: true, json: () => Promise.resolve(publico()) });
  };
  const { ctx, almacen } = cargar(["web/assets/store.js"], cfg, { fetch });
  return { ctx, almacen, llamadas };
}

test("FREE en el navegador: no pide la función y solo ve la muestra", async () => {
  const { ctx, llamadas } = cliente({ status: 403, body: {} });
  const d = await ctx.TL.cargar("mossos-esquadra");
  assert.ok(!llamadas.some((x) => x.u.includes("/functions/")));
  assert.equal(d.qs.filter((q) => q.ley === "guia-mossos").length, 10);
});

test("Pase falso en localStorage: la función (servidor) lo rechaza y no hay contenido premium", async () => {
  const { ctx, almacen, llamadas } = cliente({ status: 403, body: { error: "Tu plan no incluye este contenido" } });
  almacen.set("testley:pase", JSON.stringify({ clave: "FALSA", ok: true, t: Date.now() }));
  const d = await ctx.TL.cargar("mossos-esquadra");
  assert.ok(llamadas.some((x) => x.u === "https://sb.test/functions/v1/banco"));
  assert.equal(JSON.parse(llamadas.find((x) => x.u.includes("/functions/")).o.body).licencia, "FALSA", "el servidor valida la clave");
  assert.equal(d.premiumCargado, false);
  assert.equal(d.qs.filter((q) => q.ley === "guia-mossos").length, 10);
});

test("PREMIUM: la función autoriza y el banco completo llega al usuario", async () => {
  const { ctx, almacen } = cliente({ status: 200, body: { clave: "mossos-esquadra", qs: privado["mossos-esquadra"].qs } });
  almacen.set("testley:pase", JSON.stringify({ clave: "LIC-OK", ok: true, t: Date.now() }));
  const d = await ctx.TL.cargar("mossos-esquadra");
  assert.equal(d.premiumCargado, true);
  assert.equal(d.qs.filter((q) => q.ley === "guia-mossos").length, 10 + privado["mossos-esquadra"].qs.length);
  assert.equal(new Set(d.qs.map((q) => q.id)).size, d.qs.length, "sin duplicados");
});

test.after(() => fs.rmSync(tmp, { recursive: true, force: true }));

test("FREE: competencias y entrevista públicas solo con la muestra; el resto únicamente en el banco privado", () => {
  for (const [mod, porComp, comp] of [["competencias", 1, (e) => e.competency_id], ["entrevista", 1, (e) => e.competency_ids[0]]]) {
    const pub = JSON.parse(fs.readFileSync(path.join(OUT, `datos/${mod}-mossos-esquadra.json`), "utf8"));
    const priv = privado[`${mod}-mossos-esquadra`].qs;
    assert.equal(pub.premium, true);
    const n = {}; for (const e of pub.escenarios) n[comp(e)] = (n[comp(e)] || 0) + 1;
    assert.ok(Object.values(n).every((k) => k <= porComp), mod);
    assert.ok(priv.length > pub.escenarios.length, mod);
    const ficheros = todosLosFicheros(OUT).filter((f) => /\.(json|html|js)$/.test(f));
    for (const f of ficheros) { const t = fs.readFileSync(f, "utf8"); for (const e of priv) assert.ok(!t.includes(e.situacion), `${mod} premium en ${path.relative(OUT, f)}`); }
  }
});
