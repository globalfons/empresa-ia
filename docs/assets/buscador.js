// Buscador de oposiciones y convocatorias: texto (sin acentos), categoría y filtros (administración, estado, estudios).
// Refleja la búsqueda en la URL para poder compartirla.
(function () {
  var q = document.getElementById("q"), res = document.getElementById("res");
  if (!q || !res) return;
  var cards = [].slice.call(res.querySelectorAll(".op-card")), chips = [].slice.call(document.querySelectorAll(".cat-chip"));
  var filtros = [].slice.call(document.querySelectorAll("select.filtro"));
  var cuenta = document.getElementById("res-count"), vacio = document.getElementById("res-vacio"), conv = document.getElementById("res-conv");
  var norm = function (t) { return String(t).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim(); };
  var params = new URLSearchParams(location.search), cat = params.get("cat") || "";
  q.value = params.get("q") || "";
  filtros.forEach(function (s) { s.value = params.get(s.getAttribute("data-f")) || ""; });
  function filtrar() {
    var palabras = norm(q.value).split(/\s+/).filter(Boolean), n = 0;
    cards.forEach(function (c) {
      var ok = (!cat || c.getAttribute("data-cat") === cat) &&
        filtros.every(function (s) { return !s.value || c.getAttribute("data-" + s.getAttribute("data-f")) === s.value; }) &&
        palabras.every(function (w) { return c.getAttribute("data-q").indexOf(w) >= 0; });
      c.hidden = !ok; if (ok) n++;
    });
    chips.forEach(function (c) { c.classList.toggle("on", c.getAttribute("data-cat") === cat); });
    cuenta.textContent = n + " " + (n === 1 ? cuenta.getAttribute("data-uno") || "oposición" : cuenta.getAttribute("data-varios") || "oposiciones");
    vacio.hidden = n > 0;
    if (conv) conv.hidden = n > 0 && !palabras.length;
    var u = new URLSearchParams(); if (q.value) u.set("q", q.value); if (cat) u.set("cat", cat);
    filtros.forEach(function (s) { if (s.value) u.set(s.getAttribute("data-f"), s.value); });
    history.replaceState(null, "", location.pathname + (u.toString() ? "?" + u : ""));
    if (window.TLEventos && palabras.length) TLEventos.emitir("search", { q: q.value.slice(0, 80), resultados: n }, { debounce: "search" });
  }
  q.addEventListener("input", filtrar);
  q.form.addEventListener("submit", function (e) { e.preventDefault(); filtrar(); });
  filtros.forEach(function (s) { s.addEventListener("change", filtrar); });
  chips.forEach(function (c) {
    c.addEventListener("click", function (e) { e.preventDefault(); cat = cat === c.getAttribute("data-cat") ? "" : c.getAttribute("data-cat"); filtrar(); });
  });
  filtrar();
})();
