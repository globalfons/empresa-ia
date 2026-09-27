// Calculadora de presupuesto para viajar a Japón.
// Costes diarios orientativos en yenes (2026). Revisar cada 6 meses.
(function () {
  var ESTILOS = {
    // alojamiento: por habitación doble y noche (mochilero: por cama)
    mochilero: { aloj: 5000, porCama: true, comida: 4000, transporte: 1000, actividades: 1500 },
    medio:     { aloj: 16000, porCama: false, comida: 6500, transporte: 1200, actividades: 2500 },
    comodo:    { aloj: 32000, porCama: false, comida: 12000, transporte: 2000, actividades: 5000 },
  };
  var form = document.getElementById("pp-form");
  if (!form) return;
  var v = function (id) { return parseFloat(document.getElementById(id).value) || 0; };
  var e = function (n) { return Math.round(n).toLocaleString("es-ES", { useGrouping: "always" }) + " €"; };

  function calc() {
    var dias = Math.max(1, v("pp-dias"));
    var pers = Math.max(1, v("pp-pers"));
    var rate = v("pp-rate") || 178;
    var s = ESTILOS[document.getElementById("pp-estilo").value];
    var noches = dias - 1 || 1;
    var alojYen = s.porCama ? s.aloj * pers * noches : s.aloj * Math.ceil(pers / 2) * noches;
    var comidaYen = s.comida * pers * dias;
    var transYen = s.transporte * pers * dias;
    var actYen = s.actividades * pers * dias;
    var jrYen = document.getElementById("pp-jr").value * pers;
    var vuelos = v("pp-vuelo") * pers;
    var seguro = v("pp-seguro") * pers;
    var esim = v("pp-esim") * pers;

    var filas = [
      ["Vuelos", vuelos],
      ["Alojamiento (" + noches + " noches)", alojYen / rate],
      ["Comida", comidaYen / rate],
      ["Transporte urbano", transYen / rate],
      ["Entradas y actividades", actYen / rate],
      ["JR Pass / trenes largos", jrYen / rate],
      ["Seguro de viaje", seguro],
      ["Internet (eSIM)", esim],
    ];
    var total = filas.reduce(function (a, f) { return a + f[1]; }, 0);
    document.getElementById("pp-tabla").innerHTML =
      filas.map(function (f) { return "<tr><td>" + f[0] + '</td><td class="num">' + e(f[1]) + "</td></tr>"; }).join("") +
      '<tr><th>Total</th><th class="num">' + e(total) + "</th></tr>";
    document.getElementById("pp-total").innerHTML =
      '<span class="big">' + e(total) + "</span>≈ " + e(total / pers) + " por persona · " + e(total / pers / dias) + " por persona y día";
  }
  form.addEventListener("input", calc);
  calc();
})();
