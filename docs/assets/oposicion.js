// Página de oposición: botón "Preparar esta oposición" y tu dominio en cada tema del temario.
(function () {
  var box = document.getElementById("op-accion");
  if (!box || !window.TL) return;
  var op = box.getAttribute("data-op");
  if (box.getAttribute("data-tipo") === "convocatoria") {
    var pintarC = function () {
      var sig = TL.sigo(op);
      box.innerHTML = '<div class="op-cta"><button class="btn" id="seguir" aria-pressed="' + sig + '">' + (sig ? "Siguiendo esta convocatoria" : "Seguir esta convocatoria") + "</button></div>";
      document.getElementById("seguir").onclick = function () { TL.alternarSeguir(op); pintarC(); };
    };
    pintarC(); return;
  }
  function pintar() {
    var mia = TL.miOposicion() === op, sig = TL.sigo(op), tests = box.getAttribute("data-tests") === "1";
    var seguir = '<button class="btn" id="seguir" aria-pressed="' + sig + '">' + (sig ? "Siguiendo" : "Seguir convocatoria") + "</button>";
    var probar = tests ? '<a class="btn" href="#tests">Hacer un test</a>' : "";
    box.innerHTML = mia
      ? '<div class="acciones"><a class="cta" href="' + TL.root + "panel/?c=" + op + '">Ver mi progreso</a>' + probar + seguir +
        '<p class="acciones-nota">Es tu oposición. <a href="' + TL.root + "ranking/?c=" + op + '">Ranking</a></p></div>'
      : '<div class="acciones"><button class="cta" id="elegir">Preparar esta oposición</button>' + probar + seguir +
        '<p class="acciones-nota">Tu panel, tu plan y tu nota se centrarán en esta oposición. Puedes cambiarla cuando quieras.</p></div>';
    var b = document.getElementById("elegir");
    if (b) b.onclick = function () { TL.setMiOposicion(op); if (!TL.sigo(op)) TL.alternarSeguir(op); location.href = TL.root + "panel/?c=" + op; };
    document.getElementById("seguir").onclick = function () { TL.alternarSeguir(op); pintar(); };
  }
  pintar();
  TL.cargar(op).then(function (data) {
    if (TL.online && TL.sesion()) TL.subir(op);
    var s = TL.stats(op, data);
    if (!s.porTema) return;
    var items = document.querySelectorAll("#op-temario .temario-lista > li");
    s.porTema.forEach(function (x, i) {
      if (!x.cubierto || !items[i] || !s.respuestas) return;
      var b = document.createElement("span");
      b.className = "tema-pct " + (x.pct >= 70 ? "good" : x.pct >= 40 ? "mid" : "low");
      b.textContent = x.pct + " % dominado";
      items[i].querySelector(".chips").appendChild(b);
    });
  }).catch(function () {});
  // Índice «En esta página»: marca la sección visible
  var enlaces = [].slice.call(document.querySelectorAll(".ficha-nav a"));
  if (enlaces.length && "IntersectionObserver" in window) {
    var visibles = {};
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { visibles[e.target.id] = e.isIntersecting; });
      var actual = enlaces.filter(function (a) { return visibles[a.getAttribute("href").slice(1)]; })[0];
      if (actual) enlaces.forEach(function (a) { a.classList.toggle("activo", a === actual); if (a === actual) a.setAttribute("aria-current", "true"); else a.removeAttribute("aria-current"); });
    }, { rootMargin: "-90px 0px -55% 0px" });
    enlaces.forEach(function (a) { var t = document.getElementById(a.getAttribute("href").slice(1)); if (t) io.observe(t); });
  }
})();
