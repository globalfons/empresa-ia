// Tutor IA: cliente de la función de Supabase "tutor". Solo se carga si config.json tiene tutorUrl.
// Todo lo que devuelve se etiqueta como generado por IA; la fuente oficial es siempre el BOE.
(function () {
  var CFG = window.TL_CONFIG || {};
  if (!CFG.tutorUrl || !window.TL) return;
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  var AVISO = '<p class="ia-aviso"><span class="badge-ia">IA</span> Respuesta generada por IA a partir del texto oficial. Puede contener errores: la fuente que manda es el BOE.</p>';
  function requisitos() {
    if (!TL.sesion()) return 'Para usar el tutor, <a href="' + TL.root + 'cuenta/#entrar">entra en tu cuenta</a>.';
    if (!TL.puede("tutor")) return 'El tutor IA está incluido en el <a href="' + TL.root + 'pase/">Pase Opositor</a>.';
    return "";
  }
  function llamar(cuerpo) {
    var s = TL.sesion(), p = TL.pase();
    cuerpo.licencia = p && p.clave;
    return fetch(CFG.tutorUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: CFG.supabaseAnonKey, Authorization: "Bearer " + (s && s.access_token) },
      body: JSON.stringify(cuerpo),
    }).then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error(j.error || "Error " + r.status); return j; }); });
  }
  function pintarRespuesta(box, j) {
    var fuentes = (j.fuentes || []).map(function (f) { return '<a href="' + esc(f.url) + '">' + esc(f.titulo) + "</a>"; }).join(" · ");
    box.innerHTML = '<div class="tutor-resp">' + AVISO + "<div>" + esc(j.texto || "").replace(/\n/g, "<br>") + "</div>" + (fuentes ? '<p class="muted small">Fuentes: ' + fuentes + "</p>" : "") + "</div>";
  }
  function ejecutar(box, cuerpo) {
    var r = requisitos();
    if (r) { box.innerHTML = '<p class="muted small">' + r + "</p>"; return; }
    box.innerHTML = '<p class="muted small">El tutor está pensando…</p>';
    llamar(cuerpo).then(function (j) { pintarRespuesta(box, j); }).catch(function (e) { box.innerHTML = '<p class="muted small">' + esc(e.message) + "</p>"; });
  }
  window.TLTutor = {
    // p = {ley, art, pregunta, opciones, correcta, elegida, cita}
    explicar: function (p, cont) { var box = document.createElement("div"); cont.appendChild(box); p.modo = "explicar"; ejecutar(box, p); },
    duda: function (texto, ctx, box) { ejecutar(box, { modo: "duda", texto: texto, oposicion: ctx && ctx.oposicion, ley: ctx && ctx.ley, art: ctx && ctx.art }); },
    recomendar: function (resumen, box) { ejecutar(box, { modo: "recomendar", resumen: resumen }); },
  };
})();
