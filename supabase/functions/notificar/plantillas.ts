// Plantillas de email. Cada una devuelve {asunto, texto, html}. Añadir plantillas aquí sin tocar el servicio.
export type Evento = { tipo: string; oposicion: string; titulo: string; url: string; fecha: string | null; datos: Record<string, unknown> };
const TIPO: Record<string, string> = {
  convocatoria: "Nueva convocatoria", listas: "Listas de admitidos y excluidos", aprobados: "Relación de aprobados",
  fecha_examen: "Fecha de examen", modificacion: "Modificación de la convocatoria", correccion: "Corrección de errores",
  nombramiento: "Nombramientos", otro: "Nueva publicación oficial",
};
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
const pie = (site: string) => `\n\nGestiona tus avisos en ${site}panel/ · Fuente oficial: la publicación enlazada. TestLey no es un organismo oficial.`;

export function aviso(e: Evento, nombreOp: string, site: string) {
  const t = TIPO[e.tipo] || TIPO.otro;
  const asunto = `${t}: ${nombreOp}`;
  const texto = `${t} en el BOE sobre ${nombreOp} (${e.fecha ?? ""}).\n\n${e.titulo}\n\nLéelo en la fuente oficial: ${e.url}${pie(site)}`;
  const html = `<p><b>${esc(t)}</b> sobre <b>${esc(nombreOp)}</b> (${esc(e.fecha ?? "")}).</p><p>${esc(e.titulo)}</p><p><a href="${esc(e.url)}">Leer en la fuente oficial</a></p><p style="color:#666;font-size:12px">Gestiona tus avisos en <a href="${site}panel/">tu panel de TestLey</a>. TestLey no es un organismo oficial.</p>`;
  return { asunto, texto, html };
}

export function resumen(items: { e: Evento; nombreOp: string }[], site: string, periodo: string) {
  const asunto = `Tu resumen ${periodo} de convocatorias (${items.length})`;
  const texto = items.map(({ e, nombreOp }) => `• ${TIPO[e.tipo] || TIPO.otro} · ${nombreOp} (${e.fecha ?? ""}): ${e.url}`).join("\n") + pie(site);
  const html = `<p>Novedades oficiales de las oposiciones que sigues:</p><ul>${items.map(({ e, nombreOp }) => `<li><b>${esc(TIPO[e.tipo] || TIPO.otro)}</b> · ${esc(nombreOp)} (${esc(e.fecha ?? "")}): <a href="${esc(e.url)}">${esc(e.titulo.slice(0, 160))}</a></li>`).join("")}</ul><p style="color:#666;font-size:12px"><a href="${site}panel/">Gestionar avisos</a></p>`;
  return { asunto, texto, html };
}

const pieComercial = (site: string) => `\n\nRecibes este email porque aceptaste recibir novedades de TestLey. Puedes darte de baja en cualquier momento desde ${site}panel/ (Avisos por email).`;

// Contenido aprobado del Growth OS (su texto ya pasó la verificación de datos en crecimiento/contenido.py)
export function difusion(e: Evento, site: string) {
  const texto = String(e.datos?.texto || "") + pieComercial(site);
  const html = texto.split(/\n{2,}/).map((p) => `<p>${esc(p).replace(/\n/g, "<br>").replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1">$1</a>')}</p>`).join("");
  return { asunto: e.titulo, texto, html };
}

export function reactivacion(e: Evento, site: string) {
  const dias = Number(e.datos?.dias || 0);
  const asunto = "Tu sesión de repaso te espera";
  const texto = `Hace ${dias} días que no estudias en TestLey. Tu panel te ha preparado una sesión corta con los temas donde más fallaste: ${site}panel/?utm_source=email&utm_medium=email&utm_campaign=reactivacion-${dias}` + pieComercial(site);
  const html = `<p>Hace ${dias} días que no estudias en TestLey.</p><p>Tu panel te ha preparado una sesión corta con los temas donde más fallaste.</p><p><a href="${site}panel/?utm_source=email&utm_medium=email&utm_campaign=reactivacion-${dias}">Empezar mi sesión</a></p><p style="color:#666;font-size:12px">Recibes este email porque aceptaste recibir novedades de TestLey. <a href="${site}panel/">Darte de baja</a>.</p>`;
  return { asunto, texto, html };
}
