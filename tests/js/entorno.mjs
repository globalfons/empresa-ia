// Carga un script del navegador (web/assets/*.js) en un contexto aislado con window/localStorage/document simulados.
import vm from "node:vm";
import fs from "node:fs";
export function cargar(archivos, cfg = {}, extra = {}) {
  const almacen = new Map();
  const localStorage = { getItem: (k) => (almacen.has(k) ? almacen.get(k) : null), setItem: (k, v) => almacen.set(k, String(v)), removeItem: (k) => almacen.delete(k) };
  const llamadas = [];
  const ctx = {
    console, URL, URLSearchParams, Date, Math, JSON, setTimeout, clearTimeout, crypto: globalThis.crypto,
    localStorage, location: { href: "https://globalfons.github.io/empresa-ia/?utm_source=tiktok&ref=academia1", pathname: "/empresa-ia/", search: "", hash: "", origin: "https://globalfons.github.io" },
    document: { addEventListener() {}, getElementById: () => null, querySelectorAll: () => [], referrer: "", createElement: () => ({ setAttribute() {} }) },
    fetch: (u, o) => { llamadas.push({ u, o }); return Promise.resolve({ ok: true, json: () => Promise.resolve({}), text: () => Promise.resolve("") }); },
    ...extra,
  };
  ctx.window = ctx; ctx.TL_CONFIG = cfg;
  vm.createContext(ctx);
  for (const f of archivos) vm.runInContext(fs.readFileSync(f, "utf8"), ctx, { filename: f });
  return { ctx, almacen, llamadas };
}
