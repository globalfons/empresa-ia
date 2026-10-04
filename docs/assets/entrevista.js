// Interview Engine (Mossos 360 · Fase 3). Genérico: escenarios en docs/datos/entrevista-<oposición>.json.
// OFICIAL: las competencias (y su cita) de la convocatoria. ENTRENAMIENTO TestLey: escenarios, preguntas, indicadores
// orientativos y la rúbrica de abajo. Nunca hay «respuesta correcta», ni nota del tribunal, ni probabilidad de aprobar.
//
// Modelo: InterviewScenario (datos) · InterviewAnswer {type: "text"|"voice", text, audio_reference, transcript}
// · InterviewEvaluation {scenario_id, dimensiones, competency_scores, strengths, weaknesses, feedback, improvement_points}
// · InterviewSession {id, user_id, opposition_id, call_id, started_at, completed_at, mode, scenario_ids, answers, evaluations}.
// Dos resultados que nunca se mezclan: INTERVIEW_OBJECTIVE_TRAINING_SCORE (rúbrica determinista sobre el texto) y
// SELF_ASSESSMENT_SCORE (lo que el candidato marca de los indicadores orientativos).
// La rúbrica es heurística y explicable: busca indicios en el texto (estructura, ejemplos concretos, reflexión…). No
// entiende el contenido como una persona: por eso se presenta como entrenamiento orientativo. El análisis con IA es un
// complemento opcional que depende del Tutor IA (función `tutor`, modo «entrevista»).
// Persistencia local (localStorage) con la forma de InterviewSession, lista para migrar al servidor sin rehacer el motor.
(function () {
  var LS = "testley:entrevista:v1";
  function lsGet() { try { var v = JSON.parse(localStorage.getItem(LS)); return v && v.sesiones ? v : { sesiones: [] }; } catch (e) { return { sesiones: [] }; } }
  function lsSet(v) { try { localStorage.setItem(LS, JSON.stringify(v)); } catch (e) {} }
  function norm(t) { return String(t || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[’']/g, "'"); }
  function cuenta(txt, lista) { var n = 0; lista.forEach(function (w) { var re = new RegExp("(^|[^a-z])" + w, "g"), m = txt.match(re); if (m) n += m.length; }); return n; }
  function cap(x) { return Math.max(0, Math.min(10, Math.round(x))); }

  // ---------- Criterios de entrenamiento de TestLey (no son criterios del tribunal) ----------
  var L = {
    situacion: ["una vegada", "un dia", "en una ocasio", "quan treballava", "quan estudiava", "fa ", "l'any", "una vez", "un dia", "cuando trabajaba", "cuando estudiaba", "hace ", "el ano"],
    accion: ["vaig ", "vam ", "decidi", "parli", "proposi", "hice", "dije", "decidi", "hable", "propuse", "organice", "busque", "avise", "pregunte"],
    hipotesis: ["parlaria", "proposaria", "avisaria", "demanaria", "intentaria", "buscaria", "explicaria", "faria", "hablaria", "propondria", "avisaria", "pediria", "intentaria", "buscaria", "explicaria", "haria", "primer ", "primero"],
    resultado: ["al final", "finalment", "el resultat", "vam aconseguir", "es va resoldre", "va funcionar", "el resultado", "conseguimos", "se resolvio", "funciono", "gracies a", "gracias a"],
    reflexion: ["vaig aprendre", "he apres", "aprenentatge", "ara faria", "milloraria", "em vaig equivocar", "error", "la propera vegada", "aprendi", "aprendizaje", "ahora haria", "mejoraria", "me equivoque", "la proxima vez", "em va fer veure", "me hizo ver"],
    conectores: ["primer", "despres", "finalment", "per aixo", "perque", "per tant", "aleshores", "primero", "despues", "por eso", "porque", "por tanto", "entonces", "a mes", "ademas"],
    generico: ["sempre", "mai ", "normalment", "en general", "tothom", "siempre", "nunca", "normalmente", "todo el mundo"],
  };
  var COMP = {
    responsabilitat: ["responsab", "compromis", "complir", "cumplir", "assumir", "asumir", "error", "qualitat", "calidad", "revis"],
    cooperacio: ["equip", "equipo", "companys", "companeros", "junts", "juntos", "col.labor", "colabor", "ajud", "ayud", "coordin"],
    autonomia: ["iniciativa", "vaig decidir", "decidi", "per mi mateix", "por mi cuenta", "sense esperar", "sin esperar", "propos", "pas endavant"],
    "resolucio-problemes": ["problema", "solucio", "solucion", "alternativ", "analitz", "analic", "causa", "prioritz", "prioric", "pla b", "plan b"],
    "orientacio-servei": ["persona", "client", "ciutada", "ciudadan", "necessit", "necesid", "escolt", "escuch", "atendre", "atender", "ajudar", "ayudar"],
    adaptabilitat: ["canvi", "cambio", "adapt", "flexib", "nou ", "nuevo", "aprendre", "aprender", "imprevist", "imprevist"],
    autocontrol: ["calma", "tranquil", "pressio", "presion", "nervis", "nervios", "respir", "serenitat", "serenidad", "control"],
    autogestio: ["planific", "organitz", "organic", "objectiu", "objetivo", "millor", "mejor", "formacio", "formacion", "feedback", "critica"],
    motivacio: ["motiv", "servei public", "servicio publico", "vocacio", "vocacion", "ajudar la gent", "ayudar a la gente", "per que vull", "por que quiero", "seguretat", "seguridad"],
    "habilitats-socials": ["escolt", "escuch", "expliqu", "explic", "dialeg", "dialogo", "empat", "convers", "comunic", "respect"],
  };

  // Analiza una respuesta (InterviewAnswer o texto). Devuelve una InterviewEvaluation explicable.
  function evaluar(escenario, respuesta, nombres) {
    var r = typeof respuesta === "string" ? { type: "text", text: respuesta } : respuesta || {};
    var txt = norm(r.text || r.transcript || ""), palabras = txt.split(/\s+/).filter(Boolean).length;
    var frases = txt.split(/[.!?;]+/).filter(function (f) { return f.trim().split(/\s+/).length > 2; }), media = frases.length ? palabras / frases.length : palabras;
    var conductual = escenario.tipo !== "situacional";
    var tiene = function (k) { return cuenta(txt, L[k]) > 0; };
    var d = {};
    // Claridad: extensión razonable, frases ni muy cortas ni interminables, conectores que ordenan la respuesta
    d.claridad = palabras < 15 ? 1 : cap((palabras >= 50 && palabras <= 350 ? 5 : 3) + (media >= 8 && media <= 28 ? 3 : 1) + Math.min(2, cuenta(txt, L.conectores)));
    // Concreción: hechos (conductual) o pasos concretos (situacional); penaliza respuestas genéricas
    var hechos = conductual ? cuenta(txt, L.accion) + (/\d/.test(txt) ? 1 : 0) + (tiene("situacion") ? 1 : 0) : cuenta(txt, L.hipotesis);
    d.concrecion = palabras < 15 ? 0 : cap(2 + hechos * 2 - cuenta(txt, L.generico));
    // Estructura: situación → acción → resultado → aprendizaje (conductual) / pasos → motivo → resultado esperado (situacional)
    var partes = conductual ? [tiene("situacion"), cuenta(txt, L.accion) > 0, tiene("resultado"), tiene("reflexion")]
      : [cuenta(txt, L.hipotesis) > 0, /perque|porque|per aixo|por eso|ja que|ya que/.test(txt), tiene("resultado") || /aixi|asi|per evitar|para evitar|per aconseguir|para conseguir/.test(txt), tiene("reflexion") || /si no|en cas que|en caso de|si despres|si despues/.test(txt)];
    d.estructura = palabras < 15 ? 0 : cap(partes.filter(Boolean).length * 2.5);
    d.reflexion = palabras < 15 ? 0 : cap(cuenta(txt, L.reflexion) * 4 + (/(per que|por que|perque|porque)/.test(txt) ? 2 : 0));
    // Relación con la pregunta: vocabulario compartido con la situación y la pregunta
    var clave = norm(escenario.situacion + " " + escenario.pregunta).split(/[^a-z]+/).filter(function (w) { return w.length > 4; });
    var comunes = clave.filter(function (w, i) { return clave.indexOf(w) === i && txt.indexOf(w.slice(0, 6)) >= 0; }).length;
    d.relacion = palabras < 15 ? 0 : cap(3 + comunes * 1.5);
    var comps = {};
    (escenario.competency_ids || []).forEach(function (c) { comps[c] = palabras < 15 ? 0 : cap(cuenta(txt, COMP[c] || []) * 2.5 + (d.concrecion >= 5 ? 2 : 0)); });
    var generales = ["claridad", "concrecion", "estructura", "reflexion", "relacion"].map(function (k) { return d[k]; });
    var vals = generales.concat(Object.keys(comps).map(function (k) { return comps[k]; }));
    var total = Math.round((10 * vals.reduce(function (a, b) { return a + b; }, 0)) / vals.length) / 10;
    var NOM = { claridad: "Claridad", concrecion: "Concreción", estructura: "Estructura", reflexion: "Reflexión", relacion: "Relación con la pregunta" };
    var fortalezas = [], debilidades = [], mejoras = [];
    var MEJORA = {
      claridad: "Ordena la respuesta: primero el contexto, después lo que hiciste o harías y por qué, y termina con el resultado.",
      concrecion: conductual ? "Cuenta un caso real y concreto (cuándo, dónde, qué hiciste tú) en lugar de hablar en general." : "Describe pasos concretos: qué harías primero, a quién avisarías y cómo lo comprobarías.",
      estructura: conductual ? "Usa la secuencia situación → qué hiciste → resultado → qué aprendiste." : "Explica qué harías, por qué y qué resultado buscas; añade qué harías si no funcionara.",
      reflexion: "Añade qué aprendiste o qué harías diferente ahora: muestra capacidad de autocrítica.",
      relacion: "Vuelve a la pregunta: asegúrate de que tu ejemplo responde exactamente a lo que se pregunta.",
    };
    Object.keys(NOM).forEach(function (k) {
      if (d[k] >= 7) fortalezas.push(NOM[k] + ": la respuesta lo muestra bien.");
      if (d[k] <= 4) { debilidades.push(NOM[k] + ": " + (d[k] <= 2 ? "casi no aparece." : "es mejorable.")); mejoras.push(MEJORA[k]); }
    });
    Object.keys(comps).forEach(function (c) {
      var n = (nombres && nombres[c]) || c;
      if (comps[c] >= 7) fortalezas.push("Se aprecian indicios claros de «" + n + "».");
      if (comps[c] <= 3) debilidades.push("Pocos indicios de «" + n + "» en lo que cuentas.");
    });
    if (palabras < 15) mejoras.unshift("La respuesta es demasiado breve para analizarla: desarróllala con un ejemplo.");
    if (palabras > 400) mejoras.push("Resume: una respuesta de entrevista suele ganar si va al grano (2-3 minutos hablando).");
    return {
      scenario_id: escenario.id, tipo: "INTERVIEW_OBJECTIVE_TRAINING_SCORE", answer_type: r.type || "text", palabras: palabras,
      dimensiones: d, competency_scores: comps, total: total,
      strengths: fortalezas, weaknesses: debilidades, improvement_points: mejoras,
      feedback: ["Análisis orientativo de entrenamiento de TestLey, calculado a partir de indicios en el texto. No es la valoración del tribunal ni predice el resultado."],
    };
  }

  // ---------- Sesiones ----------
  var MODOS = { practica: 3, mixta: 5, simulada: 8, dificiles: 4 };
  var DIFICILES = ["conflicte", "pressio", "error", "critica", "decisio"];
  function rng(s) { var a = s >>> 0; return function () { a = (a + 0x6d2b79f5) >>> 0; var t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function barajar(xs, r) { xs = xs.slice(); for (var i = xs.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)); var t = xs[i]; xs[i] = xs[j]; xs[j] = t; } return xs; }
  // Selección de escenarios por modo (regla explicable). La mixta y la simulada priorizan competencias no practicadas o más débiles.
  function seleccionar(data, conf, semilla) {
    var r = rng(semilla || Date.now()), esc = data.escenarios || [], n = MODOS[conf.modo] || 3;
    if (conf.modo === "practica") return barajar(esc.filter(function (e) { return e.competency_ids[0] === conf.competencia; }), r).slice(0, n);
    if (conf.modo === "dificiles") return barajar(esc.filter(function (e) { return DIFICILES.indexOf(e.categoria) >= 0; }), r).slice(0, n);
    var m = metricas(data.oposicion, data), orden = (m.por_competencia_orden || []).slice(), usados = {}, out = [];
    if (conf.modo === "simulada") { var mot = barajar(esc.filter(function (e) { return e.competency_ids[0] === "motivacio"; }), r)[0]; if (mot) { out.push(mot); usados.motivacio = 1; } }
    orden.forEach(function (c) {
      if (out.length >= n || usados[c]) return;
      var e = barajar(esc.filter(function (x) { return x.competency_ids[0] === c; }), r)[0];
      if (e) { out.push(e); usados[c] = 1; }
    });
    return out.slice(0, n);
  }
  function nuevaSesion(data, conf, semilla, ahora) {
    var esc = seleccionar(data, conf, semilla);
    return { id: "ses-" + (ahora || Date.now()) + "-" + Math.floor(rng(semilla || 1)() * 1e6), user_id: null, opposition_id: data.oposicion, call_id: data.call_id,
      started_at: ahora || Date.now(), completed_at: null, mode: conf.modo, competencia: conf.competencia || null,
      scenario_ids: esc.map(function (e) { return e.id; }), answers: [], evaluations: [], self_assessment: [] };
  }
  function responder(s, escenario, respuesta, nombres) {
    var a = typeof respuesta === "string" ? { type: "text", text: respuesta, audio_reference: null, transcript: null } : respuesta;
    var ev = evaluar(escenario, a, nombres);
    s.answers.push({ scenario_id: escenario.id, answer: a });
    s.evaluations.push(ev);
    return ev;
  }
  // SELF_ASSESSMENT_SCORE: indicadores orientativos que el candidato marca como presentes en su respuesta (aparte)
  function autoevaluar(s, escenario, marcados) {
    var x = { scenario_id: escenario.id, tipo: "SELF_ASSESSMENT_SCORE", marcados: marcados.length, total: (escenario.indicadores || []).length };
    s.self_assessment.push(x);
    return x;
  }
  function terminar(s, ahora) {
    s.completed_at = ahora || Date.now();
    var h = lsGet();
    h.sesiones.push(s);
    if (h.sesiones.length > 50) h.sesiones.shift();
    lsSet(h);
    return informe(s);
  }

  // ---------- Informe de sesión y métricas (solo con datos reales) ----------
  function media(xs) { return xs.length ? Math.round((10 * xs.reduce(function (a, b) { return a + b; }, 0)) / xs.length) / 10 : null; }
  function informe(s, previas) {
    var comps = {}, dims = {};
    s.evaluations.forEach(function (ev) {
      Object.keys(ev.competency_scores).forEach(function (c) { (comps[c] = comps[c] || []).push(ev.competency_scores[c]); });
      Object.keys(ev.dimensiones).forEach(function (k) { (dims[k] = dims[k] || []).push(ev.dimensiones[k]); });
    });
    var mc = {}; Object.keys(comps).forEach(function (c) { mc[c] = media(comps[c]); });
    var md = {}; Object.keys(dims).forEach(function (k) { md[k] = media(dims[k]); });
    var ant = (previas || lsGet().sesiones.filter(function (x) { return x.opposition_id === s.opposition_id && x.id !== s.id; })).slice(-1)[0];
    var mt = media(s.evaluations.map(function (e) { return e.total; }));
    return {
      tipo: "INTERVIEW_OBJECTIVE_TRAINING_SCORE", modo: s.mode, preguntas: s.evaluations.length, media: mt,
      competencias_entrenadas: Object.keys(mc), fuertes: Object.keys(mc).filter(function (c) { return mc[c] >= 7; }), debiles: Object.keys(mc).filter(function (c) { return mc[c] <= 4; }),
      por_competencia: mc, por_dimension: md,
      errores_recurrentes: Object.keys(dims).filter(function (k) { return dims[k].filter(function (v) { return v <= 4; }).length >= 2; }),
      autoevaluacion: s.self_assessment.length ? { tipo: "SELF_ASSESSMENT_SCORE", marcados: s.self_assessment.reduce(function (a, x) { return a + x.marcados; }, 0), total: s.self_assessment.reduce(function (a, x) { return a + x.total; }, 0) } : null,
      evolucion: ant ? { media_anterior: media(ant.evaluations.map(function (e) { return e.total; })), diferencia: mt != null && ant.evaluations.length ? Math.round(10 * (mt - media(ant.evaluations.map(function (e) { return e.total; })))) / 10 : null } : null,
      aviso: "Entrenamiento orientativo de TestLey. No es la puntuación del tribunal ni predice si aprobarás.",
    };
  }
  // Métricas para el dashboard 360 y el plan adaptativo. Sin datos → null (nunca porcentajes inventados).
  function metricas(op, data) {
    var ses = lsGet().sesiones.filter(function (x) { return x.opposition_id === op && x.evaluations.length; });
    var comps = {}, dims = {};
    ses.forEach(function (s) { s.evaluations.forEach(function (ev) {
      Object.keys(ev.competency_scores).forEach(function (c) { (comps[c] = comps[c] || []).push(ev.competency_scores[c]); });
      Object.keys(ev.dimensiones).forEach(function (k) { (dims[k] = dims[k] || []).push(ev.dimensiones[k]); });
    }); });
    var todas = ((data && data.competencias) || []).map(function (c) { return c.id; });
    var mc = {}; todas.forEach(function (c) { mc[c] = comps[c] ? media(comps[c]) : null; });
    var orden = todas.slice().sort(function (a, b) { return (mc[a] == null ? -1 : mc[a]) - (mc[b] == null ? -1 : mc[b]); });
    var dimOrden = Object.keys(dims).sort(function (a, b) { return media(dims[a]) - media(dims[b]); });
    var todosTotales = []; ses.forEach(function (s) { s.evaluations.forEach(function (e) { todosTotales.push(e.total); }); });
    return {
      tipo: "INTERVIEW_OBJECTIVE_TRAINING_SCORE", sesiones: ses.length,
      competencias_entrenadas: todas.filter(function (c) { return mc[c] != null; }).length, competencias_total: todas.length,
      media: media(todosTotales), ultima_sesion: ses.length ? ses[ses.length - 1].completed_at : null,
      area_mas_debil: dimOrden[0] || null, area_a_reforzar: ses.length ? orden[0] || null : null,
      por_competencia: mc, por_competencia_orden: orden,
      evolucion: ses.map(function (s) { return { ts: s.completed_at, modo: s.mode, media: media(s.evaluations.map(function (e) { return e.total; })) }; }),
    };
  }

  window.TLEntrevista = { evaluar: evaluar, seleccionar: seleccionar, nuevaSesion: nuevaSesion, responder: responder, autoevaluar: autoevaluar,
    terminar: terminar, informe: informe, metricas: metricas, MODOS: MODOS, LS: LS };
})();
