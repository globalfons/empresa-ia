// Entrenador de entrevista (Mossos 360 · Fase 3): interfaz de TLEntrevista. Datos: datos/entrevista-<oposición>.json.
// Flujo: modo → escenario → respuesta escrita → análisis (rúbrica TestLey) → competencias → fortalezas/debilidades →
// mejoras → siguiente → informe de sesión. Sin Pase: `entrevista_muestra` preguntas por sesión (config.json → planes).
// El análisis con IA es opcional y solo aparece si el Tutor IA está activo (TLTutor.entrevista).
(function () {
  var el = document.getElementById("entrevista");
  if (!el || !window.TLEntrevista) return;
  var E = window.TLEntrevista, OP = el.getAttribute("data-op"), BASE = el.getAttribute("data-base") || "";
  var CFG = window.TL_CONFIG || {}, PLAN = window.TL && TL.plan ? TL.plan() : null;
  var COMPLETO = !window.TL || !TL.puede || TL.puede("entrevista_completa");
  var MUESTRA = (PLAN && PLAN.entrevista_muestra) || ((CFG.planes || {}).free || {}).entrevista_muestra || 2;
  var D, NOM = {}, S, cola, idx;
  var DIM = { claridad: "Claridad", concrecion: "Concreción", estructura: "Estructura", reflexion: "Reflexión", relacion: "Relación con la pregunta" };
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function barra(v) { return v == null ? '<span class="muted">Sin datos suficientes</span>' : '<span class="comp-barra"><span style="width:' + v * 10 + '%"></span></span> ' + v + "/10"; }
  function lista(xs) { return xs.length ? "<ul>" + xs.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul>" : '<p class="muted small">—</p>'; }
  function fecha(ts) { return ts ? new Date(ts).toLocaleDateString("es-ES") : "—"; }

  function menu() {
    var m = E.metricas(OP, D);
    el.innerHTML = '<div class="mode-grid">' +
      '<button class="mode primary" data-modo="practica"><strong>Práctica libre</strong><span>Elige una competencia y practica 3 preguntas</span></button>' +
      '<button class="mode" data-modo="mixta"><strong>Entrevista mixta</strong><span>5 preguntas de distintas competencias, empezando por las que menos has trabajado</span></button>' +
      '<button class="mode" data-modo="simulada"><strong>Entrevista simulada</strong><span>8 preguntas seguidas, como una sesión completa</span></button>' +
      '<button class="mode" data-modo="dificiles"><strong>Situaciones difíciles</strong><span>Conflictos, presión, errores, críticas y decisiones</span></button></div>' +
      '<div class="apt-conf"><label>Competencia (práctica libre) <select class="select" data-comp>' + D.competencias.map(function (c) { return '<option value="' + c.id + '">' + esc(c.nombre) + "</option>"; }).join("") + "</select></label></div>" +
      (COMPLETO ? "" : '<p class="muted small">Sin Pase: ' + MUESTRA + " preguntas por sesión. Con el Pase, sesiones completas.</p>") +
      '<h3>Tu entrenamiento de entrevista</h3><p class="small">' + m.sesiones + " sesiones · " + m.competencias_entrenadas + "/" + m.competencias_total + " competencias trabajadas · media " + (m.media == null ? "sin datos suficientes" : m.media + "/10") +
      " · última: " + fecha(m.ultima_sesion) + (m.area_mas_debil ? " · aspecto más débil: " + esc(DIM[m.area_mas_debil] || m.area_mas_debil) : "") + (m.area_a_reforzar ? " · competencia a reforzar: " + esc(NOM[m.area_a_reforzar]) : "") + "</p>" +
      '<p class="muted small">Puntuación de entrenamiento orientativa (criterios de TestLey, no del tribunal). Tus respuestas se guardan solo en este navegador.</p>';
    el.querySelectorAll("[data-modo]").forEach(function (b) {
      b.addEventListener("click", function () {
        var conf = { modo: b.getAttribute("data-modo"), competencia: el.querySelector("[data-comp]").value };
        S = E.nuevaSesion(D, conf);
        cola = S.scenario_ids.map(function (id) { return D.escenarios.filter(function (e) { return e.id === id; })[0]; });
        if (!COMPLETO) { cola = cola.slice(0, MUESTRA); S.scenario_ids = S.scenario_ids.slice(0, MUESTRA); }
        idx = 0;
        if (!cola.length) { el.insertAdjacentHTML("beforeend", '<p class="muted">No hay escenarios publicados para este modo.</p>'); return; }
        pregunta();
      });
    });
  }

  function pregunta() {
    var e = cola[idx];
    el.innerHTML = '<div class="quiz-head"><span>' + (idx + 1) + " / " + cola.length + " · " + e.competency_ids.map(function (c) { return esc(NOM[c]); }).join(" · ") + "</span><span>" + (e.tipo === "situacional" ? "Situacional" : "Experiencia") + "</span></div>" +
      '<p class="comp-situacion">' + esc(e.situacion) + "</p><p><b>" + esc(e.pregunta) + "</b></p>" +
      '<label class="small" for="ent-resp">Tu respuesta (escribe como hablarías en la entrevista)</label><textarea id="ent-resp" class="ent-resp" rows="8" maxlength="4000" placeholder="Situación, qué hiciste o harías, por qué, resultado y qué aprendiste…"></textarea>' +
      '<div class="actions"><button class="btn primary" data-analizar>Analizar respuesta</button> <button class="btn ghost" data-fin>Terminar sesión</button></div>';
    el.querySelector("[data-analizar]").addEventListener("click", analizar);
    el.querySelector("[data-fin]").addEventListener("click", fin);
  }

  function analizar() {
    var e = cola[idx], txt = el.querySelector("#ent-resp").value;
    var ev = E.responder(S, e, { type: "text", text: txt, audio_reference: null, transcript: null }, NOM);
    var dims = Object.keys(DIM).map(function (k) { return "<tr><td>" + DIM[k] + "</td><td>" + barra(ev.dimensiones[k]) + "</td></tr>"; }).join("") +
      Object.keys(ev.competency_scores).map(function (c) { return "<tr><td>Indicios de «" + esc(NOM[c]) + "»</td><td>" + barra(ev.competency_scores[c]) + "</td></tr>"; }).join("");
    el.querySelector(".actions").outerHTML = '<div class="result-card"><p class="kicker">Análisis de entrenamiento (criterios TestLey)</p><p class="score">' + ev.total + '/10</p><p class="muted small">' + esc(ev.feedback[0]) + "</p></div>" +
      '<div class="tabla-scroll"><table class="tabla"><tbody>' + dims + "</tbody></table></div>" +
      "<h3>Qué funciona</h3>" + lista(ev.strengths) + "<h3>Qué falta</h3>" + lista(ev.weaknesses) + "<h3>Cómo mejorar</h3>" + lista(ev.improvement_points) +
      '<details class="card"><summary>Qué suele incluir una respuesta bien explicada (orientativo)</summary><p class="small">Marca lo que crees que tu respuesta ya incluye. Es tu autoevaluación: se guarda aparte de la puntuación.</p>' +
      e.indicadores.map(function (x, i) { return '<label class="ent-ind"><input type="checkbox" data-ind="' + i + '"> ' + esc(x) + "</label>"; }).join("") +
      '<p class="small"><b>Errores frecuentes:</b> ' + e.errores_frecuentes.map(esc).join(" · ") + '</p><p class="small"><b>Repregunta posible:</b> ' + esc(e.repregunta) + "</p></details>" +
      '<div data-ia></div><div class="actions"><button class="btn primary" data-next>' + (idx + 1 < cola.length ? "Siguiente pregunta" : "Ver informe de la sesión") + "</button></div>";
    var ia = el.querySelector("[data-ia]");
    if (window.TLTutor && TLTutor.entrevista) {
      ia.innerHTML = '<button class="btn ghost" data-ia-btn>Análisis complementario con IA</button>';
      ia.querySelector("[data-ia-btn]").addEventListener("click", function () { TLTutor.entrevista({ oposicion: OP, escenario: e.id, respuesta: txt }, ia); });
    } else ia.innerHTML = '<p class="muted small">El análisis complementario con IA estará disponible cuando se active el Tutor IA (Pase Opositor).</p>';
    el.querySelector("[data-next]").addEventListener("click", function () {
      E.autoevaluar(S, e, Array.prototype.map.call(el.querySelectorAll("[data-ind]:checked"), function (x) { return +x.getAttribute("data-ind"); }));
      if (++idx < cola.length) pregunta(); else fin();
    });
  }

  function fin() {
    if (!S.evaluations.length) return menu();
    var r = E.terminar(S);
    var filas = Object.keys(r.por_competencia).map(function (c) { return "<tr><td>" + esc(NOM[c]) + "</td><td>" + barra(r.por_competencia[c]) + "</td></tr>"; }).join("");
    el.innerHTML = '<div class="result-card"><p class="kicker">Informe de la sesión</p><p class="score">' + r.media + '/10</p><p class="muted small">' + esc(r.aviso) + "</p></div>" +
      '<p class="small">' + r.preguntas + " preguntas · competencias trabajadas: " + r.competencias_entrenadas.length + (r.evolucion && r.evolucion.diferencia != null ? " · respecto a la sesión anterior: " + (r.evolucion.diferencia >= 0 ? "+" : "") + r.evolucion.diferencia : "") + "</p>" +
      '<div class="tabla-scroll"><table class="tabla"><thead><tr><th>Competencia</th><th>Entrenamiento</th></tr></thead><tbody>' + filas + "</tbody></table></div>" +
      "<h3>Más fuertes</h3>" + lista(r.fuertes.map(function (c) { return NOM[c]; })) + "<h3>A reforzar</h3>" + lista(r.debiles.map(function (c) { return NOM[c]; })) +
      "<h3>Errores recurrentes</h3>" + lista(r.errores_recurrentes.map(function (k) { return DIM[k] + " baja en varias respuestas"; })) +
      (r.autoevaluacion ? '<p class="small">Autoevaluación (aparte de la puntuación): marcaste ' + r.autoevaluacion.marcados + " de " + r.autoevaluacion.total + " indicadores orientativos.</p>" : "") +
      '<div class="actions"><button class="btn primary" data-otra>Otra sesión</button></div>';
    el.querySelector("[data-otra]").addEventListener("click", menu);
  }

  fetch(BASE + "datos/entrevista-" + OP + ".json").then(function (r) { return r.json(); }).then(function (d) {
    D = d; d.competencias.forEach(function (c) { NOM[c.id] = c.nombre; }); menu();
  }).catch(function () { el.innerHTML = "<p>No se ha podido cargar el entrenador. Recarga la página.</p>"; });
})();
