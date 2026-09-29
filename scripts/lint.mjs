// Lint sin dependencias: sintaxis de todo el JS (navegador y build), compilación de todo el Python y JSON válidos.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
const ignorar = /(^|\/)(docs|node_modules|archivo|\.git|__pycache__|ingesta\/documentos)(\/|$)/;
const ficheros = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => { const p = path.join(d, e.name); return ignorar.test(p) ? [] : e.isDirectory() ? ficheros(p) : [p]; });
const todo = ficheros(".");
let errores = 0;
for (const f of todo.filter((f) => /\.(mjs|js|cjs)$/.test(f))) {
  try { execFileSync(process.execPath, ["--check", f], { stdio: "pipe" }); } catch (e) { errores++; console.error("JS", f, String(e.stderr).split("\n").slice(0, 4).join("\n")); }
}
const py = todo.filter((f) => f.endsWith(".py"));
try { execFileSync("python3", ["-m", "py_compile", ...py], { stdio: "pipe" }); } catch (e) { errores++; console.error("PY", String(e.stderr)); }
for (const f of todo.filter((f) => f.endsWith(".json") && !f.includes("catalogo/convocatorias/") && !f.startsWith("datos/"))) {
  try { JSON.parse(fs.readFileSync(f, "utf8")); } catch (e) { errores++; console.error("JSON", f, e.message); }
}
console.log(`lint: ${todo.filter((f) => /\.(mjs|js|cjs)$/.test(f)).length} JS, ${py.length} Python · ${errores} errores`);
process.exit(errores ? 1 : 0);
