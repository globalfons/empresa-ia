// Panel del opositor: progreso, dominio por título, puntos débiles, nota orientativa y logros.
(function () {
  var el = document.getElementById("panel");
  if (!el || !window.TL) return;
  // Contexto: ?c=<oposición o ley>, o la oposición elegida, o la ley por defecto
  var sel = document.getElementById("ctx");
  var qc = (location.search.match(/[?&]c=([a-z0-9-]+)/) || [])[1];
  var LEY = qc || TL.miOposicion() || el.getAttribute("data-ley");
  if (sel) {
    if (![].some.call(sel.options, function (o) { return o.value === LEY; })) LEY = el.getAttribute("data-ley");
    sel.value = LEY;
    sel.onchange = function () { location.href = TL.root + "panel/?c=" + sel.value; };
  }
  var ES_OP = TL.esOposicion(LEY);
  var LEY_URL = ES_OP ? TL.root + "oposiciones/" + LEY + "/" : TL.root + LEY + "/";
  function artUrl(k) { var p = String(k).split(":"); return p.length > 1 ? TL.root + p[0] + "/articulo-" + p[1] + "/" : LEY_URL + "articulo-" + k + "/"; }
  function artNum(k) { var p = String(k).split(":"); return p[p.length - 1]; }

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function fmt(n) { return (Math.round(n * 10) / 10).toLocaleString("es-ES"); }
  function ring(pct) {
    var r = 52, c = 2 * Math.PI * r, off = c * (1 - pct / 100);
    return '<svg viewBox="0 0 120 120" class="ring" role="img" aria-label="' + pct + ' % de dominio">' +
      '<circle cx="60" cy="60" r="' + r + '" class="ring-bg"/>' +
      '<circle cx="60" cy="60" r="' + r + '" class="ring-fg" stroke-dasharray="' + c.toFixed(1) + '" stroke-dashoffset="' + off.toFixed(1) + '"/>' +
      '<text x="60" y="58" class="ring-num">' + pct + '%</text><text x="60" y="78" class="ring-lbl">dominio</text></svg>';
  }
  function mensaje(s) {
    if (!s.respuestas) return "Empieza con un repaso de 20 preguntas: en 10 minutos tendrás tu primera nota orientativa.";
    if (s.nota >= 9) return "Nivel de sobresaliente. Mantén la racha y repasa solo lo que falles.";
    if (s.nota >= 7) return "Vas muy bien. Tus puntos débiles de abajo son lo que te separa del 9.";
    if (s.nota >= 5) return "Ya estarías aprobando esta parte. Ahora toca asegurar los títulos donde flojeas.";
    if (s.cuenta.nueva > s.total / 2) return "Aún te queda más de la mitad del banco por ver. Cada test sube tu nota.";
    return "Buen comienzo. Repasa tus fallos: es la forma más rápida de subir la nota.";
  }

  function pintar(data, perfil) {
    var s = TL.stats(LEY, data);
    var log = TL.logros(s);
    var ses = TL.sesion();
    var tot = s.total || 1;
    var seg = ["dominada", "aprendida", "fallada", "nueva"];
    var etiqueta = { dominada: "Dominadas", aprendida: "Aprendidas", fallada: "Por repasar", nueva: "Sin ver" };

    var bloques = Object.keys(s.porBloque).map(function (b) {
      var x = s.porBloque[b]; return { b: b, pct: Math.round((100 * x.dom) / x.n), n: x.n, vistas: x.vistas };
    });
    var debiles = Object.keys(s.porArt).map(function (a) { var x = s.porArt[a]; return { a: a, fallos: x.fallos, pct: Math.round((100 * x.dom) / x.n) }; })
      .filter(function (x) { return x.fallos > 0; }).sort(function (x, y) { return y.fallos - x.fallos || x.pct - y.pct; }).slice(0, 6);
    var fuertes = bloques.filter(function (b) { return b.pct >= 70; }).map(function (b) { return b.b.split(".")[0]; });
    var ult = s.sesiones.slice(-12);

    el.innerHTML =
      // Cabecera
      '<section class="hero-panel">' +
      '<div class="hp-main"><span class="kicker">' + (ses ? "Hola, " + esc((perfil && perfil.alias) || ses.user.email.split("@")[0]) : "Tu progreso en este dispositivo") + "</span>" +
      '<h1>Nota orientativa: <span class="nota-big">' + fmt(s.nota) + "</span><small>/10</small></h1>" +
      '<p class="stars big" aria-label="' + s.estrellas + ' de 5 estrellas">' + "★★★★★".slice(0, s.estrellas) + '<span class="off">' + "★★★★★".slice(s.estrellas) + "</span></p>" +
      '<p class="lead">' + mensaje(s) + "</p>" +
      '<a class="cta" href="' + LEY_URL + '#quiz">' + (s.respuestas ? "Seguir practicando" : "Hacer mi primer test") + "</a></div>" +
      '<div class="hp-ring">' + ring(s.dominioPct) + "</div></section>" +

      // KPIs
      '<div class="kpis">' +
      '<div class="kpi"><span class="kpi-n">' + s.respuestas + '</span><span class="kpi-l">respuestas</span></div>' +
      '<div class="kpi"><span class="kpi-n">' + s.acierto + ' %</span><span class="kpi-l">de acierto</span></div>' +
      '<div class="kpi"><span class="kpi-n">🔥 ' + s.racha + '</span><span class="kpi-l">días de racha</span></div>' +
      '<div class="kpi"><span class="kpi-n">' + s.cuenta.dominada + "/" + s.total + '</span><span class="kpi-l">dominadas</span></div></div>' +

      // Estado del banco
      '<section class="card"><h2>Estado de las ' + s.total + " preguntas disponibles</h2>" +
      '<div class="stack">' + seg.map(function (k) { return s.cuenta[k] ? '<span class="st-' + k + '" style="width:' + (100 * s.cuenta[k]) / tot + '%"></span>' : ""; }).join("") + "</div>" +
      '<ul class="legend">' + seg.map(function (k) { return '<li><i class="st-' + k + '"></i>' + etiqueta[k] + " <b>" + s.cuenta[k] + "</b></li>"; }).join("") + "</ul>" +
      '<p class="muted small">Una pregunta está <b>dominada</b> cuando la aciertas dos veces seguidas; si la fallas, vuelve a <b>por repasar</b>.</p></section>' +

      // Temario de la oposición
      (s.porTema
        ? '<section class="card"><h2>Tu temario tema a tema</h2><ol class="temario compact">' +
          s.porTema.map(function (x) {
            var estado = x.t.tipo === "no_legislativo" ? '<span class="chip grey">Fuera de TestLey</span>'
              : !x.cubierto ? '<span class="chip grey">En preparación</span>'
              : '<span class="tema-pct ' + (x.pct >= 70 ? "good" : x.pct >= 40 ? "mid" : "low") + '">' + x.pct + " %</span>";
            return '<li value="' + x.t.n + '"><span>' + esc(x.t.t.length > 90 ? x.t.t.slice(0, 88) + "…" : x.t.t) + "</span>" + estado + "</li>";
          }).join("") + '</ol><p class="muted small">El % es tu dominio de las preguntas de las leyes de ese tema. Los temas "en preparación" se irán activando a medida que publiquemos sus leyes.</p></section>'
        : "") +
      // Por título
      '<section class="card"><h2>Qué dominas y qué no</h2>' +
      bloques.map(function (b) {
        var cls = b.pct >= 70 ? "good" : b.pct >= 40 ? "mid" : "low";
        return '<div class="tbar"><div class="tbar-top"><span>' + esc(b.b) + '</span><b>' + b.pct + ' %</b></div><div class="tbar-track"><span class="' + cls + '" style="width:' + b.pct + '%"></span></div><span class="muted small">' + b.vistas + " de " + b.n + " preguntas vistas</span></div>";
      }).join("") +
      (fuertes.length ? '<p class="muted small">Tus puntos fuertes: ' + fuertes.join(", ") + ".</p>" : "") + "</section>" +

      // Puntos débiles
      '<section class="card"><h2>Tus puntos débiles</h2>' +
      (debiles.length
        ? '<ul class="weak">' + debiles.map(function (d) {
            return '<li><a href="' + artUrl(d.a) + '"><b>' + (ES_OP ? esc(data.arts[d.a].b) + " · " : "") + "Art. " + artNum(d.a) + "</b> · " + esc(data.arts[d.a].t) + "</a><span>" + d.fallos + " fallo" + (d.fallos > 1 ? "s" : "") + "</span></li>";
          }).join("") + '</ul><a class="btn primary" href="' + LEY_URL + '#quiz">Repasar mis fallos</a>'
        : '<p class="muted">' + (s.respuestas ? "¡Ningún fallo pendiente! Sigue con preguntas nuevas." : "Aparecerán aquí los artículos que más fallas.") + "</p>") + "</section>" +

      // Evolución
      '<section class="card"><h2>Tus últimos tests</h2>' +
      (ult.length
        ? '<div class="spark">' + ult.map(function (x) {
            var n = x[1] ? Math.max(0, ((x[2] - x[3] / 3) / x[1]) * 10) : 0;
            var d = new Date(x[0]);
            return '<div class="sp-col" title="' + d.toLocaleDateString("es-ES") + ": " + fmt(n) + '"><span style="height:' + Math.max(4, n * 10) + '%" class="' + (n >= 5 ? "good" : "low") + '"></span><small>' + fmt(n) + "</small></div>";
          }).join("") + '</div><p class="muted small">Nota de cada test con penalización (cada error resta 1/3). La línea del 5 es el aprobado orientativo.</p>'
        : '<p class="muted">Cuando completes tests verás aquí tu evolución.</p>') + "</section>" +

      // Logros
      '<section class="card"><h2>Logros</h2><div class="badges">' +
      log.map(function (l) { return '<div class="badge ' + (l.ok ? "on" : "") + '"><span class="b-ico">' + l.icono + "</span><b>" + l.nombre + "</b><small>" + l.desc + "</small></div>"; }).join("") +
      "</div></section>" +

      // Cuenta
      '<section class="card" id="cuenta-box"><h2>Tu cuenta</h2>' +
      (ses
        ? "<p>Has iniciado sesión como <b>" + esc(ses.user.email) + "</b>. Tu progreso se guarda en la nube y aparece en todos tus dispositivos.</p>" +
          '<form id="perfil-form" class="form-inline"><label>Nombre en el ranking <input name="alias" maxlength="24" required value="' + esc((perfil && perfil.alias) || "") + '"></label>' +
          '<label class="check"><input type="checkbox" name="en_ranking"' + (!perfil || perfil.en_ranking !== false ? " checked" : "") + "> Aparecer en el ranking</label>" +
          '<button class="btn">Guardar</button><span class="muted small" id="perfil-msg"></span></form>' +
          '<p><a href="' + TL.root + 'ranking/">Ver el ranking</a> · <button class="linklike" id="salir">Cerrar sesión</button></p>'
        : TL.online
          ? '<p>Estás usando TestLey sin cuenta: tu progreso solo se guarda en este navegador.</p><a class="btn primary" href="' + TL.root + 'cuenta/">Crear cuenta gratis y guardar mi progreso</a>'
          : '<p>Tu progreso se guarda automáticamente en este navegador. Pronto podrás crear una cuenta para sincronizarlo entre dispositivos y entrar en el ranking.</p>') +
      "</section>";

    var f = el.querySelector("#perfil-form");
    if (f) f.onsubmit = function (e) {
      e.preventDefault();
      var m = el.querySelector("#perfil-msg");
      TL.actualizarPerfil({ alias: f.alias.value.trim(), en_ranking: f.en_ranking.checked })
        .then(function () { m.textContent = "Guardado ✓"; })
        .catch(function (err) { m.textContent = /duplicate|unique/i.test(err.message) ? "Ese nombre ya está cogido." : err.message; });
    };
    var sb = el.querySelector("#salir");
    if (sb) sb.onclick = function () { TL.salir().then(function () { location.href = TL.root; }); };
  }

  TL.cargar(LEY).then(function (data) {
    pintar(data, null);
    if (TL.online && TL.sesion()) {
      TL.bajar().then(function () { TL.subir(LEY); return TL.perfil(); }).then(function (p) { pintar(data, p); }).catch(function () {});
    }
  }).catch(function () { el.innerHTML = "<p>No se ha podido cargar tu progreso. Recarga la página.</p>"; });
})();
