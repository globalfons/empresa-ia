// deno test --allow-env tests/deno/  → prueba el webhook de Lemon Squeezy con un Supabase simulado (fetch interceptado).
import { firmaValida, procesar } from "../../supabase/functions/lemon-webhook/index.ts";
const assert = (c: unknown, m = "fallo") => { if (!c) throw new Error(m); };
Deno.env.set("SUPABASE_URL", "http://sb.test"); Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "srv");
const llamadas: { url: string; method: string; body: any; prefer: string }[] = [];
let respuestas: Record<string, unknown> = {};
globalThis.fetch = (async (u: string, init: RequestInit = {}) => {
  const h = new Headers(init.headers); llamadas.push({ url: u, method: init.method || "GET", body: init.body ? JSON.parse(String(init.body)) : null, prefer: h.get("Prefer") || "" });
  const k = Object.keys(respuestas).find((x) => u.includes(x));
  return new Response(k ? JSON.stringify(respuestas[k]) : "", { status: 200 });
}) as typeof fetch;

async function hmac(s: string, k: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(k), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return [...new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(s)))].map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.test("firma HMAC: válida, alterada, ausente", async () => {
  const cuerpo = '{"meta":{}}', f = await hmac(cuerpo, "secreto");
  assert(await firmaValida(cuerpo, f, "secreto"));
  assert(!(await firmaValida(cuerpo + " ", f, "secreto")), "cuerpo alterado");
  assert(!(await firmaValida(cuerpo, f, "otro")), "otro secreto");
  assert(!(await firmaValida(cuerpo, null, "secreto")), "sin firma");
  assert(!(await firmaValida(cuerpo, f, "")), "sin secreto configurado");
});

Deno.test("alta de suscripción: upsert + SUBSCRIPTION_STARTED con atribución", async () => {
  llamadas.length = 0;
  const r = await procesar({ meta: { event_name: "subscription_created", custom_data: { user_id: "11111111-1111-1111-1111-111111111111", fs: "tiktok", fc: "lanzamiento", ref: "academia1", anon_id: "a".repeat(20) } },
    data: { type: "subscriptions", id: 77, attributes: { status: "on_trial", user_email: "a@x.es", created_at: "2026-09-29T10:00:00Z", variant_id: 5 } } });
  assert(r.evento === "SUBSCRIPTION_STARTED");
  const up = llamadas.find((l) => l.url.includes("suscripciones?on_conflict=id"))!;
  assert(up.body.user_id === "11111111-1111-1111-1111-111111111111" && up.body.status === "on_trial" && up.prefer.includes("merge-duplicates"));
  const ev = llamadas.find((l) => l.url.includes("eventos?on_conflict=idempotency_key"))!;
  assert(ev.body.type === "SUBSCRIPTION_STARTED" && ev.body.metadata.attr.first.utm_source === "tiktok" && ev.body.idempotency_key.startsWith("ls:subscription_created:77:"));
  assert(ev.prefer.includes("ignore-duplicates"), "idempotente");
});

Deno.test("user_id no válido en custom_data se ignora", async () => {
  llamadas.length = 0;
  await procesar({ meta: { event_name: "subscription_updated", custom_data: { user_id: "x' or 1=1" } }, data: { type: "subscriptions", id: 78, attributes: { status: "active", user_email: "b@x.es" } } });
  assert(!("user_id" in llamadas[0].body));
});

Deno.test("cobro de renovación: importe, RENEWED, referido convertido y comisión de afiliado", async () => {
  llamadas.length = 0;
  respuestas = { "suscripciones?id=eq.77&select": [{ user_id: "22222222-2222-2222-2222-222222222222", atribucion: { first: { ref: "academia1" } } }],
                 "referidos?referred=eq.": [{ id: 9 }], "afiliados?codigo=eq.academia1": [{ comision_pct: 20 }] };
  const r = await procesar({ meta: { event_name: "subscription_payment_success" }, data: { type: "subscription-invoices", id: 501, attributes: { subscription_id: 77, subtotal: 1599, billing_reason: "renewal", updated_at: "x" } } });
  assert(r.cobro === 1599 && r.renovacion);
  const tipos = llamadas.filter((l) => l.url.includes("eventos?")).map((l) => l.body.type);
  assert(tipos.includes("SUBSCRIPTION_RENEWED") && tipos.includes("REFERRAL_CONVERTED") && tipos.includes("AFFILIATE_CONVERSION"), tipos.join());
  const com = llamadas.find((l) => l.url.includes("afiliado_conversiones"))!;
  assert(com.body.comision_cent === 320 && com.body.order_id === "inv-501");
  respuestas = {};
});

Deno.test("otra tienda: se ignora", async () => {
  Deno.env.set("LS_STORE_ID", "485627");
  const r = await procesar({ meta: { event_name: "subscription_created" }, data: { type: "subscriptions", id: 1, attributes: { store_id: 999 } } });
  assert(r.ignorado === "otra tienda"); Deno.env.delete("LS_STORE_ID");
});
