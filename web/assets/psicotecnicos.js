// PsychotechnicalEngine (B6): práctica de psicotécnicos separada de las preguntas legales y genérica para cualquier oposición.
// Catálogo: catalogo/psicotecnicos.json (categorías y estructura oficial citada). Reglas:
//  - Un ejercicio es OFFICIAL_EXAM (con su fuente oficial) o TESTLEY_GENERATED (nunca se presenta como reproducción oficial).
//  - Una sesión nunca mezcla OFFICIAL_EXAM y TESTLEY_GENERATED.
//  - Sin fórmula oficial verificable no hay «puntuación oficial»: solo aciertos, errores, blancos, tiempo y progreso propios.
(function () {
  var LS = "testley:psicotecnicos:v1";
  var PROCEDENCIAS = ["OFFICIAL_EXAM", "TESTLEY_GENERATED"];
  function lsGet(d) { try { var v = JSON.parse(localStorage.getItem(LS)); return v == null ? d : v; } catch (e) { return d; } }
  function lsSet(v) { try { localStorage.setItem(LS, JSON.stringify(v)); } catch (e) {} }

  // Devuelve [] si el ejercicio es válido o la lista de problemas
  function validar(it, categorias) {
    var p = [];
    if (!it || !it.id) p.push("sin id");
    if (categorias.indexOf(it && it.categoria) < 0) p.push("categoría desconocida");
    if (PROCEDENCIAS.indexOf(it && it.procedencia) < 0) p.push("procedencia distinta de OFFICIAL_EXAM / TESTLEY_GENERATED");
    if (!it || !it.o || it.o.length < 2 || typeof it.a !== "number" || it.a < 0 || it.a >= it.o.length) p.push("opciones o respuesta inválidas");
    if (it && it.procedencia === "OFFICIAL_EXAM" && !(it.fuente && it.fuente.url && it.fuente.documento)) p.push("OFFICIAL_EXAM sin fuente oficial");
    if (it && it.procedencia === "TESTLEY_GENERATED" && (it.reproduccion_oficial || it.fuente)) p.push("un ejercicio de TestLey no puede presentarse como oficial");
    return p;
  }

  function sesion(items, opciones) {
    opciones = opciones || {};
    var procs = {};
    items.forEach(function (it) { procs[it.procedencia] = 1; });
    if (Object.keys(procs).length > 1) throw new Error("Una sesión no mezcla OFFICIAL_EXAM y TESTLEY_GENERATED");
    return { oposicion: opciones.oposicion || null, procedencia: Object.keys(procs)[0] || null, items: items, respuestas: {}, inicio: opciones.ahora || Date.now(), limite: opciones.minutos ? opciones.minutos * 60 : opciones.segundos || null, modo: opciones.modo || null };
  }
  function responder(s, id, opcion, segundos) { s.respuestas[id] = { o: opcion, s: Math.max(0, segundos || 0) }; }

  // estructura = catalogo.pruebas[oposicion] (o null). Nunca calcula una puntuación oficial sin fórmula verificable.
  function terminar(s, estructura, ahora) {
    var r = { ok: 0, ko: 0, blanco: 0, porCategoria: {}, porDificultad: {}, porSubtipo: {} };
    s.items.forEach(function (it) {
      var x = s.respuestas[it.id], c = (r.porCategoria[it.categoria] = r.porCategoria[it.categoria] || { ok: 0, ko: 0, blanco: 0, segundos: 0 });
      var d = (r.porDificultad[it.dif || "?"] = r.porDificultad[it.dif || "?"] || { ok: 0, n: 0 });
      var st = it.subtipo ? (r.porSubtipo[it.categoria + "/" + it.subtipo] = r.porSubtipo[it.categoria + "/" + it.subtipo] || { ok: 0, ko: 0, blanco: 0, segundos: 0 }) : null;
      d.n++;
      if (!x || x.o == null) { r.blanco++; c.blanco++; if (st) st.blanco++; return; }
      c.segundos += x.s; if (st) st.segundos += x.s;
      if (x.o === it.a) { r.ok++; c.ok++; d.ok++; if (st) st.ok++; } else { r.ko++; c.ko++; if (st) st.ko++; }
    });
    var fin = ahora || Date.now();
    var res = { tipo: "PSYCHOTECHNICAL", procedencia: s.procedencia, oposicion: s.oposicion, inicio: s.inicio, fin: fin, segundos: Math.round((fin - s.inicio) / 1000),
      preguntas: s.items.length, aciertos: r.ok, errores: r.ko, blancos: r.blanco, acierto_pct: s.items.length ? Math.round((100 * r.ok) / s.items.length) : 0,
      porCategoria: r.porCategoria, porDificultad: r.porDificultad, porSubtipo: r.porSubtipo, modo: s.modo || null,
      puntuacion_oficial: null, motivo_sin_puntuacion: estructura && estructura.formula_verificable ? null : "La convocatoria no publica una fórmula verificable para convertir aciertos en puntos." };
    var h = lsGet({ sesiones: [] });
    h.sesiones.push({ ts: fin, oposicion: s.oposicion, procedencia: s.procedencia, preguntas: res.preguntas, aciertos: res.aciertos, errores: res.errores, blancos: res.blancos, segundos: res.segundos, porCategoria: r.porCategoria, porSubtipo: r.porSubtipo, porDificultad: r.porDificultad, modo: s.modo || null });
    if (h.sesiones.length > 200) h.sesiones.shift();
    lsSet(h);
    return res;
  }

  // Progreso propio por categoría (todas las sesiones de la oposición): acierto y segundos por pregunta respondida
  function progreso(oposicion) {
    var out = {};
    lsGet({ sesiones: [] }).sesiones.filter(function (x) { return !oposicion || x.oposicion === oposicion; }).forEach(function (x) {
      Object.keys(x.porCategoria).forEach(function (k) {
        var c = x.porCategoria[k], o = (out[k] = out[k] || { ok: 0, ko: 0, blanco: 0, segundos: 0, sesiones: 0 });
        o.ok += c.ok; o.ko += c.ko; o.blanco += c.blanco; o.segundos += c.segundos; o.sesiones++;
      });
    });
    Object.keys(out).forEach(function (k) { var o = out[k], n = o.ok + o.ko; o.acierto_pct = n ? Math.round((100 * o.ok) / n) : 0; o.seg_por_pregunta = n ? Math.round(o.segundos / n) : null; });
    return out;
  }

  // Detalle para el entrenamiento: por subtipo (precisión, velocidad), errores recurrentes (subtipos con ≥ 4 respondidas y
  // < 60 % de acierto) y evolución por sesión (acierto y segundos por pregunta). Solo con datos reales; sin datos → vacío.
  function detalle(oposicion) {
    var sub = {}, evol = [];
    lsGet({ sesiones: [] }).sesiones.filter(function (x) { return !oposicion || x.oposicion === oposicion; }).forEach(function (x) {
      var n = x.aciertos + x.errores;
      if (n) evol.push({ ts: x.ts, acierto_pct: Math.round((100 * x.aciertos) / n), seg_por_pregunta: Math.round(x.segundos / Math.max(1, x.preguntas)), modo: x.modo || null });
      Object.keys(x.porSubtipo || {}).forEach(function (k) {
        var c = x.porSubtipo[k], o = (sub[k] = sub[k] || { ok: 0, ko: 0, blanco: 0, segundos: 0 });
        o.ok += c.ok; o.ko += c.ko; o.blanco += c.blanco; o.segundos += c.segundos;
      });
    });
    Object.keys(sub).forEach(function (k) { var o = sub[k], n = o.ok + o.ko; o.n = n; o.acierto_pct = n ? Math.round((100 * o.ok) / n) : null; o.seg_por_pregunta = n ? Math.round(o.segundos / n) : null; });
    var recurrentes = Object.keys(sub).filter(function (k) { return sub[k].n >= 4 && sub[k].acierto_pct < 60; }).sort(function (a, b) { return sub[a].acierto_pct - sub[b].acierto_pct; });
    return { porSubtipo: sub, errores_recurrentes: recurrentes, evolucion: evol.slice(-30) };
  }

  window.TLPsico = { validar: validar, sesion: sesion, responder: responder, terminar: terminar, progreso: progreso, detalle: detalle, PROCEDENCIAS: PROCEDENCIAS };
})();
