// Avisos: publicaciones oficiales del BOE sobre las oposiciones que sigues (datos/novedades.json, generado por catalogo/vigilar_boe.py).
(function () {
  if (!window.TL) return;
  var TIPO = { convocatoria: "Convocatoria", listas: "Listas de admitidos", aprobados: "Aprobados", fecha_examen: "Fecha de examen", modificacion: "Modificación", correccion: "Corrección de errores", nombramiento: "Nombramientos", otro: "Publicación" };
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function cargar() { return fetch(TL.root + "datos/novedades.json").then(function (r) { return r.json(); }).catch(function () { return []; }); }
  function mias(nov) { var aj = TL.ajustes(); return nov.filter(function (n) { return aj.sigo.indexOf(n.oposicion) >= 0; }); }
  window.TLAvisos = {
    cargar: cargar,
    nuevos: function (nov) { var v = TL.ajustes().vistoAlertas || 0; return mias(nov).filter(function (n) { return n.relevancia === "convocatoria" && Date.parse(n.detectado || n.fecha) > v; }); },
    pintar: function (box) {
      if (!box) return;
      cargar().then(function (nov) {
        var L = mias(nov), nuevos = TLAvisos.nuevos(nov).map(function (n) { return n.id + n.oposicion; });
        if (!TL.ajustes().sigo.length) { box.innerHTML = ""; return; }
        var conv = L.filter(function (n) { return n.relevancia === "convocatoria"; }).slice(0, 8);
        box.innerHTML = '<h3 id="avisos-t">Avisos de tus convocatorias <span class="badge-oficial">BOE</span></h3>' + (conv.length
          ? '<ul class="nov">' + conv.map(function (n) {
              return '<li' + (nuevos.indexOf(n.id + n.oposicion) >= 0 ? ' class="nuevo"' : "") + '><span class="nov-f">' + n.fecha.split("-").reverse().join("/") + '</span> <span class="chip ok">' + (TIPO[n.tipo] || n.tipo) + '</span> <a href="' + esc(n.url) + '" rel="noopener">' + esc(n.titulo.length > 160 ? n.titulo.slice(0, 158) + "…" : n.titulo) + "</a></li>";
            }).join("") + "</ul>"
          : '<p class="muted small">Sin publicaciones nuevas de tus convocatorias. Revisamos el BOE cada día.</p>');
        if (nuevos.length) TL.guardarAjustes({ vistoAlertas: Date.now() });
      });
    },
  };
})();
