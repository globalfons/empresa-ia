// Aptitude Engine (Mossos 360 · Fase 1): ejercicios aptitudinales ORIGINALES de TestLey, genéricos para cualquier oposición.
// Cada ejercicio sale de un generador determinista (semilla → mismo ejercicio) que CALCULA su solución; verificar() la recalcula
// y comprueba que hay exactamente una opción correcta y que las opciones son distintas. Nada se copia de material comercial.
// Esquema AptitudeExercise: id, opposition_id, category, subtype, difficulty, prompt, stimulus, options, correct_answer,
// explanation, estimated_time, source_type, source_reference, verification_status, generator, created_at.
// Las sesiones, resultados y progreso los guarda TLPsico (psicotecnicos.js): aquí solo se generan y se eligen ejercicios.
(function () {
  var GEN = "testley-aptitud-v1";
  var CATEGORIAS = ["verbal", "numerico", "abstracto", "espacial", "perceptivo"];
  var SUBTIPOS = { numerico: ["serie", "porcentaje", "proporcion"], abstracto: ["serie_figuras"], espacial: ["rotacion"],
    perceptivo: ["pares_identicos", "contar_simbolo"], verbal: ["serie_letras", "orden_alfabetico", "anagrama", "codificacion"] };
  // Verbal: solo formatos con respuesta verificable por cálculo (letras, orden, anagramas, codificación). Los formatos semánticos
  // (vocabulario, sinónimos, antónimos, analogías, comprensión) necesitan criterio lingüístico humano: banco aparte en revisión
  // (catalogo/aptitud/verbal-semantica-<oposición>.json, HUMAN_REVIEW), nunca generado ni servido automáticamente.
  var SEG_OFICIAL = Math.round((35 * 60) / 80); // ritmo de la subprueba oficial de Mossos: 80 preguntas en 35 min
  var T = {
    ca: { serie: "Quin nombre continua la sèrie?", pct: function (p, n) { return "Quant és el " + p + " % de " + n + "?"; },
      prop: function (a, b, c) { return "Si " + a + " unitats costen " + b + " €, quant costen " + c + " unitats?"; },
      fig: "Quina figura continua la sèrie?", rot: function (g) { return "Quina figura és la de l'esquerra girada " + g + "° en sentit horari?"; },
      pares: "Quantes parelles són exactament iguals?", contar: function (s) { return "Quantes vegades apareix el símbol «" + s + "»?"; },
      letras: "Quina lletra continua la sèrie?", orden: function (p) { return "Si ordenes alfabèticament aquestes paraules, quina queda en la posició " + p + "?"; },
      anagrama: function (w) { return "Quina opció té exactament les mateixes lletres que «" + w + "», en un altre ordre?"; },
      codigo: function (a, b, w) { return "Si «" + a + "» es codifica com «" + b + "», com es codifica «" + w + "»?"; } },
    es: { serie: "¿Qué número continúa la serie?", pct: function (p, n) { return "¿Cuánto es el " + p + " % de " + n + "?"; },
      prop: function (a, b, c) { return "Si " + a + " unidades cuestan " + b + " €, ¿cuánto cuestan " + c + " unidades?"; },
      fig: "¿Qué figura continúa la serie?", rot: function (g) { return "¿Qué figura es la de la izquierda girada " + g + "° en sentido horario?"; },
      pares: "¿Cuántas parejas son exactamente iguales?", contar: function (s) { return "¿Cuántas veces aparece el símbolo «" + s + "»?"; },
      letras: "¿Qué letra continúa la serie?", orden: function (p) { return "Si ordenas alfabéticamente estas palabras, ¿cuál queda en la posición " + p + "?"; },
      anagrama: function (w) { return "¿Qué opción tiene exactamente las mismas letras que «" + w + "», en otro orden?"; },
      codigo: function (a, b, w) { return "Si «" + a + "» se codifica como «" + b + "», ¿cómo se codifica «" + w + "»?"; } },
  };
  // Léxico neutro sin acentos (el orden alfabético no depende de reglas de colación)
  var PALABRAS = ["arbre", "barca", "camisa", "dona", "escala", "farola", "gat", "hora", "illa", "llapis", "mapa", "nota", "ocell", "porta",
    "rellotge", "sabata", "taula", "unitat", "vaixell", "xarxa", "zona", "bossa", "cadira", "dit", "finestra", "got", "llibre", "mur", "nas",
    "olla", "pont", "roda", "sal", "torre", "vent", "barri", "carrer", "plaça", "pis"].filter(function (w) { return /^[a-z]+$/.test(w); });
  var ABC = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

  // PRNG determinista (mulberry32)
  function rng(semilla) {
    var a = semilla >>> 0;
    return function () { a = (a + 0x6d2b79f5) >>> 0; var t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  function ent(r, a, b) { return a + Math.floor(r() * (b - a + 1)); }
  function elegir(r, xs) { return xs[Math.floor(r() * xs.length)]; }
  function barajar(r, xs) { xs = xs.slice(); for (var i = xs.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)); var t = xs[i]; xs[i] = xs[j]; xs[j] = t; } return xs; }
  // 4 opciones: la correcta + 3 distractores distintos entre sí y de la correcta (claves de texto)
  function opciones(r, correcta, candidatos) {
    var vistos = {}, out = [correcta];
    vistos[JSON.stringify(correcta)] = 1;
    candidatos.forEach(function (c) { var k = JSON.stringify(c); if (out.length < 4 && !vistos[k]) { vistos[k] = 1; out.push(c); } });
    if (out.length < 4) return null;
    out = barajar(r, out);
    return { o: out, a: out.map(JSON.stringify).indexOf(JSON.stringify(correcta)) };
  }

  // ---------- numérico ----------
  function gNumerico(r, sub, dif, t) {
    if (sub === "serie") {
      var x = ent(r, 2, 20), n = [], tipo = dif === 1 ? "arit" : dif === 2 ? elegir(r, ["geo", "alt"]) : elegir(r, ["cuad", "dif"]);
      if (tipo === "arit") { var d = ent(r, 2, 9) * (r() < 0.25 ? -1 : 1); x = x + 40; for (var i = 0; i < 6; i++) n.push(x + i * d); }
      if (tipo === "geo") { var k = ent(r, 2, 4); x = ent(r, 1, 9); for (i = 0; i < 6; i++) n.push(x * Math.pow(k, i)); }
      if (tipo === "alt") { var d1 = ent(r, 2, 6), d2 = ent(r, 7, 12); n.push(x); for (i = 1; i < 6; i++) n.push(n[i - 1] + (i % 2 ? d1 : -d1 + d2)); }
      if (tipo === "cuad") { var b = ent(r, 1, 5); for (i = 0; i < 6; i++) n.push((b + i) * (b + i) + ent(r, 0, 0)); }
      if (tipo === "dif") { var p = ent(r, 1, 4), s = ent(r, 1, 3); n.push(x); for (i = 1; i < 6; i++) n.push(n[i - 1] + p + s * (i - 1)); }
      var ok = n[5], op = opciones(r, ok, [ok + 1, ok - 1, ok + 2, ok - 2, n[4] + (n[5] - n[4]) * 2, ok + 10]);
      return op && { prompt: t.serie, stimulus: { tipo: "texto", texto: n.slice(0, 5).join(" · ") + " · ?" }, options: op.o.map(String), a: op.a,
        explanation: "Regla: " + { arit: "suma constante de " + (n[1] - n[0]), geo: "cada término se multiplica por " + n[1] / n[0], alt: "se alternan dos incrementos", cuad: "cuadrados consecutivos", dif: "las diferencias crecen de forma constante" }[tipo] + ". El siguiente es " + ok + "." };
    }
    if (sub === "porcentaje") {
      var pc = elegir(r, dif === 1 ? [10, 20, 25, 50] : dif === 2 ? [5, 15, 30, 40, 75] : [12, 35, 45, 60, 85]), base = ent(r, 2, 40) * (dif === 3 ? 20 : 20);
      var res = (pc * base) / 100;
      if (res !== Math.round(res)) return null;
      var op2 = opciones(r, res, [res + base / 10, res - base / 10, (pc + 5) * base / 100, (pc - 5) * base / 100, res * 2].filter(function (v) { return v > 0 && v === Math.round(v); }));
      return op2 && { prompt: t.pct(pc, base), stimulus: null, options: op2.o.map(String), a: op2.a, explanation: pc + " % de " + base + " = " + pc + " × " + base + " / 100 = " + res + "." };
    }
    var u = ent(r, 2, 9), pu = ent(r, 2, dif === 3 ? 25 : 12), c = ent(r, 2, 15);
    if (c === u) c++;
    var tot = u * pu, sol = c * pu;
    var op3 = opciones(r, sol, [sol + pu, sol - pu, c * (pu + 1), tot + c, sol + 2 * pu].filter(function (v) { return v > 0; }));
    return op3 && { prompt: t.prop(u, tot, c), stimulus: null, options: op3.o.map(String), a: op3.a,
      explanation: "Una unidad cuesta " + tot + " / " + u + " = " + pu + " €; " + c + " unidades: " + c + " × " + pu + " = " + sol + " €." };
  }

  // ---------- abstracto: figura asimétrica = marco + flecha orientada + puntos + relleno ----------
  var MARCOS = ["circulo", "cuadrado", "triangulo"];
  function gAbstracto(r, sub, dif, t) {
    var f0 = { m: ent(r, 0, 2), g: ent(r, 0, 7) * 45, p: ent(r, 0, 2), r: ent(r, 0, 1) };
    var paso = { g: elegir(r, [45, 90, -45]), p: dif >= 2 ? 1 : 0, r: dif >= 3 ? 1 : 0, m: 0 };
    function fig(i) { return { m: f0.m, g: ((f0.g + paso.g * i) % 360 + 360) % 360, p: (f0.p + paso.p * i) % 5, r: (f0.r + paso.r * i) % 2 }; }
    var serie = [fig(0), fig(1), fig(2), fig(3)], ok = fig(4);
    var cand = [{ m: ok.m, g: (ok.g + 90) % 360, p: ok.p, r: ok.r }, { m: ok.m, g: ok.g, p: (ok.p + 1) % 5, r: ok.r }, { m: ok.m, g: ok.g, p: ok.p, r: 1 - ok.r },
      { m: (ok.m + 1) % 3, g: ok.g, p: ok.p, r: ok.r }, { m: ok.m, g: (ok.g + 180) % 360, p: ok.p, r: ok.r }, fig(3)];
    var op = opciones(r, ok, cand);
    return op && { prompt: t.fig, stimulus: { tipo: "figuras", figuras: serie }, options: op.o, a: op.a, opciones_tipo: "figura",
      explanation: "La flecha gira " + paso.g + "° en cada paso" + (paso.p ? ", se añade un punto" : "") + (paso.r ? " y el relleno se alterna" : "") + "." };
  }

  // ---------- espacial: patrón asimétrico en cuadrícula; opciones = rotaciones y reflejos ----------
  function rot90(g) { var n = g.length, o = []; for (var i = 0; i < n; i++) { o.push([]); for (var j = 0; j < n; j++) o[i].push(g[n - 1 - j][i]); } return o; }
  function refl(g) { return g.map(function (f) { return f.slice().reverse(); }); }
  function rotar(g, veces) { for (var i = 0; i < veces; i++) g = rot90(g); return g; }
  function transformaciones(g) { var out = []; for (var k = 0; k < 4; k++) { out.push(rotar(g, k)); out.push(refl(rotar(g, k))); } return out; }
  function gEspacial(r, sub, dif, t) {
    var n = dif === 1 ? 3 : 4, celdas = dif === 3 ? 7 : dif === 2 ? 6 : 4, g;
    for (var intento = 0; intento < 50; intento++) {
      g = []; for (var i = 0; i < n; i++) { g.push([]); for (var j = 0; j < n; j++) g[i].push(0); }
      barajar(r, Array.apply(null, Array(n * n)).map(function (_, k) { return k; })).slice(0, celdas).forEach(function (k) { g[Math.floor(k / n)][k % n] = 1; });
      var ts = transformaciones(g).map(JSON.stringify);
      if (ts.filter(function (x, k) { return ts.indexOf(x) === k; }).length === 8) break; // las 8 transformaciones son distintas
      g = null;
    }
    if (!g) return null;
    var veces = ent(r, 1, 3), ok = rotar(g, veces);
    var op = opciones(r, ok, [refl(ok), rotar(g, (veces + 1) % 4 || 2), refl(rotar(g, (veces + 2) % 4)), refl(g), rotar(g, (veces + 2) % 4)]);
    return op && { prompt: t.rot(veces * 90), stimulus: { tipo: "cuadricula", cuadricula: g }, options: op.o, a: op.a, opciones_tipo: "cuadricula",
      explanation: "Girar " + veces * 90 + "° en sentido horario conserva la figura sin reflejarla; las demás opciones son reflejos u otros giros." };
  }

  // ---------- perceptivo ----------
  var PAREJAS = [["O", "0"], ["l", "1"], ["S", "5"], ["B", "8"], ["Z", "2"], ["G", "6"], ["I", "1"], ["E", "F"]];
  function codigo(r, len) { var s = ""; var abc = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; for (var i = 0; i < len; i++) s += abc[ent(r, 0, abc.length - 1)]; return s; }
  function gPerceptivo(r, sub, dif, t) {
    if (sub === "pares_identicos") {
      var len = 4 + dif * 2, pares = [], iguales = 0;
      for (var i = 0; i < 5; i++) {
        var a = codigo(r, len), b = a;
        if (r() < 0.5) {
          var pos = ent(r, 0, len - 1), par = elegir(r, PAREJAS), nuevo = a[pos] === par[0] ? par[1] : par[0];
          b = a.slice(0, pos) + nuevo + a.slice(pos + 1);
        }
        if (a === b) iguales++;
        pares.push([a, b]);
      }
      var op = opciones(r, String(iguales), ["0", "1", "2", "3", "4", "5"].filter(function (x) { return x !== String(iguales); }).sort(function (x, y) { return Math.abs(+x - iguales) - Math.abs(+y - iguales); }));
      return op && { prompt: t.pares, stimulus: { tipo: "pares", pares: pares }, options: op.o, a: op.a,
        explanation: iguales + " parejas son idénticas carácter a carácter; en las demás cambia un carácter parecido (por ejemplo O/0 o S/5)." };
    }
    var sim = elegir(r, ["#", "@", "%", "&", "$"]), otros = ["#", "@", "%", "&", "$", "*", "+"].filter(function (x) { return x !== sim; });
    var largo = 20 + dif * 12, cad = "", n = 0;
    for (i = 0; i < largo; i++) { var c = r() < 0.22 ? sim : elegir(r, otros); if (c === sim) n++; cad += c; }
    var op2 = opciones(r, String(n), [n + 1, n - 1, n + 2, n - 2].filter(function (v) { return v >= 0; }).map(String));
    return op2 && { prompt: t.contar(sim), stimulus: { tipo: "texto", texto: cad.match(/.{1,10}/g).join(" ") }, options: op2.o, a: op2.a,
      explanation: "El símbolo «" + sim + "» aparece " + n + " veces." };
  }

  // ---------- verbal (formal, verificable por cálculo) ----------
  function gVerbal(r, sub, dif, t) {
    if (sub === "serie_letras") {
      var pasos = dif === 1 ? [ent(r, 1, 4)] : dif === 2 ? [ent(r, 1, 3), ent(r, 2, 5)] : [ent(r, 1, 2), ent(r, 2, 3), ent(r, 3, 4)], d = [];
      for (var i = 0; i < 5; i++) d.push(pasos[i % pasos.length]);
      var total = d.reduce(function (a, b) { return a + b; }, 0), x = ent(r, 0, ABC.length - 1 - total), s = [x], baja = r() < 0.4;
      for (i = 1; i < 6; i++) s.push(s[i - 1] + d[i - 1]);
      if (baja) { s = s.map(function (k) { return ABC.length - 1 - k; }); }
      var ok = ABC[s[5]], cand = [s[5] + 1, s[5] - 1, s[5] + 2, s[5] - 2].filter(function (k) { return k >= 0 && k < ABC.length; }).map(function (k) { return ABC[k]; });
      var op = opciones(r, ok, cand);
      return op && { prompt: t.letras, stimulus: { tipo: "texto", texto: s.slice(0, 5).map(function (k) { return ABC[k]; }).join(" · ") + " · ?" }, options: op.o, a: op.a,
        explanation: "Los saltos en el abecedario (26 letras, sin Ñ ni Ç) son de " + pasos.join(", ") + (pasos.length > 1 ? " de forma cíclica" : "") + (baja ? ", hacia atrás" : "") + ". Sigue la " + ok + "." };
    }
    if (sub === "anagrama") {
      // Cadena de letras al azar (no depende de una lista de palabras: variedad ilimitada y sin juicio léxico).
      // Correcta: una permutación de la cadena. Distractores: permutaciones con una letra cambiada (otro multiconjunto de letras).
      var lon = dif === 1 ? [4, 4] : dif === 2 ? [5, 6] : [7, 8], w = "";
      for (var li = ent(r, lon[0], lon[1]); w.length < li;) w += ABC[ent(r, 0, 25)];
      var clave = w.split("").sort().join(""), ok3 = w, n = 0;
      while ((ok3 === w) && n++ < 20) ok3 = barajar(r, w.split("")).join("");
      var dist = [];
      for (var q = 0; q < 30 && dist.length < 6; q++) {
        var p = w.split(""), j = ent(r, 0, p.length - 1), nl = ABC[ent(r, 0, 25)];
        if (nl === p[j]) continue;
        p[j] = nl;
        var dd = barajar(r, p).join("");
        if (dd.split("").sort().join("") !== clave) dist.push(dd);
      }
      var op3 = ok3 !== w && opciones(r, ok3, dist);
      return op3 && { prompt: t.anagrama(w), stimulus: { tipo: "texto", texto: w }, options: op3.o, a: op3.a,
        explanation: "«" + ok3 + "» usa exactamente las letras de «" + w + "» (" + clave.split("").join(" ") + "); las demás cambian alguna letra." };
    }
    if (sub === "codificacion") {
      // Desplazamiento fijo en el abecedario de 26 letras (dif. 3: desplazamientos alternos); distractores con otro desplazamiento o una letra mal
      var sh = dif === 1 ? [1] : dif === 2 ? [elegir(r, [2, 3, -1, -2])] : [ent(r, 1, 3), -ent(r, 1, 3)];
      var enc = function (x, d) { return x.split("").map(function (c, i) { return ABC[(ABC.indexOf(c) + d[i % d.length] + 26) % 26]; }).join(""); };
      var cort = PALABRAS.filter(function (x) { return x.length >= 3 && x.length <= 7; }), pw = barajar(r, cort);
      var ej = pw[0].toUpperCase(), wq = pw[1].toUpperCase(), ok4 = enc(wq, sh);
      var mal = ok4.split(""), mj = ent(r, 0, mal.length - 1); mal[mj] = ABC[(ABC.indexOf(mal[mj]) + 1) % 26];
      var op4 = opciones(r, ok4, [enc(wq, sh.map(function (d) { return d + 1; })), enc(wq, sh.map(function (d) { return d - 1; })), mal.join(""), enc(wq, sh.map(function (d) { return -d; }))]);
      return op4 && { prompt: t.codigo(ej, enc(ej, sh), wq), stimulus: { tipo: "texto", texto: ej + " → " + enc(ej, sh) }, options: op4.o, a: op4.a,
        explanation: "Cada letra se desplaza " + sh.map(function (d) { return (d > 0 ? "+" : "") + d; }).join(" y ") + (sh.length > 1 ? " posiciones de forma alterna" : " posiciones") + " en el abecedario (26 letras, cíclico): «" + wq + "» → «" + ok4 + "»." };
    }
    var k = 3 + dif, ws = barajar(r, PALABRAS).slice(0, k + 1), pos = ent(r, 2, k), orden = ws.slice().sort();
    var ok2 = orden[pos - 1], op2 = opciones(r, ok2, barajar(r, ws.filter(function (w) { return w !== ok2; })));
    return op2 && { prompt: t.orden(pos), stimulus: { tipo: "texto", texto: ws.join(", ") }, options: op2.o, a: op2.a, explanation: "Orden alfabético: " + orden.join(", ") + "." };
  }

  var GENERADORES = { numerico: gNumerico, abstracto: gAbstracto, espacial: gEspacial, perceptivo: gPerceptivo, verbal: gVerbal };
  var TIEMPO = { numerico: 40, abstracto: 30, espacial: 35, perceptivo: 30, verbal: 25 };

  // Ejercicio determinista: misma (categoría, subtipo, dificultad, semilla) → mismo ejercicio. Si una semilla no da un
  // ejercicio válido (opciones insuficientes), prueba la siguiente; la semilla final queda en el id.
  function ejercicio(cat, sub, dif, semilla, op, idioma) {
    if (!GENERADORES[cat] || SUBTIPOS[cat].indexOf(sub) < 0 || [1, 2, 3].indexOf(dif) < 0) throw new Error("ejercicio desconocido " + cat + "/" + sub + "/" + dif);
    var t = T[idioma] || T.es;
    for (var s = semilla >>> 0, i = 0; i < 20; i++, s = (s + 7919) >>> 0) {
      var x = GENERADORES[cat](rng(s * 31 + dif * 7 + sub.length), sub, dif, t);
      if (x) return { id: "apt-" + cat + "-" + sub + "-d" + dif + "-" + s, opposition_id: op || null, category: cat, subtype: sub, difficulty: dif,
        prompt: x.prompt, stimulus: x.stimulus, options: x.options, options_type: x.opciones_tipo || "texto", correct_answer: x.a, explanation: x.explanation,
        estimated_time: TIEMPO[cat], source_type: "TESTLEY_GENERATED", source_reference: GEN + " · " + cat + "/" + sub + " · semilla " + s,
        verification_status: "VERIFIED_BY_COMPUTATION", generator: GEN, created_at: null, idioma: idioma || "es" };
    }
    throw new Error("sin ejercicio válido para " + cat + "/" + sub);
  }

  // Recalcula el ejercicio desde su id y comprueba unicidad y solubilidad. [] = válido.
  function verificar(e) {
    var p = [], m = /^apt-([a-z]+)-([a-z_]+)-d([123])-(\d+)$/.exec(e && e.id || "");
    if (!m) return ["id no reproducible"];
    var again = ejercicio(m[1], m[2], +m[3], +m[4], e.opposition_id, e.idioma);
    if (again.id !== e.id || JSON.stringify(again.options) !== JSON.stringify(e.options) || again.correct_answer !== e.correct_answer) p.push("no coincide con su generador");
    var ks = (e.options || []).map(JSON.stringify);
    if (ks.length !== 4 || ks.some(function (k, i) { return ks.indexOf(k) !== i; })) p.push("opciones repetidas o distintas de 4");
    if (!(e.correct_answer >= 0 && e.correct_answer < 4)) p.push("respuesta fuera de rango");
    if (e.source_type !== "TESTLEY_GENERATED" || e.reproduccion_oficial) p.push("un ejercicio de TestLey no puede presentarse como oficial");
    if (e.subtype === "anagrama") {
      var ord = function (x) { return String(x).split("").sort().join(""); }, base = ord(e.stimulus.texto);
      var ana = (e.options || []).filter(function (o) { return ord(o) === base && o !== e.stimulus.texto; });
      if (ana.length !== 1 || ord(e.options[e.correct_answer]) !== base) p.push("el anagrama no es único");
    }
    if (e.category === "espacial") {
      var g = e.stimulus.cuadricula, giradas = [1, 2, 3].map(function (v) { return JSON.stringify(rotar(g, v)); });
      var correctas = ks.filter(function (k) { return giradas.indexOf(k) >= 0 && k === JSON.stringify(rotar(g, (+e.prompt.match(/(\d+)°/)[1]) / 90)); });
      if (correctas.length !== 1) p.push("la rotación pedida no es única");
    }
    return p;
  }

  // Item para TLPsico (sesión/resultado/progreso). La categoría «perceptivo» es «percepcion» en el catálogo de psicotécnicos.
  function item(e) { return { id: e.id, categoria: e.category === "perceptivo" ? "percepcion" : e.category, subtipo: e.subtype, dif: e.difficulty, procedencia: "TESTLEY_GENERATED", q: e.prompt, o: e.options, a: e.correct_answer, ej: e }; }

  // Selección por modo: categoria | dificultad | mixto | contrarreloj | adaptativo (el adaptativo elige uno a uno con siguiente()).
  function lote(conf) {
    conf = conf || {};
    var n = conf.n || 10, semilla = conf.semilla != null ? conf.semilla : Date.now() % 1e9, r = rng(semilla), out = [];
    var cats = conf.categoria ? [conf.categoria] : (conf.categorias || CATEGORIAS);
    for (var i = 0; i < n; i++) {
      var c = cats[i % cats.length], sub = elegir(r, SUBTIPOS[c]), dif = conf.dificultad || (conf.modo === "mixto" ? ent(r, 1, 3) : 2);
      out.push(ejercicio(c, sub, dif, ent(r, 1, 1e9), conf.oposicion, conf.idioma));
    }
    return { items: barajar(r, out), segundos: conf.modo === "contrarreloj" ? n * SEG_OFICIAL : null };
  }

  // Adaptativo (regla explicable): sube de dificultad tras 2 aciertos seguidos en la categoría, baja tras un fallo;
  // la categoría siguiente es la de menor acierto (las que no tienen datos van primero).
  function siguiente(estado, conf) {
    estado.cat = estado.cat || {};
    var cats = conf.categorias || CATEGORIAS;
    var pend = cats.filter(function (c) { return !estado.cat[c]; });
    var c = pend.length ? pend[0] : cats.slice().sort(function (a, b) { var x = estado.cat[a], y = estado.cat[b]; return x.ok / x.n - y.ok / y.n || x.n - y.n; })[0];
    var s = estado.cat[c] || { n: 0, ok: 0, dif: 1, racha: 0 };
    var r = rng((estado.paso = (estado.paso || 0) + 1) * 977 + (conf.semilla || 1));
    return ejercicio(c, elegir(r, SUBTIPOS[c]), s.dif, ent(r, 1, 1e9), conf.oposicion, conf.idioma);
  }
  function registrar(estado, e, acierto) {
    estado.cat = estado.cat || {};
    var s = (estado.cat[e.category] = estado.cat[e.category] || { n: 0, ok: 0, dif: 1, racha: 0 });
    s.n++; if (acierto) { s.ok++; s.racha++; } else s.racha = 0;
    if (acierto && s.racha >= 2 && s.dif < 3) { s.dif++; s.racha = 0; }
    if (!acierto && s.dif > 1) s.dif--;
    return s;
  }

  window.TLAptitud = { CATEGORIAS: CATEGORIAS, SUBTIPOS: SUBTIPOS, SEG_OFICIAL: SEG_OFICIAL, ejercicio: ejercicio, verificar: verificar, item: item,
    lote: lote, siguiente: siguiente, registrar: registrar, _rotar: rotar, _refl: refl };
})();
