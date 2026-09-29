// Onboarding: ¿qué oposición? ¿cuándo te presentas? ¿cuánto tiempo tienes? ¿tu nivel? → plan inicial y primer test.
// Guarda las respuestas en los ajustes del usuario (store.js → nube si tiene cuenta). Se puede cambiar después desde el panel.
(function () {
  var el = document.getElementById("bienvenida");
  if (!el || !window.TL) return;
  var aj = TL.ajustes(), paso = 0, CAT = [];
  var r = { oposicion: aj.oposicion || (location.search.match(/[?&]op=([a-z0-9-]+)/) || [])[1] || "", fechaExamen: aj.fechaExamen || "", horasSemana: aj.horasSemana || 6, dias: aj.dias || [1, 2, 3, 4, 5], nivel: aj.nivel || "empiezo" };
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  var PASOS = [
    function () {
      return "<h1>¿Qué oposición estás preparando?</h1>" +
        '<div class="onb-ops">' + CAT.map(function (o) {
          return '<label class="onb-op"><input type="radio" name="op" value="' + o.id + '"' + (o.id === r.oposicion ? " checked" : "") + "><span><b>" + esc(o.nombre) + "</b><small>" + esc(o.cat) + (o.plazas ? " · " + o.plazas.toLocaleString("es-ES") + " plazas" : "") + "</small></span></label>";
        }).join("") + '</div><p class="muted small">¿No está la tuya? <a href="' + TL.root + 'convocatorias/">Búscala entre las convocatorias oficiales</a> y síguela; mientras tanto puedes preparar las leyes comunes.</p>';
    },
    function () { return '<h1>¿Cuándo quieres presentarte?</h1><label>Fecha aproximada del examen<input type="date" name="fecha" value="' + esc(r.fechaExamen) + '"></label><p class="muted small">Si aún no hay fecha oficial, pon la que te marques como objetivo. Puedes dejarla vacía.</p>'; },
    function () {
      return '<h1>¿Cuánto tiempo puedes estudiar?</h1><label>Horas a la semana<input type="number" name="horas" min="1" max="60" value="' + esc(r.horasSemana) + '"></label>' +
        '<fieldset class="dias"><legend>¿Qué días?</legend>' + [[1, "Lunes"], [2, "Martes"], [3, "Miércoles"], [4, "Jueves"], [5, "Viernes"], [6, "Sábado"], [0, "Domingo"]].map(function (d) { return '<label class="check"><input type="checkbox" name="dia" value="' + d[0] + '"' + (r.dias.indexOf(d[0]) >= 0 ? " checked" : "") + "> " + d[1] + "</label>"; }).join("") + "</fieldset>" +
        '<p class="muted small">Repartiremos tus horas entre esos días; el resto serán de descanso.</p>';
    },
    function () {
      return "<h1>¿Cuál es tu nivel?</h1>" + [["empiezo", "Empiezo de cero"], ["medio", "Ya he estudiado algo"], ["avanzado", "Estoy en el repaso final"]].map(function (x) {
        return '<label class="onb-op"><input type="radio" name="nivel" value="' + x[0] + '"' + (r.nivel === x[0] ? " checked" : "") + "><span><b>" + x[1] + "</b></span></label>";
      }).join("");
    },
  ];
  function leer() {
    var f = el.querySelector("form");
    if (paso === 0) { var c = f.querySelector("input[name=op]:checked"); if (!c) return "Elige una oposición."; r.oposicion = c.value; }
    if (paso === 1) r.fechaExamen = f.fecha.value;
    if (paso === 2) {
      r.horasSemana = Math.max(1, Math.min(60, +f.horas.value || 6));
      r.dias = [].slice.call(f.querySelectorAll("input[name=dia]:checked")).map(function (x) { return +x.value; });
      if (!r.dias.length) return "Elige al menos un día.";
    }
    if (paso === 3) { var n = f.querySelector("input[name=nivel]:checked"); if (n) r.nivel = n.value; }
    return "";
  }
  function pintar(msg) {
    el.innerHTML = '<form class="card onb-card" novalidate><p class="kicker">Paso ' + (paso + 1) + " de " + PASOS.length + '</p><div class="bar"><span style="width:' + (100 * (paso + 1)) / PASOS.length + '%"></span></div>' +
      PASOS[paso]() + (msg ? '<p class="form-msg err" role="alert">' + msg + "</p>" : "") +
      '<p class="onb-nav">' + (paso ? '<button type="button" class="btn" id="atras">Atrás</button> ' : "") + '<button class="btn primary">' + (paso < PASOS.length - 1 ? "Siguiente" : "Crear mi plan y hacer mi primer test") + "</button></p></form>";
    el.querySelector("form").onsubmit = function (e) {
      e.preventDefault();
      var err = leer(); if (err) return pintar(err);
      if (paso < PASOS.length - 1) { paso++; return pintar(); }
      TL.guardarAjustes({ oposicion: r.oposicion, fechaExamen: r.fechaExamen, horasSemana: r.horasSemana, dias: r.dias, nivel: r.nivel, onboarding: Date.now() });
      if (!TL.sigo(r.oposicion)) TL.alternarSeguir(r.oposicion);
      if (window.TLEventos) TLEventos.emitir("ONBOARDING_COMPLETED", { oposicion: r.oposicion, nivel: r.nivel, horas: r.horasSemana, con_fecha: !!r.fechaExamen }, { unaVez: "onboarding" });
      location.href = TL.root + "oposiciones/" + r.oposicion + "/#test=repaso";
    };
    var at = el.querySelector("#atras"); if (at) at.onclick = function () { leer(); paso--; pintar(); };
  }
  fetch(TL.root + "datos/catalogo.json").then(function (x) { return x.json(); }).then(function (c) { CAT = c; pintar(); })
    .catch(function () { el.innerHTML = '<p>No se ha podido cargar el catálogo. <a href="' + TL.root + 'oposiciones/">Ver oposiciones</a></p>'; });
})();
