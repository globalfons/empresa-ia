// TestLey — analítica de producto, atribución, experimentos y referidos (Growth OS, lado navegador).
// Privacidad: sin consentimiento no se envía NADA y no se crea ningún identificador. Con consentimiento se usa un id anónimo aleatorio;
// el usuario lo puede revocar desde el pie de página («Privacidad y cookies»). Eventos → Supabase RPC registrar_evento (validada y con límite).
// Atribución (first touch / last touch / landing) se guarda solo en este navegador y viaja con los eventos y el checkout.
(function () {
  var CFG = window.TL_CONFIG || {}, F = CFG.flags || {};
  var LS_C = "testley:consentimiento", LS_A = "testley:anon", LS_T = "testley:atribucion", LS_U = "testley:una-vez";
  function get(k, d) { try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } }
  function set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function consentimiento() { return get(LS_C, null); } // null = sin decidir · true · false
  function anonId() {
    var a = get(LS_A, null);
    if (!a) { var b = new Uint8Array(12); (window.crypto || {}).getRandomValues ? crypto.getRandomValues(b) : b.forEach(function (_, i) { b[i] = Math.random() * 256; }); a = [].map.call(b, function (x) { return ("0" + x.toString(16)).slice(-2); }).join(""); set(LS_A, a); }
    return a;
  }

  // ---------- Atribución (función pura: probada en tests/js/eventos.test.mjs) ----------
  function tocar(prev, url, referrer, ahora) {
    var p = new URL(url), q = p.searchParams, t = { landing: p.pathname, ts: ahora };
    ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"].forEach(function (k) { if (q.get(k)) t[k] = q.get(k).slice(0, 80); });
    var ref = (q.get("ref") || "").toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 30); if (ref) t.ref = ref;
    if (!t.utm_source && referrer) { try { var h = new URL(referrer).hostname; if (h && h !== p.hostname) { t.utm_source = h.replace(/^www\./, ""); t.utm_medium = "referral"; } } catch (e) {} }
    var nuevo = !!(t.utm_source || t.ref);
    var a = prev || {};
    return { first: a.first || t, last: nuevo || !a.last ? t : a.last, visitas: (a.visitas || 0) + 1, esNuevaVisita: nuevo || !prev };
  }

  // ---------- Experimentos (asignación determinista por id anónimo; nunca precios sin autorización) ----------
  function variante(exp, id) {
    var h = 0, s = exp.id + ":" + id; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    var total = exp.variantes.reduce(function (t, v) { return t + v.peso; }, 0), x = h % total;
    for (var j = 0; j < exp.variantes.length; j++) { x -= exp.variantes[j].peso; if (x < 0) return exp.variantes[j].id; }
    return exp.variantes[0].id;
  }

  var cola = [];
  function emitir(tipo, payload, opts) {
    opts = opts || {};
    if (!F.analytics || consentimiento() !== true || !CFG.supabaseUrl) return false;
    if (opts.unaVez) { var u = get(LS_U, {}); if (u[opts.unaVez]) return false; u[opts.unaVez] = 1; set(LS_U, u); }
    if (opts.debounce) { clearTimeout((emitir.t = emitir.t || {})[opts.debounce]); emitir.t[opts.debounce] = setTimeout(function () { enviar(tipo, payload, opts); }, 1500); return true; }
    enviar(tipo, payload, opts); return true;
  }
  function enviar(tipo, payload, opts) {
    var ses = window.TL && TL.sesion ? TL.sesion() : null, attr = get(LS_T, {});
    var body = { p_tipo: tipo, p_payload: payload || {}, p_anon: anonId(), p_meta: { attr: { first: attr.first, last: attr.last }, path: location.pathname }, p_clave: opts.unaVez || opts.clave || null,
                 p_entidad: opts.entidad || "", p_entidad_id: opts.entidadId || "" };
    fetch(CFG.supabaseUrl + "/rest/v1/rpc/registrar_evento", { method: "POST", keepalive: true,
      headers: { apikey: CFG.supabaseAnonKey, "Content-Type": "application/json", Authorization: "Bearer " + (ses ? ses.access_token : CFG.supabaseAnonKey) }, body: JSON.stringify(body) }).catch(function () {});
  }

  // Activación: oposición elegida + primer test completado + plan/panel visto (una sola vez por usuario)
  function activacion(stats, esOposicion) {
    if (esOposicion && stats.sesiones.length >= 1 && window.TL && TL.sesion()) emitir("USER_ACTIVATED", { tests: stats.sesiones.length }, { unaVez: "activacion" });
  }
  function alta(esEntrada) {
    if (!esEntrada) emitir("USER_REGISTERED", {}, { unaVez: "registro" });
    var r = get(LS_T, {}), cod = (r.first && r.first.ref) || (r.last && r.last.ref);
    if (cod && F.referral && window.TL && TL.sesion() && CFG.supabaseUrl) {
      fetch(CFG.supabaseUrl + "/rest/v1/rpc/registrar_referido", { method: "POST", headers: { apikey: CFG.supabaseAnonKey, "Content-Type": "application/json", Authorization: "Bearer " + TL.sesion().access_token },
        body: JSON.stringify({ p_codigo: cod, p_anon: consentimiento() === true ? anonId() : null }) }).catch(function () {});
    }
  }

  // ---------- Banner de consentimiento ----------
  function banner() {
    if (!F.analytics || consentimiento() !== null || document.getElementById("consent")) return;
    var d = document.createElement("div"); d.id = "consent"; d.className = "consent"; d.setAttribute("role", "dialog"); d.setAttribute("aria-label", "Privacidad");
    d.innerHTML = '<p>Usamos analítica propia y anónima (sin publicidad ni terceros) para saber qué funciona y mejorar TestLey. <a href="' + (CFG.root || "./") + 'legal/privacidad/">Más información</a></p><p><button class="btn primary" data-c="1">Aceptar</button> <button class="btn" data-c="0">Rechazar</button></p>';
    document.body.appendChild(d);
    d.querySelectorAll("button").forEach(function (b) { b.onclick = function () { set(LS_C, b.getAttribute("data-c") === "1"); d.remove(); if (consentimiento()) enviarInicio(); }; });
  }
  function revocar() { set(LS_C, false); try { localStorage.removeItem(LS_A); localStorage.removeItem(LS_U); } catch (e) {} }

  function experimentos() {
    if (!F.experiments) return;
    (CFG.experimentos || []).forEach(function (exp) {
      var els = document.querySelectorAll('[data-exp="' + exp.id + '"]'); if (!els.length) return;
      var v = variante(exp, consentimiento() === true ? anonId() : "sin-consentimiento");
      els.forEach(function (el) { var t = el.getAttribute("data-var-" + v); if (t) el.textContent = t; });
      emitir("EXPERIMENT_EXPOSURE", { exp: exp.id, var: v }, { unaVez: "exp:" + exp.id });
    });
  }

  // La atribución se guarda aunque no haya consentimiento de analítica (solo en este navegador) para poder acreditar referidos y afiliados
  // en el checkout; no se envía a ningún sitio salvo que el usuario compre (Lemon Squeezy) o acepte la analítica.
  var t = tocar(get(LS_T, null), location.href, document.referrer, new Date().toISOString());
  set(LS_T, { first: t.first, last: t.last, visitas: t.visitas });
  // Checkout de Lemon Squeezy: añade la atribución y la cuenta como datos personalizados (checkout[custom][…]).
  // El webhook firmado los recibe y enlaza la suscripción con la cuenta (entitlement en servidor), el afiliado y el canal.
  function decorarCheckout() {
    document.querySelectorAll('a[href*="lemonsqueezy.com/checkout"]').forEach(function (a) {
      a.addEventListener("click", function () {
        var u = new URL(a.href), at = get(LS_T, {}), ses = window.TL && TL.sesion ? TL.sesion() : null, f = at.first || {}, l = at.last || {};
        var c = { user_id: ses && ses.user.id, anon_id: consentimiento() === true ? anonId() : null, ref: f.ref || l.ref, fs: f.utm_source, fc: f.utm_campaign, ls: l.utm_source, lc: l.utm_campaign };
        Object.keys(c).forEach(function (k) { if (c[k]) u.searchParams.set("checkout[custom][" + k + "]", String(c[k]).slice(0, 80)); });
        if (ses && ses.user.email) u.searchParams.set("checkout[email]", ses.user.email);
        a.href = u.toString();
        emitir("CHECKOUT_STARTED", {}, { clave: "checkout:" + new Date().toISOString().slice(0, 10) });
      });
    });
  }
  document.addEventListener("DOMContentLoaded", function () {
    decorarCheckout();
    if (consentimiento() === true) { enviarInicio(); } else banner();
    var rv = document.getElementById("revocar-analitica");
    if (rv) rv.onclick = function (e) { e.preventDefault(); revocar(); rv.textContent = "Analítica desactivada"; };
  });
  function enviarInicio() {
    if (t.esNuevaVisita) emitir("LANDING_VISIT", {}); else emitir("PAGE_VIEW", {});
    var op = document.getElementById("op-accion");
    if (op && !op.getAttribute("data-tipo")) emitir("OPPOSITION_VIEW", {}, { entidad: "oposicion", entidadId: op.getAttribute("data-op") });
    experimentos();
  }
  window.TLEventos = { emitir: emitir, activacion: activacion, alta: alta, atribucion: function () { return get(LS_T, {}); }, anonId: function () { return consentimiento() === true ? anonId() : null; },
    consentimiento: consentimiento, revocar: revocar, _tocar: tocar, _variante: variante };
})();
