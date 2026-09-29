// Admin: la página no contiene secretos (estado público de las fuentes), pero no se enlaza ni se indexa.
// Si config.json define adminEmails, se avisa a quien no sea administrador.
(function () {
  var CFG = window.TL_CONFIG || {}, s = window.TL && TL.sesion();
  if (CFG.adminEmails && CFG.adminEmails.length && !(s && CFG.adminEmails.indexOf(s.user.email) >= 0)) {
    var m = document.createElement("p"); m.className = "warn"; m.textContent = "Zona de administración. Entra con una cuenta de administrador.";
    document.querySelector("main") && document.querySelector("main").prepend(m);
  }
})();
