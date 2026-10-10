// Entrenador aptitudinal (Mossos 360 · Fase 1). Interfaz de TLAptitud (ejercicios) + TLPsico (sesión, resultado, progreso).
// <div id="aptitud" data-op="<oposición>" data-idioma="ca|es" data-n-oficial="80" data-min-oficial="35">.
// Sin Pase: sesiones de hasta `aptitud_muestra` ejercicios en modo mixto o por categoría (config.json → planes).
(function () {
  var el = document.getElementById("aptitud");
  if (!el || !window.TLAptitud || !window.TLPsico) return;
  var A = window.TLAptitud, P = window.TLPsico, OP = el.getAttribute("data-op"), ID = el.getAttribute("data-idioma") || "es";
  var AUTO = /modo=(\w+)/.exec(location.hash || "");
  var CFG = window.TL_CONFIG || {}, PLAN = window.TL && TL.plan ? TL.plan() : null;
  var COMPLETO = !window.TL || !TL.puede || TL.puede("aptitud_completo");
  var MUESTRA = (PLAN && PLAN.aptitud_muestra) || ((CFG.planes || {}).free || {}).aptitud_muestra || 10;
  var NOMBRE = { verbal: "Verbal", numerico: "Numérica", abstracto: "Abstracto", espacial: "Espacial", perceptivo: "Perceptiva", percepcion: "Perceptiva" };
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  // ---------- dibujo SVG ----------
  function figura(f, tam) {
    tam = tam || 60;
    var marco = f.m === 0 ? '<circle cx="30" cy="30" r="25"' : f.m === 1 ? '<rect x="6" y="6" width="48" height="48" rx="3"' : '<polygon points="30,4 56,52 4,52"';
    var relleno = f.r ? "var(--accent-soft)" : "none", puntos = "";
    for (var i = 0; i < f.p; i++) puntos += '<circle cx="' + (18 + i * 6) + '" cy="47" r="2" fill="currentColor"/>';
    return '<svg viewBox="0 0 60 60" width="' + tam + '" height="' + tam + '" role="img" aria-label="figura">' + marco + ' fill="' + relleno + '" stroke="currentColor" stroke-width="2"/>' +
      '<g transform="rotate(' + f.g + ' 30 30)"><line x1="30" y1="40" x2="30" y2="17" stroke="currentColor" stroke-width="3"/><polygon points="30,11 24,20 36,20" fill="currentColor"/></g>' + puntos + "</svg>";
  }
  function cuadricula(g, tam) {
    var n = g.length, c = Math.floor((tam || 64) / n), s = "";
    g.forEach(function (fila, i) { fila.forEach(function (v, j) { s += '<rect x="' + j * c + '" y="' + i * c + '" width="' + c + '" height="' + c + '" fill="' + (v ? "currentColor" : "none") + '" stroke="currentColor" stroke-width="1"/>'; }); });
    return '<svg viewBox="-1 -1 ' + (n * c + 2) + " " + (n * c + 2) + '" width="' + (n * c + 2) + '" height="' + (n * c + 2) + '" role="img" aria-label="cuadrícula">' + s + "</svg>";
  }
  function estimulo(e) {
    var s = e.stimulus;
    if (!s) return "";
    if (s.tipo === "texto") return '<p class="apt-texto">' + esc(s.texto) + "</p>";
    if (s.tipo === "figuras") return '<div class="apt-fila">' + s.figuras.map(function (f) { return figura(f, 52); }).join("") + '<span class="apt-q">?</span></div>';
    if (s.tipo === "cuadricula") return '<div class="apt-fila">' + cuadricula(s.cuadricula, 72) + "</div>";
    if (s.tipo === "pares") return '<table class="apt-pares">' + s.pares.map(function (p) { return "<tr><td>" + esc(p[0]) + "</td><td>" + esc(p[1]) + "</td></tr>"; }).join("") + "</table>";
    return "";
  }
  function opcion(e, o) { return e.options_type === "figura" ? figura(o, 48) : e.options_type === "cuadricula" ? cuadricula(o, 56) : esc(o); }

  // ---------- menú ----------
  function menu() {
    var pr = P.progreso(OP), det = P.detalle(OP);
    var filas = A.CATEGORIAS.map(function (c) { var k = c === "perceptivo" ? "percepcion" : c, x = pr[k]; return "<tr><td>" + NOMBRE[c] + "</td><td>" + (x && x.ok + x.ko ? x.acierto_pct + " %" : "Sin datos") + "</td><td>" + (x && x.seg_por_pregunta != null ? x.seg_por_pregunta + " s" : "—") + "</td></tr>"; }).join("");
    el.innerHTML = '<div class="mode-grid">' +
      '<button class="mode primary" data-modo="mixto"><strong>Mixto</strong><span>Las 5 aptitudes y dificultad variada</span></button>' +
      '<button class="mode" data-modo="adaptativo"' + (COMPLETO ? "" : " disabled") + '><strong>Adaptativo</strong><span>Sube o baja la dificultad según aciertas y prioriza tu aptitud más débil' + (COMPLETO ? "" : " · Pase") + "</span></button>" +
      '<button class="mode" data-modo="contrarreloj"' + (COMPLETO ? "" : " disabled") + '><strong>Contrarreloj</strong><span>Ritmo oficial: ' + A.SEG_OFICIAL + " s por ejercicio" + (COMPLETO ? "" : " · Pase") + "</span></button></div>" +
      '<div class="apt-conf"><label>Aptitud <select class="select" data-cat><option value="">Todas</option>' + A.CATEGORIAS.map(function (c) { return '<option value="' + c + '">' + NOMBRE[c] + "</option>"; }).join("") + "</select></label> " +
      '<label>Dificultad <select class="select" data-dif><option value="">Variada</option><option value="1">Básica</option><option value="2">Media</option><option value="3">Alta</option></select></label> ' +
      '<label>Ejercicios <select class="select" data-n>' + [10, 20, 40, 80].map(function (n) { return '<option value="' + n + '"' + (!COMPLETO && n > MUESTRA ? " disabled" : "") + ">" + n + (!COMPLETO && n > MUESTRA ? " (Pase)" : "") + "</option>"; }).join("") + "</select></label> " +
      '<button class="btn primary" data-modo="categoria">Empezar</button></div>' +
      '<h3>Tu progreso</h3><div class="tabla-scroll"><table class="tabla"><thead><tr><th>Aptitud</th><th>Acierto</th><th>Tiempo medio</th></tr></thead><tbody>' + filas + "</tbody></table></div>" +
      (det.errores_recurrentes.length ? '<p class="small"><b>Errores recurrentes:</b> ' + det.errores_recurrentes.map(esc).join(", ") + "</p>" : "") +
      '<p class="muted small">Ejercicios originales de TestLey, generados con una solución comprobada automáticamente. No son preguntas oficiales ni calculan la nota oficial (las bases no publican la conversión de aciertos a puntos).</p>';
    el.querySelectorAll("[data-modo]").forEach(function (b) {
      b.addEventListener("click", function () {
        var modo = b.getAttribute("data-modo"), cat = el.querySelector("[data-cat]").value, dif = +el.querySelector("[data-dif]").value || null, n = +el.querySelector("[data-n]").value || 10;
        if (!COMPLETO) n = Math.min(n, MUESTRA);
        empezar({ modo: modo === "categoria" ? (cat ? "categoria" : dif ? "dificultad" : "mixto") : modo, categoria: cat || null, dificultad: dif, n: n });
      });
    });
    // Enlace directo a un modo (p. ej. desde el simulacro 360 del panel): #modo=contrarreloj; si el modo es del Pase y no está disponible, mixto
    if (AUTO) { var bb = el.querySelector('[data-modo="' + AUTO[1] + '"]:not([disabled])') || el.querySelector('[data-modo="mixto"]'); AUTO = null; if (bb) bb.click(); }
  }

  // ---------- sesión ----------
  var S, conf, idx, estado, t0, reloj;
  function empezar(c) {
    conf = { modo: c.modo, categoria: c.categoria, dificultad: c.dificultad, n: c.modo === "contrarreloj" && !c.n ? 20 : c.n, oposicion: OP, idioma: ID };
    estado = {};
    var items = c.modo === "adaptativo" ? [A.siguiente(estado, conf)] : A.lote(conf).items;
    S = P.sesion(items.map(A.item), { oposicion: OP, modo: c.modo, segundos: c.modo === "contrarreloj" ? conf.n * A.SEG_OFICIAL : null });
    idx = 0;
    if (S.limite) { clearInterval(reloj); reloj = setInterval(tic, 1000); }
    mostrar();
  }
  function restante() { return Math.max(0, S.limite - Math.round((Date.now() - S.inicio) / 1000)); }
  function tic() { var t = el.querySelector(".timer"); if (t) t.textContent = fmt(restante()); if (restante() <= 0) { clearInterval(reloj); fin(); } }
  function fmt(s) { return Math.floor(s / 60) + ":" + ("0" + (s % 60)).slice(-2); }
  function mostrar() {
    var it = S.items[idx], e = it.ej;
    t0 = Date.now();
    el.innerHTML = '<div class="quiz-head"><span>' + (idx + 1) + " / " + conf.n + " · " + NOMBRE[e.category] + " · dificultad " + e.difficulty + "</span>" + (S.limite ? '<span class="timer">' + fmt(restante()) + "</span>" : "") + "</div>" +
      '<p class="apt-prompt"><b>' + esc(e.prompt) + "</b></p>" + estimulo(e) +
      '<div class="apt-opts' + (e.options_type !== "texto" ? " apt-opts-fig" : "") + '">' + e.options.map(function (o, i) { return '<button class="opt" data-i="' + i + '"><span class="letter">' + "ABCD"[i] + "</span><span>" + opcion(e, o) + "</span></button>"; }).join("") + "</div>" +
      '<div class="actions"><button class="btn ghost" data-saltar>Dejar en blanco</button> <button class="btn ghost" data-fin>Terminar</button></div>';
    el.querySelectorAll(".opt").forEach(function (b) { b.addEventListener("click", function () { responder(+b.getAttribute("data-i")); }); });
    el.querySelector("[data-saltar]").addEventListener("click", function () { responder(null); });
    el.querySelector("[data-fin]").addEventListener("click", fin);
  }
  function responder(i) {
    var it = S.items[idx], e = it.ej, seg = Math.round((Date.now() - t0) / 1000);
    if (i != null) P.responder(S, it.id, i, seg);
    if (conf.modo === "adaptativo") A.registrar(estado, e, i === e.correct_answer);
    el.querySelectorAll(".opt").forEach(function (b, k) { b.disabled = true; if (k === e.correct_answer) b.classList.add("ok"); else if (k === i) b.classList.add("ko"); });
    var a = el.querySelector(".actions");
    a.innerHTML = '<p class="small ' + (i === e.correct_answer ? "good" : "bad") + '">' + (i == null ? "En blanco. " : i === e.correct_answer ? "Correcto. " : "Incorrecto. ") + esc(e.explanation) + " · " + seg + " s</p>" +
      '<button class="btn primary" data-next>' + (idx + 1 < conf.n ? "Siguiente" : "Ver resultado") + "</button>";
    a.querySelector("[data-next]").addEventListener("click", function () {
      if (idx + 1 >= conf.n) return fin();
      if (conf.modo === "adaptativo") S.items.push(A.item(A.siguiente(estado, conf)));
      idx++; mostrar();
    });
  }
  function fin() {
    clearInterval(reloj);
    S.items = S.items.slice(0, Math.max(idx + 1, 1));
    var r = P.terminar(S, null), det = P.detalle(OP);
    var cats = Object.keys(r.porCategoria).map(function (k) { var c = r.porCategoria[k], n = c.ok + c.ko; return "<tr><td>" + NOMBRE[k] + "</td><td>" + c.ok + "/" + (n + c.blanco) + "</td><td>" + (n ? Math.round(c.segundos / n) + " s" : "—") + "</td></tr>"; }).join("");
    el.innerHTML = '<div class="result-card"><p class="kicker">Resultado</p><p class="score">' + r.aciertos + " / " + r.preguntas + '</p><p class="muted small">' + r.errores + " errores · " + r.blancos + " en blanco · " + fmt(r.segundos) +
      "</p></div>" + '<div class="tabla-scroll"><table class="tabla"><thead><tr><th>Aptitud</th><th>Aciertos</th><th>Tiempo medio</th></tr></thead><tbody>' + cats + "</tbody></table></div>" +
      (det.errores_recurrentes.length ? '<p class="small"><b>Para repasar:</b> ' + det.errores_recurrentes.map(esc).join(", ") + "</p>" : "") +
      '<p class="muted small">' + esc(r.motivo_sin_puntuacion || "") + " En la prueba oficial no restan los errores ni los blancos.</p>" +
      '<div class="actions"><button class="btn primary" data-otra>Otra sesión</button></div>';
    el.querySelector("[data-otra]").addEventListener("click", menu);
  }
  // Banco verbal semántico revisado por personas: el build solo publica datos/verbal-revisado-<op>.json si hay ítems aprobados
  var BASE = el.getAttribute("data-base") || (window.TL && TL.root) || "../../../";
  if (window.fetch) fetch(BASE + "datos/verbal-revisado-" + OP + ".json").then(function (r) { return r.ok ? r.json() : null; })
    .then(function (d) { if (d) A.cargarRevisados(d.items); }).catch(function () {}).then(menu);
  else menu();

})();
