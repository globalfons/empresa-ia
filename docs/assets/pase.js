// Activación del Pase Opositor con la clave de licencia que Lemon Squeezy envía por email.
(function () {
  var el = document.getElementById("activar");
  if (!el || !window.TL) return;
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  function pintar(msg, tipo) {
    var p = TL.pase();
    if (p) {
      el.innerHTML =
        '<div class="box pase-on"><p><strong>✔ Tu Pase Opositor está activo en este navegador.</strong>' + (p.email ? " Suscripción de " + esc(p.email) + "." : "") + "</p>" +
        '<p>Ya tienes todas las preguntas, los simulacros y el repaso inteligente de todas las leyes.</p>' +
        '<p><a class="cta" href="' + TL.root + 'oposiciones/">Empezar a estudiar</a> <button class="btn ghost" data-quitar>Desactivar en este navegador</button></p>' +
        '<p class="muted small">¿Estudias también en otro dispositivo? Pega allí la misma clave.</p></div>';
      el.querySelector("[data-quitar]").onclick = function () { TL.quitarPase(); pintar(); };
      return;
    }
    el.innerHTML =
      '<form class="box activar" novalidate><h2>¿Ya tienes el Pase? Actívalo aquí</h2>' +
      '<p class="muted">Pega la clave de licencia que recibiste por email de Lemon Squeezy al suscribirte (también la verás en «Mis pedidos» de Lemon Squeezy).</p>' +
      '<label for="clave">Clave de licencia</label><input id="clave" name="clave" autocomplete="off" spellcheck="false" placeholder="XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX">' +
      '<button class="btn primary" type="submit">Activar mi Pase</button>' +
      '<p class="form-msg ' + (tipo || "") + '" role="status">' + (msg || "") + "</p></form>";
    var f = el.querySelector("form");
    f.onsubmit = function (e) {
      e.preventDefault();
      var b = f.querySelector("button"); b.disabled = true; b.textContent = "Comprobando…";
      TL.activarPase(f.clave.value).then(function (r) {
        if (r.ok) return pintar();
        pintar(r.motivo === "caducada"
          ? "Esa clave pertenece a una suscripción cancelada o caducada. Puedes reactivarla desde tu email de Lemon Squeezy."
          : "No reconocemos esa clave. Cópiala completa desde el email de compra.", "err");
      }).catch(function () {
        pintar("No hemos podido comprobar la clave. Revisa tu conexión y vuelve a intentarlo.", "err");
      });
    };
  }
  pintar();
})();
