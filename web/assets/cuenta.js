// Registro, acceso y recuperación de contraseña.
(function () {
  var el = document.getElementById("cuenta");
  if (!el || !window.TL) return;
  if (!TL.online) {
    el.innerHTML = '<div class="card"><h2>Las cuentas se activan muy pronto</h2><p>Mientras tanto puedes usar TestLey sin registrarte: tu progreso se guarda en este navegador y lo verás en <a href="' + TL.root + 'panel/">tu panel</a>.</p></div>';
    return;
  }
  if (TL.sesion()) { location.href = TL.root + "panel/"; return; }
  var modo = location.hash === "#entrar" ? "entrar" : "registro";

  function pintar(msg, tipo) {
    var reg = modo === "registro", rec = modo === "recuperar";
    el.innerHTML =
      '<div class="auth card">' +
      (rec ? "" : '<div class="tabs"><button data-t="registro" class="' + (reg ? "on" : "") + '">Crear cuenta</button><button data-t="entrar" class="' + (!reg ? "on" : "") + '">Entrar</button></div>') +
      "<h1>" + (reg ? "Crea tu cuenta gratis" : rec ? "Recuperar contraseña" : "Entra en tu cuenta") + "</h1>" +
      (reg ? '<p class="muted">Guarda tu progreso en la nube, úsalo en el móvil y el ordenador, y compite en el ranking.</p>' : "") +
      '<form id="f" novalidate>' +
      (reg ? '<label>Nombre público (para el ranking)<input name="alias" maxlength="24" autocomplete="nickname" required placeholder="Ej.: Opositora_2027"></label>' : "") +
      '<label>Email<input name="email" type="email" autocomplete="email" spellcheck="false" autocapitalize="off" required></label>' +
      (rec ? "" : '<label>Contraseña<input name="pass" type="password" minlength="6" autocomplete="' + (reg ? "new-password" : "current-password") + '" required></label>') +
      (reg ? '<label class="check"><input type="checkbox" name="acepto" required> Acepto la <a href="' + TL.root + 'legal/privacidad/" target="_blank">política de privacidad</a> y las <a href="' + TL.root + 'legal/condiciones/" target="_blank">condiciones</a></label>' : "") +
      '<button class="btn primary wide" type="submit">' + (reg ? "Crear cuenta" : rec ? "Enviarme el enlace" : "Entrar") + "</button>" +
      '<p class="form-msg ' + (tipo || "") + '" role="status">' + (msg || "") + "</p></form>" +
      (modo === "entrar" ? '<p class="small"><button class="linklike" data-t="recuperar">¿Has olvidado tu contraseña?</button></p>' : "") +
      (rec ? '<p class="small"><button class="linklike" data-t="entrar">Volver a entrar</button></p>' : "") +
      '<p class="muted small">🔒 Solo guardamos tu email, tu nombre público y tu progreso en los tests. Sin publicidad y sin compartir datos.</p></div>';

    el.querySelectorAll("[data-t]").forEach(function (b) { b.onclick = function () { modo = b.getAttribute("data-t"); pintar(); }; });
    var f = el.querySelector("#f");
    f.onsubmit = function (e) {
      e.preventDefault();
      var email = f.email.value.trim();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return pintar("Escribe un email válido.", "err");
      var btn = f.querySelector("button[type=submit]"); btn.disabled = true; btn.textContent = "Un momento…";
      var p;
      if (modo === "registro") {
        var alias = f.alias.value.trim();
        if (alias.length < 3) { btn.disabled = false; return pintar("El nombre público debe tener al menos 3 caracteres.", "err"); }
        if (f.pass.value.length < 6) { btn.disabled = false; return pintar("La contraseña debe tener al menos 6 caracteres.", "err"); }
        if (!f.acepto.checked) { btn.disabled = false; return pintar("Debes aceptar la política de privacidad.", "err"); }
        p = TL.registrar(email, f.pass.value, alias).then(function (r) {
          if (r.confirmar) { modo = "entrar"; pintar("Te hemos enviado un email para confirmar tu cuenta. Ábrelo y después entra aquí.", "ok"); }
          else { if (window.TLEventos) TLEventos.alta(); location.href = TL.root + (TL.ajustes().onboarding ? "panel/" : "bienvenida/"); }
        });
      } else if (modo === "entrar") {
        p = TL.entrar(email, f.pass.value).then(function () { if (window.TLEventos) TLEventos.alta(true); location.href = TL.root + (TL.ajustes().onboarding ? "panel/" : "bienvenida/"); });
      } else {
        p = TL.recordar(email).then(function () { pintar("Si existe una cuenta con ese email, te hemos enviado un enlace para cambiar la contraseña.", "ok"); });
      }
      p.catch(function (err) { pintar(err.message, "err"); });
    };
  }
  pintar();
})();
