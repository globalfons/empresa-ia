// Comprueba la salida de la build (ejecutar después de `node build.mjs`): SEO, noindex, secretos y datos.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const leer = (p) => fs.readFileSync("docs/" + p, "utf8");
const existe = fs.existsSync("docs/index.html");

test("sitemap solo con páginas indexables y lastmod por página", { skip: !existe }, () => {
  const sm = leer("sitemap.xml");
  for (const r of ["admin/growth/", "admin/system/", "panel/", "bienvenida/"]) assert.ok(!sm.includes(`/${r}<`), r);
  assert.ok(sm.includes("/oposiciones/policia-nacional-escala-basica/<"));
  assert.ok(new Set([...sm.matchAll(/<lastmod>([^<]+)</g)].map((m) => m[1])).size > 1, "lastmod distinto por página");
});

test("páginas de admin con noindex", { skip: !existe }, () => {
  for (const r of ["admin/growth/", "admin/growth/jobs/", "admin/system/", "admin/fuentes/"]) assert.match(leer(r + "index.html"), /<meta name="robots" content="noindex">/, r);
});

test("ficha de oposición: migas, FAQ y fuente oficial", { skip: !existe }, () => {
  const h = leer("oposiciones/policia-nacional-escala-basica/index.html");
  assert.match(h, /"@type":"BreadcrumbList"/); assert.match(h, /"@type":"FAQPage"/);
  assert.match(h, /Última verificación/); assert.match(h, /id="op-accion"/); assert.match(h, /class="ficha-nav"/); assert.match(h, /boe\.es/);
});

test("ningún secreto en la web publicada", { skip: !existe }, () => {
  const txt = ["index.html", "precios/index.html", "admin/growth/index.html", "assets/store.js", "assets/eventos.js"].map(leer).join("\n");
  assert.doesNotMatch(txt, /service_role|sk_live|sk_test|SUPABASE_SERVICE_ROLE_KEY=|TELEGRAM_BOT_TOKEN=\w|LEMONSQUEEZY_WEBHOOK_SECRET=\w/);
});

test("convocatorias con pocos datos: noindex", { skip: !existe }, () => {
  const dir = fs.readdirSync("docs/convocatorias").filter((d) => fs.existsSync(`docs/convocatorias/${d}/index.html`));
  const noidx = dir.filter((d) => leer(`convocatorias/${d}/index.html`).includes('content="noindex"'));
  assert.ok(noidx.length > 0 && noidx.length < dir.length);
});
