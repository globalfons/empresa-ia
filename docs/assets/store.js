// TestLey — progreso, estadísticas, cuenta (Supabase opcional) y cabecera.
// window.TL_CONFIG = { supabaseUrl, supabaseAnonKey, root } lo inyecta build.mjs.
(function () {
  var CFG = window.TL_CONFIG || {};
  var ONLINE = !!(CFG.supabaseUrl && CFG.supabaseAnonKey);
  var LS_PROG = "testley:progreso:v2";
  var LS_SES = "testley:sesion";

  function lsGet(k, d) { try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function hoy(ts) { var d = new Date(ts || Date.now()); return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate(); }

  // ---------------- Progreso local ----------------
  // prog[ley] = { q: {qid: [aciertos, fallos, rachaPregunta, ultimoTs, ultimoFalloTs]}, ses: [[ts, n, ok, ko, blank]], dias: ["2026-9-27", ...] }
  function migrarAntiguo(p) {
    var viejo = lsGet("testley:l39", null);
    if (!viejo || p["ley-39-2015"]) return p;
    p["ley-39-2015"] = { q: {}, ses: [], dias: [] };
    Object.keys(viejo.fallos || {}).forEach(function (id) { p["ley-39-2015"].q[id] = [0, 1, 0, Date.now()]; });
    return p;
  }
  var prog = migrarAntiguo(lsGet(LS_PROG, {}));

  function ley(l) { return prog[l] || (prog[l] = { q: {}, ses: [], dias: [] }); }

  var syncTimer = null;
  function guardar(l) {
    lsSet(LS_PROG, prog);
    if (ONLINE && sesion()) { clearTimeout(syncTimer); syncTimer = setTimeout(function () { subir(l); }, 1500); }
  }

  // l = ley de la pregunta (donde se guarda su estado); ctx = oposición o ley desde la que se estudia
  function marcarDia(p) { var d = hoy(); if (p.dias.indexOf(d) < 0) { p.dias.push(d); if (p.dias.length > 400) p.dias.shift(); } }
  function registrarRespuesta(l, qid, correcta, ctx) {
    var p = ley(l), r = p.q[qid] || [0, 0, 0, 0];
    if (correcta) { r[0]++; r[2] = Math.max(1, r[2] + 1); } else { r[1]++; r[2] = 0; r[4] = Date.now(); } // r[4]: última vez fallada
    r[3] = Date.now();
    p.q[qid] = r;
    marcarDia(p);
    guardar(l);
    if (ctx && ctx !== l) { marcarDia(ley(ctx)); guardar(ctx); }
  }
  // Tipos de sesión normalizados (Mossos 360 · F11) a partir del modo del motor de test
  var TIPOS_SESION = { medida: "CUSTOM", tema: "TRAINING", art: "TRAINING", favoritas: "CUSTOM", fallos: "WEAKNESS", repaso: "REVIEW",
    simulacro: "SIMULATION", examen: "SIMULATION", oficial: "OFFICIAL_EXAM", rapido: "QUICK_TEST", muestra: "QUICK_TEST" };
  function esOpo(id) { return (CFG.opos || []).indexOf(id) >= 0; }
  function tipoSesion(modo) { return TIPOS_SESION[modo] || "CUSTOM"; }
  // Sesión: [ts, preguntas, aciertos, errores, en blanco, modo, penalización, segundos, detalle]
  // detalle (opcional) = { tipo, inicio, fin, oposicion, temas: {i: n}, dificultad: {1: n…}, nota }
  function registrarSesion(l, n, ok, ko, blank, modo, pen, segundos, det) {
    var p = ley(l), fin = Date.now(), sg = Math.max(0, Math.round(segundos || 0)), pe = pen == null ? 1 / 3 : pen;
    var d = det || {};
    var detalle = { tipo: tipoSesion(modo), inicio: fin - sg * 1000, fin: fin, oposicion: d.oposicion || (esOpo(l) ? l : null),
      temas: d.temas || {}, dificultad: d.dificultad || {}, nota: n ? Math.round(Math.max(0, ((ok - ko * pe) / n) * 10) * 100) / 100 : 0 };
    p.ses.push([fin, n, ok, ko, blank, modo || "", pe, sg, detalle]);
    if (p.ses.length > 200) p.ses.shift();
    guardar(l);
  }
  // Repetición espaciada (sencilla): tras fallar, repasar ya; con aciertos seguidos el intervalo crece (días).
  var INTERVALOS = [0, 1, 3, 7, 16, 35];
  function proximoRepaso(r) { return r ? r[3] + INTERVALOS[Math.min(r[2], INTERVALOS.length - 1)] * 864e5 : null; }
  function vencida(l, qid, ahora) { var r = ley(l).q[qid]; return !!r && proximoRepaso(r) <= (ahora || Date.now()); }
  function estado(l, qid) {
    var r = ley(l).q[qid];
    if (!r) return "nueva";
    if (r[2] >= 2) return "dominada";
    if (r[2] === 1) return "aprendida";
    return "fallada";
  }

  // ---------------- Estadísticas ----------------
  var PROB = { dominada: 0.95, aprendida: 0.75, fallada: 0.35 };
  var PESO = { dominada: 1, aprendida: 0.6, fallada: 0.15, nueva: 0 };
  function netoPregunta(e) {
    if (e === "nueva") return 0; // se dejaría en blanco
    var p = PROB[e];
    return Math.max(0, p - (1 - p) / 3); // penalización de 1/3 por error
  }
  function estrellas(nota) { return nota >= 9 ? 5 : nota >= 7.5 ? 4 : nota >= 6 ? 3 : nota >= 4 ? 2 : nota >= 2 ? 1 : 0; }

  function racha(dias) {
    if (!dias.length) return 0;
    var set = {}; dias.forEach(function (d) { set[d] = 1; });
    var n = 0, t = Date.now();
    if (!set[hoy(t)]) t -= 86400000; // si hoy aún no ha estudiado, cuenta desde ayer
    while (set[hoy(t)]) { n++; t -= 86400000; }
    return n;
  }

  // data = { arts: {clave: {t, b}}, qs: [{id, ley, art, ...}], temario? }  (l = ley u oposición)
  function stats(l, data) {
    var p = ley(l), porBloque = {}, porArt = {}, porLey = {}, cuenta = { nueva: 0, fallada: 0, aprendida: 0, dominada: 0 };
    var neto = 0, dominio = 0, resp = 0, ac = 0, dias = p.dias.slice();
    data.qs.forEach(function (q) {
      var lq = q.ley || l, e = estado(lq, q.id), b = data.arts[q.art].b, r = ley(lq).q[q.id];
      if (r) { resp += r[0] + r[1]; ac += r[0]; }
      (porLey[lq] = porLey[lq] || { n: 0, dom: 0 }).n++; porLey[lq].dom += PESO[e];
      cuenta[e]++; neto += netoPregunta(e); dominio += PESO[e];
      (porBloque[b] = porBloque[b] || { n: 0, dom: 0, vistas: 0 }).n++;
      porBloque[b].dom += PESO[e]; if (e !== "nueva") porBloque[b].vistas++;
      (porArt[q.art] = porArt[q.art] || { n: 0, dom: 0, fallos: 0 }).n++;
      porArt[q.art].dom += PESO[e]; if (e === "fallada") porArt[q.art].fallos++;
    });
    Object.keys(porLey).forEach(function (k) { if (k !== l) ley(k).dias.forEach(function (d) { if (dias.indexOf(d) < 0) dias.push(d); }); });
    var porTema = null;
    if (data.temario) {
      var porTemaQ = data.temario.map(function () { return { n: 0, dom: 0 }; }), conTm = data.qs.some(function (q) { return q.tm; });
      if (conTm) data.qs.forEach(function (q) { (q.tm || []).forEach(function (i) { if (porTemaQ[i]) { porTemaQ[i].n++; porTemaQ[i].dom += PESO[estado(q.ley || l, q.id)]; } }); });
      porTema = data.temario.map(function (t, i) {
        var n = 0, dom = 0;
        if (conTm) { n = porTemaQ[i].n; dom = porTemaQ[i].dom; }
        else (t.leyes || []).forEach(function (s) { if (porLey[s]) { n += porLey[s].n; dom += porLey[s].dom; } });
        return { t: t, cubierto: n > 0, n: n, pct: n ? Math.round((100 * dom) / n) : 0 };
      });
    }
    var N = data.qs.length || 1;
    var nota = Math.round((neto / N) * 100) / 10;
    return {
      total: data.qs.length, cuenta: cuenta, nota: nota, estrellas: estrellas(nota),
      dominioPct: Math.round((dominio / N) * 100), respuestas: resp, acierto: resp ? Math.round((100 * ac) / resp) : 0,
      racha: racha(dias), diasEstudio: dias.length, sesiones: p.ses.slice(),
      tiempo: p.ses.reduce(function (t, x) { return t + (x[7] || 0); }, 0),
      vencidas: data.qs.filter(function (q) { return vencida(q.ley || l, q.id); }).length,
      porBloque: porBloque, porArt: porArt, porTema: porTema,
    };
  }

  // Simulacros: nota de este frente al anterior y la media (sesión = [ts, n, ok, ko, blank, modo, pen])
  function notaSesion(x) { var pen = x[6] == null ? 1 / 3 : x[6]; return x[1] ? Math.max(0, ((x[2] - x[3] * pen) / x[1]) * 10) : 0; }
  function comparaSimulacros(ses, modo) {
    var sims = ses.filter(function (x) { return x[5] === (modo || "simulacro"); });
    if (!sims.length) return null;
    var ult = notaSesion(sims[sims.length - 1]), prev = sims.length > 1 ? notaSesion(sims[sims.length - 2]) : null;
    var media = sims.reduce(function (t, x) { return t + notaSesion(x); }, 0) / sims.length;
    return { ultima: ult, anterior: prev, diferencia: prev == null ? null : Math.round((ult - prev) * 10) / 10, media: Math.round(media * 10) / 10, n: sims.length };
  }

  // Gamificación moderada: puntos por constancia, precisión y progreso (no por volumen bruto).
  // - constancia: 10 por día estudiado (máx. 7 por semana cuentan) + 5 por día de racha actual
  // - precisión: aciertos de la semana × (acierto semanal ≥ 70 % ? 2 : 1)
  // - progreso: 3 por pregunta dominada
  function puntos(s, ahora) {
    ahora = ahora || Date.now();
    var semana = ahora - 7 * 864e5, ses7 = s.sesiones.filter(function (x) { return x[0] >= semana; });
    var n7 = ses7.reduce(function (t, x) { return t + x[1]; }, 0), ok7 = ses7.reduce(function (t, x) { return t + x[2]; }, 0);
    var dias7 = {}; ses7.forEach(function (x) { dias7[hoy(x[0])] = 1; });
    var constancia = Math.min(7, Object.keys(dias7).length) * 10 + s.racha * 5;
    var precision = ok7 * (n7 && ok7 / n7 >= 0.7 ? 2 : 1);
    var progreso = s.cuenta.dominada * 3;
    var total = constancia + precision + progreso;
    var niveles = [0, 100, 300, 600, 1000, 1600, 2500, 4000];
    var nivel = niveles.filter(function (u) { return total >= u; }).length;
    return { total: total, constancia: constancia, precision: precision, progreso: progreso, nivel: nivel, siguiente: niveles[nivel] || null,
      semana: { dias: Object.keys(dias7).length, preguntas: n7, acierto: n7 ? Math.round((100 * ok7) / n7) : 0 } };
  }
  // Objetivo semanal: días de estudio según las horas declaradas (mín. 3) y precisión ≥ 70 %
  function objetivoSemanal(p, horasSemana) {
    var diasObj = Math.min(7, Math.max(3, Math.round((+horasSemana || 6) / 1.5)));
    return { diasObjetivo: diasObj, dias: p.semana.dias, precision: p.semana.acierto, cumplido: p.semana.dias >= diasObj && p.semana.acierto >= 70 };
  }

  function logros(s) {
    var L = [
      ["🎯", "Primer test", "Completa tu primer test", s.sesiones.length >= 1],
      ["💯", "100 respuestas", "Responde 100 preguntas", s.respuestas >= 100],
      ["🔥", "Racha de 3 días", "Estudia 3 días seguidos", s.racha >= 3],
      ["📅", "Racha de 7 días", "Estudia 7 días seguidos", s.racha >= 7],
      ["🧠", "25 dominadas", "Domina 25 preguntas", s.cuenta.dominada >= 25],
      ["🏅", "Aprobado", "Nota orientativa de 5 o más", s.nota >= 5],
      ["🏆", "Sobresaliente", "Nota orientativa de 9 o más", s.nota >= 9],
      ["📚", "Ley completa vista", "Responde todas las preguntas al menos una vez", s.cuenta.nueva === 0],
    ];
    return L.map(function (x) { return { icono: x[0], nombre: x[1], desc: x[2], ok: !!x[3] }; });
  }

  // ---------------- Supabase (API REST, sin librerías) ----------------
  function sesion() { return lsGet(LS_SES, null); }
  function api(path, opts) {
    opts = opts || {};
    var h = { apikey: CFG.supabaseAnonKey, "Content-Type": "application/json" };
    var s = sesion();
    if (s && !opts.anon) h.Authorization = "Bearer " + s.access_token;
    Object.keys(opts.headers || {}).forEach(function (k) { h[k] = opts.headers[k]; });
    return fetch(CFG.supabaseUrl + path, { method: opts.method || "GET", headers: h, body: opts.body ? JSON.stringify(opts.body) : undefined })
      .then(function (r) {
        return r.text().then(function (t) {
          var j = null; try { j = t ? JSON.parse(t) : null; } catch (e) {}
          if (!r.ok) {
            var msg = (j && (j.msg || j.error_description || j.message || j.error)) || "Error " + r.status;
            var err = new Error(traducir(msg)); err.status = r.status; throw err;
          }
          return j;
        });
      });
  }
  function traducir(m) {
    var T = {
      "Invalid login credentials": "Email o contraseña incorrectos.",
      "User already registered": "Ya existe una cuenta con ese email. Entra con tu contraseña.",
      "Email not confirmed": "Confirma tu email con el enlace que te hemos enviado.",
      "Password should be at least 6 characters.": "La contraseña debe tener al menos 6 caracteres.",
    };
    return T[m] || m;
  }
  function guardarSesion(j) {
    if (!j || !j.access_token) return null;
    var s = { access_token: j.access_token, refresh_token: j.refresh_token, expires_at: Date.now() + (j.expires_in || 3600) * 1000, user: { id: j.user.id, email: j.user.email } };
    lsSet(LS_SES, s);
    return s;
  }
  function refrescar() {
    var s = sesion();
    if (!s) return Promise.resolve(null);
    if (s.expires_at - Date.now() > 120000) return Promise.resolve(s);
    return api("/auth/v1/token?grant_type=refresh_token", { method: "POST", anon: true, body: { refresh_token: s.refresh_token } })
      .then(guardarSesion)
      .catch(function () { lsSet(LS_SES, null); return null; });
  }
  function registrar(email, pass, alias) {
    return api("/auth/v1/signup", { method: "POST", anon: true, body: { email: email, password: pass, data: { alias: alias } } }).then(function (j) {
      var s = guardarSesion(j);
      if (s) return guardarPerfil(alias).then(function () { return subirTodo(); }).then(function () { return { sesion: s }; });
      return { confirmar: true };
    });
  }
  function entrar(email, pass) {
    return api("/auth/v1/token?grant_type=password", { method: "POST", anon: true, body: { email: email, password: pass } }).then(function (j) {
      guardarSesion(j);
      return bajar().then(function () {
        var alias = j.user && j.user.user_metadata && j.user.user_metadata.alias;
        return alias ? guardarPerfil(alias, true) : null;
      }).then(subirTodo);
    });
  }
  function salir() {
    var s = sesion();
    var p = s ? api("/auth/v1/logout", { method: "POST" }).catch(function () {}) : Promise.resolve();
    return p.then(function () { lsSet(LS_SES, null); });
  }
  function recordar(email) {
    return api("/auth/v1/recover", { method: "POST", anon: true, body: { email: email } });
  }
  function guardarPerfil(alias, soloSiFalta) {
    var s = sesion();
    return api("/rest/v1/perfiles" + (soloSiFalta ? "?on_conflict=id" : ""), {
      method: "POST",
      headers: { Prefer: soloSiFalta ? "resolution=ignore-duplicates" : "resolution=merge-duplicates" },
      body: { id: s.user.id, alias: alias },
    });
  }
  function perfil() {
    var s = sesion();
    if (!s) return Promise.resolve(null);
    return refrescar().then(function () {
      return api("/rest/v1/perfiles?id=eq." + s.user.id + "&select=alias,en_ranking");
    }).then(function (r) { return (r && r[0]) || null; });
  }
  function actualizarPerfil(campos) {
    var s = sesion();
    return refrescar().then(function () {
      return api("/rest/v1/perfiles?id=eq." + s.user.id, { method: "PATCH", body: campos });
    });
  }

  // Fusiona dos progresos quedándose con el dato más completo de cada pregunta.
  function fusionar(a, b) {
    var out = { q: {}, ses: [], dias: [] };
    [a, b].forEach(function (x) {
      if (!x) return;
      Object.keys(x.q || {}).forEach(function (k) {
        var r = x.q[k], o = out.q[k];
        if (!o || r[3] > o[3]) out.q[k] = [Math.max(r[0], o ? o[0] : 0), Math.max(r[1], o ? o[1] : 0), r[2], r[3]];
        else out.q[k] = [Math.max(r[0], o[0]), Math.max(r[1], o[1]), o[2], o[3]];
      });
      (x.dias || []).forEach(function (d) { if (out.dias.indexOf(d) < 0) out.dias.push(d); });
      (x.ses || []).forEach(function (s) { if (!out.ses.some(function (y) { return y[0] === s[0]; })) out.ses.push(s); });
    });
    out.ses.sort(function (x, y) { return x[0] - y[0]; });
    return out;
  }
  function bajar() {
    var s = sesion();
    return api("/rest/v1/progreso?user_id=eq." + s.user.id + "&select=ley,datos").then(function (filas) {
      (filas || []).forEach(function (f) {
        if (f.ley === FILA_AJ) { var loc = lsGet(LS_AJ, null); if (!loc || (f.datos && f.datos.t > (loc.t || 0))) lsSet(LS_AJ, f.datos); return; }
        prog[f.ley] = fusionar(prog[f.ley], f.datos);
      });
      lsSet(LS_PROG, prog);
    });
  }
  var DATOS = {}; // ley -> data de preguntas (para calcular la nota al subir)
  function subir(l) {
    var s = sesion();
    if (!s) return Promise.resolve();
    if (!prog[l] && !DATOS[l]) return Promise.resolve();
    var p = ley(l);
    // Solo se envían nota y contadores si se conocen las preguntas de ese contexto (evita pisar la nota con 0)
    var st = DATOS[l] ? stats(l, DATOS[l]) : null;
    var fila = { user_id: s.user.id, ley: l, datos: p };
    if (st) { fila.nota = st.nota; fila.dominadas = st.cuenta.dominada; fila.respuestas = st.respuestas; }
    return refrescar().then(function () {
      return api("/rest/v1/progreso?on_conflict=user_id,ley", { method: "POST", headers: { Prefer: "resolution=merge-duplicates" }, body: fila });
    }).catch(function () {});
  }
  function subirTodo() { return Promise.all(Object.keys(prog).map(subir)); }
  // Preferencias de avisos por email (tabla notif_preferencias; ver supabase/esquema.sql v3)
  function prefsNotif() {
    var s = sesion(); if (!ONLINE || !s) return Promise.resolve(null);
    return refrescar().then(function () { return api("/rest/v1/notif_preferencias?user_id=eq." + s.user.id + "&select=email_activo,tipos,frecuencia"); })
      .then(function (r) { return (r && r[0]) || { email_activo: false, tipos: ["convocatoria", "listas", "fecha_examen", "modificacion", "aprobados"], frecuencia: "inmediata" }; });
  }
  function guardarPrefsNotif(p) {
    var s = sesion();
    return refrescar().then(function () {
      return api("/rest/v1/notif_preferencias?on_conflict=user_id", { method: "POST", headers: { Prefer: "resolution=merge-duplicates" }, body: { user_id: s.user.id, email_activo: p.email_activo, tipos: p.tipos, frecuencia: p.frecuencia, actualizado: new Date().toISOString() } });
    });
  }
  function ranking(l) {
    return api("/rest/v1/rpc/ranking", { method: "POST", anon: !sesion(), body: { p_ley: l } });
  }

  // ---------------- Ajustes de estudio, favoritos y oposiciones seguidas ----------------
  // Se guardan en el navegador y, con cuenta, en la fila especial "ajustes-usuario" de la tabla progreso
  // (reutiliza la tabla existente con sus políticas RLS; no requiere migración).
  var LS_AJ = "testley:ajustes", FILA_AJ = "ajustes-usuario";
  var AJ_DEF = { oposicion: null, fechaExamen: "", horasSemana: 6, dias: [0, 1, 2, 3, 4, 5, 6], nivel: "empiezo", favoritas: [], sigo: [], vistoAlertas: 0, onboarding: 0, t: 0 };
  function ajustes() { var a = lsGet(LS_AJ, {}); Object.keys(AJ_DEF).forEach(function (k) { if (a[k] == null) a[k] = AJ_DEF[k] instanceof Array ? [] : AJ_DEF[k]; }); if (!a.oposicion) a.oposicion = lsGet("testley:op", null); return a; }
  function guardarAjustes(cambios) {
    var a = ajustes(); Object.keys(cambios || {}).forEach(function (k) { a[k] = cambios[k]; }); a.t = Date.now();
    lsSet(LS_AJ, a); if (a.oposicion) lsSet("testley:op", a.oposicion);
    var s = sesion();
    if (ONLINE && s) refrescar().then(function () {
      return api("/rest/v1/progreso?on_conflict=user_id,ley", { method: "POST", headers: { Prefer: "resolution=merge-duplicates" }, body: { user_id: s.user.id, ley: FILA_AJ, datos: a } });
    }).catch(function () {});
    return a;
  }
  function esFavorita(k) { return ajustes().favoritas.indexOf(k) >= 0; }
  function alternarFavorita(k) { var f = ajustes().favoritas, i = f.indexOf(k); if (i >= 0) f.splice(i, 1); else f.push(k); guardarAjustes({ favoritas: f }); return i < 0; }
  function sigo(id) { return ajustes().sigo.indexOf(id) >= 0; }
  function alternarSeguir(id) { var f = ajustes().sigo, i = f.indexOf(id); if (i >= 0) f.splice(i, 1); else f.push(id); guardarAjustes({ sigo: f }); return i < 0; }

  // ---------------- Pase Opositor (clave de licencia de Lemon Squeezy) ----------------
  // La clave se valida contra la API pública de licencias; no hace falta ninguna clave secreta.
  // Se revalida cada 24 h para que una suscripción cancelada deje de dar acceso.
  var LS_PASE = "testley:pase";
  // Planes configurables (config.json → planes). Sin pagos configurados, todo está disponible.
  function plan() { var P = CFG.planes; if (!P || !CFG.pase) return null; return pase() ? P.premium : P.free; }
  function puede(k) { var p = plan(); return !p || !!p[k]; }
  function validarClave(clave) {
    return fetch("https://api.lemonsqueezy.com/v1/licenses/validate", {
      method: "POST", headers: { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
      body: "license_key=" + encodeURIComponent(clave),
    }).then(function (r) { return r.json(); }).then(function (d) {
      var st = d.license_key && d.license_key.status, m = d.meta || {};
      if (!d.valid || st === "expired" || st === "disabled") return { ok: false, motivo: st === "expired" || st === "disabled" ? "caducada" : "invalida" };
      if (CFG.lsStoreId && String(m.store_id) !== String(CFG.lsStoreId)) return { ok: false, motivo: "invalida" };
      if (CFG.lsProductId && String(m.product_id) !== String(CFG.lsProductId)) return { ok: false, motivo: "invalida" };
      return { ok: true, email: m.customer_email || "" };
    });
  }
  // Entitlement: clave de licencia validada o suscripción confirmada por el servidor (RPC mi_plan, alimentada por el webhook firmado).
  var LS_PLAN = "testley:plan-servidor";
  function pase() {
    var p = lsGet(LS_PASE, null); if (p && p.ok) return p;
    var s = lsGet(LS_PLAN, null), ses = sesion();
    return s && s.plan === "premium" && ses && s.uid === ses.user.id ? { ok: true, fuente: "servidor", email: ses.user.email } : null;
  }
  function planServidor(forzar) {
    var ses = sesion(), s = lsGet(LS_PLAN, null);
    if (!ONLINE || !ses || (!forzar && s && s.uid === ses.user.id && Date.now() - s.t < 36e5)) return Promise.resolve(s);
    return refrescar().then(function () { return api("/rest/v1/rpc/mi_plan", { method: "POST", body: {} }); })
      .then(function (r) { var v = { plan: (r && r.plan) || "free", uid: ses.user.id, t: Date.now() }; lsSet(LS_PLAN, v); return v; })
      .catch(function () { return s; }); // sin la función desplegada (esquema v4) se mantiene la clave de licencia
  }
  function activarPase(clave) {
    clave = String(clave || "").trim();
    if (!clave) return Promise.resolve({ ok: false, motivo: "invalida" });
    return validarClave(clave).then(function (r) {
      if (r.ok) lsSet(LS_PASE, { clave: clave, ok: true, email: r.email, t: Date.now() });
      return r;
    });
  }
  function quitarPase() { try { localStorage.removeItem(LS_PASE); } catch (e) {} }
  function revalidarPase() {
    var p = pase();
    if (!p || Date.now() - p.t < 864e5) return;
    validarClave(p.clave).then(function (r) {
      if (r.ok) lsSet(LS_PASE, { clave: p.clave, ok: true, email: r.email, t: Date.now() });
      else if (r.motivo === "caducada" || r.motivo === "invalida") quitarPase();
    }).catch(function () {}); // Sin conexión: se mantiene el acceso y se reintenta más tarde.
  }
  revalidarPase();

  // ---------------- Cabecera: estado de la cuenta ----------------
  function pintarCabecera() {
    var el = document.getElementById("cuenta-nav");
    if (!el) return;
    var root = CFG.root || "./";
    var s = sesion();
    el.innerHTML = s
      ? '<a class="nav-user" href="' + root + 'panel/" title="' + s.user.email + '"><span class="avatar">' + s.user.email.charAt(0).toUpperCase() + "</span>Mi panel</a>"
      : '<a class="btn-nav" href="' + root + (ONLINE ? "cuenta/" : "panel/") + '">' + (ONLINE ? "Entrar" : "Mi progreso") + "</a>";
  }
  function campana() {
    var el = document.getElementById("cuenta-nav"), aj = ajustes();
    if (!el || !aj.sigo.length || !puede("alertas")) return;
    fetch((CFG.root || "./") + "datos/novedades.json").then(function (r) { return r.json(); }).then(function (nov) {
      var n = nov.filter(function (x) { return aj.sigo.indexOf(x.oposicion) >= 0 && x.relevancia === "convocatoria" && Date.parse(x.detectado || x.fecha) > (aj.vistoAlertas || 0); }).length;
      if (!n) return;
      var a = document.createElement("a");
      a.className = "campana"; a.href = (CFG.root || "./") + "panel/#avisos-t"; a.title = n + " avisos nuevos de tus convocatorias";
      a.innerHTML = "Avisos <b>" + n + "</b>";
      el.parentNode.insertBefore(a, el);
    }).catch(function () {});
  }
  document.addEventListener("DOMContentLoaded", function () {
    pintarCabecera(); campana();
    if (ONLINE && sesion()) refrescar().then(pintarCabecera).then(function () { return planServidor(); });
  });

  // Simulacro desde el banco: reparto por temas (el de la convocatoria en sim.reparto = [{temas:[i…], preguntas:n}] o, si no lo
  // fija, proporcional a las preguntas de cada tema, con al menos una por tema si caben) y preguntas de reserva solo si la
  // configuración oficial las prevé (sim.reserva). Cada pregunta cuenta en un único tema (el primero de q.tm).
  function seleccionSimulacro(qs, sim, azar) {
    azar = azar || Math.random;
    var mezcla = function (a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(azar() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; };
    var n = Math.min(sim.preguntas, qs.length), usadas = {}, lista = [];
    // Sin repeticiones recientes (sim.evitar_repetidas): primero las preguntas que no has respondido en los últimos 7 días
    var reciente = function (q) { var r = sim.evitar_repetidas && q.ley ? ley(q.ley).q[q.id] : null; return r && Date.now() - r[3] < 7 * 864e5 ? 1 : 0; };
    var ordenar = function (a) { return sim.evitar_repetidas ? a.map(function (q, i) { return [reciente(q), i, q]; }).sort(function (x, y) { return x[0] - y[0] || x[1] - y[1]; }).map(function (x) { return x[2]; }) : a; };
    var tomar = function (pool, k) { ordenar(mezcla(pool.filter(function (q) { return !usadas[q.id]; }))).slice(0, k).forEach(function (q) { usadas[q.id] = 1; lista.push(q); }); };
    var grupos = {};
    qs.forEach(function (q) { var t = q.tm && q.tm.length ? q.tm[0] : "sin"; (grupos[t] = grupos[t] || []).push(q); });
    if (sim.reparto && sim.reparto.length) {
      sim.reparto.forEach(function (r) { tomar(qs.filter(function (q) { return (q.tm || []).some(function (i) { return r.temas.indexOf(i) >= 0; }); }), r.preguntas); });
    } else if (Object.keys(grupos).length > 1) {
      var temas = Object.keys(grupos), total = qs.length, cuota = {}, asignadas = 0;
      temas.forEach(function (t) { cuota[t] = Math.floor((n * grupos[t].length) / total); if (!cuota[t] && n >= temas.length) cuota[t] = 1; asignadas += cuota[t]; });
      temas.slice().sort(function (a, b) { return grupos[b].length - grupos[a].length; }).forEach(function (t) { if (asignadas < n) { cuota[t]++; asignadas++; } });
      temas.forEach(function (t) { tomar(grupos[t], Math.min(cuota[t], grupos[t].length)); });
    }
    if (lista.length > n) lista = mezcla(lista).slice(0, n);
    if (lista.length < n) tomar(qs, n - lista.length); // si un tema no llega a su cuota, se completa con el resto del banco
    var reserva = [];
    if (sim.reserva > 0) mezcla(qs.filter(function (q) { return !usadas[q.id]; })).slice(0, sim.reserva).forEach(function (q) { reserva.push(q); });
    return { lista: mezcla(lista), reserva: reserva };
  }

  // Banco premium (B1): con bancoPrivado, docs/datos solo trae una muestra de lo premium; el resto lo sirve la función «banco»
  // de Supabase tras comprobar en el servidor la suscripción (mi_plan) o la clave de licencia. El navegador nunca decide.
  function conPremium(l, d) {
    var p = pase();
    if (!CFG.bancoPrivado || !d || !d.premium || !p || !ONLINE) return Promise.resolve(d);
    var cuerpo = { clave: l };
    if (p.clave) cuerpo.licencia = p.clave;
    return (sesion() ? refrescar() : Promise.resolve()).then(function () {
      var s = sesion();
      return fetch(CFG.supabaseUrl + "/functions/v1/banco", { method: "POST", body: JSON.stringify(cuerpo),
        headers: { apikey: CFG.supabaseAnonKey, Authorization: "Bearer " + (s ? s.access_token : CFG.supabaseAnonKey), "Content-Type": "application/json" } });
    }).then(function (r) { return r.ok ? r.json() : null; }).then(function (x) {
      if (!x || !x.qs) { d.premiumCargado = false; return d; }
      var ids = {}; d.qs.forEach(function (q) { ids[q.id] = 1; });
      d.qs = d.qs.concat(x.qs.filter(function (q) { return !ids[q.id]; }));
      d.premiumCargado = true;
      return d;
    }).catch(function () { d.premiumCargado = false; return d; });
  }

  window.TL = {
    online: ONLINE, root: CFG.root || "./",
    registrarRespuesta: registrarRespuesta, registrarSesion: registrarSesion, estado: estado, tipoSesion: tipoSesion, TIPOS_SESION: TIPOS_SESION,
    stats: stats, logros: logros, estrellas: estrellas, proximoRepaso: proximoRepaso, vencida: vencida, _INTERVALOS: INTERVALOS,
    registro: function (l, qid) { return ley(l).q[qid] || null; }, comparaSimulacros: comparaSimulacros, seleccionSimulacro: seleccionSimulacro, puntos: puntos, objetivoSemanal: objetivoSemanal,
    sesion: sesion, registrar: registrar, entrar: entrar, salir: salir, recordar: recordar,
    perfil: perfil, actualizarPerfil: actualizarPerfil, ranking: ranking, subir: subir, bajar: bajar,
    setDatos: function (l, d) { DATOS[l] = d; },
    cargar: function (l) { return fetch((CFG.root || "./") + "datos/" + l + ".json").then(function (r) { return r.json(); }).then(function (d) { return conPremium(l, d); }).then(function (d) { DATOS[l] = d; return d; }); },
    pintarCabecera: pintarCabecera,
    pase: pase, activarPase: activarPase, quitarPase: quitarPase, planServidor: planServidor,
    esGratis: function (l) { var p = plan(); return !p || (p.leyes_completas || []).indexOf(l) >= 0 || !!p.tests_completos; },
    puede: puede, plan: plan, prefsNotif: prefsNotif, guardarPrefsNotif: guardarPrefsNotif,
    esOposicion: function (id) { return (CFG.opos || []).indexOf(id) >= 0; },
    miOposicion: function () { return ajustes().oposicion; },
    setMiOposicion: function (id) { guardarAjustes({ oposicion: id }); },
    ajustes: ajustes, guardarAjustes: guardarAjustes, esFavorita: esFavorita, alternarFavorita: alternarFavorita,
    sigo: sigo, alternarSeguir: alternarSeguir,
    _prog: function () { return prog; },
  };
})();
