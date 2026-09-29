// Motor de test. Se monta en <div id="quiz" data-ley="ley-39-2015" data-base="./" [data-art="24"]>.
(function () {
  var el = document.getElementById("quiz");
  if (!el || !window.TL) return;
  var LEY = el.getAttribute("data-ley");
  var base = el.getAttribute("data-base") || "./";
  var data, queue, idx, ok, ko, blank, modo, timer, fin;
  // Configuración del simulacro: la de la oposición (catalogo/oposiciones/<id>.json) o una genérica para las leyes.
  var SIM = { preguntas: 30, minutos: 30, opciones: 4, penalizacion: 1 / 3 };
  try { var cfg = JSON.parse(el.getAttribute("data-sim") || "null"); if (cfg) SIM = cfg; } catch (e) {}
  function fraccion(p) { return Math.abs(p - 1 / 3) < 1e-6 ? "1/3" : Math.abs(p - 0.5) < 1e-6 ? "1/2" : Math.abs(p - 0.25) < 1e-6 ? "1/4" : fmt(p); }

  function nombreLey(q) { var l = data.leyes || {}; return l[q.ley || LEY] || l[Object.keys(l)[0]] || ""; }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function fmt(n) { return (Math.round(n * 100) / 100).toLocaleString("es-ES"); }

  // Repaso inteligente: primero falladas, luego nuevas, luego aprendidas; nunca dominadas salvo que no quede nada.
  function repaso(n) {
    var orden = { fallada: 0, nueva: 1, aprendida: 2, dominada: 3 };
    var qs = shuffle(data.qs).sort(function (a, b) { return orden[TL.estado(a.ley || LEY, a.id)] - orden[TL.estado(b.ley || LEY, b.id)]; });
    return qs.slice(0, n);
  }

  // Sin Pase: la ley gratuita y los tests por artículo están completos; en el resto, 10 preguntas de muestra repartidas por la ley.
  var MUESTRA = 10;
  function bloqueado() { return (window.TL_CONFIG || {}).pase && !TL.esGratis(LEY) && !TL.pase(); }
  function muestra() {
    var paso = data.qs.length / MUESTRA, out = [];
    for (var i = 0; i < Math.min(MUESTRA, data.qs.length); i++) out.push(data.qs[Math.floor(i * paso)]);
    return out;
  }

  function menuMuestra() {
    var m = muestra();
    var fallos = m.filter(function (q) { return TL.estado(q.ley || LEY, q.id) === "fallada"; });
    var candado = function (t, d) { return '<a class="mode locked" href="' + TL.root + 'pase/"><strong>🔒 ' + t + "</strong><span>" + d + "</span></a>"; };
    el.innerHTML =
      '<div class="mode-grid">' +
      '<button class="mode primary" data-m="muestra"><strong>Test de muestra gratis</strong><span>' + m.length + " preguntas con la cita del BOE</span></button>" +
      (fallos.length ? '<button class="mode" data-m="fallos"><strong>Mis fallos</strong><span>' + fallos.length + " preguntas pendientes</span></button>" : "") +
      candado("Repaso inteligente", "Tus fallos vuelven cuando estás a punto de olvidarlos") +
      candado("Simulacro", "30 preguntas, 30 minutos, corrección como en el examen") +
      candado("Todas las preguntas", data.qs.length + " preguntas y práctica por bloques") +
      "</div>" +
      '<div class="box upsell"><p><strong>Desbloquea las ' + data.qs.length + " preguntas, los simulacros y el repaso inteligente</strong> de todas las leyes con el Pase Opositor. 3 días de prueba gratis.</p>" +
      '<p><a class="cta" href="' + TL.root + 'pase/">Ver el Pase Opositor</a> <a class="small" href="' + TL.root + 'pase/#activar">Ya tengo una clave</a></p></div>' +
      '<p class="muted small">Los tests de cada artículo y el test completo de la Ley 39/2015 son gratis.</p>';
    el.querySelectorAll("[data-m]").forEach(function (b) {
      b.onclick = function () { start(b.getAttribute("data-m") === "fallos" ? fallos : shuffle(m), b.getAttribute("data-m")); };
    });
  }

  function menu() {
    clearInterval(timer);
    var soloArt = el.getAttribute("data-art");
    if (soloArt) { start(data.qs.filter(function (q) { return q.art === soloArt; }), "art"); return; }
    if (bloqueado()) { menuMuestra(); return; }
    var s = TL.stats(LEY, data);
    var bloques = [];
    data.qs.forEach(function (q) { var b = data.arts[q.art].b; if (bloques.indexOf(b) < 0) bloques.push(b); });
    el.innerHTML =
      '<div class="quiz-head"><div><span class="kicker">Tu nota orientativa</span><span class="nota">' + fmt(s.nota) + '<small>/10</small></span>' +
      '<span class="stars" aria-label="' + s.estrellas + ' de 5 estrellas">' + "★★★★★".slice(0, s.estrellas) + '<span class="off">' + "★★★★★".slice(s.estrellas) + "</span></span></div>" +
      '<div class="quiz-mini">Dominio <b>' + s.dominioPct + " %</b><br><b>" + s.cuenta.fallada + "</b> por repasar · <b>" + s.racha + "</b> días de racha</div></div>" +
      '<div class="mode-grid">' +
      '<button class="mode primary" data-m="repaso"><strong>Repaso inteligente</strong><span>20 preguntas: primero tus fallos y lo que no has visto</span></button>' +
      '<button class="mode" data-m="simulacro"><strong>Simulacro</strong><span>' + Math.min(SIM.preguntas, data.qs.length) + " preguntas, " + SIM.minutos + " minutos, " + SIM.opciones + " opciones · cada error resta " + fraccion(SIM.penalizacion) + '</span></button>' +
      '<button class="mode" data-m="10"><strong>Test rápido</strong><span>10 preguntas al azar</span></button>' +
      (s.cuenta.fallada ? '<button class="mode" data-m="fallos"><strong>Mis fallos</strong><span>' + s.cuenta.fallada + " preguntas pendientes</span></button>" : "") +
      "</div>" +
      '<label class="muted" for="bq">Practicar un bloque concreto</label><select id="bq" class="select"><option value="">— elegir bloque —</option>' +
      bloques.map(function (b, i) { return '<option value="' + i + '">' + esc(b) + "</option>"; }).join("") + "</select>" +
      '<p class="muted small">' + data.qs.length + ' preguntas verificadas contra el BOE. <a href="' + TL.root + 'panel/">Ver mi panel completo →</a></p>';
    el.querySelectorAll("[data-m]").forEach(function (b) {
      b.onclick = function () {
        var m = b.getAttribute("data-m");
        if (m === "repaso") start(repaso(20), m);
        else if (m === "simulacro") start(shuffle(data.qs).slice(0, SIM.preguntas), m);
        else if (m === "fallos") start(data.qs.filter(function (q) { return TL.estado(q.ley || LEY, q.id) === "fallada"; }), m);
        else start(shuffle(data.qs).slice(0, +m), m);
      };
    });
    el.querySelector("#bq").onchange = function () {
      var b = bloques[this.value];
      if (b) start(shuffle(data.qs.filter(function (q) { return data.arts[q.art].b === b; })), "bloque");
    };
  }

  function start(list, m) {
    queue = list; idx = 0; ok = 0; ko = 0; blank = 0; modo = m;
    if (!queue.length) { menu(); return; }
    clearInterval(timer);
    if (modo === "simulacro") {
      fin = Date.now() + SIM.minutos * 60 * 1000;
      timer = setInterval(function () {
        var t = el.querySelector(".timer");
        var r = Math.max(0, fin - Date.now());
        if (t) t.textContent = Math.floor(r / 60000) + ":" + ("0" + Math.floor((r % 60000) / 1000)).slice(-2);
        if (!r) { blank += queue.length - idx; idx = queue.length; resultado(); }
      }, 500);
    }
    show();
  }

  function show() {
    var q = queue[idx];
    // En simulacros con menos opciones que la pregunta (p. ej. 3 en Policía Nacional) se quitan distractores al azar.
    var order = modo === "simulacro" && SIM.opciones < 4 ? shuffle([q.a].concat(shuffle([0, 1, 2, 3].filter(function (i) { return i !== q.a; })).slice(0, SIM.opciones - 1))) : shuffle([0, 1, 2, 3]);
    var pct = Math.round((idx / queue.length) * 100);
    el.innerHTML =
      '<div class="meta"><span>Pregunta ' + (idx + 1) + " de " + queue.length + "</span>" +
      (modo === "simulacro" ? '<span class="timer">' + SIM.minutos + ':00</span>' : "<span>" + nombreLey(q) + " · Art. " + (q.artn || q.art) + "</span>") + "</div>" +
      '<div class="bar"><span style="width:' + pct + '%"></span></div>' +
      '<p class="q">' + esc(q.q) + "</p>" +
      order.map(function (i, k) { return '<button class="opt" data-i="' + i + '"><span class="letter">' + "abcd"[k] + "</span>" + esc(q.o[i]) + "</button>"; }).join("") +
      '<div class="fb" aria-live="polite"></div>' +
      '<div class="actions"><button class="btn" data-skip>Dejar en blanco</button><button class="btn ghost" data-exit>Salir</button></div>';
    el.querySelectorAll(".opt").forEach(function (b) { b.onclick = function () { answer(q, +b.getAttribute("data-i")); }; });
    el.querySelector("[data-skip]").onclick = function () { blank++; next(); };
    el.querySelector("[data-exit]").onclick = function () { if (idx > 0) resultado(true); else menu(); };
  }

  function answer(q, i) {
    var right = i === q.a;
    TL.registrarRespuesta(q.ley || LEY, q.id, right, LEY);
    if (right) ok++; else ko++;
    el.querySelectorAll(".opt").forEach(function (b) {
      var bi = +b.getAttribute("data-i");
      b.disabled = true;
      if (bi === q.a) b.classList.add("ok");
      else if (bi === i) b.classList.add("ko");
    });
    if (modo === "simulacro") { setTimeout(next, 450); return; }
    el.querySelector(".fb").innerHTML =
      '<p class="verdict ' + (right ? "good" : "bad") + '">' + (right ? "✔ Correcto" : "✘ Incorrecto") + "</p>" +
      '<blockquote><span class="src">Artículo ' + (q.artn || q.art) + " · " + nombreLey(q) + " (BOE)</span>«" + esc(q.cita) + "»</blockquote>" +
      '<a href="' + TL.root + (q.ley || LEY) + "/articulo-" + (q.artn || q.art) + '/">Leer el artículo ' + (q.artn || q.art) + " completo</a>";
    var a = el.querySelector(".actions");
    a.innerHTML = '<button class="btn primary" data-next>' + (idx + 1 < queue.length ? "Siguiente →" : "Ver resultado") + "</button>";
    a.querySelector("[data-next]").onclick = next;
    a.querySelector("[data-next]").focus();
  }

  function next() {
    idx++;
    if (idx < queue.length) show(); else resultado();
  }

  function resultado(parcial) {
    clearInterval(timer);
    var n = parcial ? idx : queue.length;
    if (parcial) blank += 0;
    TL.registrarSesion(LEY, n, ok, ko, blank);
    var pen = SIM.penalizacion; // la de la oposición (o 1/3 por defecto)
    var nota = n ? Math.max(0, ((ok - ko * pen) / n) * 10) : 0;
    var s = TL.stats(LEY, data);
    var fallos = bloqueado() ? muestra().filter(function (q) { return TL.estado(q.ley || LEY, q.id) === "fallada"; }).length : s.cuenta.fallada;
    el.innerHTML =
      '<div class="result-card"><span class="kicker">' + (modo === "simulacro" ? "Resultado del simulacro" : "Resultado") + "</span>" +
      '<p class="score">' + fmt(nota) + "<small>/10</small></p>" +
      "<p>" + ok + " aciertos · " + ko + " errores · " + blank + " en blanco <span class=\"muted\">(cada error resta ' + fraccion(pen) + ')</span></p>" +
      '<p class="muted">Tu nota orientativa global en la ley es ahora <b>' + fmt(s.nota) + "</b> y tu dominio del banco es del <b>" + s.dominioPct + " %</b>.</p>" +
      '<div class="actions"><button class="btn primary" data-again>' + (fallos ? "Repasar mis " + fallos + " fallos" : "Otro test") + "</button>" +
      '<a class="btn ghost" href="' + TL.root + 'panel/">Ver mi panel</a></div>' +
      (TL.online && !TL.sesion() ? '<p class="muted small">¿Quieres guardar tu progreso en la nube y entrar en el ranking? <a href="' + TL.root + 'cuenta/">Crea tu cuenta gratis</a>.</p>' : "") +
      "</div>";
    el.querySelector("[data-again]").onclick = function () {
      el.removeAttribute("data-art");
      var pool = bloqueado() ? muestra() : data.qs;
      if (fallos) start(pool.filter(function (q) { return TL.estado(q.ley || LEY, q.id) === "fallada"; }), "fallos");
      else menu();
    };
  }

  TL.cargar(LEY).then(function (d) { data = d; if (!data.qs.length) { el.innerHTML = '<p class="muted">Aún no hay preguntas publicadas para esta oposición. Estamos preparándolas.</p>'; return; } menu(); })
    .catch(function () { el.innerHTML = "<p>No se han podido cargar las preguntas. Recarga la página.</p>"; });
})();
