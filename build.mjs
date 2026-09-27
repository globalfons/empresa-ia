// Genera el sitio estático en docs/ a partir de datos/ y web/.
// Uso: node build.mjs   (valida antes con: python3 datos/validar.py ...)
import fs from "node:fs";
import path from "node:path";

const C = JSON.parse(fs.readFileSync("config.json", "utf8"));
// Solo para pruebas locales: TL_SUPABASE_URL / TL_SUPABASE_KEY / TL_OUT
if (process.env.TL_SUPABASE_URL) { C.supabaseUrl = process.env.TL_SUPABASE_URL; C.supabaseAnonKey = process.env.TL_SUPABASE_KEY || "test"; }
const OUT = process.env.TL_OUT || "docs";
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

function page(route, { title, description, body, schema, noindex, wide, scripts = [] }) {
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
<script>window.TL_CONFIG=${JSON.stringify({ root, supabaseUrl: C.supabaseUrl || "", supabaseAnonKey: C.supabaseAnonKey || "" })};</script>
<script src="${root}assets/store.js"></script>
${schema ? `<script type="application/ld+json">${JSON.stringify(schema)}</script>` : ""}
</head>
<body>
<header class="top"><div class="wrap">
<a class="brand" href="${root}"><span class="logo" aria-hidden="true">✓</span>${C.name}</a>
<nav class="mainnav"><a href="${root}${LEY.slug}/">Tests</a><a href="${root}panel/">Mi panel</a><a href="${root}ranking/">Ranking</a><a href="${root}pase/">Pase</a><span id="cuenta-nav"></span></nav>
</div></header>
<main class="wrap${wide ? " wide" : ""}">
${body(root)}
</main>
<footer class="foot"><div class="wrap foot-grid">
<div><p class="brand"><span class="logo" aria-hidden="true">✓</span>${C.name}</p><p>${C.tagline}</p><p class="small">Fuente de los textos: Boletín Oficial del Estado, legislación consolidada. TestLey no está vinculado a ninguna Administración Pública.</p></div>
<div><p><b>Estudiar</b></p><p><a href="${root}${LEY.slug}/">Test Ley 39/2015</a><br><a href="${root}panel/">Mi panel</a><br><a href="${root}ranking/">Ranking</a><br><a href="${root}pase/">Pase Opositor</a></p></div>
<div><p><b>Legal</b></p><p><a href="${root}legal/aviso-legal/">Aviso legal</a><br><a href="${root}legal/privacidad/">Privacidad</a><br><a href="${root}legal/condiciones/">Condiciones</a><br><a href="mailto:globalprsx@gmail.com">Contacto</a></p></div>
</div></footer>
${scripts.map((s) => `<script src="${root}assets/${s}" defer></script>`).join("\n")}
</body>
</html>
`;
  pages.push({ route, html, noindex });
}

// ---------- Portada ----------
const NART = LEY.arts.length, NQ = LEY.qs.length;
page("", {
  title: `${C.name}: test de oposiciones con la respuesta citada del BOE`,
  description: `Tests de la Ley 39/2015 para oposiciones con ${NQ} preguntas verificadas contra el BOE, panel de progreso, nota orientativa y simulacros. Gratis para empezar.`,
  wide: true,
  body: (r) => `
<section class="hero">
  <div class="hero-copy">
    <span class="pill">Oposiciones · Ley 39/2015 · Actualizado ${C.updated.split("-").reverse().join("/")}</span>
    <h1>Aprueba la parte de leyes sabiendo <em>por qué</em> cada respuesta es la correcta</h1>
    <p class="lead">Cada pregunta de TestLey lleva la cita literal del artículo del BOE que la justifica. Practica, mira tu nota orientativa y deja que el repaso inteligente se centre en lo que fallas.</p>
    <p><a class="cta" href="${LEY.slug}/">Empezar gratis</a> <a class="cta alt" href="panel/">Ver mi panel</a></p>
    <p class="muted small">Sin registro para empezar · Sin publicidad · Funciona en el móvil</p>
  </div>
  <div class="hero-demo" aria-hidden="true">
    <div class="demo-card">
      <div class="demo-top"><span>Pregunta 7 de 20</span><span>Art. 122</span></div>
      <div class="bar"><span style="width:35%"></span></div>
      <p class="q">El plazo para interponer el recurso de alzada contra un acto expreso es de:</p>
      <div class="opt ok"><span class="letter">a</span>Un mes</div>
      <div class="opt"><span class="letter">b</span>Dos meses</div>
      <p class="verdict good">✔ Correcto</p>
      <blockquote><span class="src">Artículo 122 · Ley 39/2015 (BOE)</span>«El plazo para la interposición del recurso de alzada será de un mes, si el acto fuera expreso.»</blockquote>
    </div>
    <div class="demo-float"><span class="kicker">Nota orientativa</span><b>7,4</b><span class="stars">★★★★<span class="off">★</span></span></div>
  </div>
</section>

<section class="trust">
  <div><b>${NQ}</b><span>preguntas verificadas</span></div>
  <div><b>${NART}</b><span>artículos con su texto oficial</span></div>
  <div><b>100 %</b><span>de citas comprobadas contra el BOE</span></div>
  <div><b>0 €</b><span>para empezar, sin registro</span></div>
</section>

<section class="features">
  <h2>Todo lo que necesitas para dominar la ley</h2>
  <div class="cards three">
    <div class="card"><span class="f-ico">📜</span><strong>Respuesta citada del BOE</strong><span>Un validador automático comprueba que cada cita aparece palabra por palabra en el texto consolidado. Nada de preguntas de origen dudoso.</span></div>
    <div class="card"><span class="f-ico">📊</span><strong>Panel de progreso</strong><span>Ve qué títulos dominas, cuáles te cuestan, tu racha de estudio y tu evolución test a test.</span></div>
    <div class="card"><span class="f-ico">🎯</span><strong>Nota orientativa</strong><span>Estimamos la nota que sacarías hoy en esta parte, con la penalización del examen (cada error resta 1/3).</span></div>
    <div class="card"><span class="f-ico">🧠</span><strong>Repaso inteligente</strong><span>Tus fallos vuelven hasta que los aciertas dos veces seguidas. Así se consolidan de verdad.</span></div>
    <div class="card"><span class="f-ico">⏱️</span><strong>Simulacros</strong><span>30 preguntas en 30 minutos con corrección como en el examen real.</span></div>
    <div class="card"><span class="f-ico">🏆</span><strong>Ranking y logros</strong><span>Estrellas, rachas y logros para mantener la constancia${C.supabaseUrl ? ", y un ranking para medirte con otros opositores" : ". El ranking entre opositores llega con las cuentas"}.</span></div>
  </div>
</section>

<section class="how">
  <h2>Cómo funciona</h2>
  <ol class="steps">
    <li><b>Haz un repaso de 20 preguntas.</b> Tarda unos 10 minutos y no necesitas registrarte.</li>
    <li><b>Lee la cita cuando falles.</b> Verás el párrafo exacto de la ley y podrás abrir el artículo completo.</li>
    <li><b>Mira tu panel.</b> Tu nota orientativa y tus puntos débiles se actualizan con cada respuesta.</li>
  </ol>
  <p><a class="cta" href="${LEY.slug}/">Hacer mi primer test</a></p>
</section>

<section>
  <h2>Leyes</h2>
  <div class="cards">
    <a class="card" href="${LEY.slug}/"><span class="tag">Disponible</span><strong>Ley 39/2015</strong><span>Procedimiento Administrativo Común. ${NQ} preguntas y ${NART} artículos.</span></a>
    <div class="card soon"><span class="tag grey">En preparación</span><strong>Ley 40/2015</strong><span>Régimen Jurídico del Sector Público.</span></div>
    <div class="card soon"><span class="tag grey">En preparación</span><strong>Constitución Española</strong><span>Derechos fundamentales, Corona, Cortes, Gobierno y organización territorial.</span></div>
    <div class="card soon"><span class="tag grey">En preparación</span><strong>TREBEP</strong><span>Estatuto Básico del Empleado Público.</span></div>
  </div>
  <p class="muted small">Útil para Auxiliar Administrativo y Administrativo del Estado, Justicia y oposiciones autonómicas y locales que incluyan estas leyes. Comprueba siempre el temario oficial de tu convocatoria.</p>
</section>

<section class="faq"><h2>Preguntas frecuentes</h2>
<details><summary>¿De dónde salen las preguntas?</summary><p>Las redactamos a partir del texto consolidado de cada ley publicado por el BOE. Cada pregunta guarda la cita literal que la justifica y un programa comprueba que esa cita existe palabra por palabra en el artículo antes de publicarla.</p></details>
<details><summary>¿Qué es la nota orientativa?</summary><p>Una estimación de la nota que sacarías hoy en un examen de esta ley, calculada con tu historial: cuenta lo que dominas, lo que fallas y lo que aún no has visto (que dejarías en blanco), con la penalización de 1/3 por error. Es orientativa: no sustituye a un examen oficial.</p></details>
<details><summary>¿Necesito registrarme?</summary><p>No. Puedes practicar sin cuenta y tu progreso se guarda en tu navegador. ${C.supabaseUrl ? "Si creas una cuenta gratis, se guarda en la nube y apareces en el ranking." : "Pronto podrás crear una cuenta para guardarlo en la nube."}</p></details>
<details><summary>¿Qué pasa si cambia la ley?</summary><p>Revisamos cada semana si el BOE ha publicado cambios en el texto consolidado y corregimos las preguntas afectadas.</p></details>
</section>`,
});

// ---------- Panel, ranking y cuenta ----------
page("panel/", {
  title: "Mi panel de progreso", description: "Tu progreso en TestLey: nota orientativa, dominio por título, puntos débiles, racha y logros.", noindex: true, wide: true,
  scripts: ["panel.js"],
  body: () => `<div id="panel" data-ley="${LEY.slug}"><p class="muted">Cargando tu progreso…</p></div>`,
});
page("ranking/", {
  title: "Ranking de opositores · Ley 39/2015", description: "Ranking de TestLey: los opositores con mejor nota orientativa en la Ley 39/2015.",
  scripts: ["ranking.js"],
  body: (r) => `<nav class="crumbs"><a href="${r}">Inicio</a> › <span>Ranking</span></nav><h1>Ranking · Ley 39/2015</h1><p class="lead">Los opositores con mejor nota orientativa. Para aparecer necesitas una cuenta y al menos 20 respuestas.</p><div id="ranking" data-ley="${LEY.slug}"></div>`,
});
page("cuenta/", {
  title: "Entrar o crear cuenta", description: "Crea tu cuenta gratuita en TestLey para guardar tu progreso y entrar en el ranking.", noindex: true,
  scripts: ["cuenta.js"],
  body: () => `<div id="cuenta"></div>`,
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
<div id="quiz" class="quiz" data-ley="${LEY.slug}" data-base="./">Cargando preguntas…</div>
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
    ? `<h2>Test del artículo ${a.n}</h2><div id="quiz" class="quiz" data-ley="${LEY.slug}" data-base="../" data-art="${a.n}">Cargando…</div>`
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
