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
  var MUESTRA = (TL.plan() && TL.plan().preguntas_muestra) || 10;
  function bloqueado() { return !TL.esGratis(LEY); }
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
      // Test a medida: por tema (o por ley), número de preguntas y tipo según tu historial
      '<details class="amedida"' + (location.hash.indexOf("#test=medida") === 0 ? " open" : "") + '><summary><b>Test a medida</b> · elige tema, número de preguntas y tipo</summary><form id="tm" class="tm-form">' +
      '<label>Tema<select name="tema" class="select"><option value="">Todo el temario disponible</option>' +
      (data.temario
        ? data.temario.filter(function (t) { return t.leyes && t.leyes.length; }).map(function (t) { return '<option value="t' + t.i + '">' + etiquetaTema(t) + ". " + esc(t.t.length > 70 ? t.t.slice(0, 68) + "…" : t.t) + "</option>"; }).join("")
        : bloques.map(function (b, i) { return '<option value="b' + i + '">' + esc(b) + "</option>"; }).join("")) + "</select></label>" +
      '<label>Preguntas<select name="n" class="select"><option>10</option><option selected>20</option><option>30</option><option>50</option><option value="999">Todas</option></select></label>' +
      '<label>Tipo<select name="tipo" class="select"><option value="todas">Todas</option><option value="nuevas">Solo las que no he visto</option><option value="falladas">Solo mis fallos</option><option value="dificiles">Mis difíciles (falladas y aprendidas)</option><option value="favoritas">Mis favoritas ☆</option></select></label>' +
      '<label class="check"><input type="checkbox" name="examen"> Modo examen (sin corrección hasta el final, con cronómetro)</label>' +
      '<button class="btn primary">Empezar</button><span class="muted small" id="tm-msg"></span></form></details>' +
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
    var f = el.querySelector("#tm");
    f.onsubmit = function (e) {
      e.preventDefault();
      var lista = filtrarPool(f.tema.value, f.tipo.value);
      if (!lista.length) { el.querySelector("#tm-msg").textContent = "No hay preguntas con ese filtro."; return; }
      start(shuffle(lista).slice(0, +f.n.value), f.examen.checked ? "examen" : "medida");
    };
    // Accesos directos desde el panel y el plan de estudio: #test=repaso | simulacro | fallos | favoritas | tema-N
    var h = (location.hash.match(/^#test=([a-z0-9-]+)/) || [])[1];
    if (h && !lanzado) {
      lanzado = true;
      if (h === "repaso") start(repaso(20), "repaso");
      else if (h === "simulacro") start(shuffle(data.qs).slice(0, SIM.preguntas), "simulacro");
      else if (h === "fallos") start(filtrarPool("", "falladas"), "fallos");
      else if (h === "favoritas") start(filtrarPool("", "favoritas"), "favoritas");
      else if (/^tema-\d+$/.test(h)) start(filtrarPool("t" + h.slice(5), "prioridad").slice(0, 20), "tema");
      if (h !== "medida") el.scrollIntoView({ block: "start" });
    }
  }
  var lanzado = false;
  // Los temarios pueden reiniciar la numeración en cada bloque: se identifica el tema por su posición (t.i).
  function etiquetaTema(t) { var dup = data.temario.filter(function (x) { return x.n === t.n; }).length > 1; return (dup ? "Bloque " + t.b.split(/[.)]/)[0] + " · " : "") + "Tema " + t.n; }
  window.addEventListener("hashchange", function () { if (data && /^#test=/.test(location.hash)) { lanzado = false; clearInterval(timer); menu(); } });
  function filtrarPool(tema, tipo) {
    var pool = data.qs;
    if (tema && tema[0] === "t" && data.temario) {
      var t = data.temario[+tema.slice(1)];
      pool = pool.filter(function (q) { return t && t.leyes.indexOf(q.ley) >= 0; });
    } else if (tema && tema[0] === "b") {
      var bl = []; data.qs.forEach(function (q) { var b = data.arts[q.art].b; if (bl.indexOf(b) < 0) bl.push(b); });
      pool = pool.filter(function (q) { return data.arts[q.art].b === bl[+tema.slice(1)]; });
    }
    var est = function (q) { return TL.estado(q.ley || LEY, q.id); };
    if (tipo === "nuevas") return pool.filter(function (q) { return est(q) === "nueva"; });
    if (tipo === "falladas") return pool.filter(function (q) { return est(q) === "fallada"; });
    if (tipo === "dificiles") return pool.filter(function (q) { return est(q) === "fallada" || est(q) === "aprendida"; });
    if (tipo === "favoritas") return pool.filter(function (q) { return TL.esFavorita((q.ley || LEY) + ":" + q.id); });
    if (tipo === "prioridad") { // para el plan: primero fallos y nuevas
      var o = { fallada: 0, nueva: 1, aprendida: 2, dominada: 3 };
      return shuffle(pool).sort(function (a, b) { return o[est(a)] - o[est(b)]; });
    }
    return pool;
  }

  function esExamen() { return modo === "simulacro" || modo === "examen"; }
  function minutos() { return modo === "simulacro" ? SIM.minutos : Math.max(1, Math.ceil((queue.length * SIM.minutos) / SIM.preguntas)); }
  var respuestas; // [{q, elegida}] para el análisis de errores

  function start(list, m) {
    queue = list; idx = 0; ok = 0; ko = 0; blank = 0; modo = m; respuestas = [];
    if (!queue.length) { menu(); return; }
    clearInterval(timer);
    if (esExamen()) {
      fin = Date.now() + minutos() * 60 * 1000;
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
    var q = queue[idx], fk = (q.ley || LEY) + ":" + q.id, fav = TL.esFavorita(fk);
    // En exámenes con menos opciones que la pregunta (p. ej. 3 en Policía Nacional) se quitan distractores al azar.
    var order = esExamen() && SIM.opciones < 4 ? shuffle([q.a].concat(shuffle([0, 1, 2, 3].filter(function (i) { return i !== q.a; })).slice(0, SIM.opciones - 1))) : shuffle([0, 1, 2, 3]);
    var pct = Math.round((idx / queue.length) * 100);
    el.innerHTML =
      '<div class="meta"><span>Pregunta ' + (idx + 1) + " de " + queue.length + "</span>" +
      (esExamen() ? '<span class="timer">' + minutos() + ':00</span>' : "<span>" + nombreLey(q) + " · Art. " + (q.artn || q.art) + "</span>") +
      '<button class="fav' + (fav ? " on" : "") + '" data-fav title="Guardar en favoritas" aria-pressed="' + fav + '">' + (fav ? "★" : "☆") + "</button></div>" +
      '<div class="bar"><span style="width:' + pct + '%"></span></div>' +
      '<p class="q">' + esc(q.q) + "</p>" +
      order.map(function (i, k) { return '<button class="opt" data-i="' + i + '"><span class="letter">' + "abcd"[k] + "</span>" + esc(q.o[i]) + "</button>"; }).join("") +
      '<div class="fb" aria-live="polite"></div>' +
      '<div class="actions"><button class="btn" data-skip>Dejar en blanco</button><button class="btn ghost" data-exit>' + (esExamen() ? "Terminar" : "Salir") + "</button></div>";
    el.querySelectorAll(".opt").forEach(function (b) { b.onclick = function () { answer(q, +b.getAttribute("data-i")); }; });
    el.querySelector("[data-fav]").onclick = function () { var on = TL.alternarFavorita(fk); this.classList.toggle("on", on); this.textContent = on ? "★" : "☆"; this.setAttribute("aria-pressed", on); };
    el.querySelector("[data-skip]").onclick = function () { blank++; respuestas.push({ q: q, elegida: null }); next(); };
    el.querySelector("[data-exit]").onclick = function () { if (idx > 0) resultado(true); else menu(); };
  }

  function answer(q, i) {
    var right = i === q.a;
    TL.registrarRespuesta(q.ley || LEY, q.id, right, LEY);
    respuestas.push({ q: q, elegida: i });
    if (right) ok++; else ko++;
    el.querySelectorAll(".opt").forEach(function (b) {
      var bi = +b.getAttribute("data-i");
      b.disabled = true;
      if (esExamen()) { if (bi === i) b.classList.add("sel"); return; }
      if (bi === q.a) b.classList.add("ok");
      else if (bi === i) b.classList.add("ko");
    });
    if (esExamen()) { setTimeout(next, 300); return; }
    el.querySelector(".fb").innerHTML =
      '<p class="verdict ' + (right ? "good" : "bad") + '">' + (right ? "✔ Correcto" : "✘ Incorrecto") + "</p>" +
      '<blockquote><span class="src">Artículo ' + (q.artn || q.art) + " · " + nombreLey(q) + " (BOE)</span>«" + esc(q.cita) + "»</blockquote>" +
      '<a href="' + TL.root + (q.ley || LEY) + "/articulo-" + (q.artn || q.art) + '/">Leer el artículo ' + (q.artn || q.art) + " completo</a>" +
      (window.TLTutor ? ' · <button class="linklike" data-tutor>Explícamelo (IA)</button>' : "");
    var tb = el.querySelector("[data-tutor]");
    if (tb) tb.onclick = function () { tb.disabled = true; window.TLTutor.explicar({ ley: q.ley || LEY, art: String(q.artn || q.art), pregunta: q.q, opciones: q.o, correcta: q.a, elegida: i, cita: q.cita }, el.querySelector(".fb")); };
    var a = el.querySelector(".actions");
    a.innerHTML = '<button class="btn primary" data-next>' + (idx + 1 < queue.length ? "Siguiente →" : "Ver resultado") + "</button>";
    a.querySelector("[data-next]").onclick = next;
    a.querySelector("[data-next]").focus();
  }

  function next() {
    idx++;
    if (idx < queue.length) show(); else resultado();
  }

  // Análisis de errores: dónde fallas (por ley/bloque) y cada fallo con su cita.
  function analisis() {
    var mal = respuestas.filter(function (r) { return r.elegida !== null && r.elegida !== r.q.a; });
    if (!mal.length) return "";
    var por = {};
    respuestas.forEach(function (r) { var b = data.arts[r.q.art].b; (por[b] = por[b] || { n: 0, mal: 0 }).n++; if (r.elegida !== null && r.elegida !== r.q.a) por[b].mal++; });
    var filas = Object.keys(por).filter(function (b) { return por[b].mal; }).sort(function (x, y) { return por[y].mal - por[x].mal; });
    return '<div class="analisis"><h3>Análisis de errores</h3><ul class="weak">' +
      filas.map(function (b) { return "<li><span>" + esc(b) + "</span><span>" + por[b].mal + " de " + por[b].n + " mal</span></li>"; }).join("") + "</ul>" +
      '<details><summary>Revisar mis ' + mal.length + " fallos con la cita del BOE</summary>" +
      mal.map(function (r) {
        var q = r.q;
        return '<div class="rev"><p class="q small">' + esc(q.q) + '</p><p class="small"><span class="bad">✘ ' + esc(q.o[r.elegida]) + '</span><br><span class="good">✔ ' + esc(q.o[q.a]) + "</span></p>" +
          '<blockquote><span class="src">Artículo ' + (q.artn || q.art) + " · " + esc(nombreLey(q)) + " (BOE)</span>«" + esc(q.cita) + "»</blockquote></div>";
      }).join("") + "</details></div>";
  }

  function resultado(parcial) {
    clearInterval(timer);
    var n = parcial ? idx : queue.length;
    var pen = SIM.penalizacion; // la de la oposición (o 1/3 por defecto)
    TL.registrarSesion(LEY, n, ok, ko, blank, modo, pen);
    var nota = n ? Math.max(0, ((ok - ko * pen) / n) * 10) : 0;
    var s = TL.stats(LEY, data);
    var fallos = bloqueado() ? muestra().filter(function (q) { return TL.estado(q.ley || LEY, q.id) === "fallada"; }).length : s.cuenta.fallada;
    el.innerHTML =
      '<div class="result-card"><span class="kicker">' + (modo === "simulacro" ? "Resultado del simulacro" : modo === "examen" ? "Resultado del examen" : "Resultado") + "</span>" +
      '<p class="score">' + fmt(nota) + "<small>/10</small></p>" +
      "<p>" + ok + " aciertos · " + ko + " errores · " + blank + ' en blanco <span class="muted">(cada error resta ' + fraccion(pen) + ")</span></p>" +
      '<p class="muted">Tu nota orientativa global es ahora <b>' + fmt(s.nota) + "</b> y tu dominio del banco es del <b>" + s.dominioPct + " %</b>.</p>" +
      analisis() +
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
