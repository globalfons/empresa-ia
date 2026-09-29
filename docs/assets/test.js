// Motor de test. Se monta en <div id="quiz" data-ley="ley-39-2015" data-base="./" [data-art="24"]>.
(function () {
  var el = document.getElementById("quiz");
  if (!el || !window.TL) return;
  var LEY = el.getAttribute("data-ley");
  var TEMA = el.hasAttribute("data-tema"); // página de un tema: el banco se limita a sus preguntas
  var base = el.getAttribute("data-base") || "./";
  var data, queue, idx, ok, ko, blank, modo, timer, fin, t0, ultimaLista;
  // Configuración del simulacro: la de la oposición (catalogo/oposiciones/<id>.json) o una genérica para las leyes.
  var SIM = { preguntas: 30, minutos: 30, opciones: 4, penalizacion: 1 / 3 };
  try { var cfg = JSON.parse(el.getAttribute("data-sim") || "null"); if (cfg) SIM = cfg; } catch (e) {}
  function fraccion(p) { return Math.abs(p - 1 / 3) < 1e-6 ? "1/3" : Math.abs(p - 0.5) < 1e-6 ? "1/2" : Math.abs(p - 0.25) < 1e-6 ? "1/4" : fmt(p); }

  // Versión del texto legal contra la que se verificó la cita (datos/sellar_preguntas.py)
  function verif(q) { return q.verificada_contra ? " · texto vigente a " + q.verificada_contra.split("-").reverse().join("/") : ""; }
  function nombreLey(q) { var l = data.leyes || {}; return l[q.ley || LEY] || l[Object.keys(l)[0]] || ""; }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function fmt(n) { return (Math.round(n * 100) / 100).toLocaleString("es-ES"); }

  // Repaso inteligente: primero falladas, luego nuevas, luego aprendidas; nunca dominadas salvo que no quede nada.
  // Repaso inteligente: primero lo que toca repasar hoy (repetición espaciada; lo más atrasado antes), luego lo nuevo y después el resto
  function repaso(n) {
    var ahora = Date.now(), orden = { fallada: 0, nueva: 1, aprendida: 2, dominada: 3 };
    var clave = function (q) {
      var l = q.ley || LEY, r = TL.registro(l, q.id);
      if (r && TL.vencida(l, q.id, ahora)) return [0, TL.proximoRepaso(r)];
      return [1 + orden[TL.estado(l, q.id)], 0];
    };
    return shuffle(data.qs).map(function (q) { return [clave(q), q]; }).sort(function (a, b) { return a[0][0] - b[0][0] || a[0][1] - b[0][1]; })
      .map(function (x) { return x[1]; }).slice(0, n);
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
    if (window.TLEventos) TLEventos.emitir("PAYWALL_REACHED", { contexto: LEY, motivo: "muestra" }, { debounce: "paywall:" + LEY });
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
    // Accesos directos (#test=… desde el onboarding, el plan o un email): sin Pase se empieza el test de muestra gratis
    var h = (location.hash.match(/^#test=([a-z0-9-]+)/) || [])[1];
    if (h && !lanzado) { lanzado = true; start(h === "fallos" && fallos.length ? fallos : shuffle(m), h === "fallos" && fallos.length ? "fallos" : "muestra"); el.scrollIntoView({ block: "start" }); }
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
        ? data.temario.filter(function (t) { return t.nq; }).map(function (t) { return '<option value="t' + t.i + '">' + etiquetaTema(t) + ". " + esc(t.t.length > 60 ? t.t.slice(0, 58) + "…" : t.t) + " (" + t.nq + ")</option>"; }).join("")
        : bloques.map(function (b, i) { return '<option value="b' + i + '">' + esc(b) + "</option>"; }).join("")) + "</select></label>" +
      (data.temario && !TEMA ? '<label>Bloque del temario<select name="bloque" class="select"><option value="">Todos los bloques</option>' + bloquesTemario().map(function (b, i) { return '<option value="' + i + '">' + esc(b.length > 70 ? b.slice(0, 68) + "…" : b) + "</option>"; }).join("") + "</select></label>" : "") +
      (Object.keys(data.leyes || {}).length > 1 ? '<label>Ley<select name="ley" class="select"><option value="">Todas las leyes</option>' + Object.keys(data.leyes).map(function (k) { return '<option value="' + k + '">' + esc(data.leyes[k]) + "</option>"; }).join("") + "</select></label>" : "") +
      '<label>Preguntas<select name="n" class="select"><option>10</option><option selected>20</option><option>30</option><option>50</option><option value="999">Todas</option></select></label>' +
      '<p class="muted small" id="tm-disp" aria-live="polite"></p>' +
      '<label>Tipo<select name="tipo" class="select"><option value="todas">Todas</option><option value="nuevas">Solo las que no he visto</option><option value="falladas">Solo mis fallos</option><option value="dificiles">Mis difíciles (falladas y aprendidas)</option><option value="favoritas">Mis favoritas ☆</option></select></label>' +
      (data.qs.some(function (q) { return q.dif; }) ? '<label>Dificultad<select name="dif" class="select"><option value="">Todas</option><option value="1">Fácil</option><option value="2">Media</option><option value="3">Difícil</option></select></label>' : "") +
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
    if (TEMA && f.tema) f.tema.closest("label").remove();
    function seleccion() {
      var lista = filtrarPool(f.tema ? f.tema.value : "", f.tipo.value);
      if (f.dif && f.dif.value) lista = lista.filter(function (q) { return String(q.dif) === f.dif.value; });
      if (f.bloque && f.bloque.value !== "") { var bt = bloquesTemario()[+f.bloque.value]; lista = lista.filter(function (q) { return (q.tm || []).some(function (i) { return data.temario[i].b === bt; }); }); }
      if (f.ley && f.ley.value) lista = lista.filter(function (q) { return q.ley === f.ley.value; });
      return lista;
    }
    // Número real de preguntas disponibles con esos filtros: nunca se ofrecen más de las que hay
    function disponibles() {
      var n = seleccion().length;
      [].forEach.call(f.n.options, function (o) { if (o.value === "999") o.textContent = "Todas (" + n + ")"; else o.disabled = +o.value > n; });
      if (f.n.selectedOptions[0] && f.n.selectedOptions[0].disabled) f.n.value = "999";
      el.querySelector("#tm-disp").textContent = n + " preguntas disponibles con estos filtros";
    }
    [].forEach.call(f.querySelectorAll("select"), function (x) { if (x.name !== "n") x.addEventListener("change", disponibles); });
    disponibles();
    f.onsubmit = function (e) {
      e.preventDefault();
      var lista = seleccion();
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
  function bloquesTemario() { var b = []; (data.temario || []).forEach(function (t) { if (t.nq && b.indexOf(t.b) < 0) b.push(t.b); }); return b; }
  // Los temarios pueden reiniciar la numeración en cada bloque: se identifica el tema por su posición (t.i).
  function etiquetaTema(t) { var dup = data.temario.filter(function (x) { return x.n === t.n; }).length > 1; return (dup ? "Bloque " + t.b.split(/[.)]/)[0] + " · " : "") + "Tema " + t.n; }
  window.addEventListener("hashchange", function () { if (data && /^#test=/.test(location.hash)) { lanzado = false; clearInterval(timer); menu(); } });
  function filtrarPool(tema, tipo) {
    var pool = data.qs;
    if (tema && tema[0] === "t" && data.temario) {
      var t = data.temario[+tema.slice(1)];
      var ti = +tema.slice(1);
      // q.tm: temas a los que pertenece la pregunta (ley + títulos/capítulos del tema; catalogo/temas_ambito.json)
      pool = pool.filter(function (q) { return q.tm ? q.tm.indexOf(ti) >= 0 : t && t.leyes.indexOf(q.ley) >= 0; });
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
    queue = list; idx = 0; ok = 0; ko = 0; blank = 0; modo = m; respuestas = []; t0 = Date.now(); ultimaLista = list;
    if (!queue.length) { menu(); return; }
    if (window.TLEventos) TLEventos.emitir(esExamen() ? "SIMULATION_STARTED" : "TEST_STARTED", { contexto: LEY, modo: m, preguntas: queue.length });
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
      '<blockquote><span class="src">Artículo ' + (q.artn || q.art) + " · " + nombreLey(q) + " (BOE)" + verif(q) + "</span>«" + esc(q.cita) + "»</blockquote>" +
      (q.exp ? '<p class="exp"><span class="badge-testley">Explicación de TestLey</span> ' + esc(q.exp) + "</p>" : "") +
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
    var grupo = function (q) { return q.tm && data.temario ? q.tm.map(function (i) { return etiquetaTema(data.temario[i]) + ". " + data.temario[i].t.slice(0, 60); }) : [data.arts[q.art].b]; };
    respuestas.forEach(function (r) { grupo(r.q).forEach(function (b) { (por[b] = por[b] || { n: 0, mal: 0 }).n++; if (r.elegida !== null && r.elegida !== r.q.a) por[b].mal++; }); });
    var filas = Object.keys(por).filter(function (b) { return por[b].mal; }).sort(function (x, y) { return por[y].mal - por[x].mal; });
    return '<div class="analisis"><h3>Temas débiles en este test</h3><ul class="weak">' +
      filas.map(function (b) { return "<li><span>" + esc(b) + "</span><span>" + por[b].mal + " de " + por[b].n + " mal</span></li>"; }).join("") + "</ul>" +
      '<details><summary>Revisar mis ' + mal.length + " fallos con la cita del BOE</summary>" +
      mal.map(function (r) {
        var q = r.q;
        return '<div class="rev"><p class="q small">' + esc(q.q) + '</p><p class="small"><span class="bad">✘ ' + esc(q.o[r.elegida]) + '</span><br><span class="good">✔ ' + esc(q.o[q.a]) + "</span></p>" +
          '<blockquote><span class="src">Artículo ' + (q.artn || q.art) + " · " + esc(nombreLey(q)) + " (BOE)" + verif(q) + "</span>«" + esc(q.cita) + "»</blockquote></div>";
      }).join("") + "</details></div>";
  }

  function resultado(parcial) {
    clearInterval(timer);
    var n = parcial ? idx : queue.length;
    var pen = SIM.penalizacion; // la de la oposición (o 1/3 por defecto)
    var segundos = Math.round((Date.now() - t0) / 1000);
    TL.registrarSesion(LEY, n, ok, ko, blank, modo, pen, segundos);
    var nota = n ? Math.max(0, ((ok - ko * pen) / n) * 10) : 0;
    var s = TL.stats(LEY, data);
    var cmp = esExamen() ? TL.comparaSimulacros(s.sesiones, modo) : null;
    if (window.TLEventos) TLEventos.emitir(esExamen() ? "SIMULATION_COMPLETED" : "TEST_COMPLETED", { contexto: LEY, modo: modo, preguntas: n, aciertos: ok, errores: ko, nota: Math.round(nota * 10) / 10 });
    var fallos = bloqueado() ? muestra().filter(function (q) { return TL.estado(q.ley || LEY, q.id) === "fallada"; }).length : s.cuenta.fallada;
    el.innerHTML =
      '<div class="result-card"><span class="kicker">' + (modo === "simulacro" ? "Resultado del simulacro" : modo === "examen" ? "Resultado del examen" : "Resultado") + "</span>" +
      '<p class="score">' + fmt(nota) + "<small>/10</small></p>" +
      "<p>" + ok + " aciertos · " + ko + " errores · " + blank + ' sin contestar <span class="muted">(cada error resta ' + fraccion(pen) + ")</span></p>" +
      '<p class="muted">' + (n ? Math.round((100 * ok) / n) : 0) + " % de acierto · tiempo " + Math.floor(segundos / 60) + " min " + (segundos % 60) + " s" + (esExamen() ? " de " + minutos() + " min" : "") + "</p>" +
      '<p class="muted">Tu nota orientativa global es ahora <b>' + fmt(s.nota) + "</b> y tu dominio del banco es del <b>" + s.dominioPct + " %</b>.</p>" +
      (cmp && cmp.anterior != null ? '<p class="cmp">' + (cmp.diferencia >= 0 ? '<b class="good">▲ +' : '<b class="bad">▼ ') + fmt(cmp.diferencia) + "</b> respecto a tu simulacro anterior (" + fmt(cmp.anterior) + ") · media de tus " + cmp.n + " simulacros: <b>" + fmt(cmp.media) + "</b></p>" : esExamen() ? '<p class="muted small">Es tu primer simulacro: el próximo lo compararemos con este.</p>' : "") +
      analisis() +
      '<div class="actions">' + (ko ? '<button class="btn primary" data-errores>Repasar los ' + ko + " errores de este test</button>" : "") +
      (esExamen() ? '<button class="btn" data-repetir>Repetir ' + (modo === "simulacro" ? "simulacro" : "examen") + "</button>" : "") +
      '<button class="btn' + (ko ? "" : " primary") + '" data-again>' + (fallos ? "Repasar todos mis fallos (" + fallos + ")" : "Otro test") + "</button>" +
      '<a class="btn ghost" href="' + TL.root + 'errores/?c=' + LEY + '">Mis errores</a>' +
      '<a class="btn ghost" href="' + TL.root + 'panel/">Ver mi panel</a></div>' +
      (TL.online && !TL.sesion() ? '<p class="muted small">¿Quieres guardar tu progreso en la nube y entrar en el ranking? <a href="' + TL.root + 'cuenta/">Crea tu cuenta gratis</a>.</p>' : "") +
      "</div>";
    var esteTest = respuestas.filter(function (r) { return r.elegida !== null && r.elegida !== r.q.a; }).map(function (r) { return r.q; });
    var be = el.querySelector("[data-errores]"); if (be) be.onclick = function () { start(esteTest, "fallos"); };
    var br = el.querySelector("[data-repetir]"); if (br) br.onclick = function () { start(modo === "simulacro" ? shuffle(data.qs).slice(0, SIM.preguntas) : shuffle(ultimaLista), modo); };
    el.querySelector("[data-again]").onclick = function () {
      el.removeAttribute("data-art");
      var pool = bloqueado() ? muestra() : data.qs;
      if (fallos) start(pool.filter(function (q) { return TL.estado(q.ley || LEY, q.id) === "fallada"; }), "fallos");
      else menu();
    };
  }

  TL.cargar(LEY).then(function (d) { data = d;
    if (TEMA) {
      var ti = +el.getAttribute("data-tema"), st = TL.stats(LEY, d), dom = document.getElementById("tema-dom");
      if (dom && st.porTema && st.porTema[ti] && st.respuestas) dom.textContent = st.porTema[ti].pct + " %";
      data = Object.assign({}, d, { qs: d.qs.filter(function (q) { return (q.tm || []).indexOf(ti) >= 0; }) });
    } if (!data.qs.length) { el.innerHTML = '<p class="muted">Aún no hay preguntas publicadas para esta oposición. Estamos preparándolas.</p>'; return; } menu(); })
    .catch(function () { el.innerHTML = "<p>No se han podido cargar las preguntas. Recarga la página.</p>"; });
})();
