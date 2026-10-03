// Genera el sitio estático en docs/ a partir de datos/ y web/.
// Uso: node build.mjs   (valida antes con: python3 datos/validar.py ...)
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const C = JSON.parse(fs.readFileSync("config.json", "utf8"));
// Solo para pruebas locales: TL_SUPABASE_URL / TL_SUPABASE_KEY / TL_OUT
if (process.env.TL_SUPABASE_URL) { C.supabaseUrl = process.env.TL_SUPABASE_URL; C.supabaseAnonKey = process.env.TL_SUPABASE_KEY || "test"; }
const OUT = process.env.TL_OUT || "docs";
const OUT_TMP = fs.mkdtempSync(path.join((process.env.TMPDIR || "/tmp"), "tl-"));
// ---------- Leyes ----------
// Una ley se publica (test + páginas) cuando existe datos/preguntas-<slug>.json con preguntas.
const META = JSON.parse(fs.readFileSync("datos/leyes-meta.json", "utf8"));
const CORTO = { constitucion: "Constitución Española", trebep: "TREBEP", "rdl-1-2013": "Ley General de Discapacidad (RDL 1/2013)", "rdl-8-2015": "Ley General de la Seguridad Social (RDL 8/2015)", "lef-1954": "Ley de Expropiación Forzosa", "lo-4-2000": "Ley Orgánica 4/2000 de Extranjería", "lo-2-1986": "Ley de Fuerzas y Cuerpos de Seguridad (LO 2/1986)", "lo-4-2015": "Ley de Seguridad Ciudadana (LO 4/2015)", "lo-6-1984": "Ley de Habeas Corpus (LO 6/1984)", lecrim: "Ley de Enjuiciamiento Criminal", "codigo-penal": "Código Penal", "codigo-civil": "Código Civil", "ley-4-2015": "Estatuto de la víctima (Ley 4/2015)", "ley-5-2014": "Ley de Seguridad Privada (Ley 5/2014)", "ley-8-2011": "Ley de Infraestructuras Críticas (Ley 8/2011)", "lo-7-2021": "Ley Orgánica 7/2021 de datos penales", "ley-31-1995": "Ley de Prevención de Riesgos Laborales", "rd-240-2007": "RD 240/2007 (ciudadanos UE)", "reglamento-armas": "Reglamento de Armas", rgc: "Reglamento General de Circulación", "lo-9-2015": "LO 9/2015 de Personal de la Policía Nacional", "lo-4-2010": "LO 4/2010 Régimen disciplinario de la Policía Nacional", "ley-trafico": "Ley de Tráfico y Seguridad Vial", "rd-207-2024": "RD 207/2024 (estructura del Ministerio del Interior)", "ley-23-2014": "Ley 23/2014 de reconocimiento mutuo penal (UE)" };
const PREFIJO = { "ley-39-2015": "l39" }; // ids estables del progreso de los usuarios
const LEYES = JSON.parse(fs.readFileSync("catalogo/normas.json", "utf8")).map((n) => {
  const fq = `datos/preguntas-${n.slug}.json`;
  const L = {
    id: n.id, slug: n.slug, nombre: n.nombre,
    corto: CORTO[n.slug] || n.nombre.split(",")[0],
    arts: (() => { const fa = n.articulos || `datos/${n.slug}-articulos.json`; return fs.existsSync(fa) ? JSON.parse(fs.readFileSync(fa, "utf8")) : []; })(),
    qs: fs.existsSync(fq) ? JSON.parse(fs.readFileSync(fq, "utf8")) : [],
    fuente: n.url || `https://www.boe.es/buscar/act.php?id=${n.id}`,
    // Fuente oficial no versionada (guía de estudio de Mossos, © Generalitat): sus preguntas sí se publican en la oposición,
    // pero nunca su texto (sin páginas de la norma ni de sus apartados); en cada pregunta solo la cita que la justifica
    privada: n.publicar_texto === false,
    actualizada: META[n.id] || "",
  };
  // id guardado en cada pregunta (datos/ids-congelados.json, fabrica/congelar_ids.py); el posicional solo como respaldo
  L.qs.forEach((q, i) => (q.id = q.id || (PREFIJO[n.slug] || n.slug) + "-" + i));
  // Estados de la pregunta: VALID (sin campo) · REVIEW_REQUIRED (su artículo cambió; se publica y se revisa) · OUTDATED (la cita ya no está en la ley vigente) · DEPRECATED (retirada a mano)
  L.desfasadas = L.qs.filter((q) => ["DEPRECATED", "OUTDATED"].includes(q.verification_status)); // no se publican (datos/vigilar_leyes.py, revisar_vigencia.py)
  L.revisar = L.qs.filter((q) => q.verification_status === "REVIEW_REQUIRED");
  // REVIEW_REQUIRED_REEVALUATION: publicada antes y en reevaluación con el juez v2 (fabrica/reevaluacion.py) → no se sirve; conserva su id
  L.reevaluacion = L.qs.filter((q) => q.verification_status === "REVIEW_REQUIRED_REEVALUATION");
  L.qs = L.qs.filter((q) => !["DEPRECATED", "OUTDATED", "REVIEW_REQUIRED_REEVALUATION"].includes(q.verification_status));
  return L;
});
const PUBLICADAS = LEYES.filter((L) => L.qs.length && L.arts.length);
const PUBLICADAS_WEB = PUBLICADAS.filter((L) => !L.privada); // con página propia de la norma y de sus artículos
const LEYPOR = Object.fromEntries(PUBLICADAS.map((L) => [L.slug, L]));
// Campos internos de la fábrica (fabrica/): se quedan en datos/, no viajan al navegador
const PUBLICO = ({ generador, modelo, juez, lote, tema_objetivo, fuente_url, origen, creada_el, traza, aprobacion_humana, revision_humana,
  current_status, legacy_verdict, legacy_flags, legacy_reason, legacy_policy_version, legacy_judge, legacy_batch, reevaluaciones,
  reevaluation_verdict, reevaluation_reason, reevaluation_policy_version, reevaluation_judge, reevaluation_at, ...q }) => q;
// ---------- Banco premium (B1, documentacion/PREMIUM_DEPLOYMENT.md) ----------
// Contenido premium = preguntas de normas sin acceso gratuito: las de fuentes no publicadas (guía de Mossos, sin páginas de
// artículo) que no están en planes.free.leyes_completas. Las preguntas de las leyes del BOE son gratuitas por artículo (promesa
// de la página de precios) y siguen en docs/datos. Con bancoPrivado activo, docs/ solo lleva una muestra del contenido premium
// y el resto va a OUT_PRIV (fuera de docs/, ignorado por git), que scripts/subir_banco.py sube a public.banco_premium; el
// navegador lo pide a la función «banco», que comprueba el entitlement en el servidor (mi_plan() o clave de licencia).
const BANCO_PRIVADO = process.env.TL_BANCO_PRIVADO ? process.env.TL_BANCO_PRIVADO === "1" : !!C.bancoPrivado;
const OUT_PRIV = process.env.TL_PRIV || ".banco-privado";
const PLAN_FREE = (C.planes || {}).free || {};
const LIBRES = new Set(PLAN_FREE.leyes_completas || []);
const MUESTRA_N = PLAN_FREE.preguntas_muestra || 10;
const PRIVADO = {};
const esPremium = (q, ley) => { const sl = q.ley || ley; return !!(LEYPOR[sl] || {}).privada && !LIBRES.has(sl); };
function separarPremium(clave, qs, ley) {
  if (!BANCO_PRIVADO) return qs;
  const prem = qs.filter((q) => esPremium(q, ley));
  if (!prem.length) return qs;
  const paso = prem.length / MUESTRA_N, muestra = new Set();
  for (let i = 0; i < Math.min(MUESTRA_N, prem.length); i++) muestra.add(prem[Math.floor(i * paso)].id);
  PRIVADO[clave] = prem.filter((q) => !muestra.has(q.id)).map(PUBLICO);
  const fuera = new Set(PRIVADO[clave].map((q) => q.id));
  return qs.filter((q) => !fuera.has(q.id));
}
// lastmod de las páginas de cada ley: último commit de sus preguntas o de su texto (si hay cambios sin commit, hoy).
// En un clon superficial (checkout de CI con fetch-depth 1) la historia no es fiable: se usa config.updated.
const GIT_OK = (() => { try { return execFileSync("git", ["rev-parse", "--is-shallow-repository"], { encoding: "utf8" }).trim() === "false"; } catch { return false; } })();
const fechaGit = (f) => {
  if (!GIT_OK) return "";
  try {
    if (execFileSync("git", ["status", "--porcelain", "--", f], { encoding: "utf8" }).trim()) return new Date().toISOString().slice(0, 10);
    return execFileSync("git", ["log", "-1", "--format=%cs", "--", f], { encoding: "utf8" }).trim();
  } catch { return ""; }
};
for (const L of PUBLICADAS) L.lastmod = [fechaGit(`datos/preguntas-${L.slug}.json`), L.privada ? "" : fechaGit(`datos/${L.slug}-articulos.json`)].filter(Boolean).sort().pop() || "";
const LEY = LEYES.find((L) => L.slug === "ley-39-2015");

// Vocabulario único de estados de verificación (catalogo/estados_verificacion.json)
const VS = JSON.parse(fs.readFileSync("catalogo/estados_verificacion.json", "utf8"));
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const pages = [];
// Growth OS: flags y experimentos activos (nunca de precio sin autorización) para el navegador
const EXPS = JSON.parse(fs.readFileSync("crecimiento/experimentos.json", "utf8")).experimentos;
for (const e of EXPS) if (["precio", "plan"].includes(e.tipo) && e.estado === "activo" && !e.autorizado_por) throw new Error(`Experimento ${e.id}: los de precio/plan requieren autorizado_por`);
const FLAGS = Object.fromEntries(Object.entries(C.flags || {}).filter(([k]) => !k.startsWith("_")));
const EXP_ACTIVOS = FLAGS.experiments ? EXPS.filter((e) => e.estado === "activo").map((e) => ({ id: e.id, variantes: e.variantes.map((v) => ({ id: v.id, peso: v.peso })) })) : [];
const badgeVS = (e) => (VS[e] && !e.startsWith("_") ? `<span class="${VS[e].clase}" title="${esc(VS[e].descripcion)}">${esc(VS[e].etiqueta)}</span>` : "");

// ---------- SEO: longitudes objetivo (title de 30 a 65 caracteres con la marca al final si cabe; description de 110 a 160) ----------
const T_MAX = 65, D_MAX = 160;
// Año de referencia para títulos de búsqueda («Test Constitución Española 2026»): el de la última actualización del sitio
const ANIO = String(C.updated || new Date().toISOString()).slice(0, 4);
const VACIAS = /\s+(de|del|la|las|el|los|y|e|o|u|en|a|al|con|por|para|sus?|un|una|que|se)$/i;
// Recorta por palabras sin dejar al final preposiciones ni signos sueltos
const cortar = (s, n, puntos = "") => {
  s = String(s).replace(/\s+/g, " ").trim();
  if (s.length <= n) return s;
  let t = s.slice(0, n - puntos.length + 1);
  t = t.slice(0, Math.max(t.lastIndexOf(" "), 1));
  for (let k = 0; k < 4; k++) t = t.replace(/[\s,;:.·–(\-/]+$/, "").replace(VACIAS, "");
  return t + puntos;
};
// Título: prefijo + parte flexible (recortada) + sufijo, sin pasar de T_MAX
const titulo = (pre, flex, suf = "") => pre + (flex ? cortar(flex, Math.max(10, T_MAX - pre.length - suf.length)) : "") + suf;
// Primer candidato que cabe en T_MAX (si ninguno, el último recortado)
const primero = (...cands) => cands.find((t) => t.length <= T_MAX) || cortar(cands[cands.length - 1], T_MAX);
// Descripción: la primera frase es obligatoria (recortada si pasa de D_MAX); las siguientes se añaden mientras quepan
const descripcion = (...frases) => {
  const L = frases.filter(Boolean).map((f) => String(f).replace(/\s+/g, " ").trim());
  let d = cortar(L[0], D_MAX, "…");
  for (const f of L.slice(1)) if (d.length + 1 + f.length <= D_MAX) d += " " + f;
  return d;
};
const conMarca = (t) => (t.includes(C.name) ? t : `${t} | ${C.name}`.length <= T_MAX ? `${t} | ${C.name}` : t);
const unesc = (s) => String(s).replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&amp;/g, "&");
const ldJson = (x) => `<script type="application/ld+json">${JSON.stringify(x).replace(/</g, "\\u003c")}</script>`;
// Migas visibles (<nav class="crumbs">) → BreadcrumbList, para que el marcado coincida siempre con lo que se ve
const migasDe = (html, route) => {
  const nav = (html.match(/<nav class="crumbs">([\s\S]*?)<\/nav>/) || [])[1];
  if (!nav) return null;
  const items = [...nav.matchAll(/<a href="([^"]*)">([\s\S]*?)<\/a>/g)].map((m) => [unesc(m[2].replace(/<[^>]+>/g, "")), new URL(m[1], C.url + route).href]);
  const ultimo = (nav.match(/<span>([\s\S]*?)<\/span>\s*$/) || [])[1];
  if (ultimo) items.push([unesc(ultimo.replace(/<[^>]+>/g, "")), C.url + route]);
  return items.length > 1 ? items : null;
};
const OG_IMG = fs.existsSync("web/assets/og-testley.png"), LOGO_IMG = fs.existsSync("web/assets/logo-testley.png");
// Cada página se registra aquí y se pinta al final: antes se resuelven los títulos y descripciones duplicados
// con las alternativas que da cada página (tituloAlt / descAlt, de más corta a más específica).
// lastmod: fecha real del contenido, nunca posterior al día de la build (algunos datos llevan fecha de mañana por zona horaria)
const HOY = new Date().toISOString().slice(0, 10);
// Opposition Engine (catalogo/perfiles/<id>.json → motor360): qué módulos 360 tiene cada oposición
const MOTOR = {};
const motorDe = (o) => (o.id in MOTOR ? MOTOR[o.id] : (MOTOR[o.id] = fs.existsSync(`catalogo/perfiles/${o.id}.json`) ? JSON.parse(fs.readFileSync(`catalogo/perfiles/${o.id}.json`, "utf8")).motor360 || null : null));
const aptitudOf = (o) => { const m = motorDe(o); const a = m && m.modulos.aptitude.oficial; return a && a.verification_status === "OFFICIAL_VERIFIED" ? a : null; };
function page(route, opts) {
  const lm = opts.lastmod || C.updated;
  pages.push({ route, opts, noindex: opts.noindex, lastmod: lm > HOY ? HOY : lm, title: conMarca(opts.title), description: opts.description });
}
function render({ route, opts, title: full, description }) {
  const { title, body, schema, noindex, wide, scripts = [], crumbs } = opts;
  const depth = route.split("/").filter(Boolean).length;
  const root = depth ? "../".repeat(depth) : "./";
  const url = C.url + route;
  const cuerpo = body(root);
  // Las migas visibles mandan (el marcado debe coincidir con lo que se ve); «crumbs» solo si la página no las pinta
  const migas = migasDe(cuerpo, route) || (crumbs ? [["Inicio", C.url], ...crumbs.map(([n, r]) => [n, C.url + r])] : null);
  const ogTitle = full.endsWith(` | ${C.name}`) ? title : full;
  const verif = route === "" ? `${C.googleSiteVerification ? `\n<meta name="google-site-verification" content="${esc(C.googleSiteVerification)}">` : ""}${C.bingSiteVerification ? `\n<meta name="msvalidate.01" content="${esc(C.bingSiteVerification)}">` : ""}` : "";
  const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(full)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${url}">${noindex ? '\n<meta name="robots" content="noindex">' : ""}${verif}
<meta property="og:type" content="website">
<meta property="og:site_name" content="${esc(C.name)}">
<meta property="og:title" content="${esc(ogTitle)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${url}">
<meta property="og:locale" content="es_ES">${OG_IMG ? `
<meta property="og:image" content="${C.url}assets/og-testley.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${esc(C.name)}: test de leyes para oposiciones con la cita del BOE en cada respuesta">` : ""}
<meta name="twitter:card" content="${OG_IMG ? "summary_large_image" : "summary"}">
<meta name="twitter:title" content="${esc(ogTitle)}">
<meta name="twitter:description" content="${esc(description)}">${OG_IMG ? `
<meta name="twitter:image" content="${C.url}assets/og-testley.png">` : ""}
<meta name="theme-color" content="#1d4ed8" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#0b1020" media="(prefers-color-scheme: dark)">
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect x='10' y='10' width='80' height='80' rx='18' fill='%231d4ed8'/><path d='M30 52l14 14 26-30' stroke='white' stroke-width='10' fill='none'/></svg>">
<link rel="stylesheet" href="${root}assets/style.css">
<script>window.TL_CONFIG=${JSON.stringify({ root, supabaseUrl: C.supabaseUrl || "", supabaseAnonKey: C.supabaseAnonKey || "", lsStoreId: C.lsStoreId || "", lsProductId: C.lsProductId || "", pase: !!C.checkoutUrl, opos: OPOS.map((o) => o.id), tutorUrl: C.tutorUrl || "", planes: C.planes || null, bancoPrivado: BANCO_PRIVADO, flags: FLAGS, experimentos: EXP_ACTIVOS })};</script>
<script src="${root}assets/store.js"></script>
<script src="${root}assets/eventos.js" defer></script>${C.tutorUrl ? `\n<script src="${root}assets/tutor.js" defer></script>` : ""}
${schema ? ldJson(schema) : ""}${migas ? ldJson({ "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: migas.map(([name, item], i) => ({ "@type": "ListItem", position: i + 1, name, item })) }) : ""}
</head>
<body>
<a class="skip" href="#main">Saltar al contenido</a>
<header class="top"><div class="wrap">
<a class="brand" href="${root}"><span class="logo" aria-hidden="true">§</span>${C.name}</a>
<nav class="mainnav" aria-label="Principal">${[["oposiciones/", "Oposiciones"], ["convocatorias/", "Convocatorias"], ["leyes/", "Leyes"], ["panel/", "Mi panel"], ["precios/", "Precios"]].map(([u, t]) => `<a href="${root}${u}"${route.startsWith(u) || (u === "leyes/" && LEYES.some((L) => route.startsWith(L.slug + "/"))) ? ' class="activo" aria-current="page"' : ""}>${t}</a>`).join("")}<span id="cuenta-nav"></span></nav>
</div></header>
<main id="main" tabindex="-1" class="wrap${wide ? " wide" : ""}">
${cuerpo}
</main>
<footer class="foot"><div class="wrap foot-grid">
<div><p class="brand"><span class="logo" aria-hidden="true">§</span>${C.name}</p><p>${C.tagline}</p><p class="small">Fuente de los textos: Boletín Oficial del Estado, legislación consolidada. TestLey no está vinculado a ninguna Administración Pública.</p></div>
<div><p><b>Prepárate</b></p><p><a href="${root}oposiciones/">Oposiciones</a><br><a href="${root}convocatorias/">Convocatorias oficiales</a><br><a href="${root}leyes/">Leyes con test</a><br><a href="${root}${LEY.slug}/">Test gratis de la Ley 39/2015</a></p></div>
<div><p><b>Tu estudio</b></p><p><a href="${root}panel/">Mi panel</a><br><a href="${root}errores/">Mis errores</a><br><a href="${root}ranking/">Ranking</a><br><a href="${root}precios/">Precios y Pase Opositor</a><br><a href="${root}faq/">Preguntas frecuentes</a></p></div>
<div><p><b>Legal</b></p><p><a href="${root}legal/aviso-legal/">Aviso legal</a><br><a href="${root}legal/privacidad/">Privacidad</a><br><a href="${root}legal/condiciones/">Condiciones</a><br><a href="mailto:globalprsx@gmail.com">Contacto</a>${FLAGS.analytics ? `<br><a href="#" id="revocar-analitica">Desactivar analítica</a>` : ""}</p></div>
</div></footer>
${scripts.map((s) => `<script src="${root}assets/${s}" defer></script>`).join("\n")}
</body>
</html>
`;
  return html;
}

// ---------- Catálogo de oposiciones ----------
const OPOS = JSON.parse(fs.readFileSync("catalogo/oposiciones.json", "utf8"));
// Exámenes oficiales anteriores (procedencia OFFICIAL_EXAM; datos/examens-oficials/<oposición>.json): se practican tal cual se publicaron
for (const o of OPOS) {
  const f = `datos/examens-oficials/${o.id}.json`;
  o.examenes = fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, "utf8")).examenes.map((e) => ({ ...e, preguntes: e.preguntes.filter((q) => q.verification_status !== "DEPRECATED") })) : [];
}
// Simulacro desde el perfil (SimulationEngine): reparto por tema según el peso real de cada tema en los exámenes oficiales
// (catalogo/perfiles/<id>.json → examen.simulacro.distribucion), restos mayores; sin repeticiones recientes si el perfil lo indica.
for (const o of OPOS) {
  const f = `catalogo/perfiles/${o.id}.json`, sim = (o.examen || {}).simulacro;
  if (!sim || sim.reparto || !fs.existsSync(f)) continue;
  const ps = JSON.parse(fs.readFileSync(f, "utf8")).examen.simulacro || {};
  if (ps.evitar_repetidas) sim.evitar_repetidas = true;
  const pesos = ps.distribucion || {}, idx = Object.fromEntries(o.temario.map((t, i) => [t.codigo || String(t.tema), i]));
  const ks = Object.keys(pesos).filter((k) => k in idx);
  if (!ks.length) continue;
  const exacto = ks.map((k) => sim.preguntas * pesos[k]), base = exacto.map(Math.floor);
  let resto = sim.preguntas - base.reduce((a, b) => a + b, 0);
  exacto.map((x, j) => [x - base[j], j]).sort((a, b) => b[0] - a[0] || a[1] - b[1]).forEach(([, j]) => { if (resto > 0) { base[j]++; resto--; } });
  sim.reparto = ks.map((k, j) => ({ temas: [idx[k]], preguntas: base[j] })).filter((r) => r.preguntas > 0);
  sim.reparto_origen = ps.distribucion_origen;
}
const rutaTema = (o, i) => `oposiciones/${o.id}/tema-${i + 1}/`;
// «Tema N» (con la letra del bloque delante si el número se repite en varios bloques)
const nombreTema = (o, i) => { const t = o.temario[i]; if (t.codigo) return `Tema ${t.codigo}`; return (o.temario.filter((x) => x.tema === t.tema).length > 1 ? `${t.bloque.split(/[.)]/)[0]} · ` : "") + `Tema ${t.tema}`; };
const AMB = fs.existsSync("catalogo/temas_ambito.json") ? JSON.parse(fs.readFileSync("catalogo/temas_ambito.json", "utf8")) : {};
const NORMAS = Object.fromEntries(JSON.parse(fs.readFileSync("catalogo/normas.json", "utf8")).map((n) => [n.id, n]));
// Leyes con test publicado: id BOE -> datos
const PUB = Object.fromEntries(PUBLICADAS.map((L) => [L.id, L]));
const AMBITO = { estatal: "Administración del Estado", seguridad: "Policía y seguridad", autonomico: "Comunidades autónomas", local: "Administración local", justicia: "Justicia", otros: "Otras" };
const fmtN = (n) => Number(n).toLocaleString("es-ES", { useGrouping: "always" });
for (const o of OPOS) {
  const ids = [...new Set(o.temario.flatMap((t) => t.normas).concat((o.preparacion || {}).normas || []))];
  const pub = ids.filter((id) => PUB[id]);
  o.qs = [];
  o.arts = {};
  o.leyes = {};
  for (const id of pub) {
    const L = PUB[id];
    o.leyes[L.slug] = L.corto;
    for (const a of L.arts) o.arts[`${L.slug}:${a.n}`] = { t: a.titulo, b: L.corto };
    for (const q of L.qs) o.qs.push({ ...PUBLICO(q), ley: L.slug, art: `${L.slug}:${q.art}`, artn: q.art });
  }
  // Pertenencia de cada pregunta a los temas: su ley + (si la ley se reparte entre varios temas) los títulos/capítulos del tema
  o.temaInfo = o.temario.map((t, i) => {
    const leyes = t.normas.filter((id) => PUB[id]).map((id) => PUB[id].slug);
    const ambito = {};
    for (const sl of leyes) { const a = AMB[`${o.id}#${i}#${sl}`]; ambito[sl] = a ? { estado: a.estado, unidades: a.unidades, arts: a.estado === "precisado" ? new Set(a.articulos) : null } : { estado: "ley_completa", unidades: [], arts: null }; }
    return { leyes, ambito, nq: 0 };
  });
  for (const q of o.qs) {
    const tm = [];
    o.temaInfo.forEach((ti, i) => { if (ti.leyes.includes(q.ley) && (!ti.ambito[q.ley].arts || ti.ambito[q.ley].arts.has(q.artn))) tm.push(i); });
    if (tm.length) { q.tm = tm; tm.forEach((i) => o.temaInfo[i].nq++); }
  }
  // solo_ambito (catálogo): las preguntas de una ley fuera del ámbito de todos los temas no entran en los tests de la oposición
  // (Mossos: de la Constitución solo lo que corresponde a B.3; de la LO 2/1986 solo el art. 5)
  if (o.solo_ambito) o.qs = o.qs.filter((q) => q.tm);
  o.temasCubiertos = o.temario.filter((t, i) => t.tipo !== "no_legislativo" && o.temaInfo[i].nq > 0).length;
  o.pctCob = o.temario.length ? Math.round((100 * o.temasCubiertos) / Math.max(1, o.cobertura.temas_legislativos)) : null;
}
const fraccionTxt = (p) => (Math.abs(p - 1 / 3) < 1e-6 ? "1/3" : Math.abs(p - 0.5) < 1e-6 ? "1/2" : Math.abs(p - 0.25) < 1e-6 ? "1/4" : String(Math.round(p * 100) / 100).replace(".", ","));
const opEstado = (c) => ({ activa: "Activa", proxima: "Próxima", cerrada: "Cerrada", historica: "Histórica", por_verificar: "Plazo por verificar" })[c.estado] || c.estado;
const TEMARIO_TIPO = { oficial_publicado: ["Temario oficial publicado", "badge-oficial"], derivado_bases: ["Temario derivado de las bases", "badge-testley"], preparacion: ["Contenido de preparación", "badge-testley"], pendiente: ["Temario pendiente de verificación oficial", "badge-ia"] };
const CATEGORIAS = JSON.parse(fs.readFileSync("catalogo/categorias.json", "utf8"));
const CAT = Object.fromEntries(CATEGORIAS.map((c) => [c.id, c]));
const fmtFecha = (f) => (f ? f.split("-").reverse().join("/") : "");
const sinAcentos = (t) => String(t).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const pctOp = (o) => Math.round((100 * o.temasCubiertos) / Math.max(1, o.cobertura.temas_legislativos));
// Nombres cortos para títulos (como se buscan); el nombre oficial completo sigue en el h1 y en el cuerpo
const OP_CORTO = { "mossos-esquadra": "Mossos d'Esquadra", "guardia-civil-cabos-guardias": "Guardia Civil Cabos y Guardias", "policia-nacional-escala-basica": "Policía Nacional Escala Básica", "policia-nacional-escala-ejecutiva": "Policía Nacional Escala Ejecutiva", "age-administrativo-c1": "Administrativo del Estado", "age-auxiliar-administrativo-c2": "Auxiliar Administrativo del Estado", "age-gestion-a2": "Gestión Civil del Estado" };
const opCorto = (o) => OP_CORTO[o.id] || o.nombre.replace(/\s*\([^)]*\)/g, "").replace(/^Cuerpo (General )?/, "").replace(/,/g, "");
// Llamada a la acción y «seguir» de la ficha: «Preparar Mossos», «Seguir Mossos d'Esquadra 46/26» (convocatoria del perfil)
const ctaOp = (o) => `Preparar ${o.id === "mossos-esquadra" ? "Mossos" : opCorto(o)}`;
const seguirOp = (o) => { const f = `catalogo/perfiles/${o.id}.json`; return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, "utf8")).convocatoria.actual.seguir : opCorto(o); };
// Año de la convocatoria: el de su fecha oficial de publicación (si no consta, no se pone)
const anioOp = (o) => ((o.convocatoria || {}).fecha_publicacion || "").slice(0, 4);
// Referencia corta de una ley para títulos: «RDL 8/2015» en vez de «Ley General de la Seguridad Social (RDL 8/2015)»
const refLey = (L) => {
  if (L.corto.length <= 28) return L.corto;
  const m = L.corto.match(/\(([^)]*\d[^)]*)\)$/) || L.corto.match(/\b((?:Ley Orgánica|Ley|LO|RDL|RD|Real Decreto(?: Legislativo)?) \d+\/\d{4})/);
  return m ? m[1].replace(/^Ley Orgánica /, "LO ") : L.corto;
};

// Filtros del buscador: nivel de administración, estado de la convocatoria y nivel de estudios (a partir del grupo oficial)
const ADMIN = { estatal: "Estado", autonomica: "Comunidades autónomas", local: "Administración local", universidades: "Universidades", varias: "Varias" };
const NIVEL = { A1: "Grado universitario", A2: "Grado universitario", B: "Técnico Superior", C1: "Bachiller o Técnico", C2: "ESO o equivalente", E: "Sin titulación específica", AP: "Sin titulación específica" };
const nivelDe = (g) => NIVEL[String(g || "").toUpperCase().replace(/^SUBGRUPO\s*/, "")] || "";
const admOp = (o) => ({ estatal: "estatal", seguridad: "estatal", autonomico: "autonomica", local: "local" })[o.ambito] || (CAT[o.categoria] || {}).administracion || "estatal";
const ESTADO_TXT = { activa: "Activa", proxima: "Próxima", cerrada: "Cerrada", historica: "Histórica", por_verificar: "Plazo por verificar" };
const filtrosHtml = (conEstudios, cats) => `<div class="filtros" role="group" aria-label="Filtros">
${cats ? `<label>Categoría<select class="select filtro" data-f="cat"><option value="">Todas</option>${cats.map(([id, nombre, n]) => `<option value="${id}">${esc(nombre)} (${fmtN(n)})</option>`).join("")}</select></label>` : ""}
<label>Administración<select class="select filtro" data-f="adm"><option value="">Todas</option>${Object.entries(ADMIN).filter(([k]) => k !== "varias").map(([k, v]) => `<option value="${k}">${v}</option>`).join("")}</select></label>
<label>Estado<select class="select filtro" data-f="est"><option value="">Todos</option>${Object.entries(ESTADO_TXT).map(([k, v]) => `<option value="${k}">${v}</option>`).join("")}</select></label>
${conEstudios ? `<label>Nivel de estudios<select class="select filtro" data-f="niv"><option value="">Todos</option>${[...new Set(Object.values(NIVEL))].map((v) => `<option value="${esc(v)}">${esc(v)}</option>`).join("")}</select></label>` : ""}
</div>`;
const tarjetaOp = (o, r) => `<a class="card op-card" href="${r}oposiciones/${o.id}/" data-cat="${o.categoria}" data-adm="${admOp(o)}" data-est="${o.estado}" data-niv="${esc(nivelDe(o.grupo))}" data-q="${esc(sinAcentos([o.nombre, o.organismo, o.categoria_nombre, o.grupo, o.territorio].join(" ")))}"><span class="tag">${esc(o.categoria_nombre)}${o.grupo ? ` · ${esc(o.grupo)}` : ""} · ${esc(opEstado(o.convocatoria))}</span><strong>${esc(o.nombre)}</strong><span class="muted small">${esc(o.organismo)}</span><span>${o.convocatoria.plazas ? fmtN(o.convocatoria.plazas) + " plazas · " : ""}${o.temario.length ? `Temario: ${o.temario.length} temas` : "Temario pendiente de verificación oficial"} · ${fmtN(o.qs.length)} preguntas</span>${o.temario.length ? `<span class="cov-lbl">${o.temasCubiertos} de ${o.cobertura.temas_legislativos} temas de legislación con test</span><span class="covbar" aria-hidden="true"><i style="width:${Math.max(2, o.pctCob)}%"></i></span>` : ""}<span class="card-foot">Fuente oficial: ${esc(o.convocatoria.url_oficial.includes("boe.es") ? "BOE" : "web oficial")} · verificado ${fmtFecha(o.actualizado)}</span></a>`;

const catCount = (id) => OPOS.filter((o) => o.categoria === id).length;
const chipsCat = (r, activa) => `<div class="cat-chips">${CATEGORIAS.map((c) => `<a class="cat-chip${activa === c.id ? " on" : ""}${catCount(c.id) || catCountConv(c.id) ? "" : " empty"}" href="${r}oposiciones/categoria/${c.id}/" data-cat="${c.id}">${esc(c.nombre)} <b>${catCount(c.id) || (catCountConv(c.id) ? "" : "·")}</b></a>`).join("")}</div>`;
const buscador = (r) => `<form class="buscador" action="${r}oposiciones/" role="search"><label class="sr" for="q">Buscar oposición</label><input id="q" name="q" type="search" placeholder="Policía, auxiliar administrativo, gestión…" autocomplete="off"><button class="cta" type="submit">Buscar</button></form>`;
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
// + cambios detectados en convocatorias automáticas seguidas por usuarios (ingesta/extraer.py → catalogo/novedades-convocatorias.json)
// Boletín de la convocatoria y descripción de la fuente que cita cada respuesta (BOE por defecto; DOGC y guía oficial en Mossos)
const boletin = (o) => ((o.fuentes.convocatoria || {}).tipo === "DOGC" ? "DOGC" : "BOE");
const citaOficial = (o) => (boletin(o) === "BOE" ? "el artículo del BOE" : "el texto oficial (DOGC, guia d'estudi o llei)");
const NOVEDADES = ["catalogo/novedades.json", "catalogo/novedades-convocatorias.json"].flatMap((f) => (fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, "utf8")) : []));
fs.writeFileSync(path.join(OUT_TMP, "datos", "novedades.json"), JSON.stringify(NOVEDADES));
const TIPO_NOV = { convocatoria: "Convocatoria", listas: "Listas de admitidos", aprobados: "Aprobados", fecha_examen: "Fecha de examen", modificacion: "Modificación", correccion: "Corrección de errores", nombramiento: "Nombramientos", otro: "Otra publicación" };
const novedadesHtml = (o) => {
  const L = NOVEDADES.filter((n) => n.oposicion === o.id);
  if (!L.length) return "";
  const fila = (n) => `<li><span class="nov-f">${fmtFecha(n.fecha)}</span> <span class="chip${n.relevancia === "convocatoria" ? " ok" : ""}">${TIPO_NOV[n.tipo] || n.tipo}</span> <a href="${esc(n.url)}" rel="noopener">${esc(n.titulo)}</a> <span class="muted small">(${esc(n.id)})</span></li>`;
  const mia = L.filter((n) => n.relevancia === "convocatoria"), otras = L.filter((n) => n.relevancia !== "convocatoria");
  return `<section class="card"><div class="of-head"><h2>Novedades oficiales${o.vigilancia && o.vigilancia.web ? "" : " en el BOE"}</h2><span class="badge-oficial">Fuente oficial</span></div>
${mia.length ? `<h3>De esta convocatoria</h3><ul class="nov">${mia.map(fila).join("")}</ul>` : ""}
${otras.length ? `<details><summary>Otras publicaciones del mismo cuerpo (${otras.length})</summary><ul class="nov">${otras.map(fila).join("")}</ul></details>` : ""}
<p class="muted small">${o.vigilancia && o.vigilancia.web ? `Revisamos cada día la web oficial (<a href="${esc(o.vigilancia.web.convocatoria)}" rel="noopener">mossos.gencat.cat</a>), que enlaza las resoluciones del DOGC.` : "Revisamos el sumario del BOE cada día."} El tipo (listas, modificación…) se deduce automáticamente del título oficial; abre el enlace para ver el texto completo.${L.some((n) => n.verification_status === "OFFICIAL_PENDING_REVIEW") ? " Las marcadas como pendientes de revisión aún no se han contrastado." : ""}</p></section>`;
};

// ---------- Catálogo nacional de convocatorias (motor de ingesta: ingesta/ → catalogo/convocatorias/) ----------
const CONVS = fs.existsSync("catalogo/convocatorias") ? fs.readdirSync("catalogo/convocatorias").filter((f) => f.endsWith(".json")).map((f) => JSON.parse(fs.readFileSync(path.join("catalogo/convocatorias", f), "utf8"))) : [];
CONVS.sort((a, b) => (b.fuente.published_at || "").localeCompare(a.fuente.published_at || ""));
// Estado del plazo calculado en cada build (la ingesta lo guardaba una vez y envejecía). Solo se afirma «Activa» o «Cerrada» cuando
// el plazo citado cuenta desde la publicación en el BOE y la fecha cae fuera del margen de festivos; si no, «Plazo por verificar».
const NUM_ES = { uno: 1, un: 1, cinco: 5, diez: 10, quince: 15, veinte: 20, veintiuno: 21, "veintiún": 21, treinta: 30, cuarenta: 40 };
const diasDesde = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 864e5);
const masDias = (f, n) => new Date(Date.parse(f) + n * 864e5).toISOString().slice(0, 10);
function estadoPlazo(v) {
  const pub = (v.fuente.published_at || "").slice(0, 10), d = v.datos.plazo_solicitudes;
  if (pub && diasDesde(pub, HOY) > 540) return ["historica", "Publicada hace más de 18 meses.", masDias(pub, 541)];
  // fechas de plazo citadas literalmente en la fuente oficial (DOGC/web de la Generalitat): estado exacto, sin estimar festivos
  if (v.application_start && v.application_end && d && d.verification_status === "OFFICIAL_VERIFIED") {
    if (HOY < v.application_start) return ["proxima", `Plazo de solicitudes del ${fmtFecha(v.application_start)} al ${fmtFecha(v.application_end)} (fuente oficial).`, pub];
    if (HOY <= v.application_end) return ["activa", `Plazo de solicitudes abierto hasta el ${fmtFecha(v.application_end)} (fuente oficial).`, v.application_start];
    return ["cerrada", `Plazo de solicitudes cerrado el ${fmtFecha(v.application_end)} (fuente oficial)${v.exam_date && HOY <= v.exam_date ? `; examen el ${fmtFecha(v.exam_date)}` : ""}.`, masDias(v.application_end, 1)];
  }
  const m = d && /(\d+|[a-zúñ]+)\s+d[ií]as\s+(h[aá]biles|naturales)/i.exec(d.valor);
  const n = m && (/^\d+$/.test(m[1]) ? +m[1] : NUM_ES[m[1].toLowerCase()]);
  const desdeBoe = d && /bolet[ií]n oficial del estado|\bBOE\b/i.test(d.cita);
  if (!pub || !n || !desdeBoe) return ["por_verificar", "No podemos calcular el plazo con seguridad: consulta el documento oficial.", pub || HOY];
  const habiles = /h[aá]biles/i.test(m[2]);
  const finMin = habiles ? n + 2 * Math.floor(n / 5) : n, finMax = habiles ? finMin + 7 : n; // hábiles: +fines de semana; +7 días de margen por festivos
  const t = diasDesde(pub, HOY);
  if (t <= finMin) return ["activa", `Plazo de ${d.valor} desde la publicación en el BOE (${fmtFecha(pub)}): abierto según el cálculo de hoy.`, pub];
  if (t > finMax) return ["cerrada", `Plazo de ${d.valor} desde la publicación en el BOE (${fmtFecha(pub)}): ya ha terminado.`, masDias(pub, finMax + 1)];
  return ["por_verificar", `Plazo de ${d.valor} desde el ${fmtFecha(pub)}: puede haber terminado según los festivos aplicables; consulta el documento oficial.`, masDias(pub, finMin + 1)];
}
for (const v of CONVS) [v.estado, v.estado_nota, v.estado_desde] = estadoPlazo(v); // estado_desde: último cambio real (lastmod del sitemap)
const convNombre = (v) => {
  const d = v.datos.denominacion && v.datos.denominacion.valor;
  return d ? `${d.charAt(0).toUpperCase()}${d.slice(1)}${v.organismo ? " · " + v.organismo : ""}` : v.titulo.replace(/^Resolución de [^,]+, /, "").slice(0, 140);
};
const tarjetaConv = (v, r) => `<a class="card op-card conv-card" href="${r}convocatorias/${v.id}/" data-cat="${v.categoria}" data-adm="${v.administracion || ""}" data-est="${v.estado}" data-niv="${esc(nivelDe((v.datos.grupo || {}).valor))}" data-q="${esc(sinAcentos([v.titulo, v.organismo, v.territorio, (v.datos.denominacion || {}).valor || "", CAT[v.categoria] ? CAT[v.categoria].nombre : ""].join(" ")))}"><span class="tag">${CAT[v.categoria] ? esc(CAT[v.categoria].nombre) : ""} · ${fmtFecha(v.fuente.published_at)}${v.datos.plazas ? ` · ${fmtN(v.datos.plazas.valor)} plaza${v.datos.plazas.valor > 1 ? "s" : ""}` : ""}</span><strong>${esc(convNombre(v))}</strong><span>${esc(v.territorio || "")}</span></a>`;
const anioConv = (v) => (v.fuente.published_at || "").slice(0, 4);
// Qué se convoca: la denominación extraída o, si no la hay, el objeto del título oficial («…, por la que se convoca X» → «X»)
const convDenom = (v) => {
  const d = v.datos.denominacion && v.datos.denominacion.valor;
  const m = v.titulo.match(/,\s*(?:por (?:la|el) que se |referente a (?:la )?)(.*)$/);
  let t = (d || (m ? m[1].replace(/^convocan? /, "") : v.titulo.replace(/^Resolución de [^,]+, /, ""))).replace(/\s+/g, " ").trim().replace(/\.$/, "");
  const cuerpo = !d && /selectiv/.test(t) && t.match(/\b((?:Escala|Subescala|Cuerpo|Categoría|categoría) [^,.;]*)/);
  if (cuerpo) t = cuerpo[1];
  return t.charAt(0).toUpperCase() + t.slice(1);
};
const convSufijo = (v, extra) => `${v.organismo ? ` · ${cortar(v.organismo, 34)}` : ""}${extra}`;
const minus1 = (t) => String(t).charAt(0).toLowerCase() + String(t).slice(1);
const descConv = (v) => {
  const pl = v.datos.plazas && v.datos.plazas.valor, org = v.organismo || "", ter = v.territorio || "";
  return descripcion(
    `${convDenom(v)}${pl ? `: ${fmtN(pl)} plaza${pl > 1 ? "s" : ""}` : ""}${org ? ` en ${org}` : ""}${ter && !org.includes(ter) ? ` (${ter})` : ""}.`,
    v.fuente.tipo === "BOE" && v.fuente.boe_id ? `Publicada en el BOE el ${fmtFecha(v.fuente.published_at)} (${v.fuente.boe_id}).` : `Publicada el ${fmtFecha(v.fuente.published_at)} en ${v.fuente.source_domain}.`,
    v.datos.sistema_selectivo ? `Sistema selectivo: ${minus1(v.datos.sistema_selectivo.valor)}.` : "",
    v.datos.grupo ? `Grupo ${v.datos.grupo.valor}.` : "",
    "Plazos y enlace a la fuente oficial.");
};
const catCountConv = (id) => CONVS.filter((v) => v.categoria === id).length;
const ETIQ_CONV = { denominacion: "Plaza", plazas: "Plazas", grupo: "Grupo/subgrupo", sistema_selectivo: "Sistema selectivo", plazo_solicitudes: "Plazo de solicitudes", fecha_examen: "Fecha del examen", titulacion: "Titulación", pruebas: "Pruebas", temario: "Temario", boletin_bases: "Bases", organismo: "Organismo", territorio: "Territorio" };

// ---------- Portada ----------
const NART = PUBLICADAS.reduce((t, L) => t + L.arts.length, 0), NQ = PUBLICADAS.reduce((t, L) => t + L.qs.length, 0);
const PL = C.planes || {};
const planLista = (p) => [
  p.tests_completos ? "Todos los tests de todas las leyes y oposiciones" : `Test completo de ${(p.leyes_completas || []).map((s) => (LEYES.find((L) => L.slug === s) || {}).corto || s).join(", ")} y ${p.preguntas_muestra} preguntas de muestra del resto`,
  "Catálogo de oposiciones y convocatorias oficiales",
  p.historial_simulacros ? "Simulacros como el examen real con historial y análisis" : "Simulacros: solo con el Pase",
  p.plan_estudio ? "Plan de estudio adaptativo" : "Plan de estudio: solo con el Pase",
  p.alertas ? "Avisos de las convocatorias que sigues" : "Avisos: solo con el Pase",
  ...(C.tutorUrl ? [p.tutor ? "Tutor IA basado en el texto oficial" : "Tutor IA: solo con el Pase"] : []),
];
const FAQ_GENERAL = [
  ["¿De dónde salen los datos de las oposiciones?", "De fuentes oficiales: el BOE y los portales oficiales de cada organismo. Cada dato (plazas, requisitos, plazos) muestra la frase literal del documento oficial, su enlace y la fecha en que lo comprobamos."],
  ["¿Qué diferencia hay entre «oficial», «pendiente de revisión» y «generado por IA»?", "«Oficial · verificado» es un dato oficial revisado por nosotros. «Pendiente de revisión» es un dato oficial extraído automáticamente cuya frase aparece tal cual en el documento, pero que aún no ha revisado una persona. Lo que redacta una IA se marca siempre como «Generado por IA» y nunca se presenta como oficial."],
  ["¿De dónde salen las preguntas de los tests?", "Las redactamos a partir del texto consolidado de cada ley publicado por el BOE. Cada pregunta guarda la cita literal que la justifica y un programa comprueba que esa cita existe palabra por palabra en el artículo vigente. Si la ley cambia y la cita deja de coincidir, la pregunta se retira automáticamente."],
  ["¿Necesito registrarme?", `No. Puedes buscar oposiciones y practicar sin cuenta; tu progreso se guarda en tu navegador. ${C.supabaseUrl ? "Con una cuenta gratis se guarda en la nube y puedes seguir convocatorias." : ""}`],
  ["¿Qué es la nota orientativa?", "Una estimación de la nota que sacarías hoy, calculada con tu historial y la penalización por error de tu examen. Es orientativa: no sustituye a un examen oficial."],
  ["¿Cuánto cuesta?", PL.premium ? `Buscar oposiciones, consultar convocatorias y practicar con las preguntas de muestra es gratis. El ${PL.premium.nombre} cuesta ${PL.premium.precio}${PL.premium.prueba_dias ? ` con ${PL.premium.prueba_dias} días de prueba gratis` : ""} y se cancela cuando quieras.` : "Buscar oposiciones y practicar es gratis."],
];
const faqHtml = (items) => `<section class="faq" id="faq"><h2>Preguntas frecuentes</h2>${items.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join("")}</section>`;
const faqSchema = (items) => ({ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: items.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) });
page("", {
  title: `${C.name}: oposiciones ${ANIO}, convocatorias y test de leyes del BOE`,
  description: descripcion(`Encuentra tu oposición entre ${fmtN(CONVS.length)} convocatorias oficiales y practica con ${fmtN(NQ)} preguntas tipo test que citan el artículo del BOE.`, "Simulacros como el examen real."),
  wide: true,
  schema: [
    { "@context": "https://schema.org", "@type": "Organization", "@id": C.url + "#organizacion", name: C.name, url: C.url, description: C.tagline, ...(LOGO_IMG ? { logo: C.url + "assets/logo-testley.png" } : {}) },
    { "@context": "https://schema.org", "@type": "WebSite", "@id": C.url + "#web", name: C.name, url: C.url, inLanguage: "es", publisher: { "@id": C.url + "#organizacion" }, potentialAction: { "@type": "SearchAction", target: { "@type": "EntryPoint", urlTemplate: `${C.url}oposiciones/?q={search_term_string}` }, "query-input": "required name=search_term_string" } },
    faqSchema(FAQ_GENERAL),
  ],
  body: (r) => `
<section class="portada">
  <div class="portada-texto">
    <h1>Prepara tu oposición con la ley tal como la publica el BOE</h1>
    <p class="lead">Convocatorias oficiales, temario por temas y tests en los que cada respuesta cita el artículo vigente. Sin apuntes de terceros y sin datos sin fuente.</p>
    ${buscador(r)}
    <p class="portada-nota">Gratis para empezar y sin publicidad. <a href="#como">Cómo funciona</a></p>
  </div>
  <figure class="prueba" aria-label="Ejemplo de pregunta de TestLey">
    <figcaption>Así se corrige una pregunta en TestLey</figcaption>
    <div class="prueba-hoja" aria-hidden="true">
      <p class="prueba-meta">Ley 39/2015, artículo 122</p>
      <p class="q">El plazo para interponer el recurso de alzada contra un acto expreso es de:</p>
      <div class="opt ok"><span class="letter">a</span>Un mes</div>
      <div class="opt"><span class="letter">b</span>Dos meses</div>
      <div class="opt"><span class="letter">c</span>Tres meses</div>
      <blockquote class="cita"><span class="src">Texto del artículo 122.1</span>«El plazo para la interposición del recurso de alzada será de un mes, si el acto fuera expreso.»</blockquote>
      <p class="sello"><span class="sello-marca">§</span>Cita comprobada contra el texto consolidado del BOE</p>
    </div>
  </figure>
</section>

<dl class="cifras">
  <div><dt>Convocatorias oficiales leídas</dt><dd>${fmtN(CONVS.length)}</dd></div>
  <div><dt>Preguntas con su cita legal</dt><dd>${fmtN(NQ)}</dd></div>
  <div><dt>Artículos con su texto oficial</dt><dd>${fmtN(NART)}</dd></div>
  <div><dt>Actualizado</dt><dd>${fmtFecha(C.updated)}</dd></div>
</dl>

<section class="como" id="como">
  <h2>Cómo se prepara una oposición en TestLey</h2>
  <ol class="pasos">
    <li><h3>Encuentra tu oposición</h3><p>Busca por cuerpo, organismo o provincia. Cada convocatoria enlaza a su boletín oficial y cada dato muestra la frase de la que sale.</p></li>
    <li><h3>Configura tu plan</h3><p>Indica tu fecha de examen, las horas que tienes y tu nivel. El plan reparte el temario en sesiones diarias y se recalcula con cada test.</p></li>
    <li><h3>Estudia y practica por temas</h3><p>Lee el artículo oficial y responde preguntas de ese tema. Si fallas, ves la cita exacta y la pregunta vuelve en tu repaso.</p></li>
    <li><h3>Mide tu nivel con simulacros</h3><p>Mismo número de preguntas, tiempo y penalización que tu examen. Compara cada simulacro con el anterior.</p></li>
  </ol>
  <p><a class="cta" href="${r}oposiciones/">Buscar mi oposición</a>${C.supabaseUrl ? ` <a class="cta alt" href="${r}cuenta/">Crear cuenta gratis</a>` : ""}</p>
</section>

<section>
  <h2>Oposiciones con más plazas</h2>
  <div class="cards">${OPOS.slice(0, 6).map((o) => tarjetaOp(o, r)).join("")}</div>
  <h3 class="cat-titulo">Todas las categorías</h3>
  <ul class="cat-lista">${CATEGORIAS.map((c) => { const n = catCount(c.id), nc = catCountConv(c.id); return `<li${n || nc ? "" : ' class="vacia"'}><a href="${r}oposiciones/categoria/${c.id}/">${esc(c.nombre)}</a><span>${n ? `${n} con tests` : nc ? `${fmtN(nc)} convocatorias` : "En preparación"}</span></li>`; }).join("")}</ul>
</section>

<section class="incluye">
  <h2>Qué incluye</h2>
  <dl class="incluye-lista">
    <div><dt>Tests con la respuesta citada</dt><dd>Cada corrección muestra la frase exacta del artículo. Un validador comprueba cada cita contra el texto vigente y retira las que dejan de serlo.</dd></div>
    <div><dt>Simulacros como el examen</dt><dd>Preguntas, tiempo, opciones y penalización de tu convocatoria, con análisis de errores.</dd></div>
    <div><dt>Plan de estudio</dt><dd>Tu sesión de cada día según tu fecha de examen, tus horas, tus días libres y tus fallos.</dd></div>
    <div><dt>Mis errores y repaso</dt><dd>Las preguntas falladas vuelven con repetición espaciada hasta que las dominas.</dd></div>
    <div><dt>Avisos de tu convocatoria</dt><dd>Nuevas publicaciones oficiales de la oposición que sigues: listas, fechas y modificaciones.</dd></div>
    <div><dt>Tutor IA${C.tutorUrl ? "" : " (próximamente)"}</dt><dd>Explica preguntas a partir del texto oficial. Lo que redacta la IA se marca como tal.</dd></div>
  </dl>
</section>

${PL.premium ? `<section class="premium-cta card">
  <div><h2>${esc(PL.premium.nombre)}</h2><p class="price">${esc(PL.premium.precio)}${PL.premium.prueba_dias ? ` <span class="muted small">· ${PL.premium.prueba_dias} días de prueba gratis</span>` : ""}</p>
  <ul class="check">${planLista(PL.premium).map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>
  <p><a class="cta" href="${r}precios/">Ver planes</a></p>
</section>` : ""}

${faqHtml(FAQ_GENERAL)}

<section class="final-cta">
  <h2>Busca tu oposición</h2>
  ${buscador(r)}
  <p class="muted small">También puedes consultar las <a href="${r}leyes/">${PUBLICADAS_WEB.length} leyes con test</a> o empezar con el <a href="${r}${LEY.slug}/">test gratis de la Ley 39/2015</a>.</p>
</section>`,
});

// Índice de leyes (antes listado en la portada)
page("leyes/", {
  title: "Leyes con test para oposiciones (texto oficial del BOE)", wide: true, lastmod: PUBLICADAS_WEB.map((L) => L.lastmod).filter(Boolean).sort().pop(),
  description: `${PUBLICADAS_WEB.length} leyes con test y su texto consolidado del BOE artículo por artículo: ${fmtN(NQ)} preguntas con la respuesta citada.`,
  body: (r) => `<nav class="crumbs"><a href="${r}">Inicio</a> › <span>Leyes</span></nav>
<h1>Leyes con test para oposiciones</h1>
<p class="lead">Cada ley con su texto consolidado del BOE, una página por artículo y preguntas cuya respuesta cita el artículo.</p>
<div class="cards">${PUBLICADAS_WEB.map((L) => `<a class="card" href="${r}${L.slug}/"><span class="tag">${fmtN(L.qs.length)} preguntas</span><strong>${esc(L.corto)}</strong><span>${fmtN(L.arts.length)} artículos · ${esc(L.id)}</span></a>`).join("")}</div>
${LEYES.filter((L) => !L.qs.length).length ? `<h2>En preparación</h2><ul>${LEYES.filter((L) => !L.qs.length).map((L) => `<li>${esc(L.nombre)}</li>`).join("")}</ul>` : ""}`,
});

// ---------- Panel, ranking y cuenta ----------
page("panel/", {
  title: "Mi panel de progreso", description: "Tu progreso en TestLey: nota orientativa, dominio por título, puntos débiles, racha y logros.", noindex: true, wide: true,
  scripts: ["plan.js", "motores.js", "avisos.js", "panel.js"],
  body: () => `<div class="ctx-bar"><label class="muted" for="ctx">Estoy preparando</label><select id="ctx" class="select">${OPOS.map((o) => `<option value="${o.id}">${esc(o.nombre)} (${esc(o.grupo)})</option>`).join("")}${PUBLICADAS.map((L) => `<option value="${L.slug}">Solo ${esc(L.corto)}</option>`).join("")}</select></div><div id="panel" data-ley="${LEY.slug}"><p class="muted">Cargando tu progreso…</p></div>`,
});
page("errores/", {
  title: "Mis errores", description: "Las preguntas que has fallado, para repasarlas.", noindex: true, wide: true, scripts: ["errores.js"],
  body: (r) => `<nav class="crumbs"><a href="${r}">Inicio</a> › <a href="${r}panel/">Mi panel</a> › <span>Mis errores</span></nav><h1>Mis errores</h1>
<div class="ctx-bar"><label class="muted" for="ctx">Oposición o ley</label><select id="ctx" class="select">${OPOS.filter((o) => o.qs.length).map((o) => `<option value="${o.id}">${esc(o.nombre)}</option>`).join("")}${PUBLICADAS.map((L) => `<option value="${L.slug}">Solo ${esc(L.corto)}</option>`).join("")}</select></div>
<div id="errores"><p class="muted">Cargando tus errores…</p></div>`,
});
page("ranking/", {
  title: "Ranking de opositores · Ley 39/2015", description: descripcion("Ranking de TestLey: los opositores con mejor nota orientativa en la Ley 39/2015.", "Hay un ranking por oposición y por ley; para aparecer necesitas una cuenta."),
  scripts: ["ranking.js"],
  body: (r) => `<nav class="crumbs"><a href="${r}">Inicio</a> › <span>Ranking</span></nav><h1>Ranking de opositores</h1><p class="lead">Un ranking por cada oposición y por cada ley. Para aparecer necesitas una cuenta y al menos 20 respuestas.</p><label class="muted" for="ctx">Ranking de</label><select id="ctx" class="select">${OPOS.map((o) => `<option value="${o.id}">${esc(o.nombre)} (${esc(o.grupo)})</option>`).join("")}${PUBLICADAS.map((L) => `<option value="${L.slug}">Solo ${esc(L.corto)}</option>`).join("")}</select><div id="ranking" data-ley="${OPOS[0] ? OPOS[0].id : LEY.slug}"></div>`,
});
page("cuenta/", {
  title: "Entrar o crear cuenta", description: "Crea tu cuenta gratuita en TestLey para guardar tu progreso y entrar en el ranking.", noindex: true,
  scripts: ["cuenta.js"],
  body: () => `<div id="cuenta"></div>`,
});

// ---------- Hub de la ley ----------
for (const L of PUBLICADAS_WEB) {
const bloques = [...new Set(L.arts.map((a) => a.bloque))];
page(`${L.slug}/`, {
  // «Test Constitución Española 2026: 223 preguntas con solución»; sin año si el nombre ya lleva el de la norma («Ley 39/2015»)
  title: (() => { const a = (n) => (/\/(19|20)\d{2}\b/.test(n) ? n : `${n} ${ANIO}`), g = L.slug === LEY.slug ? " gratis" : "", n = L.qs.length;
    return primero(`Test ${a(L.corto)}${g}: ${n} preguntas con solución`, `Test ${a(refLey(L))}${g}: ${n} preguntas con solución`, `Test ${a(refLey(L))}: ${n} preguntas con solución`, `Test ${a(refLey(L))}: ${n} preguntas`, `Test ${refLey(L)} (${n} preguntas)`); })(),
  description: descripcion(`Test de ${L.corto} con ${L.qs.length} preguntas para oposiciones y la cita literal del BOE en cada respuesta.`, `Texto consolidado de sus ${fmtN(L.arts.length)} artículos, uno por página.`, OPOS.some((o) => o.leyes[L.slug]) ? "Forma parte del temario de oposiciones oficiales." : ""),
  scripts: ["test.js"], lastmod: L.lastmod,
  // Sin schema Quiz: las preguntas se cargan por JavaScript y no están en el HTML, así que no se pueden declarar como datos estructurados.
  body: (r) => `
<nav class="crumbs"><a href="${r}">Inicio</a> › <span>${esc(L.corto)}</span></nav>
<h1>Test de ${esc(L.corto)} con solución</h1>
<p class="lead">${esc(L.nombre)}. Responde y verás al momento la cita literal del artículo.</p>
<div id="quiz" class="quiz" data-ley="${L.slug}" data-base="./">Cargando preguntas…</div>
<p class="muted">¿Encuentras un error? Escríbenos a <a href="mailto:globalprsx@gmail.com">globalprsx@gmail.com</a> indicando la pregunta y la revisamos contra el BOE.</p>
${(() => {
  const us = OPOS.filter((o) => o.leyes[L.slug]).map((o) => [o, o.temaInfo.map((ti, i) => [ti, i]).filter(([ti]) => ti.leyes.includes(L.slug)).map(([, i]) => i)]);
  return us.length ? `<section class="card"><h2>Oposiciones con ${esc(L.corto)} en el temario</h2><ul class="of-list">${us.map(([o, ts]) => `<li><span><a href="${r}oposiciones/${o.id}/">${esc(o.nombre)}</a>${ts.length ? `: ${ts.map((i) => `<a href="${r}${rutaTema(o, i)}">${esc(nombreTema(o, i))}</a>`).join(", ")}` : " (contenido de preparación)"}</span></li>`).join("")}</ul><p class="muted small">La asignación de leyes a cada tema la hace TestLey a partir del título oficial del tema: es orientativa.</p></section>` : "";
})()}
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
  const iA = L.arts.indexOf(a), artPrev = L.arts[iA - 1], artNext = L.arts[iA + 1];
  // Temas de oposición cuyo ámbito incluye este artículo (catalogo/temas_ambito.json → o.temaInfo)
  const usos = OPOS.map((o) => [o, o.temaInfo.map((ti, i) => [ti, i]).filter(([ti]) => ti.leyes.includes(L.slug) && (!ti.ambito[L.slug].arts || ti.ambito[L.slug].arts.has(a.n))).map(([, i]) => i)]).filter(([o, ts]) => ts.length || o.leyes[L.slug]);
  const ubic = [a.bloque, a.capitulo].filter(Boolean).join(", ");
  const d1 = cortar(`${L.corto}, artículo ${a.n}${a.titulo ? ` (${a.titulo})` : ""}: texto consolidado del BOE${qs.length ? ` y ${qs.length} pregunta${qs.length > 1 ? "s" : ""} tipo test con solución` : ""}.`, D_MAX, "…");
  page(`${L.slug}/articulo-${a.n}/`, {
    title: a.titulo ? titulo(`Artículo ${a.n} ${refLey(L)}: `, a.titulo) : primero(`Artículo ${a.n} ${L.corto}${qs.length ? " (con test)" : ""}`, `Artículo ${a.n} ${refLey(L)}${qs.length ? " (con test)" : ""}`, `Artículo ${a.n} ${refLey(L)}`),
    tituloAlt: [a.titulo ? titulo(`Art. ${a.n} ${refLey(L)}: `, a.titulo, ubic ? ` (${cortar(ubic, 22)})` : "") : `Artículo ${a.n} ${L.corto}${ubic ? ` (${cortar(ubic, 30)})` : ""}`],
    description: descripcion(d1, [ubic, a.bloque, a.capitulo].filter(Boolean).map((x) => x + ".").find((x) => d1.length + 1 + x.length <= D_MAX), a.titulo ? "" : `Norma: ${L.nombre}.`, usos.some(([, ts]) => ts.length) ? `Relacionado con el temario de ${usos.filter(([, ts]) => ts.length).map(([o]) => opCorto(o)).join(", ")}.` : "", "Con enlace a la fuente oficial.", "Versión vigente."),
    descAlt: [descripcion(`${L.corto}, artículo ${a.n}${a.titulo ? ` (${a.titulo})` : ""}${ubic ? `, ${ubic}` : ""}: texto consolidado del BOE${qs.length ? ` y ${qs.length} preguntas tipo test` : ""}.`, `Artículo ${iA + 1} de ${L.arts.length} de la norma.`)],
    scripts: qs.length ? ["test.js"] : [], lastmod: L.lastmod,
    // Solo se indexan los artículos con test propio: sin él la página es una copia del BOE. Los derogados o sin contenido nunca.
    noindex: !qs.length || a.vigencia === "SIN_VIGENCIA" || /\((derogad|suprimid)[oa]s?\)|sin contenido/i.test(texto.slice(0, 200)),
    schema: qs.length ? { "@context": "https://schema.org", "@type": "LearningResource", name: `Artículo ${a.n} ${L.corto}`, inLanguage: "es", isBasedOn: L.fuente } : undefined,
    body: (r) => `
<nav class="crumbs"><a href="${r}">Inicio</a> › <a href="../">${esc(L.corto)}</a> › <span>Art. ${a.n}</span></nav>
<h1>Artículo ${a.n} · ${esc(L.corto)}${a.titulo ? ". " + esc(a.titulo) : ""}</h1>
<p class="muted">${esc(a.bloque)}${a.capitulo ? " · " + esc(a.capitulo) : ""}</p>
<div class="art-text">${esc(texto)}</div>
${a.vigencia === "SIN_VIGENCIA" ? `<p class="warn small">Sin vigencia desde el ${fmtFecha(a.sin_vigencia_desde)}. ${esc(a.nota_fuente)} <a href="https://www.boe.es/buscar/act.php?id=${esc(a.sin_vigencia_por)}" rel="noopener">${esc(a.sin_vigencia_por)}</a>${a.verificacion === "PENDING_VERIFICATION" ? " · Pendiente de verificación." : ""}</p>` : ""}
${
  qs.length
    ? `<h2>Test del artículo ${a.n}</h2><div id="quiz" class="quiz" data-ley="${L.slug}" data-base="../" data-art="${a.n}">Cargando…</div>`
    : `<p><a class="cta" href="../">Hacer el test de ${esc(L.corto)}</a></p>`
}
${usos.length ? `<section class="card"><h2>Oposiciones y temas con este artículo</h2><ul class="of-list">${usos.map(([o, ts]) => `<li><span><a href="${r}oposiciones/${o.id}/">${esc(o.nombre)}</a>${ts.length ? `: ${ts.map((i) => `<a href="${r}${rutaTema(o, i)}">${esc(nombreTema(o, i))}</a>`).join(", ")}` : ` <span class="muted small">(norma incluida en su preparación; artículo sin tema asignado)</span>`}</span></li>`).join("")}</ul><p class="muted small">La asignación de artículos a cada tema la hace TestLey a partir del título oficial del tema: es orientativa.</p></section>` : ""}
<nav class="paginacion" aria-label="Otros artículos">${artPrev ? `<a class="pag-card" href="../articulo-${artPrev.n}/"><small>Artículo anterior</small><span>Art. ${esc(artPrev.n)}${artPrev.titulo ? ". " + esc(cortar(artPrev.titulo, 70, "…")) : ""}</span></a>` : "<span></span>"}${artNext ? `<a class="pag-card sig" href="../articulo-${artNext.n}/"><small>Artículo siguiente</small><span>Art. ${esc(artNext.n)}${artNext.titulo ? ". " + esc(cortar(artNext.titulo, 70, "…")) : ""}</span></a>` : ""}</nav>
<p class="muted">Fuente: <a href="${L.fuente}" rel="noopener">BOE, texto consolidado</a>. ${L.actualizada ? "Última actualización recogida: " + L.actualizada.split("-").reverse().join("/") + "." : ""}</p>`,
  });
}
}

// ---------- Directorio y páginas de oposiciones ----------
page("oposiciones/", {
  title: `Buscador de oposiciones ${ANIO}: convocatorias, temario y tests`,
  description: descripcion("Busca tu oposición por categoría u organismo y consulta su convocatoria oficial, requisitos, plazas y temario.", `${OPOS.length} oposiciones con tests y ${fmtN(CONVS.length)} convocatorias.`),
  wide: true, crumbs: [["Oposiciones", "oposiciones/"]],
  scripts: ["buscador.js"],
  body: (r) => `<nav class="crumbs"><a href="${r}">Inicio</a> › <span>Oposiciones</span></nav>
<h1>Buscador de oposiciones: encuentra la tuya y prepárala</h1>
<p class="lead">Oposiciones con temario, tests y simulacros, y ${fmtN(CONVS.length)} <a href="${r}convocatorias/">convocatorias oficiales</a> de todas las administraciones. Cada dato oficial enlaza a su fuente y muestra el texto literal del que sale.</p>
${buscador(r)}
${filtrosHtml(true, CATEGORIAS.filter((c) => catCount(c.id)).map((c) => [c.id, c.nombre, catCount(c.id)]))}
<p id="res-count" class="muted" aria-live="polite">${OPOS.length} oposiciones</p>
<div class="cards" id="res">${OPOS.map((o) => tarjetaOp(o, r)).join("")}</div>
<p id="res-vacio" class="box" hidden>No hay ninguna oposición verificada con esa búsqueda todavía. Escríbenos a <a href="mailto:globalprsx@gmail.com">globalprsx@gmail.com</a> y la añadimos a la cola a partir de su convocatoria oficial.</p>
<p id="res-conv" class="box" hidden>¿No encuentras tu oposición? Busca también entre las <a href="${r}convocatorias/">${fmtN(CONVS.length)} convocatorias oficiales</a> detectadas en el BOE.</p>
<h2>Categorías en incorporación</h2>
<p class="muted small">Estas categorías aún no tienen oposiciones con temario y tests verificados. Mostramos sus convocatorias oficiales mientras las incorporamos; nunca rellenamos con datos sin fuente.</p>
<ul class="cat-lista">${CATEGORIAS.filter((c) => !catCount(c.id)).map((c) => `<li><a href="${r}oposiciones/categoria/${c.id}/">${esc(c.nombre)}</a><span>${catCountConv(c.id) ? `${fmtN(catCountConv(c.id))} convocatorias` : "En incorporación"}</span></li>`).join("")}</ul>
<div class="box"><strong>¿Cómo elegimos qué publicar?</strong> Una oposición entra en el catálogo con temario y tests cuando hemos leído su convocatoria en la fuente oficial. Si todavía no hay convocatoria o no hemos podido verificarla, la marcamos como «en incorporación»: preferimos un catálogo más pequeño antes que datos inventados.</div>`,
});
for (const c of CATEGORIAS) {
  const lista = OPOS.filter((o) => o.categoria === c.id);
  const convs = CONVS.filter((v) => v.categoria === c.id);
  page(`oposiciones/categoria/${c.id}/`, {
    title: primero(`Oposiciones de ${c.nombre}: convocatorias, temario y tests`, `Oposiciones de ${c.nombre}: convocatorias y tests`, `Oposiciones de ${c.nombre}`),
    description: descripcion(c.descripcion, lista.length ? `${lista.length} oposición${lista.length > 1 ? "es" : ""} con convocatoria oficial verificada, temario y tests.` : "", convs.length ? `${fmtN(convs.length)} convocatorias oficiales con plazas, plazos y enlace a la fuente.` : "Próximamente en TestLey.", convs.length ? `${fmtN(convs.length)} convocatorias oficiales con enlace a la fuente.` : ""),
    noindex: !lista.length && !convs.length, wide: true, crumbs: [["Oposiciones", "oposiciones/"], [c.nombre, `oposiciones/categoria/${c.id}/`]],
    body: (r) => `<nav class="crumbs"><a href="${r}">Inicio</a> › <a href="${r}oposiciones/">Oposiciones</a> › <span>${esc(c.nombre)}</span></nav>
<h1>Oposiciones de ${esc(c.nombre)}</h1>
<p class="lead">${esc(c.descripcion)}</p>
${chipsCat(r, c.id)}
${lista.length
  ? `<div class="cards">${lista.map((o) => tarjetaOp(o, r)).join("")}</div>`
  : `<div class="box"><span class="chip grey">En incorporación</span> <strong>Todavía no hay oposiciones de ${esc(c.nombre)} con temario y tests.</strong> Si preparas una de esta categoría, escríbenos a <a href="mailto:globalprsx@gmail.com">globalprsx@gmail.com</a> y la priorizamos.</div>`}
${convs.length ? `<h2>Convocatorias oficiales recientes (${convs.length})</h2><div class="cards">${convs.slice(0, 30).map((v) => tarjetaConv(v, r)).join("")}</div>${convs.length > 30 ? `<p><a class="cta alt" href="${r}convocatorias/?cat=${c.id}">Ver las ${convs.length} convocatorias</a></p>` : ""}` : ""}`,
  });
}
const ETIQ = { calendario: "Calendario del proceso", calendario_aviso: "Aviso sobre el calendario", prova_fisica: "Prueba física", adequacio_psicoprofessional: "Adecuación psicoprofesional", catala: "Lengua catalana", exclusions_mediques: "Exclusiones médicas", grupo: "Grupo y subgrupo", plazas: "Plazas", plazas_libres: "Plazas de acceso libre", sistema_selectivo: "Sistema selectivo", temario_referencia: "Norma que fija el temario", plazas_reservadas: "Plazas reservadas", titulacion: "Titulación", requisitos: "Requisitos", plazo_solicitudes: "Plazo de solicitudes", fecha_examen: "Fecha del examen", pruebas: "Pruebas y examen" };
function oficialHtml(o) {
  const dato = (d) => {
    const f = o.fuentes[d.fuente];
    const citas = d.citas || [d.cita];
    return `<li><span>${esc(typeof d.valor === "number" ? fmtN(d.valor) : d.valor)}</span>${d.calculo === "suma" ? ' <span class="muted small">(total calculado sumando las cifras oficiales)</span>' : ""}<details><summary>Texto oficial</summary><blockquote>${citas.map((x) => `«${esc(x)}»`).join("<br>")}<span class="src"><a href="${esc(f.url)}" rel="noopener">${esc(f.id || f.titulo)}</a> · publicado el ${fmtFecha(f.fecha_publicacion)}</span></blockquote></details></li>`;
  };
  const anc = { plazas: "plazas", requisitos: "requisitos", pruebas: "pruebas", titulacion: o.oficial.requisitos ? "" : "requisitos" };
  const filas = Object.keys(o.oficial).map((k) => `<div class="of-row"${anc[k] ? ` id="${anc[k]}"` : ""}><h3>${ETIQ[k] || esc(k)}</h3><ul class="of-list">${(Array.isArray(o.oficial[k]) ? o.oficial[k] : [o.oficial[k]]).map(dato).join("")}</ul></div>`).join("");
  return `<section class="card oficial"><div class="of-head"><h2>Datos oficiales de la convocatoria</h2><span class="badge-oficial">Fuente oficial</span></div>
${filas}
<p class="muted small">Datos revisados el ${fmtFecha(o.actualizado)}. Cada dato incluye el texto literal de la fuente; si hubiera discrepancia, prevalece siempre el ${boletin(o)}.</p></section>`;
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
  const datosOp = { leyes: o.leyes, arts: o.arts, qs: separarPremium(o.id, o.qs).map(PUBLICO), premium: !!PRIVADO[o.id], temario: o.temario.map((t, i) => ({ i, b: t.bloque, n: t.tema, t: t.titulo, tipo: t.tipo, nq: o.temaInfo[i].nq, leyes: t.normas.filter((id) => PUB[id]).map((id) => PUB[id].slug), normas: t.normas.map((id) => (NORMAS[id] || { nombre: id }).nombre) })) ,
    // guía oficial no publicada: el test enlaza al PDF oficial en vez de a la página del artículo
    privadas: Object.fromEntries(Object.keys(o.leyes).filter((sl) => (LEYPOR[sl] || {}).privada).map((sl) => [sl, LEYPOR[sl].fuente])) };
  fs.mkdirSync(path.join(OUT_TMP, "datos"), { recursive: true });
  fs.writeFileSync(path.join(OUT_TMP, "datos", `${o.id}.json`), JSON.stringify(datosOp));
  const convsOp = CONVS.filter((v) => (v.oposiciones_relacionadas || []).includes(o.id));
  const nov = NOVEDADES.filter((n) => n.oposicion === o.id);
  const fechasExamen = nov.filter((n) => n.tipo === "fecha_examen");
  const ultimaVerif = [o.actualizado, ...convsOp.map((v) => (v.last_verified_at || "").slice(0, 10))].filter(Boolean).sort().pop();
  const V1 = (k) => { const d = o.oficial[k]; return d ? (Array.isArray(d) ? d[0] : d) : null; };
  const idConv = o.fuentes.convocatoria ? o.fuentes.convocatoria.id : "fuente oficial";
  const refConv = c.referencia.includes(idConv) ? c.referencia : `${c.referencia} (${idConv})`;
  // FAQ: solo afirmaciones que salen de datos oficiales citados o del propio catálogo (con su fuente)
  const faq = [
    V1("plazas") && [`¿Cuántas plazas se convocan en ${o.nombre}?`, `${fmtN(V1("plazas").valor)} plazas${V1("plazas").calculo === "suma" ? " (suma de las cifras oficiales por turno)" : ""}, según la ${refConv}.`],
    V1("titulacion") && [`¿Qué titulación se exige?`, `${V1("titulacion").valor}. Fuente: ${refConv}.`],
    V1("plazo_solicitudes") && [`¿Cuál es el plazo para presentar la solicitud?`, `${V1("plazo_solicitudes").valor}. Fuente: ${refConv}.`],
    V1("sistema_selectivo") && [`¿Cuál es el sistema selectivo?`, `${V1("sistema_selectivo").valor}. Fuente: ${refConv}.`],
    [`¿Cuándo es el examen?`, V1("fecha_examen") ? `${V1("fecha_examen").valor}. Fuente: ${o.fuentes[V1("fecha_examen").fuente].titulo}.` : fechasExamen.length ? `La última publicación oficial sobre fechas es «${fechasExamen[fechasExamen.length - 1].titulo}» (${fmtFecha(fechasExamen[fechasExamen.length - 1].fecha)}).` : "Todavía no hay una fecha de examen publicada oficialmente. La mostraremos en esta página en cuanto aparezca en el boletín oficial; si sigues la convocatoria, te avisaremos."],
    o.temario.length ? [`¿Cuántos temas tiene el temario?`, `${o.temario.length} temas (${(TEMARIO_TIPO[o.temario_tipo] || ["Temario"])[0].toLowerCase()}). Fuente: ${refConv}.`] : [`¿Cuál es el temario?`, "El temario oficial está pendiente de verificación: todavía no lo hemos contrastado con la fuente oficial, así que no lo mostramos."],
    o.qs.length && [`¿Cómo puedo preparar ${o.nombre} con TestLey?`, `Con ${fmtN(o.qs.length)} preguntas de las leyes del temario, cada una con la cita literal de ${citaOficial(o)} que la justifica${sim ? `, y simulacros de ${sim.preguntas} preguntas en ${sim.minutos} minutos` : ""}. Tu panel te propone cada día qué estudiar según tu fecha de examen y tus fallos.`],
  ].filter(Boolean);
  const leyesOp = [...new Set(o.temario.flatMap((t) => t.normas).concat((o.preparacion || {}).normas || []))].map((id) => NORMAS[id] || { id, nombre: id });
  page(`oposiciones/${o.id}/`, {
    title: titulo("", `${opCorto(o)}${anioOp(o) ? " " + anioOp(o) : ""}`, `: ${c.plazas ? "plazas" : "convocatoria"}, temario y test`),
    description: descripcion(`${opCorto(o)}${anioOp(o) ? " " + anioOp(o) : ""}: ${c.plazas ? `${fmtN(c.plazas)} plazas` : "convocatoria oficial"}${o.grupo ? ` (grupo ${o.grupo})` : ""}, requisitos, pruebas${o.temario.length ? ` y temario de ${o.temario.length} temas` : ""}.`, o.qs.length ? `${fmtN(o.qs.length)} preguntas tipo test con la respuesta citada ${boletin(o) === "BOE" ? "del BOE" : "de la fuente oficial"}.` : "", o.fuentes.convocatoria && o.fuentes.convocatoria.id ? `Convocatoria: ${o.fuentes.convocatoria.id}.` : ""),
    scripts: ["test.js", "oposicion.js"], lastmod: ultimaVerif, wide: true, crumbs: [["Oposiciones", "oposiciones/"], [o.categoria_nombre, `oposiciones/categoria/${o.categoria}/`], [o.nombre, `oposiciones/${o.id}/`]],
    // Sin «Course»: la ficha es información de una convocatoria con tests, no un curso
    schema: faqSchema(faq),
    body: (r) => {
      const [tLbl, tCls] = TEMARIO_TIPO[o.temario_tipo] || ["Temario", "badge-testley"];
      const pend = (o.pendientes || []).length ? `<section class="card pendiente"><h2>Información pendiente de verificación oficial</h2><ul>${o.pendientes.map((x) => `<li><b>${esc(x.campo.replace(/_/g, " "))}:</b> ${esc(x.motivo)}${x.fuente_prevista ? ` <a href="${esc(x.fuente_prevista)}" rel="noopener">Fuente oficial prevista</a>` : ""}</li>`).join("")}</ul><p class="muted small">${badgeVS("OFFICIAL_PENDING_REVIEW")} No mostramos datos sin verificar como oficiales. Los actualizaremos en cuanto los contrastemos con la fuente oficial.</p></section>` : "";
      const prep = o.preparacion ? `<section class="card"><div class="of-head"><h2>Contenido de preparación</h2><span class="badge-testley">No oficial</span></div><p>${esc(o.preparacion.descripcion)}</p><div class="chips">${o.preparacion.normas.map((id) => PUB[id] ? `<a class="chip ok" href="${r}${PUB[id].slug}/">${esc(PUB[id].corto)}</a>` : "").join(" ")}</div></section>` : "";
      const temasOk = o.temario.filter((_, i) => o.temaInfo[i].nq).length;
      const navFicha = [["convocatoria", "Convocatoria"], ["fechas", "Fechas"], o.qs.length && ["tests", "Tests"], ["simulacros", "Simulacros"], o.examenes.length && ["examenes", "Exámenes oficiales"], ["temario", "Temario"], ["legislacion", "Legislación"], ["documentacion", "Documentación"], ["faq", "Preguntas frecuentes"]].filter(Boolean);
      return `<nav class="crumbs"><a href="${r}">Inicio</a> › <a href="${r}oposiciones/">Oposiciones</a> › <a href="${r}oposiciones/categoria/${o.categoria}/">${esc(o.categoria_nombre)}</a> › <span>${esc(o.nombre)}</span></nav>
<header class="op-header">
<h1>${esc(o.nombre)}</h1>
<p class="op-org">${esc(o.organismo)} · ${esc(o.territorio)}</p>
<dl class="op-datos">
${o.grupo ? `<div><dt>Grupo</dt><dd>${esc(o.grupo)}</dd></div>` : ""}
${c.plazas ? `<div><dt>Plazas</dt><dd>${fmtN(c.plazas)}</dd></div>` : ""}
<div><dt>Convocatoria</dt><dd>${esc(opEstado(c))}</dd></div>
<div><dt>Temario</dt><dd>${o.temario.length ? `${o.temario.length} temas` : "Pendiente"}</dd></div>
${o.qs.length ? `<div><dt>Preguntas</dt><dd>${fmtN(o.qs.length)}</dd></div>` : ""}
</dl>
<p class="op-verif small"><span class="badge-oficial">Fuente oficial</span> <a href="${esc(c.url_oficial)}" rel="noopener">${esc(c.referencia)}</a>, publicada el ${fmtFecha(c.fecha_publicacion)}. Última verificación: ${fmtFecha(ultimaVerif)}. <span class="${tCls}">${tLbl}</span></p>
<div id="op-accion" data-op="${o.id}" data-nombre="${esc(o.nombre)}" data-tests="${o.qs.length ? 1 : 0}" data-cta="${esc(ctaOp(o))}" data-seguir="${esc(seguirOp(o))}"></div>
</header>
<div class="ficha">
<nav class="ficha-nav" aria-label="En esta página"><p class="ficha-nav-t">En esta página</p><ol>${navFicha.map(([id, t]) => `<li><a href="#${id}">${t}</a></li>`).join("")}</ol></nav>
<div class="ficha-main">
<div id="convocatoria">${oficialHtml(o)}</div>
<section class="card" id="fechas"><div class="of-head"><h2>Fechas</h2><span class="badge-oficial">Fuente oficial</span></div>
<ul class="of-list"><li><span>Publicación de la convocatoria: <b>${fmtFecha(c.fecha_publicacion)}</b></span></li>
${V1("plazo_solicitudes") ? `<li><span>Plazo de solicitudes: <b>${esc(V1("plazo_solicitudes").valor)}</b></span></li>` : ""}
<li><span>Fecha del examen: ${V1("fecha_examen") ? `<b>${esc(V1("fecha_examen").valor)}</b>` : fechasExamen.length ? `<b>${esc(fechasExamen[fechasExamen.length - 1].titulo)}</b>` : "<b>pendiente de publicación oficial</b>. Sigue la convocatoria y te avisaremos."}</span></li></ul>
${convsOp.length ? `<p class="small muted">En el catálogo nacional: ${convsOp.map((v) => `<a href="${r}convocatorias/${v.id}/">${esc(convNombre(v))}</a>`).join(", ")}.</p>` : ""}</section>
${novedadesHtml(o)}
${prep}
<section id="tests">${o.qs.length ? `<h2>Tests de ${esc(o.nombre.replace(/^Cuerpo (General )?/, ""))} <span class="badge-testley">Contenido de TestLey</span></h2><p class="muted small">Preguntas redactadas por TestLey; cada respuesta cita ${citaOficial(o)} que la justifica y se comprueba automáticamente contra el texto vigente.${o.temario_tipo === "pendiente" ? " Mientras el temario oficial está pendiente de verificación, el test usa las leyes de preparación indicadas arriba." : ""}</p><div id="quiz" class="quiz" data-ley="${o.id}" data-base="./" data-sim="${esc(JSON.stringify(sim || null))}">Cargando preguntas…</div>` : ""}</section>
<section class="card" id="simulacros"><h2>Simulacros</h2>${((o.examen || {}).estructura || []).length ? `<h3>Estructura oficial del proceso</h3><div class="tabla-scroll"><table class="tabla"><thead><tr><th>Parte</th><th>Preguntas</th><th>En el simulacro de TestLey</th></tr></thead><tbody>${o.examen.estructura.map((x) => `<tr><td>${esc(x.parte)}<details><summary class="small">Texto oficial</summary><blockquote>«${esc(x.cita)}»</blockquote></details></td><td>${x.preguntas || "—"}</td><td>${x.en_simulacro ? "✓ Sí" : `No · <span class="muted small">${esc(x.motivo)}</span>`}</td></tr>`).join("")}</tbody></table></div>` : ""}${sim ? `<p>Formato: <b>${sim.preguntas} preguntas</b> en <b>${sim.minutos} minutos</b>, ${sim.opciones} opciones${sim.penalizacion ? `, cada error resta ${fraccionTxt(sim.penalizacion)}` : ", sin penalización"}. ${sim.origen === "oficial" ? `<span class="badge-oficial">Formato oficial</span>` : `<span class="badge-testley">Adaptado por TestLey</span>`}</p><p class="muted small">${esc(sim.nota || "")}</p><p><a class="btn primary" href="#test=simulacro">Hacer un simulacro</a></p>` : `<p class="muted">El formato oficial del examen aún no está verificado; puedes hacer tests por temas.</p>`}</section>
<section id="temario">${o.temario.length ? `<div class="sec-head"><h2>${tLbl}</h2><span class="${tCls}">${o.temario_tipo === "oficial_publicado" ? "Fuente oficial" : "Ver nota"}</span></div>
<p class="muted small">${o.temario_tipo === "oficial_publicado" ? `Copiado literalmente del anexo ${esc(c.anexo || "")} de la convocatoria. ` : "Estructura deducida de las bases oficiales. "}${temasOk} de ${o.temario.length} temas tienen test. Entra en un tema para estudiar su legislación y practicar.</p>
<div id="op-temario">${bloques.map((b, bi) => { const ts = o.temario.map((t, i) => [t, i]).filter(([t]) => t.bloque === b); return `<details class="bloque"${bi === 0 || bloques.length === 1 ? " open" : ""}><summary><span>${esc(b)}</span><small>${ts.length} temas</small></summary><ol class="temario-lista">${ts.map(([t, i]) => `<li><a href="${r}${rutaTema(o, i)}" title="${esc(t.titulo)}"><span class="tl-n">${t.tema}</span><span class="tl-t">${esc(t.titulo)}</span></a><span class="chips">${o.temaInfo[i].nq ? `<span class="tl-q">${o.temaInfo[i].nq} preguntas</span>` : `<span class="tl-q vacia">${t.tipo === "no_legislativo" ? "Sin test" : "En preparación"}</span>`}</span></li>`).join("")}</ol></details>`; }).join("")}</div>
<p class="muted small">Las leyes de cada tema las asigna TestLey a partir del título oficial: son orientativas. Comprueba siempre las bases de tu convocatoria.</p>` : `<h2>Temario</h2><p class="muted">${badgeVS("OFFICIAL_PENDING_REVIEW")} Temario pendiente de verificación oficial.</p>`}</section>
${pend}
${aptitudOf(o) ? `<section class="card" id="aptitudinal"><h2>Subprueba aptitudinal</h2><p>${aptitudOf(o).preguntas} preguntas en ${aptitudOf(o).minutos} minutos sobre razonamiento abstracto, espacial, aptitud verbal, numérica y perceptiva. Entrena con ejercicios originales de TestLey por aptitud, dificultad, contrarreloj o en modo adaptativo.</p><p><a class="btn primary" href="${r}oposiciones/${o.id}/aptitudinal/">Entrenar la aptitudinal</a></p></section>` : ""}
${o.examenes.length ? `<section class="card" id="examenes"><div class="of-head"><h2>Exámenes oficiales anteriores</h2><span class="badge-oficial">Fuente oficial</span></div><p>Preguntas y plantilla de respuestas publicadas por la administración. Hazlos tal cual se publicaron, con la respuesta oficial.</p><ul class="of-list">${o.examenes.map((e) => `<li><span><a href="${r}oposiciones/${o.id}/examenes-oficiales/${e.id}/">Examen oficial ${esc(e.convocatoria)}</a> · ${e.preguntes.length} preguntas${e.minuts ? ` · ${e.minuts} min` : ""}</span></li>`).join("")}</ul><p><a class="btn" href="${r}oposiciones/${o.id}/examenes-oficiales/">Ver todos los exámenes oficiales</a></p></section>` : ""}
<section class="card" id="legislacion"><h2>Legislación</h2><p class="muted small">${leyesOp.filter((n) => PUB[n.id]).length} de ${leyesOp.length} normas con test. ${boletin(o) === "BOE" ? "Textos consolidados del BOE." : "Fuentes oficiales: guia d'estudi de la Generalitat y textos consolidados del BOE."}</p><details class="leyes-det"${leyesOp.length <= 8 ? " open" : ""}><summary>Ver las ${leyesOp.length} normas</summary><ul class="of-list">${leyesOp.map((n) => `<li><span>${PUB[n.id] ? `${n.tipo === "guia_oficial" ? esc(n.nombre) : `<a href="${r}${PUB[n.id].slug}/">${esc(n.nombre)}</a>`} <span class="chip ok">Con test</span>` : `${esc(n.nombre)} <span class="chip grey">En preparación</span>`}</span> <a class="muted small" href="${esc(n.url || `https://www.boe.es/buscar/act.php?id=${n.id}`)}" rel="noopener">${esc(n.tipo === "guia_oficial" ? "PDF oficial" : n.id)}</a></li>`).join("")}</ul></details></section>
<section class="card" id="documentacion"><h2>Documentación oficial</h2><ul class="of-list">${Object.values(o.fuentes).map((f) => `<li><span><a href="${esc(f.url)}" rel="noopener">${esc(f.titulo)}</a></span> <span class="muted small">${esc(f.tipo)}, publicado el ${fmtFecha(f.fecha_publicacion)}</span></li>`).join("")}</ul></section>
${faqHtml(faq)}
</div></div>`;
    },
  });
}

// ---------- Temas: estudiar (texto oficial) → test del tema; cobertura por tema; completitud de cada oposición ----------
const OBJ_TEMA = 30; // preguntas por tema consideradas «cobertura completa» en la métrica (no es un límite)
// TOPIC_COVERAGE: qué hay de cada tema (texto oficial para estudiar, legislación identificada, preguntas, test, verificación)
// Título del tema para el encabezado: la primera frase del título oficial (el completo se muestra debajo, literal)
const tituloCorto = (t) => { const f = t.split(/(?<=\.)\s+/)[0]; return f.length <= 110 && f.length < t.length ? f.replace(/\.$/, "") : t.length <= 110 ? t : t.slice(0, 100).replace(/\s+\S*$/, "") + "…"; };
function coberturaTema(o, i) {
  const t = o.temario[i], ti = o.temaInfo[i], leg = t.tipo !== "no_legislativo";
  return { contenido: ti.leyes.length > 0, legislacion: leg ? t.normas.length > 0 : null, preguntas: ti.nq, test: ti.nq >= 10, test_parcial: ti.nq > 0 && ti.nq < 10,
    ambito: Object.values(ti.ambito).some((a) => a.estado === "sin_precisar") ? "sin_precisar" : Object.values(ti.ambito).some((a) => a.estado === "precisado") ? "precisado" : "ley_completa",
    verificacion: o.temario_tipo === "oficial_publicado" ? "OFFICIAL_VERIFIED" : "OFFICIAL_PENDING_REVIEW", legislativo: leg };
}
// Completitud del CONTENIDO de TestLey (no es probabilidad de aprobar)
function completitud(o) {
  const n = o.temario.length, sim = (o.examen || {}).simulacro;
  if (!n) return { temario: 0, temas: 0, legislacion: 0, contenido: 0, preguntas: 0, tests: 0, simulacros: sim ? (sim.origen === "oficial" ? 100 : 60) : 0, total: 0 };
  const c = o.temario.map((_, i) => coberturaTema(o, i)), legs = c.filter((x) => x.legislativo);
  const r = {
    temario: o.temario_tipo === "oficial_publicado" ? 100 : o.temario_tipo === "derivado_bases" ? 75 : 0,
    temas: 100,
    legislacion: Math.round((100 * legs.filter((x) => x.legislacion).length) / Math.max(1, legs.length)),
    contenido: Math.round((100 * c.filter((x) => x.contenido).length) / n),
    preguntas: Math.round((100 * c.reduce((a, x) => a + Math.min(x.preguntas, OBJ_TEMA), 0)) / (n * OBJ_TEMA)),
    tests: Math.round((100 * c.filter((x) => x.test).length) / n),
    simulacros: sim ? (sim.origen === "oficial" ? 100 : 60) : 0,
  };
  r.total = Math.round((r.temario + r.temas + r.legislacion + r.contenido + r.preguntas + r.tests + r.simulacros) / 7);
  return r;
}
// Cobertura por oposición y tema (lo usan el informe documentacion/OPOSITIONS-COVERAGE-REPORT.md y los tests)
fs.writeFileSync(path.join(OUT_TMP, "datos", "cobertura.json"), JSON.stringify(OPOS.map((o) => ({
  id: o.id, nombre: o.nombre, temario_tipo: o.temario_tipo || null, completitud: completitud(o), preguntas: o.qs.length,
  sin_tema: o.qs.filter((q) => !q.tm).length, // de sus leyes, pero fuera del ámbito de todos los temas: solo en tests mixtos
 
  estructura: ((o.examen || {}).estructura || []).map((p) => ({ parte: p.parte, en_simulacro: !!p.en_simulacro })),
  temas: o.temario.map((t, i) => ({ tema: t.tema, bloque: t.bloque || null, titulo: t.titulo.slice(0, 120), ...coberturaTema(o, i) })),
}))));
// Perfil de cada oposición para los motores del navegador (entrenamiento, simulacro, módulos, calendario, alertas):
// versión reducida de catalogo/perfiles/<id>.json (datos oficiales públicos y recuentos; ninguna pregunta ni respuesta)
for (const o of OPOS) {
  const f = `catalogo/perfiles/${o.id}.json`;
  if (!fs.existsSync(f)) continue;
  const p = JSON.parse(fs.readFileSync(f, "utf8"));
  const a = p.convocatoria.actual;
  fs.writeFileSync(path.join(OUT_TMP, "datos", `perfil-${o.id}.json`), JSON.stringify({
    schema: p.schema, id: p.id, nombre: p.nombre, generado: p.generado,
    convocatoria: { actual: { estado: a.estado, codigo: a.codigo, seguir: a.seguir }, historicas: p.convocatoria.historicas.map((h) => ({ estado: h.estado, codigo: h.codigo })) },
    contenido: p.contenido,
    temario: p.temario.map((t, i) => ({ i, id: t.id, titulo: t.titulo, cobertura: t.cobertura, preguntas: t.preguntas, leyes_pendientes: t.leyes_pendientes.map((l) => l.nombre) })),
    simulacro: p.examen.simulacro, estructura: (p.examen.estructura || []).map((e) => ({ parte: e.parte, en_simulacro: !!e.en_simulacro })),
    modulos: p.modulos.map((m) => ({ id: m.id, nombre: m.nombre, tipo: m.tipo, descripcion: m.descripcion, acciones: m.acciones, parte_oficial: m.parte_oficial || null,
      datos_oficiales: Object.fromEntries(Object.entries(m.datos_oficiales || {}).map(([k, d]) => [k, { valor: d.valor, cita: d.cita || null, fuente: d.fuente ? { url: d.fuente.source_url, documento: d.fuente.source_document } : null }])) })),
    calendario: p.calendario.map((c) => ({ fecha: c.fecha, hito: c.hito, tipo: c.tipo, caracter: c.caracter, fuente: c.fuente && c.fuente.source_url })),
    alertas: { fuentes: p.alertas.fuentes, eventos: p.alertas.eventos, recientes: p.alertas.recientes },
    motor360: p.motor360 || null, // Opposition Engine: datos oficiales de preparación por convocatoria (públicos; sin preguntas)
  }));
}
// Entrenador aptitudinal (Aptitude Engine): solo para oposiciones con estructura aptitudinal oficial verificada en su perfil
for (const o of OPOS) {
  const a = aptitudOf(o);
  if (!a) continue;
  page(`oposiciones/${o.id}/aptitudinal/`, {
    title: titulo("", `Psicotécnicos ${opCorto(o)}: entrenador de la aptitudinal`, ""), lastmod: o.actualizado, wide: true,
    scripts: ["psicotecnicos.js", "aptitud.js", "aptitud-ui.js"],
    description: descripcion(`Entrena la subprueba aptitudinal de ${opCorto(o)} (${a.preguntas} preguntas, ${a.minutos} minutos): razonamiento abstracto, espacial, verbal, numérico y perceptivo.`, "Ejercicios originales con solución comprobada, por aptitud, dificultad, contrarreloj o adaptativo."),
    crumbs: [["Oposiciones", "oposiciones/"], [o.nombre, `oposiciones/${o.id}/`], ["Aptitudinal", `oposiciones/${o.id}/aptitudinal/`]],
    body: (r) => `<nav class="crumbs"><a href="${r}">Inicio</a> › <a href="${r}oposiciones/">Oposiciones</a> › <a href="${r}oposiciones/${o.id}/">${esc(o.nombre)}</a> › <span>Aptitudinal</span></nav>
<h1>Subprueba aptitudinal · ${esc(opCorto(o))}</h1>
<p class="lead">Según las bases de la convocatoria ${esc(a.call_id)}: ${a.preguntas} preguntas de ${a.opciones} opciones en ${a.minutos} minutos; los errores y los blancos no restan y el apto exige ${a.minimo_apte} puntos sobre 10. <span class="badge-oficial">Dato oficial</span></p>
<blockquote class="cita small">${esc(a.citas[0])}</blockquote>
<div id="aptitud" class="quiz" data-op="${o.id}" data-idioma="${esc(motorDe(o).idioma || "es")}">Cargando el entrenador…</div>
<p class="muted small">Fuente: <a href="${esc(a.fuente)}" rel="noopener">${esc(a.documento)}</a>. Los ejercicios son originales de TestLey (no reproducen pruebas oficiales ni material comercial) y su respuesta se calcula y se comprueba automáticamente. ${esc(a.nota || "")}</p>`,
  });
}
// Páginas de exámenes oficiales: índice y una página por examen (los datos van a docs/datos/examen-<oposición>-<id>.json)
for (const o of OPOS.filter((x) => x.examenes.length)) {
  const pen = ((o.examen || {}).oficial || {}).penalizacion || 0;
  const sim = (e) => ({ preguntas: e.preguntes.length, minutos: e.minuts || null, opciones: 4, penalizacion: pen, origen: "oficial" });
  const estados = (e) => { const c = {}; e.preguntes.forEach((q) => (c[q.vigencia_guia] = (c[q.vigencia_guia] || 0) + 1)); return c; };
  for (const e of o.examenes) {
    const ley = `examen-${o.id}-${e.id}`;
    fs.writeFileSync(path.join(OUT_TMP, "datos", `${ley}.json`), JSON.stringify({ leyes: { [ley]: `Examen oficial ${e.convocatoria}` }, arts: { [e.id]: { t: `Convocatòria ${e.convocatoria}`, b: `Examen oficial ${e.convocatoria}` } },
      qs: e.preguntes.map((q) => ({ ...q, ley, art: e.id })) }));
  }
  page(`oposiciones/${o.id}/examenes-oficiales/`, {
    title: titulo("", `Exámenes oficiales de ${opCorto(o)}`, " con respuestas"), lastmod: o.actualizado, wide: true,
    description: descripcion(`${o.examenes.length} exámenes oficiales anteriores de ${opCorto(o)} (${o.examenes.map((e) => e.convocatoria).join(", ")}) con la plantilla oficial de respuestas.`, "Hazlos online con el tiempo y la penalización oficiales."),
    crumbs: [["Oposiciones", "oposiciones/"], [o.nombre, `oposiciones/${o.id}/`], ["Exámenes oficiales", `oposiciones/${o.id}/examenes-oficiales/`]],
    body: (r) => `<nav class="crumbs"><a href="${r}">Inicio</a> › <a href="${r}oposiciones/">Oposiciones</a> › <a href="${r}oposiciones/${o.id}/">${esc(o.nombre)}</a> › <span>Exámenes oficiales</span></nav>
<h1>Exámenes oficiales de ${esc(opCorto(o))}</h1>
<p class="lead">Preguntas y plantilla de respuestas de la subprueba de conocimientos de convocatorias anteriores, publicadas por la Generalitat de Catalunya. Practícalos tal cual se publicaron: ${o.examenes[0].preguntes.length} preguntas, 4 opciones${pen ? `, cada error resta ${fraccionTxt(pen)}` : ""}.</p>
<div class="tabla-scroll"><table class="tabla"><thead><tr><th>Examen</th><th>Preguntas</th><th>Tiempo oficial</th><th>Respuesta respaldada por la guía vigente</th><th>Documento oficial</th></tr></thead><tbody>${o.examenes.map((e) => { const c = estados(e); return `<tr><td><a href="${r}oposiciones/${o.id}/examenes-oficiales/${e.id}/">Examen oficial ${esc(e.convocatoria)}</a>${e.data_document ? `<br><span class="muted small">Plantilla del ${fmtFecha(e.data_document)}</span>` : ""}</td><td>${e.preguntes.length}</td><td>${e.minuts ? `${e.minuts} min` : "No indicado en el documento"}</td><td>${c.CONFORME_GUIA || 0} con cita de la guía · ${c.ACTUALITAT || 0} de actualidad${c.NO_CONSTA_GUIA ? ` · ${c.NO_CONSTA_GUIA} sin desarrollar en la guía` : ""}${c.CONTRADIU_GUIA ? ` · <b>${c.CONTRADIU_GUIA} desfasadas</b>` : ""}${c.PENDENT_AUDITORIA ? ` · ${c.PENDENT_AUDITORIA} por contrastar` : ""}</td><td><a href="${esc(e.font)}" rel="noopener">PDF</a></td></tr>`; }).join("")}</tbody></table></div>
<p class="muted small">La respuesta correcta es siempre la de la plantilla oficial. TestLey contrasta cada pregunta con la Guia d'estudi vigente (edición de junio de 2026 con las esmenes de septiembre de 2026) y lo indica tras responder. Fuente: <a href="${esc(o.examenes[0].pagina)}" rel="noopener">mossos.gencat.cat</a>.</p>`,
  });
  for (const e of o.examenes) {
    const ley = `examen-${o.id}-${e.id}`;
    page(`oposiciones/${o.id}/examenes-oficiales/${e.id}/`, {
      title: titulo("", `Examen oficial ${opCorto(o)} ${e.convocatoria}`, " con respuestas"), lastmod: o.actualizado, wide: true, scripts: ["test.js"],
      description: descripcion(`Examen oficial de ${opCorto(o)}, convocatoria ${e.convocatoria}: ${e.preguntes.length} preguntas con la plantilla oficial de respuestas.`, `Hazlo online${e.minuts ? ` en ${e.minuts} minutos` : ""} y revisa cada respuesta con su fuente.`),
      crumbs: [["Oposiciones", "oposiciones/"], [o.nombre, `oposiciones/${o.id}/`], ["Exámenes oficiales", `oposiciones/${o.id}/examenes-oficiales/`], [e.convocatoria, `oposiciones/${o.id}/examenes-oficiales/${e.id}/`]],
      body: (r) => `<nav class="crumbs"><a href="${r}">Inicio</a> › <a href="${r}oposiciones/${o.id}/">${esc(o.nombre)}</a> › <a href="${r}oposiciones/${o.id}/examenes-oficiales/">Exámenes oficiales</a> › <span>${esc(e.convocatoria)}</span></nav>
<h1>Examen oficial ${esc(e.convocatoria)} · ${esc(opCorto(o))}</h1>
<p class="lead">Subprueba de conocimientos de la convocatoria ${esc(e.convocatoria)} (modelo ${esc(e.model)}): ${e.preguntes.length} preguntas${e.minuts ? ` en ${e.minuts} minutos` : ""}, con la respuesta de la plantilla oficial. <span class="badge-oficial">Examen oficial</span></p>
<div id="quiz" class="quiz" data-ley="${ley}" data-base="../../../../" data-examen="1" data-sim="${esc(JSON.stringify(sim(e)))}">Cargando el examen…</div>
<p class="muted small">Documento oficial: <a href="${esc(e.font)}" rel="noopener">preguntas y plantilla de respuestas (PDF)</a>${e.escanejat ? " · PDF escaneado: transcrito y revisado contra la imagen de cada página" : ""}. ${e.minuts ? "" : "El documento no indica el tiempo de la prueba: se practica sin límite. "}La vigencia de cada respuesta se contrasta con la Guia d'estudi actual.</p>`,
    });
  }
}
for (const o of OPOS) {
  o.completitud = completitud(o);
  const conv = o.fuentes.convocatoria || Object.values(o.fuentes)[0];
  o.temario.forEach((t, i) => {
    const ti = o.temaInfo[i], cob = coberturaTema(o, i), etq = `Tema ${t.tema}`;
    const nombre = nombreTema(o, i);
    const prev = i > 0 ? o.temario[i - 1] : null, next = o.temario[i + 1];
    page(rutaTema(o, i), {
      // «Tema N <título corto> – <oposición>»
      title: titulo(`${nombre}. `, tituloCorto(t.titulo).replace(/…$/, ""), ` – ${opCorto(o)}`),
      tituloAlt: [titulo(`${nombre}. `, tituloCorto(t.titulo).replace(/…$/, ""), ` – ${opCorto(o)} ${anioOp(o)}`)],
      lastmod: o.actualizado,
      description: descripcion(`${nombre} de ${opCorto(o)}: ${tituloCorto(t.titulo).replace(/…$/, "")}.`, ti.leyes.length ? `Legislación con su texto oficial del BOE${ti.nq ? ` y ${ti.nq} preguntas tipo test con solución` : ""}.` : "", o.temario_tipo === "oficial_publicado" ? `Temario oficial de la convocatoria ${anioOp(o)}.` : "", "Estudia y practica por temas."),
      noindex: !ti.nq, scripts: ti.nq ? ["test.js"] : [], wide: true,
      crumbs: [["Oposiciones", "oposiciones/"], [o.nombre, `oposiciones/${o.id}/`], [nombre, rutaTema(o, i)]],
      body: (r) => {
        const estudio = ti.leyes.map((sl) => {
          const L = LEYPOR[sl], a = ti.ambito[sl], arts = L.arts.filter((x) => !a.arts || a.arts.has(x.n));
          if (L.privada) // guía oficial (© Generalitat): índice de apartados y enlace al PDF oficial; su texto no se reproduce
            return `<div class="card"><h3>${esc(L.nombre)} <span class="badge-oficial">Font oficial</span></h3><p class="muted small">Apartats oficials d'aquest tema. El text és de la Generalitat de Catalunya: estudia'l al <a href="${esc(L.fuente)}" rel="noopener">PDF oficial de la guia</a>; a cada pregunta et mostrem el fragment que justifica la resposta.</p><ul class="art-list">${arts.map((x) => `<li>${esc(x.n.replace(/\.IF$/, " · Idees força"))}${x.titulo && !x.n.endsWith(".IF") ? ". " + esc(x.titulo) : ""}</li>`).join("")}</ul></div>`;
          const grupos = {}; arts.forEach((x) => (grupos[x.capitulo ? `${x.bloque} · ${x.capitulo}` : x.bloque || L.corto] ||= []).push(x));
          const nq = o.qs.filter((q) => q.ley === sl && q.tm && q.tm.includes(i)).length;
          return `<div class="card"><h3><a href="${r}${sl}/">${esc(L.corto)}</a> <span class="badge-oficial">Texto oficial (BOE)</span></h3>
<p class="muted small">${a.estado === "precisado" ? `Parte que corresponde a este tema: ${a.unidades.map((u) => esc(u.split("|").pop())).join(" · ")} <span class="badge-testley">Asignación de TestLey</span>` : a.estado === "sin_precisar" ? "Esta ley se reparte entre varios temas y aún no hemos precisado qué parte corresponde a este: se incluye completa." : "Ley completa."} · ${arts.length} artículos · ${nq} preguntas · <a href="https://www.boe.es/buscar/act.php?id=${esc(L.id)}" rel="noopener">${esc(L.id)}</a>${L.actualizada ? ` · texto vigente a ${fmtFecha(L.actualizada)}` : ""}</p>
${Object.entries(grupos).map(([g, xs]) => `<details><summary>${esc(g)} (${xs.length})</summary><ul class="art-list">${xs.map((x) => `<li><a href="${r}${sl}/articulo-${x.n}/">Art. ${x.n}${x.titulo ? ". " + esc(x.titulo) : ""}</a></li>`).join("")}</ul></details>`).join("")}</div>`;
        }).join("");
        const sinLey = t.normas.filter((id) => !PUB[id]).map((id) => (NORMAS[id] || { nombre: id }).nombre);
        const delBloque = o.temario.map((x, k) => [x, k]).filter(([x]) => x.bloque === t.bloque);
        const lateral = `<nav class="ficha-nav tema-nav" aria-label="Temas del bloque"><p class="ficha-nav-t">${esc(t.bloque)}</p><ol>${delBloque.map(([x, k]) => `<li><a href="${r}${rutaTema(o, k)}"${k === i ? ' class="activo" aria-current="page"' : ""}><span class="tl-n">${x.tema}</span> ${esc(tituloCorto(x.titulo))}</a></li>`).join("")}</ol><p class="tema-nav-todo"><a href="${r}oposiciones/${o.id}/#temario">Temario completo</a></p></nav>`;
        const tarjeta = (k, lbl) => `<a class="pag-card${lbl === "Siguiente" ? " sig" : ""}" href="${r}${rutaTema(o, k)}"><small>${lbl}</small><span>Tema ${o.temario[k].tema}. ${esc(tituloCorto(o.temario[k].titulo))}</span></a>`;
        return `<nav class="crumbs"><a href="${r}">Inicio</a> › <a href="${r}oposiciones/${o.id}/">${esc(o.nombre)}</a> › <span>${esc(nombre)}</span></nav>
<div class="ficha tema-ficha">
${lateral}
<div class="ficha-main">
<p class="tema-bloque">${esc(t.bloque)}</p>
<h1>${esc(nombre)}. ${esc(tituloCorto(t.titulo))}</h1>
${tituloCorto(t.titulo) !== t.titulo ? `<p class="tema-oficial"><b>Título oficial completo:</b> ${esc(t.titulo)}</p>` : ""}
<p class="op-verif small">${o.temario_tipo === "oficial_publicado" ? `<span class="badge-oficial">Título oficial</span> copiado literalmente del anexo ${esc(o.convocatoria.anexo || "")} de la <a href="${esc(conv.url)}" rel="noopener">${esc(conv.id || conv.titulo)}</a>` : `<span class="badge-testley">Estructura derivada de las bases</span>`}</p>
<dl class="op-datos"><div><dt>Preguntas del tema</dt><dd>${ti.nq}</dd></div><div><dt>Leyes con texto oficial</dt><dd>${ti.leyes.length}</dd></div><div><dt>Tu dominio</dt><dd id="tema-dom">—</dd></div></dl>
<p class="acciones">${ti.leyes.length ? `<a class="btn" href="#estudiar">Estudiar la legislación</a>` : ""}${ti.nq ? `<a class="cta" href="#practicar">Practicar ${ti.nq} preguntas</a>` : ""}</p>
<section id="estudiar"><h2>1. Estudiar</h2>
${t.tipo === "no_legislativo" ? `<div class="box"><b>Tema no legislativo</b> (informática, ofimática, lengua…). TestLey aún no tiene contenido verificado para este tema; estúdialo con el material oficial de la convocatoria.</div>` : ""}
${estudio || (t.tipo !== "no_legislativo" ? `<div class="box">${badgeVS("OFFICIAL_PENDING_REVIEW")} Información pendiente de verificación oficial: este tema no remite a una norma con texto consolidado en el BOE${sinLey.length ? ` (${sinLey.map(esc).join(", ")})` : ""}. No mostramos contenido que no podamos verificar.</div>` : "")}
${sinLey.length && estudio ? `<p class="muted small">También relacionadas con este tema (sin test todavía): ${sinLey.map(esc).join(", ")}.</p>` : ""}
<p class="muted small">${ti.leyes.some((sl) => LEYPOR[sl].privada) ? "Les preguntes d'aquest tema citen la Guia d'estudi oficial de la Generalitat (edició juny 2026 amb les esmenes de setembre 2026)." : "El texto de los artículos es la versión consolidada oficial del BOE."} La asignación de leyes y artículos a cada tema la hace TestLey y es orientativa: comprueba siempre el programa oficial.</p></section>
<section id="practicar"><h2>2. Practicar: test del tema</h2>
${ti.nq ? `<p class="muted small">${ti.nq} preguntas de este tema. Cada respuesta cita ${citaOficial(o)} que la justifica.${ti.nq < 10 ? " Este tema tiene todavía pocas preguntas: estamos ampliándolas." : ""}</p><div id="quiz" class="quiz" data-ley="${o.id}" data-base="../" data-tema="${i}" data-sim="${esc(JSON.stringify((o.examen || {}).simulacro || null))}">Cargando preguntas…</div>` : `<p class="muted">Todavía no hay preguntas verificadas para este tema.</p>`}</section>
<nav class="paginacion" aria-label="Otros temas">${prev ? tarjeta(i - 1, "Anterior") : "<span></span>"}${next ? tarjeta(i + 1, "Siguiente") : ""}</nav>
<p class="small"><a href="${r}oposiciones/${o.id}/#temario">Temario completo</a> · <a href="${r}panel/?c=${o.id}">Mi progreso</a></p>
</div></div>`;
      },
    });
  });
  // Control de calidad de la oposición (admin, sin datos personales)
  const cal = fs.existsSync("datos/calidad.json") ? JSON.parse(fs.readFileSync("datos/calidad.json", "utf8")) : {};
  const leyesOp = Object.keys(o.leyes), slugsOp = new Set(leyesOp);
  const errores = leyesOp.flatMap((sl) => (cal[sl] || { errores: [] }).errores.map((e) => ({ ...e, ley: sl })));
  const avisos = leyesOp.flatMap((sl) => (cal[sl] || { avisos: [] }).avisos.map((e) => ({ ...e, ley: sl })));
  const revisar = LEYES.filter((L) => slugsOp.has(L.slug)).flatMap((L) => L.revisar.map((q) => ({ ley: L.corto, art: q.art, q: q.q, motivo: q.motivo })));
  const retiradas = LEYES.filter((L) => slugsOp.has(L.slug)).flatMap((L) => L.desfasadas.map((q) => ({ ley: L.corto, art: q.art, q: q.q, motivo: q.motivo })));
  const barra = (lbl, v) => `<div class="qbar"><span>${lbl}</span><span class="tbar-track"><span class="${v >= 90 ? "good" : v >= 60 ? "mid" : "low"}" style="width:${v}%"></span></span><b>${v} %</b></div>`;
  const C2 = o.completitud;
  page(`admin/oposiciones/${o.id}/quality/`, {
    title: `Calidad · ${o.nombre}`, description: "Control de calidad del contenido.", noindex: true, wide: true,
    body: (r) => `<p class="small"><a href="${r}admin/system/">Sistema</a> · <a href="${r}admin/growth/">Growth</a></p><h1>Calidad del contenido · ${esc(o.nombre)}</h1>
<p class="muted">Mide la cobertura del contenido de TestLey (no es la probabilidad de aprobar).</p>
<section class="card">${barra("Temario oficial", C2.temario)}${barra("Temas estructurados", C2.temas)}${barra("Legislación identificada", C2.legislacion)}${barra("Contenido de estudio (texto oficial)", C2.contenido)}${barra(`Preguntas (objetivo ${OBJ_TEMA}/tema)`, C2.preguntas)}${barra("Tests por tema (≥ 10 preguntas)", C2.tests)}${barra("Simulacro", C2.simulacros)}<p><b>COBERTURA DE CONTENIDO: ${C2.total} %</b></p></section>
<div class="kpis"><div class="kpi"><span class="kpi-n">${o.qs.length}</span><span class="kpi-l">preguntas publicadas</span></div><div class="kpi"><span class="kpi-n">${revisar.length}</span><span class="kpi-l">pendientes de revisión</span></div><div class="kpi"><span class="kpi-n">${errores.length}</span><span class="kpi-l">con error</span></div><div class="kpi"><span class="kpi-n">${avisos.filter((a) => a.control === "DUPLICATE").length}</span><span class="kpi-l">casi-duplicados</span></div><div class="kpi"><span class="kpi-n">${(o.pendientes || []).length}</span><span class="kpi-l">fuentes pendientes</span></div></div>
<section class="card"><h2>Cobertura por tema (TOPIC_COVERAGE)</h2><div class="tabla-scroll"><table class="tabla"><thead><tr><th>Tema</th><th>Contenido</th><th>Legislación</th><th>Preguntas</th><th>Test</th><th>Ámbito</th></tr></thead><tbody>${o.temario.map((t, i) => { const c = coberturaTema(o, i); return `<tr><td><a href="${r}${rutaTema(o, i)}">${esc(t.tema)}</a> <small>${esc(t.titulo.slice(0, 70))}</small></td><td>${c.contenido ? "✓" : "✗"}</td><td>${c.legislacion === null ? "no legislativo" : c.legislacion ? "✓" : "✗"}</td><td><b class="${c.preguntas >= OBJ_TEMA ? "good" : c.preguntas >= 10 ? "" : "bad"}">${c.preguntas}</b></td><td>${c.test ? "✓" : c.test_parcial ? "parcial" : "✗"}</td><td><small>${c.ambito.replace("_", " ")}</small></td></tr>`; }).join("")}</tbody></table></div></section>
<section class="card"><h2>Preguntas pendientes de revisión (la ley cambió)</h2>${revisar.length ? `<ul class="nov">${revisar.map((q) => `<li>${esc(q.ley)} · art. ${esc(q.art)} · ${esc(q.q.slice(0, 120))} <small class="muted">${esc(q.motivo || "")}</small></li>`).join("")}</ul><p class="muted small">Tras revisarlas: <code>python3 datos/sellar_preguntas.py --revisadas ley:art</code></p>` : "<p class='muted'>Ninguna.</p>"}</section>
<section class="card"><h2>Preguntas retiradas (OUTDATED / DEPRECATED)</h2>${retiradas.length ? `<ul class="nov">${retiradas.map((q) => `<li>${esc(q.ley)} · art. ${esc(q.art)} · ${esc(q.q.slice(0, 120))} <small class="muted">${esc(q.motivo || "")}</small></li>`).join("")}</ul>` : "<p class='muted'>Ninguna.</p>"}</section>
<section class="card"><h2>Errores y duplicados (datos/calidad_preguntas.py)</h2>${errores.length || avisos.length ? `<ul class="nov">${[...errores, ...avisos].map((e) => `<li><span class="chip">${esc(e.control)}</span> ${esc(e.ley)} #${e.i} · ${esc(e.mensaje)} · <small>${esc(e.q)}</small></li>`).join("")}</ul>` : "<p class='muted'>Sin errores ni duplicados.</p>"}</section>
${metricas360(o)}
${adminGencat(o)}
<section class="card"><h2>Fuentes pendientes</h2>${(o.pendientes || []).length ? `<ul class="nov">${o.pendientes.map((x) => `<li><b>${esc(x.campo)}</b>: ${esc(x.motivo)}</li>`).join("")}</ul>` : "<p class='muted'>Ninguna.</p>"}</section>`,
  });
}

// Métricas 360 (perfil de la oposición + registro de fuentes + vigilancia + CoverageEngine): lo que el admin debe vigilar
function metricas360(o) {
  const f = `catalogo/perfiles/${o.id}.json`;
  if (!fs.existsSync(f)) return "";
  const p = JSON.parse(fs.readFileSync(f, "utf8")), c = p.contenido;
  const conFuente = p.temario.filter((t) => t.documentos.length), cubiertos = conFuente.filter((t) => t.cobertura === "CUBIERTO").length;
  const coverage = conFuente.length ? Math.round((100 * conFuente.reduce((a, t) => a + Math.min(1, t.preguntas.TESTLEY_GENERATED / Math.max(1, t.objetivo)), 0)) / conFuente.length) : 0;
  const fu = p.fuentes, sanas = fu.filter((x) => x.verification_status === "OFFICIAL_VERIFIED").length;
  const vg = (fs.existsSync("catalogo/vigilancia-gencat-estado.json") ? JSON.parse(fs.readFileSync("catalogo/vigilancia-gencat-estado.json", "utf8")) : {})[o.id] || {};
  const vb = fs.existsSync("catalogo/vigilancia-estado.json") ? JSON.parse(fs.readFileSync("catalogo/vigilancia-estado.json", "utf8")) : {};
  const sync = [...fu.map((x) => (x.retrieved_at || "").slice(0, 10)), vg.ultimo_ok || "", vb.ultimo_dia || ""].filter(Boolean).sort().pop() || "—";
  const pend = p.temario.flatMap((t) => t.leyes_pendientes.map((l) => `${t.id}: ${l.nombre}`));
  const nec = fs.existsSync(`documentacion/cobertura-${o.id}.json`) ? JSON.parse(fs.readFileSync(`documentacion/cobertura-${o.id}.json`, "utf8")) : null;
  const kpi = (n, l, cls = "") => `<div class="kpi"><span class="kpi-n ${cls}">${n}</span><span class="kpi-l">${l}</span></div>`;
  return `<section class="card" id="metricas-360"><h2>Métricas 360</h2><div class="kpis">${kpi(coverage + " %", `coverage (${cubiertos}/${conFuente.length} temas en objetivo)`)}${kpi(c.TESTLEY_GENERATED, "question_count (TESTLEY_GENERATED)")}${kpi(c.OFFICIAL_EXAM, "official_exam_count")}${kpi(c.REVIEW_REQUIRED, "review_required")}${kpi(c.DEPRECATED, "deprecated")}${kpi(c.OUTDATED, "outdated")}${kpi(`${sanas}/${fu.length}`, "source_health (fuentes OFFICIAL_VERIFIED)", sanas < fu.length || vg.error ? "bad" : "")}${kpi(esc(sync), "last_sync")}</div>
${vg.error ? `<p class="bad">Error de vigilancia: ${esc(vg.error)}</p>` : ""}${pend.length ? `<p class="small">Leyes OFFICIAL_PENDING_REVIEW: ${esc(pend.join(" · "))}</p>` : ""}
${nec ? `<h3>Necesidades de cobertura (CoverageEngine · fábrica ${esc(nec.estado_fabrica)})</h3><p class="small">${nec.total_necesario} preguntas en ${nec.necesidades.length} necesidades${nec.bloqueados.length ? ` · bloqueados: ${esc(nec.bloqueados.map((b) => b.tema).join(", "))}` : ""}</p><ul class="nov">${nec.necesidades.slice(0, 8).map((n) => `<li>${esc(n.texto)}${n.revision_humana ? ' <span class="chip">revisión humana</span>' : ""}</li>`).join("")}</ul>` : ""}
<p class="muted small">Perfil generado el ${esc(p.generado)} desde fuentes verificadas (catalogo/perfiles/${esc(o.id)}.json).</p></section>`;
}

// Admin de oposiciones de la Generalitat (Mossos): fuentes oficiales con su estado, vigilancia, alertas, exámenes y esmenes de la guía
function adminGencat(o) {
  if (!(o.vigilancia && o.vigilancia.web)) return "";
  const reg = fs.existsSync("datos/fuentes-gencat.json") ? JSON.parse(fs.readFileSync("datos/fuentes-gencat.json", "utf8")).documentos : [];
  const est = (fs.existsSync("catalogo/vigilancia-gencat-estado.json") ? JSON.parse(fs.readFileSync("catalogo/vigilancia-gencat-estado.json", "utf8")) : {})[o.id] || {};
  const nov = NOVEDADES.filter((n) => n.oposicion === o.id);
  const guia = reg.find((d) => d.source_type === "GUIA_ESTUDI");
  const ex = o.examenes || [], cuenta = (k) => ex.reduce((t, e) => t + e.preguntes.filter((q) => q.verification_status === k).length, 0);
  const qGuia = o.qs.filter((q) => (LEYPOR[q.ley] || {}).privada);
  return `<section class="card"><h2>Fuentes oficiales (Generalitat)</h2><div class="tabla-scroll"><table class="tabla"><thead><tr><th>Tipo</th><th>Documento</th><th>Publicado</th><th>Descargado</th><th>Estado</th><th>sha256</th></tr></thead><tbody>${reg.map((d) => `<tr><td>${esc(d.source_type)}</td><td><a href="${esc(d.source_url)}" rel="noopener">${esc(d.source_document.slice(0, 110))}</a></td><td>${esc(d.published_at || "—")}</td><td>${esc((d.retrieved_at || "").slice(0, 16))}</td><td>${badgeVS(d.verification_status)}</td><td><code>${esc((d.sha256 || "").slice(0, 10))}</code></td></tr>`).join("")}</tbody></table></div></section>
<section class="card"><h2>Vigilancia y alertas</h2><p>Última comprobación correcta: <b>${esc(est.ultimo_ok || "—")}</b>${est.error ? ` · <span class="bad">Error de ingestión: ${esc(est.error)} (${esc(est.ultimo_error || "")})</span>` : " · sin errores de ingestión"}. Fuente vigilada: <a href="${esc(o.vigilancia.web.convocatoria)}" rel="noopener">página oficial de la convocatoria</a> e <a href="${esc(o.vigilancia.web.indice)}" rel="noopener">índice de acceso</a>.</p>
<ul class="nov">${nov.map((n) => `<li><span class="nov-f">${fmtFecha(n.fecha)}</span> <span class="chip">${esc(TIPO_NOV[n.tipo] || n.tipo)}</span> <a href="${esc(n.url)}" rel="noopener">${esc(n.titulo)}</a> ${badgeVS(n.verification_status || "OFFICIAL_VERIFIED")}</li>`).join("") || "<li class='muted'>Sin publicaciones registradas.</li>"}</ul></section>
<section class="card"><h2>Preguntas oficiales y generadas</h2><div class="kpis"><div class="kpi"><span class="kpi-n">${ex.reduce((t, e) => t + e.preguntes.length, 0)}</span><span class="kpi-l">preguntas OFFICIAL_EXAM (${ex.length} exámenes)</span></div><div class="kpi"><span class="kpi-n">${cuenta("VALID")}</span><span class="kpi-l">oficiales VALID (respaldadas por la guía vigente o actualidad)</span></div><div class="kpi"><span class="kpi-n">${cuenta("REVIEW_REQUIRED")}</span><span class="kpi-l">oficiales a revisar</span></div><div class="kpi"><span class="kpi-n">${cuenta("OUTDATED")}</span><span class="kpi-l">oficiales desfasadas</span></div><div class="kpi"><span class="kpi-n">${qGuia.length}</span><span class="kpi-l">FACTORY_GENERATED publicadas (guía)</span></div></div>
<p class="small">Desfasadas: ${ex.flatMap((e) => e.preguntes.filter((q) => q.verification_status === "OUTDATED").map((q) => `${esc(e.convocatoria)} #${q.n} (${esc(q.nota_vigencia || "")})`)).join(" · ") || "ninguna"}</p></section>
<section class="card"><h2>Guía de estudio: esmenes y cambios</h2>${guia ? `<p>${esc(guia.source_document)} · ${guia.apartats} apartados · sha256 <code>${esc(guia.sha256.slice(0, 12))}</code></p><ul class="nov">${(guia.esmenes || []).map((e) => `<li>${esc(e.tema)} · ${esc(e.lloc)} → ${e.aplicada_a.length ? `aplicada en ${esc(e.aplicada_a.join(", "))}` : badgeVS("OFFICIAL_PENDING_REVIEW")}</li>`).join("")}</ul>${guia.canvis_darrera_revisio ? `<p class="bad">Cambios en la última revisión: ${esc(JSON.stringify(guia.canvis_darrera_revisio))}</p>` : ""}` : "<p class='muted'>Guía no descargada.</p>"}</section>`;
}

// /convocatorias/ solo pinta las más recientes; el resto se carga de datos/convocatorias.json al buscar o filtrar
// (buscador.js). Las fichas de cada convocatoria y las páginas de categoría siguen siendo el enlazado indexable.
const N_CONV_HTML = 60;
const CONVS_REC = [...CONVS].sort((a, b) => (b.fuente.published_at || "").localeCompare(a.fuente.published_at || "") || a.id.localeCompare(b.id));
const convAnios = new Set(CONVS.map(anioConv).filter(Boolean));
const convIni = CONVS.length > N_CONV_HTML ? `Las ${N_CONV_HTML} más recientes de ${fmtN(CONVS.length)} convocatorias. Busca o filtra para ver todas.` : `${CONVS.length} convocatorias`;
fs.writeFileSync(path.join(OUT_TMP, "datos", "convocatorias.json"), JSON.stringify(CONVS_REC.map((v) => tarjetaConv(v, "../"))));
page("convocatorias/", {
  title: convAnios.size === 1 && convAnios.has(ANIO) ? `Convocatorias de oposiciones ${ANIO} y empleo público en España` : "Convocatorias de oposiciones y empleo público en España",
  description: descripcion(`${fmtN(CONVS.length)} convocatorias oficiales de oposiciones y empleo público del Estado, comunidades, ayuntamientos y universidades.`, "Plazas, plazos y enlace a la fuente oficial."),
  wide: true, scripts: ["buscador.js"], crumbs: [["Convocatorias", "convocatorias/"]],
  body: (r) => `<nav class="crumbs"><a href="${r}">Inicio</a> › <span>Convocatorias</span></nav>
<h1>Convocatorias de oposiciones y empleo público</h1>
<p class="lead">Convocatorias detectadas automáticamente cada día en fuentes oficiales. Cada dato muestra la frase literal de la que sale y su procedencia. ${badgeVS("OFFICIAL_PENDING_REVIEW")}</p>
<form class="buscador" action="${r}convocatorias/" role="search"><label class="sr" for="q">Buscar convocatoria</label><input id="q" name="q" type="search" placeholder="Policía local, auxiliar administrativo, Valencia, bombero…" autocomplete="off"><button class="cta" type="submit">Buscar</button></form>
${filtrosHtml(false, CATEGORIAS.filter((c) => catCountConv(c.id)).map((c) => [c.id, c.nombre, catCountConv(c.id)]))}
<p id="res-count" class="muted" aria-live="polite" data-uno="convocatoria" data-varios="convocatorias" data-inicial="${esc(convIni)}">${convIni}</p>
<div class="cards" id="res" data-todas="${r}datos/convocatorias.json" data-total="${CONVS.length}">${CONVS_REC.slice(0, N_CONV_HTML).map((v) => tarjetaConv(v, r)).join("")}</div>
${CONVS.length > N_CONV_HTML ? `<p id="res-mas"><button type="button" class="btn">Ver las ${fmtN(CONVS.length)} convocatorias</button></p>` : ""}
<p id="res-vacio" class="box" hidden>No hay convocatorias con esa búsqueda.</p>
${navPagConv(1, r)}
<p class="muted small">Todas las convocatorias por categoría: ${CATEGORIAS.filter((c) => catCountConv(c.id)).map((c) => `<a href="${r}oposiciones/categoria/${c.id}/">${esc(c.nombre)}</a>`).join(" · ")}.</p>
<p class="muted small">Estado calculado automáticamente; comprueba siempre las bases oficiales enlazadas antes de presentar tu solicitud.</p>`,
});
// Listado paginado en HTML estático: cada convocatoria recibe un enlace rastreable sin depender del JavaScript del buscador.
const N_PAG_CONV = Math.ceil(CONVS_REC.length / N_CONV_HTML);
const rutaPagConv = (n) => (n === 1 ? "convocatorias/" : `convocatorias/pagina-${n}/`);
const navPagConv = (n, r) => N_PAG_CONV > 1 ? `<nav class="paginas" aria-label="Páginas del listado"><span class="muted small">Todas las convocatorias, de la más reciente a la más antigua:</span> ${Array.from({ length: N_PAG_CONV }, (_, i) => i + 1).map((i) => i === n ? `<span aria-current="page">${i}</span>` : `<a href="${r}${rutaPagConv(i)}">${i}</a>`).join(" ")}</nav>` : "";
for (let n = 2; n <= N_PAG_CONV; n++) {
  const xs = CONVS_REC.slice((n - 1) * N_CONV_HTML, n * N_CONV_HTML), desde = (n - 1) * N_CONV_HTML + 1, hasta = desde + xs.length - 1;
  page(rutaPagConv(n), {
    title: `Convocatorias de oposiciones y empleo público · página ${n} de ${N_PAG_CONV}`,
    description: descripcion(`Convocatorias oficiales ${fmtN(desde)} a ${fmtN(hasta)} de ${fmtN(CONVS.length)}, publicadas entre el ${fmtFecha((xs[xs.length - 1].fuente.published_at || "").slice(0, 10))} y el ${fmtFecha((xs[0].fuente.published_at || "").slice(0, 10))}.`, "Plazas, plazos y enlace a la fuente oficial."),
    wide: true, crumbs: [["Convocatorias", "convocatorias/"], [`Página ${n}`, rutaPagConv(n)]],
    body: (r) => `<nav class="crumbs"><a href="${r}">Inicio</a> › <a href="${r}convocatorias/">Convocatorias</a> › <span>Página ${n}</span></nav>
<h1>Convocatorias de oposiciones y empleo público · página ${n}</h1>
<p class="lead">Convocatorias ${fmtN(desde)} a ${fmtN(hasta)} de ${fmtN(CONVS.length)}, de la más reciente a la más antigua. Para buscar por texto o filtrar, usa el <a href="${r}convocatorias/">buscador de convocatorias</a>.</p>
<div class="cards">${xs.map((v) => tarjetaConv(v, r)).join("")}</div>
${navPagConv(n, r)}`,
  });
}
const CONF = (c) => (c >= 0.8 ? "alta" : c >= 0.6 ? "media" : "baja");
const EST_FUENTES = fs.existsSync("ingesta/estado/fuentes-estado.json") ? JSON.parse(fs.readFileSync("ingesta/estado/fuentes-estado.json", "utf8")) : {};
// Calidad SEO: una ficha solo se indexa si aporta datos útiles además del organismo (plazas, plazo, sistema, titulación…)
const SEOQ = JSON.parse(fs.readFileSync("catalogo/seo_calidad.json", "utf8")).convocatoria; // misma puerta que crecimiento/seo.py
const utilConv = (v) => Object.keys(v.datos).filter((k) => !SEOQ.campos_no_utiles.includes(k)).length >= SEOQ.campos_utiles_min;
const estadoConv = (v) => { const f = (EST_FUENTES[v.fuente.fuente_registro] || {}).estado; return ["error", "inaccesible"].includes(f) && v.fuente.tipo !== "BOE" ? "SOURCE_TEMPORARILY_UNAVAILABLE" : v.verification_status || "OFFICIAL_PENDING_REVIEW"; };
for (const v of CONVS) {
  const opRel = OPOS.filter((o) => (v.oposiciones_relacionadas || []).includes(o.id));
  page(`convocatorias/${v.id}/`, {
    noindex: !utilConv(v), lastmod: v.estado_desde,
    crumbs: [["Convocatorias", "convocatorias/"], [v.id, `convocatorias/${v.id}/`]],
    // Denominación + organismo + año; si coincide con otra, fecha de publicación y, en último caso, id del BOE
    title: titulo("", convDenom(v), convSufijo(v, anioConv(v) ? ` ${anioConv(v)}` : "")),
    tituloAlt: [titulo("", convDenom(v), convSufijo(v, ` ${fmtFecha(v.fuente.published_at)}`)), titulo("", convDenom(v), convSufijo(v, ` ${v.fuente.boe_id || v.id}`)), titulo("", convDenom(v), ` · ${v.id}`)],
    description: descConv(v),
    descAlt: [cortar(`${v.id} · ${descConv(v)}`, D_MAX, "…")],
    scripts: ["oposicion.js"],
    body: (r) => {
      const filas = Object.entries(v.datos).filter(([k]) => ETIQ_CONV[k]).map(([k, d]) => `<div class="of-row"><h3>${ETIQ_CONV[k]}</h3><ul class="of-list"><li><span>${esc(typeof d.valor === "number" ? fmtN(d.valor) : d.valor)}</span><details><summary>Texto oficial y procedencia</summary><blockquote>«${esc(d.cita)}»<span class="src"><a href="${esc(d.source_url)}" rel="noopener">${esc(d.source_domain)}</a> · publicado ${fmtFecha(d.published_at)} · descargado ${fmtFecha((d.retrieved_at || "").slice(0, 10))} · confianza ${CONF(d.confidence)} (${d.metodo === "claude" ? "interpretado por IA" : "reglas automáticas"}) · ${badgeVS(d.verification_status)}</span></blockquote></details></li></ul></div>`).join("");
      const relacion = (opRel.length ? opRel : OPOS.filter((o) => o.categoria === v.categoria && o.qs.length)).slice(0, 3);
      return `<nav class="crumbs"><a href="${r}">Inicio</a> › <a href="${r}convocatorias/">Convocatorias</a> › <span>${esc(cortar(convDenom(v), 60, "…"))}</span></nav>
<h1>${esc(convNombre(v))}</h1>
<p class="op-meta"><span class="pill">${esc(opEstado(v))}</span>${v.datos.plazas ? ` <span class="pill">${fmtN(v.datos.plazas.valor)} plaza${v.datos.plazas.valor > 1 ? "s" : ""}</span>` : ""} ${CAT[v.categoria] ? `<a class="pill" href="${r}oposiciones/categoria/${v.categoria}/">${esc(CAT[v.categoria].nombre)}</a>` : ""}</p>
<p class="muted small">${esc(v.titulo)}</p>
<div id="op-accion" data-op="conv-${esc(v.id)}" data-nombre="${esc(convNombre(v))}" data-tipo="convocatoria"></div>
${opRel.length ? `<p class="box">Esta convocatoria corresponde a ${opRel.map((o) => `<a href="${r}oposiciones/${o.id}/"><b>${esc(o.nombre)}</b></a>`).join(" y ")}: temario, tests y simulacros.</p>` : ""}
<section class="card oficial"><div class="of-head"><h2>Datos de la convocatoria</h2>${badgeVS(estadoConv(v))}</div>
${estadoConv(v) === "SOURCE_TEMPORARILY_UNAVAILABLE" ? `<p class="warn small">La fuente oficial no responde desde ${fmtFecha(((EST_FUENTES[v.fuente.fuente_registro] || {}).ultimo_exito || "").slice(0, 10))}. Mostramos el último dato válido.</p>` : ""}
<p class="muted small">Última verificación automática: ${fmtFecha((v.last_verified_at || v.extraido || "").slice(0, 10))}.</p>
${filas || '<p class="muted">No se han podido extraer datos estructurados; consulta el documento oficial.</p>'}
${(v.fuentes_adicionales || []).length ? `<p class="small">También publicada en: ${v.fuentes_adicionales.map((x) => `<a href="${esc(x.source_url)}" rel="noopener">${esc(x.source_domain)}</a>`).join(" · ")}</p>` : ""}
<p class="small">Documento oficial: <a href="${esc(v.fuente.source_url)}" rel="noopener">${esc(v.fuente.boe_id || (v.fuente.dogc_id ? `DOGC · ${v.fuente.dogc_id}` : v.fuente.source_url))}</a> · ${esc(v.fuente.departamento || v.fuente.source_domain)}${v.fuente.epigrafe ? " · " + esc(v.fuente.epigrafe) : ""}</p>
<p class="muted small">${v.revision === "manual" ? "Datos revisados contra el documento oficial" : "Los datos se extraen automáticamente"} y solo se publican si su frase aparece literalmente en el documento oficial. ${esc(v.estado_nota)}</p></section>
${relacion.length ? `<section class="card"><h2>Prepárate con TestLey</h2><p class="muted small">Contenido de preparación de oposiciones de la misma categoría (no es el temario de esta convocatoria).</p><div class="cards">${relacion.map((o) => tarjetaOp(o, r)).join("")}</div></section>` : ""}`;
    },
  });
}

// ---------- ADMIN → Fuentes (estado del motor de ingesta) ----------
{
  const leerJ = (p, d) => (fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf8")) : d);
  const leerL = (p) => (fs.existsSync(p) ? fs.readFileSync(p, "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l)) : []);
  const FU = leerJ("ingesta/fuentes.json", []), EST = leerJ("ingesta/estado/fuentes-estado.json", {}), DOCS = Object.values(leerJ("ingesta/estado/documentos.json", {}));
  const LOGS = fs.existsSync("ingesta/logs") ? fs.readdirSync("ingesta/logs").sort().slice(-2).flatMap((f) => leerL(path.join("ingesta/logs", f))) : [];
  const CAMBIOS = leerL("ingesta/estado/cambios.jsonl").slice(-40).reverse();
  const f2 = (t) => (t ? t.replace("T", " ").replace("Z", " UTC").slice(0, 20) : "—");
  const cls = { ok: "good", error: "bad", inaccesible: "bad", pendiente: "" };
  page("admin/fuentes/", {
    title: "Admin · Fuentes oficiales", description: "Estado del motor de ingesta de fuentes oficiales.", noindex: true, wide: true, scripts: ["admin.js"],
    body: () => `<h1>Admin · Fuentes oficiales</h1>
<p class="muted">Motor de ingesta: fuente → rastreo → descarga → detección de cambios → parseo → extracción → validación → catálogo. Generado el ${f2(new Date().toISOString())}.</p>
<div class="kpis"><div class="kpi"><span class="kpi-n">${FU.length}</span><span class="kpi-l">fuentes</span></div><div class="kpi"><span class="kpi-n">${DOCS.length}</span><span class="kpi-l">documentos</span></div><div class="kpi"><span class="kpi-n">${CONVS.length}</span><span class="kpi-l">convocatorias extraídas</span></div><div class="kpi"><span class="kpi-n">${DOCS.filter((d) => d.extraccion === "pendiente").length}</span><span class="kpi-l">pendientes de extraer</span></div></div>
<section class="card"><h2>Fuentes</h2><div class="tabla-scroll"><table class="tabla"><thead><tr><th>Prioridad</th><th>Fuente</th><th>Tipo · crawler · parser</th><th>Estado</th><th>Último escaneo</th><th>Último éxito</th><th>Próxima ejecución</th><th>Docs</th><th>Último error</th></tr></thead><tbody>
${FU.sort((a, b) => a.prioridad - b.prioridad).map((f) => { const e = EST[f.id] || {}; return `<tr><td>${f.prioridad}</td><td><a href="${esc(f.url.replace("{fecha}", ""))}">${esc(f.nombre)}</a><br><small class="muted">${esc(f.domain)} · cada ${f.frecuencia_horas} h${f.activo ? "" : " · inactiva"}</small></td><td><small>${f.tipo} · ${f.crawler} · ${f.parser}</small></td><td><b class="${cls[e.estado] || ""}">${esc(e.estado || "sin ejecutar")}</b>${e.errores_consecutivos ? `<br><small>${e.errores_consecutivos} fallos seguidos</small>` : ""}</td><td><small>${f2(e.ultimo_escaneo)}</small></td><td><small>${f2(e.ultimo_exito)}</small></td><td><small>${f2(e.proximo_escaneo)}</small></td><td>${e.documentos || 0}</td><td><small>${esc((e.ultimo_error || "").slice(0, 140))}</small></td></tr>`; }).join("")}
</tbody></table></div></section>
<section class="card"><h2>Cambios detectados (últimos ${CAMBIOS.length})</h2><ul class="nov">${CAMBIOS.map((c) => `<li><span class="nov-f">${f2(c.t)}</span> <span class="chip">${esc(c.cambio)}</span> <small>${esc(c.fuente)}</small> <a href="${esc(c.url)}">${esc((c.titulo || c.url).slice(0, 140))}</a></li>`).join("") || "<li>Sin cambios todavía.</li>"}</ul></section>
<section class="card"><h2>Errores recientes</h2><ul class="nov">${LOGS.filter((l) => /error/.test(l.evento)).slice(-30).reverse().map((l) => `<li><span class="nov-f">${f2(l.t)}</span> <span class="chip">${esc(l.evento)}</span> <small>${esc(l.fuente || l.doc || "")}</small> ${esc((l.error || "").slice(0, 200))}</li>`).join("") || "<li>Sin errores.</li>"}</ul></section>
<section class="card"><h2>Últimas ejecuciones</h2><ul class="nov">${LOGS.filter((l) => /fuente_ok|extraccion$/.test(l.evento)).slice(-20).reverse().map((l) => `<li><span class="nov-f">${f2(l.t)}</span> ${esc(l.evento)} <small>${esc(l.fuente || "")}</small> <small class="muted">${esc(JSON.stringify(Object.fromEntries(Object.entries(l).filter(([k]) => !["t", "evento", "fuente"].includes(k)))))}</small></li>`).join("") || "<li>Sin ejecuciones.</li>"}</ul></section>
<section class="card"><h2>Documentos descargados (últimos 40)</h2><div class="tabla-scroll"><table class="tabla"><thead><tr><th>Publicado</th><th>Fuente</th><th>Tipo</th><th>Documento</th><th>Extracción</th></tr></thead><tbody>${DOCS.sort((a, b) => (b.retrieved_at || "").localeCompare(a.retrieved_at || "")).slice(0, 40).map((d) => `<tr><td><small>${esc(d.published_at || "")}</small></td><td><small>${esc(d.fuente)}</small></td><td>${esc(d.tipo)}</td><td><a href="${esc(d.url)}">${esc((d.titulo || d.url).slice(0, 120))}</a></td><td><small>${esc(d.extraccion)}</small></td></tr>`).join("")}</tbody></table></div></section>`,
  });
}

// ---------- Growth OS: artículos publicados, panel de crecimiento y salud del sistema ----------
{
  const leerJ = (p, d) => (fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf8")) : d);
  const leerL = (p) => (fs.existsSync(p) ? fs.readFileSync(p, "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l)) : []);
  const ED = "crecimiento/estado";
  const CONT = fs.existsSync(`${ED}/contenidos`) ? fs.readdirSync(`${ED}/contenidos`).filter((f) => f.endsWith(".json")).map((f) => leerJ(`${ED}/contenidos/${f}`)) : [];
  const JOBS = Object.values(leerJ(`${ED}/jobs.json`, {}));
  const f2 = (t) => (t ? t.replace("T", " ").replace("Z", " UTC").slice(0, 20) : "—");
  // Markdown mínimo y seguro (se escapa todo antes de dar formato)
  const md = (t) => esc(t).split(/\n{2,}/).map((b) => {
    const link = (x) => x.replace(/(https?:\/\/[^\s<)]+)/g, (u) => `<a href="${u}" rel="noopener">${u.length > 70 ? u.slice(0, 67) + "…" : u}</a>`);
    if (b.startsWith("# ")) return "";
    if (b.startsWith("## ")) return `<h2>${b.slice(3)}</h2>`;
    if (/^[•-] /m.test(b)) return `<ul class="of-list">${b.split("\n").map((l) => `<li><span>${link(l.replace(/^[•-] /, ""))}</span></li>`).join("")}</ul>`;
    return `<p>${link(b).replace(/\n/g, "<br>")}</p>`;
  }).join("");
  const ARTS = CONT.filter((c) => c.type === "articulo" && c.status === "PUBLISHED");
  const rutaArt = (c) => { const sl = sinAcentos(c.title).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80); return `noticias/${sl}-${String((c.facts || {}).id || c.id).slice(-8).toLowerCase()}/`; };
  for (const c of ARTS) {
    const h = c.facts || {};
    page(rutaArt(c), {
      title: c.title, description: `${c.title}. Datos oficiales con su fuente y fecha de publicación.`.slice(0, 160), noindex: !(c.seo && c.seo.indexable),
      lastmod: (c.published_at || c.updated_at || C.updated).slice(0, 10), crumbs: [["Noticias", "noticias/"], [c.title.slice(0, 60), rutaArt(c)]],
      schema: { "@context": "https://schema.org", "@type": "NewsArticle", headline: c.title.slice(0, 110), datePublished: c.published_at, dateModified: c.updated_at, inLanguage: "es", isBasedOn: (c.source_urls || [])[0], publisher: { "@type": "Organization", name: C.name } },
      body: (r) => `<nav class="crumbs"><a href="${r}">Inicio</a> › <a href="${r}noticias/">Noticias</a> › <span>${esc(c.title.slice(0, 60))}</span></nav>
<h1>${esc(c.title)}</h1>
<p class="op-verif small">${c.generated_by.startsWith("llm") ? badgeVS("AI_GENERATED") + " Redactado con IA a partir de los datos oficiales y verificado automáticamente." : '<span class="badge-testley">Redactado por TestLey</span> a partir de los datos oficiales.'} Datos: ${badgeVS(h.verification_status)} · Publicado el ${fmtFecha((c.published_at || "").slice(0, 10))}</p>
<article class="art-noticia">${md(c.body)}</article>
${h.url_ficha ? `<p><a class="cta" href="${esc(h.url_oposicion || h.url_ficha)}">Ver la ficha completa</a></p>` : ""}
<p class="muted small">Fuente oficial: ${(c.source_urls || []).map((u) => `<a href="${esc(u)}" rel="noopener">${esc(u)}</a>`).join(", ")}. Si hubiera discrepancia, prevalece siempre el boletín oficial.</p>`,
    });
  }
  page("noticias/", {
    title: "Noticias de convocatorias y oposiciones", noindex: !ARTS.length, crumbs: [["Noticias", "noticias/"]],
    description: "Novedades de convocatorias de oposiciones con sus datos oficiales citados y la fecha de publicación.",
    body: (r) => `<nav class="crumbs"><a href="${r}">Inicio</a> › <span>Noticias</span></nav><h1>Noticias de convocatorias</h1>
${ARTS.length ? `<ul class="nov">${ARTS.sort((a, b) => (b.published_at || "").localeCompare(a.published_at || "")).map((c) => `<li><span class="nov-f">${fmtFecha((c.published_at || "").slice(0, 10))}</span> <a href="${r}${rutaArt(c)}">${esc(c.title)}</a></li>`).join("")}</ul>` : `<p class="muted">Todavía no hay noticias publicadas. Mientras tanto, consulta las <a href="${r}convocatorias/">convocatorias oficiales</a>.</p>`}`,
  });

  // Panel de crecimiento (sin datos personales ni de negocio: esos se cargan con la RPC admin_metricas solo para administradores)
  const EST_C = ["DRAFT", "AI_REVIEW", "HUMAN_REVIEW", "APPROVED", "SCHEDULED", "PUBLISHED", "REJECTED", "ARCHIVED"];
  const REG = leerJ("crecimiento/reglas.json", { reglas: [] }).reglas, CAMP = leerJ("crecimiento/campanas.json", { campanas: [] }).campanas;
  const INF = leerJ(`${ED}/informe-publico.json`, null), COST = leerL(`${ED}/costes.jsonl`), CICLOS = leerL(`${ED}/ciclos.jsonl`).slice(-20).reverse();
  const hoyD = new Date(); const dia = (n) => new Date(hoyD.getTime() + n * 864e5).toISOString().slice(0, 10);
  const franja = (c) => { const d = (c.scheduled_for || "").slice(0, 10); return !d ? "sin fecha" : d <= dia(0) ? "Hoy" : d === dia(1) ? "Mañana" : d <= dia(7) ? "Esta semana" : d <= dia(31) ? "Este mes" : "Más adelante"; };
  const filaC = (c) => `<tr><td><small>${esc((c.scheduled_for || c.created_at || "").slice(0, 16).replace("T", " "))}</small></td><td>${esc(c.type)}</td><td><details><summary>${esc(c.title.slice(0, 90))}</summary><pre class="pre">${esc(c.body)}</pre><p class="small">Fuentes: ${(c.source_urls || []).map((u) => `<a href="${esc(u)}">${esc(u.slice(0, 60))}</a>`).join(", ")} · generado: ${esc(c.generated_by)}${c.model ? " (" + esc(c.model) + ")" : ""} · confianza ${c.confidence}</p><p class="small muted">Revisar: <code>python3 -m crecimiento.cli aprobar ${esc(c.id)}</code> · <code>rechazar ${esc(c.id)} "motivo"</code> · <code>reprogramar ${esc(c.id)} AAAA-MM-DDTHH:MM:00Z</code></p></details></td><td>${esc(c.opposition_id || (c.facts || {}).id || "")}</td><td><small>${esc(c.event_type || "")}</small></td><td><b>${esc(c.status)}</b>${c.publicacion_manual ? '<br><small class="warn">publicar a mano</small>' : ""}${c.status === "REJECTED" ? `<br><small>${esc(((c.history || []).slice(-1)[0] || {}).nota || "")}</small>` : ""}</td></tr>`;
  const tablaC = (L) => L.length ? `<div class="tabla-scroll"><table class="tabla"><thead><tr><th>Fecha</th><th>Canal</th><th>Contenido</th><th>Oposición</th><th>Evento</th><th>Estado</th></tr></thead><tbody>${L.map(filaC).join("")}</tbody></table></div>` : '<p class="muted">Nada.</p>';
  const kpis = (pares) => `<div class="kpis">${pares.map(([n, l]) => `<div class="kpi"><span class="kpi-n">${n}</span><span class="kpi-l">${l}</span></div>`).join("")}</div>`;
  const navAdmin = (r) => `<p class="small"><a href="${r}admin/growth/">Growth</a> · <a href="${r}admin/growth/jobs/">Trabajos</a> · <a href="${r}admin/system/">Sistema</a> · <a href="${r}admin/fuentes/">Fuentes</a> · <a href="${r}admin/preguntas/">Preguntas</a></p>`;
  page("admin/growth/", {
    title: "Admin · Growth", description: "Panel de crecimiento de TestLey.", noindex: true, wide: true, scripts: ["admin-growth.js"],
    body: (r) => `<h1>Admin · Growth</h1>${navAdmin(r)}
<section class="card"><h2>Métricas de negocio</h2><div id="metricas-negocio" data-rpc="admin_metricas"><p class="muted">Solo para administradores: entra con tu cuenta de administrador (tabla <code>admins</code>). Tráfico, registros, activación, premium, MRR, retención, canales, afiliados, referidos y experimentos.</p></div></section>
${kpis(EST_C.map((e) => [CONT.filter((c) => c.status === e).length, e]))}
<section class="card"><h2>Oposiciones con convocatoria nueva · propuestas de actualización</h2>${(() => { const P = fs.existsSync(`${ED}/actualizaciones`) ? fs.readdirSync(`${ED}/actualizaciones`).map((f) => leerJ(`${ED}/actualizaciones/${f}`)) : [];
  return P.length ? `<ul class="nov">${P.map((x) => `<li><span class="chip">${esc(x.estado)}</span> <b>${esc(x.oposicion_nombre)}</b> · nueva: <a href="${esc(x.convocatoria_nueva.url)}">${esc(x.convocatoria_nueva.id)}</a> ${badgeVS(x.convocatoria_nueva.verification_status)} · cambios: ${esc(x.cambios.filter((c) => c.cambia).map((c) => c.campo).join(", ") || "ninguno detectado")}<br><small class="muted">Aplicar con cita literal y fuente guardada; después <code>python3 -m crecimiento.cli propuesta-aplicada ${esc(x.id)}</code></small></li>`).join("")}</ul>` : '<p class="muted">Ninguna. Cuando el BOE publique una convocatoria nueva de una oposición del catálogo aparecerá aquí para revisarla (nunca se aplica sola).</p>'; })()}</section>
<section class="card"><h2>Cola de contenido · revisión humana</h2>${tablaC(CONT.filter((c) => c.status === "HUMAN_REVIEW"))}</section>
<section class="card"><h2>Calendario de contenido</h2>${["Hoy", "Mañana", "Esta semana", "Este mes", "Más adelante"].map((f) => `<h3>${f}</h3>${tablaC(CONT.filter((c) => ["APPROVED", "SCHEDULED", "PUBLISHED"].includes(c.status) && franja(c) === f))}`).join("")}</section>
<section class="card"><h2>Rechazado por la verificación automática</h2>${tablaC(CONT.filter((c) => c.status === "REJECTED").slice(-30))}</section>
<section class="card"><h2>Oportunidades (Growth Analyst)</h2>${INF && INF.oportunidades.length ? `<ul class="nov">${INF.oportunidades.map((o) => `<li><span class="chip">${esc(o.prioridad)}</span> <small>${esc(o.tipo)}</small> ${esc(o.propuesta)}</li>`).join("")}</ul><p class="muted small">Informe ${esc(INF.semana)} · el analista propone; nada se ejecuta sin aprobación.</p>` : '<p class="muted">Sin informe todavía (se genera cada lunes).</p>'}</section>
<section class="card"><h2>Candidatas al catálogo (tipos de plaza con más convocatorias oficiales)</h2>${INF && (INF.candidatas_catalogo || []).length ? `<div class="tabla-scroll"><table class="tabla"><thead><tr><th>Tipo de plaza</th><th>Categoría</th><th>Convocatorias</th><th>Ejemplos oficiales</th></tr></thead><tbody>${INF.candidatas_catalogo.map((x) => `<tr><td>${esc(x.tipo_plaza)}</td><td>${esc(x.categoria)}</td><td>${x.convocatorias}</td><td><small>${x.ejemplos.map((i) => `<a href="${r}convocatorias/${esc(i)}/">${esc(i)}</a>`).join(", ")}</small></td></tr>`).join("")}</tbody></table></div><p class="muted small">Propuestas del analista. Una candidata entra en el catálogo solo tras verificar sus bases y su temario en la fuente oficial.</p>` : '<p class="muted">Sin datos todavía.</p>'}</section>
<section class="card"><h2>Reglas activas</h2><div class="tabla-scroll"><table class="tabla"><thead><tr><th>Regla</th><th>Cuando</th><th>Si</th><th>Entonces</th></tr></thead><tbody>${REG.map((x) => `<tr><td>${esc(x.id)}</td><td>${esc(x.cuando)}</td><td><small>${esc(JSON.stringify(x.si))}</small></td><td><small>${esc(x.entonces.map((a) => a.accion + (a.canales ? "(" + a.canales.join(",") + ")" : "") + (a.modo ? " " + a.modo : "")).join(" · "))}</small></td></tr>`).join("")}</tbody></table></div></section>
<section class="card"><h2>Feature flags</h2><p>${Object.entries(FLAGS).map(([k, v]) => `<span class="chip ${v ? "ok" : "grey"}">${esc(k)}: ${v ? "on" : "off"}</span>`).join(" ")}</p></section>
<section class="card"><h2>Campañas y experimentos</h2><ul class="nov">${CAMP.map((c) => `<li><b>${esc(c.nombre)}</b> · ${esc(c.canal)} · ${esc(c.objetivo)} · ${esc(c.estado)} · utm_campaign=${esc(c.utm.utm_campaign)}</li>`).join("")}</ul><ul class="nov">${EXPS.map((e) => `<li><b>${esc(e.id)}</b> (${esc(e.tipo)}) · ${esc(e.estado)} · ${esc(e.descripcion)}</li>`).join("")}</ul></section>
<section class="card"><h2>Coste de IA (7 días)</h2><p>${INF ? `${INF.llamadas_llm_7d} llamadas · ${INF.coste_llm_7d_eur} € estimados` : `${COST.length} llamadas registradas`}. Detección, clasificación, segmentación y envíos no usan LLM.</p></section>`,
  });
  const filaJ = (j) => `<tr><td><small>${esc(j.type)}</small></td><td><b>${esc(j.status)}</b></td><td>${j.retries}</td><td><small>${f2(j.started_at)}</small></td><td><small>${f2(j.finished_at)}</small></td><td><small>${esc(j.provider || "")}</small></td><td>${j.cost || 0}</td><td><small>${esc((j.event_id || "").slice(0, 8))}</small></td><td><small>${esc((j.error || "").slice(0, 160))}</small></td><td><small><code>cli reintentar/cancelar</code><br>${esc(j.id.slice(0, 40))}</small></td></tr>`;
  page("admin/growth/jobs/", {
    title: "Admin · Trabajos", description: "Cola de trabajos del Growth OS.", noindex: true, wide: true,
    body: (r) => `<h1>Admin · Trabajos</h1>${navAdmin(r)}
${kpis(["pending", "running", "done", "failed", "dead", "sin_proveedor", "cancelled", "skipped"].map((s2) => [JOBS.filter((j) => j.status === s2).length, s2]))}
<p class="muted small">Reintentar, cancelar o reejecutar: <code>python3 -m crecimiento.cli reintentar CLAVE</code> · <code>cancelar CLAVE</code> · <code>reactivar telegram</code> (cuando se configure la credencial), o lanza el workflow «Growth OS» desde GitHub Actions.</p>
${["dead", "failed", "sin_proveedor", "pending"].map((s2) => JOBS.some((j) => j.status === s2) ? `<section class="card"><h2>${s2}</h2><div class="tabla-scroll"><table class="tabla"><thead><tr><th>Tipo</th><th>Estado</th><th>Reintentos</th><th>Inicio</th><th>Fin</th><th>Proveedor</th><th>Coste</th><th>Evento</th><th>Error</th><th>Clave</th></tr></thead><tbody>${JOBS.filter((j) => j.status === s2).slice(-100).map(filaJ).join("")}</tbody></table></div></section>` : "").join("")}
<section class="card"><h2>Últimos terminados</h2><div class="tabla-scroll"><table class="tabla"><thead><tr><th>Tipo</th><th>Estado</th><th>Reintentos</th><th>Inicio</th><th>Fin</th><th>Proveedor</th><th>Coste</th><th>Evento</th><th>Error</th><th>Clave</th></tr></thead><tbody>${JOBS.filter((j) => ["done", "skipped", "cancelled"].includes(j.status)).sort((a, b) => (b.finished_at || "").localeCompare(a.finished_at || "")).slice(0, 60).map(filaJ).join("")}</tbody></table></div></section>`,
  });
  const MET = leerL("ingesta/estado/metricas.jsonl"), mR = MET.filter((m) => m.fase === "rastreo").slice(-1)[0] || {}, mE = MET.filter((m) => m.fase === "extraccion").slice(-1)[0] || {};
  const desf = LEYES.reduce((t, L) => t + L.desfasadas.length, 0);
  page("admin/system/", {
    title: "Admin · Sistema", description: "Salud del sistema de TestLey.", noindex: true, wide: true,
    body: (r) => `<h1>Admin · Sistema</h1>${navAdmin(r)}
<h2>Ingesta</h2>${kpis([[mR.fuentes_activas ?? "—", "fuentes activas"], [mR.fuentes_con_fallo ?? "—", "fuentes con fallo"], [mR.documentos_procesados ?? "—", "documentos procesados (última)"], [mR.documentos_cambiados ?? "—", "documentos cambiados"], [mE.registros_actualizados ?? "—", "registros actualizados"], [mE.pendientes_revision ?? "—", "pendientes de revisión"], [mE.fallos_extraccion ?? "—", "fallos de extracción"], [mR.duracion_s != null ? mR.duracion_s + " s" : "—", "duración del rastreo"]])}
<h2>Calidad</h2>${kpis([[CONVS.length, "convocatorias"], [CONVS.filter((v) => !utilConv(v)).length, "con pocos datos (noindex)"], [CONVS.filter((v) => v.verification_status === "AI_GENERATED_REVIEW_REQUIRED").length, "interpretadas por IA"], [desf, "preguntas desfasadas (retiradas)"], [NQ, "preguntas publicadas"]])}
${desf ? `<section class="card"><h2>Preguntas desfasadas</h2><ul class="nov">${LEYES.flatMap((L) => L.desfasadas.map((q) => `<li>${esc(L.corto)} · art. ${esc(q.art)} · ${esc(q.motivo || "")} (${esc(q.desfasada_el || "")})</li>`)).join("")}</ul></section>` : ""}
<h2>Growth OS</h2>${kpis([[CICLOS.length ? f2(CICLOS[0].t) : "—", "último ciclo"], [JOBS.filter((j) => j.status === "dead").length, "trabajos en dead-letter"], [JOBS.filter((j) => j.status === "sin_proveedor").length, "esperando credencial"], [COST.reduce((t, c) => t + (c.estimated_cost || 0), 0).toFixed(4) + " €", "coste IA acumulado"]])}
<section class="card"><h2>Últimos ciclos del orquestador</h2><ul class="nov">${CICLOS.map((c) => `<li><span class="nov-f">${f2(c.t)}</span> eventos ${c.eventos_leidos} · planificados ${c.trabajos_planificados} · <small>${esc(JSON.stringify(c.trabajos))}</small></li>`).join("") || "<li>Sin ciclos todavía.</li>"}</ul></section>
<section class="card"><h2>Coste por modelo</h2><ul class="nov">${Object.entries(COST.reduce((a, c) => ((a[c.model] = (a[c.model] || 0) + (c.estimated_cost || 0)), a), {})).map(([m, v]) => `<li>${esc(m)}: ${v.toFixed(4)} €</li>`).join("") || "<li>Sin llamadas a LLM.</li>"}</ul></section>`,
  });
  // ---------- Fábrica de preguntas: revisión y métricas (fabrica/, datos/candidatas/) ----------
  const FM = leerJ("fabrica/estado/metricas.json", null), FE = leerJ("fabrica/estado/estado.json", { lotes: [], pausa: null });
  const COLA = fs.existsSync("datos/candidatas") ? fs.readdirSync("datos/candidatas").filter((f) => f.endsWith(".json")).flatMap((f) => leerJ(`datos/candidatas/${f}`, []).map((q) => ({ ...q, ley: f.slice(0, -5) }))) : [];
  const corto = (sl) => (LEYES.find((L) => L.slug === sl) || { corto: sl }).corto;
  const filaQ = (q, ley) => `<tr><td><small>${esc(corto(ley))} · art. ${esc(q.art)}</small></td><td><details><summary>${esc(q.q)}</summary><ol type="a" class="small">${(q.o || []).map((o, k) => `<li${k === q.a ? ' class="good"' : ""}>${esc(o)}</li>`).join("")}</ol><blockquote class="small">«${esc(q.cita || "")}»</blockquote><p class="small">${esc(q.exp || "")}</p></details></td><td><small>${esc(q.tipo || "")}${q.dif ? " · dif. " + q.dif : ""}</small></td><td><small>${esc(q.motivo || "")}</small></td><td><small>${esc(q.lote || q.estado_desde || "")}</small></td></tr>`;
  const tablaQ = (L) => L.length ? `<div class="tabla-scroll"><table class="tabla"><thead><tr><th>Norma</th><th>Pregunta</th><th>Tipo</th><th>Motivo</th><th>Lote / fecha</th></tr></thead><tbody>${L.map(([q, l]) => filaQ(q, l)).join("")}</tbody></table></div>` : '<p class="muted">Ninguna.</p>';
  const revLey = LEYES.flatMap((L) => L.revisar.map((q) => [q, L.slug]));
  page("admin/preguntas/", {
    title: "Admin · Preguntas que requieren revisión", description: "Cola de revisión y métricas de la fábrica de preguntas.", noindex: true, wide: true,
    body: (r) => `<h1>Preguntas que requieren revisión</h1>${navAdmin(r)}
${FE.pausa ? `<p class="warn"><b>GENERATION_PAUSED</b> desde ${esc(FE.pausa.fecha)} (${esc(FE.pausa.lote)}): ${esc(FE.pausa.motivo)}. Corrige la causa y relanza el workflow «Question Factory» con <code>resume</code>.</p>` : ""}
${FM ? kpis([[FM.questions_valid, "VALID publicadas"], [FM.questions_valid_fabrica, "VALID de la fábrica"], [FM.questions_review, "a revisión"], [FM.questions_rejected, "rechazadas"], [FM.questions_outdated, "desfasadas"], [FM.questions_deprecated, "retiradas"], [(FM.validation_rate * 100).toFixed(1) + " %", "tasa de validación"], [(FM.rejection_rate * 100).toFixed(1) + " %", "tasa de rechazo"], [(FM.duplicate_rate * 100).toFixed(1) + " %", "duplicados"], [FM.generation_cost + " $", "coste de generación"]]) : '<p class="muted">La fábrica aún no ha generado ningún lote.</p>'}
<section class="card"><h2>Afectadas por cambios en la ley (REVIEW_REQUIRED, publicadas)</h2>${tablaQ(revLey)}</section>
<section class="card"><h2>Generadas pendientes de revisión humana (no publicadas)</h2>${tablaQ(COLA.filter((q) => q.verification_status === "REVIEW_REQUIRED").map((q) => [q, q.ley]))}<p class="muted small">Para aprobar una: comprobar la cita en el BOE, moverla al final de <code>datos/preguntas-&lt;ley&gt;.json</code> sin <code>verification_status</code> y ejecutar <code>npm run validar</code>.</p></section>
<section class="card"><h2>Desfasadas (OUTDATED / DEPRECATED)</h2>${tablaQ(LEYES.flatMap((L) => L.desfasadas.map((q) => [q, L.slug])))}</section>
<section class="card"><h2>Rechazadas por la validación (últimas 60)</h2>${tablaQ(COLA.filter((q) => q.verification_status === "REJECTED").slice(-60).reverse().map((q) => [q, q.ley]))}</section>
<section class="card"><h2>Lotes de la fábrica</h2>${FE.lotes.length ? `<div class="tabla-scroll"><table class="tabla"><thead><tr><th>Lote</th><th>Fecha</th><th>Modo</th><th>Generadas</th><th>VALID</th><th>Revisión</th><th>Rechazadas</th><th>Duplicadas</th><th>Coste</th><th>Tiempo</th></tr></thead><tbody>${FE.lotes.slice(-40).reverse().map((x) => `<tr><td>${esc(x.id)}</td><td><small>${esc(x.fecha)}</small></td><td>${esc(x.modo)}</td><td>${x.generadas}</td><td>${x.VALID}</td><td>${x.REVIEW_REQUIRED}</td><td>${x.REJECTED}</td><td>${x.duplicadas}</td><td>${x.coste_usd} $</td><td>${x.segundos} s</td></tr>`).join("")}</tbody></table></div>` : '<p class="muted">Sin lotes todavía.</p>'}</section>
${FM ? `<section class="card"><h2>Cobertura por oposición</h2><div class="tabla-scroll"><table class="tabla"><thead><tr><th>Oposición</th><th>Preguntas</th><th>Temas legislativos</th><th>Con preguntas</th><th>Mínimo por tema</th><th>Mediana por tema</th></tr></thead><tbody>${Object.entries(FM.coverage_by_opposition).map(([k, v]) => `<tr><td>${esc(k)}</td><td>${v.preguntas}</td><td>${v.temas_legislativos}</td><td>${v.temas_con_preguntas}</td><td>${v.minimo_por_tema}</td><td>${v.mediana_por_tema}</td></tr>`).join("")}</tbody></table></div></section>` : ""}`,
  });
}

// ---------- Pase opositor (preventa) ----------
page("pase/", {
  title: "Pase Opositor: todas las leyes, simulacros y repaso inteligente",
  description: descripcion("Pase Opositor de TestLey: todas las leyes del temario común, simulacros cronometrados y repaso de fallos.", "3 días de prueba gratis y después 15,99 € al mes."),
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

// ---------- Precios (desde config.json → planes; sin precios en el código) ----------
if (PL.free && PL.premium) page("precios/", {
  title: `Precios: gratis o ${PL.premium.nombre}`, crumbs: [["Precios", "precios/"]],
  description: descripcion(`Qué incluye TestLey gratis y qué añade el ${PL.premium.nombre} (${PL.premium.precio}${PL.premium.prueba_dias ? `, ${PL.premium.prueba_dias} días de prueba gratis` : ""}).`, "Buscar oposiciones y practicar con preguntas de muestra es gratis."),
  schema: faqSchema(FAQ_GENERAL.slice(-1)),
  body: (r) => `<nav class="crumbs"><a href="${r}">Inicio</a> › <span>Precios</span></nav>
<h1>Precios</h1>
<p class="lead">Buscar oposiciones, consultar convocatorias oficiales y practicar es gratis. El ${esc(PL.premium.nombre)} desbloquea la preparación completa.</p>
<div class="planes">
<div class="card plan-card"><h2>${esc(PL.free.nombre)}</h2><p class="price">0 €</p><ul class="check">${planLista(PL.free).map((x) => `<li>${esc(x)}</li>`).join("")}</ul><a class="btn" href="${r}oposiciones/">Empezar gratis</a></div>
<div class="card plan-card destacado"><h2>${esc(PL.premium.nombre)}</h2><p class="price">${esc(PL.premium.precio)}</p>${PL.premium.prueba_dias ? `<p class="muted small">${PL.premium.prueba_dias} días de prueba gratis · cancela cuando quieras</p>` : ""}<ul class="check">${planLista(PL.premium).map((x) => `<li>${esc(x)}</li>`).join("")}</ul>${C.checkoutUrl ? `<a class="cta" id="checkout" href="${C.checkoutUrl}" rel="noopener">Probar ${PL.premium.prueba_dias ? PL.premium.prueba_dias + " días gratis" : "ahora"}</a>` : ""}<p class="small"><a href="${r}pase/#como">¿Ya tienes una clave? Actívala aquí</a></p></div>
</div>
<p class="muted small">Pago seguro con Lemon Squeezy, que actúa como vendedor y gestiona el IVA. Sin permanencia.</p>
${faqHtml(FAQ_GENERAL.slice(-1))}`,
});

// ---------- FAQ general ----------
page("faq/", {
  title: "Preguntas frecuentes", crumbs: [["Preguntas frecuentes", "faq/"]], schema: faqSchema(FAQ_GENERAL),
  description: "Cómo funciona TestLey: de dónde salen los datos oficiales, cómo verificamos las preguntas, qué es gratis y qué incluye el Pase Opositor.",
  body: (r) => `<nav class="crumbs"><a href="${r}">Inicio</a> › <span>Preguntas frecuentes</span></nav><h1>Preguntas frecuentes</h1>${faqHtml(FAQ_GENERAL)}
<h2>Estados de verificación</h2><ul class="of-list">${Object.keys(VS).filter((k) => !k.startsWith("_")).map((k) => `<li>${badgeVS(k)} <span>${esc(VS[k].descripcion)}</span></li>`).join("")}</ul>`,
});

// ---------- Onboarding (tras registrarse o al elegir oposición) ----------
page("bienvenida/", {
  title: "Empieza a preparar tu oposición", noindex: true, scripts: ["plan.js", "bienvenida.js"],
  description: "Cuatro preguntas para crear tu plan de estudio.",
  body: () => `<div id="bienvenida" class="onb"><p class="muted">Cargando…</p></div>`,
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
    JSON.stringify({ leyes: { [L.slug]: L.corto }, arts: Object.fromEntries(L.arts.map((a) => [a.n, { t: a.titulo || "Artículo " + a.n, b: a.bloque || L.corto }])), qs: separarPremium(L.slug, L.qs, L.slug).map(PUBLICO), premium: !!PRIVADO[L.slug] })
  );
// Banco premium fuera de docs/: nunca se publica en la web estática
if (BANCO_PRIVADO) {
  fs.rmSync(OUT_PRIV, { recursive: true, force: true });
  fs.mkdirSync(OUT_PRIV, { recursive: true });
  for (const [clave, qs] of Object.entries(PRIVADO)) fs.writeFileSync(path.join(OUT_PRIV, `${clave}.json`), JSON.stringify({ clave, qs }));
}
// Títulos y descripciones únicos: si varias páginas comparten uno, cada una pasa a su alternativa más específica
for (const [campo, alt, fmt] of [["title", "tituloAlt", conMarca], ["description", "descAlt", (x) => x]]) {
  for (let nivel = 0; nivel < 3; nivel++) {
    const grupos = {};
    for (const p of pages) (grupos[p[campo]] ||= []).push(p);
    let cambios = 0;
    for (const g of Object.values(grupos)) if (g.length > 1) for (const p of g) { const a = (p.opts[alt] || [])[nivel]; if (a) { p[campo] = fmt(a); cambios++; } }
    if (!cambios) break;
  }
}
for (const p of pages) {
  const dest = path.join(OUT, p.route, "index.html");
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, render(p));
}
fs.writeFileSync(
  path.join(OUT, "404.html"),
  `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>No encontrado | ${C.name}</title><link rel="stylesheet" href="${C.basePath}assets/style.css"><body><main class="wrap"><h1>Página no encontrada</h1><p><a class="cta" href="${C.basePath}${LEY.slug}/">Ir al test de la Ley 39/2015</a></p></main></body>`
);
// Sitemaps: solo páginas indexables (sin noindex), repartidas por tipo y enlazadas desde un índice (sitemap.xml)
const idx = pages.filter((p) => !p.noindex);
const SLUGS_LEY = new Set(PUBLICADAS_WEB.map((L) => L.slug));
const tipoSitemap = (r) => (r.startsWith("oposiciones/") ? "oposiciones" : r.startsWith("convocatorias/") ? "convocatorias" : r === "leyes/" || SLUGS_LEY.has(r.split("/")[0]) ? "leyes" : "general");
const SITEMAPS = ["oposiciones", "leyes", "convocatorias", "general"].map((t) => ({ t, ps: idx.filter((p) => tipoSitemap(p.route) === t) })).filter((s) => s.ps.length);
for (const s of SITEMAPS) {
  if (s.ps.length > 50000) throw new Error(`sitemap-${s.t}.xml supera las 50.000 URL`);
  fs.writeFileSync(path.join(OUT, `sitemap-${s.t}.xml`), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${s.ps.map((p) => `  <url><loc>${C.url}${p.route}</loc><lastmod>${p.lastmod}</lastmod></url>`).join("\n")}\n</urlset>\n`);
}
fs.writeFileSync(
  path.join(OUT, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${SITEMAPS.map((s) => `  <sitemap><loc>${C.url}sitemap-${s.t}.xml</loc><lastmod>${s.ps.map((p) => p.lastmod).sort().pop()}</lastmod></sitemap>`).join("\n")}\n</sitemapindex>\n`
);
fs.writeFileSync(path.join(OUT, "robots.txt"), `User-agent: *\nAllow: /\n\nSitemap: ${C.url}sitemap.xml\n`);
fs.writeFileSync(
  path.join(OUT, "llms.txt"),
  `# ${C.name}\n\n> ${C.tagline} Preguntas tipo test de oposiciones cuya respuesta se justifica con la cita literal del texto consolidado del BOE.\n\n## Leyes\n${PUBLICADAS_WEB.map((L) => `- [Test ${L.corto}](${C.url}${L.slug}/): ${L.qs.length} preguntas y los ${L.arts.length} artículos de ${L.nombre}, cada uno en su página.`).join("\n")}\n\n## Oposiciones\n${OPOS.map((o) => `- [${o.nombre}](${C.url}oposiciones/${o.id}/): temario oficial y test.`).join("\n")}\n`
);
fs.writeFileSync(path.join(OUT, ".nojekyll"), "");
if (C.customDomain) fs.writeFileSync(path.join(OUT, "CNAME"), C.customDomain + "\n");
console.log(`Generadas ${pages.length} páginas (${idx.length} indexables) en ${OUT}/`);
