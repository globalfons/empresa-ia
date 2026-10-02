// deno test --allow-env tests/deno/  → función «banco» (B1): sin entitlement en el servidor no hay contenido premium.
import { responder } from "../../supabase/functions/banco/index.ts";
const assert = (c: unknown, m = "fallo") => { if (!c) throw new Error(m); };
Deno.env.set("SUPABASE_URL", "http://sb.test"); Deno.env.set("SUPABASE_ANON_KEY", "anon"); Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "srv-secreta");
Deno.env.set("LS_STORE_ID", "485627"); Deno.env.set("LS_API_URL", "http://ls.test");

const PREMIUM = { qs: [{ id: "guia-mossos-7", q: "¿Pregunta premium?", o: ["a", "b", "c", "d"], a: 2 }] };
const llamadas: { url: string; auth: string }[] = [];
const planes: Record<string, string> = { "tok-free": "free", "tok-premium": "premium" };
const licencias: Record<string, unknown> = {
  "LIC-OK": { valid: true, license_key: { status: "active" }, meta: { store_id: 485627, product_id: 1 } },
  "LIC-OTRA-TIENDA": { valid: true, license_key: { status: "active" }, meta: { store_id: 1 } },
  "LIC-CADUCADA": { valid: true, license_key: { status: "expired" }, meta: { store_id: 485627 } },
};
globalThis.fetch = (async (u: string, init: RequestInit = {}) => {
  const h = new Headers(init.headers), auth = h.get("authorization") || "";
  llamadas.push({ url: u, auth });
  if (u.endsWith("/rest/v1/rpc/mi_plan")) return new Response(JSON.stringify({ plan: planes[auth.replace("Bearer ", "")] || "free" }));
  if (u.startsWith("http://ls.test/")) return new Response(JSON.stringify(licencias[decodeURIComponent(String(init.body).split("=")[1])] || { valid: false }));
  if (u.includes("/rest/v1/banco_premium")) {
    if (auth !== "Bearer srv-secreta") return new Response("[]", { status: 401 });
    return new Response(JSON.stringify(u.includes("clave=eq.mossos-esquadra") ? [{ datos: PREMIUM }] : []));
  }
  return new Response("", { status: 404 });
}) as typeof fetch;

const pedir = (cuerpo: unknown, token = "anon") =>
  responder(new Request("http://f.test/banco", { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(cuerpo) }));

Deno.test("anónimo (solo clave anónima, sin licencia): 401 y nunca se lee el banco", async () => {
  llamadas.length = 0;
  const r = await pedir({ clave: "mossos-esquadra" });
  assert(r.status === 401, String(r.status));
  assert(!llamadas.some((x) => x.url.includes("banco_premium")), "no consulta el banco");
});

Deno.test("usuario FREE con sesión: 403 sin contenido", async () => {
  llamadas.length = 0;
  const r = await pedir({ clave: "mossos-esquadra" }, "tok-free");
  const t = await r.text();
  assert(r.status === 403, String(r.status));
  assert(!t.includes("premium?"), "no devuelve preguntas");
  assert(!llamadas.some((x) => x.url.includes("banco_premium")));
});

Deno.test("usuario PREMIUM (mi_plan en servidor): 200 con el contenido, sin caché compartida", async () => {
  const r = await pedir({ clave: "mossos-esquadra" }, "tok-premium");
  assert(r.status === 200, String(r.status));
  const d = await r.json();
  assert(d.qs.length === 1 && d.qs[0].id === "guia-mossos-7");
  assert(r.headers.get("cache-control") === "private, no-store");
  assert(!JSON.stringify(d).includes("srv-secreta"), "la clave de servicio no sale");
});

Deno.test("clave de licencia: válida de la tienda → 200; otra tienda, caducada o inventada → 403", async () => {
  assert((await pedir({ clave: "mossos-esquadra", licencia: "LIC-OK" })).status === 200);
  for (const l of ["LIC-OTRA-TIENDA", "LIC-CADUCADA", "INVENTADA"]) assert((await pedir({ clave: "mossos-esquadra", licencia: l })).status === 403, l);
});

Deno.test("sin LS_STORE_ID configurada no se acepta ninguna licencia", async () => {
  Deno.env.delete("LS_STORE_ID");
  try { assert((await pedir({ clave: "mossos-esquadra", licencia: "LIC-OK" })).status === 403); } finally { Deno.env.set("LS_STORE_ID", "485627"); }
});

Deno.test("peticiones inválidas: método, clave con caracteres raros, clave inexistente", async () => {
  assert((await responder(new Request("http://f.test/banco", { method: "GET" }))).status === 405);
  assert((await pedir({ clave: "../secreto" }, "tok-premium")).status === 400);
  assert((await pedir({ clave: "ley-inexistente" }, "tok-premium")).status === 404);
});
