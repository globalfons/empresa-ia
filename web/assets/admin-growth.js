// /admin/growth/: métricas de negocio desde la RPC admin_metricas (solo administradores; la comprobación la hace Postgres).
(function () {
  var el = document.getElementById("metricas-negocio");
  if (!el || !window.TL || !TL.online || !TL.sesion()) return;
  var C = window.TL_CONFIG;
  function esc(s) { return String(s == null ? "—" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function pct(a, b) { return b ? Math.round((1000 * a) / b) / 10 + " %" : "—"; }
  fetch(C.supabaseUrl + "/rest/v1/rpc/admin_metricas", { method: "POST", headers: { apikey: C.supabaseAnonKey, Authorization: "Bearer " + TL.sesion().access_token, "Content-Type": "application/json" }, body: JSON.stringify({ p_dias: 30 }) })
    .then(function (r) { return r.ok ? r.json() : r.text().then(function (t) { throw new Error(/administradores/.test(t) ? "Tu cuenta no es de administrador." : "Métricas no disponibles (¿esquema v4 aplicado?)."); }); })
    .then(function (m) {
      var e = m.embudo || {};
      var pasos = [["Visitas", e.visitas], ["Registros", e.registros], ["Activados", e.activados], ["Muro de pago", e.muro_pago], ["Checkout", e.checkout], ["Premium", e.premium]];
      el.innerHTML = '<p class="muted small">Últimos ' + m.periodo_dias + " días</p>" +
        '<div class="kpis">' + pasos.map(function (p, i) { return '<div class="kpi"><span class="kpi-n">' + esc(p[1]) + '</span><span class="kpi-l">' + p[0] + (i ? " · " + pct(p[1], pasos[i - 1][1]) : "") + "</span></div>"; }).join("") +
        '<div class="kpi"><span class="kpi-n">' + esc(m.mrr_eur) + ' €</span><span class="kpi-l">MRR</span></div><div class="kpi"><span class="kpi-n">' + esc(m.suscripciones_activas) + '</span><span class="kpi-l">suscripciones activas</span></div>' +
        '<div class="kpi"><span class="kpi-n">' + esc(m.retencion_semanal) + ' %</span><span class="kpi-l">retención semanal</span></div><div class="kpi"><span class="kpi-n">' + esc(m.ltv_eur) + '</span><span class="kpi-l">LTV (con datos suficientes)</span></div></div>' +
        "<h3>Canales (first touch)</h3><ul class=\"nov\">" + Object.keys(m.por_canal || {}).map(function (k) { return "<li>" + esc(k) + ": " + m.por_canal[k].registros + " registros · " + m.por_canal[k].premium + " premium</li>"; }).join("") + "</ul>" +
        "<h3>Campañas y contenidos (last touch)</h3><ul class=\"nov\">" + (m.por_campana || []).map(function (x) { return "<li>campaña <b>" + esc(x.campana) + "</b> · " + x.visitas + " visitas · " + x.registros + " registros · " + x.premium + " premium</li>"; }).join("") +
        (m.por_contenido || []).map(function (x) { return "<li>contenido <code>" + esc(x.contenido) + "</code> · " + x.visitas + " visitas · " + x.registros + " registros · " + x.premium + " premium</li>"; }).join("") + "</ul>" +
        "<h3>Top landings</h3><ul class=\"nov\">" + (m.top_landings || []).map(function (x) { return "<li>" + esc(x.landing) + " · " + x.visitas + "</li>"; }).join("") + "</ul>" +
        "<h3>Top oposiciones</h3><ul class=\"nov\">" + (m.top_oposiciones || []).map(function (x) { return "<li>" + esc(x.oposicion) + " · " + x.visitas + "</li>"; }).join("") + "</ul>" +
        "<h3>Búsquedas sin resultado</h3><ul class=\"nov\">" + (m.busquedas_sin_resultado || []).map(function (x) { return "<li>«" + esc(x.q) + "» · " + x.n + "</li>"; }).join("") + "</ul>" +
        "<h3>Afiliados</h3><ul class=\"nov\">" + (m.afiliados || []).map(function (a) { return "<li><b>" + esc(a.codigo) + "</b> " + esc(a.nombre) + " · clics " + a.clics + " · registros " + a.registros + " · activados " + a.activados + " · premium " + a.premium + " · ingresos " + a.ingresos_eur + " € · comisión " + a.comision_eur + " €</li>"; }).join("") + "</ul>" +
        "<h3>Referidos</h3><p>" + esc((m.referidos || {}).total) + " referidos · " + esc((m.referidos || {}).convertidos) + " convertidos · " + esc((m.referidos || {}).rechazados) + " rechazados o en revisión (antifraude)</p>" +
        "<h3>Experimentos</h3><ul class=\"nov\">" + (m.experimentos || []).map(function (x) { return "<li>" + esc(x.exp) + " · variante " + esc(x["var"]) + " · expuestos " + x.expuestos + " · registros " + x.registros + "</li>"; }).join("") + "</ul>";
    }).catch(function (err) { el.innerHTML = '<p class="muted">' + esc(err.message) + "</p>"; });
})();
