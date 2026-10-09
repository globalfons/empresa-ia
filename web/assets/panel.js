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
      '<fieldset class="dias"><legend class="small muted">Días que puedes estudiar</legend>' + [[1, "L"], [2, "M"], [3, "X"], [4, "J"], [5, "V"], [6, "S"], [0, "D"]].map(function (d) { return '<label class="check"><input type="checkbox" name="dia" value="' + d[0] + '"' + ((aj.dias || [0, 1, 2, 3, 4, 5, 6]).indexOf(d[0]) >= 0 ? " checked" : "") + "> " + d[1] + "</label>"; }).join("") + "</fieldset>" +
      '<label>Mi nivel<select name="nivel" class="select">' + [["empiezo", "Empiezo de cero"], ["medio", "Ya he estudiado algo"], ["avanzado", "Repaso final"]].map(function (x) { return '<option value="' + x[0] + '"' + (aj.nivel === x[0] ? " selected" : "") + ">" + x[1] + "</option>"; }).join("") + "</select></label>" +
      '<button class="btn primary">Guardar y recalcular el plan</button></form>';
    if (!ES_OP) return '<section class="card"><h2>Elige tu oposición</h2><p>Tu plan de estudio, tu temario y tus simulacros se adaptan a la oposición que prepares.</p>' + form + "</section>";
    if (!TL.puede("plan_estudio")) return '<section class="card mi-op"><h2>Mi oposición</h2>' + (info ? "<p><b>" + esc(info.nombre) + "</b></p>" : "") + '<details><summary>Mis ajustes de estudio</summary>' + form + "</details></section>" + bloqueo("Tu plan de estudio adaptativo", "Un plan día a día según tu fecha de examen, tus horas y tus fallos, que se recalcula con cada test.");
    var plan = window.TLPlan ? TLPlan.generar(s, data, Object.assign({ _rutaOp: TL.root + "oposiciones/" + LEY + "/" }, aj), info && info.sim, TL.estado) : null;
    var cab = '<section class="card mi-op"><div class="of-head"><h2>Mi oposición</h2>' + (info ? '<span class="badge-oficial">' + esc(ESTADO[info.estado] || info.estado) + "</span>" : "") + "</div>" +
      (info ? '<p><b>' + esc(info.nombre) + "</b>" + (info.plazas ? " · " + info.plazas.toLocaleString("es-ES") + " plazas" : "") + '</p><p class="muted small">Convocatoria oficial: <a href="' + esc(info.fuente) + '" rel="noopener">' + esc(info.ref) + "</a>. <a href=\"" + TL.root + "oposiciones/" + LEY + '/">Ver temario y datos oficiales</a></p>' : "") +
      '<details' + (aj.fechaExamen ? "" : " open") + '><summary>Mis ajustes de estudio</summary>' + form + "</details></section>";
    if (!plan) return cab;
    var aviso = plan.ritmo === "corto" ? '<p class="warn">A este ritmo necesitas unos ' + plan.diasNecesarios + " días para dominar lo pendiente y quedan " + plan.dias + ". Para llegar, sube a unas <b>" + plan.horasNecesarias + " h/semana</b> o céntrate en los temas prioritarios.</p>"
      : plan.ritmo === "ok" ? '<p class="ok-msg">Vas a buen ritmo: con ' + aj.horasSemana + " h/semana dominarías lo pendiente en unos " + plan.diasNecesarios + " días (quedan " + plan.dias + ").</p>"
      : plan.ritmo === "pasado" ? '<p class="warn">La fecha de examen que indicaste ya ha pasado. Actualízala en tus ajustes.</p>'
      : '<p class="muted">Indica tu fecha de examen para ajustar el ritmo. Con ' + aj.horasSemana + " h/semana harías unas " + plan.pregDia + " preguntas al día.</p>";
    var tareaUrl = function (t) { return t.url || TL.root + "oposiciones/" + LEY + "/#test=" + t.ancla; };
    return cab + '<section class="card plan"><div class="of-head"><h2>Tu plan de estudio</h2><span class="badge-testley">Calculado por TestLey</span></div>' + aviso +
      '<ol class="plan-dias">' + plan.semana.map(function (d, i) {
        if (d.descanso) return '<li><b>' + (i === 0 ? "Hoy" : i === 1 ? "Mañana" : fecha(d.fecha)) + '</b> <span class="muted">Descanso (no es uno de tus días de estudio)</span></li>';
        return '<li><b>' + (i === 0 ? "Hoy" : i === 1 ? "Mañana" : fecha(d.fecha)) + "</b><ul>" + d.tareas.map(function (t) {
          return '<li><a href="' + tareaUrl(t) + '">' + esc(t.txt) + "</a>" + (t.det ? '<span class="muted small"> · ' + esc(t.det.length > 60 ? t.det.slice(0, 58) + "…" : t.det) + (t.pct != null ? " · dominio " + t.pct + " %" : "") + "</span>" : "") + "</li>";
        }).join("") + "</ul></li>";
      }).join("") + "</ol>" +
      '<p class="muted small">El plan se recalcula con cada visita según tus aciertos y fallos: prioriza los temas con menos dominio y más errores, reserva tiempo para repasar fallos y añade simulacros según tu nivel y la cercanía del examen (estimamos ' + plan.minPorPregunta + " min por pregunta, incluida la lectura de la cita).</p></section>";
  }

  function bloqueo(titulo, desc) {
    return '<section class="card upsell-card"><h2>' + titulo + '</h2><p>' + desc + '</p><a class="btn primary" href="' + TL.root + 'pase/">Probar el Pase Opositor 3 días gratis</a></section>';
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
        var f = 0; data.qs.forEach(function (q) { if ((q.tm ? q.tm.indexOf(x.t.i) >= 0 : x.t.leyes.indexOf(q.ley) >= 0) && TL.estado(q.ley, q.id) === "fallada") f++; });
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
      (TL.puede("alertas") ? '<div id="avisos"></div><div id="notif-email"></div>' : '<p class="muted small">Los avisos de publicaciones del BOE sobre tus convocatorias están incluidos en el <a href="' + TL.root + 'pase/">Pase Opositor</a>.</p>') + "</section>";
  }

  // «¿Qué tengo que hacer HOY?»: la primera respuesta del panel. Con Pase sale del plan adaptativo; sin Pase, una sesión básica.
  function seccionHoy(s, data) {
    var aj = TL.ajustes(), info = ES_OP ? opInfo(LEY) : null, MINPQ = 1.5;
    var tareas = [];
    var plan = ES_OP && TL.puede("plan_estudio") && window.TLPlan ? TLPlan.generar(s, data, aj, info && info.sim, TL.estado) : null;
    if (plan && plan.semana.length) tareas = plan.semana[0].tareas.map(function (t) {
      var n = +((t.txt.match(/(\d+) (preguntas|fallos)/) || [])[1] || 0);
      return { txt: t.txt, det: t.det, min: t.min || (t.tipo === "simulacro" ? (info && info.sim ? info.sim.minutos : 30) : Math.max(5, Math.round(n * MINPQ))), ancla: t.ancla, url: t.url };
    });
    if (plan && plan.semana[0] && plan.semana[0].descanso) return '<section class="card hoy"><h2>Tu sesión de hoy</h2><p>Hoy es día de descanso según tus días de estudio. Si te apetece, haz un <a href="' + LEY_URL + '#test=repaso">repaso corto</a>.</p></section>';
    else {
      if (s.cuenta.fallada) tareas.push({ txt: "Repasar " + Math.min(10, s.cuenta.fallada) + " fallos", min: Math.round(Math.min(10, s.cuenta.fallada) * MINPQ), ancla: "fallos" });
      tareas.push({ txt: "Repaso inteligente: 20 preguntas", det: "primero lo que fallas y lo que aún no has visto", min: 30, ancla: "repaso" });
    }
    if (!tareas.length) return "";
    var total = tareas.reduce(function (t, x) { return t + x.min; }, 0);
    var hecho = TL.stats(LEY, data).sesiones.some(function (x) { return new Date(x[0]).toDateString() === new Date().toDateString(); });
    return '<section class="card hoy"><div class="of-head"><h2>Tu sesión de hoy</h2><span class="muted">' + total + " min</span></div>" +
      (hecho ? '<p class="ok-msg">✔ Hoy ya has estudiado. Si te quedan ganas, sigue con la siguiente tarea.</p>' : "") +
      '<ol class="hoy-lista">' + tareas.map(function (t) {
        return '<li><a href="' + (t.url || LEY_URL + "#test=" + t.ancla) + '"><b>' + esc(t.txt) + "</b>" + (t.det ? '<span class="muted small">' + esc(t.det.length > 70 ? t.det.slice(0, 68) + "…" : t.det) + "</span>" : "") + '</a><span class="min">' + t.min + " min</span></li>";
      }).join("") + '</ol><a class="cta" href="' + (tareas[0].url || LEY_URL + "#test=" + tareas[0].ancla) + '">Empezar sesión</a> <a class="small" href="' + TL.root + "errores/?c=" + LEY + '">Mis errores</a>' +
      (plan ? "" : TL.puede("plan_estudio") ? "" : ' <a class="small" href="' + TL.root + 'precios/">Con el Pase, tu sesión sale de un plan adaptado a tu fecha de examen</a>') + "</section>";
  }
  // «Qué debo estudiar hoy» (TLMotor.hoy) a partir del perfil de la oposición y de tu progreso
  var PERFIL = null;
  function seccionQueEstudiar(s, data) {
    if (!ES_OP || !window.TLMotor || !PERFIL) return "";
    var info = opInfo(LEY), h = TLMotor.hoy({ s: s, data: data, aj: TL.ajustes(), perfil: PERFIL, sim: info && info.sim, estado: TL.estado });
    if (h.descanso) return "";
    var mpq = h.minPorPregunta, fila = function (txt, det, n, url) {
      return n ? '<li><a href="' + url + '"><b>' + esc(txt) + "</b>" + (det ? '<span class="muted small">' + esc(det) + "</span>" : "") + '</a><span class="min">' + Math.max(1, Math.round(n * mpq)) + " min</span></li>" : "";
    };
    var items = fila("Repaso: " + h.review.preguntas + " preguntas que te tocan hoy", h.review.pendientes + " pendientes de repaso", h.review.preguntas, LEY_URL + "#test=repaso") +
      h.weak_topics.map(function (t) { return fila("Tema " + t.tema + ": " + t.preguntas + " preguntas", t.titulo + " · dominio " + t.dominio + " %" + (t.fallos ? " · " + t.fallos + " fallos" : ""), t.preguntas, LEY_URL + "#test=" + t.ancla); }).join("") +
      fila("Nuevas: " + h.new_questions.preguntas + " preguntas que aún no has visto", h.new_questions.pendientes + " sin ver", h.new_questions.preguntas, LEY_URL + "#test=repaso") +
      fila("Difíciles: " + h.difficult_questions.preguntas + " preguntas de dificultad alta", null, h.difficult_questions.preguntas, LEY_URL + "#quiz") +
      (h.simulation ? '<li><a href="' + LEY_URL + '#test=simulacro"><b>Simulacro: ' + h.simulation.preguntas + " preguntas en " + h.simulation.minutos + ' min</b><span class="muted small">Toca porque ' + esc(h.simulation.motivo) + '</span></a><span class="min">' + h.simulation.minutos + " min</span></li>" : "");
    if (!items) return "";
    return '<section class="card hoy" id="que-estudiar"><div class="of-head"><h2>Qué debo estudiar hoy</h2><span class="muted">' + h.recommended_minutes + " min recomendados</span></div>" +
      '<ol class="hoy-lista">' + items + "</ol>" +
      (h.temas_sin_preguntas.length ? '<p class="muted small">Temas sin preguntas de TestLey todavía (' + esc(h.temas_sin_preguntas.join(", ")) + "): estúdialos con el material oficial y los exámenes oficiales.</p>" : "") +
      '<p class="muted small">Calculado con tu tiempo disponible, tus fallos y tus repasos pendientes. Es una orientación de TestLey, no un dato oficial.</p></section>';
  }
  // Módulos de preparación del perfil: los de tipo «test» enlazan a los tests; el resto, checklist y registro manual (sin nota)
  // Panel 360: estado de todos los módulos, recomendaciones, reparto semanal y simulacro combinado (panel360.js)
  var OTRAS = ["idiomas", "requisitos", "reconocimiento_medico", "documentacion", "calendario"];
  function seccion360(s) {
    if (!ES_OP || !window.TLPanel360 || !PERFIL || !PERFIL.motor360) return "";
    var cl = window.TLMotor ? PERFIL.modulos.filter(function (m) { return OTRAS.indexOf(m.id) >= 0; }).map(function (m) { var e = TLMotor.estadoModulo(LEY, m); return { id: m.id, nombre: m.nombre, hechas: e.hechas, total: e.total }; }) : [];
    return TLPanel360.seccion(LEY, PERFIL, { stats: s, ajustes: TL.ajustes(), checklists: cl, root: TL.root });
  }
  function seccionPreparacion() {
    if (!ES_OP || !window.TLMotor || !PERFIL || !PERFIL.modulos.length) return "";
    var cal = TLMotor.proximos(PERFIL).slice(0, 4);
    return '<section class="card" id="preparacion"><h2>Preparación completa</h2>' +
      (cal.length ? '<h3>Próximas fechas</h3><ul class="weak cal">' + cal.map(function (c) {
        return "<li><span><b>" + c.fecha.split("-").reverse().join("/") + "</b> · " + esc(c.hito) + "</span><span>" + (c.caracter === "OFICIAL" ? '<span class="badge-oficial">Oficial</span>' : '<span class="chip grey">Previsión</span>') + " " + (c.dias === 0 ? "hoy" : "en " + c.dias + " días") + "</span></li>";
      }).join("") + "</ul>" : "") +
      PERFIL.modulos.map(function (m) {
        var e = TLMotor.estadoModulo(LEY, m);
        if (m.tipo === "test") return '<details class="modulo"><summary><b>' + esc(m.nombre) + '</b> <span class="muted small">' + esc(m.parte_oficial || "") + "</span></summary><p class=\"small\">" + esc(m.descripcion) + '</p><a class="btn" href="' + LEY_URL + (m.id === "examenes_oficiales" ? "examenes-oficiales/" : "#quiz") + '">Practicar</a></details>';
        return '<details class="modulo" data-mod="' + esc(m.id) + '"><summary><b>' + esc(m.nombre) + '</b> <span class="muted small">' + e.hechas + "/" + e.total + " hecho" + (m.parte_oficial ? " · " + esc(m.parte_oficial) : "") + "</span></summary>" +
          '<p class="small">' + esc(m.descripcion) + "</p>" +
          Object.keys(m.datos_oficiales || {}).map(function (k) { var d = m.datos_oficiales[k]; return d.cita ? '<blockquote class="small">«' + esc(d.cita.length > 220 ? d.cita.slice(0, 218) + "…" : d.cita) + "»" + (d.fuente ? ' <a href="' + esc(d.fuente.url) + '" rel="noopener">Fuente oficial</a>' : "") + "</blockquote>" : ""; }).join("") +
          '<ul class="checklist">' + (m.acciones || []).map(function (a, i) { return '<li><label class="check"><input type="checkbox" data-acc="' + i + '"' + (e.acciones[i] ? " checked" : "") + "> " + esc(a) + "</label></li>"; }).join("") + "</ul>" +
          '<form class="form-inline reg-manual"><label>Mi registro <input name="t" maxlength="200" placeholder="p. ej. Course Navette: palier 7"></label><button class="btn">Anotar</button></form>' +
          (e.registros.length ? '<ul class="small muted">' + e.registros.map(function (r) { return "<li>" + new Date(r.ts).toLocaleDateString("es-ES") + " · " + esc(r.texto) + "</li>"; }).join("") + "</ul>" : "") +
          '<p class="muted small">TestLey no mide ni puntúa esta prueba: solo guarda tu checklist y tus anotaciones en este dispositivo.</p></details>';
      }).join("") + "</section>";
  }
  function enlazarPreparacion(repintar) {
    [].forEach.call(el.querySelectorAll("[data-mod]"), function (d) {
      var id = d.getAttribute("data-mod");
      [].forEach.call(d.querySelectorAll("[data-acc]"), function (c) { c.onchange = function () { TLMotor.marcarAccion(LEY, id, +c.getAttribute("data-acc"), c.checked); }; });
      var f = d.querySelector(".reg-manual");
      if (f) f.onsubmit = function (e) { e.preventDefault(); if (TLMotor.registrarManual(LEY, id, f.t.value)) repintar(id); };
    });
  }
  function seccionProgresoSemanal(s) {
    var p = TL.puntos(s), o = TL.objetivoSemanal(p, TL.ajustes().horasSemana);
    return '<section class="card"><div class="of-head"><h2>Tu semana</h2><span class="pill">Nivel ' + p.nivel + " · " + p.total + " puntos</span></div>" +
      '<p>Objetivo: estudiar <b>' + o.diasObjetivo + " días</b> con al menos un <b>70 %</b> de acierto. Llevas <b>" + o.dias + " días</b> y un <b>" + o.precision + " %</b>." + (o.cumplido ? ' <b class="good">✔ Objetivo cumplido</b>' : "") + "</p>" +
      '<div class="tbar-track"><span class="' + (o.cumplido ? "good" : "mid") + '" style="width:' + Math.min(100, Math.round((100 * o.dias) / o.diasObjetivo)) + '%"></span></div>' +
      '<p class="muted small">Los puntos premian la constancia (' + p.constancia + "), la precisión (" + p.precision + ") y lo que dominas (" + p.progreso + "), no el número de preguntas." + (p.siguiente ? " Siguiente nivel: " + p.siguiente + " puntos." : "") + "</p></section>";
  }

  // Invita a otros opositores (flag referral + cuenta). La recompensa se decide al convertirse en premium (con antifraude en el servidor).
  function seccionReferidos() {
    var F = (window.TL_CONFIG || {}).flags || {};
    if (!F.referral || !TL.online || !TL.sesion()) return "";
    return '<section class="card" id="referidos"><h2>Invita a otros opositores</h2><div id="ref-box"><p class="muted small">Cargando tu enlace…</p></div></section>';
  }
  function cargarReferidos() {
    var box = el.querySelector("#ref-box"); if (!box) return;
    var C = window.TL_CONFIG, h = { apikey: C.supabaseAnonKey, Authorization: "Bearer " + TL.sesion().access_token, "Content-Type": "application/json" };
    fetch(C.supabaseUrl + "/rest/v1/rpc/mi_codigo_referido", { method: "POST", headers: h, body: "{}" }).then(function (r) { return r.json(); }).then(function (cod) {
      return fetch(C.supabaseUrl + "/rest/v1/rpc/mis_referidos", { method: "POST", headers: h, body: "{}" }).then(function (r) { return r.json(); }).then(function (st) {
        var enlace = (C.root && C.root !== "./" ? new URL(C.root, location.href).href : location.origin + "/") + "?ref=" + cod;
        box.innerHTML = '<p>Comparte tu enlace: <input class="ref-url" readonly aria-label="Tu enlace de invitación" value="' + esc(enlace) + '"></p><p class="muted small">' + (st.registrados || 0) + " registrados · " + (st.convertidos || 0) + " con Pase. Las invitaciones a ti mismo o desde tu mismo dispositivo no cuentan.</p>";
        var ru = box.querySelector(".ref-url"); if (ru) ru.onfocus = function () { this.select(); };
      });
    }).catch(function () { box.innerHTML = '<p class="muted small">Las invitaciones se activarán muy pronto.</p>'; });
  }

  function pintar(data, perfil) {
    var s = TL.stats(LEY, data);
    var log = TL.logros(s);
    if (window.TLEventos) TLEventos.activacion(s, ES_OP);
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
      '<div class="panel-grid"><div class="panel-main">' + seccionQueEstudiar(s, data) + seccionHoy(s, data) + seccion360(s) + seccionPreparacion() +
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
      '<div class="kpi"><span class="kpi-n">' + s.racha + '</span><span class="kpi-l">días de racha</span></div>' +
      '<div class="kpi"><span class="kpi-n">' + (s.tiempo >= 3600 ? Math.floor(s.tiempo / 3600) + " h " : "") + Math.round((s.tiempo % 3600) / 60) + ' min</span><span class="kpi-l">tiempo en tests</span></div>' +
      '<div class="kpi"><a class="kpi-n" href="' + TL.root + "errores/?c=" + LEY + '">' + s.vencidas + '</a><span class="kpi-l">repasos pendientes hoy</span></div>' +
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
            var n = notaSes(x);
            var d = new Date(x[0]);
            return '<div class="sp-col" title="' + d.toLocaleDateString("es-ES") + ": " + fmt(n) + '"><span style="height:' + Math.max(4, n * 10) + '%" class="' + (n >= 5 ? "good" : "low") + '"></span><small>' + fmt(n) + "</small></div>";
          }).join("") + '</div><p class="muted small">Nota de cada test con penalización (cada error resta 1/3). La línea del 5 es el aprobado orientativo.</p>'
        : '<p class="muted">Cuando completes tests verás aquí tu evolución.</p>') + "</section>" +

      "</div><aside class=\"panel-lado\">" + seccionProgresoSemanal(s) + seccionSimulacros(s) + seccionOposicion(s, data) + seccionTutor() + seccionSeguimiento() + seccionReferidos() +
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
      "</section></aside></div>";

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
      var dias = [].slice.call(af.querySelectorAll("input[name=dia]:checked")).map(function (x) { return +x.value; });
      TL.guardarAjustes({ oposicion: af.oposicion.value, fechaExamen: af.fechaExamen.value, horasSemana: Math.max(1, +af.horasSemana.value || 6), dias: dias.length ? dias : [0, 1, 2, 3, 4, 5, 6], nivel: af.nivel.value });
      location.href = TL.root + "panel/?c=" + af.oposicion.value;
    };
    if (window.TLAvisos) TLAvisos.pintar(el.querySelector("#avisos"));
    var ne = el.querySelector("#notif-email");
    if (ne) {
      if (!TL.online || !TL.sesion()) ne.innerHTML = '<p class="muted small">Para recibir avisos por email, <a href="' + TL.root + 'cuenta/">crea tu cuenta o entra</a>.</p>';
      else TL.prefsNotif().then(function (p) {
        var TIPOS = [["convocatoria", "Nueva convocatoria"], ["listas", "Listas de admitidos"], ["fecha_examen", "Fechas de examen"], ["modificacion", "Modificaciones"], ["aprobados", "Aprobados"], ["correccion", "Correcciones de errores"]];
        ne.innerHTML = '<form id="nf" class="aj-form"><h3>Avisos por email</h3><label class="check"><input type="checkbox" name="email_activo"' + (p.email_activo ? " checked" : "") + "> Enviarme un email cuando haya novedades oficiales de las oposiciones que sigo</label>" +
          '<fieldset class="tipos"><legend class="small muted">Qué avisos</legend>' + TIPOS.map(function (t) { return '<label class="check"><input type="checkbox" name="tipo" value="' + t[0] + '"' + (p.tipos.indexOf(t[0]) >= 0 ? " checked" : "") + "> " + t[1] + "</label>"; }).join("") + "</fieldset>" +
          '<label>Frecuencia<select name="frecuencia" class="select"><option value="inmediata">En cuanto se publique</option><option value="diaria">Resumen diario</option><option value="semanal">Resumen semanal (lunes)</option></select></label>' +
          '<button class="btn">Guardar avisos</button><span class="muted small" id="nf-msg"></span></form>';
        var f = ne.querySelector("#nf"); f.frecuencia.value = p.frecuencia;
        f.onsubmit = function (e) {
          e.preventDefault();
          var tipos = [].slice.call(f.querySelectorAll("input[name=tipo]:checked")).map(function (x) { return x.value; });
          TL.guardarPrefsNotif({ email_activo: f.email_activo.checked, tipos: tipos, frecuencia: f.frecuencia.value })
            .then(function () { ne.querySelector("#nf-msg").textContent = "Guardado ✓"; })
            .catch(function (err) { ne.querySelector("#nf-msg").textContent = /notif_preferencias|404|PGRST/.test(err.message) ? "Los avisos por email se activarán muy pronto." : err.message; });
        };
      }).catch(function () { ne.innerHTML = '<p class="muted small">Los avisos por email se activarán muy pronto.</p>'; });
    }
    var tf = el.querySelector("#tutor-f");
    if (tf) {
      tf.onsubmit = function (e) { e.preventDefault(); TLTutor.duda(el.querySelector("#tutor-q").value, { oposicion: ES_OP ? LEY : null }, el.querySelector("#tutor-out")); };
      el.querySelector("#tutor-rec").onclick = function () { TLTutor.recomendar(resumenTutor(s, data), el.querySelector("#tutor-out")); };
    }
    cargarReferidos();
    enlazarPreparacion(function (id) { pintar(data, perfil); var d = el.querySelector('[data-mod="' + id + '"]'); if (d) d.open = true; });
    var sb = el.querySelector("#salir");
    if (sb) sb.onclick = function () { TL.salir().then(function () { location.href = TL.root; }); };
  }

  fetch(TL.root + "datos/catalogo.json").then(function (r) { return r.json(); }).catch(function () { return []; }).then(function (c) {
    CATALOGO = c;
    var perfil = ES_OP ? fetch(TL.root + "datos/perfil-" + LEY + ".json").then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }) : Promise.resolve(null);
    return Promise.all([TL.cargar(LEY), perfil]);
  }).then(function (r) {
    var data = r[0]; PERFIL = r[1];
    pintar(data, null);
    if (TL.online && TL.sesion()) {
      TL.bajar().then(function () { TL.subir(LEY); return TL.perfil(); }).then(function (p) { pintar(data, p); }).catch(function () {});
    }
  }).catch(function () { el.innerHTML = "<p>No se ha podido cargar tu progreso. Recarga la página.</p>"; });
})();
