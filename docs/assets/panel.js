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

  function notaSes(x) { var pen = x[6] == null ? 1 / 3 : x[6]; return x[1] ? Math.max(0, ((x[2] - x[3] * pen) / x[1]) * 10) : 0; }
  function fecha(d) { return d.toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short" }); }
  var CATALOGO = [];
  function opInfo(id) { return CATALOGO.filter(function (o) { return o.id === id; })[0]; }
  var ESTADO = { prevista: "Prevista", convocada: "Convocada", plazo_abierto: "Plazo abierto", examen_realizado: "Examen realizado", cerrada: "Cerrada" };

  // Mi oposición + ajustes de estudio + plan adaptativo
  function seccionOposicion(s, data) {
    var aj = TL.ajustes(), info = ES_OP ? opInfo(LEY) : null;
    var form = '<form id="aj-form" class="aj-form">' +
      '<label>Mi oposición<select name="oposicion" class="select">' + CATALOGO.map(function (o) { return '<option value="' + o.id + '"' + (o.id === (ES_OP ? LEY : aj.oposicion) ? " selected" : "") + ">" + esc(o.nombre) + "</option>"; }).join("") + "</select></label>" +
      '<label>Fecha de examen <small class="muted">(la tuya; la oficial se publica en el BOE)</small><input type="date" name="fechaExamen" value="' + esc(aj.fechaExamen || "") + '"></label>' +
      '<label>Horas de estudio a la semana<input type="number" name="horasSemana" min="1" max="60" value="' + esc(aj.horasSemana) + '"></label>' +
      '<label>Mi nivel<select name="nivel" class="select">' + [["empiezo", "Empiezo de cero"], ["medio", "Ya he estudiado algo"], ["avanzado", "Repaso final"]].map(function (x) { return '<option value="' + x[0] + '"' + (aj.nivel === x[0] ? " selected" : "") + ">" + x[1] + "</option>"; }).join("") + "</select></label>" +
      '<button class="btn primary">Guardar y recalcular el plan</button></form>';
    if (!ES_OP) return '<section class="card"><h2>Elige tu oposición</h2><p>Tu plan de estudio, tu temario y tus simulacros se adaptan a la oposición que prepares.</p>' + form + "</section>";
    if (!TL.puede("plan_estudio")) return '<section class="card mi-op"><h2>Mi oposición</h2>' + (info ? "<p><b>" + esc(info.nombre) + "</b></p>" : "") + '<details><summary>Mis ajustes de estudio</summary>' + form + "</details></section>" + bloqueo("Tu plan de estudio adaptativo", "Un plan día a día según tu fecha de examen, tus horas y tus fallos, que se recalcula con cada test.");
    var plan = window.TLPlan ? TLPlan.generar(s, data, aj, info && info.sim, TL.estado) : null;
    var cab = '<section class="card mi-op"><div class="of-head"><h2>Mi oposición</h2>' + (info ? '<span class="badge-oficial">' + esc(ESTADO[info.estado] || info.estado) + "</span>" : "") + "</div>" +
      (info ? '<p><b>' + esc(info.nombre) + "</b>" + (info.plazas ? " · " + info.plazas.toLocaleString("es-ES") + " plazas" : "") + '</p><p class="muted small">Convocatoria oficial: <a href="' + esc(info.fuente) + '" rel="noopener">' + esc(info.ref) + "</a>. <a href=\"" + TL.root + "oposiciones/" + LEY + '/">Ver temario y datos oficiales</a></p>' : "") +
      '<details' + (aj.fechaExamen ? "" : " open") + '><summary>Mis ajustes de estudio</summary>' + form + "</details></section>";
    if (!plan) return cab;
    var aviso = plan.ritmo === "corto" ? '<p class="warn">A este ritmo necesitas unos ' + plan.diasNecesarios + " días para dominar lo pendiente y quedan " + plan.dias + ". Para llegar, sube a unas <b>" + plan.horasNecesarias + " h/semana</b> o céntrate en los temas prioritarios.</p>"
      : plan.ritmo === "ok" ? '<p class="ok-msg">Vas a buen ritmo: con ' + aj.horasSemana + " h/semana dominarías lo pendiente en unos " + plan.diasNecesarios + " días (quedan " + plan.dias + ").</p>"
      : plan.ritmo === "pasado" ? '<p class="warn">La fecha de examen que indicaste ya ha pasado. Actualízala en tus ajustes.</p>'
      : '<p class="muted">Indica tu fecha de examen para ajustar el ritmo. Con ' + aj.horasSemana + " h/semana harías unas " + plan.pregDia + " preguntas al día.</p>";
    var tareaUrl = function (t) { return TL.root + "oposiciones/" + LEY + "/#test=" + t.ancla; };
    return cab + '<section class="card plan"><div class="of-head"><h2>Tu plan de estudio</h2><span class="badge-testley">Calculado por TestLey</span></div>' + aviso +
      '<ol class="plan-dias">' + plan.semana.map(function (d, i) {
        return '<li><b>' + (i === 0 ? "Hoy" : i === 1 ? "Mañana" : fecha(d.fecha)) + "</b><ul>" + d.tareas.map(function (t) {
          return '<li><a href="' + tareaUrl(t) + '">' + esc(t.txt) + "</a>" + (t.det ? '<span class="muted small"> · ' + esc(t.det.length > 60 ? t.det.slice(0, 58) + "…" : t.det) + (t.pct != null ? " · dominio " + t.pct + " %" : "") + "</span>" : "") + "</li>";
        }).join("") + "</ul></li>";
      }).join("") + "</ol>" +
      '<p class="muted small">El plan se recalcula con cada visita según tus aciertos y fallos: prioriza los temas con menos dominio y más errores, reserva tiempo para repasar fallos y añade simulacros según tu nivel y la cercanía del examen (estimamos ' + plan.minPorPregunta + " min por pregunta, incluida la lectura de la cita).</p></section>";
  }

  function bloqueo(titulo, desc) {
    return '<section class="card upsell-card"><h2>🔒 ' + titulo + '</h2><p>' + desc + '</p><a class="btn primary" href="' + TL.root + 'pase/">Probar el Pase Opositor 3 días gratis</a></section>';
  }
  function seccionTutor() {
    if (window.TLTutor && !TL.puede("tutor")) return bloqueo("Tutor IA", "Explicaciones de cada pregunta y respuestas a tus dudas basadas en el texto oficial del BOE.");
    if (!window.TLTutor) return "";
    return '<section class="card tutor-card"><div class="of-head"><h2>Tutor IA</h2><span class="badge-ia">IA</span></div>' +
      '<p class="muted small">Resuelve dudas sobre la ley y tu convocatoria usando solo textos oficiales, y te dice qué estudiar según tus fallos.</p>' +
      '<form id="tutor-f"><label class="sr" for="tutor-q">Tu duda</label><textarea id="tutor-q" maxlength="800" placeholder="Ej.: ¿Qué diferencia hay entre recurso de alzada y de reposición?"></textarea>' +
      '<p><button class="btn primary">Preguntar</button> <button class="btn" type="button" id="tutor-rec">¿Qué estudio ahora?</button></p></form><div id="tutor-out"></div></section>';
  }
  function resumenTutor(s, data) {
    var aj = TL.ajustes();
    return { nota: s.nota, dias: window.TLPlan ? TLPlan.diasHasta(aj.fechaExamen) : null, horas: aj.horasSemana,
      temas: (s.porTema || []).filter(function (x) { return x.cubierto; }).map(function (x) {
        var f = 0; data.qs.forEach(function (q) { if (x.t.leyes.indexOf(q.ley) >= 0 && TL.estado(q.ley, q.id) === "fallada") f++; });
        return { t: x.t.t, pct: x.pct, fallos: f };
      }).sort(function (a, b) { return a.pct - b.pct || b.fallos - a.fallos; }) };
  }

  function seccionSimulacros(s) {
    if (!TL.puede("historial_simulacros")) return bloqueo("Simulacros como el examen real", "Número de preguntas, tiempo, opciones y penalización de tu convocatoria, con análisis de errores e historial.");
    var sims = s.sesiones.filter(function (x) { return x[5] === "simulacro" || x[5] === "examen"; }).slice(-10).reverse();
    return '<section class="card"><h2>Simulacros y exámenes</h2>' + (sims.length
      ? '<table class="tabla"><thead><tr><th>Fecha</th><th>Preguntas</th><th>✔</th><th>✘</th><th>Nota</th></tr></thead><tbody>' + sims.map(function (x) {
          return "<tr><td>" + new Date(x[0]).toLocaleDateString("es-ES") + "</td><td>" + x[1] + "</td><td>" + x[2] + "</td><td>" + x[3] + '</td><td><b class="' + (notaSes(x) >= 5 ? "good" : "bad") + '">' + fmt(notaSes(x)) + "</b></td></tr>";
        }).join("") + "</tbody></table>"
      : '<p class="muted">Aún no has hecho ningún simulacro. Reproducen el formato de tu examen (preguntas, tiempo, opciones y penalización).</p>') +
      '<a class="btn" href="' + LEY_URL + '#test=simulacro">Hacer un simulacro</a></section>';
  }

  function seccionSeguimiento() {
    var aj = TL.ajustes(), favs = aj.favoritas.length;
    var sigo = aj.sigo.map(opInfo).filter(Boolean);
    return '<section class="card"><h2>Favoritas y oposiciones que sigo</h2>' +
      "<p>☆ <b>" + favs + "</b> preguntas favoritas" + (favs ? ' · <a href="' + LEY_URL + '#test=favoritas">Practicarlas</a>' : ' <span class="muted small">(márcalas con la estrella durante un test)</span>') + "</p>" +
      (sigo.length ? '<ul class="weak">' + sigo.map(function (o) { return '<li><a href="' + TL.root + "oposiciones/" + o.id + '/">' + esc(o.nombre) + '</a><span>' + esc(ESTADO[o.estado] || o.estado) + " · revisado " + o.actualizado.split("-").reverse().join("/") + "</span></li>"; }).join("") + "</ul>"
        : '<p class="muted small">Sigue una oposición desde su ficha para recibir avisos de su convocatoria.</p>') +
      (TL.puede("alertas") ? '<div id="avisos"></div>' : '<p class="muted small">🔒 Los avisos de publicaciones del BOE sobre tus convocatorias están incluidos en el <a href="' + TL.root + 'pase/">Pase Opositor</a>.</p>') + "</section>";
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

      seccionOposicion(s, data) +
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
            var n = notaSes(x);
            var d = new Date(x[0]);
            return '<div class="sp-col" title="' + d.toLocaleDateString("es-ES") + ": " + fmt(n) + '"><span style="height:' + Math.max(4, n * 10) + '%" class="' + (n >= 5 ? "good" : "low") + '"></span><small>' + fmt(n) + "</small></div>";
          }).join("") + '</div><p class="muted small">Nota de cada test con penalización (cada error resta 1/3). La línea del 5 es el aprobado orientativo.</p>'
        : '<p class="muted">Cuando completes tests verás aquí tu evolución.</p>') + "</section>" +

      seccionTutor() + seccionSimulacros(s) + seccionSeguimiento() +
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
    var af = el.querySelector("#aj-form");
    if (af) af.onsubmit = function (e) {
      e.preventDefault();
      TL.guardarAjustes({ oposicion: af.oposicion.value, fechaExamen: af.fechaExamen.value, horasSemana: Math.max(1, +af.horasSemana.value || 6), nivel: af.nivel.value });
      location.href = TL.root + "panel/?c=" + af.oposicion.value;
    };
    if (window.TLAvisos) TLAvisos.pintar(el.querySelector("#avisos"));
    var tf = el.querySelector("#tutor-f");
    if (tf) {
      tf.onsubmit = function (e) { e.preventDefault(); TLTutor.duda(el.querySelector("#tutor-q").value, { oposicion: ES_OP ? LEY : null }, el.querySelector("#tutor-out")); };
      el.querySelector("#tutor-rec").onclick = function () { TLTutor.recomendar(resumenTutor(s, data), el.querySelector("#tutor-out")); };
    }
    var sb = el.querySelector("#salir");
    if (sb) sb.onclick = function () { TL.salir().then(function () { location.href = TL.root; }); };
  }

  fetch(TL.root + "datos/catalogo.json").then(function (r) { return r.json(); }).catch(function () { return []; }).then(function (c) { CATALOGO = c; return TL.cargar(LEY); }).then(function (data) {
    pintar(data, null);
    if (TL.online && TL.sesion()) {
      TL.bajar().then(function () { TL.subir(LEY); return TL.perfil(); }).then(function (p) { pintar(data, p); }).catch(function () {});
    }
  }).catch(function () { el.innerHTML = "<p>No se ha podido cargar tu progreso. Recarga la página.</p>"; });
})();
