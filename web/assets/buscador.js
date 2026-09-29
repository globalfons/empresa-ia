// Buscador de oposiciones y convocatorias: texto (sin acentos), categoría y filtros (administración, estado, estudios).
// Refleja la búsqueda en la URL para poder compartirla.
// Si #res tiene data-todas (en /convocatorias/), el HTML solo trae las tarjetas más recientes: el resto se carga de ese
// JSON la primera vez que el usuario busca, filtra o pulsa «Ver todas».
(function () {
  var q = document.getElementById("q"), res = document.getElementById("res");
  if (!q || !res) return;
  var cards = [].slice.call(res.querySelectorAll(".op-card")), chips = [].slice.call(document.querySelectorAll(".cat-chip"));
  var filtros = [].slice.call(document.querySelectorAll("select.filtro"));
  var cuenta = document.getElementById("res-count"), vacio = document.getElementById("res-vacio"), conv = document.getElementById("res-conv");
  var mas = document.getElementById("res-mas"), fuente = res.getAttribute("data-todas"), cargadas = !fuente, cargando = null, verTodas = false;
  var norm = function (t) { return String(t).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim(); };
  var params = new URLSearchParams(location.search), cat = params.get("cat") || "";
  q.value = params.get("q") || "";
  filtros.forEach(function (s) { s.value = params.get(s.getAttribute("data-f")) || ""; });
  if (filtros.some(function (s) { return s.getAttribute("data-f") === "cat"; })) cat = ""; // la categoría la lleva su desplegable
  function cargar() {
    if (cargadas) return Promise.resolve();
    if (!cargando) cargando = fetch(fuente).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }).then(function (L) {
      res.innerHTML = L.join("");
      cards = [].slice.call(res.querySelectorAll(".op-card"));
      cargadas = true;
      if (mas) mas.hidden = true;
    }).catch(function () { cargando = null; cuenta.textContent = "No se han podido cargar todas las convocatorias. Inténtalo de nuevo."; });
    return cargando;
  }
  function filtrar() {
    var palabras = norm(q.value).split(/\s+/).filter(Boolean), n = 0;
    var activo = palabras.length || cat || verTodas || filtros.some(function (s) { return s.value; });
    if (!cargadas && activo) { cuenta.textContent = "Buscando en todas las convocatorias…"; cargar().then(function () { if (cargadas) filtrar(); }); }
    cards.forEach(function (c) {
      var ok = (!cat || c.getAttribute("data-cat") === cat) &&
        filtros.every(function (s) { return !s.value || c.getAttribute("data-" + s.getAttribute("data-f")) === s.value; }) &&
        palabras.every(function (w) { return c.getAttribute("data-q").indexOf(w) >= 0; });
      c.hidden = !ok; if (ok) n++;
    });
    chips.forEach(function (c) { c.classList.toggle("on", c.getAttribute("data-cat") === cat); });
    if (cargadas) cuenta.textContent = n + " " + (n === 1 ? cuenta.getAttribute("data-uno") || "oposición" : cuenta.getAttribute("data-varios") || "oposiciones");
    else if (!activo) cuenta.textContent = cuenta.getAttribute("data-inicial") || cuenta.textContent;
    vacio.hidden = n > 0 || !cargadas;
    if (conv) conv.hidden = n > 0 && !palabras.length;
    var u = new URLSearchParams(); if (q.value) u.set("q", q.value); if (cat) u.set("cat", cat);
    filtros.forEach(function (s) { if (s.value) u.set(s.getAttribute("data-f"), s.value); });
    history.replaceState(null, "", location.pathname + (u.toString() ? "?" + u : ""));
    if (window.TLEventos && palabras.length && cargadas) TLEventos.emitir("search", { q: q.value.slice(0, 80), resultados: n }, { debounce: "search" });
  }
  q.addEventListener("input", filtrar);
  q.form.addEventListener("submit", function (e) { e.preventDefault(); filtrar(); });
  filtros.forEach(function (s) { s.addEventListener("change", filtrar); });
  chips.forEach(function (c) {
    c.addEventListener("click", function (e) { e.preventDefault(); cat = cat === c.getAttribute("data-cat") ? "" : c.getAttribute("data-cat"); filtrar(); });
  });
  if (mas) mas.addEventListener("click", function () { verTodas = true; filtrar(); });
  filtrar();
})();
