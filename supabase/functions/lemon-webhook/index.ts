// TestLey — Webhook de Lemon Squeezy (Supabase Edge Function, Deno).
// Verifica la firma (X-Signature = HMAC-SHA256 del cuerpo con el secreto del webhook) ANTES de leer nada,
// actualiza public.suscripciones (entitlement en servidor: public.mi_plan()) y publica eventos en el bus (public.eventos):
//   subscription_created → SUBSCRIPTION_STARTED · subscription_cancelled / updated(cancelled) → SUBSCRIPTION_CANCELLED
//   subscription_expired → SUBSCRIPTION_EXPIRED · subscription_payment_success(renewal) → SUBSCRIPTION_RENEWED
//   subscription_payment_failed → PAYMENT_FAILED · primer cobro → REFERRAL_CONVERTED / AFFILIATE_CONVERSION si procede
// Idempotente: cada notificación tiene una clave única; si Lemon Squeezy la reenvía, no se duplica nada.
//
// Secretos: LEMONSQUEEZY_WEBHOOK_SECRET (el «Signing secret» del webhook en Lemon Squeezy) · LS_STORE_ID (opcional)
// En Lemon Squeezy → Settings → Webhooks: URL de esta función y eventos subscription_* + order_created.
// Desplegar con: supabase functions deploy lemon-webhook --no-verify-jwt   (Lemon Squeezy no envía JWT; la seguridad es la firma)

const env = (k: string, d = "") => Deno.env.get(k) ?? d;
const SB = env("SUPABASE_URL");
const SRV = () => ({ apikey: env("SUPABASE_SERVICE_ROLE_KEY"), Authorization: `Bearer ${env("SUPABASE_SERVICE_ROLE_KEY")}`, "Content-Type": "application/json" });
const uuidOk = (s: unknown) => typeof s === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
const txt = (s: unknown, n = 120) => (typeof s === "string" ? s.slice(0, n) : s == null ? null : String(s).slice(0, n));

export async function firmaValida(cuerpo: string, firma: string | null, secreto: string) {
  if (!firma || !secreto) return false;
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(secreto), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(cuerpo)));
  const hex = [...mac].map((b) => b.toString(16).padStart(2, "0")).join("");
  if (hex.length !== firma.length) return false;
  let d = 0; for (let i = 0; i < hex.length; i++) d |= hex.charCodeAt(i) ^ firma.charCodeAt(i); // comparación en tiempo constante
  return d === 0;
}

async function rest(path: string, init: RequestInit) {
  const r = await fetch(`${SB}/rest/v1/${path}`, { ...init, headers: { ...SRV(), ...(init.headers || {}) } });
  if (!r.ok) throw new Error(`${path}: ${r.status} ${(await r.text()).slice(0, 200)}`);
  const t = await r.text(); return t ? JSON.parse(t) : null;
}
const evento = (tipo: string, clave: string, entidad: string, payload: Record<string, unknown>, metadata: Record<string, unknown>, user_id: string | null) =>
  rest("eventos?on_conflict=idempotency_key", { method: "POST", headers: { Prefer: "resolution=ignore-duplicates,return=minimal" },
    body: JSON.stringify({ type: tipo, source: "lemonsqueezy", entity_type: "suscripcion", entity_id: entidad, payload, metadata, user_id, idempotency_key: clave }) });

export async function procesar(body: any) {
  const nombre: string = body?.meta?.event_name || "";
  const custom = body?.meta?.custom_data || {};
  const d = body?.data || {}, a = d.attributes || {};
  if (env("LS_STORE_ID") && a.store_id != null && String(a.store_id) !== env("LS_STORE_ID")) return { ignorado: "otra tienda" };
  const user_id = uuidOk(custom.user_id) ? custom.user_id : null;
  // Atribución (first/last touch) que la web añade al checkout (web/assets/checkout.js). Solo campos conocidos y acotados.
  const attr = { first: { utm_source: txt(custom.fs), utm_campaign: txt(custom.fc), ref: txt(custom.ref, 30) }, last: { utm_source: txt(custom.ls), utm_campaign: txt(custom.lc) }, anon_id: txt(custom.anon_id, 40) };
  const clave = `ls:${nombre}:${d.id}:${a.updated_at || a.created_at || ""}`;
  const meta = { attr, event_name: nombre };

  if (d.type === "subscriptions") {
    const fila: Record<string, unknown> = { id: String(d.id), email: a.user_email, status: a.status, product_id: txt(a.product_id), variant_id: txt(a.variant_id),
      customer_id: txt(a.customer_id), order_id: txt(a.order_id), renews_at: a.renews_at, ends_at: a.ends_at, trial_ends_at: a.trial_ends_at, atribucion: attr, actualizado: new Date().toISOString() };
    if (user_id) fila.user_id = user_id;
    await rest("suscripciones?on_conflict=id", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify(fila) });
    const tipo = nombre === "subscription_created" ? "SUBSCRIPTION_STARTED"
      : nombre === "subscription_expired" || a.status === "expired" ? "SUBSCRIPTION_EXPIRED"
      : nombre === "subscription_cancelled" || (nombre === "subscription_updated" && a.status === "cancelled") ? "SUBSCRIPTION_CANCELLED" : null;
    if (tipo) await evento(tipo, clave, String(d.id), { status: a.status, variant_id: txt(a.variant_id) }, meta, user_id);
    return { suscripcion: String(d.id), evento: tipo };
  }

  if (d.type === "subscription-invoices") {
    const sub = String(a.subscription_id);
    if (nombre === "subscription_payment_failed") { await evento("PAYMENT_FAILED", clave, sub, { invoice: String(d.id) }, meta, user_id); return { evento: "PAYMENT_FAILED" }; }
    if (nombre !== "subscription_payment_success") return { ignorado: nombre };
    const total = Math.max(0, Math.round(+a.subtotal || +a.total || 0));
    await rest(`suscripciones?id=eq.${encodeURIComponent(sub)}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ importe_cent: total, actualizado: new Date().toISOString() }) });
    const renovacion = a.billing_reason === "renewal";
    if (renovacion) await evento("SUBSCRIPTION_RENEWED", clave, sub, { importe_cent: total }, meta, user_id);
    const s = (await rest(`suscripciones?id=eq.${encodeURIComponent(sub)}&select=user_id,atribucion`, { method: "GET" }))?.[0] || {};
    const uid = s.user_id || user_id;
    // Referido: se convierte con el primer cobro real (no con el alta en prueba gratis)
    if (uid && total > 0) {
      const ref = await rest(`referidos?referred=eq.${uid}&estado=in.(registrado,activado)&select=id`, { method: "GET" });
      if (ref?.length) {
        await rest(`referidos?id=eq.${ref[0].id}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ estado: "convertido", convertido: new Date().toISOString() }) });
        await evento("REFERRAL_CONVERTED", `${clave}:ref`, sub, { referido: ref[0].id }, meta, uid);
      }
    }
    // Afiliado: comisión sobre cada cobro de una suscripción que llegó por su enlace (código validado contra la tabla)
    const codigo = (s.atribucion?.first?.ref || attr.first.ref || "").toLowerCase();
    if (codigo && total > 0) {
      const af = await rest(`afiliados?codigo=eq.${encodeURIComponent(codigo)}&estado=eq.activo&select=comision_pct`, { method: "GET" });
      if (af?.length) {
        await rest("afiliado_conversiones?on_conflict=order_id", { method: "POST", headers: { Prefer: "resolution=ignore-duplicates,return=minimal" },
          body: JSON.stringify({ codigo, order_id: `inv-${d.id}`, subscription_id: sub, importe_cent: total, comision_cent: Math.round((total * af[0].comision_pct) / 100) }) });
        await evento("AFFILIATE_CONVERSION", `${clave}:af`, sub, { codigo, importe_cent: total }, meta, uid);
      }
    }
    return { cobro: total, renovacion };
  }
  return { ignorado: nombre || d.type };
}

if (import.meta.main) Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("método no permitido", { status: 405 });
  const cuerpo = await req.text();
  if (cuerpo.length > 200_000) return new Response("demasiado grande", { status: 413 });
  if (!(await firmaValida(cuerpo, req.headers.get("x-signature"), env("LEMONSQUEEZY_WEBHOOK_SECRET")))) return new Response("firma no válida", { status: 401 });
  try {
    return Response.json(await procesar(JSON.parse(cuerpo)));
  } catch (e) {
    console.error("lemon-webhook", String(e).slice(0, 300));
    return new Response("error", { status: 500 }); // Lemon Squeezy reintenta; el proceso es idempotente
  }
});
