// Pràctica de català: recompte de paraules, mínim oficial de 180, persistència i dades publicades (lectures del DOGC).
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { cargar } from "./entorno.mjs";

test("recompte orientatiu i mínim de 180 paraules", () => {
  const C = cargar(["web/assets/catala.js"]).ctx.TLCatala;
  assert.equal(C.paraules("L'home  va anar-hi, ahir. — 3"), 4);
  assert.equal(C.desarRedaccio("t", "   "), null);
  assert.equal(C.desarRedaccio("t", "paraula ".repeat(179)).minim_ok, false);
  assert.equal(C.desarRedaccio("t", "paraula ".repeat(180)).minim_ok, true);
  C.desarLectura("dogc-1", 300);
  assert.deepEqual({ ...C.resum(), darrera: null }, { redaccions: 2, amb_minim: 1, lectures: 1, darrera: null });
});

test("dades publicades: lectures literals del DOGC i temes d'entrenament", () => {
  if (!fs.existsSync("docs/datos/catala-mossos-esquadra.json")) return;
  const d = JSON.parse(fs.readFileSync("docs/datos/catala-mossos-esquadra.json", "utf8"));
  assert.ok(d.lectures.length >= 10 && d.temes_redaccio.length >= 10 && d.temes_conversa.length >= 10);
  const font = fs.readFileSync("catalogo/fuentes/DOGC-1046460.txt", "utf8") + fs.readFileSync("catalogo/fuentes/DOGC-788502.txt", "utf8");
  for (const l of d.lectures) { assert.ok(font.includes(l.text), l.id); assert.match(l.url, /^https:\/\/dogc\.gencat\.cat\//); }
});
