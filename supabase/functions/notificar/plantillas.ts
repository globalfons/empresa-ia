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
