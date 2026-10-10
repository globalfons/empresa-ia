// Pràctica de català (Mossos 360 · prova de català C1). Estructura OFICIAL de les bases (redacció de 180 paraules com a mínim
// en la primera part, 90 min; lectura en veu alta i conversa en la segona, 10 min). Material:
// - Lectures: fragments literals de textos oficials del DOGC (normes, sense drets d'autor), amb la font.
// - Temes de redacció i de conversa: propostes d'entrenament de TestLey (no són temes oficials ni tenen resposta correcta).
// No hi ha preguntes de sintaxi ni de comprensió generades: requereixen material revisat per persones (bloquejat).
(function () {
  var LS = "testley:catala:v1";
  function lsGet() { try { var v = JSON.parse(localStorage.getItem(LS)); return v && v.redaccions ? v : { redaccions: [], lectures: [] }; } catch (e) { return { redaccions: [], lectures: [] }; } }
  function lsSet(v) { try { localStorage.setItem(LS, JSON.stringify(v)); } catch (e) {} }
  // Recompte orientatiu: paraules separades per espais que contenen alguna lletra («l'home» compta com una)
  function paraules(t) { return String(t || "").split(/\s+/).filter(function (w) { return /[a-zà-ÿ·]/i.test(w); }).length; }
  function desarRedaccio(tema, text, segons, ts) {
    var d = lsGet(), n = paraules(text);
    if (!n) return null;
    var r = { ts: ts || Date.now(), tema: tema, paraules: n, minuts: Math.round((segons || 0) / 60), minim_ok: n >= 180 };
    d.redaccions.push(r); if (d.redaccions.length > 200) d.redaccions.shift(); lsSet(d); return r;
  }
  function desarLectura(id, segons, ts) { var d = lsGet(); d.lectures.push({ ts: ts || Date.now(), id: id, minuts: Math.round((segons || 0) / 60) }); lsSet(d); }
  function resum() { var d = lsGet(); return { redaccions: d.redaccions.length, amb_minim: d.redaccions.filter(function (r) { return r.minim_ok; }).length, lectures: d.lectures.length, darrera: d.redaccions.length ? d.redaccions[d.redaccions.length - 1] : null }; }
  if (typeof window !== "undefined") window.TLCatala = { paraules: paraules, desarRedaccio: desarRedaccio, desarLectura: desarLectura, resum: resum, dades: lsGet, LS: LS };

  var el = typeof document !== "undefined" && document.getElementById("catala-app");
  if (!el) return;
  var OP = el.getAttribute("data-op"), BASE = el.getAttribute("data-base") || "./";
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function mmss(s) { s = Math.max(0, Math.round(s)); return Math.floor(s / 60) + ":" + ("0" + (s % 60)).slice(-2); }
  var D, reloj;
  function parar() { if (reloj) clearInterval(reloj); reloj = null; }
  function compte(segons, out, fi) { var t0 = Date.now(); parar(); reloj = setInterval(function () { var q = segons - (Date.now() - t0) / 1000; out.textContent = mmss(q); if (q <= 0) { parar(); if (fi) fi(); } }, 500); return function () { return (Date.now() - t0) / 1000; }; }

  function inici() {
    parar();
    var r = resum();
    el.innerHTML = '<div class="of-head"><h2>Practica la prova de català</h2><span class="badge-testley">Entrenament de TestLey</span></div>' +
      '<p class="small">' + r.redaccions + " redaccions (" + r.amb_minim + " amb 180 paraules o més) · " + r.lectures + " lectures en veu alta</p>" +
      '<div class="modes"><button class="mode primary" data-m="redaccio"><strong>Redacció (1a part)</strong><span>Tema d\'entrenament, comptador de paraules i temps de 90 min</span></button>' +
      '<button class="mode" data-m="lectura"><strong>Lectura i conversa (2a part)</strong><span>Fragment oficial del DOGC per llegir en veu alta i tema de conversa, 10 min</span></button></div>' +
      (r.redaccions ? '<h3>Les teves redaccions</h3><ul class="small">' + lsGet().redaccions.slice(-5).reverse().map(function (x) { return "<li>" + new Date(x.ts).toLocaleDateString("ca-ES") + " · " + esc(x.tema) + " · " + x.paraules + " paraules" + (x.minim_ok ? "" : " (menys de 180)") + " · " + x.minuts + " min</li>"; }).join("") + "</ul>" : "") +
      '<p class="muted small">Les bases no publiquen els criteris de correcció de la redacció: TestLey no la puntua. La llista de revisió és orientativa. Per a la correcció lingüística, consulta l\'<a href="https://aplicacions.llengua.gencat.cat/llc/AppJava/index.html" rel="noopener">Optimot</a> i el <a href="https://dlc.iec.cat/" rel="noopener">DIEC2</a>.</p>';
    el.querySelector('[data-m="redaccio"]').onclick = redaccio;
    el.querySelector('[data-m="lectura"]').onclick = lectura;
  }
  function redaccio() {
    var tema = D.temes_redaccio[Math.floor(Math.random() * D.temes_redaccio.length)];
    el.innerHTML = '<div class="quiz-head"><span>Redacció · mínim 180 paraules</span><span data-t>90:00</span></div><p><b>Tema d\'entrenament:</b> ' + esc(tema) + "</p>" +
      '<textarea class="input" data-text rows="14" lang="ca" spellcheck="false" aria-label="Redacció"></textarea><p class="small"><span data-n>0</span> paraules (recompte orientatiu)</p>' +
      '<details><summary class="small">Llista de revisió orientativa</summary><ul class="small"><li>Respon el tema i té una idea central clara.</li><li>Introducció, desenvolupament i conclusió.</li><li>Connectors variats i paràgrafs ben delimitats.</li><li>Revisa accents, apòstrofs, pronoms febles i concordances.</li></ul></details>' +
      '<div class="actions"><button class="btn primary" data-fi>Acabar i desar</button> <button class="btn ghost" data-sortir>Sortir</button></div><p class="small" data-msg role="status"></p>';
    var ta = el.querySelector("[data-text]"), n = el.querySelector("[data-n]");
    ta.oninput = function () { n.textContent = paraules(ta.value); };
    var t = compte(90 * 60, el.querySelector("[data-t]"));
    el.querySelector("[data-fi]").onclick = function () {
      var r = desarRedaccio(tema, ta.value, t());
      if (!r) { el.querySelector("[data-msg]").textContent = "Escriu el text abans de desar."; return; }
      parar(); inici();
    };
    el.querySelector("[data-sortir]").onclick = inici;
  }
  function lectura() {
    var l = D.lectures[Math.floor(Math.random() * D.lectures.length)], c = D.temes_conversa[Math.floor(Math.random() * D.temes_conversa.length)];
    el.innerHTML = '<div class="quiz-head"><span>Lectura en veu alta i conversa</span><span data-t>10:00</span></div>' +
      '<blockquote class="cita" lang="ca">' + esc(l.text) + '</blockquote><p class="muted small">Text oficial: <a href="' + esc(l.url) + '" rel="noopener">' + esc(l.font) + '</a> <span class="badge-oficial">Text oficial</span></p>' +
      "<p><b>Tema de conversa (entrenament de TestLey):</b> " + esc(c) + '</p><p class="small">Llegeix el text en veu alta i, després, parla del tema durant uns minuts. Si pots, grava\'t i escolta\'t.</p>' +
      '<div class="actions"><button class="btn primary" data-fi>He acabat</button> <button class="btn ghost" data-sortir>Sortir</button></div>';
    var t = compte(10 * 60, el.querySelector("[data-t]"));
    el.querySelector("[data-fi]").onclick = function () { desarLectura(l.id, t()); inici(); };
    el.querySelector("[data-sortir]").onclick = inici;
  }
  fetch(BASE + "datos/catala-" + OP + ".json").then(function (r) { return r.json(); }).then(function (d) { D = d; inici(); })
    .catch(function (e) { if (window.console) console.error(e); el.innerHTML = '<p class="muted">No s\'ha pogut carregar la pràctica. Torna-ho a provar.</p>'; });
})();
