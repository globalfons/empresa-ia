// Calculadora: ¿Me sale a cuenta el JR Pass?
// Tarifas aproximadas de billete sencillo, asiento reservado, clase ordinaria (¥).
// Revisar precios cada 6 meses. Fuentes en la página.
(function () {
  var TRAMOS = [
    ["Aeropuerto Narita ⇄ Tokio (Narita Express)", 3070],
    ["Tokio ⇄ Odawara / Hakone (Kodama)", 3810],
    ["Tokio ⇄ Nikko", 5150],
    ["Tokio ⇄ Sendai (Hayabusa)", 11410],
    ["Tokio ⇄ Kioto (shinkansen)", 14170],
    ["Tokio ⇄ Osaka (shinkansen)", 14720],
    ["Tokio ⇄ Kanazawa (Kagayaki)", 14380],
    ["Tokio ⇄ Hiroshima (shinkansen)", 19760],
    ["Kioto ⇄ Osaka (JR)", 580],
    ["Kioto ⇄ Nara (JR)", 720],
    ["Osaka ⇄ Hiroshima (shinkansen)", 10620],
    ["Hiroshima ⇄ Miyajima (tren + ferri JR)", 620],
    ["Aeropuerto Kansai ⇄ Kioto (Haruka)", 3640],
  ];
  var PASES = {
    oficial: { 7: 50000, 14: 80000, 21: 100000 },
    agencia: { 7: 53000, 14: 84000, 21: 105000 },
  };

  var box = document.getElementById("jr-tramos");
  if (!box) return;
  box.innerHTML = TRAMOS.map(function (t, i) {
    return '<div class="seg"><label for="t' + i + '" style="margin:0;font-weight:400">' + t[0] +
      '</label><input type="number" id="t' + i + '" min="0" max="10" value="0" aria-label="Número de trayectos">' +
      '<span class="price">' + t[1].toLocaleString("es-ES", { useGrouping: "always" }) + " ¥</span></div>";
  }).join("");

  var yen = function (n) { return Math.round(n).toLocaleString("es-ES", { useGrouping: "always" }) + " ¥"; };
  var eur = function (n, r) { return Math.round(n / r).toLocaleString("es-ES", { useGrouping: "always" }) + " €"; };

  function calc() {
    var total = 0;
    TRAMOS.forEach(function (t, i) {
      var n = parseInt(document.getElementById("t" + i).value, 10) || 0;
      total += n * t[1];
    });
    total += parseFloat(document.getElementById("jr-extra").value) || 0;
    var dias = document.getElementById("jr-dias").value;
    var canal = document.getElementById("jr-canal").value;
    var rate = parseFloat(document.getElementById("jr-rate").value) || 178;
    var pase = PASES[canal][dias];
    var diff = total - pase;
    var out = document.getElementById("jr-result");
    if (total === 0) {
      out.className = "result";
      out.innerHTML = "Añade los trayectos que harás en tren para ver el resultado.";
      return;
    }
    var html = "Billetes sueltos: <strong>" + yen(total) + "</strong> (≈ " + eur(total, rate) + ")<br>" +
      "JR Pass " + dias + " días: <strong>" + yen(pase) + "</strong> (≈ " + eur(pase, rate) + ")";
    if (diff > 0) {
      out.className = "result yes";
      out.innerHTML = '<span class="big">Sí, te ahorras ≈ ' + eur(diff, rate) + "</span>" + html +
        '<br><span class="muted">Solo si todos esos trayectos caen dentro de los ' + dias + " días seguidos del pase.</span>";
    } else {
      out.className = "result no";
      out.innerHTML = '<span class="big">No compensa: pagarías ≈ ' + eur(-diff, rate) + " de más</span>" + html +
        '<br><span class="muted">Compra billetes sueltos o mira pases regionales (más abajo).</span>';
    }
  }
  document.querySelectorAll(".calc input, .calc select").forEach(function (el) {
    el.addEventListener("input", calc);
  });
  calc();
})();
