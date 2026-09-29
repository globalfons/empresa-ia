// Plan de estudio adaptativo. Algoritmo determinista y explicable (no es IA):
// prioriza los temas con menos dominio y más fallos, reparte el tiempo disponible y se recalcula con cada visita.
(function () {
  var MIN_POR_PREGUNTA = 1.5; // responder + leer la cita del BOE (estimación de TestLey)
  function diasHasta(f) { if (!f) return null; var d = Math.ceil((new Date(f + "T09:00:00") - new Date()) / 864e5); return isNaN(d) ? null : d; }

  // s = TL.stats(op, data); data = datos de la oposición; aj = TL.ajustes(); sim = config del simulacro
  function generar(s, data, aj, sim, estado) {
    var dias = diasHasta(aj.fechaExamen);
    var diasDisp = (aj.dias && aj.dias.length ? aj.dias : [0, 1, 2, 3, 4, 5, 6]).map(Number); // días de la semana disponibles (0 = domingo)
    var minDia = Math.max(10, Math.round(((+aj.horasSemana || 6) * 60) / diasDisp.length));
    var pregDia = Math.max(5, Math.floor(minDia / MIN_POR_PREGUNTA));
    var temas = (s.porTema || []).filter(function (x) { return x.cubierto; }).map(function (x) {
      var n = 0, fall = 0, nuevas = 0;
      data.qs.forEach(function (q) {
        if (q.tm ? q.tm.indexOf(x.t.i) < 0 : x.t.leyes.indexOf(q.ley) < 0) return;
        n++; var e = estado(q.ley, q.id); if (e === "fallada") fall++; if (e === "nueva") nuevas++;
      });
      var urg = dias !== null && dias < 21 ? 2 : 1;
      return { t: x.t, pct: x.pct, n: n, fall: fall, nuevas: nuevas, prio: ((100 - x.pct) / 100) * Math.log(1 + n) + urg * (fall / Math.max(1, n)) * 2 };
    }).sort(function (a, b) { return b.prio - a.prio; });
    var pendientes = s.total - s.cuenta.dominada;
    var diasNecesarios = Math.ceil((pendientes * 2) / pregDia); // cada pregunta se acierta 2 veces para dominarla
    var ritmo = dias === null ? null : dias <= 0 ? "pasado" : diasNecesarios <= dias ? "ok" : "corto";
    var horasNecesarias = dias && dias > 0 ? Math.ceil(((pendientes * 2 * MIN_POR_PREGUNTA) / dias) * 7 / 60) : null;
    var cadaSim = aj.nivel === "empiezo" ? 7 : aj.nivel === "avanzado" ? 3 : 5;
    if (dias !== null && dias <= 14) cadaSim = Math.min(cadaSim, 3);
    var fallosTot = s.cuenta.fallada, semana = [], ti = 0;
    var estudiados = {}, rutaOp = aj._rutaOp || "";
    for (var d = 0; d < 7; d++) {
      var tareas = [], cupo = pregDia, fechaD = new Date(Date.now() + d * 864e5);
      if (dias !== null && d >= dias) break;
      if (diasDisp.indexOf(fechaD.getDay()) < 0) { semana.push({ fecha: fechaD, tareas: [], descanso: true }); continue; }
      // Estudio del texto oficial antes de practicar un tema que aún no has trabajado (≥ 60 % de sus preguntas sin ver)
      var nuevoTema = temas.filter(function (t) { return !estudiados[t.t.i] && t.n && t.nuevas / t.n >= 0.6; })[0];
      if (nuevoTema && cupo > 10) {
        estudiados[nuevoTema.t.i] = 1;
        tareas.push({ tipo: "estudio", txt: "Estudiar el tema " + nuevoTema.t.n + " (texto oficial)", det: nuevoTema.t.t, min: 20, url: rutaOp ? rutaOp + "tema-" + (nuevoTema.t.i + 1) + "/#estudiar" : null, ancla: "tema-" + nuevoTema.t.i });
        cupo -= Math.round(20 / MIN_POR_PREGUNTA);
      }
      if (d % cadaSim === cadaSim - 1 && s.respuestas >= 30 && sim) {
        tareas.push({ tipo: "simulacro", txt: "Simulacro: " + Math.min(sim.preguntas, s.total) + " preguntas en " + sim.minutos + " min", ancla: "simulacro" });
        cupo -= Math.min(sim.preguntas, s.total);
      }
      if (cupo > 0 && fallosTot > 0) {
        var r = Math.min(fallosTot, Math.ceil(cupo * 0.35));
        tareas.push({ tipo: "fallos", txt: "Repasar " + r + " fallos", ancla: "fallos" }); cupo -= r;
      }
      var guard = 0;
      while (cupo > 0 && temas.length && guard++ < temas.length) {
        var t = temas[ti % temas.length]; ti++;
        var k = Math.min(cupo, 20);
        var dup = (s.porTema || []).filter(function (x) { return x.t.n === t.t.n; }).length > 1;
        tareas.push({ tipo: "tema", txt: (dup ? "Bloque " + t.t.b.split(/[.)]/)[0] + " · " : "") + "Tema " + t.t.n + ": " + k + " preguntas", det: t.t.t, pct: t.pct, ancla: "tema-" + t.t.i });
        cupo -= k;
      }
      if (!temas.length && cupo > 0) tareas.push({ tipo: "repaso", txt: "Repaso inteligente de " + Math.min(cupo, 20) + " preguntas", ancla: "repaso" });
      semana.push({ fecha: fechaD, tareas: tareas });
    }
    return { dias: dias, minDia: minDia, pregDia: pregDia, ritmo: ritmo, diasNecesarios: diasNecesarios, horasNecesarias: horasNecesarias,
             pendientes: pendientes, prioridades: temas.slice(0, 5), semana: semana, minPorPregunta: MIN_POR_PREGUNTA };
  }
  window.TLPlan = { generar: generar, diasHasta: diasHasta };
})();
