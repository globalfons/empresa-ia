// Preparación física (Mossos 360 · módulo F). Lee las pruebas y los barems OFICIALES del perfil (motor360.modulos.physical.oficial)
// y el progreso local. La lectura del barem sigue `interpretacion_barem` del perfil: a cada marca le corresponde la puntuación del
// último corte alcanzado. Es una lectura de la tabla para entrenar, NO una nota oficial (la pone el tribunal) ni una valoración médica.
// El plan de entrenamiento es ORIENTATIVO de TestLey: se separa siempre de los requisitos de la convocatoria.
(function () {
  var LS = "testley:fisica:v1";
  function lsGet(k, d) { try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function num(s) { return parseFloat(String(s).replace(/[<>]/g, "").replace(",", ".")); }

  // ---------- motor (puro) ----------
  // Puntuación 0..10 de una marca: cortes[i] es el corte de P = i. «menor» (tiempo): P = mayor i con marca ≤ corte (P10 exige < corte).
  // «mayor» (repeticiones, períodos): P = mayor i con marca ≥ corte (P10 exige > corte). El extremo P0 es «peor que el corte 1».
  function puntuar(prueba, marca, cortes) {
    var m = +marca;
    if (!isFinite(m) || m < 0 || !cortes || cortes.length !== 11) return null;
    var p = 0;
    for (var i = 1; i <= 10; i++) {
      var c = num(cortes[i]), estricto = /[<>]/.test(cortes[i]);
      var ok = prueba.mejor === "menor" ? (estricto ? m < c : m <= c) : (estricto ? m > c : m >= c);
      if (ok) p = i;
    }
    return p;
  }
  // Nota de la prueba física con la ponderación oficial y los mínimos (1 por ejercicio y 5 en total). marcas = {idPrueba: valor}
  function nota(of, sexo, marcas) {
    var b = (of.barems || {})[sexo];
    if (!b) return null;
    var det = of.pruebas.map(function (pr) {
      var v = marcas[pr.id];
      var p = v === "" || v == null ? null : puntuar(pr, v, b[pr.barem]);
      return { id: pr.id, nombre: pr.nombre, marca: v, puntos: p, peso: (of.ponderacion || {})[pr.id] || 100 / of.pruebas.length };
    });
    var completas = det.every(function (d) { return d.puntos != null; });
    var pesos = det.reduce(function (a, d) { return a + d.peso; }, 0);
    var total = completas ? Math.round((det.reduce(function (a, d) { return a + d.puntos * d.peso; }, 0) / pesos) * 100) / 100 : null;
    var minEj = of.minimo_por_ejercicio || 0, minTot = of.minimo_total || 0;
    var fallaEj = det.filter(function (d) { return d.puntos != null && d.puntos < minEj; }).map(function (d) { return d.id; });
    return { detalle: det, total: total, completas: completas, minimos_ok: completas ? !fallaEj.length && total >= minTot : null, por_debajo_minimo: fallaEj };
  }
  // Siguiente corte a superar (para fijar objetivos): devuelve {puntos, marca} o null si ya está en 10.
  function siguienteCorte(prueba, marca, cortes) {
    var p = puntuar(prueba, marca, cortes);
    if (p == null || p >= 10) return null;
    return { puntos: p + 1, marca: cortes[p + 1] };
  }
  // Plan ORIENTATIVO: semanas hasta la fecha (máx. 16), 3 sesiones/semana, progresión por fases y prioridad a la prueba con menos puntos.
  var FASES = [
    { id: "base", nombre: "Base", desc: "Técnica de cada ejercicio y volumen suave", rpe: "6/10" },
    { id: "desarrollo", nombre: "Desarrollo", desc: "Más volumen e intervalos específicos", rpe: "7/10" },
    { id: "especifica", nombre: "Específica", desc: "Simulaciones de las pruebas y ritmo de examen", rpe: "8/10" },
    { id: "puesta", nombre: "Puesta a punto", desc: "Menos volumen, intensidad corta y descanso", rpe: "6–7/10" },
  ];
  var SESIONES = {
    "circuit-agilitat": ["Técnica del circuito por tramos (cambios de dirección y desplazamientos) + 6 repeticiones completas con 2 min de pausa", "Velocidad y cambios de dirección: 8 × 20 m con giro + 4 circuitos cronometrados", "2 intentos cronometrados como en la prueba (no consecutivos), descanso completo"],
    "pressio-banc": ["Técnica de press de banca con carga ligera: 4 × 12, ritmo controlado", "Series al ritmo de la prueba: 4 × 30 s con la carga oficial, 2 min de pausa", "1 intento de 45 s con la carga oficial (con ayudante) y 3 × 8 de fuerza"],
    "cursa-llancadora": ["Carrera continua suave 25–30 min + técnica de giro en 20 m", "Intervalos: 6 × 2 min a ritmo alto, 2 min suaves", "Test de llançadora completo o hasta el período objetivo"],
  };
  function plan(of, sexo, marcas, fechaExamen, ahora) {
    ahora = ahora || Date.now();
    var dias = fechaExamen ? Math.ceil((new Date(fechaExamen + "T00:00:00") - new Date(ahora)) / 864e5) : null;
    var semanas = dias == null ? 12 : Math.max(1, Math.min(16, Math.floor(dias / 7)));
    var n = nota(of, sexo, marcas || {});
    var orden = of.pruebas.map(function (pr) { var d = n ? n.detalle.filter(function (x) { return x.id === pr.id; })[0] : null; return { id: pr.id, nombre: pr.nombre, p: d && d.puntos != null ? d.puntos : -1 }; })
      .sort(function (a, b) { return a.p - b.p; });
    var out = [];
    for (var s = 0; s < semanas; s++) {
      var f = s >= semanas - 1 && semanas > 2 ? FASES[3] : FASES[Math.min(2, Math.floor((s / Math.max(1, semanas - 1)) * 3))];
      var nivel = f.id === "base" ? 0 : f.id === "desarrollo" ? 1 : 2;
      var ses = [0, 1, 2].map(function (k) {
        var pr = orden[k % orden.length];
        return { prueba: pr.id, nombre: pr.nombre, trabajo: (SESIONES[pr.id] || ["Trabajo específico de la prueba"])[Math.min(nivel, 2)] };
      });
      if (f.id === "puesta") ses = [ses[0], { prueba: null, nombre: "Descanso activo", trabajo: "Movilidad y carrera muy suave 20 min" }];
      out.push({ semana: s + 1, fase: f.id, fase_nombre: f.nombre, descripcion: f.desc, intensidad: f.rpe, sesiones: ses });
    }
    return { semanas: semanas, dias: dias, prioridad: orden.map(function (o) { return o.id; }), semanas_plan: out, orientativo: true };
  }
  // Calendario de las próximas sesiones del plan (3 por semana: lunes, miércoles y viernes de la semana correspondiente)
  function calendario(p, ahora, n) {
    var d0 = new Date(ahora || Date.now()); d0.setHours(0, 0, 0, 0);
    var lunes = new Date(d0); lunes.setDate(d0.getDate() - ((d0.getDay() + 6) % 7));
    var out = [];
    p.semanas_plan.forEach(function (w, i) {
      w.sesiones.forEach(function (s, k) {
        var d = new Date(lunes); d.setDate(lunes.getDate() + i * 7 + [0, 2, 4][k]);
        if (d >= d0) out.push({ fecha: d.toISOString().slice(0, 10), semana: w.semana, fase: w.fase_nombre, nombre: s.nombre, trabajo: s.trabajo });
      });
    });
    return out.slice(0, n || 6);
  }

  // ---------- registro local ----------
  function datos() { return lsGet(LS, { sexo: "", registros: [], sesiones: [] }); }
  function guardar(d) { lsSet(LS, d); }
  function registrar(prueba, marca, ts) {
    var v = +String(marca).replace(",", ".");
    if (!isFinite(v) || v < 0) return false;
    var d = datos(); d.registros.push({ ts: ts || Date.now(), prueba: prueba, marca: v });
    if (d.registros.length > 500) d.registros.shift();
    guardar(d); return true;
  }
  function marcarSesion(fecha, hecho) {
    var d = datos(); d.sesiones = (d.sesiones || []).filter(function (x) { return x !== fecha; });
    if (hecho) d.sesiones.push(fecha);
    guardar(d);
  }
  function mejores(of, regs) {
    var m = {};
    of.pruebas.forEach(function (pr) {
      var r = regs.filter(function (x) { return x.prueba === pr.id; }).map(function (x) { return x.marca; });
      if (r.length) m[pr.id] = pr.mejor === "menor" ? Math.min.apply(null, r) : Math.max.apply(null, r);
    });
    return m;
  }
  function ultimas(of, regs) {
    var m = {};
    regs.slice().sort(function (a, b) { return a.ts - b.ts; }).forEach(function (x) { m[x.prueba] = x.marca; });
    return m;
  }
  // Resumen para el panel 360 (sin nota oficial): marcas registradas, lectura del barem de las últimas marcas y la prueba más débil
  function resumen(of) {
    var d = datos();
    if (!of || !d.sexo || !d.registros.length) return { estado: d.registros.length ? "sin_sexo" : "sin_registros", registros: d.registros.length };
    var n = nota(of, d.sexo, ultimas(of, d.registros));
    var debil = n.detalle.filter(function (x) { return x.puntos != null; }).sort(function (a, b) { return a.puntos - b.puntos; })[0] || null;
    return { estado: "ok", registros: d.registros.length, lectura: n.total, completas: n.completas, minimos_ok: n.minimos_ok, debil: debil && { id: debil.id, nombre: debil.nombre, puntos: debil.puntos }, sesiones: (d.sesiones || []).length };
  }

  window.TLFisica = { puntuar: puntuar, nota: nota, siguienteCorte: siguienteCorte, plan: plan, calendario: calendario, FASES: FASES,
    datos: datos, guardar: guardar, registrar: registrar, marcarSesion: marcarSesion, mejores: mejores, ultimas: ultimas, resumen: resumen, LS: LS };

  // ---------- interfaz ----------
  var el = typeof document !== "undefined" && document.getElementById("fisica");
  if (!el) return;
  var OP = el.getAttribute("data-op"), ROOT = el.getAttribute("data-base") || (window.TL && TL.root) || (window.TL_CONFIG || {}).root || "./";
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function fmt(v) { return v == null ? "—" : String(Math.round(v * 100) / 100).replace(".", ","); }
  fetch(ROOT + "datos/perfil-" + OP + ".json").then(function (r) { return r.json(); }).then(function (perfil) {
    var of = perfil.motor360 && perfil.motor360.modulos.physical && perfil.motor360.modulos.physical.oficial;
    if (!of || of.verification_status !== "OFFICIAL_VERIFIED") { el.innerHTML = '<p class="muted">Las pruebas físicas de esta convocatoria están pendientes de verificación oficial.</p>'; return; }
    pintar(of);
  }).catch(function () { el.innerHTML = '<p class="warn">No se han podido cargar los datos de la prueba física. Recarga la página.</p>'; });

  function pintar(of) {
    var d = datos(), aj = window.TL && TL.ajustes ? TL.ajustes() : {};
    var sexo = d.sexo, ult = ultimas(of, d.registros), mej = mejores(of, d.registros);
    var html = '<section class="card"><h2>Tu categoría del barem</h2><p class="small muted">Las bases publican un barem para hombres y otro para mujeres.</p>' +
      '<p>' + of.categorias.map(function (c) { return '<label class="check"><input type="radio" name="fx-sexo" value="' + c + '"' + (sexo === c ? " checked" : "") + "> " + (c === "homes" ? "Barem de hombres" : "Barem de mujeres") + "</label>"; }).join(" ") + "</p></section>";
    if (!sexo) { el.innerHTML = html + '<p class="muted">Elige tu barem para registrar marcas y ver su lectura.</p>'; enlazar(of); return; }
    var n = nota(of, sexo, ult), b = of.barems[sexo];
    html += '<section class="card" id="fx-registro"><h2>Registrar una marca</h2><form id="fx-form" class="fx-form">' +
      '<label>Prueba<select name="prueba" class="select">' + of.pruebas.map(function (p) { return '<option value="' + p.id + '">' + esc(p.nombre) + " (" + esc(p.unidad) + ")</option>"; }).join("") + "</select></label>" +
      '<label>Marca<input name="marca" inputmode="decimal" required placeholder="p. ej. 18,4" class="input"></label>' +
      '<label>Fecha<input name="fecha" type="date" class="input" value="' + new Date().toISOString().slice(0, 10) + '"></label>' +
      '<button class="btn primary" type="submit">Guardar marca</button></form><p id="fx-msg" class="small muted" role="status"></p></section>';
    html += '<section class="card"><h2>Lectura del barem con tus últimas marcas</h2><div class="tabla-scroll"><table class="tabla"><thead><tr><th>Prueba</th><th>Última</th><th>Mejor</th><th>Puntos (lectura)</th><th>Siguiente corte</th></tr></thead><tbody>' +
      of.pruebas.map(function (p) {
        var x = n.detalle.filter(function (y) { return y.id === p.id; })[0], sig = ult[p.id] != null ? siguienteCorte(p, ult[p.id], b[p.barem]) : null;
        return "<tr><td>" + esc(p.nombre) + "</td><td>" + fmt(ult[p.id]) + "</td><td>" + fmt(mej[p.id]) + "</td><td>" + (x.puntos == null ? "—" : "<b>" + x.puntos + "</b> / 10") + "</td><td>" + (sig ? esc(sig.marca) + " → " + sig.puntos + " p." : x.puntos === 10 ? "Máximo" : "—") + "</td></tr>";
      }).join("") + "</tbody></table></div>" +
      (n.completas ? '<p>Lectura ponderada: <b>' + fmt(n.total) + "</b> / 10 · " + (n.minimos_ok ? '<span class="chip ok">Alcanza los mínimos de las bases</span>' : '<span class="chip">Por debajo de algún mínimo (1 por ejercicio y 5 en total)</span>') + "</p>" : '<p class="muted small">Registra las tres pruebas para ver la lectura ponderada.</p>') +
      '<p class="muted small">' + esc(of.interpretacion_barem) + "</p></section>";
    var hist = d.registros.slice().sort(function (a, c) { return c.ts - a.ts; }).slice(0, 20);
    html += '<section class="card"><h2>Evolución</h2>' + (hist.length ? '<div class="tabla-scroll"><table class="tabla"><thead><tr><th>Fecha</th><th>Prueba</th><th>Marca</th><th>Puntos</th><th></th></tr></thead><tbody>' + hist.map(function (r) {
      var p = of.pruebas.filter(function (x) { return x.id === r.prueba; })[0];
      return p ? "<tr><td>" + new Date(r.ts).toLocaleDateString("es-ES") + "</td><td>" + esc(p.nombre) + "</td><td>" + fmt(r.marca) + "</td><td>" + puntuar(p, r.marca, b[p.barem]) + '</td><td><button class="btn-link small" data-borrar="' + r.ts + '">Borrar</button></td></tr>' : "";
    }).join("") + "</tbody></table></div>" : '<p class="muted">Todavía no has registrado ninguna marca.</p>') + "</section>";
    var pl = plan(of, sexo, ult, aj.fechaExamen), cal = calendario(pl, Date.now(), 6), hechas = d.sesiones || [];
    html += '<section class="card" id="fx-plan"><div class="of-head"><h2>Plan de entrenamiento</h2><span class="badge-testley">Orientativo de TestLey</span></div>' +
      '<p class="small">' + (pl.dias == null ? 'Sin fecha de examen: plan de 12 semanas. <a href="' + ROOT + 'panel/">Indica tu fecha en el panel</a> para ajustarlo.' : "Faltan " + pl.dias + " días: plan de " + pl.semanas + " semanas.") + " Prioridad: " + pl.prioridad.map(function (id) { return esc(of.pruebas.filter(function (p) { return p.id === id; })[0].nombre); }).join(" › ") + ".</p>" +
      '<h3>Próximas sesiones</h3><ul class="nov">' + cal.map(function (c) { return '<li><label class="check"><input type="checkbox" data-sesion="' + c.fecha + '"' + (hechas.indexOf(c.fecha) >= 0 ? " checked" : "") + '> <b>' + c.fecha.split("-").reverse().join("/") + "</b> · " + esc(c.fase) + " · " + esc(c.nombre) + ": " + esc(c.trabajo) + "</label></li>"; }).join("") + "</ul>" +
      '<details><summary>Ver el plan completo por semanas</summary><ol>' + pl.semanas_plan.map(function (w) { return "<li><b>" + esc(w.fase_nombre) + "</b> (intensidad " + esc(w.intensidad) + "): " + w.sesiones.map(function (s) { return esc(s.nombre) + " — " + esc(s.trabajo); }).join(" · ") + "</li>"; }).join("") + "</ol></details>" +
      '<p class="muted small">Plan general de entrenamiento, no una prescripción. Antes de empezar, y si tienes una lesión o una condición médica, consulta con un profesional sanitario. Calienta 10–15 min, progresa poco a poco, duerme y descansa entre sesiones intensas, y detente si notas dolor.</p></section>';
    el.innerHTML = html;
    enlazar(of);
  }
  function enlazar(of) {
    [].forEach.call(el.querySelectorAll('input[name="fx-sexo"]'), function (i) { i.onchange = function () { var d = datos(); d.sexo = i.value; guardar(d); pintar(of); }; });
    var f = document.getElementById("fx-form");
    if (f) f.onsubmit = function (e) {
      e.preventDefault();
      var ts = f.fecha.value ? new Date(f.fecha.value + "T12:00:00").getTime() : Date.now();
      var ok = registrar(f.prueba.value, f.marca.value, ts);
      if (!ok) { document.getElementById("fx-msg").textContent = "Introduce una marca numérica válida."; return; }
      pintar(of);
      var m = document.getElementById("fx-msg"); if (m) m.textContent = "Marca guardada.";
    };
    [].forEach.call(el.querySelectorAll("[data-borrar]"), function (bt) { bt.onclick = function () { var d = datos(), ts = +bt.getAttribute("data-borrar"); d.registros = d.registros.filter(function (r) { return r.ts !== ts; }); guardar(d); pintar(of); }; });
    [].forEach.call(el.querySelectorAll("[data-sesion]"), function (c) { c.onchange = function () { marcarSesion(c.getAttribute("data-sesion"), c.checked); }; });
  }
})();
