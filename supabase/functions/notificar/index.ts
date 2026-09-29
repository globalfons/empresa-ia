// TestLey — Servicio de notificaciones (Supabase Edge Function).
// Ciclo: EVENTOS (datos/novedades.json de la web) → ABANICO (usuarios que siguen la oposición y lo quieren) → COLA → ENVÍO → LOG.
// El proveedor de email es un adaptador: EMAIL_PROVIDER = none | resend | brevo | postmark. Con "none" los avisos quedan
// en la cola como 'sin_proveedor' y se envían en cuanto se configure uno, sin cambiar nada más.
// Secretos: NOTIF_CRON_SECRET (obligatorio), SITE_URL, EMAIL_PROVIDER, EMAIL_FROM, RESEND_API_KEY | BREVO_API_KEY | POSTMARK_TOKEN.
import { aviso, resumen, type Evento } from "./plantillas.ts";

const env = (k: string, d = "") => Deno.env.get(k) ?? d;
const SB = env("SUPABASE_URL"), KEY = env("SUPABASE_SERVICE_ROLE_KEY");
const SITE = env("SITE_URL", "https://globalfons.github.io/empresa-ia/").replace(/\/?$/, "/");
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };
const rest = async (path: string, init: RequestInit = {}) => {
  const r = await fetch(`${SB}/rest/v1/${path}`, { ...init, headers: { ...H, ...(init.headers || {}) } });
  if (!r.ok) throw new Error(`${path.split("?")[0]} ${r.status} ${(await r.text()).slice(0, 160)}`);
  const t = await r.text(); return t ? JSON.parse(t) : null;
};
const log = (mensaje: string, datos: unknown = null, nivel = "info") =>
  rest("notif_log", { method: "POST", body: JSON.stringify({ nivel, mensaje, datos }) }).catch(() => {});

// ---------- Proveedores de email (adaptadores) ----------
type Correo = { para: string; asunto: string; texto: string; html: string };
const PROVEEDORES: Record<string, (c: Correo) => Promise<void>> = {
  resend: async (c) => {
    const r = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${env("RESEND_API_KEY")}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: env("EMAIL_FROM"), to: [c.para], subject: c.asunto, text: c.texto, html: c.html }) });
    if (!r.ok) throw new Error(`resend ${r.status}`);
  },
  brevo: async (c) => {
    const r = await fetch("https://api.brevo.com/v3/smtp/email", { method: "POST", headers: { "api-key": env("BREVO_API_KEY"), "Content-Type": "application/json" },
      body: JSON.stringify({ sender: { email: env("EMAIL_FROM") }, to: [{ email: c.para }], subject: c.asunto, textContent: c.texto, htmlContent: c.html }) });
    if (!r.ok) throw new Error(`brevo ${r.status}`);
  },
  postmark: async (c) => {
    const r = await fetch("https://api.postmarkapp.com/email", { method: "POST", headers: { "X-Postmark-Server-Token": env("POSTMARK_TOKEN"), "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ From: env("EMAIL_FROM"), To: c.para, Subject: c.asunto, TextBody: c.texto, HtmlBody: c.html }) });
    if (!r.ok) throw new Error(`postmark ${r.status}`);
  },
};

// 1) EVENTOS: publicaciones oficiales de las convocatorias (solo relevancia "convocatoria")
async function ingerirEventos() {
  const nov = await (await fetch(`${SITE}datos/novedades.json`)).json();
  const filas = nov.filter((n: { relevancia: string }) => n.relevancia === "convocatoria").map((n: Record<string, string>) => ({
    clave: `${n.oposicion}:${n.id}`, tipo: n.tipo, oposicion: n.oposicion, titulo: n.titulo, url: n.url, fecha: n.fecha, datos: { id: n.id, seccion: n.seccion },
  }));
  if (!filas.length) return [];
  return await rest("notif_eventos?on_conflict=clave", { method: "POST", headers: { Prefer: "resolution=ignore-duplicates,return=representation" }, body: JSON.stringify(filas) }) || [];
}

// 2) ABANICO: usuarios que siguen la oposición (ajustes-usuario.sigo), con email activado y ese tipo de aviso
async function abanico(eventos: Array<Evento & { id: number }>) {
  let n = 0;
  for (const e of eventos) {
    const seg = await rest(`progreso?ley=eq.ajustes-usuario&datos->sigo=cs.${encodeURIComponent(JSON.stringify([e.oposicion]))}&select=user_id`);
    if (!seg.length) continue;
    const ids = seg.map((s: { user_id: string }) => s.user_id);
    const prefs = await rest(`notif_preferencias?user_id=in.(${ids.join(",")})&email_activo=eq.true&select=user_id,tipos,frecuencia`);
    const filas = prefs.filter((p: { tipos: string[] }) => p.tipos.includes(e.tipo)).map((p: { user_id: string; frecuencia: string }) => ({
      user_id: p.user_id, evento_id: e.id, canal: "email", plantilla: p.frecuencia === "inmediata" ? "aviso" : `resumen_${p.frecuencia}`,
      programado: new Date(Date.now() + (p.frecuencia === "diaria" ? 0 : p.frecuencia === "semanal" ? 0 : 0)).toISOString(),
    }));
    if (filas.length) { await rest("notif_cola?on_conflict=user_id,evento_id,canal", { method: "POST", headers: { Prefer: "resolution=ignore-duplicates" }, body: JSON.stringify(filas) }); n += filas.length; }
  }
  return n;
}

// 3) ENVÍO: procesa la cola; agrupa en resúmenes diarios/semanales; sin proveedor, deja 'sin_proveedor'
async function enviar() {
  const prov = env("EMAIL_PROVIDER", "none");
  const cola = await rest(`notif_cola?estado=in.(pendiente,sin_proveedor,fallido)&intentos=lt.5&programado=lte.${new Date().toISOString()}&select=id,user_id,plantilla,intentos,notif_eventos(*)&order=id&limit=200`);
  const catalogo = await (await fetch(`${SITE}datos/catalogo.json`)).json().catch(() => []);
  const nombre = (id: string) => (catalogo.find((o: { id: string; nombre: string }) => o.id === id) || { nombre: id }).nombre;
  const porUsuario: Record<string, typeof cola> = {};
  for (const c of cola) (porUsuario[c.user_id] ||= []).push(c);
  const res = { enviados: 0, sin_proveedor: 0, fallidos: 0 };
  for (const [uid, items] of Object.entries(porUsuario)) {
    const inmediatos = items.filter((c: { plantilla: string }) => c.plantilla === "aviso");
    const diarios = items.filter((c: { plantilla: string }) => c.plantilla === "resumen_diaria");
    const semanales = items.filter((c: { plantilla: string }) => c.plantilla === "resumen_semanal" && new Date().getUTCDay() === 1);
    const lotes: Array<{ filas: typeof items; correo: (email: string) => Correo }> = [
      ...inmediatos.map((c: { notif_eventos: Evento }) => ({ filas: [c], correo: (email: string) => ({ para: email, ...aviso(c.notif_eventos, nombre(c.notif_eventos.oposicion), SITE) }) })),
      ...[["diario", diarios], ["semanal", semanales]].filter(([, f]) => (f as typeof items).length).map(([p, f]) => ({ filas: f as typeof items,
        correo: (email: string) => ({ para: email, ...resumen((f as typeof items).map((c: { notif_eventos: Evento }) => ({ e: c.notif_eventos, nombreOp: nombre(c.notif_eventos.oposicion) })), SITE, p as string) }) })),
    ];
    if (!lotes.length) continue;
    const u = await fetch(`${SB}/auth/v1/admin/users/${uid}`, { headers: H }).then((r) => r.json()).catch(() => null);
    for (const lote of lotes) {
      const ids = lote.filas.map((c: { id: number }) => c.id).join(",");
      let estado = "enviado", error: string | null = null;
      if (!u?.email) { estado = "omitido"; error = "usuario sin email"; }
      else if (!PROVEEDORES[prov]) { estado = "sin_proveedor"; error = `EMAIL_PROVIDER=${prov}`; }
      else { try { await PROVEEDORES[prov](lote.correo(u.email)); } catch (e) { estado = "fallido"; error = String(e).slice(0, 200); } }
      await rest(`notif_cola?id=in.(${ids})`, { method: "PATCH", body: JSON.stringify({ estado, ultimo_error: error, intentos: lote.filas[0].intentos + (estado === "fallido" ? 1 : 0), enviado: estado === "enviado" ? new Date().toISOString() : null }) });
      if (estado === "enviado") res.enviados += lote.filas.length; else if (estado === "sin_proveedor") res.sin_proveedor += lote.filas.length; else if (estado === "fallido") res.fallidos += lote.filas.length;
    }
  }
  return res;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Método no permitido", { status: 405 });
  if (!env("NOTIF_CRON_SECRET") || req.headers.get("x-cron-secret") !== env("NOTIF_CRON_SECRET")) return new Response("No autorizado", { status: 401 });
  try {
    const eventos = await ingerirEventos();
    const encolados = await abanico(eventos);
    const envio = await enviar();
    const r = { eventos_nuevos: eventos.length, encolados, ...envio, proveedor: env("EMAIL_PROVIDER", "none") };
    await log("ciclo", r);
    return new Response(JSON.stringify(r), { headers: { "Content-Type": "application/json" } });
  } catch (e) {
    await log("error", { error: String(e).slice(0, 300) }, "error");
    return new Response(JSON.stringify({ error: String(e).slice(0, 200) }), { status: 500 });
  }
});
