// Mis errores: todas las preguntas falladas alguna vez en el contexto elegido (oposición o ley), con tema, nº de fallos,
// última vez fallada, dificultad y próximo repaso (repetición espaciada). Acciones: repasar una, crear test con mis errores.
(function () {
  var el = document.getElementById("errores");
  if (!el || !window.TL) return;
  var sel = document.getElementById("ctx");
  var ctx = (location.search.match(/[?&]c=([a-z0-9-]+)/) || [])[1] || TL.miOposicion() || (sel && sel.options[0].value);
  if (sel) { if (![].some.call(sel.options, function (o) { return o.value === ctx; })) ctx = sel.options[0].value; sel.value = ctx; sel.onchange = function () { location.href = TL.root + "errores/?c=" + sel.value; }; }
  var ES_OP = TL.esOposicion(ctx), URL_CTX = TL.root + (ES_OP ? "oposiciones/" + ctx + "/" : ctx + "/");
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function fecha(t) { return t ? new Date(t).toLocaleDateString("es-ES", { day: "numeric", month: "short" }) : "—"; }
  var DIF = { 1: "Fácil", 2: "Media", 3: "Difícil" };
  TL.cargar(ctx).then(function (data) {
    var ahora = Date.now();
    var filas = data.qs.map(function (q) { var l = q.ley || ctx, r = TL.registro(l, q.id); return { q: q, l: l, r: r }; })
      .filter(function (x) { return x.r && x.r[1] > 0; })
      .map(function (x) { x.estado = TL.estado(x.l, x.q.id); x.prox = TL.proximoRepaso(x.r); return x; })
      .sort(function (a, b) { return (a.estado === "fallada" ? 0 : 1) - (b.estado === "fallada" ? 0 : 1) || b.r[1] - a.r[1]; });
    var temaDe = function (q) { return q.tm && data.temario ? q.tm.map(function (i) { return "Tema " + data.temario[i].n; }).join(", ") : ""; };
    var pend = filas.filter(function (x) { return x.estado === "fallada"; }).length, hoy = filas.filter(function (x) { return x.prox <= ahora; }).length;
    if (!filas.length) { el.innerHTML = '<div class="box">Todavía no has fallado ninguna pregunta aquí. <a href="' + URL_CTX + '#test=repaso">Haz un test</a> y tus errores aparecerán en esta lista para repasarlos.</div>'; return; }
    el.innerHTML = '<div class="kpis"><div class="kpi"><span class="kpi-n">' + filas.length + '</span><span class="kpi-l">preguntas falladas alguna vez</span></div><div class="kpi"><span class="kpi-n">' + pend + '</span><span class="kpi-l">pendientes (último intento mal)</span></div><div class="kpi"><span class="kpi-n">' + hoy + '</span><span class="kpi-l">toca repasar hoy</span></div></div>' +
      '<p class="actions">' + (pend ? '<a class="cta" href="' + URL_CTX + '#test=fallos">Crear test con mis ' + pend + " errores pendientes</a> " : "") + '<a class="btn" href="' + URL_CTX + '#test=repaso">Repaso de hoy (repetición espaciada)</a></p>' +
      '<div class="tabla-scroll"><table class="tabla"><thead><tr><th>Pregunta</th><th>Tema · ley</th><th>Fallos</th><th>Última vez fallada</th><th>Dificultad</th><th>Estado</th><th></th></tr></thead><tbody>' +
      filas.map(function (x) {
        var q = x.q, art = q.artn || q.art;
        return "<tr><td><small>" + esc(q.q.length > 110 ? q.q.slice(0, 108) + "…" : q.q) + "</small></td><td><small>" + esc(temaDe(q)) + (temaDe(q) ? "<br>" : "") + esc((data.leyes || {})[x.l] || x.l) + " · art. " + esc(art) + "</small></td><td><b>" + x.r[1] + "</b></td><td><small>" + fecha(x.r[4] || (x.estado === "fallada" ? x.r[3] : 0)) + "</small></td><td><small>" + (DIF[q.dif] || "—") + "</small></td><td><small>" +
          (x.estado === "fallada" ? '<b class="bad">Pendiente</b>' : "Superada · repasar el " + fecha(x.prox)) + '</small></td><td><a class="small" href="' + TL.root + x.l + "/articulo-" + esc(art) + '/">Repasar</a></td></tr>';
      }).join("") + "</tbody></table></div>" +
      '<p class="muted small">Repetición espaciada: una pregunta fallada vuelve enseguida; cada acierto seguido alarga el intervalo (1, 3, 7, 16 y 35 días).</p>';
  }).catch(function () { el.innerHTML = "<p>No se han podido cargar tus errores. Recarga la página.</p>"; });
})();
