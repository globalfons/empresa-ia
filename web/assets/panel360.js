// Panel 360 (Mossos 360 · módulo H): amplía el panel con el estado de TODOS los módulos de preparación de la oposición
// (conocimientos, aptitudinal, competencias, entrevista, prueba física y tareas de las demás pruebas), puntos débiles,
// recomendaciones, reparto orientativo del tiempo semanal según la fecha del examen y un simulacro combinado.
// Solo lee el progreso local que ya guardan los demás motores (no crea otro perfil) y el perfil oficial (motor360).
// Sin datos de un módulo → «sin empezar» (nunca porcentajes inventados). El reparto y las fases son orientativos de TestLey.
(function () {
  function lsGet(k, d) { try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } }
  function hoyStr(ts) { return new Date(ts).toDateString(); }
  function media(a) { return a.length ? Math.round((10 * a.reduce(function (x, y) { return x + y; }, 0)) / a.length) / 10 : null; }
  var BASE = { conocimientos: 40, aptitud: 20, fisica: 20, competencias: 10, entrevista: 5, otras: 5 };
  var FASES = [[90, "base", "Base: construye el temario y la condición física"], [30, "desarrollo", "Desarrollo: más volumen de tests y entrenamiento específico"],
    [8, "especifica", "Específica: simulacros completos y repaso de puntos débiles"], [0, "puesta", "Puesta a punto: simulacros cortos, descanso y repaso"]];

  function fase(dias) {
    if (dias == null) return null;
    for (var i = 0; i < FASES.length; i++) if (dias > FASES[i][0] || i === FASES.length - 1) return { id: FASES[i][1], texto: FASES[i][2] };
  }

  // ctx: { stats: TL.stats(op), ajustes: TL.ajustes(), ahora, checklists: [{id, nombre, hechas, total}], root }
  function resumen(op, perfil, ctx) {
    ctx = ctx || {}; var ahora = ctx.ahora || Date.now(), root = ctx.root || "./", mods = (perfil && perfil.motor360 && perfil.motor360.modulos) || {};
    var base = root + "oposiciones/" + op + "/", out = [], s = ctx.stats || {};
    // Conocimientos (Question Engine)
    var debilTema = (s.porTema || []).filter(function (x) { return x.cubierto; }).sort(function (a, b) { return a.pct - b.pct; })[0];
    out.push({ id: "conocimientos", nombre: "Conocimientos", url: base + "#quiz", estado: s.respuestas ? "en_curso" : "sin_empezar",
      valor: s.respuestas ? s.dominioPct : null, detalle: s.respuestas ? s.respuestas + " respuestas · nota orientativa " + (Math.round((s.nota || 0) * 10) / 10) + "/10" : "Aún no has hecho tests",
      debil: s.respuestas && debilTema ? "Tema " + debilTema.t.n + " (" + debilTema.pct + " %)" : null, repaso: s.vencidas || 0 });
    // Aptitudinal (Aptitude Engine + psicotécnicos)
    if (mods.aptitude && mods.aptitude.oficial) {
      var ps = lsGet("testley:psicotecnicos:v1", { sesiones: [] }).sesiones.filter(function (x) { return x.oposicion === op; }), cat = {};
      ps.forEach(function (x) { Object.keys(x.porCategoria || {}).forEach(function (k) { var c = x.porCategoria[k], o = (cat[k] = cat[k] || { ok: 0, n: 0 }); o.ok += c.ok; o.n += c.ok + c.ko; }); });
      var ok = 0, n = 0; Object.keys(cat).forEach(function (k) { ok += cat[k].ok; n += cat[k].n; });
      var dc = Object.keys(cat).filter(function (k) { return cat[k].n >= 3; }).sort(function (a, b) { return cat[a].ok / cat[a].n - cat[b].ok / cat[b].n; })[0];
      out.push({ id: "aptitud", nombre: "Aptitudinal", url: base + "aptitudinal/", estado: ps.length ? "en_curso" : "sin_empezar", valor: n ? Math.round((100 * ok) / n) : null,
        detalle: ps.length ? ps.length + " sesiones · " + (n ? Math.round((100 * ok) / n) + " % de acierto" : "sin respuestas") : "Aún no has entrenado psicotécnicos", debil: dc ? dc + " (" + Math.round((100 * cat[dc].ok) / cat[dc].n) + " %)" : null });
    }
    // Competencias y entrevista (Competency / Interview Engine): % de competencias oficiales ya entrenadas
    var lista = (mods.competency && mods.competency.oficial && mods.competency.oficial.lista) || [];
    if (lista.length) {
      var ej = lsGet("testley:competencias:v1", { ejercicios: [] }).ejercicios.filter(function (x) { return x.op === op; }), cs = {};
      ej.forEach(function (x) { cs[x.comp] = 1; });
      var pend = lista.filter(function (c) { return !cs[c.id]; });
      out.push({ id: "competencias", nombre: "Competencias", url: base + "competencias/", estado: ej.length ? "en_curso" : "sin_empezar", valor: Math.round((100 * (lista.length - pend.length)) / lista.length),
        detalle: ej.length ? ej.length + " situaciones · " + (lista.length - pend.length) + "/" + lista.length + " competencias entrenadas · media " + media(ej.map(function (x) { return x.total; })) : "Aún no has entrenado competencias",
        debil: pend.length && ej.length ? "Sin entrenar: " + pend[0].nombre : null });
      if (mods.interview && mods.interview.oficial) {
        var es = lsGet("testley:entrevista:v1", { sesiones: [] }).sesiones.filter(function (x) { return x.opposition_id === op && (x.evaluations || []).length; }), ce = {};
        es.forEach(function (x) { x.evaluations.forEach(function (ev) { Object.keys(ev.competency_scores || {}).forEach(function (c) { ce[c] = 1; }); }); });
        var nce = lista.filter(function (c) { return ce[c.id]; }).length;
        out.push({ id: "entrevista", nombre: "Entrevista", url: base + "entrevista/", estado: es.length ? "en_curso" : "sin_empezar", valor: es.length ? Math.round((100 * nce) / lista.length) : null,
          detalle: es.length ? es.length + " sesiones · " + nce + "/" + lista.length + " competencias trabajadas" : "Aún no has practicado la entrevista", debil: null });
      }
    }
    // Prueba física (Physical Engine): lectura ponderada de los barems oficiales con tus mejores marcas
    var fo = mods.physical && mods.physical.oficial;
    if (fo && fo.verification_status === "OFFICIAL_VERIFIED" && typeof window !== "undefined" && window.TLFisica) {
      var fr = window.TLFisica.resumen(fo);
      out.push({ id: "fisica", nombre: "Prueba física", url: base + "fisica/", estado: fr.estado === "ok" ? "en_curso" : "sin_empezar",
        valor: fr.estado === "ok" && fr.completas ? Math.round(fr.lectura * 10) : null,
        detalle: fr.estado === "ok" ? (fr.completas ? "Lectura " + fr.lectura + "/10 · " + (fr.minimos_ok ? "alcanza los mínimos" : "por debajo de algún mínimo") : fr.registros + " marcas (faltan pruebas)") : fr.estado === "sin_sexo" ? "Elige el barem para ver tu lectura" : "Aún no has registrado marcas",
        debil: fr.debil ? fr.debil.nombre + " (" + fr.debil.puntos + " p)" : null, alerta: fr.estado === "ok" && fr.completas && !fr.minimos_ok });
    }
    // Resto de pruebas y trámites (listas de tareas del perfil, TLMotor)
    var cl = ctx.checklists || [];
    if (cl.length) {
      var h = cl.reduce(function (a, x) { return a + x.hechas; }, 0), t = cl.reduce(function (a, x) { return a + x.total; }, 0);
      var pe = cl.filter(function (x) { return x.hechas < x.total; })[0];
      var cr = typeof window !== "undefined" && window.TLCatala ? window.TLCatala.resum() : null;
      out.push({ id: "otras", nombre: "Catalán, médica y trámites", url: base + "otras-pruebas/", estado: h || (cr && cr.redaccions + cr.lectures) ? "en_curso" : "sin_empezar", valor: t ? Math.round((100 * h) / t) : null,
        detalle: h + "/" + t + " tareas hechas" + (cr ? " · " + cr.redaccions + " redacciones y " + cr.lectures + " lecturas de catalán" : ""), debil: pe ? pe.nombre : null });
    }

    // Fecha del examen → días, fase y reparto orientativo del tiempo semanal (más peso a lo débil o sin empezar)
    var aj = ctx.ajustes || {}, dias = aj.fechaExamen ? Math.ceil((Date.parse(aj.fechaExamen) - ahora) / 864e5) : null;
    if (dias != null && !isFinite(dias)) dias = null;
    var f = fase(dias), minSem = Math.max(1, +aj.horasSemana || 6) * 60;
    var pesos = out.map(function (m) {
      var w = BASE[m.id] || 5, k = m.estado === "sin_empezar" ? 1.5 : m.valor != null && m.valor < 50 ? 1.4 : m.valor != null && m.valor >= 80 ? 0.7 : 1;
      if (f && f.id === "puesta" && m.id === "fisica") k *= 0.6; // la última semana el entrenamiento físico se suaviza
      return w * k;
    });
    var sum = pesos.reduce(function (a, b) { return a + b; }, 0) || 1;
    var reparto = out.map(function (m, i) { return { id: m.id, nombre: m.nombre, min: Math.round((minSem * pesos[i]) / sum / 5) * 5 }; });

    // Recomendaciones (regla explicable): alertas → repasos pendientes → módulos sin empezar → módulos con menor valor
    var rec = [];
    out.filter(function (m) { return m.alerta; }).forEach(function (m) { rec.push({ id: m.id, texto: "Prioriza " + m.nombre.toLowerCase() + ": tu lectura está por debajo de algún mínimo de las bases.", url: m.url }); });
    if (s.vencidas) rec.push({ id: "repaso", texto: "Tienes " + s.vencidas + " preguntas para repasar hoy (repaso espaciado de tus fallos).", url: root + "errores/?c=" + op });
    out.filter(function (m) { return m.estado === "sin_empezar"; }).forEach(function (m) { rec.push({ id: m.id, texto: "Empieza " + m.nombre.toLowerCase() + ": aún no hay datos de este módulo.", url: m.url }); });
    out.filter(function (m) { return m.valor != null; }).sort(function (a, b) { return a.valor - b.valor; }).slice(0, 2).forEach(function (m) {
      if (m.valor < 80) rec.push({ id: m.id, texto: "Refuerza " + m.nombre.toLowerCase() + (m.debil ? ": " + m.debil : "") + ".", url: m.url });
    });

    // Simulacro 360 de hoy: conocimientos + aptitudinal a ritmo oficial + una situación de competencias + una pregunta de entrevista
    var hoy = hoyStr(ahora), pasos = [{ id: "conocimientos", nombre: "Simulacro de conocimientos", url: base + "#test=simulacro",
      hecho: (s.sesiones || []).some(function (x) { return (x[5] === "simulacro" || x[5] === "examen") && hoyStr(x[0]) === hoy; }) }];
    if (mods.aptitude && mods.aptitude.oficial) pasos.push({ id: "aptitud", nombre: "Aptitudinal contrarreloj", url: base + "aptitudinal/#modo=contrarreloj",
      hecho: lsGet("testley:psicotecnicos:v1", { sesiones: [] }).sesiones.some(function (x) { return x.oposicion === op && hoyStr(x.ts) === hoy; }) });
    if (lista.length) pasos.push({ id: "competencias", nombre: "Una situación de competencias", url: base + "competencias/",
      hecho: lsGet("testley:competencias:v1", { ejercicios: [] }).ejercicios.some(function (x) { return x.op === op && hoyStr(x.ts) === hoy; }) });
    if (lista.length && mods.interview && mods.interview.oficial) pasos.push({ id: "entrevista", nombre: "Una pregunta de entrevista", url: base + "entrevista/",
      hecho: lsGet("testley:entrevista:v1", { sesiones: [] }).sesiones.some(function (x) { return x.opposition_id === op && x.completed_at && hoyStr(Date.parse(x.completed_at) || x.completed_at) === hoy; }) });

    return { modulos: out, recomendaciones: rec.slice(0, 6), dias: dias, fase: f, minutos_semana: minSem, reparto: reparto,
      simulacro: { pasos: pasos, hechos: pasos.filter(function (p) { return p.hecho; }).length }, orientativo: true };
  }

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function seccion(op, perfil, ctx) {
    var r = resumen(op, perfil, ctx);
    return '<section class="card" id="panel360"><div class="of-head"><h2>Tu preparación 360</h2><span class="badge-testley">Orientativo de TestLey</span></div>' +
      (r.dias != null ? "<p><b>" + (r.dias >= 0 ? "Faltan " + r.dias + " días" : "La fecha indicada ya ha pasado") + "</b>" + (r.fase && r.dias >= 0 ? " · " + esc(r.fase.texto) : "") + "</p>"
        : '<p class="small">Indica la fecha de tu examen en «Mi oposición» para ajustar fases y reparto.</p>') +
      '<div class="tabla-wrap"><table class="tabla"><thead><tr><th>Módulo</th><th>Estado</th><th>Punto débil</th></tr></thead><tbody>' +
      r.modulos.map(function (m) {
        return '<tr data-m360="' + m.id + '"><td><a href="' + m.url + '">' + esc(m.nombre) + "</a></td><td>" + (m.valor != null ? "<b>" + m.valor + " %</b> · " : "") + esc(m.detalle) + "</td><td>" + esc(m.debil || "—") + "</td></tr>";
      }).join("") + "</tbody></table></div>" +
      '<p class="muted small">El % es tu dominio en conocimientos, tu acierto en la aptitudinal, las competencias que ya has entrenado, la lectura del barem físico ×10 o las tareas hechas: no es una nota oficial.</p>' +
      (r.recomendaciones.length ? "<h3>Recomendaciones</h3><ul class=\"weak\" id=\"rec360\">" + r.recomendaciones.map(function (x) { return '<li><a href="' + x.url + '">' + esc(x.texto) + "</a></li>"; }).join("") + "</ul>" : "") +
      "<h3>Reparto semanal (" + Math.round(r.minutos_semana / 60) + " h)</h3><ul class=\"small\" id=\"rep360\">" + r.reparto.map(function (x) { return "<li>" + esc(x.nombre) + ": " + x.min + " min</li>"; }).join("") + "</ul>" +
      '<h3>Simulacro 360 de hoy · ' + r.simulacro.hechos + "/" + r.simulacro.pasos.length + '</h3><ol class="hoy-lista" id="sim360">' + r.simulacro.pasos.map(function (p) {
        return '<li><a href="' + p.url + '">' + esc(p.nombre) + "</a> " + (p.hecho ? '<span class="chip ok">Hecho</span>' : "") + "</li>";
      }).join("") + "</ol>" +
      '<p class="muted small">El reparto da más tiempo a lo que aún no has empezado o va peor; las fases y el reparto son una propuesta de entrenamiento de TestLey, no requisitos de la convocatoria.</p></section>';
  }

  if (typeof window !== "undefined") window.TLPanel360 = { resumen: resumen, seccion: seccion, fase: fase };
})();
