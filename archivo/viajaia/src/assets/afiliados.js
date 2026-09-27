// ==========================================================
//  CONFIGURACIÓN DE AFILIADOS — edita SOLO este bloque
// ==========================================================
// Cuando te aprueben en cada programa, pega aquí tu ID.
// Mientras un ID esté vacío, los enlaces siguen funcionando
// (llevan a la web normal), pero sin comisión.
//
// Para programas que dan un enlace completo personalizado
// (IATI, Heymondo, Holafly...), pega el enlace entero en "link".
window.AFILIADOS = {
  civitatis:    { param: "aid",        id: "" },   // Civitatis → panel de afiliado → tu "aid"
  getyourguide: { param: "partner_id", id: "" },   // GetYourGuide → Partner ID
  booking:      { param: "aid",        id: "" },   // Booking.com Affiliate Partner → aid
  iati:         { link: "" },                      // IATI → tu enlace de afiliado
  heymondo:     { link: "" },                      // Heymondo → tu enlace de afiliado
  holafly:      { link: "" },                      // Holafly → tu enlace de afiliado (eSIM)
  airalo:       { link: "" },                      // Airalo → tu enlace de afiliado (eSIM)
  klook:        { param: "aid",        id: "" },   // Klook → aid (JR Pass, tarjetas IC)
};
// ==========================================================

(function () {
  var cfg = window.AFILIADOS || {};
  document.querySelectorAll("a[data-aff]").forEach(function (a) {
    var c = cfg[a.getAttribute("data-aff")];
    a.rel = "sponsored nofollow noopener";
    a.target = "_blank";
    if (!c) return;
    // Enlace completo: solo se usa en los enlaces genéricos (sin destino concreto)
    if (c.link && !a.hasAttribute("data-deep")) { a.href = c.link; return; }
    if (c.param && c.id) {
      try {
        var u = new URL(a.href);
        u.searchParams.set(c.param, c.id);
        a.href = u.toString();
      } catch (e) {}
    }
  });
})();
