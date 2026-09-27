// Genera el sitio estático en docs/ a partir de src/.
// Uso: node build.mjs
// Cada página en src/pages/**.html empieza con un bloque <!--meta {...} --> en JSON.
import fs from "node:fs";
import path from "node:path";

const SITE = JSON.parse(fs.readFileSync("site.json", "utf8"));
const SRC = "src/pages";
const OUT = "docs";

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const p = path.join(dir, d.name);
    return d.isDirectory() ? walk(p) : p.endsWith(".html") ? [p] : [];
  });
}

function parse(file) {
  const raw = fs.readFileSync(file, "utf8");
  const m = raw.match(/^<!--meta\s*([\s\S]*?)-->\s*/);
  if (!m) throw new Error(`Falta bloque meta en ${file}`);
  return { meta: JSON.parse(m[1]), body: raw.slice(m[0].length) };
}

// src/pages/japon/seguro.html -> japon/seguro/ ; index.html -> carpeta
function route(file) {
  const rel = path.relative(SRC, file).replace(/\\/g, "/");
  if (rel === "index.html") return "";
  if (rel === "404.html") return "404.html";
  return rel.replace(/(\/)?index\.html$/, "").replace(/\.html$/, "") + "/";
}

function rootPrefix(r) {
  if (r === "404.html") return SITE.basePath;
  const depth = r.split("/").filter(Boolean).length;
  return depth ? "../".repeat(depth) : "./";
}

function layout({ meta, body }, r) {
  const root = rootPrefix(r);
  const url = SITE.url + r;
  const title = meta.title.includes(SITE.name) ? meta.title : `${meta.title} | ${SITE.name}`;
  const schema = [
    {
      "@context": "https://schema.org",
      "@type": meta.type === "tool" ? "WebApplication" : "Article",
      name: meta.h1 || meta.title,
      headline: meta.h1 || meta.title,
      description: meta.description,
      inLanguage: "es",
      dateModified: meta.updated || SITE.updated,
      url,
      publisher: { "@type": "Organization", name: SITE.name, url: SITE.url },
      ...(meta.type === "tool" ? { applicationCategory: "TravelApplication", operatingSystem: "Web", offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" } } : {}),
    },
  ];
  if (meta.faq) {
    schema.push({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: meta.faq.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
    });
  }
  const faqHtml = meta.faq
    ? `<section class="faq"><h2>Preguntas frecuentes</h2>${meta.faq
        .map(([q, a]) => `<details><summary>${q}</summary><p>${a}</p></details>`)
        .join("")}</section>`
    : "";
  const crumbs = meta.crumbs
    ? `<nav class="crumbs" aria-label="Migas"><a href="${root}">Inicio</a>${meta.crumbs
        .map(([t, h]) => ` › ${h ? `<a href="${root}${h}">${t}</a>` : `<span>${t}</span>`}`)
        .join("")}</nav>`
    : "";
  const affNote = meta.affiliate
    ? `<p class="aff-note">Esta página contiene enlaces de afiliado: si compras a través de ellos, ${SITE.name} puede recibir una comisión sin coste extra para ti. <a href="${root}legal/afiliados/">Más info</a>.</p>`
    : "";
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<meta name="description" content="${meta.description}">
<link rel="canonical" href="${url}">${meta.noindex ? "\n<meta name=\"robots\" content=\"noindex\">" : ""}
<meta property="og:type" content="article">
<meta property="og:title" content="${meta.h1 || meta.title}">
<meta property="og:description" content="${meta.description}">
<meta property="og:url" content="${url}">
<meta property="og:locale" content="es_ES">
<meta name="theme-color" content="#b91c3c">
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle cx='50' cy='50' r='40' fill='%23b91c3c'/></svg>">
<link rel="stylesheet" href="${root}assets/style.css">
<script type="application/ld+json">${JSON.stringify(schema.length === 1 ? schema[0] : schema)}</script>
</head>
<body>
<header class="top"><div class="wrap">
<a class="brand" href="${root}"><span class="dot"></span>${SITE.name}</a>
<nav><a href="${root}japon/">Japón</a><a href="${root}japon/calculadora-jr-pass/">JR Pass</a><a href="${root}japon/presupuesto/">Presupuesto</a></nav>
</div></header>
<main class="wrap">
${crumbs}
${affNote}
${body}
${faqHtml}
${meta.updated ? `<p class="updated">Última revisión: ${meta.updated}</p>` : ""}
</main>
<footer class="foot"><div class="wrap">
<p><strong>${SITE.name}</strong> — ${SITE.tagline}</p>
<p><a href="${root}legal/afiliados/">Afiliados</a> · <a href="${root}legal/privacidad/">Privacidad</a> · <a href="${root}legal/aviso-legal/">Aviso legal</a></p>
</div></footer>
<script src="${root}assets/afiliados.js" defer></script>
${(meta.scripts || []).map((s) => `<script src="${root}assets/${s}" defer></script>`).join("\n")}
</body>
</html>
`;
}

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
fs.cpSync("src/assets", path.join(OUT, "assets"), { recursive: true });

const urls = [];
for (const file of walk(SRC)) {
  const page = parse(file);
  const r = route(file);
  const dest = r === "404.html" ? path.join(OUT, r) : path.join(OUT, r, "index.html");
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, layout(page, r));
  if (r !== "404.html" && !page.meta.noindex) urls.push({ loc: SITE.url + r, lastmod: page.meta.updated || SITE.updated });
}

fs.writeFileSync(
  path.join(OUT, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
    .map((u) => `  <url><loc>${u.loc}</loc><lastmod>${u.lastmod}</lastmod></url>`)
    .join("\n")}\n</urlset>\n`
);
fs.writeFileSync(path.join(OUT, "robots.txt"), `User-agent: *\nAllow: /\n\nSitemap: ${SITE.url}sitemap.xml\n`);
fs.copyFileSync("src/llms.txt", path.join(OUT, "llms.txt"));
fs.writeFileSync(path.join(OUT, ".nojekyll"), "");
if (SITE.customDomain) fs.writeFileSync(path.join(OUT, "CNAME"), SITE.customDomain + "\n");

console.log(`Generadas ${urls.length} páginas en ${OUT}/`);
