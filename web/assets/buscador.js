// Buscador de oposiciones: filtra las tarjetas por texto (sin acentos) y categoría, y lo refleja en la URL.
(function () {
  var q = document.getElementById("q"), res = document.getElementById("res");
  if (!q || !res) return;
  var cards = [].slice.call(res.querySelectorAll(".op-card")), chips = [].slice.call(document.querySelectorAll(".cat-chip"));
  var cuenta = document.getElementById("res-count"), vacio = document.getElementById("res-vacio");
  var norm = function (t) { return String(t).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim(); };
  var params = new URLSearchParams(location.search), cat = params.get("cat") || "";
  q.value = params.get("q") || "";
  function filtrar() {
    var palabras = norm(q.value).split(/\s+/).filter(Boolean), n = 0;
    cards.forEach(function (c) {
      var ok = (!cat || c.getAttribute("data-cat") === cat) && palabras.every(function (w) { return c.getAttribute("data-q").indexOf(w) >= 0; });
      c.hidden = !ok; if (ok) n++;
    });
    chips.forEach(function (c) { c.classList.toggle("on", c.getAttribute("data-cat") === cat); });
    cuenta.textContent = n + (n === 1 ? " oposición" : " oposiciones");
    vacio.hidden = n > 0;
    var u = new URLSearchParams(); if (q.value) u.set("q", q.value); if (cat) u.set("cat", cat);
    history.replaceState(null, "", location.pathname + (u.toString() ? "?" + u : ""));
  }
  q.addEventListener("input", filtrar);
  q.form.addEventListener("submit", function (e) { e.preventDefault(); filtrar(); });
  chips.forEach(function (c) {
    c.addEventListener("click", function (e) { e.preventDefault(); cat = cat === c.getAttribute("data-cat") ? "" : c.getAttribute("data-cat"); filtrar(); });
  });
  filtrar();
})();
