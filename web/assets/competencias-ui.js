// Competencias y autoconocimiento (Mossos 360 · Fase 2): interfaz de TLCompetencias.
// <div id="competencias" data-op="<oposición>" data-base="../../../">. Datos: datos/competencias-<oposición>.json.
// Sin Pase: fichas, autoconocimiento y `competencias_muestra` escenarios por competencia (config.json → planes).
(function () {
  var el = document.getElementById("competencias");
  if (!el || !window.TLCompetencias) return;
  var C = window.TLCompetencias, OP = el.getAttribute("data-op"), BASE = el.getAttribute("data-base") || "";
  var CFG = window.TL_CONFIG || {}, PLAN = window.TL && TL.plan ? TL.plan() : null;
  var COMPLETO = !window.TL || !TL.puede || TL.puede("competencias_completo");
  var MUESTRA = (PLAN && PLAN.competencias_muestra) || ((CFG.planes || {}).free || {}).competencias_muestra || 1;
  var D, PERF, NOM = {};
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function barra(v) { return v == null ? '<span class="muted">Sin datos suficientes</span>' : '<span class="comp-barra"><span style="width:' + v * 10 + '%"></span></span> ' + v + "/10"; }

  function tabs(activa) {
    return '<div class="comp-tabs" role="tablist">' + [["fichas", "Competencias"], ["entreno", "Entrenamiento"], ["auto", "Autoconocimiento"], ["progreso", "Progreso"]].map(function (t) {
      return '<button class="btn' + (t[0] === activa ? " primary" : " ghost") + '" role="tab" aria-selected="' + (t[0] === activa) + '" data-tab="' + t[0] + '">' + t[1] + "</button>";
    }).join("") + "</div>";
  }
  function pintar(activa, html) {
    el.innerHTML = tabs(activa) + '<div class="comp-cuerpo">' + html + "</div>";
    el.querySelectorAll("[data-tab]").forEach(function (b) { b.addEventListener("click", function () { VISTAS[b.getAttribute("data-tab")](); }); });
  }

  // ---------- Competencias: oficial frente a entrenamiento ----------
  function fichas() {
    pintar("fichas", '<p class="muted small">Las 10 competencias y las 3 competencias clave son las de las bases. Las explicaciones, los comportamientos y los ejercicios son entrenamiento de TestLey: no son criterios del tribunal.</p>' +
      PERF.map(function (p) {
        return '<details class="card comp-ficha"><summary><b>' + esc(p.official_name) + "</b>" + (p.clave ? ' <span class="badge-oficial">Competència clau</span>' : "") + "</summary>" +
          '<div class="comp-oficial"><p class="kicker">Información oficial</p><p class="small">' + esc(p.official_definition_note) + " Cada competencia se valora de 1 a 10" + (p.clave ? "; en las claves hay que superar los 3 puntos." : ".") +
          ' <a href="' + esc(p.official_source.url) + '" rel="noopener">Fuente</a> · ' + esc(p.call_id) + "</p></div>" +
          (p.training ? '<div class="comp-testley"><p class="kicker">Entrenamiento TestLey</p><p>' + esc(p.training.explicacion) + "</p><p><b>Cómo trabajarla:</b> " + esc(p.training.preparacion) +
            "</p><p><b>Comportamientos observables (orientativos):</b></p><ul>" + p.observable_behaviours.items.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") +
            "</ul><p><b>En la entrevista:</b> " + esc(p.interview_relevance) + "</p><p><b>Para reflexionar:</b></p><ul>" + p.reflection_questions.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul></div>"
            : '<p class="muted small">El contenido de entrenamiento de esta competencia está pendiente de revisión.</p>') + "</details>";
      }).join(""));
  }

  // ---------- Entrenamiento con escenarios ----------
  var cola, idx, orden;
  function entreno() {
    var st = C.estado(OP, D), rec = st.recommended_next;
    pintar("entreno", '<p>Elige una competencia o deja que TestLey proponga la que menos has entrenado.</p><div class="apt-conf"><label>Competencia <select class="select" data-comp>' +
      '<option value="">' + (rec ? "Recomendada: " + esc(NOM[rec]) : "Todas") + "</option>" + PERF.filter(function (p) { return p.training_scenarios.ids.length; }).map(function (p) { return '<option value="' + p.id + '">' + esc(p.official_name) + "</option>"; }).join("") +
      '</select></label> <button class="btn primary" data-empezar>Empezar</button></div><p class="muted small">Cada situación tiene una actuación recomendada según el criterio de entrenamiento de TestLey. La puntuación sirve para detectar lo que debes reforzar, no predice la valoración del tribunal.' +
      (COMPLETO ? "" : " Sin Pase: " + MUESTRA + " situación por competencia.") + "</p>");
    el.querySelector("[data-empezar]").addEventListener("click", function () {
      var comp = el.querySelector("[data-comp]").value || rec;
      var por = {};
      cola = (D.escenarios || []).filter(function (e) { return !comp || e.competency_id === comp; }).filter(function (e) { por[e.competency_id] = (por[e.competency_id] || 0) + 1; return COMPLETO || por[e.competency_id] <= MUESTRA; }).slice(0, 5);
      idx = 0;
      if (!cola.length) { el.querySelector(".comp-cuerpo").insertAdjacentHTML("beforeend", '<p class="muted">No hay situaciones publicadas para esta competencia.</p>'); return; }
      escenario();
    });
  }
  function escenario() {
    var e = cola[idx];
    orden = [];
    pintar("entreno", '<div class="quiz-head"><span>' + (idx + 1) + " / " + cola.length + " · " + esc(NOM[e.competency_id]) + "</span><span>" + (e.formato === "ranking" ? "Ordena" : "Elige") + "</span></div>" +
      '<p class="comp-situacion">' + esc(e.situacion) + '</p><p class="muted small">' + esc(e.contexto || "") + "</p><p><b>" + esc(e.pregunta) + "</b>" +
      (e.formato === "ranking" ? ' <span class="muted small">Toca las actuaciones de la mejor a la peor.</span>' : "") + "</p>" +
      e.opciones.map(function (o, i) { return '<button class="opt" data-i="' + i + '"><span class="letter">' + "ABCD"[i] + "</span><span>" + esc(o.texto) + "</span></button>"; }).join("") +
      '<div class="actions"></div>');
    el.querySelectorAll(".opt").forEach(function (b) {
      b.addEventListener("click", function () {
        var i = +b.getAttribute("data-i");
        if (e.formato === "eleccion") return resolver(e, i);
        if (orden.indexOf(i) >= 0) return;
        orden.push(i); b.disabled = true; b.querySelector(".letter").textContent = orden.length;
        if (orden.length === 4) resolver(e, orden);
      });
    });
  }
  function resolver(e, resp) {
    var r = C.puntuar(e, resp);
    C.registrar(OP, e, r);
    el.querySelectorAll(".opt").forEach(function (b, k) {
      b.disabled = true;
      if (e.formato === "eleccion") { if (k === r.recomendada) b.classList.add("ok"); else if (k === resp) b.classList.add("ko"); }
    });
    var dims = Object.keys(r.dimensiones).map(function (k) { return "<li>" + esc(NOM[k]) + ": " + (r.dimensiones[k] == null ? "—" : r.dimensiones[k] + "/10") + "</li>"; }).join("");
    el.querySelector(".actions").innerHTML = '<div class="result-card"><p class="kicker">Puntuación de entrenamiento (clave TestLey)</p><p class="score">' + r.total + "/10</p>" +
      (e.formato === "ranking" ? '<p class="small">Orden recomendado: ' + r.recomendado.map(function (i) { return "ABCD"[i]; }).join(" › ") + " · el tuyo: " + r.elegido.map(function (i) { return "ABCD"[i]; }).join(" › ") + "</p>" : "") +
      '<ul class="small">' + dims + '</ul><p class="small">' + esc(r.justificacion) + '</p></div><button class="btn primary" data-next>' + (idx + 1 < cola.length ? "Siguiente situación" : "Terminar") + "</button>";
    el.querySelector("[data-next]").addEventListener("click", function () { if (++idx < cola.length) escenario(); else progreso(); });
  }

  // ---------- Autoconocimiento (base psicométrica) ----------
  function auto() {
    var items = C.cuestionario(D);
    if (!items.length) return pintar("auto", '<p class="muted">El cuestionario está pendiente de revisión.</p>');
    pintar("auto", '<p>Valora del 1 (nada de acuerdo) al 5 (totalmente de acuerdo) cada afirmación pensando en cómo actúas normalmente. No hay respuestas correctas: es para conocerte y ver tu evolución. No es un test oficial ni un diagnóstico.</p><form data-cuest>' +
      items.map(function (it, n) {
        return '<fieldset class="comp-item"><legend>' + (n + 1) + ". " + esc(it.texto) + '</legend><div class="comp-likert">' + [1, 2, 3, 4, 5].map(function (v) {
          return '<label><input type="radio" name="' + it.id + '" value="' + v + '" required> ' + v + "</label>";
        }).join("") + "</div></fieldset>";
      }).join("") + '<button class="btn primary" type="submit">Ver mi autopercepción</button></form>');
    el.querySelector("[data-cuest]").addEventListener("submit", function (ev) {
      ev.preventDefault();
      var resp = {};
      items.forEach(function (it) { var x = el.querySelector('input[name="' + it.id + '"]:checked'); if (x) resp[it.id] = +x.value; });
      var antes = C.estado(OP, D).evolucion_autopercepcion.slice(-1)[0];
      var r = C.evaluarCuestionario(D, resp);
      C.guardarCuestionario(OP, r);
      pintar("auto", '<div class="result-card"><p class="kicker">Autopercepción (SELF_ASSESSMENT)</p><p class="small">' + esc(r.aviso) + "</p></div>" +
        '<div class="tabla-scroll"><table class="tabla"><thead><tr><th>Competencia</th><th>Hoy</th><th>Sesión anterior</th></tr></thead><tbody>' +
        PERF.map(function (p) { var v = r.escalas[p.id]; return v == null ? "" : "<tr><td>" + esc(p.official_name) + "</td><td>" + barra(v) + "</td><td>" + (antes && antes.escalas[p.id] != null ? antes.escalas[p.id] + "/10" : "—") + "</td></tr>"; }).join("") +
        "</tbody></table></div><p class=\"small\">Coherencia de tus respuestas: " + (r.consistencia_pct == null ? "—" : r.consistencia_pct + " %") + (r.poco_consistentes.length ? ". Revisa lo que respondiste en: " + r.poco_consistentes.map(function (k) { return esc(NOM[k]); }).join(", ") + " (las dos afirmaciones de la competencia no encajan entre sí)." : ".") + "</p>" +
        '<button class="btn" data-tab="progreso">Ver mi progreso</button>');
    });
  }

  // ---------- Progreso: OBJECTIVE_SCORE y SELF_ASSESSMENT por separado ----------
  function progreso() {
    var st = C.estado(OP, D), s = st.resumen;
    pintar("progreso", '<p class="small">' + s.ejercicios_completados + " situaciones resueltas · " + s.competencias_entrenadas + " competencias entrenadas · " + s.competencias_pendientes + " pendientes · " +
      s.sesiones_autoconocimiento + " cuestionarios de autoconocimiento" + (st.recommended_next ? " · <b>Siguiente recomendada:</b> " + esc(NOM[st.recommended_next]) : "") + "</p>" +
      '<div class="tabla-scroll"><table class="tabla"><thead><tr><th>Competencia</th><th>Entrenamiento (clave TestLey)</th><th>Autopercepción</th><th>Situaciones</th></tr></thead><tbody>' +
      PERF.map(function (p) { var x = st.competencias[p.id]; return "<tr><td>" + esc(p.official_name) + (x.clave ? " ·&nbsp;clau" : "") + "</td><td>" + barra(x.competency_strength) + "</td><td>" + (x.self_assessment == null ? '<span class="muted">Sin datos</span>' : x.self_assessment + "/10") + "</td><td>" + x.competency_training_count + "</td></tr>"; }).join("") +
      '</tbody></table></div><p class="muted small">La columna de entrenamiento compara tus elecciones con la actuación recomendada por TestLey; la autopercepción es tu propia valoración. Ninguna de las dos es la nota del tribunal. Los datos se guardan en este navegador.</p>');
  }

  var VISTAS = { fichas: fichas, entreno: entreno, auto: auto, progreso: progreso };
  fetch(BASE + "datos/competencias-" + OP + ".json").then(function (r) { return r.json(); })
    .then(function (d) { return window.TL && TL.completarPremium ? TL.completarPremium("competencias-" + OP, d, "escenarios") : d; }).then(function (d) {
    D = d; PERF = C.perfiles(d);
    PERF.forEach(function (p) { NOM[p.id] = p.official_name; });
    fichas();
  }).catch(function () { el.innerHTML = "<p>No se han podido cargar las competencias. Recarga la página.</p>"; });
})();
