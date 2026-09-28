// Ranking general: usuarios reales con cuenta que han aceptado aparecer. Nunca datos de ejemplo.
(function () {
  var el = document.getElementById("ranking");
  if (!el || !window.TL) return;
  var sel = document.getElementById("ctx");
  var qc = (location.search.match(/[?&]c=([a-z0-9-]+)/) || [])[1];
  var LEY = qc || TL.miOposicion() || el.getAttribute("data-ley");
  if (sel) {
    if (![].some.call(sel.options, function (o) { return o.value === LEY; })) LEY = el.getAttribute("data-ley");
    sel.value = LEY;
    sel.onchange = function () { location.href = TL.root + "ranking/?c=" + sel.value; };
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function fmt(n) { return (Math.round(n * 10) / 10).toLocaleString("es-ES"); }

  if (!TL.online) {
    el.innerHTML = '<div class="card empty"><p class="big-ico">🏆</p><h2>El ranking se abre muy pronto</h2><p>Cuando se activen las cuentas podrás competir con otros opositores por la mejor nota. Mientras tanto, prepara tu posición: tu progreso ya se está guardando.</p><a class="cta" href="' + TL.root + (/^ley-/.test(LEY) ? LEY : 'oposiciones/' + LEY) + '/#quiz">Practicar ahora</a></div>';
    return;
  }
  el.innerHTML = '<p class="muted">Cargando ranking…</p>';
  TL.ranking(LEY).then(function (filas) {
    filas = filas || [];
    var ses = TL.sesion();
    if (!filas.length) {
      el.innerHTML = '<div class="card empty"><p class="big-ico">🏆</p><h2>Aún no hay nadie en el ranking</h2><p>Sé el primero: crea tu cuenta y haz un test.</p><a class="cta" href="' + TL.root + 'cuenta/">Crear cuenta</a></div>';
      return;
    }
    var medal = ["🥇", "🥈", "🥉"];
    el.innerHTML =
      '<div class="card"><div class="table-scroll"><table class="rank"><thead><tr><th>#</th><th>Opositor</th><th class="num">Nota</th><th class="num">Dominadas</th><th class="num">Respuestas</th></tr></thead><tbody>' +
      filas.map(function (f) {
        var yo = ses && f.es_yo;
        return '<tr class="' + (yo ? "me" : "") + '"><td>' + (medal[f.posicion - 1] || f.posicion) + "</td><td>" + esc(f.alias) + (yo ? " <small>(tú)</small>" : "") +
          '</td><td class="num"><b>' + fmt(f.nota) + '</b></td><td class="num">' + f.dominadas + '</td><td class="num">' + f.respuestas + "</td></tr>";
      }).join("") +
      "</tbody></table></div>" +
      '<p class="muted small">Ordenado por nota orientativa y, en caso de empate, por preguntas dominadas. Solo aparecen usuarios que han elegido participar.</p>' +
      (ses ? "" : '<p><a class="btn primary" href="' + TL.root + 'cuenta/">Crea tu cuenta para aparecer</a></p>') + "</div>";
  }).catch(function () {
    el.innerHTML = '<p class="muted">No se ha podido cargar el ranking. Inténtalo de nuevo en unos minutos.</p>';
  });
})();
