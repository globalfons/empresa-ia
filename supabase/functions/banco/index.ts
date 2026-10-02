// TestLey — Banco premium (Supabase Edge Function, Deno). B1 de Mossos 360: documentacion/PREMIUM_DEPLOYMENT.md
// Sirve el contenido premium (public.banco_premium) solo si el SERVIDOR confirma el entitlement:
//   1) usuario con sesión: RPC public.mi_plan() con SU token (suscripción registrada por el webhook firmado de Lemon Squeezy), o
//   2) clave de licencia de Lemon Squeezy validada aquí contra su API, de la tienda LS_STORE_ID (y producto LS_PRODUCT_ID si se fija).
// La tabla public.banco_premium no tiene políticas RLS: ni anon ni authenticated pueden leerla; solo esta función con la clave de servicio,
// que vive en los secretos de Supabase y nunca llega al navegador.
//
// Variables: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY (las inyecta Supabase) · LS_STORE_ID (obligatoria para claves)
//   LS_PRODUCT_ID (opcional) · SITE_ORIGIN (opcional, p. ej. https://globalfons.github.io; por defecto ese)
// Desplegar: supabase functions deploy banco   (con verificación de JWT: el navegador envía la clave anónima o el token de sesión)

const env = (k: string, d = "") => Deno.env.get(k) ?? d;
const claveOk = (s: unknown): s is string => typeof s === "string" && /^[a-z0-9-]{2,60}$/.test(s);

function cabeceras() {
  return {
    "Access-Control-Allow-Origin": env("SITE_ORIGIN", "https://globalfons.github.io"),
    "Access-Control-Allow-Headers": "authorization, content-type, apikey",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Cache-Control": "private, no-store",
    Vary: "Origin, Authorization",
  };
}
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cabeceras(), "Content-Type": "application/json" } });

// Token de usuario (no la clave anónima): solo así mi_plan() sabe quién es
function tokenUsuario(req: Request) {
  const t = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  return t && t !== env("SUPABASE_ANON_KEY") ? t : "";
}

export async function premiumPorSesion(token: string) {
  if (!token) return false;
  const r = await fetch(`${env("SUPABASE_URL")}/rest/v1/rpc/mi_plan`, {
    method: "POST", body: "{}",
    headers: { apikey: env("SUPABASE_ANON_KEY"), Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  });
  if (!r.ok) return false;
  return (await r.json().catch(() => ({})))?.plan === "premium";
}

export async function premiumPorLicencia(clave: unknown) {
  if (typeof clave !== "string" || !clave.trim() || clave.length > 100 || !env("LS_STORE_ID")) return false; // sin tienda configurada no se acepta ninguna clave
  const r = await fetch(`${env("LS_API_URL", "https://api.lemonsqueezy.com")}/v1/licenses/validate`, {
    method: "POST", headers: { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
    body: "license_key=" + encodeURIComponent(clave.trim()),
  });
  const d = await r.json().catch(() => ({}));
  const st = d?.license_key?.status, m = d?.meta || {};
  return !!d?.valid && st !== "expired" && st !== "disabled" && String(m.store_id) === env("LS_STORE_ID") &&
    (!env("LS_PRODUCT_ID") || String(m.product_id) === env("LS_PRODUCT_ID"));
}

async function leerBanco(clave: string) {
  const srv = env("SUPABASE_SERVICE_ROLE_KEY");
  const r = await fetch(`${env("SUPABASE_URL")}/rest/v1/banco_premium?clave=eq.${encodeURIComponent(clave)}&select=datos`, {
    headers: { apikey: srv, Authorization: `Bearer ${srv}` },
  });
  if (!r.ok) throw new Error(`banco_premium ${r.status}`);
  return (await r.json())?.[0]?.datos ?? null;
}

export async function responder(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cabeceras() });
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);
  const cuerpo = await req.json().catch(() => null);
  if (!cuerpo || !claveOk(cuerpo.clave)) return json({ error: "Petición no válida" }, 400);
  const token = tokenUsuario(req);
  if (!token && !cuerpo.licencia) return json({ error: "Necesitas el Pase Opositor" }, 401);
  try {
    const ok = (await premiumPorSesion(token)) || (await premiumPorLicencia(cuerpo.licencia));
    if (!ok) return json({ error: "Tu plan no incluye este contenido" }, 403);
    const datos = await leerBanco(cuerpo.clave);
    if (!datos) return json({ error: "Sin contenido premium para esta clave" }, 404);
    return json({ clave: cuerpo.clave, qs: datos.qs || [] });
  } catch (_e) {
    return json({ error: "El banco no está disponible ahora mismo" }, 503); // sin detalles internos
  }
}

if (import.meta.main) Deno.serve(responder);
