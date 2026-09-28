// Página de oposición: botón "Preparar esta oposición" y tu dominio en cada tema del temario.
(function () {
  var box = document.getElementById("op-accion");
  if (!box || !window.TL) return;
  var op = box.getAttribute("data-op");
  function pintar() {
    var mia = TL.miOposicion() === op;
    box.innerHTML = mia
      ? '<div class="op-cta mine"><span>✔ Es tu oposición.</span> <a class="btn primary" href="' + TL.root + "panel/?c=" + op + '">Ver mi progreso</a> <a class="btn" href="' + TL.root + "ranking/?c=" + op + '">Ranking de esta oposición</a></div>'
      : '<div class="op-cta"><button class="cta" id="elegir">Preparar esta oposición</button> <a class="btn" href="' + TL.root + "ranking/?c=" + op + '">Ver su ranking</a><p class="muted small">Tu panel, tu nota y tu ranking se centrarán en esta oposición. Puedes cambiarla cuando quieras.</p></div>';
    var b = document.getElementById("elegir");
    if (b) b.onclick = function () { TL.setMiOposicion(op); pintar(); };
  }
  pintar();
  TL.cargar(op).then(function (data) {
    if (TL.online && TL.sesion()) TL.subir(op);
    var s = TL.stats(op, data);
    if (!s.porTema) return;
    var items = document.querySelectorAll("#op-temario ol.temario > li");
    s.porTema.forEach(function (x, i) {
      if (!x.cubierto || !items[i] || !s.respuestas) return;
      var b = document.createElement("span");
      b.className = "tema-pct " + (x.pct >= 70 ? "good" : x.pct >= 40 ? "mid" : "low");
      b.textContent = "Tu dominio: " + x.pct + " %";
      items[i].querySelector(".chips").appendChild(b);
    });
  }).catch(function () {});
})();
