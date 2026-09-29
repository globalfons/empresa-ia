// Genera el sitio estático en docs/ a partir de datos/ y web/.
// Uso: node build.mjs   (valida antes con: python3 datos/validar.py ...)
import fs from "node:fs";
import path from "node:path";

const C = JSON.parse(fs.readFileSync("config.json", "utf8"));
// Solo para pruebas locales: TL_SUPABASE_URL / TL_SUPABASE_KEY / TL_OUT
if (process.env.TL_SUPABASE_URL) { C.supabaseUrl = process.env.TL_SUPABASE_URL; C.supabaseAnonKey = process.env.TL_SUPABASE_KEY || "test"; }
const OUT = process.env.TL_OUT || "docs";
const OUT_TMP = fs.mkdtempSync(path.join((process.env.TMPDIR || "/tmp"), "tl-"));
// ---------- Leyes ----------
// Una ley se publica (test + páginas) cuando existe datos/preguntas-<slug>.json con preguntas.
const META = JSON.parse(fs.readFileSync("datos/leyes-meta.json", "utf8"));
const CORTO = { constitucion: "Constitución Española", trebep: "TREBEP", "rdl-1-2013": "Ley General de Discapacidad (RDL 1/2013)", "rdl-8-2015": "Ley General de la Seguridad Social (RDL 8/2015)", "lef-1954": "Ley de Expropiación Forzosa", "lo-4-2000": "Ley Orgánica 4/2000 de Extranjería", "lo-2-1986": "Ley de Fuerzas y Cuerpos de Seguridad (LO 2/1986)", "lo-4-2015": "Ley de Seguridad Ciudadana (LO 4/2015)", "lo-6-1984": "Ley de Habeas Corpus (LO 6/1984)", lecrim: "Ley de Enjuiciamiento Criminal", "codigo-penal": "Código Penal", "codigo-civil": "Código Civil", "ley-4-2015": "Estatuto de la víctima (Ley 4/2015)", "ley-5-2014": "Ley de Seguridad Privada (Ley 5/2014)", "ley-8-2011": "Ley de Infraestructuras Críticas (Ley 8/2011)", "lo-7-2021": "Ley Orgánica 7/2021 de datos penales", "ley-31-1995": "Ley de Prevención de Riesgos Laborales", "rd-240-2007": "RD 240/2007 (ciudadanos UE)", "reglamento-armas": "Reglamento de Armas", rgc: "Reglamento General de Circulación", "lo-9-2015": "LO 9/2015 de Personal de la Policía Nacional", "lo-4-2010": "LO 4/2010 Régimen disciplinario de la Policía Nacional", "ley-trafico": "Ley de Tráfico y Seguridad Vial" };
const PREFIJO = { "ley-39-2015": "l39" }; // ids estables del progreso de los usuarios
const LEYES = JSON.parse(fs.readFileSync("catalogo/normas.json", "utf8")).map((n) => {
  const fq = `datos/preguntas-${n.slug}.json`;
  const L = {
    id: n.id, slug: n.slug, nombre: n.nombre,
    corto: CORTO[n.slug] || n.nombre.split(",")[0],
    arts: fs.existsSync(`datos/${n.slug}-articulos.json`) ? JSON.parse(fs.readFileSync(`datos/${n.slug}-articulos.json`, "utf8")) : [],
    qs: fs.existsSync(fq) ? JSON.parse(fs.readFileSync(fq, "utf8")) : [],
    fuente: `https://www.boe.es/buscar/act.php?id=${n.id}`,
    actualizada: META[n.id] || "",
  };
  L.qs.forEach((q, i) => (q.id = (PREFIJO[n.slug] || n.slug) + "-" + i));
  return L;
});
const PUBLICADAS = LEYES.filter((L) => L.qs.length && L.arts.length);
const LEY = LEYES.find((L) => L.slug === "ley-39-2015");

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
<script>window.TL_CONFIG=${JSON.stringify({ root, supabaseUrl: C.supabaseUrl || "", supabaseAnonKey: C.supabaseAnonKey || "", lsStoreId: C.lsStoreId || "", lsProductId: C.lsProductId || "", pase: !!C.checkoutUrl, opos: OPOS.map((o) => o.id), tutorUrl: C.tutorUrl || "", planes: C.planes || null })};</script>
<script src="${root}assets/store.js"></script>${C.tutorUrl ? `\n<script src="${root}assets/tutor.js" defer></script>` : ""}
${schema ? `<script type="application/ld+json">${JSON.stringify(schema)}</script>` : ""}
</head>
<body>
<header class="top"><div class="wrap">
<a class="brand" href="${root}"><span class="logo" aria-hidden="true">✓</span>${C.name}</a>
<nav class="mainnav"><a href="${root}oposiciones/">Oposiciones</a><a href="${root}panel/">Mi panel</a><a href="${root}ranking/">Ranking</a><a href="${root}pase/">Pase</a><span id="cuenta-nav"></span></nav>
</div></header>
<main class="wrap${wide ? " wide" : ""}">
${body(root)}
</main>
<footer class="foot"><div class="wrap foot-grid">
<div><p class="brand"><span class="logo" aria-hidden="true">✓</span>${C.name}</p><p>${C.tagline}</p><p class="small">Fuente de los textos: Boletín Oficial del Estado, legislación consolidada. TestLey no está vinculado a ninguna Administración Pública.</p></div>
<div><p><b>Estudiar</b></p><p><a href="${root}oposiciones/">Oposiciones</a><br><a href="${root}${LEY.slug}/">Test Ley 39/2015</a><br><a href="${root}panel/">Mi panel</a><br><a href="${root}ranking/">Ranking</a><br><a href="${root}pase/">Pase Opositor</a></p></div>
<div><p><b>Legal</b></p><p><a href="${root}legal/aviso-legal/">Aviso legal</a><br><a href="${root}legal/privacidad/">Privacidad</a><br><a href="${root}legal/condiciones/">Condiciones</a><br><a href="mailto:globalprsx@gmail.com">Contacto</a></p></div>
</div></footer>
${scripts.map((s) => `<script src="${root}assets/${s}" defer></script>`).join("\n")}
</body>
</html>
`;
  pages.push({ route, html, noindex });
}

// ---------- Catálogo de oposiciones ----------
const OPOS = JSON.parse(fs.readFileSync("catalogo/oposiciones.json", "utf8"));
const NORMAS = Object.fromEntries(JSON.parse(fs.readFileSync("catalogo/normas.json", "utf8")).map((n) => [n.id, n]));
// Leyes con test publicado: id BOE -> datos
const PUB = Object.fromEntries(PUBLICADAS.map((L) => [L.id, L]));
const AMBITO = { estatal: "Administración del Estado", seguridad: "Policía y seguridad", autonomico: "Comunidades autónomas", local: "Administración local", justicia: "Justicia", otros: "Otras" };
const fmtN = (n) => Number(n).toLocaleString("es-ES", { useGrouping: "always" });
for (const o of OPOS) {
  const ids = [...new Set(o.temario.flatMap((t) => t.normas))];
  const pub = ids.filter((id) => PUB[id]);
  o.qs = [];
  o.arts = {};
  o.leyes = {};
  for (const id of pub) {
    const L = PUB[id];
    o.leyes[L.slug] = L.corto;
    for (const a of L.arts) o.arts[`${L.slug}:${a.n}`] = { t: a.titulo, b: L.corto };
    for (const q of L.qs) o.qs.push({ ...q, ley: L.slug, art: `${L.slug}:${q.art}`, artn: q.art });
  }
  o.temasCubiertos = o.temario.filter((t) => t.normas.some((id) => PUB[id])).length;
}
const opEstado = (c) => ({ prevista: "Prevista", convocada: "Convocada", plazo_abierto: "Plazo abierto", examen_realizado: "Examen realizado", cerrada: "Cerrada" })[c.estado] || c.estado;
const CATEGORIAS = JSON.parse(fs.readFileSync("catalogo/categorias.json", "utf8"));
const CAT = Object.fromEntries(CATEGORIAS.map((c) => [c.id, c]));
const fmtFecha = (f) => (f ? f.split("-").reverse().join("/") : "");
const sinAcentos = (t) => String(t).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const pctOp = (o) => Math.round((100 * o.temasCubiertos) / Math.max(1, o.cobertura.temas_legislativos));

const tarjetaOp = (o, r) => `<a class="card op-card" href="${r}oposiciones/${o.id}/" data-cat="${o.categoria}" data-q="${esc(sinAcentos([o.nombre, o.organismo, o.categoria_nombre, o.grupo, o.territorio].join(" ")))}"><span class="tag">${CAT[o.categoria].icono} ${esc(o.categoria_nombre)} · ${esc(o.grupo)} · ${esc(opEstado(o.convocatoria))}</span><strong>${esc(o.nombre)}</strong><span>${o.convocatoria.plazas ? fmtN(o.convocatoria.plazas) + " plazas (turno libre) · " : ""}${o.temario.length} temas · test en ${o.temasCubiertos} de ${o.cobertura.temas_legislativos} temas de legislación</span><span class="covbar"><i style="width:${Math.max(2, Math.round((100 * o.temasCubiertos) / Math.max(1, o.cobertura.temas_legislativos)))}%"></i></span></a>`;

const catCount = (id) => OPOS.filter((o) => o.categoria === id).length;
const chipsCat = (r, activa) => `<div class="cat-chips">${CATEGORIAS.map((c) => `<a class="cat-chip${activa === c.id ? " on" : ""}${catCount(c.id) ? "" : " empty"}" href="${r}oposiciones/categoria/${c.id}/" data-cat="${c.id}">${c.icono} ${esc(c.nombre)} <b>${catCount(c.id)}</b></a>`).join("")}</div>`;
const buscador = (r) => `<form class="buscador" action="${r}oposiciones/" role="search"><label class="sr" for="q">Buscar oposición</label><input id="q" name="q" type="search" placeholder="Busca por nombre, cuerpo u organismo: policía, auxiliar, gestión…" autocomplete="off"><button class="cta" type="submit">Buscar</button></form>`;
// Índice del catálogo para el navegador (panel, seguimiento, alertas)
fs.mkdirSync(path.join(OUT_TMP, "datos"), { recursive: true });
fs.writeFileSync(path.join(OUT_TMP, "datos", "catalogo.json"), JSON.stringify(OPOS.map((o) => ({
  id: o.id, nombre: o.nombre, cat: o.categoria_nombre, grupo: o.grupo, estado: o.estado, plazas: o.convocatoria.plazas,
  fuente: o.convocatoria.url_oficial, ref: o.convocatoria.referencia, publicada: o.convocatoria.fecha_publicacion, actualizado: o.actualizado,
  sim: (o.examen || {}).simulacro || null, preguntas: o.qs.length,
  // Datos oficiales con su cita literal (los usa el tutor IA para no inventar nada sobre la convocatoria)
  oficial: Object.entries(o.oficial).flatMap(([k, v]) => (Array.isArray(v) ? v : [v]).map((d) => ({ campo: k, valor: d.valor, cita: d.cita }))),
}))));

// Novedades oficiales detectadas en el BOE (catalogo/vigilar_boe.py)
const NOVEDADES = fs.existsSync("catalogo/novedades.json") ? JSON.parse(fs.readFileSync("catalogo/novedades.json", "utf8")) : [];
fs.writeFileSync(path.join(OUT_TMP, "datos", "novedades.json"), JSON.stringify(NOVEDADES));
const TIPO_NOV = { convocatoria: "Convocatoria", listas: "Listas de admitidos", aprobados: "Aprobados", fecha_examen: "Fecha de examen", modificacion: "Modificación", correccion: "Corrección de errores", nombramiento: "Nombramientos", otro: "Otra publicación" };
const novedadesHtml = (o) => {
  const L = NOVEDADES.filter((n) => n.oposicion === o.id);
  if (!L.length) return "";
  const fila = (n) => `<li><span class="nov-f">${fmtFecha(n.fecha)}</span> <span class="chip${n.relevancia === "convocatoria" ? " ok" : ""}">${TIPO_NOV[n.tipo] || n.tipo}</span> <a href="${esc(n.url)}" rel="noopener">${esc(n.titulo)}</a> <span class="muted small">(${esc(n.id)})</span></li>`;
  const mia = L.filter((n) => n.relevancia === "convocatoria"), otras = L.filter((n) => n.relevancia !== "convocatoria");
  return `<section class="card"><div class="of-head"><h2>Novedades oficiales en el BOE</h2><span class="badge-oficial">Fuente oficial</span></div>
${mia.length ? `<h3>De esta convocatoria</h3><ul class="nov">${mia.map(fila).join("")}</ul>` : ""}
${otras.length ? `<details><summary>Otras publicaciones del mismo cuerpo (${otras.length})</summary><ul class="nov">${otras.map(fila).join("")}</ul></details>` : ""}
<p class="muted small">Revisamos el sumario del BOE cada día. El tipo (listas, modificación…) se deduce automáticamente del título oficial; abre el enlace para ver el texto completo.</p></section>`;
};

// ---------- Portada ----------
const NART = PUBLICADAS.reduce((t, L) => t + L.arts.length, 0), NQ = PUBLICADAS.reduce((t, L) => t + L.qs.length, 0);
page("", {
  title: `${C.name}: encuentra tu oposición y prepárala con tests citados del BOE`,
  description: `Buscador de oposiciones con convocatorias oficiales del BOE, temario, ${NQ} preguntas verificadas contra la ley, simulacros como el examen real y seguimiento de tu progreso.`,
  wide: true,
  body: (r) => `
<section class="hero">
  <div class="hero-copy">
    <span class="pill">Convocatorias oficiales · Tests citados del BOE · Actualizado ${fmtFecha(C.updated)}</span>
    <h1>Encuentra tu oposición y prepárala sabiendo <em>por qué</em> cada respuesta es la correcta</h1>
    <p class="lead">Consulta la convocatoria oficial, el temario y los requisitos, y estudia con tests en los que cada respuesta cita el artículo del BOE. Simulacros como el examen real y un panel que te dice qué repasar.</p>
    ${buscador(r)}
    <p class="small populares">Populares: ${OPOS.slice(0, 4).map((o) => `<a href="${r}oposiciones/${o.id}/">${esc(o.nombre.replace(/^Cuerpo (General )?/, "").replace(/ de la Administración( Civil)? del Estado/, " (Estado)"))}</a>`).join(" · ")}</p>
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

<section>
  <h2>Oposiciones por categoría</h2>
  <p class="muted">Solo publicamos oposiciones cuya convocatoria hemos verificado en la fuente oficial. Las categorías sin oposiciones todavía están en preparación.</p>
  <div class="cat-grid">${CATEGORIAS.map((c) => `<a class="cat-card${catCount(c.id) ? "" : " soon"}" href="${r}oposiciones/categoria/${c.id}/"><span class="cat-ico">${c.icono}</span><strong>${esc(c.nombre)}</strong><span>${catCount(c.id) ? `${catCount(c.id)} oposición${catCount(c.id) > 1 ? "es" : ""}` : "Próximamente"}</span></a>`).join("")}</div>
</section>

<section>
  <h2>Convocatorias con más plazas</h2>
  <div class="cards">${OPOS.slice(0, 6).map((o) => tarjetaOp(o, r)).join("")}</div>
  <p><a class="cta alt" href="oposiciones/">Buscar todas las oposiciones</a></p>
</section>

<section class="features">
  <h2>Todo lo que necesitas para dominar la ley</h2>
  <div class="cards three">
    <div class="card"><span class="f-ico">📜</span><strong>Respuesta citada del BOE</strong><span>Un validador automático comprueba que cada cita aparece palabra por palabra en el texto consolidado. Nada de preguntas de origen dudoso.</span></div>
    <div class="card"><span class="f-ico">📊</span><strong>Panel de progreso</strong><span>Ve qué títulos dominas, cuáles te cuestan, tu racha de estudio y tu evolución test a test.</span></div>
    <div class="card"><span class="f-ico">🎯</span><strong>Nota orientativa</strong><span>Estimamos la nota que sacarías hoy en esta parte, con la penalización del examen (cada error resta 1/3).</span></div>
    <div class="card"><span class="f-ico">🧠</span><strong>Repaso inteligente</strong><span>Tus fallos vuelven hasta que los aciertas dos veces seguidas. Así se consolidan de verdad.</span></div>
    <div class="card"><span class="f-ico">⏱️</span><strong>Simulacros como el examen</strong><span>Número de preguntas, tiempo, opciones y penalización sacados de la convocatoria oficial de cada oposición.</span></div>
    <div class="card"><span class="f-ico">🏆</span><strong>Ranking y logros</strong><span>Estrellas, rachas y logros para mantener la constancia${C.supabaseUrl ? ", y un ranking para medirte con otros opositores" : ". El ranking entre opositores llega con las cuentas"}.</span></div>
  </div>
</section>

<section class="how">
  <h2>Cómo funciona</h2>
  <ol class="steps">
    <li><b>Busca tu oposición.</b> Mira plazas, requisitos y plazos con el texto oficial de la convocatoria.</li>
    <li><b>Elígela y crea tu cuenta gratis.</b> Tu panel, tu temario y tu ranking se centran en ella.</li>
    <li><b>Estudia el temario con tests.</b> Cada respuesta cita el artículo del BOE; los fallos vuelven hasta que los dominas.</li>
    <li><b>Haz simulacros y sigue tu progreso.</b> Nota orientativa, dominio por tema y puntos débiles.</li>
  </ol>
  <p><a class="cta" href="oposiciones/">Buscar mi oposición</a> <a class="cta alt" href="${LEY.slug}/">Probar un test gratis</a></p>
</section>

<section>
  <h2>Leyes</h2>
  <div class="cards">
    ${PUBLICADAS.map((L) => `<a class="card" href="${L.slug}/"><span class="tag">Disponible</span><strong>${esc(L.corto)}</strong><span>${L.qs.length} preguntas · ${L.arts.length} artículos</span></a>`).join("")}
    ${LEYES.filter((L) => !L.qs.length).slice(0, 6).map((L) => `<div class="card soon"><span class="tag grey">En preparación</span><strong>${esc(L.corto)}</strong><span>${esc(L.nombre)}</span></div>`).join("")}
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
  scripts: ["plan.js", "avisos.js", "panel.js"],
  body: () => `<div class="ctx-bar"><label class="muted" for="ctx">Estoy preparando</label><select id="ctx" class="select">${OPOS.map((o) => `<option value="${o.id}">${esc(o.nombre)} (${esc(o.grupo)})</option>`).join("")}${PUBLICADAS.map((L) => `<option value="${L.slug}">Solo ${esc(L.corto)}</option>`).join("")}</select></div><div id="panel" data-ley="${LEY.slug}"><p class="muted">Cargando tu progreso…</p></div>`,
});
page("ranking/", {
  title: "Ranking de opositores · Ley 39/2015", description: "Ranking de TestLey: los opositores con mejor nota orientativa en la Ley 39/2015.",
  scripts: ["ranking.js"],
  body: (r) => `<nav class="crumbs"><a href="${r}">Inicio</a> › <span>Ranking</span></nav><h1>Ranking de opositores</h1><p class="lead">Un ranking por cada oposición y por cada ley. Para aparecer necesitas una cuenta y al menos 20 respuestas.</p><label class="muted" for="ctx">Ranking de</label><select id="ctx" class="select">${OPOS.map((o) => `<option value="${o.id}">${esc(o.nombre)} (${esc(o.grupo)})</option>`).join("")}${PUBLICADAS.map((L) => `<option value="${L.slug}">Solo ${esc(L.corto)}</option>`).join("")}</select><div id="ranking" data-ley="${OPOS[0] ? OPOS[0].id : LEY.slug}"></div>`,
});
page("cuenta/", {
  title: "Entrar o crear cuenta", description: "Crea tu cuenta gratuita en TestLey para guardar tu progreso y entrar en el ranking.", noindex: true,
  scripts: ["cuenta.js"],
  body: () => `<div id="cuenta"></div>`,
});

// ---------- Hub de la ley ----------
for (const L of PUBLICADAS) {
const bloques = [...new Set(L.arts.map((a) => a.bloque))];
page(`${L.slug}/`, {
  title: `Test ${L.corto} online${L.slug === LEY.slug ? " gratis" : ""} (${L.qs.length} preguntas con solución)`,
  description: `Test de ${L.nombre} con ${L.qs.length} preguntas para oposiciones y la cita literal del BOE en cada respuesta. Texto consolidado artículo por artículo.`,
  scripts: ["test.js"],
  schema: { "@context": "https://schema.org", "@type": "Quiz", name: `Test ${esc(L.corto)}`, about: L.nombre, inLanguage: "es", educationalLevel: "Oposiciones", url: C.url + L.slug + "/" },
  body: (r) => `
<nav class="crumbs"><a href="${r}">Inicio</a> › <span>${esc(L.corto)}</span></nav>
<h1>Test de ${esc(L.corto)} con solución</h1>
<p class="lead">${esc(L.nombre)}. Responde y verás al momento la cita literal del artículo.</p>
<div id="quiz" class="quiz" data-ley="${L.slug}" data-base="./">Cargando preguntas…</div>
<p class="muted">¿Encuentras un error? Escríbenos a <a href="mailto:globalprsx@gmail.com">globalprsx@gmail.com</a> indicando la pregunta y la revisamos contra el BOE.</p>
<h2>Artículos · ${esc(L.corto)}</h2>
${bloques
  .map(
    (b) =>
      `<h3>${esc(b)}</h3><ul class="art-list">${L.arts
        .filter((a) => a.bloque === b)
        .map((a) => `<li><a href="articulo-${a.n}/">Art. ${a.n}. ${esc(a.titulo)}</a></li>`)
        .join("")}</ul>`
  )
  .join("")}
<p class="muted">Texto consolidado de la ley: <a href="${L.fuente}" rel="noopener">${L.id}</a>.</p>`,
});

// ---------- Una página por artículo ----------
for (const a of L.arts) {
  const qs = L.qs.filter((q) => q.art === a.n);
  const texto = a.texto.replace(/> <small>[\s\S]*?<\/small>/g, "").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").trim();
  page(`${L.slug}/articulo-${a.n}/`, {
    title: `Artículo ${a.n} ${L.corto}${a.titulo ? ": " + a.titulo : ""}${qs.length ? " (con test)" : ""}`,
    description: `Texto del artículo ${a.n} de ${L.nombre}${a.titulo ? " (" + a.titulo + ")" : ""}${qs.length ? ` y ${qs.length} preguntas tipo test con solución` : ""}. Versión consolidada del BOE.`,
    scripts: qs.length ? ["test.js"] : [],
    schema: { "@context": "https://schema.org", "@type": "LearningResource", name: `Artículo ${a.n} ${L.corto}`, inLanguage: "es", isBasedOn: L.fuente },
    body: (r) => `
<nav class="crumbs"><a href="${r}">Inicio</a> › <a href="../">${esc(L.corto)}</a> › <span>Art. ${a.n}</span></nav>
<h1>Artículo ${a.n} · ${esc(L.corto)}${a.titulo ? ". " + esc(a.titulo) : ""}</h1>
<p class="muted">${esc(a.bloque)}${a.capitulo ? " · " + esc(a.capitulo) : ""}</p>
<div class="art-text">${esc(texto)}</div>
${
  qs.length
    ? `<h2>Test del artículo ${a.n}</h2><div id="quiz" class="quiz" data-ley="${L.slug}" data-base="../" data-art="${a.n}">Cargando…</div>`
    : `<p><a class="cta" href="../">Hacer el test de ${esc(L.corto)}</a></p>`
}
<p>${(() => {
      const i = L.arts.indexOf(a);
      const p = L.arts[i - 1], n = L.arts[i + 1];
      return `${p ? `<a href="../articulo-${p.n}/">← Art. ${p.n}</a>` : ""}${p && n ? " · " : ""}${n ? `<a href="../articulo-${n.n}/">Art. ${n.n} →</a>` : ""}`;
    })()}</p>
<p class="muted">Fuente: <a href="${L.fuente}" rel="noopener">BOE, texto consolidado</a>. ${L.actualizada ? "Última actualización recogida: " + L.actualizada.split("-").reverse().join("/") + "." : ""}</p>`,
  });
}
}

// ---------- Directorio y páginas de oposiciones ----------
page("oposiciones/", {
  title: "Buscador de oposiciones: convocatorias oficiales, temario y tests",
  description: `Busca tu oposición por categoría u organismo y consulta su convocatoria oficial del BOE, requisitos, plazas y temario. ${OPOS.length} oposiciones verificadas en ${CATEGORIAS.filter((c) => catCount(c.id)).length} categorías.`,
  wide: true,
  scripts: ["buscador.js"],
  body: (r) => `<nav class="crumbs"><a href="${r}">Inicio</a> › <span>Oposiciones</span></nav>
<h1>Buscador de oposiciones</h1>
<p class="lead">Solo publicamos oposiciones cuya convocatoria hemos leído en la fuente oficial. Cada dato (plazas, requisitos, plazos) enlaza al BOE y muestra el texto literal del que sale.</p>
${buscador(r)}
${chipsCat(r, "")}
<p id="res-count" class="muted" aria-live="polite">${OPOS.length} oposiciones</p>
<div class="cards" id="res">${OPOS.map((o) => tarjetaOp(o, r)).join("")}</div>
<p id="res-vacio" class="box" hidden>No hay ninguna oposición verificada con esa búsqueda todavía. Escríbenos a <a href="mailto:globalprsx@gmail.com">globalprsx@gmail.com</a> y la añadimos a la cola a partir de su convocatoria oficial.</p>
<div class="box"><strong>¿Cómo elegimos qué publicar?</strong> Añadimos oposiciones a partir de su convocatoria oficial. Si todavía no hay convocatoria o no hemos podido verificarla, no la mostramos: preferimos un catálogo más pequeño antes que datos inventados.</div>`,
});
for (const c of CATEGORIAS) {
  const lista = OPOS.filter((o) => o.categoria === c.id);
  page(`oposiciones/categoria/${c.id}/`, {
    title: `Oposiciones de ${c.nombre}: convocatorias, temario y tests`,
    description: `${c.descripcion} ${lista.length ? `${lista.length} oposición${lista.length > 1 ? "es" : ""} con convocatoria oficial verificada, temario y tests.` : "Próximamente en TestLey."}`,
    noindex: !lista.length, wide: true,
    body: (r) => `<nav class="crumbs"><a href="${r}">Inicio</a> › <a href="${r}oposiciones/">Oposiciones</a> › <span>${esc(c.nombre)}</span></nav>
<h1>${c.icono} Oposiciones de ${esc(c.nombre)}</h1>
<p class="lead">${esc(c.descripcion)}</p>
${chipsCat(r, c.id)}
${lista.length
  ? `<div class="cards">${lista.map((o) => tarjetaOp(o, r)).join("")}</div>`
  : `<div class="box"><strong>Todavía no hay oposiciones de ${esc(c.nombre)} verificadas.</strong> Solo publicamos una oposición cuando hemos leído su convocatoria oficial. Si preparas una de esta categoría, escríbenos a <a href="mailto:globalprsx@gmail.com">globalprsx@gmail.com</a> y la priorizamos.</div>`}`,
  });
}
const ETIQ = { plazas: "Plazas", plazas_reservadas: "Plazas reservadas", titulacion: "Titulación", requisitos: "Requisitos", plazo_solicitudes: "Plazo de solicitudes", pruebas: "Pruebas y examen" };
function oficialHtml(o) {
  const dato = (d) => {
    const f = o.fuentes[d.fuente];
    return `<li><span>${esc(typeof d.valor === "number" ? fmtN(d.valor) : d.valor)}</span><details><summary>Texto oficial</summary><blockquote>«${esc(d.cita)}»<span class="src"><a href="${esc(f.url)}" rel="noopener">${esc(f.id || f.titulo)}</a> · publicado el ${fmtFecha(f.fecha_publicacion)}</span></blockquote></details></li>`;
  };
  const filas = Object.keys(o.oficial).map((k) => `<div class="of-row"><h3>${ETIQ[k] || esc(k)}</h3><ul class="of-list">${(Array.isArray(o.oficial[k]) ? o.oficial[k] : [o.oficial[k]]).map(dato).join("")}</ul></div>`).join("");
  const fu = Object.values(o.fuentes).map((f) => `<li><a href="${esc(f.url)}" rel="noopener">${esc(f.titulo)}</a> · ${esc(f.tipo)}, publicado el ${fmtFecha(f.fecha_publicacion)}</li>`).join("");
  return `<section class="card oficial"><div class="of-head"><h2>Datos oficiales de la convocatoria</h2><span class="badge-oficial">Fuente oficial</span></div>
${filas}
<p class="muted small">Fechas de examen: solo las mostramos cuando se publican oficialmente. Documentos oficiales:</p><ul class="small">${fu}</ul>
<p class="muted small">Datos revisados el ${fmtFecha(o.actualizado)}. Cada dato incluye el texto literal de la fuente; si hubiera discrepancia, prevalece siempre el BOE.</p></section>`;
}
for (const o of OPOS) {
  const c = o.convocatoria;
  const sim = (o.examen || {}).simulacro;
  const bloques = [...new Set(o.temario.map((t) => t.bloque))];
  const pct = Math.round((100 * o.temasCubiertos) / Math.max(1, o.cobertura.temas_legislativos));
  const chip = (t) => {
    if (t.tipo === "no_legislativo") return `<span class="chip grey">Fuera de TestLey (informática/ofimática)</span>`;
    if (!t.normas.length) return `<span class="chip grey">Sin norma concreta · en preparación</span>`;
    return t.normas.map((id) => {
      const n = NORMAS[id] || { nombre: id };
      return PUB[id] ? `<a class="chip ok" href="../../${PUB[id].slug}/">✔ ${esc(n.nombre)}</a>` : `<span class="chip">${esc(n.nombre)} · en preparación</span>`;
    }).join(" ");
  };
  const datosOp = { leyes: o.leyes, arts: o.arts, qs: o.qs, temario: o.temario.map((t, i) => ({ i, b: t.bloque, n: t.tema, t: t.titulo, tipo: t.tipo, leyes: t.normas.filter((id) => PUB[id]).map((id) => PUB[id].slug), normas: t.normas.map((id) => (NORMAS[id] || { nombre: id }).nombre) })) };
  fs.mkdirSync(path.join(OUT_TMP, "datos"), { recursive: true });
  fs.writeFileSync(path.join(OUT_TMP, "datos", `${o.id}.json`), JSON.stringify(datosOp));
  page(`oposiciones/${o.id}/`, {
    title: `${o.nombre} (${o.grupo}): temario oficial y test`,
    description: `Prepara la oposición de ${o.nombre}: temario oficial de ${o.temario.length} temas${c.plazas ? `, ${fmtN(c.plazas)} plazas` : ""}, test con la respuesta citada del BOE, progreso por tema y ranking de opositores.`,
    scripts: ["test.js", "oposicion.js"],
    schema: { "@context": "https://schema.org", "@type": "Course", name: `Preparación ${o.nombre}`, inLanguage: "es", provider: { "@type": "Organization", name: C.name }, isBasedOn: o.fuente_temario },
    body: (r) => `<nav class="crumbs"><a href="${r}">Inicio</a> › <a href="${r}oposiciones/">Oposiciones</a> › <span>${esc(o.grupo)}</span></nav>
<h1>${esc(o.nombre)}</h1>
<p class="op-meta"><span class="pill">Grupo ${esc(o.grupo)}</span> <span class="pill">${esc(opEstado(c))}</span>${c.plazas ? ` <span class="pill">${fmtN(c.plazas)} plazas turno libre</span>` : ""}</p>
<p class="muted small">Convocatoria: <a href="${esc(c.url_oficial)}" rel="noopener">${esc(c.referencia)}</a>, publicada el ${c.fecha_publicacion.split("-").reverse().join("/")}. Temario copiado del anexo ${esc(c.anexo || "")} de la convocatoria oficial.</p>
<p class="muted small">${CAT[o.categoria].icono} <a href="${r}oposiciones/categoria/${o.categoria}/">${esc(o.categoria_nombre)}</a> · ${esc(o.organismo)} · ${esc(o.territorio)}</p>
<div id="op-accion" data-op="${o.id}" data-nombre="${esc(o.nombre)}"></div>
${oficialHtml(o)}
${novedadesHtml(o)}
<div class="card"><h2>Cobertura de TestLey</h2>
<div class="covbar big"><i style="width:${Math.max(2, pct)}%"></i></div>
<p>Test disponible en <b>${o.temasCubiertos} de ${o.cobertura.temas_legislativos}</b> temas de legislación (${pct} %). ${o.cobertura.temas_no_legislativos ? `Los ${o.cobertura.temas_no_legislativos} temas de informática y ofimática no forman parte de TestLey.` : ""}</p>
<p class="muted small">Publicamos leyes nuevas cada semana por orden de impacto en las oposiciones del catálogo. Esta página se actualiza sola.</p></div>
${o.qs.length ? `<h2>Test de ${esc(o.nombre.replace(/^Cuerpo (General )?/, ""))} <span class="badge-testley">Contenido de TestLey</span></h2><p class="muted small">Preguntas redactadas por TestLey; cada respuesta cita el artículo del BOE que la justifica.${sim ? ` Simulacro: ${sim.preguntas} preguntas, ${sim.minutos} minutos, ${sim.opciones} opciones. ${esc(sim.nota)}` : ""}</p><div id="quiz" class="quiz" data-ley="${o.id}" data-base="./" data-sim="${esc(JSON.stringify(sim || null))}">Cargando preguntas…</div>` : ""}
<h2>Temario oficial</h2>
<div id="op-temario">${bloques.map((b) => `<h3>${esc(b)}</h3><ol class="temario">${o.temario.filter((t) => t.bloque === b).map((t) => `<li value="${t.tema}"><p>${esc(t.titulo)}</p><div class="chips">${chip(t)}</div></li>`).join("")}</ol>`).join("")}</div>
<p class="muted small">Las leyes de cada tema se asignan a partir del texto del temario; cuando el tema no nombra la ley expresamente, la asignación es orientativa. Comprueba siempre las bases de tu convocatoria.</p>`,
  });
}

// ---------- Pase opositor (preventa) ----------
page("pase/", {
  title: "Pase Opositor: todas las leyes, simulacros y repaso inteligente",
  description: "Pase Opositor de TestLey: acceso a todas las leyes del temario común, simulacros cronometrados y repaso de fallos. 3 días de prueba gratis y después 15,99 € al mes.",
  scripts: ["pase.js"],
  body: (r) => `
<nav class="crumbs"><a href="${r}">Inicio</a> › <span>Pase Opositor</span></nav>
<h1>Pase Opositor</h1>
<p class="lead">El test completo de la Ley 39/2015 y los tests de cada artículo son y seguirán siendo gratis. El Pase Opositor desbloquea todas las preguntas del resto del temario y las herramientas para llegar al examen con todo repasado.</p>
<div class="box">
  <p class="price">15,99 € <span class="muted" style="font-size:1rem;font-weight:400">/ mes · 3 días de prueba gratis</span></p>
  <ul>
    <li>Todas las preguntas de <strong>${PUBLICADAS.map((L) => esc(L.corto)).join(", ")}</strong> y de las nuevas leyes del temario a medida que se publican.</li>
    <li>El test combinado de cada oposición con su temario oficial.</li>
    <li><strong>Simulacros</strong> de 30 preguntas en 30 minutos con penalización por error, como en el examen.</li>
    <li><strong>Repaso inteligente</strong>: primero tus fallos y lo que aún no has visto.</li>
    <li><strong>Test a medida</strong> por tema, número de preguntas, tus fallos o tus favoritas, y <strong>modo examen</strong> con análisis de errores.</li>
    <li><strong>Plan de estudio adaptativo</strong> según tu fecha de examen, tus horas y tus fallos.</li>
    <li><strong>Avisos del BOE</strong> de las convocatorias que sigues: listas, modificaciones, fechas.</li>${C.tutorUrl ? `
    <li><strong>Tutor IA</strong> que explica cada pregunta a partir del texto oficial del artículo.</li>` : ""}
  </ul>
  ${
    C.checkoutUrl
      ? `<p><a class="cta" href="${C.checkoutUrl}" rel="noopener">Empezar la prueba gratis de 3 días</a></p><p class="muted">Pago seguro con Lemon Squeezy. Si cancelas antes de que acaben los 3 días, no se te cobra nada. Después, 15,99 € al mes; puedes cancelar cuando quieras y conservas el acceso hasta el final del mes pagado.</p>`
      : `<p><strong>Abrimos las suscripciones muy pronto.</strong> Mientras tanto, practica gratis con la <a href="${r}${LEY.slug}/">Ley 39/2015</a>.</p>`
  }
</div>
<h2 id="como">Cómo se activa</h2>
<ol><li>Empieza la prueba en Lemon Squeezy.</li><li>Recibirás por email una <strong>clave de licencia</strong>.</li><li>Pégala abajo. Puedes usar la misma clave en el móvil y en el ordenador.</li></ol>
<div id="activar"></div>
<p class="muted">La suscripción se renueva cada mes hasta que la canceles desde el enlace de tu email de compra. Si la cancelas, el Pase deja de estar activo al terminar el periodo pagado.</p>`,
});

// ---------- Legales ----------
for (const f of fs.readdirSync("web/paginas")) {
  const raw = fs.readFileSync(path.join("web/paginas", f), "utf8");
  const [, meta, body] = raw.match(/^<!--meta\s*([\s\S]*?)-->\s*([\s\S]*)$/);
  const m = JSON.parse(meta);
  page(m.route, { title: m.title, description: m.description, noindex: m.noindex, scripts: m.scripts, body: () => body });
}

// ---------- Escritura ----------
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(path.join(OUT, "datos"), { recursive: true });
fs.cpSync("web/assets", path.join(OUT, "assets"), { recursive: true });
fs.cpSync(path.join(OUT_TMP, "datos"), path.join(OUT, "datos"), { recursive: true });
for (const L of PUBLICADAS)
  fs.writeFileSync(
    path.join(OUT, "datos", `${L.slug}.json`),
    JSON.stringify({ leyes: { [L.slug]: L.corto }, arts: Object.fromEntries(L.arts.map((a) => [a.n, { t: a.titulo || "Artículo " + a.n, b: a.bloque || L.corto }])), qs: L.qs })
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
  `# ${C.name}\n\n> ${C.tagline} Preguntas tipo test de oposiciones cuya respuesta se justifica con la cita literal del texto consolidado del BOE.\n\n## Leyes\n${PUBLICADAS.map((L) => `- [Test ${L.corto}](${C.url}${L.slug}/): ${L.qs.length} preguntas y los ${L.arts.length} artículos de ${L.nombre}, cada uno en su página.`).join("\\n")}\n\n## Oposiciones\n${OPOS.map((o) => `- [${o.nombre}](${C.url}oposiciones/${o.id}/): temario oficial y test.`).join("\\n")}\n`
);
fs.writeFileSync(path.join(OUT, ".nojekyll"), "");
if (C.customDomain) fs.writeFileSync(path.join(OUT, "CNAME"), C.customDomain + "\n");
console.log(`Generadas ${pages.length} páginas (${idx.length} indexables) en ${OUT}/`);
