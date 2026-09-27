// Motor de test. Se monta en <div id="quiz" data-src="..." [data-art="24"]>.
(function () {
  var el = document.getElementById("quiz");
  if (!el) return;
  var KEY = "testley:" + (el.getAttribute("data-ley") || "l39");
  var store = {
    get: function () { try { return JSON.parse(localStorage.getItem(KEY)) || { fallos: {}, hechas: 0, aciertos: 0 }; } catch (e) { return { fallos: {}, hechas: 0, aciertos: 0 }; } },
    set: function (v) { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) {} },
  };
  var data, queue, idx, ok, ko, blank;
  var base = el.getAttribute("data-base") || "./";

  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  function menu() {
    var s = store.get();
    var nf = Object.keys(s.fallos).length;
    var soloArt = el.getAttribute("data-art");
    if (soloArt) { start(data.qs.filter(function (q) { return q.art === soloArt; })); return; }
    var bloques = [];
    data.qs.forEach(function (q) { var b = data.arts[q.art].b; if (bloques.indexOf(b) < 0) bloques.push(b); });
    el.innerHTML =
      '<div class="meta"><span>' + data.qs.length + " preguntas verificadas</span><span>" +
      (s.hechas ? "Tu acierto: " + Math.round((100 * s.aciertos) / s.hechas) + " % en " + s.hechas + " respuestas" : "Aún no has respondido ninguna") + "</span></div>" +
      '<p class="q">Elige un test</p><div class="modes">' +
      '<button class="primary" data-m="20">20 preguntas al azar</button>' +
      '<button data-m="10">Test rápido (10)</button>' +
      (nf ? '<button data-m="fallos">Repasar mis fallos (' + nf + ")</button>" : "") +
      '<button data-m="todas">Todas (' + data.qs.length + ")</button></div>" +
      '<label class="muted" for="bq">O por título:</label> <select id="bq" style="max-width:100%;font:inherit;padding:6px;margin-top:6px"><option value="">— elegir —</option>' +
      bloques.map(function (b, i) { return '<option value="' + i + '">' + esc(b) + "</option>"; }).join("") + "</select>";
    el.querySelectorAll("[data-m]").forEach(function (b) {
      b.onclick = function () {
        var m = b.getAttribute("data-m");
        if (m === "fallos") start(data.qs.filter(function (q) { return s.fallos[q.id]; }));
        else if (m === "todas") start(shuffle(data.qs));
        else start(shuffle(data.qs).slice(0, +m));
      };
    });
    el.querySelector("#bq").onchange = function () {
      var b = bloques[this.value];
      if (b) start(shuffle(data.qs.filter(function (q) { return data.arts[q.art].b === b; })));
    };
  }

  function start(list) {
    queue = list; idx = 0; ok = 0; ko = 0; blank = 0;
    if (!queue.length) { menu(); return; }
    show();
  }

  function show() {
    var q = queue[idx];
    var order = shuffle([0, 1, 2, 3]);
    el.innerHTML =
      '<div class="meta"><span>Pregunta ' + (idx + 1) + " de " + queue.length + "</span><span>Art. " + q.art + " · Ley 39/2015</span></div>" +
      '<p class="q">' + esc(q.q) + "</p>" +
      order.map(function (i, k) { return '<button class="opt" data-i="' + i + '">' + "abcd"[k] + ") " + esc(q.o[i]) + "</button>"; }).join("") +
      '<div class="fb"></div>' +
      '<div class="modes"><button data-skip>Dejar en blanco</button></div>';
    el.querySelectorAll(".opt").forEach(function (b) { b.onclick = function () { answer(q, +b.getAttribute("data-i")); }; });
    el.querySelector("[data-skip]").onclick = function () { blank++; next(); };
  }

  function answer(q, i) {
    var s = store.get();
    var right = i === q.a;
    s.hechas++;
    if (right) { ok++; s.aciertos++; delete s.fallos[q.id]; } else { ko++; s.fallos[q.id] = 1; }
    store.set(s);
    el.querySelectorAll(".opt").forEach(function (b) {
      var bi = +b.getAttribute("data-i");
      b.disabled = true;
      if (bi === q.a) b.classList.add("ok");
      else if (bi === i) b.classList.add("ko");
    });
    el.querySelector(".fb").innerHTML =
      "<strong>" + (right ? "✔ Correcto" : "✘ Incorrecto") + "</strong>. Artículo " + q.art + " de la Ley 39/2015:" +
      "<blockquote>«" + esc(q.cita) + "»</blockquote>" +
      '<a href="' + base + "articulo-" + q.art + '/">Leer el artículo ' + q.art + " completo</a>";
    var m = el.querySelector(".modes");
    m.innerHTML = '<button class="primary" data-next>' + (idx + 1 < queue.length ? "Siguiente →" : "Ver resultado") + "</button>";
    m.querySelector("[data-next]").onclick = next;
    m.querySelector("[data-next]").focus();
  }

  function next() {
    idx++;
    if (idx < queue.length) { show(); return; }
    var n = queue.length;
    var nota = Math.max(0, ok - ko / 3);
    el.innerHTML =
      '<p class="score">' + ok + " / " + n + " aciertos</p>" +
      "<p>Errores: " + ko + " · En blanco: " + blank + "<br>Puntuación con penalización (cada error resta 1/3): <strong>" +
      (Math.round(nota * 100) / 100).toLocaleString("es-ES") + "</strong> sobre " + n + "</p>" +
      '<div class="modes"><button class="primary" data-menu>Hacer otro test</button></div>';
    el.querySelector("[data-menu]").onclick = function () { el.removeAttribute("data-art"); menu(); };
  }

  fetch(el.getAttribute("data-src"))
    .then(function (r) { return r.json(); })
    .then(function (d) { data = d; menu(); })
    .catch(function () { el.innerHTML = "<p>No se han podido cargar las preguntas. Recarga la página.</p>"; });
})();
