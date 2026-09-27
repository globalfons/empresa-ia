// Genera el sitio estático en docs/ a partir de datos/ y web/.
// Uso: node build.mjs   (valida antes con: python3 datos/validar.py ...)
import fs from "node:fs";
import path from "node:path";

const C = JSON.parse(fs.readFileSync("config.json", "utf8"));
const OUT = "docs";
const LEY = {
  slug: "ley-39-2015",
  corto: "Ley 39/2015",
  nombre: "Ley 39/2015, del Procedimiento Administrativo Común de las Administraciones Públicas",
  arts: JSON.parse(fs.readFileSync("datos/ley-39-2015-articulos.json", "utf8")),
  qs: JSON.parse(fs.readFileSync("datos/preguntas-l39.json", "utf8")),
  fuente: "https://www.boe.es/buscar/act.php?id=BOE-A-2015-10565",
};
LEY.qs.forEach((q, i) => (q.id = "l39-" + i));

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const pages = [];

function page(route, { title, description, body, schema, noindex, scripts = [] }) {
  const depth = route.split("/").filter(Boolean).length;
  const root = depth ? "../".repeat(depth) : "./";
  const url = C.url + route;
  const full = title.includes(C.name) ? title : `${title} | ${C.name}`;
  const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(full)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${url}">${noindex ? '\n<meta name="robots" content="noindex">' : ""}
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${url}">
<meta property="og:locale" content="es_ES">
<meta name="theme-color" content="#1d4ed8">
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect x='10' y='10' width='80' height='80' rx='18' fill='%231d4ed8'/><path d='M30 52l14 14 26-30' stroke='white' stroke-width='10' fill='none'/></svg>">
<link rel="stylesheet" href="${root}assets/style.css">
${schema ? `<script type="application/ld+json">${JSON.stringify(schema)}</script>` : ""}
</head>
<body>
<header class="top"><div class="wrap">
<a class="brand" href="${root}"><span class="dot"></span>${C.name}</a>
<nav><a href="${root}${LEY.slug}/">Test Ley 39/2015</a><a href="${root}pase/">Pase opositor</a></nav>
</div></header>
<main class="wrap">
${body(root)}
</main>
<footer class="foot"><div class="wrap">
<p><strong>${C.name}</strong> — ${C.tagline}</p>
<p>Textos legales: BOE, legislación consolidada (reutilizable, art. 13 Ley de Propiedad Intelectual).</p>
<p><a href="${root}legal/aviso-legal/">Aviso legal</a> · <a href="${root}legal/privacidad/">Privacidad</a> · <a href="${root}legal/condiciones/">Condiciones</a></p>
</div></footer>
${scripts.map((s) => `<script src="${root}assets/${s}" defer></script>`).join("\n")}
</body>
</html>
`;
  pages.push({ route, html, noindex });
}

// ---------- Portada ----------
page("", {
  title: `${C.name}: test de leyes para oposiciones con la respuesta del BOE`,
  description: "Test gratis de la Ley 39/2015 para oposiciones de Auxiliar y Administrativo. Cada respuesta viene con la cita literal del artículo del BOE. Sin registro.",
  body: (r) => `
<h1>Test de leyes para oposiciones, con la respuesta sacada del BOE</h1>
<p class="lead">Cada pregunta lleva la cita literal del artículo que la justifica. Sin registro, sin publicidad y gratis para empezar.</p>
<p><a class="cta" href="${LEY.slug}/">Hacer el test de la Ley 39/2015</a></p>
<div class="cards">
  <a class="card" href="${LEY.slug}/"><span class="tag">Disponible</span><strong>Ley 39/2015</strong><span>Procedimiento Administrativo Común. ${LEY.qs.length} preguntas verificadas y los ${LEY.arts.length} artículos.</span></a>
  <div class="card"><span class="tag">Próximamente</span><strong>Ley 40/2015</strong><span>Régimen Jurídico del Sector Público.</span></div>
  <div class="card"><span class="tag">Próximamente</span><strong>Constitución Española</strong><span>Títulos preliminar, I, II, III, IV, V y VIII.</span></div>
  <div class="card"><span class="tag">Próximamente</span><strong>TREBEP</strong><span>Estatuto Básico del Empleado Público.</span></div>
</div>
<h2>Por qué es diferente</h2>
<ul>
  <li><strong>Nada inventado:</strong> un validador automático comprueba que la cita de cada pregunta aparece palabra por palabra en el texto consolidado del BOE.</li>
  <li><strong>Aprendes del fallo:</strong> al responder ves el párrafo exacto de la ley y el enlace al artículo completo.</li>
  <li><strong>Como en el examen:</strong> puntuación con penalización (cada error resta 1/3) y repaso automático de tus fallos.</li>
</ul>
<p class="muted">Útil para Auxiliar Administrativo del Estado, Administrativo, Gestión, Justicia y oposiciones autonómicas y locales que incluyan la Ley 39/2015 en el temario. Comprueba siempre tu temario oficial.</p>`,
});

// ---------- Hub de la ley ----------
const bloques = [...new Set(LEY.arts.map((a) => a.bloque))];
page(`${LEY.slug}/`, {
  title: `Test Ley 39/2015 online gratis (${LEY.qs.length} preguntas con solución)`,
  description: `Test de la Ley 39/2015 del Procedimiento Administrativo Común con ${LEY.qs.length} preguntas y la cita literal del BOE en cada respuesta. Plazos, silencio, notificaciones, nulidad y recursos.`,
  scripts: ["test.js"],
  schema: { "@context": "https://schema.org", "@type": "Quiz", name: `Test ${LEY.corto}`, about: LEY.nombre, inLanguage: "es", educationalLevel: "Oposiciones", url: C.url + LEY.slug + "/" },
  body: (r) => `
<nav class="crumbs"><a href="${r}">Inicio</a> › <span>${LEY.corto}</span></nav>
<h1>Test de la Ley 39/2015 con solución</h1>
<p class="lead">${esc(LEY.nombre)}. Responde y verás al momento la cita literal del artículo.</p>
<div id="quiz" class="quiz" data-src="${r}datos/${LEY.slug}.json" data-base="./">Cargando preguntas…</div>
<p class="muted">¿Encuentras un error? Escríbenos a <a href="mailto:globalprsx@gmail.com">globalprsx@gmail.com</a> indicando la pregunta y la revisamos contra el BOE.</p>
<h2>Artículos de la Ley 39/2015</h2>
${bloques
  .map(
    (b) =>
      `<h3>${esc(b)}</h3><ul class="art-list">${LEY.arts
        .filter((a) => a.bloque === b)
        .map((a) => `<li><a href="articulo-${a.n}/">Art. ${a.n}. ${esc(a.titulo)}</a></li>`)
        .join("")}</ul>`
  )
  .join("")}
<p class="muted">Texto consolidado de la ley: <a href="${LEY.fuente}" rel="noopener">BOE-A-2015-10565</a>.</p>`,
});

// ---------- Una página por artículo ----------
for (const a of LEY.arts) {
  const qs = LEY.qs.filter((q) => q.art === a.n);
  const texto = a.texto.replace(/> <small>[\s\S]*?<\/small>/g, "").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").trim();
  page(`${LEY.slug}/articulo-${a.n}/`, {
    title: `Artículo ${a.n} Ley 39/2015: ${a.titulo}${qs.length ? " (con test)" : ""}`,
    description: `Texto del artículo ${a.n} de la Ley 39/2015 (${a.titulo})${qs.length ? ` y ${qs.length} preguntas tipo test con solución` : ""}. Versión consolidada del BOE.`,
    scripts: qs.length ? ["test.js"] : [],
    schema: { "@context": "https://schema.org", "@type": "LearningResource", name: `Artículo ${a.n} de la Ley 39/2015: ${a.titulo}`, inLanguage: "es", isBasedOn: LEY.fuente },
    body: (r) => `
<nav class="crumbs"><a href="${r}">Inicio</a> › <a href="../">${LEY.corto}</a> › <span>Art. ${a.n}</span></nav>
<h1>Artículo ${a.n} de la Ley 39/2015. ${esc(a.titulo)}</h1>
<p class="muted">${esc(a.bloque)}${a.capitulo ? " · " + esc(a.capitulo) : ""}</p>
<div class="art-text">${esc(texto)}</div>
${
  qs.length
    ? `<h2>Test del artículo ${a.n}</h2><div id="quiz" class="quiz" data-src="${r}datos/${LEY.slug}.json" data-base="../" data-art="${a.n}">Cargando…</div>`
    : `<p><a class="cta" href="../">Hacer el test de la Ley 39/2015</a></p>`
}
<p>${(() => {
      const i = LEY.arts.indexOf(a);
      const p = LEY.arts[i - 1], n = LEY.arts[i + 1];
      return `${p ? `<a href="../articulo-${p.n}/">← Art. ${p.n}</a>` : ""}${p && n ? " · " : ""}${n ? `<a href="../articulo-${n.n}/">Art. ${n.n} →</a>` : ""}`;
    })()}</p>
<p class="muted">Fuente: <a href="${LEY.fuente}" rel="noopener">BOE, texto consolidado</a>. Última actualización recogida: 2024-11-06.</p>`,
  });
}

// ---------- Pase opositor (preventa) ----------
page("pase/", {
  title: "Pase Opositor: todas las leyes, simulacros y repaso inteligente",
  description: "Pase Opositor de TestLey: acceso a todas las leyes del temario común, simulacros cronometrados y repaso de fallos. Precio de fundador.",
  body: (r) => `
<nav class="crumbs"><a href="${r}">Inicio</a> › <span>Pase Opositor</span></nav>
<h1>Pase Opositor</h1>
<p class="lead">El test de la Ley 39/2015 es y seguirá siendo gratis. El Pase Opositor añade el resto del temario común y las herramientas para llegar al examen con todo repasado.</p>
<div class="box">
  <p class="price">19 € <span class="muted" style="font-size:1rem;font-weight:400">/ 12 meses · precio de fundador</span></p>
  <ul>
    <li>Tests de <strong>Ley 40/2015, Constitución Española y TREBEP</strong> a medida que se publican (plan: uno al mes).</li>
    <li><strong>Simulacros</strong> con cronómetro y el formato de tu examen.</li>
    <li><strong>Repaso espaciado</strong>: tus fallos vuelven justo cuando estás a punto de olvidarlos.</li>
    <li>Estadísticas por título y por artículo.</li>
  </ul>
  ${
    C.checkoutUrl
      ? `<p><a class="cta" href="${C.checkoutUrl}" rel="noopener">Conseguir el Pase por 19 €</a></p><p class="muted">Pago seguro. Si no te convence, te devolvemos el dinero en los primeros 14 días.</p>`
      : `<p><strong>Abrimos las plazas de fundador muy pronto.</strong> Mientras tanto, practica gratis con la <a href="${r}${LEY.slug}/">Ley 39/2015</a>.</p>`
  }
</div>
<p class="muted">El precio de fundador se mantiene mientras renueves. Las funciones marcadas se publican de forma progresiva; lo que ya está disponible se indica en cada ley.</p>`,
});

// ---------- Legales ----------
for (const f of fs.readdirSync("web/paginas")) {
  const raw = fs.readFileSync(path.join("web/paginas", f), "utf8");
  const [, meta, body] = raw.match(/^<!--meta\s*([\s\S]*?)-->\s*([\s\S]*)$/);
  const m = JSON.parse(meta);
  page(m.route, { title: m.title, description: m.description, noindex: m.noindex, body: () => body });
}

// ---------- Escritura ----------
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(path.join(OUT, "datos"), { recursive: true });
fs.cpSync("web/assets", path.join(OUT, "assets"), { recursive: true });
fs.writeFileSync(
  path.join(OUT, "datos", `${LEY.slug}.json`),
  JSON.stringify({ arts: Object.fromEntries(LEY.arts.map((a) => [a.n, { t: a.titulo, b: a.bloque }])), qs: LEY.qs })
);
for (const p of pages) {
  const dest = path.join(OUT, p.route, "index.html");
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, p.html);
}
fs.writeFileSync(
  path.join(OUT, "404.html"),
  `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>No encontrado | ${C.name}</title><link rel="stylesheet" href="${C.basePath}assets/style.css"><body><main class="wrap"><h1>Página no encontrada</h1><p><a class="cta" href="${C.basePath}${LEY.slug}/">Ir al test de la Ley 39/2015</a></p></main></body>`
);
const idx = pages.filter((p) => !p.noindex);
fs.writeFileSync(
  path.join(OUT, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${idx
    .map((p) => `  <url><loc>${C.url}${p.route}</loc><lastmod>${C.updated}</lastmod></url>`)
    .join("\n")}\n</urlset>\n`
);
fs.writeFileSync(path.join(OUT, "robots.txt"), `User-agent: *\nAllow: /\n\nSitemap: ${C.url}sitemap.xml\n`);
fs.writeFileSync(
  path.join(OUT, "llms.txt"),
  `# ${C.name}\n\n> ${C.tagline} Preguntas tipo test de oposiciones cuya respuesta se justifica con la cita literal del texto consolidado del BOE.\n\n## Leyes\n- [Test Ley 39/2015](${C.url}${LEY.slug}/): ${LEY.qs.length} preguntas y los ${LEY.arts.length} artículos de la Ley 39/2015 del Procedimiento Administrativo Común, cada uno en su página.\n`
);
fs.writeFileSync(path.join(OUT, ".nojekyll"), "");
if (C.customDomain) fs.writeFileSync(path.join(OUT, "CNAME"), C.customDomain + "\n");
console.log(`Generadas ${pages.length} páginas (${idx.length} indexables) en ${OUT}/`);
