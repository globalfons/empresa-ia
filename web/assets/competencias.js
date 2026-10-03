// Competency Engine + Psychometric foundation (Mossos 360 · Fase 2). Genérico: datos de docs/datos/competencias-<oposición>.json.
//  - OFICIAL: lista de competencias, claves, escala y cita de las bases (verificadas en el perfil de la oposición).
//  - ENTRENAMIENTO TestLey: fichas, escenarios y cuestionario (VALID del juez). Nunca es criterio ni baremo del tribunal.
// Dos tipos de resultado que nunca se mezclan:
//  - OBJECTIVE_SCORE: puntuación de un escenario contra la clave de entrenamiento de TestLey (determinista, 0-10).
//  - SELF_ASSESSMENT: autopercepción del cuestionario (1-10) y su consistencia. No es nota, ni predicción, ni diagnóstico.
// Contratos para fases siguientes: estado() → competency_strength, competency_training_count, last_training, recommended_next
// (Adaptive Training Engine); interview_question_ids en cada perfil y escenario (Interview Engine).
// Persistencia local (localStorage); sin servidor en esta fase (ver documentacion/COMPETENCY_ENGINE.md).
(function () {
  var LS = "testley:competencias:v1";
  function lsGet() { try { var v = JSON.parse(localStorage.getItem(LS)); return v && v.ejercicios ? v : { ejercicios: [], autoeval: [] }; } catch (e) { return { ejercicios: [], autoeval: [] }; } }
  function lsSet(v) { try { localStorage.setItem(LS, JSON.stringify(v)); } catch (e) {} }

  // CompetencyProfile: datos oficiales + entrenamiento, con la procedencia de cada parte
  function perfiles(data) {
    var of = data.oficial, fichas = {}, esc = {};
    (data.competencias || []).forEach(function (f) { fichas[f.id] = f; });
    (data.escenarios || []).forEach(function (e) { (esc[e.competency_id] = esc[e.competency_id] || []).push(e.id); });
    return of.lista.map(function (c) {
      var f = fichas[c.id];
      return {
        id: c.id, opposition_id: data.oposicion, call_id: of.call_id, official_name: c.nombre, clave: of.clave.indexOf(c.id) >= 0,
        official_definition: null, official_definition_note: "Las bases enumeran la competencia pero no publican su definición.",
        official_source: { url: of.fuente, documento: of.documento }, citation: of.citas[0], verification_status: of.verification_status,
        training: f ? { source_type: "TESTLEY_TRAINING", verification_status: f.verification_status, explicacion: f.explicacion, preparacion: f.preparacion } : null,
        observable_behaviours: f ? { source_type: "TESTLEY_TRAINING", items: f.comportamientos } : null,
        training_scenarios: { source_type: "TESTLEY_GENERATED", ids: esc[c.id] || [] },
        self_assessment_items: f ? f.autoevaluacion.map(function (x) { return { id: x.id, texto: x.texto, invertido: !!x.invertido }; }) : [],
        reflection_questions: f ? f.preguntas_reflexion : [],
        interview_relevance: f ? f.relacion_entrevista : null,
        interview_question_ids: [],
      };
    });
  }

  function totales(e) { return e.opciones.map(function (o) { return Object.keys(o.puntos).reduce(function (a, k) { return a + o.puntos[k]; }, 0); }); }
  function recomendada(e) { var t = totales(e); return t.indexOf(Math.max.apply(null, t)); }

  // OBJECTIVE_SCORE determinista. eleccion: respuesta = índice; ranking: respuesta = orden (índices de mejor a peor).
  function puntuar(e, respuesta) {
    var dims = {}, total;
    if (e.formato === "eleccion") {
      var o = e.opciones[respuesta];
      e.expected_dimensions.forEach(function (d) {
        var max = Math.max.apply(null, e.opciones.map(function (x) { return x.puntos[d] || 0; }));
        dims[d] = max ? Math.round((10 * (o.puntos[d] || 0)) / max) : null;
      });
      var t = totales(e);
      total = Math.round((10 * t[respuesta]) / Math.max.apply(null, t));
      return { tipo: "OBJECTIVE_SCORE", formato: "eleccion", total: total, dimensiones: dims, recomendada: recomendada(e), elegida: respuesta, justificacion: e.justificacion };
    }
    if (!respuesta || respuesta.length !== 4) throw new Error("ranking incompleto");
    var rec = e.orden_recomendado, d = 0;
    rec.forEach(function (op, pos) { d += Math.abs(respuesta.indexOf(op) - pos); });
    total = Math.round(10 * (1 - d / 8)); // distancia máxima entre dos órdenes de 4 elementos = 8
    e.expected_dimensions.forEach(function (k) { dims[k] = total; });
    return { tipo: "OBJECTIVE_SCORE", formato: "ranking", total: total, dimensiones: dims, recomendado: rec, elegido: respuesta, justificacion: e.justificacion };
  }

  function registrar(op, e, r, ahora) {
    var h = lsGet();
    h.ejercicios.push({ ts: ahora || Date.now(), op: op, id: e.id, comp: e.competency_id, formato: e.formato, dif: e.dificultad, total: r.total, dims: r.dimensiones });
    if (h.ejercicios.length > 1000) h.ejercicios.shift();
    lsSet(h);
  }

  // ---------- Psychometric foundation: cuestionario de autopercepción ----------
  function cuestionario(data) {
    var out = [];
    (data.competencias || []).forEach(function (f) { f.autoevaluacion.forEach(function (x) { out.push({ id: x.id, comp: f.id, texto: x.texto, invertido: !!x.invertido }); }); });
    // orden fijo intercalado: nunca dos ítems de la misma competencia seguidos
    return out.filter(function (x) { return !x.invertido; }).concat(out.filter(function (x) { return x.invertido; }));
  }
  // respuestas: {itemId: 1..5}. Escala por competencia 1-10 (directo v, invertido 6-v; media × 2). Consistencia por par:
  // diferencia entre el directo y el invertido recodificado (0 = coherente, 4 = contradictorio). Sin «respuesta correcta».
  function evaluarCuestionario(data, respuestas) {
    var por = {}, items = cuestionario(data);
    items.forEach(function (it) {
      var v = respuestas[it.id];
      if (v == null) return;
      (por[it.comp] = por[it.comp] || []).push(it.invertido ? 6 - v : v);
    });
    var escalas = {}, incoherentes = [], difs = [];
    Object.keys(por).forEach(function (c) {
      var xs = por[c];
      escalas[c] = Math.round((xs.reduce(function (a, b) { return a + b; }, 0) / xs.length) * 2 * 10) / 10;
      if (xs.length === 2) { var dd = Math.abs(xs[0] - xs[1]); difs.push(dd); if (dd >= 3) incoherentes.push(c); }
    });
    var consistencia = difs.length ? Math.round(100 * (1 - difs.reduce(function (a, b) { return a + b; }, 0) / (4 * difs.length))) : null;
    return { tipo: "SELF_ASSESSMENT", escalas: escalas, consistencia_pct: consistencia, poco_consistentes: incoherentes,
      aviso: "Autopercepción para reflexionar y comparar tu evolución. No es una nota, ni una predicción del tribunal, ni un diagnóstico." };
  }
  function guardarCuestionario(op, res, ahora) {
    var h = lsGet();
    h.autoeval.push({ ts: ahora || Date.now(), op: op, escalas: res.escalas, consistencia_pct: res.consistencia_pct });
    if (h.autoeval.length > 100) h.autoeval.shift();
    lsSet(h);
  }

  // ---------- Progreso y contrato para el Adaptive Training Engine ----------
  function estado(op, data, ahora) {
    var h = lsGet(), ejs = h.ejercicios.filter(function (x) { return x.op === op; }), auto = h.autoeval.filter(function (x) { return x.op === op; });
    var ult = auto.length ? auto[auto.length - 1] : null, out = {};
    data.oficial.lista.forEach(function (c) {
      var mios = ejs.filter(function (x) { return x.comp === c.id; }), ultimos = mios.slice(-10);
      out[c.id] = {
        competency_strength: ultimos.length ? Math.round((10 * ultimos.reduce(function (a, x) { return a + x.total; }, 0)) / ultimos.length) / 10 : null,
        competency_training_count: mios.length,
        last_training: mios.length ? mios[mios.length - 1].ts : null,
        self_assessment: ult && ult.escalas[c.id] != null ? ult.escalas[c.id] : null,
        clave: data.oficial.clave.indexOf(c.id) >= 0,
      };
    });
    // recommended_next (regla explicable): primero las no entrenadas (claves antes), después la de menor competency_strength
    var ids = Object.keys(out).filter(function (k) { return ((data.escenarios || []).some(function (e) { return e.competency_id === k; })); });
    var sin = ids.filter(function (k) { return !out[k].competency_training_count; }).sort(function (a, b) { return out[b].clave - out[a].clave; });
    var rec = sin.length ? sin[0] : ids.sort(function (a, b) { return out[a].competency_strength - out[b].competency_strength || out[a].competency_training_count - out[b].competency_training_count; })[0] || null;
    Object.keys(out).forEach(function (k) { out[k].recommended_next = k === rec; });
    var entrenadas = Object.keys(out).filter(function (k) { return out[k].competency_training_count; });
    return {
      competencias: out, recommended_next: rec,
      resumen: { ejercicios_completados: ejs.length, competencias_entrenadas: entrenadas.length, competencias_pendientes: Object.keys(out).length - entrenadas.length,
        puntuacion_media: ejs.length ? Math.round((10 * ejs.reduce(function (a, x) { return a + x.total; }, 0)) / ejs.length) / 10 : null,
        sesiones_autoconocimiento: auto.length },
      evolucion_autopercepcion: auto.map(function (x) { return { ts: x.ts, escalas: x.escalas, consistencia_pct: x.consistencia_pct }; }),
    };
  }

  window.TLCompetencias = { perfiles: perfiles, puntuar: puntuar, registrar: registrar, recomendada: recomendada, totales: totales,
    cuestionario: cuestionario, evaluarCuestionario: evaluarCuestionario, guardarCuestionario: guardarCuestionario, estado: estado, LS: LS };
})();
