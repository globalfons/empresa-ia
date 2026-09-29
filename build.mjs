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
const CORTO = { constitucion: "Constitución Española", trebep: "TREBEP", "rdl-1-2013": "Ley General de Discapacidad (RDL 1/2013)", "rdl-8-2015": "Ley General de la Seguridad Social (RDL 8/2015)", "lef-1954": "Ley de Expropiación Forzosa", "lo-4-2000": "Ley Orgánica 4/2000 de Extranjería", "lo-2-1986": "Ley de Fuerzas y Cuerpos de Seguridad (LO 2/1986)", "lo-4-2015": "Ley de Seguridad Ciudadana (LO 4/2015)", "lo-6-1984": "Ley de Habeas Corpus (LO 6/1984)", lecrim: "Ley de Enjuiciamiento Criminal", "codigo-penal": "Código Penal", "codigo-civil": "Código Civil", "ley-4-2015": "Estatuto de la víctima (Ley 4/2015)", "ley-5-2014": "Ley de Seguridad Privada (Ley 5/2014)", "ley-8-2011": "Ley de Infraestructuras Críticas (Ley 8/2011)", "lo-7-2021": "Ley Orgánica 7/2021 de datos penales", "ley-31-1995": "Ley de Prevención de Riesgos Laborales", "rd-240-2007": "RD 240/2007 (ciudadanos UE)", "reglamento-armas": "Reglamento de Armas", rgc: "Reglamento General de Circulación", "lo-9-2015": "LO 9/2015 de Personal de la Policía Nacional", "lo-4-2010": "LO 4/2010 Régimen disciplinario de la Policía Nacional", "ley-trafico": "Ley de Tráfico y Seguridad Vial", "rd-207-2024": "RD 207/2024 (estructura del Ministerio del Interior)", "ley-23-2014": "Ley 23/2014 de reconocimiento mutuo penal (UE)" };
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
  L.qs.forEach((q, i) => (q.id = (PREFIJO[n.slug] || n.slug) + "-" + i)); // id por posición: estable aunque se retiren preguntas
  // Estados de la pregunta: VALID (sin campo) · REVIEW_REQUIRED (su artículo cambió; se publica y se revisa) · OUTDATED (la cita ya no está en la ley vigente) · DEPRECATED (retirada a mano)
  L.desfasadas = L.qs.filter((q) => ["DEPRECATED", "OUTDATED"].includes(q.verification_status)); // no se publican (datos/vigilar_leyes.py, revisar_vigencia.py)
  L.revisar = L.qs.filter((q) => q.verification_status === "REVIEW_REQUIRED");
  L.qs = L.qs.filter((q) => !["DEPRECATED", "OUTDATED"].includes(q.verification_status));
  return L;
});
const PUBLICADAS = LEYES.filter((L) => L.qs.length && L.arts.length);
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

function page(route, { title, description, body, schema, noindex, wide, scripts = [], crumbs, lastmod }) {
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
<script>window.TL_CONFIG=${JSON.stringify({ root, supabaseUrl: C.supabaseUrl || "", supabaseAnonKey: C.supabaseAnonKey || "", lsStoreId: C.lsStoreId || "", lsProductId: C.lsProductId || "", pase: !!C.checkoutUrl, opos: OPOS.map((o) => o.id), tutorUrl: C.tutorUrl || "", planes: C.planes || null, flags: FLAGS, experimentos: EXP_ACTIVOS })};</script>
<script src="${root}assets/store.js"></script>
<script src="${root}assets/eventos.js" defer></script>${C.tutorUrl ? `\n<script src="${root}assets/tutor.js" defer></script>` : ""}
${schema ? `<script type="application/ld+json">${JSON.stringify(schema)}</script>` : ""}${crumbs ? `<script type="application/ld+json">${JSON.stringify({ "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [["Inicio", ""], ...crumbs].map(([name, r], i) => ({ "@type": "ListItem", position: i + 1, name, item: C.url + r })) })}</script>` : ""}
</head>
<body>
<header class="top"><div class="wrap">
<a class="brand" href="${root}"><span class="logo" aria-hidden="true">✓</span>${C.name}</a>
<nav class="mainnav"><a href="${root}oposiciones/">Oposiciones</a><a href="${root}convocatorias/">Convocatorias</a><a href="${root}panel/">Mi panel</a><a href="${root}precios/">Precios</a><span id="cuenta-nav"></span></nav>
</div></header>
<main class="wrap${wide ? " wide" : ""}">
${body(root)}
</main>
<footer class="foot"><div class="wrap foot-grid">
<div><p class="brand"><span class="logo" aria-hidden="true">✓</span>${C.name}</p><p>${C.tagline}</p><p class="small">Fuente de los textos: Boletín Oficial del Estado, legislación consolidada. TestLey no está vinculado a ninguna Administración Pública.</p></div>
<div><p><b>Estudiar</b></p><p><a href="${root}oposiciones/">Oposiciones</a><br><a href="${root}${LEY.slug}/">Test Ley 39/2015</a><br><a href="${root}panel/">Mi panel</a><br><a href="${root}ranking/">Ranking</a><br><a href="${root}precios/">Precios y Pase Opositor</a><br><a href="${root}faq/">Preguntas frecuentes</a></p></div>
<div><p><b>Legal</b></p><p><a href="${root}legal/aviso-legal/">Aviso legal</a><br><a href="${root}legal/privacidad/">Privacidad</a><br><a href="${root}legal/condiciones/">Condiciones</a><br><a href="mailto:globalprsx@gmail.com">Contacto</a>${FLAGS.analytics ? `<br><a href="#" id="revocar-analitica">Desactivar analítica</a>` : ""}</p></div>
</div></footer>
${scripts.map((s) => `<script src="${root}assets/${s}" defer></script>`).join("\n")}
</body>
</html>
`;
  pages.push({ route, html, noindex, lastmod: lastmod || C.updated });
}

// ---------- Catálogo de oposiciones ----------
const OPOS = JSON.parse(fs.readFileSync("catalogo/oposiciones.json", "utf8"));
const rutaTema = (o, i) => `oposiciones/${o.id}/tema-${i + 1}/`;
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
    for (const q of L.qs) o.qs.push({ ...q, ley: L.slug, art: `${L.slug}:${q.art}`, artn: q.art });
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
  o.temasCubiertos = o.temario.filter((t, i) => t.tipo !== "no_legislativo" && o.temaInfo[i].nq > 0).length;
  o.pctCob = o.temario.length ? Math.round((100 * o.temasCubiertos) / Math.max(1, o.cobertura.temas_legislativos)) : null;
}
const fraccionTxt = (p) => (Math.abs(p - 1 / 3) < 1e-6 ? "1/3" : Math.abs(p - 0.5) < 1e-6 ? "1/2" : Math.abs(p - 0.25) < 1e-6 ? "1/4" : String(Math.round(p * 100) / 100).replace(".", ","));
const opEstado = (c) => ({ activa: "Activa", proxima: "Próxima", cerrada: "Cerrada", historica: "Histórica" })[c.estado] || c.estado;
const TEMARIO_TIPO = { oficial_publicado: ["Temario oficial publicado", "badge-oficial"], derivado_bases: ["Temario derivado de las bases", "badge-testley"], preparacion: ["Contenido de preparación", "badge-testley"], pendiente: ["Temario pendiente de verificación oficial", "badge-ia"] };
const CATEGORIAS = JSON.parse(fs.readFileSync("catalogo/categorias.json", "utf8"));
const CAT = Object.fromEntries(CATEGORIAS.map((c) => [c.id, c]));
const fmtFecha = (f) => (f ? f.split("-").reverse().join("/") : "");
const sinAcentos = (t) => String(t).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const pctOp = (o) => Math.round((100 * o.temasCubiertos) / Math.max(1, o.cobertura.temas_legislativos));

// Filtros del buscador: nivel de administración, estado de la convocatoria y nivel de estudios (a partir del grupo oficial)
const ADMIN = { estatal: "Estado", autonomica: "Comunidades autónomas", local: "Administración local", universidades: "Universidades", varias: "Varias" };
const NIVEL = { A1: "Grado universitario", A2: "Grado universitario", B: "Técnico Superior", C1: "Bachiller o Técnico", C2: "ESO o equivalente", E: "Sin titulación específica", AP: "Sin titulación específica" };
const nivelDe = (g) => NIVEL[String(g || "").toUpperCase().replace(/^SUBGRUPO\s*/, "")] || "";
const admOp = (o) => ({ estatal: "estatal", seguridad: "estatal", autonomico: "autonomica", local: "local" })[o.ambito] || (CAT[o.categoria] || {}).administracion || "estatal";
const ESTADO_TXT = { activa: "Activa", proxima: "Próxima", cerrada: "Cerrada", historica: "Histórica" };
const filtrosHtml = (conEstudios) => `<div class="filtros" role="group" aria-label="Filtros">
<label>Administración<select class="select filtro" data-f="adm"><option value="">Todas</option>${Object.entries(ADMIN).filter(([k]) => k !== "varias").map(([k, v]) => `<option value="${k}">${v}</option>`).join("")}</select></label>
<label>Estado<select class="select filtro" data-f="est"><option value="">Todos</option>${Object.entries(ESTADO_TXT).map(([k, v]) => `<option value="${k}">${v}</option>`).join("")}</select></label>
${conEstudios ? `<label>Nivel de estudios<select class="select filtro" data-f="niv"><option value="">Todos</option>${[...new Set(Object.values(NIVEL))].map((v) => `<option value="${esc(v)}">${esc(v)}</option>`).join("")}</select></label>` : ""}
</div>`;
const tarjetaOp = (o, r) => `<a class="card op-card" href="${r}oposiciones/${o.id}/" data-cat="${o.categoria}" data-adm="${admOp(o)}" data-est="${o.estado}" data-niv="${esc(nivelDe(o.grupo))}" data-q="${esc(sinAcentos([o.nombre, o.organismo, o.categoria_nombre, o.grupo, o.territorio].join(" ")))}"><span class="tag">${CAT[o.categoria].icono} ${esc(o.categoria_nombre)}${o.grupo ? ` · ${esc(o.grupo)}` : ""} · ${esc(opEstado(o.convocatoria))}</span><strong>${esc(o.nombre)}</strong><span class="muted small">${esc(o.organismo)}</span><span>${o.convocatoria.plazas ? fmtN(o.convocatoria.plazas) + " plazas · " : ""}${o.temario.length ? `Temario: ${o.temario.length} temas` : "Temario pendiente de verificación oficial"} · ${fmtN(o.qs.length)} preguntas</span>${o.temario.length ? `<span class="covbar" title="Test disponible en ${o.temasCubiertos} de ${o.cobertura.temas_legislativos} temas de legislación"><i style="width:${Math.max(2, o.pctCob)}%"></i></span>` : ""}<span class="card-foot">Fuente oficial: ${esc(o.convocatoria.url_oficial.includes("boe.es") ? "BOE" : "web oficial")} · verificado ${fmtFecha(o.actualizado)}</span></a>`;

const catCount = (id) => OPOS.filter((o) => o.categoria === id).length;
const chipsCat = (r, activa) => `<div class="cat-chips">${CATEGORIAS.map((c) => `<a class="cat-chip${activa === c.id ? " on" : ""}${catCount(c.id) || catCountConv(c.id) ? "" : " empty"}" href="${r}oposiciones/categoria/${c.id}/" data-cat="${c.id}">${c.icono} ${esc(c.nombre)} <b>${catCount(c.id) || (catCountConv(c.id) ? "" : "·")}</b></a>`).join("")}</div>`;
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
// + cambios detectados en convocatorias automáticas seguidas por usuarios (ingesta/extraer.py → catalogo/novedades-convocatorias.json)
const NOVEDADES = ["catalogo/novedades.json", "catalogo/novedades-convocatorias.json"].flatMap((f) => (fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, "utf8")) : []));
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

// ---------- Catálogo nacional de convocatorias (motor de ingesta: ingesta/ → catalogo/convocatorias/) ----------
const CONVS = fs.existsSync("catalogo/convocatorias") ? fs.readdirSync("catalogo/convocatorias").filter((f) => f.endsWith(".json")).map((f) => JSON.parse(fs.readFileSync(path.join("catalogo/convocatorias", f), "utf8"))) : [];
CONVS.sort((a, b) => (b.fuente.published_at || "").localeCompare(a.fuente.published_at || ""));
const convNombre = (v) => {
  const d = v.datos.denominacion && v.datos.denominacion.valor;
  return d ? `${d.charAt(0).toUpperCase()}${d.slice(1)}${v.organismo ? " · " + v.organismo : ""}` : v.titulo.replace(/^Resolución de [^,]+, /, "").slice(0, 140);
};
const tarjetaConv = (v, r) => `<a class="card op-card conv-card" href="${r}convocatorias/${v.id}/" data-cat="${v.categoria}" data-adm="${v.administracion || ""}" data-est="${v.estado}" data-niv="${esc(nivelDe((v.datos.grupo || {}).valor))}" data-q="${esc(sinAcentos([v.titulo, v.organismo, v.territorio, (v.datos.denominacion || {}).valor || "", CAT[v.categoria] ? CAT[v.categoria].nombre : ""].join(" ")))}"><span class="tag">${CAT[v.categoria] ? CAT[v.categoria].icono + " " + esc(CAT[v.categoria].nombre) : ""} · ${fmtFecha(v.fuente.published_at)}${v.datos.plazas ? ` · ${fmtN(v.datos.plazas.valor)} plaza${v.datos.plazas.valor > 1 ? "s" : ""}` : ""}</span><strong>${esc(convNombre(v))}</strong><span>${esc(v.territorio || "")}</span></a>`;
const catCountConv = (id) => CONVS.filter((v) => v.categoria === id).length;
const ETIQ_CONV = { denominacion: "Plaza", plazas: "Plazas", grupo: "Grupo/subgrupo", sistema_selectivo: "Sistema selectivo", plazo_solicitudes: "Plazo de solicitudes", titulacion: "Titulación", pruebas: "Pruebas", temario: "Temario", boletin_bases: "Bases", organismo: "Organismo", territorio: "Territorio" };

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
  title: `${C.name}: todas las oposiciones de España, en un solo lugar`,
  description: `Encuentra tu convocatoria entre ${fmtN(CONVS.length)} convocatorias oficiales, organiza tu estudio y practica con ${fmtN(NQ)} preguntas citadas del BOE y simulacros como el examen real.`,
  wide: true, schema: faqSchema(FAQ_GENERAL),
  body: (r) => `
<section class="hero">
  <div class="hero-copy">
    <span class="pill">${fmtN(CONVS.length)} convocatorias oficiales · Actualizado ${fmtFecha(C.updated)}</span>
    <h1>Todas las oposiciones de España, <em>en un solo lugar</em></h1>
    <p class="lead">Encuentra tu convocatoria, organiza tu estudio, practica con tests y prepara tu examen con un plan adaptado a ti.</p>
    ${buscador(r)}
    <p class="hero-ctas"><a class="cta" href="${r}oposiciones/" data-exp="cta-hero" data-var-a="Buscar mi oposición" data-var-b="Encontrar mi oposición gratis">Buscar mi oposición</a> <a class="cta alt" href="#como">Ver cómo funciona</a></p>
    <p class="muted small">Gratis para empezar · Sin publicidad · Datos oficiales con su fuente</p>
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
    <div class="demo-float"><span class="kicker">Tu sesión de hoy</span><b>35 min</b><span class="small">Tema 7 · 20 preguntas · repasar fallos</span></div>
  </div>
</section>

<section class="trust">
  <div><b>${fmtN(CONVS.length)}</b><span>convocatorias oficiales</span></div>
  <div><b>${OPOS.length}</b><span>oposiciones con temario y tests</span></div>
  <div><b>${fmtN(NQ)}</b><span>preguntas verificadas</span></div>
  <div><b>${fmtN(NART)}</b><span>artículos con su texto oficial</span></div>
  <div><b>100 %</b><span>de datos oficiales con su fuente</span></div>
</section>

<section class="problema">
  <h2>Preparar una oposición no debería empezar por buscar en diez webs</h2>
  <div class="cards three">
    <div class="card"><span class="f-ico">🔎</span><strong>La información está dispersa</strong><span>Cada convocatoria se publica en un boletín distinto: BOE, boletines autonómicos, provinciales, webs de cada organismo.</span></div>
    <div class="card"><span class="f-ico">❓</span><strong>No sabes si es fiable</strong><span>Temarios desactualizados, preguntas sin fuente, plazos copiados de otra web que ya no coinciden con el boletín.</span></div>
    <div class="card"><span class="f-ico">🧭</span><strong>No sabes por dónde empezar</strong><span>Qué estudiar hoy, cuánto te falta y si llegas a la fecha del examen.</span></div>
  </div>
</section>

<section class="solucion">
  <h2>TestLey lo reúne y lo ordena por ti</h2>
  <ol class="steps big">
    <li><b>Descubre tu oposición.</b> Buscador nacional con convocatorias leídas cada día de las fuentes oficiales.</li>
    <li><b>Entiende la convocatoria.</b> Plazas, requisitos, plazos y pruebas, cada dato con su frase literal del boletín.</li>
    <li><b>Prepara el temario.</b> Temario por temas y la legislación de cada uno con su texto oficial.</li>
    <li><b>Practica.</b> Tests en los que cada respuesta cita el artículo, y simulacros como el examen real.</li>
    <li><b>Detecta tus puntos débiles y sigue tu progreso.</b> Nota orientativa, dominio por tema y un plan que se adapta a tus resultados.</li>
    <li><b>Recibe avisos importantes.</b> Sigue tu convocatoria y te avisamos cuando se publique algo.</li>
  </ol>
</section>

<section class="how" id="como">
  <h2>Cómo funciona</h2>
  <ol class="steps">
    <li><b>Busca</b> tu oposición o convocatoria por nombre, organismo o provincia.</li>
    <li><b>Elige</b> tu oposición: cuéntanos tu fecha de examen, tus horas y tu nivel.</li>
    <li><b>Estudia</b> cada día la sesión que te propone tu panel: temas, preguntas y repaso de fallos.</li>
    <li><b>Mide</b> tu nivel con simulacros y mira cómo evoluciona tu nota.</li>
  </ol>
  <p><a class="cta" href="${r}oposiciones/">Buscar mi oposición</a> ${C.supabaseUrl ? `<a class="cta alt" href="${r}cuenta/">Crear cuenta gratis</a>` : ""}</p>
</section>

<section>
  <h2>Busca tu oposición</h2>
  <div class="cat-grid">${CATEGORIAS.map((c) => `<a class="cat-card${catCount(c.id) || catCountConv(c.id) ? "" : " soon"}" href="${r}oposiciones/categoria/${c.id}/"><span class="cat-ico">${c.icono}</span><strong>${esc(c.nombre)}</strong><span>${[catCount(c.id) ? `${catCount(c.id)} con tests` : "", catCountConv(c.id) ? `${fmtN(catCountConv(c.id))} convocatorias` : ""].filter(Boolean).join(" · ") || "En incorporación"}</span></a>`).join("")}</div>
  <h3>Oposiciones con más plazas</h3>
  <div class="cards">${OPOS.slice(0, 6).map((o) => tarjetaOp(o, r)).join("")}</div>
</section>

<section class="features">
  <h2>Preparación, estadísticas y avisos</h2>
  <div class="cards three">
    <div class="card"><span class="f-ico">📜</span><strong>Tests con la respuesta citada</strong><span>Cada respuesta muestra la frase exacta del artículo del BOE. Un validador comprueba cada cita contra el texto vigente.</span></div>
    <div class="card"><span class="f-ico">⏱️</span><strong>Simulacros como el examen</strong><span>Preguntas, tiempo, opciones y penalización de tu convocatoria, con análisis de errores y comparación con tus simulacros anteriores.</span></div>
    <div class="card"><span class="f-ico">📅</span><strong>Plan de estudio adaptativo</strong><span>Tu sesión de cada día según tu fecha de examen, tus horas y tus fallos. Se recalcula con cada test.</span></div>
    <div class="card"><span class="f-ico">📊</span><strong>Estadísticas y errores</strong><span>Nota orientativa, dominio por tema, preguntas falladas y favoritas, racha y objetivos semanales.</span></div>
    <div class="card"><span class="f-ico">🔔</span><strong>Alertas de tu convocatoria</strong><span>Sigue una oposición o convocatoria y verás en tu panel las nuevas publicaciones oficiales: listas, fechas, modificaciones.</span></div>
    <div class="card"><span class="f-ico">🤖</span><strong>Tutor IA ${C.tutorUrl ? "" : '<span class="chip grey">Próximamente</span>'}</strong><span>Explica preguntas y artículos a partir del texto oficial. Todo lo que redacta la IA se marca como tal y nunca se presenta como información oficial.</span></div>
  </div>
</section>

${PL.premium ? `<section class="premium-cta card">
  <div><h2>${esc(PL.premium.nombre)}</h2><p class="price">${esc(PL.premium.precio)}${PL.premium.prueba_dias ? ` <span class="muted small">· ${PL.premium.prueba_dias} días de prueba gratis</span>` : ""}</p>
  <ul class="check">${planLista(PL.premium).map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>
  <p><a class="cta" href="${r}precios/">Ver planes</a></p>
</section>` : ""}

${faqHtml(FAQ_GENERAL)}

<section class="final-cta">
  <h2>Empieza hoy: busca tu oposición</h2>
  ${buscador(r)}
  <p class="muted small">También puedes consultar las <a href="${r}leyes/">${PUBLICADAS.length} leyes con test</a> o empezar con el <a href="${r}${LEY.slug}/">test gratis de la Ley 39/2015</a>.</p>
</section>`,
});

// Índice de leyes (antes listado en la portada)
page("leyes/", {
  title: "Leyes con test para oposiciones (texto oficial del BOE)", wide: true, crumbs: [["Leyes", "leyes/"]],
  description: `${PUBLICADAS.length} leyes con test y su texto consolidado del BOE artículo por artículo: ${fmtN(NQ)} preguntas con la respuesta citada.`,
  body: (r) => `<nav class="crumbs"><a href="${r}">Inicio</a> › <span>Leyes</span></nav>
<h1>Leyes con test</h1>
<p class="lead">Cada ley con su texto consolidado del BOE, una página por artículo y preguntas cuya respuesta cita el artículo.</p>
<div class="cards">${PUBLICADAS.map((L) => `<a class="card" href="${r}${L.slug}/"><span class="tag">${fmtN(L.qs.length)} preguntas</span><strong>${esc(L.corto)}</strong><span>${fmtN(L.arts.length)} artículos · ${esc(L.id)}</span></a>`).join("")}</div>
${LEYES.filter((L) => !L.qs.length).length ? `<h2>En preparación</h2><ul>${LEYES.filter((L) => !L.qs.length).map((L) => `<li>${esc(L.nombre)}</li>`).join("")}</ul>` : ""}`,
});

// ---------- Panel, ranking y cuenta ----------
page("panel/", {
  title: "Mi panel de progreso", description: "Tu progreso en TestLey: nota orientativa, dominio por título, puntos débiles, racha y logros.", noindex: true, wide: true,
  scripts: ["plan.js", "avisos.js", "panel.js"],
  body: () => `<div class="ctx-bar"><label class="muted" for="ctx">Estoy preparando</label><select id="ctx" class="select">${OPOS.map((o) => `<option value="${o.id}">${esc(o.nombre)} (${esc(o.grupo)})</option>`).join("")}${PUBLICADAS.map((L) => `<option value="${L.slug}">Solo ${esc(L.corto)}</option>`).join("")}</select></div><div id="panel" data-ley="${LEY.slug}"><p class="muted">Cargando tu progreso…</p></div>`,
});
page("errores/", {
  title: "Mis errores", description: "Las preguntas que has fallado, para repasarlas.", noindex: true, wide: true, scripts: ["errores.js"],
  body: (r) => `<nav class="crumbs"><a href="${r}">Inicio</a> › <a href="${r}panel/">Mi panel</a> › <span>Mis errores</span></nav><h1>Mis errores</h1>
<div class="ctx-bar"><label class="muted" for="ctx">Oposición o ley</label><select id="ctx" class="select">${OPOS.filter((o) => o.qs.length).map((o) => `<option value="${o.id}">${esc(o.nombre)}</option>`).join("")}${PUBLICADAS.map((L) => `<option value="${L.slug}">Solo ${esc(L.corto)}</option>`).join("")}</select></div>
<div id="errores"><p class="muted">Cargando tus errores…</p></div>`,
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
  wide: true, crumbs: [["Oposiciones", "oposiciones/"]],
  scripts: ["buscador.js"],
  body: (r) => `<nav class="crumbs"><a href="${r}">Inicio</a> › <span>Oposiciones</span></nav>
<h1>Encuentra tu oposición y empieza a prepararla</h1>
<p class="lead">Oposiciones con temario, tests y simulacros, y ${fmtN(CONVS.length)} <a href="${r}convocatorias/">convocatorias oficiales</a> de todas las administraciones. Cada dato oficial enlaza a su fuente y muestra el texto literal del que sale.</p>
${buscador(r)}
${filtrosHtml(true)}
${chipsCat(r, "")}
<p id="res-count" class="muted" aria-live="polite">${OPOS.length} oposiciones</p>
<div class="cards" id="res">${OPOS.map((o) => tarjetaOp(o, r)).join("")}</div>
<p id="res-vacio" class="box" hidden>No hay ninguna oposición verificada con esa búsqueda todavía. Escríbenos a <a href="mailto:globalprsx@gmail.com">globalprsx@gmail.com</a> y la añadimos a la cola a partir de su convocatoria oficial.</p>
<p id="res-conv" class="box" hidden>¿No encuentras tu oposición? Busca también entre las <a href="${r}convocatorias/">${fmtN(CONVS.length)} convocatorias oficiales</a> detectadas en el BOE.</p>
<h2>Categorías en incorporación</h2>
<p class="muted small">Estas categorías aún no tienen oposiciones con temario y tests verificados. Mostramos sus convocatorias oficiales mientras las incorporamos; nunca rellenamos con datos sin fuente.</p>
<div class="cat-grid">${CATEGORIAS.filter((c) => !catCount(c.id)).map((c) => `<a class="cat-card soon" href="${r}oposiciones/categoria/${c.id}/"><span class="cat-ico">${c.icono}</span><strong>${esc(c.nombre)}</strong><span>${catCountConv(c.id) ? `${fmtN(catCountConv(c.id))} convocatorias · ` : ""}En incorporación</span></a>`).join("")}</div>
<div class="box"><strong>¿Cómo elegimos qué publicar?</strong> Una oposición entra en el catálogo con temario y tests cuando hemos leído su convocatoria en la fuente oficial. Si todavía no hay convocatoria o no hemos podido verificarla, la marcamos como «en incorporación»: preferimos un catálogo más pequeño antes que datos inventados.</div>`,
});
for (const c of CATEGORIAS) {
  const lista = OPOS.filter((o) => o.categoria === c.id);
  const convs = CONVS.filter((v) => v.categoria === c.id);
  page(`oposiciones/categoria/${c.id}/`, {
    title: `Oposiciones de ${c.nombre}: convocatorias, temario y tests`,
    description: `${c.descripcion} ${lista.length ? `${lista.length} oposición${lista.length > 1 ? "es" : ""} con convocatoria oficial verificada, temario y tests.` : "Próximamente en TestLey."}`,
    noindex: !lista.length && !convs.length, wide: true, crumbs: [["Oposiciones", "oposiciones/"], [c.nombre, `oposiciones/categoria/${c.id}/`]],
    body: (r) => `<nav class="crumbs"><a href="${r}">Inicio</a> › <a href="${r}oposiciones/">Oposiciones</a> › <span>${esc(c.nombre)}</span></nav>
<h1>${c.icono} Oposiciones de ${esc(c.nombre)}</h1>
<p class="lead">${esc(c.descripcion)}</p>
${chipsCat(r, c.id)}
${lista.length
  ? `<div class="cards">${lista.map((o) => tarjetaOp(o, r)).join("")}</div>`
  : `<div class="box"><span class="chip grey">En incorporación</span> <strong>Todavía no hay oposiciones de ${esc(c.nombre)} con temario y tests.</strong> Si preparas una de esta categoría, escríbenos a <a href="mailto:globalprsx@gmail.com">globalprsx@gmail.com</a> y la priorizamos.</div>`}
${convs.length ? `<h2>Convocatorias oficiales recientes (${convs.length})</h2><div class="cards">${convs.slice(0, 30).map((v) => tarjetaConv(v, r)).join("")}</div>${convs.length > 30 ? `<p><a class="cta alt" href="${r}convocatorias/?cat=${c.id}">Ver las ${convs.length} convocatorias</a></p>` : ""}` : ""}`,
  });
}
const ETIQ = { grupo: "Grupo y subgrupo", plazas: "Plazas", plazas_libres: "Plazas de acceso libre", sistema_selectivo: "Sistema selectivo", temario_referencia: "Norma que fija el temario", plazas_reservadas: "Plazas reservadas", titulacion: "Titulación", requisitos: "Requisitos", plazo_solicitudes: "Plazo de solicitudes", pruebas: "Pruebas y examen" };
function oficialHtml(o) {
  const dato = (d) => {
    const f = o.fuentes[d.fuente];
    const citas = d.citas || [d.cita];
    return `<li><span>${esc(typeof d.valor === "number" ? fmtN(d.valor) : d.valor)}</span>${d.calculo === "suma" ? ' <span class="muted small">(total calculado sumando las cifras oficiales)</span>' : ""}<details><summary>Texto oficial</summary><blockquote>${citas.map((x) => `«${esc(x)}»`).join("<br>")}<span class="src"><a href="${esc(f.url)}" rel="noopener">${esc(f.id || f.titulo)}</a> · publicado el ${fmtFecha(f.fecha_publicacion)}</span></blockquote></details></li>`;
  };
  const anc = { plazas: "plazas", requisitos: "requisitos", pruebas: "pruebas", titulacion: o.oficial.requisitos ? "" : "requisitos" };
  const filas = Object.keys(o.oficial).map((k) => `<div class="of-row"${anc[k] ? ` id="${anc[k]}"` : ""}><h3>${ETIQ[k] || esc(k)}</h3><ul class="of-list">${(Array.isArray(o.oficial[k]) ? o.oficial[k] : [o.oficial[k]]).map(dato).join("")}</ul></div>`).join("");
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
  const datosOp = { leyes: o.leyes, arts: o.arts, qs: o.qs, temario: o.temario.map((t, i) => ({ i, b: t.bloque, n: t.tema, t: t.titulo, tipo: t.tipo, nq: o.temaInfo[i].nq, leyes: t.normas.filter((id) => PUB[id]).map((id) => PUB[id].slug), normas: t.normas.map((id) => (NORMAS[id] || { nombre: id }).nombre) })) };
  fs.mkdirSync(path.join(OUT_TMP, "datos"), { recursive: true });
  fs.writeFileSync(path.join(OUT_TMP, "datos", `${o.id}.json`), JSON.stringify(datosOp));
  const convsOp = CONVS.filter((v) => (v.oposiciones_relacionadas || []).includes(o.id));
  const nov = NOVEDADES.filter((n) => n.oposicion === o.id);
  const fechasExamen = nov.filter((n) => n.tipo === "fecha_examen");
  const ultimaVerif = [o.actualizado, ...convsOp.map((v) => (v.last_verified_at || "").slice(0, 10))].filter(Boolean).sort().pop();
  const V1 = (k) => { const d = o.oficial[k]; return d ? (Array.isArray(d) ? d[0] : d) : null; };
  const refConv = `${c.referencia} (${o.fuentes.convocatoria ? o.fuentes.convocatoria.id : "fuente oficial"})`;
  // FAQ: solo afirmaciones que salen de datos oficiales citados o del propio catálogo (con su fuente)
  const faq = [
    V1("plazas") && [`¿Cuántas plazas se convocan en ${o.nombre}?`, `${fmtN(V1("plazas").valor)} plazas${V1("plazas").calculo === "suma" ? " (suma de las cifras oficiales por turno)" : ""}, según la ${refConv}.`],
    V1("titulacion") && [`¿Qué titulación se exige?`, `${V1("titulacion").valor}. Fuente: ${refConv}.`],
    V1("plazo_solicitudes") && [`¿Cuál es el plazo para presentar la solicitud?`, `${V1("plazo_solicitudes").valor}. Fuente: ${refConv}.`],
    V1("sistema_selectivo") && [`¿Cuál es el sistema selectivo?`, `${V1("sistema_selectivo").valor}. Fuente: ${refConv}.`],
    [`¿Cuándo es el examen?`, fechasExamen.length ? `La última publicación oficial sobre fechas es «${fechasExamen[fechasExamen.length - 1].titulo}» (${fmtFecha(fechasExamen[fechasExamen.length - 1].fecha)}).` : "Todavía no hay una fecha de examen publicada oficialmente. La mostraremos en esta página en cuanto aparezca en el boletín oficial; si sigues la convocatoria, te avisaremos."],
    o.temario.length ? [`¿Cuántos temas tiene el temario?`, `${o.temario.length} temas (${(TEMARIO_TIPO[o.temario_tipo] || ["Temario"])[0].toLowerCase()}). Fuente: ${refConv}.`] : [`¿Cuál es el temario?`, "El temario oficial está pendiente de verificación: todavía no lo hemos contrastado con la fuente oficial, así que no lo mostramos."],
    o.qs.length && [`¿Cómo puedo preparar ${o.nombre} con TestLey?`, `Con ${fmtN(o.qs.length)} preguntas de las leyes del temario, cada una con la cita literal del BOE que la justifica${sim ? `, y simulacros de ${sim.preguntas} preguntas en ${sim.minutos} minutos` : ""}. Tu panel te propone cada día qué estudiar según tu fecha de examen y tus fallos.`],
  ].filter(Boolean);
  const leyesOp = [...new Set(o.temario.flatMap((t) => t.normas).concat((o.preparacion || {}).normas || []))].map((id) => NORMAS[id] || { id, nombre: id });
  const seccionesNav = [["convocatoria", "Convocatoria"], ["requisitos", "Requisitos"], ["plazas", "Plazas"], ["fechas", "Fechas"], ["temario", "Temario"], ["pruebas", "Pruebas"], ["legislacion", "Legislación"], ["documentacion", "Documentación oficial"], ["tests", "Tests"], ["simulacros", "Simulacros"], ["faq", "Preguntas frecuentes"]];
  page(`oposiciones/${o.id}/`, {
    title: `${o.nombre}${o.grupo ? ` (${o.grupo})` : ""}: convocatoria, temario y test`,
    description: `${o.nombre}: convocatoria oficial${c.plazas ? `, ${fmtN(c.plazas)} plazas` : ""}, requisitos, pruebas${o.temario.length ? `, temario de ${o.temario.length} temas` : ""} y tests con la respuesta citada del BOE.`,
    scripts: ["test.js", "oposicion.js"], lastmod: ultimaVerif, crumbs: [["Oposiciones", "oposiciones/"], [o.categoria_nombre, `oposiciones/categoria/${o.categoria}/`], [o.nombre, `oposiciones/${o.id}/`]],
    schema: [{ "@context": "https://schema.org", "@type": "Course", name: `Preparación ${o.nombre}`, description: `Preparación de la oposición ${o.nombre} con tests citados del BOE.`, inLanguage: "es", provider: { "@type": "Organization", name: C.name, url: C.url }, isBasedOn: o.fuente_temario }, faqSchema(faq)],
    body: (r) => {
      const [tLbl, tCls] = TEMARIO_TIPO[o.temario_tipo] || ["Temario", "badge-testley"];
      const pend = (o.pendientes || []).length ? `<section class="card pendiente"><h2>⚠️ Información pendiente de verificación oficial</h2><ul>${o.pendientes.map((x) => `<li><b>${esc(x.campo.replace(/_/g, " "))}:</b> ${esc(x.motivo)}${x.fuente_prevista ? ` <a href="${esc(x.fuente_prevista)}" rel="noopener">Fuente oficial prevista</a>` : ""}</li>`).join("")}</ul><p class="muted small">${badgeVS("OFFICIAL_PENDING_REVIEW")} No mostramos datos sin verificar como oficiales. Los actualizaremos en cuanto los contrastemos con la fuente oficial.</p></section>` : "";
      const prep = o.preparacion ? `<section class="card"><div class="of-head"><h2>Contenido de preparación</h2><span class="badge-testley">No oficial</span></div><p>${esc(o.preparacion.descripcion)}</p><div class="chips">${o.preparacion.normas.map((id) => PUB[id] ? `<a class="chip ok" href="${r}${PUB[id].slug}/">${esc(PUB[id].corto)}</a>` : "").join(" ")}</div></section>` : "";
      const cobertura = o.temario.length ? `<div class="card"><h2>Cobertura de TestLey</h2>
<div class="covbar big"><i style="width:${Math.max(2, pct)}%"></i></div>
<p>Test disponible en <b>${o.temasCubiertos} de ${o.cobertura.temas_legislativos}</b> temas de legislación (${pct} %). ${o.cobertura.temas_no_legislativos ? `Los ${o.cobertura.temas_no_legislativos} temas no legislativos (informática, ciencias sociales, lengua…) se añadirán como contenido de preparación con su fuente.` : ""}</p>
<p class="muted small">Publicamos leyes nuevas cada semana por orden de impacto en las oposiciones del catálogo. Esta página se actualiza sola.</p></div>` : "";
      return `<nav class="crumbs"><a href="${r}">Inicio</a> › <a href="${r}oposiciones/">Oposiciones</a> › <a href="${r}oposiciones/categoria/${o.categoria}/">${esc(o.categoria_nombre)}</a> › <span>${esc(o.nombre)}</span></nav>
<header class="op-header">
<h1>${esc(o.nombre)}</h1>
<p class="op-org">${CAT[o.categoria].icono} ${esc(o.organismo)} · ${esc(o.territorio)}</p>
<p class="op-meta">${o.grupo ? `<span class="pill">Grupo ${esc(o.grupo)}</span> ` : ""}<span class="pill">Convocatoria ${esc(opEstado(c).toLowerCase())}</span>${c.plazas ? ` <span class="pill">${fmtN(c.plazas)} plazas</span>` : ""} <span class="${tCls}">${tLbl}</span></p>
<p class="op-verif small"><span class="badge-oficial">Fuente oficial</span> <a href="${esc(c.url_oficial)}" rel="noopener">${esc(c.referencia)}</a>, publicada el ${fmtFecha(c.fecha_publicacion)} · <b>Última verificación: ${fmtFecha(ultimaVerif)}</b></p>
${o.qs.length ? `<p class="op-start"><a class="cta" href="#tests">Empezar a preparar</a> <span class="muted small">${fmtN(o.qs.length)} preguntas · ${sim ? `simulacro de ${sim.preguntas} preguntas` : "test por temas"}</span></p>` : ""}
<div id="op-accion" data-op="${o.id}" data-nombre="${esc(o.nombre)}"></div>
</header>
<nav class="op-index" aria-label="Secciones">${seccionesNav.filter(([id]) => !["requisitos", "plazas", "pruebas"].includes(id) || o.oficial[id] || (id === "requisitos" && o.oficial.titulacion)).filter(([id]) => id !== "tests" || o.qs.length).map(([id, t]) => `<a href="#${id}">${t}</a>`).join("")}</nav>
<div id="convocatoria">${oficialHtml(o)}</div>
${pend}
${convsOp.length ? `<section class="card"><h2>Ficha de la convocatoria en el catálogo nacional</h2><ul class="nov">${convsOp.map((v) => `<li><a href="${r}convocatorias/${v.id}/">${esc(convNombre(v))}</a> ${badgeVS(v.verification_status)} <span class="muted small">(${esc(v.id)} · verificada automáticamente el ${fmtFecha((v.last_verified_at || "").slice(0, 10))})</span></li>`).join("")}</ul></section>` : ""}
<section class="card" id="fechas"><div class="of-head"><h2>Fechas</h2><span class="badge-oficial">Fuente oficial</span></div>
<ul class="of-list"><li><span>Publicación de la convocatoria: <b>${fmtFecha(c.fecha_publicacion)}</b></span></li>
${V1("plazo_solicitudes") ? `<li><span>Plazo de solicitudes: <b>${esc(V1("plazo_solicitudes").valor)}</b></span></li>` : ""}
<li><span>Fecha del examen: ${fechasExamen.length ? `<b>${esc(fechasExamen[fechasExamen.length - 1].titulo)}</b>` : "<b>pendiente de publicación oficial</b>. Sigue la convocatoria y te avisaremos."}</span></li></ul></section>
${novedadesHtml(o)}
${cobertura}
${prep}
<section id="tests">${o.qs.length ? `<h2>Tests de ${esc(o.nombre.replace(/^Cuerpo (General )?/, ""))} <span class="badge-testley">Contenido de TestLey</span></h2><p class="muted small">Preguntas redactadas por TestLey; cada respuesta cita el artículo del BOE que la justifica y se comprueba automáticamente contra el texto vigente.${o.temario_tipo === "pendiente" ? " Mientras el temario oficial está pendiente de verificación, el test usa las leyes de preparación indicadas arriba." : ""}</p><div id="quiz" class="quiz" data-ley="${o.id}" data-base="./" data-sim="${esc(JSON.stringify(sim || null))}">Cargando preguntas…</div>` : ""}</section>
<section class="card" id="simulacros"><h2>Simulacros</h2>${((o.examen || {}).estructura || []).length ? `<h3>Estructura oficial del proceso</h3><div class="tabla-scroll"><table class="tabla"><thead><tr><th>Parte</th><th>Preguntas</th><th>En el simulacro de TestLey</th></tr></thead><tbody>${o.examen.estructura.map((x) => `<tr><td>${esc(x.parte)}<details><summary class="small">Texto oficial</summary><blockquote>«${esc(x.cita)}»</blockquote></details></td><td>${x.preguntas || "—"}</td><td>${x.en_simulacro ? "✓ Sí" : `No · <span class="muted small">${esc(x.motivo)}</span>`}</td></tr>`).join("")}</tbody></table></div>` : ""}${sim ? `<p>Formato: <b>${sim.preguntas} preguntas</b> en <b>${sim.minutos} minutos</b>, ${sim.opciones} opciones${sim.penalizacion ? `, cada error resta ${fraccionTxt(sim.penalizacion)}` : ", sin penalización"}. ${sim.origen === "oficial" ? `<span class="badge-oficial">Formato oficial</span>` : `<span class="badge-testley">Adaptado por TestLey</span>`}</p><p class="muted small">${esc(sim.nota || "")}</p><p><a class="btn primary" href="#test=simulacro">Hacer un simulacro</a></p>` : `<p class="muted">El formato oficial del examen aún no está verificado; puedes hacer tests por temas.</p>`}</section>
<section id="temario">${o.temario.length ? `<h2>${tLbl} <span class="${tCls}">${o.temario_tipo === "oficial_publicado" ? "Fuente oficial" : "Ver nota"}</span></h2>
<p class="muted small">${o.temario_tipo === "oficial_publicado" ? `Copiado literalmente del anexo ${esc(c.anexo || "")} de la convocatoria oficial.` : "Estructura deducida de las bases oficiales; cada tema cita el texto de las bases del que sale."}</p>
<div id="op-temario">${bloques.map((b) => `<h3>${esc(b)}</h3><ol class="temario">${o.temario.map((t, i) => [t, i]).filter(([t]) => t.bloque === b).map(([t, i]) => `<li value="${t.tema}"><p><a href="${r}${rutaTema(o, i)}">${esc(t.titulo)}</a></p><div class="chips">${chip(t)}${o.temaInfo[i].nq ? ` <a class="chip ok" href="${r}${rutaTema(o, i)}#practicar">${o.temaInfo[i].nq} preguntas</a>` : ""}</div></li>`).join("")}</ol>`).join("")}</div>
<p class="muted small">Las leyes de cada tema las asigna TestLey a partir del título del tema: son orientativas. Comprueba siempre las bases de tu convocatoria.</p>` : `<h2>Temario</h2><p class="muted">${badgeVS("OFFICIAL_PENDING_REVIEW")} Temario pendiente de verificación oficial.</p>`}</section>
<section class="card" id="legislacion"><h2>Legislación</h2><ul class="of-list">${leyesOp.map((n) => `<li><span>${PUB[n.id] ? `<a href="${r}${PUB[n.id].slug}/">${esc(n.nombre)}</a> <span class="chip ok">Con test</span>` : `${esc(n.nombre)} <span class="chip grey">En preparación</span>`}</span> <a class="muted small" href="https://www.boe.es/buscar/act.php?id=${esc(n.id)}" rel="noopener">${esc(n.id)}</a></li>`).join("")}</ul><p class="muted small">Textos consolidados del BOE. La asignación de leyes a temas es orientativa (Contenido de TestLey).</p></section>
<section class="card" id="documentacion"><h2>Documentación oficial</h2><ul class="of-list">${Object.values(o.fuentes).map((f) => `<li><span><a href="${esc(f.url)}" rel="noopener">${esc(f.titulo)}</a></span> <span class="muted small">${esc(f.tipo)} · ${esc(f.id || "")} · publicado el ${fmtFecha(f.fecha_publicacion)}</span></li>`).join("")}</ul></section>
${faqHtml(faq)}`;
    },
  });
}

// ---------- Temas: estudiar (texto oficial) → test del tema; cobertura por tema; completitud de cada oposición ----------
const LEYPOR = Object.fromEntries(PUBLICADAS.map((L) => [L.slug, L]));
const OBJ_TEMA = 30; // preguntas por tema consideradas «cobertura completa» en la métrica (no es un límite)
// TOPIC_COVERAGE: qué hay de cada tema (texto oficial para estudiar, legislación identificada, preguntas, test, verificación)
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
  id: o.id, nombre: o.nombre, temario_tipo: o.temario_tipo || null, completitud: completitud(o),
  estructura: ((o.examen || {}).estructura || []).map((p) => ({ parte: p.parte, en_simulacro: !!p.en_simulacro })),
  temas: o.temario.map((t, i) => ({ tema: t.tema, bloque: t.bloque || null, titulo: t.titulo.slice(0, 120), ...coberturaTema(o, i) })),
}))));
for (const o of OPOS) {
  o.completitud = completitud(o);
  const conv = o.fuentes.convocatoria || Object.values(o.fuentes)[0];
  o.temario.forEach((t, i) => {
    const ti = o.temaInfo[i], cob = coberturaTema(o, i), etq = `Tema ${t.tema}`;
    const dup = o.temario.filter((x) => x.tema === t.tema).length > 1;
    const nombre = (dup ? `${t.bloque.split(/[.)]/)[0]} · ` : "") + etq;
    const prev = i > 0 ? o.temario[i - 1] : null, next = o.temario[i + 1];
    page(rutaTema(o, i), {
      title: `${nombre}: ${t.titulo.slice(0, 70)} · ${o.nombre}`, lastmod: o.actualizado,
      description: `${o.nombre}, ${nombre}: ${t.titulo.slice(0, 120)}. Legislación con su texto oficial del BOE${ti.nq ? ` y ${ti.nq} preguntas tipo test` : ""}.`,
      noindex: !ti.nq, scripts: ti.nq ? ["test.js"] : [],
      crumbs: [["Oposiciones", "oposiciones/"], [o.nombre, `oposiciones/${o.id}/`], [nombre, rutaTema(o, i)]],
      body: (r) => {
        const estudio = ti.leyes.map((sl) => {
          const L = LEYPOR[sl], a = ti.ambito[sl], arts = L.arts.filter((x) => !a.arts || a.arts.has(x.n));
          const grupos = {}; arts.forEach((x) => (grupos[x.capitulo ? `${x.bloque} · ${x.capitulo}` : x.bloque || L.corto] ||= []).push(x));
          const nq = o.qs.filter((q) => q.ley === sl && q.tm && q.tm.includes(i)).length;
          return `<div class="card"><h3><a href="${r}${sl}/">${esc(L.corto)}</a> <span class="badge-oficial">Texto oficial (BOE)</span></h3>
<p class="muted small">${a.estado === "precisado" ? `Parte que corresponde a este tema: ${a.unidades.map((u) => esc(u.split("|").pop())).join(" · ")} <span class="badge-testley">Asignación de TestLey</span>` : a.estado === "sin_precisar" ? "Esta ley se reparte entre varios temas y aún no hemos precisado qué parte corresponde a este: se incluye completa." : "Ley completa."} · ${arts.length} artículos · ${nq} preguntas · <a href="https://www.boe.es/buscar/act.php?id=${esc(L.id)}" rel="noopener">${esc(L.id)}</a>${L.actualizada ? ` · texto vigente a ${fmtFecha(L.actualizada)}` : ""}</p>
${Object.entries(grupos).map(([g, xs]) => `<details><summary>${esc(g)} (${xs.length})</summary><ul class="art-list">${xs.map((x) => `<li><a href="${r}${sl}/articulo-${x.n}/">Art. ${x.n}${x.titulo ? ". " + esc(x.titulo) : ""}</a></li>`).join("")}</ul></details>`).join("")}</div>`;
        }).join("");
        const sinLey = t.normas.filter((id) => !PUB[id]).map((id) => (NORMAS[id] || { nombre: id }).nombre);
        return `<nav class="crumbs"><a href="${r}">Inicio</a> › <a href="${r}oposiciones/${o.id}/">${esc(o.nombre)}</a> › <span>${esc(nombre)}</span></nav>
<p class="kicker">${esc(o.nombre)} · ${esc(t.bloque)}</p>
<h1>${esc(nombre)}. ${esc(t.titulo)}</h1>
<p class="op-verif small">${o.temario_tipo === "oficial_publicado" ? `<span class="badge-oficial">Título oficial</span> copiado literalmente del anexo ${esc(o.convocatoria.anexo || "")} de la <a href="${esc(conv.url)}" rel="noopener">${esc(conv.id || conv.titulo)}</a>` : `<span class="badge-testley">Estructura derivada de las bases</span>`}</p>
<div class="kpis"><div class="kpi"><span class="kpi-n">${ti.nq}</span><span class="kpi-l">preguntas del tema</span></div><div class="kpi"><span class="kpi-n">${ti.leyes.length}</span><span class="kpi-l">leyes con texto oficial</span></div><div class="kpi"><span class="kpi-n" id="tema-dom">—</span><span class="kpi-l">tu dominio</span></div></div>
<section id="estudiar"><h2>1. Estudiar</h2>
${t.tipo === "no_legislativo" ? `<div class="box"><b>Tema no legislativo</b> (informática, ofimática, lengua…). TestLey aún no tiene contenido verificado para este tema; estúdialo con el material oficial de la convocatoria.</div>` : ""}
${estudio || (t.tipo !== "no_legislativo" ? `<div class="box">${badgeVS("OFFICIAL_PENDING_REVIEW")} Información pendiente de verificación oficial: este tema no remite a una norma con texto consolidado en el BOE${sinLey.length ? ` (${sinLey.map(esc).join(", ")})` : ""}. No mostramos contenido que no podamos verificar.</div>` : "")}
${sinLey.length && estudio ? `<p class="muted small">También relacionadas con este tema (sin test todavía): ${sinLey.map(esc).join(", ")}.</p>` : ""}
<p class="muted small">El texto de los artículos es la versión consolidada oficial del BOE. La asignación de leyes y artículos a cada tema la hace TestLey y es orientativa: comprueba siempre el programa oficial.</p></section>
<section id="practicar"><h2>2. Practicar: test del tema</h2>
${ti.nq ? `<p class="muted small">${ti.nq} preguntas de este tema. Cada respuesta cita el artículo del BOE que la justifica.${ti.nq < 10 ? " Este tema tiene todavía pocas preguntas: estamos ampliándolas." : ""}</p><div id="quiz" class="quiz" data-ley="${o.id}" data-base="../" data-tema="${i}" data-sim="${esc(JSON.stringify((o.examen || {}).simulacro || null))}">Cargando preguntas…</div>` : `<p class="muted">Todavía no hay preguntas verificadas para este tema.</p>`}</section>
<p>${prev ? `<a href="${r}${rutaTema(o, i - 1)}">← Tema anterior</a>` : ""}${prev && next ? " · " : ""}${next ? `<a href="${r}${rutaTema(o, i + 1)}">Tema siguiente →</a>` : ""} · <a href="${r}oposiciones/${o.id}/#temario">Temario completo</a> · <a href="${r}panel/?c=${o.id}">Mi progreso</a></p>`;
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
<section class="card"><h2>Fuentes pendientes</h2>${(o.pendientes || []).length ? `<ul class="nov">${o.pendientes.map((x) => `<li><b>${esc(x.campo)}</b>: ${esc(x.motivo)}</li>`).join("")}</ul>` : "<p class='muted'>Ninguna.</p>"}</section>`,
  });
}

page("convocatorias/", {
  title: "Convocatorias de oposiciones y empleo público en España",
  description: `${CONVS.length} convocatorias oficiales de oposiciones y empleo público (Estado, comunidades, ayuntamientos, universidades…) con plazas, plazos y enlace a la fuente oficial.`,
  wide: true, scripts: ["buscador.js"], crumbs: [["Convocatorias", "convocatorias/"]],
  body: (r) => `<nav class="crumbs"><a href="${r}">Inicio</a> › <span>Convocatorias</span></nav>
<h1>Convocatorias oficiales</h1>
<p class="lead">Convocatorias detectadas automáticamente cada día en fuentes oficiales. Cada dato muestra la frase literal de la que sale y su procedencia. ${badgeVS("OFFICIAL_PENDING_REVIEW")}</p>
<form class="buscador" action="${r}convocatorias/" role="search"><label class="sr" for="q">Buscar convocatoria</label><input id="q" name="q" type="search" placeholder="Policía local, auxiliar administrativo, Valencia, bombero…" autocomplete="off"><button class="cta" type="submit">Buscar</button></form>
${filtrosHtml(false)}
<div class="cat-chips">${CATEGORIAS.filter((c) => catCountConv(c.id)).map((c) => `<a class="cat-chip" href="#" data-cat="${c.id}">${c.icono} ${esc(c.nombre)} <b>${catCountConv(c.id)}</b></a>`).join("")}</div>
<p id="res-count" class="muted" aria-live="polite" data-uno="convocatoria" data-varios="convocatorias">${CONVS.length} convocatorias</p>
<div class="cards" id="res">${CONVS.map((v) => tarjetaConv(v, r)).join("")}</div>
<p id="res-vacio" class="box" hidden>No hay convocatorias con esa búsqueda.</p>
<p class="muted small">Estado calculado automáticamente; comprueba siempre las bases oficiales enlazadas antes de presentar tu solicitud.</p>`,
});
const CONF = (c) => (c >= 0.8 ? "alta" : c >= 0.6 ? "media" : "baja");
const EST_FUENTES = fs.existsSync("ingesta/estado/fuentes-estado.json") ? JSON.parse(fs.readFileSync("ingesta/estado/fuentes-estado.json", "utf8")) : {};
// Calidad SEO: una ficha solo se indexa si aporta datos útiles además del organismo (plazas, plazo, sistema, titulación…)
const SEOQ = JSON.parse(fs.readFileSync("catalogo/seo_calidad.json", "utf8")).convocatoria; // misma puerta que crecimiento/seo.py
const utilConv = (v) => Object.keys(v.datos).filter((k) => !SEOQ.campos_no_utiles.includes(k)).length >= SEOQ.campos_utiles_min;
const estadoConv = (v) => { const f = (EST_FUENTES[v.fuente.fuente_registro] || {}).estado; return ["error", "inaccesible"].includes(f) && v.fuente.tipo !== "BOE" ? "SOURCE_TEMPORARILY_UNAVAILABLE" : v.verification_status || "OFFICIAL_PENDING_REVIEW"; };
for (const v of CONVS) {
  const opRel = OPOS.filter((o) => (v.oposiciones_relacionadas || []).includes(o.id));
  page(`convocatorias/${v.id}/`, {
    noindex: !utilConv(v), lastmod: (v.last_verified_at || v.extraido || C.updated).slice(0, 10),
    crumbs: [["Convocatorias", "convocatorias/"], [v.id, `convocatorias/${v.id}/`]],
    title: `${convNombre(v)}${v.datos.plazas ? ` (${v.datos.plazas.valor} plaza${v.datos.plazas.valor > 1 ? "s" : ""})` : ""}: convocatoria`,
    description: `${v.titulo.slice(0, 150)}. Plazas, plazos y enlace a la fuente oficial.`,
    scripts: ["oposicion.js"],
    body: (r) => {
      const filas = Object.entries(v.datos).filter(([k]) => ETIQ_CONV[k]).map(([k, d]) => `<div class="of-row"><h3>${ETIQ_CONV[k]}</h3><ul class="of-list"><li><span>${esc(typeof d.valor === "number" ? fmtN(d.valor) : d.valor)}</span><details><summary>Texto oficial y procedencia</summary><blockquote>«${esc(d.cita)}»<span class="src"><a href="${esc(d.source_url)}" rel="noopener">${esc(d.source_domain)}</a> · publicado ${fmtFecha(d.published_at)} · descargado ${fmtFecha((d.retrieved_at || "").slice(0, 10))} · confianza ${CONF(d.confidence)} (${d.metodo === "claude" ? "interpretado por IA" : "reglas automáticas"}) · ${badgeVS(d.verification_status)}</span></blockquote></details></li></ul></div>`).join("");
      const relacion = (opRel.length ? opRel : OPOS.filter((o) => o.categoria === v.categoria && o.qs.length)).slice(0, 3);
      return `<nav class="crumbs"><a href="${r}">Inicio</a> › <a href="${r}convocatorias/">Convocatorias</a> › <span>${esc(v.id)}</span></nav>
<h1>${esc(convNombre(v))}</h1>
<p class="op-meta"><span class="pill">${esc(opEstado(v))}</span>${v.datos.plazas ? ` <span class="pill">${fmtN(v.datos.plazas.valor)} plaza${v.datos.plazas.valor > 1 ? "s" : ""}</span>` : ""} ${CAT[v.categoria] ? `<a class="pill" href="${r}oposiciones/categoria/${v.categoria}/">${CAT[v.categoria].icono} ${esc(CAT[v.categoria].nombre)}</a>` : ""}</p>
<p class="muted small">${esc(v.titulo)}</p>
<div id="op-accion" data-op="conv-${esc(v.id)}" data-nombre="${esc(convNombre(v))}" data-tipo="convocatoria"></div>
${opRel.length ? `<p class="box">Esta convocatoria corresponde a ${opRel.map((o) => `<a href="${r}oposiciones/${o.id}/"><b>${esc(o.nombre)}</b></a>`).join(" y ")}: temario, tests y simulacros.</p>` : ""}
<section class="card oficial"><div class="of-head"><h2>Datos de la convocatoria</h2>${badgeVS(estadoConv(v))}</div>
${estadoConv(v) === "SOURCE_TEMPORARILY_UNAVAILABLE" ? `<p class="warn small">La fuente oficial no responde desde ${fmtFecha(((EST_FUENTES[v.fuente.fuente_registro] || {}).ultimo_exito || "").slice(0, 10))}. Mostramos el último dato válido.</p>` : ""}
<p class="muted small">Última verificación automática: ${fmtFecha((v.last_verified_at || v.extraido || "").slice(0, 10))}.</p>
${filas || '<p class="muted">No se han podido extraer datos estructurados; consulta el documento oficial.</p>'}
${(v.fuentes_adicionales || []).length ? `<p class="small">También publicada en: ${v.fuentes_adicionales.map((x) => `<a href="${esc(x.source_url)}" rel="noopener">${esc(x.source_domain)}</a>`).join(" · ")}</p>` : ""}
<p class="small">Documento oficial: <a href="${esc(v.fuente.source_url)}" rel="noopener">${esc(v.fuente.boe_id || v.fuente.source_url)}</a> · ${esc(v.fuente.departamento || v.fuente.source_domain)}${v.fuente.epigrafe ? " · " + esc(v.fuente.epigrafe) : ""}</p>
<p class="muted small">Los datos se extraen automáticamente y solo se publican si su frase aparece literalmente en el documento oficial. ${esc(v.estado_nota)}</p></section>
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
  const navAdmin = (r) => `<p class="small"><a href="${r}admin/growth/">Growth</a> · <a href="${r}admin/growth/jobs/">Trabajos</a> · <a href="${r}admin/system/">Sistema</a> · <a href="${r}admin/fuentes/">Fuentes</a></p>`;
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

// ---------- Precios (desde config.json → planes; sin precios en el código) ----------
if (PL.free && PL.premium) page("precios/", {
  title: `Precios: gratis o ${PL.premium.nombre}`, crumbs: [["Precios", "precios/"]],
  description: `Qué incluye TestLey gratis y qué añade el ${PL.premium.nombre} (${PL.premium.precio}${PL.premium.prueba_dias ? `, ${PL.premium.prueba_dias} días de prueba gratis` : ""}).`,
  schema: faqSchema(FAQ_GENERAL.slice(-1)),
  body: (r) => `<nav class="crumbs"><a href="${r}">Inicio</a> › <span>Precios</span></nav>
<h1>Precios</h1>
<p class="lead">Buscar oposiciones, consultar convocatorias oficiales y practicar es gratis. El ${esc(PL.premium.nombre)} desbloquea la preparación completa.</p>
<div class="planes">
<div class="card plan-card"><h2>${esc(PL.free.nombre)}</h2><p class="price">0 €</p><ul class="check">${planLista(PL.free).map((x) => `<li>${esc(x)}</li>`).join("")}</ul><a class="btn" href="${r}oposiciones/">Empezar gratis</a></div>
<div class="card plan-card destacado"><h2>${esc(PL.premium.nombre)}</h2><p class="price">${esc(PL.premium.precio)}</p>${PL.premium.prueba_dias ? `<p class="muted small">${PL.premium.prueba_dias} días de prueba gratis · cancela cuando quieras</p>` : ""}<ul class="check">${planLista(PL.premium).map((x) => `<li>${esc(x)}</li>`).join("")}</ul>${C.checkoutUrl ? `<a class="cta" id="checkout" href="${C.checkoutUrl}" rel="noopener">Probar ${PL.premium.prueba_dias ? PL.premium.prueba_dias + " días gratis" : "ahora"}</a>` : ""}<p class="small"><a href="${r}pase/#como">¿Ya tienes una clave? Actívala aquí</a></p></div>
</div>
<p class="muted small">Pago seguro con Lemon Squeezy, que actúa como vendedor y gestiona el IVA. Sin permanencia.</p>`,
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
    .map((p) => `  <url><loc>${C.url}${p.route}</loc><lastmod>${p.lastmod}</lastmod></url>`)
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
