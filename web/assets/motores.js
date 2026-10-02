// Motores de preparación (Mossos 360 · F10-F14), genéricos para cualquier oposición: leen el perfil declarativo
// (datos/perfil-<id>.json, generado de catalogo/perfiles/) y el progreso local (TL). Deterministas y explicables (no es IA).
//  - TLMotor.hoy(): TODAY_PLAN = repaso, temas débiles, preguntas nuevas, difíciles, simulacro y minutos recomendados.
//  - Módulos de preparación no medibles (física, psicotécnicos, entrevista…): checklist y registro manual, SIN nota inventada.
//  - Calendario: próximos hitos oficiales (OFICIAL) y previsiones (PREVISIO) del perfil.
// El plan semanal sigue siendo TLPlan (plan.js): este motor no lo duplica, lo usa para el tiempo disponible y las prioridades.
(function () {
  var MIN_POR_PREGUNTA = 1.5;
  var REPARTO = { repaso: 0.35, debiles: 0.35, nuevas: 0.2, dificiles: 0.1 }; // de los minutos que no ocupa el simulacro
  var LS_PREP = "testley:preparacion:v1";
  function lsGet(k, d) { try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }

  // o = { s: TL.stats, data, aj: TL.ajustes(), perfil, sim, estado: TL.estado, ahora }
  function hoy(o) {
    var ahora = o.ahora || Date.now(), aj = o.aj || {}, s = o.s, data = o.data, est = o.estado;
    var dias = (aj.dias && aj.dias.length ? aj.dias : [0, 1, 2, 3, 4, 5, 6]).map(Number);
    if (dias.indexOf(new Date(ahora).getDay()) < 0) return { descanso: true, recommended_minutes: 0 };
    var plan = window.TLPlan ? TLPlan.generar(s, data, aj, o.sim, est) : null;
    var minutos = plan ? plan.minDia : Math.max(10, Math.round(((+aj.horasSemana || 6) * 60) / dias.length));
    var sim = o.sim || (o.perfil && o.perfil.simulacro) || null;
    // Simulacro si toca: cada 7/5/3 días según el nivel (3 si el examen está a ≤ 14 días) y con al menos 30 respuestas
    var cada = aj.nivel === "empiezo" ? 7 : aj.nivel === "avanzado" ? 3 : 5;
    if (plan && plan.dias !== null && plan.dias <= 14) cada = Math.min(cada, 3);
    var ultSim = (s.sesiones || []).filter(function (x) { return x[5] === "simulacro" || x[5] === "examen" || x[5] === "oficial"; }).map(function (x) { return x[0]; }).sort().pop();
    var simulacro = null;
    if (sim && s.respuestas >= 30 && (!ultSim || (ahora - ultSim) / 864e5 >= cada) && minutos >= sim.minutos) {
      simulacro = { preguntas: Math.min(sim.preguntas, s.total), minutos: sim.minutos, motivo: ultSim ? "han pasado " + Math.floor((ahora - ultSim) / 864e5) + " días desde el último" : "aún no has hecho ninguno" };
    }
    var libre = Math.max(0, minutos - (simulacro ? simulacro.minutos : 0));
    var cupo = function (k) { return Math.floor((libre * REPARTO[k]) / MIN_POR_PREGUNTA); };
    var nuevas = 0, dificiles = 0;
    data.qs.forEach(function (q) { var e = est(q.ley, q.id); if (e === "nueva") nuevas++; if (+q.dif === 3 && e !== "dominada") dificiles++; });
    var debiles = (plan ? plan.prioridades : []).filter(function (t) { return t.fall > 0 || t.pct < 50; }).slice(0, 3);
    var porDebil = debiles.length ? Math.max(5, Math.floor(cupo("debiles") / debiles.length)) : 0;
    var bloques = {
      review: { preguntas: Math.min(s.vencidas || 0, cupo("repaso")), pendientes: s.vencidas || 0, ancla: "repaso" },
      weak_topics: debiles.map(function (t) { return { i: t.t.i, tema: t.t.n, titulo: t.t.t, dominio: t.pct, fallos: t.fall, preguntas: Math.min(porDebil, t.n), ancla: "tema-" + t.t.i }; }),
      new_questions: { preguntas: Math.min(nuevas, cupo("nuevas")), pendientes: nuevas },
      difficult_questions: { preguntas: Math.min(dificiles, cupo("dificiles")), pendientes: dificiles },
      simulation: simulacro,
    };
    // Lo que no se usa (p. ej. sin repaso pendiente) pasa a temas débiles o, si no hay, a preguntas nuevas
    var usado = (bloques.review.preguntas + bloques.new_questions.preguntas + bloques.difficult_questions.preguntas +
      bloques.weak_topics.reduce(function (a, t) { return a + t.preguntas; }, 0)) * MIN_POR_PREGUNTA;
    var sobra = Math.floor((libre - usado) / MIN_POR_PREGUNTA);
    if (sobra > 0) bloques.new_questions.preguntas = Math.min(nuevas, bloques.new_questions.preguntas + sobra);
    var sinBanco = ((o.perfil && o.perfil.temario) || []).filter(function (t) { return t.cobertura === "SIN_PREGUNTAS"; }).map(function (t) { return t.id; });
    var total = (bloques.review.preguntas + bloques.new_questions.preguntas + bloques.difficult_questions.preguntas +
      bloques.weak_topics.reduce(function (a, t) { return a + t.preguntas; }, 0)) * MIN_POR_PREGUNTA + (simulacro ? simulacro.minutos : 0);
    return { descanso: false, review: bloques.review, weak_topics: bloques.weak_topics, new_questions: bloques.new_questions,
      difficult_questions: bloques.difficult_questions, simulation: simulacro, recommended_minutes: Math.round(Math.min(minutos, Math.max(total, 0))),
      disponibles: minutos, temas_sin_preguntas: sinBanco, minPorPregunta: MIN_POR_PREGUNTA };
  }

  // ---- Módulos de preparación no medibles: checklist + registro manual (sin medición ni nota) ----
  function prep() { return lsGet(LS_PREP, {}); }
  function mod(op, id) { var p = prep(); p[op] = p[op] || {}; p[op][id] = p[op][id] || { acciones: {}, registros: [] }; return { p: p, m: p[op][id] }; }
  function marcarAccion(op, id, idx, hecho) {
    var x = mod(op, id);
    if (hecho) x.m.acciones[idx] = Date.now(); else delete x.m.acciones[idx];
    lsSet(LS_PREP, x.p);
  }
  function registrarManual(op, id, texto) {
    texto = String(texto || "").trim().slice(0, 200);
    if (!texto) return false;
    var x = mod(op, id);
    x.m.registros.push({ ts: Date.now(), texto: texto });
    if (x.m.registros.length > 100) x.m.registros.shift();
    lsSet(LS_PREP, x.p);
    return true;
  }
  function estadoModulo(op, m) {
    var x = ((prep()[op] || {})[m.id]) || { acciones: {}, registros: [] };
    var hechas = (m.acciones || []).filter(function (_, i) { return x.acciones[i]; }).length;
    return { tipo: m.tipo, hechas: hechas, total: (m.acciones || []).length, registros: x.registros.slice(-5).reverse(), acciones: x.acciones };
  }

  // ---- Calendario del perfil: próximos hitos con días restantes ----
  function proximos(perfil, ahora) {
    var hoyD = new Date(ahora || Date.now()); hoyD.setHours(0, 0, 0, 0);
    return ((perfil && perfil.calendario) || []).map(function (c) {
      return { fecha: c.fecha, hito: c.hito, caracter: c.caracter, fuente: c.fuente, dias: Math.round((new Date(c.fecha + "T00:00:00") - hoyD) / 864e5) };
    }).filter(function (c) { return c.dias >= 0; }).sort(function (a, b) { return a.dias - b.dias; });
  }

  window.TLMotor = { hoy: hoy, marcarAccion: marcarAccion, registrarManual: registrarManual, estadoModulo: estadoModulo, proximos: proximos,
    MIN_POR_PREGUNTA: MIN_POR_PREGUNTA, REPARTO: REPARTO };
})();
