// TestLey Bot (Telegram Bot API) — Supabase Edge Function.
// Comandos: /start /oposiciones /seguir <id> /test /alertas /mioposicion /pregunta (activa/desactiva la pregunta diaria) /baja /ayuda
// Seguridad: Telegram envía la cabecera X-Telegram-Bot-Api-Secret-Token con el secret_token configurado en setWebhook;
// sin ella la petición se rechaza. Solo se guarda el chat_id y las oposiciones elegidas (tabla telegram_suscriptores).
// No se envía ningún mensaje que el usuario no haya pedido: los avisos solo llegan a quien sigue una oposición.
// Secretos: TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET, SITE_URL.
// Alta del webhook (una vez): https://api.telegram.org/bot<TOKEN>/setWebhook?url=<URL de esta función>&secret_token=<TELEGRAM_WEBHOOK_SECRET>

const env = (k: string, d = "") => Deno.env.get(k) ?? d;
const SITE = () => env("SITE_URL", "https://globalfons.github.io/empresa-ia/").replace(/\/?$/, "/");
const H = () => ({ apikey: env("SUPABASE_SERVICE_ROLE_KEY"), Authorization: `Bearer ${env("SUPABASE_SERVICE_ROLE_KEY")}`, "Content-Type": "application/json" });
type Op = { id: string; nombre: string; plazas?: number | null };
type Sus = { chat_id: number; oposiciones: string[]; pregunta_diaria: boolean; activo: boolean };
const u = (ruta: string, campana: string) => `${SITE()}${ruta}?utm_source=telegram&utm_medium=bot&utm_campaign=${campana}`;

// Lógica pura (probada en tests/deno/telegram_test.ts): texto recibido + estado → respuesta + cambios
export function responder(texto: string, s: Sus | null, catalogo: Op[]): { texto: string; guardar?: Partial<Sus> } {
  const [cmd, ...args] = texto.trim().split(/\s+/);
  const c = (cmd || "").toLowerCase().replace(/@.*$/, "");
  const sus: Sus = s || { chat_id: 0, oposiciones: [], pregunta_diaria: false, activo: true };
  const lista = catalogo.map((o) => `• ${o.nombre}${o.plazas ? ` (${o.plazas.toLocaleString("es-ES")} plazas)` : ""}\n  /seguir ${o.id}`).join("\n");
  switch (c) {
    case "/start":
      return { texto: `Hola 👋 Soy el bot de TestLey.\n\nTe aviso de las novedades oficiales (listas, fechas de examen, modificaciones) de la oposición que elijas y, si quieres, te mando una pregunta al día.\n\nElige tu oposición:\n${lista}\n\n/ayuda para ver todos los comandos.`, guardar: { activo: true } };
    case "/oposiciones": return { texto: `Oposiciones con temario y tests en TestLey:\n${lista}\n\nTodas las convocatorias: ${u("convocatorias/", "bot")}` };
    case "/seguir": {
      const id = (args[0] || "").toLowerCase();
      const op = catalogo.find((o) => o.id === id);
      if (!op) return { texto: "No encuentro esa oposición. Usa /oposiciones para ver la lista." };
      const ops = [...new Set([...sus.oposiciones, id])].slice(0, 10);
      return { texto: `✔ Sigues ${op.nombre}. Te avisaré cuando se publique algo oficial sobre ella.\nFicha y fuente oficial: ${u(`oposiciones/${id}/`, "bot")}`, guardar: { oposiciones: ops, activo: true } };
    }
    case "/mioposicion":
      return { texto: sus.oposiciones.length ? "Sigues:\n" + sus.oposiciones.map((id) => `• ${(catalogo.find((o) => o.id === id) || { nombre: id }).nombre}: ${u(`oposiciones/${id}/`, "bot")}`).join("\n") : "Aún no sigues ninguna oposición. Usa /oposiciones." };
    case "/alertas":
      return { texto: sus.oposiciones.length ? `Avisos activos para ${sus.oposiciones.length} oposición(es). Pregunta diaria: ${sus.pregunta_diaria ? "sí" : "no"} (/pregunta para cambiarlo). /baja para dejar de recibir mensajes.` : "No tienes avisos. Sigue una oposición con /oposiciones." };
    case "/pregunta": return { texto: sus.pregunta_diaria ? "Has desactivado la pregunta diaria." : "Te enviaré una pregunta al día con su solución citada del BOE.", guardar: { pregunta_diaria: !sus.pregunta_diaria } };
    case "/test": {
      const id = sus.oposiciones[0];
      return { texto: id ? `Haz un test de ${(catalogo.find((o) => o.id === id) || { nombre: id }).nombre}: ${u(`oposiciones/${id}/`, "bot-test")}#tests` : `Empieza con el test gratis de la Ley 39/2015: ${u("ley-39-2015/", "bot-test")}` };
    }
    case "/baja": return { texto: "Hecho: no te enviaré más mensajes. Vuelve cuando quieras con /start.", guardar: { activo: false, pregunta_diaria: false, oposiciones: [] } };
    default:
      return { texto: "Comandos:\n/oposiciones — ver oposiciones\n/seguir <id> — recibir avisos oficiales\n/mioposicion — lo que sigues\n/test — practicar\n/pregunta — pregunta diaria sí/no\n/alertas — tus avisos\n/baja — dejar de recibir mensajes" };
  }
}

async function enviar(chat: number, texto: string) {
  await fetch(`https://api.telegram.org/bot${env("TELEGRAM_BOT_TOKEN")}/sendMessage`, { method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chat, text: texto, disable_web_page_preview: true }) });
}

if (import.meta.main) Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("método no permitido", { status: 405 });
  if (!env("TELEGRAM_WEBHOOK_SECRET") || req.headers.get("x-telegram-bot-api-secret-token") !== env("TELEGRAM_WEBHOOK_SECRET")) return new Response("no autorizado", { status: 401 });
  const upd = await req.json().catch(() => null);
  const m = upd?.message;
  if (!m?.chat?.id || typeof m.text !== "string" || m.chat.type !== "private") return new Response("ok");
  const chat = Number(m.chat.id);
  const SB = env("SUPABASE_URL");
  const s = (await (await fetch(`${SB}/rest/v1/telegram_suscriptores?chat_id=eq.${chat}&select=*`, { headers: H() })).json())?.[0] || null;
  const catalogo = await (await fetch(`${SITE()}datos/catalogo.json`)).json().catch(() => []);
  const r = responder(m.text.slice(0, 200), s, catalogo);
  if (r.guardar) await fetch(`${SB}/rest/v1/telegram_suscriptores?on_conflict=chat_id`, { method: "POST", headers: { ...H(), Prefer: "resolution=merge-duplicates" },
    body: JSON.stringify({ chat_id: chat, ...(s ? {} : { oposiciones: [], pregunta_diaria: false }), ...r.guardar, actualizado: new Date().toISOString() }) });
  await enviar(chat, r.texto);
  return new Response("ok");
});
