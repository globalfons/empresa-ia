import test from "node:test";
import assert from "node:assert/strict";
import { cargar } from "./entorno.mjs";
const CFG = { supabaseUrl: "https://sb.test", supabaseAnonKey: "anon", flags: { analytics: true, referral: true } };

test("atribución: first touch se conserva, last touch cambia con una campaña nueva", () => {
  const { ctx } = cargar(["web/assets/eventos.js"], CFG);
  const t = ctx.TLEventos._tocar;
  const a = t(null, "https://x.es/landing?utm_source=tiktok&utm_campaign=lanzamiento&ref=Academia_1", "", "t1");
  assert.equal(a.first.utm_source, "tiktok"); assert.equal(a.first.ref, "academia1"); assert.equal(a.first.landing, "/landing");
  const b = t(a, "https://x.es/otra", "", "t2");
  assert.equal(b.first.utm_source, "tiktok"); assert.equal(b.last.utm_source, "tiktok"); assert.equal(b.esNuevaVisita, false);
  const c = t(b, "https://x.es/?utm_source=telegram", "", "t3");
  assert.equal(c.first.utm_source, "tiktok"); assert.equal(c.last.utm_source, "telegram");
  const d = t(null, "https://x.es/", "https://www.google.com/search", "t4");
  assert.equal(d.first.utm_source, "google.com"); assert.equal(d.first.utm_medium, "referral");
});

test("sin consentimiento no se envía nada ni se crea identificador", () => {
  const { ctx, llamadas, almacen } = cargar(["web/assets/eventos.js"], CFG);
  assert.equal(ctx.TLEventos.emitir("TEST_STARTED", {}), false);
  assert.equal(llamadas.length, 0); assert.equal(almacen.has("testley:anon"), false);
  assert.equal(ctx.TLEventos.anonId(), null);
});

test("con consentimiento: evento a la RPC con atribución, una sola vez si se pide", () => {
  const { ctx, llamadas, almacen } = cargar(["web/assets/eventos.js"], CFG);
  almacen.set("testley:consentimiento", "true");
  assert.equal(ctx.TLEventos.emitir("ONBOARDING_COMPLETED", { nivel: "medio" }, { unaVez: "onboarding" }), true);
  assert.equal(ctx.TLEventos.emitir("ONBOARDING_COMPLETED", { nivel: "medio" }, { unaVez: "onboarding" }), false);
  assert.equal(llamadas.length, 1);
  const body = JSON.parse(llamadas[0].o.body);
  assert.match(llamadas[0].u, /rpc\/registrar_evento$/); assert.equal(body.p_tipo, "ONBOARDING_COMPLETED");
  assert.match(body.p_anon, /^[0-9a-f]{24}$/); assert.equal(body.p_meta.attr.first.utm_source, "tiktok");
  ctx.TLEventos.revocar(); assert.equal(ctx.TLEventos.emitir("TEST_STARTED", {}), false);
});

test("flag analytics apagado: nunca envía", () => {
  const { ctx, llamadas, almacen } = cargar(["web/assets/eventos.js"], { ...CFG, flags: { analytics: false } });
  almacen.set("testley:consentimiento", "true");
  assert.equal(ctx.TLEventos.emitir("TEST_STARTED", {}), false); assert.equal(llamadas.length, 0);
});

test("experimentos: asignación determinista y respetando pesos", () => {
  const { ctx } = cargar(["web/assets/eventos.js"], CFG);
  const exp = { id: "cta", variantes: [{ id: "a", peso: 50 }, { id: "b", peso: 50 }] };
  assert.equal(ctx.TLEventos._variante(exp, "abc"), ctx.TLEventos._variante(exp, "abc"));
  const n = { a: 0, b: 0 }; for (let i = 0; i < 2000; i++) n[ctx.TLEventos._variante(exp, "id" + i)]++;
  assert.ok(n.a > 850 && n.b > 850, JSON.stringify(n));
  assert.equal(ctx.TLEventos._variante({ id: "x", variantes: [{ id: "a", peso: 0 }, { id: "b", peso: 1 }] }, "z"), "b");
});
