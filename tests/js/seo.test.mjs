// SEO técnico sobre la salida de la build (ejecutar después de `node build.mjs`): metadatos únicos en las páginas
// indexables, sitemaps coherentes con canonical/noindex, datos estructurados y peso de /convocatorias/.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const existe = fs.existsSync("docs/index.html");
const C = JSON.parse(fs.readFileSync("config.json", "utf8"));
const leer = (p) => fs.readFileSync(path.join("docs", p), "utf8");
const unesc = (s) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&amp;/g, "&");

// Todas las páginas generadas (index.html) con sus metadatos
const paginas = !existe ? [] : (() => {
  const L = [];
  const recorrer = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) recorrer(p);
      else if (e.name === "index.html") {
        const h = fs.readFileSync(p, "utf8");
        const ruta = path.relative("docs", path.dirname(p)).split(path.sep).join("/");
        L.push({
          ruta: ruta ? ruta + "/" : "",
          h,
          noindex: /<meta name="robots" content="[^"]*noindex/.test(h),
          title: unesc((h.match(/<title>([^<]*)<\/title>/) || [])[1] || ""),
          description: unesc((h.match(/<meta name="description" content="([^"]*)"/) || [])[1] || ""),
          canonical: (h.match(/<link rel="canonical" href="([^"]*)"/) || [])[1] || "",
        });
      }
    }
  };
  recorrer("docs");
  return L;
})();
const indexables = paginas.filter((p) => !p.noindex);

const repetidos = (campo) => {
  const g = new Map();
  for (const p of indexables) g.set(p[campo], [...(g.get(p[campo]) || []), p.ruta]);
  return [...g].filter(([, rs]) => rs.length > 1).map(([v, rs]) => `${v} → ${rs.slice(0, 3).join(", ")}`);
};

test("title y meta description presentes y únicos en las páginas indexables", { skip: !existe }, () => {
  assert.ok(indexables.length > 100);
  for (const p of indexables) {
    assert.ok(p.title.length >= 15 && p.title.length <= 70, `title (${p.title.length}) en /${p.ruta}: ${p.title}`);
    assert.ok(p.description.length >= 50 && p.description.length <= 165, `description (${p.description.length}) en /${p.ruta}`);
  }
  assert.deepEqual(repetidos("title"), [], "titles duplicados");
  assert.deepEqual(repetidos("description"), [], "descriptions duplicadas");
});

test("canonical absoluto a la propia URL, Open Graph y Twitter con imagen", { skip: !existe }, () => {
  assert.ok(fs.existsSync("docs/assets/og-testley.png"));
  for (const p of indexables) {
    assert.equal(p.canonical, C.url + p.ruta, `canonical de /${p.ruta}`);
    assert.match(p.h, /<meta property="og:image" content="https:\/\/[^"]+og-testley\.png">/, p.ruta);
    assert.match(p.h, /<meta name="twitter:card" content="summary_large_image">/, p.ruta);
    assert.match(p.h, /<meta property="og:title" content="[^"]+">/, p.ruta);
  }
});

test("sitemaps: solo URLs canónicas e indexables, y todas las indexables están", { skip: !existe }, () => {
  assert.match(leer("robots.txt"), new RegExp(`Sitemap: ${C.url.replace(/[.]/g, "\\.")}sitemap\\.xml`));
  const hijos = [...leer("sitemap.xml").matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].slice(C.url.length));
  const locs = hijos.flatMap((f) => [...leer(f).matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]));
  assert.equal(new Set(locs).size, locs.length, "URL repetidas en los sitemaps");
  const porUrl = new Map(paginas.map((p) => [C.url + p.ruta, p]));
  for (const u of locs) {
    const p = porUrl.get(u);
    assert.ok(p, `${u} no existe`);
    assert.ok(!p.noindex, `${u} tiene noindex`);
    assert.equal(p.canonical, u, `${u}: canonical distinto`);
    assert.doesNotMatch(p.h, /http-equiv="refresh"/i, `${u} es una redirección`);
    assert.ok(!p.ruta.startsWith("admin/"), u);
  }
  assert.equal(locs.length, indexables.length, "toda página indexable está en un sitemap");
});

test("verificación de buscadores solo si config.json la trae", { skip: !existe }, () => {
  const h = leer("index.html");
  for (const [k, meta] of [["googleSiteVerification", "google-site-verification"], ["bingSiteVerification", "msvalidate.01"]]) {
    if (C[k]) assert.ok(h.includes(`<meta name="${meta}" content="${C[k]}">`), meta);
    else assert.ok(!paginas.some((p) => p.h.includes(`name="${meta}"`)), `${meta} vacío no se pinta`);
  }
});

const ld = (h) => [...h.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].flatMap((m) => [].concat(JSON.parse(m[1])));

test("JSON-LD: Organization y WebSite en portada; FAQPage solo con FAQ visible; migas = migas visibles", { skip: !existe }, () => {
  const home = ld(leer("index.html")).map((x) => x["@type"]);
  assert.ok(home.includes("Organization") && home.includes("WebSite"));
  const web = ld(leer("index.html")).find((x) => x["@type"] === "WebSite");
  if (web.potentialAction) {
    // La búsqueda existe de verdad: la página destino tiene el buscador que lee ?q=
    const destino = web.potentialAction.target.urlTemplate.slice(C.url.length).split("?")[0];
    assert.match(leer(destino + "index.html"), /id="q"[^>]*name="q"|name="q"[^>]*id="q"/);
    assert.match(fs.readFileSync("web/assets/buscador.js", "utf8"), /params\.get\("q"\)/);
  }
  let conFaq = 0, conMigas = 0;
  for (const p of paginas) {
    if (!p.h.includes("application/ld+json")) continue;
    const L = ld(p.h);
    if (L.some((x) => x["@type"] === "FAQPage")) {
      conFaq++;
      assert.match(p.h, /<section class="faq"[^>]*>[\s\S]*?<details><summary>/, `FAQPage sin FAQ visible en /${p.ruta}`);
    }
    const m = L.find((x) => x["@type"] === "BreadcrumbList");
    const nav = (p.h.match(/<nav class="crumbs">([\s\S]*?)<\/nav>/) || [])[1];
    if (m && nav) {
      conMigas++;
      const visibles = (nav.match(/<a |<span>/g) || []).length;
      assert.equal(m.itemListElement.length, visibles, `migas de /${p.ruta}`);
    }
  }
  assert.ok(conFaq > 0 && conMigas > 100);
});

test("enlazado interno: artículo con anterior/siguiente y temas; tema con sus artículos", { skip: !existe }, () => {
  const art = leer("constitucion/articulo-14/index.html");
  assert.match(art, /href="\.\.\/articulo-13\/"/);
  assert.match(art, /href="\.\.\/articulo-15\/"/);
  assert.match(art, /Oposiciones y temas con este artículo[\s\S]*?href="\.\.\/\.\.\/oposiciones\/[^"]+\/tema-\d+\/"/);
  const tema = paginas.find((p) => /^oposiciones\/[^/]+\/tema-\d+\/$/.test(p.ruta) && !p.noindex && /articulo-\d+\//.test(p.h));
  assert.ok(tema, "algún tema indexable enlaza a sus artículos");
});

test("/convocatorias/: ~60 tarjetas en el HTML y el resto en un JSON para el buscador", { skip: !existe }, () => {
  const h = leer("convocatorias/index.html");
  const n = (h.match(/class="card op-card conv-card"/g) || []).length;
  const todas = JSON.parse(leer("datos/convocatorias.json"));
  const total = fs.readdirSync("catalogo/convocatorias").filter((f) => f.endsWith(".json")).length;
  assert.equal(todas.length, total);
  assert.equal(n, Math.min(60, total));
  if (total > 60) assert.match(h, /data-todas="[^"]*datos\/convocatorias\.json"/);
  // Las del HTML son las más recientes y las primeras del JSON
  assert.ok(todas[0].includes((h.match(/href="\.\.\/convocatorias\/([^/]+)\/"/) || [])[1]));
});
