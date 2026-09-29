// Estudio: repetición espaciada, tiempo de sesión, estadísticas por tema (q.tm), plan con días disponibles y salida de la build por oposición.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { cargar } from "./entorno.mjs";

const D = 864e5;
const DATA = {
  arts: { "ley-x:1": { b: "Título I" }, "ley-x:2": { b: "Título II" } },
  qs: [
    { id: "q1", ley: "ley-x", art: "ley-x:1", tm: [0] },
    { id: "q2", ley: "ley-x", art: "ley-x:1", tm: [0] },
    { id: "q3", ley: "ley-x", art: "ley-x:2", tm: [1] },
    { id: "q4", ley: "ley-x", art: "ley-x:2", tm: [1] },
  ],
  temario: [{ i: 0, n: 1, b: "", t: "Tema uno", leyes: ["ley-x"] }, { i: 1, n: 2, b: "", t: "Tema dos", leyes: ["ley-x"] }],
};

test("repetición espaciada: fallo → repasar hoy; aciertos seguidos alargan el intervalo", () => {
  const { ctx } = cargar(["web/assets/store.js"]);
  const TL = ctx.TL;
  assert.deepEqual([...TL._INTERVALOS], [0, 1, 3, 7, 16, 35]);
  TL.registrarRespuesta("ley-x", "q1", false);
  const r = TL.registro("ley-x", "q1");
  assert.equal(r[2], 0); assert.ok(r[4] > 0, "guarda la última vez fallada");
  assert.equal(TL.vencida("ley-x", "q1"), true, "una fallada se repasa ya");
  TL.registrarRespuesta("ley-x", "q1", true);
  assert.equal(TL.vencida("ley-x", "q1"), false, "tras un acierto, mañana");
  assert.equal(TL.vencida("ley-x", "q1", Date.now() + D + 1000), true);
  TL.registrarRespuesta("ley-x", "q1", true);
  assert.equal(TL.proximoRepaso(TL.registro("ley-x", "q1")) - TL.registro("ley-x", "q1")[3], 3 * D);
  assert.equal(TL.vencida("ley-x", "nunca-vista"), false, "las nuevas no cuentan como vencidas");
});

test("sesiones: guardan el tiempo y las estadísticas lo suman", () => {
  const { ctx } = cargar(["web/assets/store.js"]);
  ctx.TL.registrarSesion("ley-x", 10, 7, 2, 1, "tema", 1 / 3, 125.4);
  ctx.TL.registrarSesion("ley-x", 5, 5, 0, 0, "repaso", 1 / 3, -3);
  const s = ctx.TL.stats("ley-x", DATA);
  assert.equal(s.sesiones[0][7], 125); assert.equal(s.sesiones[1][7], 0);
  assert.equal(s.tiempo, 125);
});

test("estadísticas por tema: cada pregunta cuenta solo en sus temas (q.tm)", () => {
  const { ctx } = cargar(["web/assets/store.js"]);
  ctx.TL.registrarRespuesta("ley-x", "q3", true); ctx.TL.registrarRespuesta("ley-x", "q3", true);
  const s = ctx.TL.stats("ley-x", DATA);
  assert.equal(s.porTema[0].n, 2); assert.equal(s.porTema[1].n, 2);
  assert.equal(s.porTema[0].pct, 0);
  assert.ok(s.porTema[1].pct > 0, "el dominio de q3 solo sube el tema 2");
  assert.equal(s.vencidas, 0);
});

test("plan: reparte las horas entre los días disponibles y marca el resto como descanso", () => {
  const { ctx } = cargar(["web/assets/store.js", "web/assets/plan.js"]);
  const s = ctx.TL.stats("ley-x", DATA);
  const soloLunes = ctx.TLPlan.generar(s, DATA, { horasSemana: 3, dias: [1], _rutaOp: "/op/" }, null, ctx.TL.estado);
  assert.equal(soloLunes.minDia, 180, "3 h en un solo día");
  assert.equal(soloLunes.semana.length, 7);
  const lunes = soloLunes.semana.filter((d) => !d.descanso);
  assert.equal(lunes.length, 1); assert.equal(lunes[0].fecha.getDay(), 1);
  assert.equal(soloLunes.semana.filter((d) => d.descanso).length, 6);
  const estudio = lunes[0].tareas.find((t) => t.tipo === "estudio");
  assert.ok(estudio && /^\/op\/tema-\d+\/#estudiar$/.test(estudio.url), "empieza estudiando el texto oficial de un tema nuevo");
  const todos = ctx.TLPlan.generar(s, DATA, { horasSemana: 7 }, null, ctx.TL.estado);
  assert.equal(todos.minDia, 60); assert.equal(todos.semana.filter((d) => d.descanso).length, 0);
});

const existe = fs.existsSync("docs/datos/cobertura.json");
const COB = existe ? JSON.parse(fs.readFileSync("docs/datos/cobertura.json", "utf8")) : [];

test("build: cada oposición con temario tiene página por tema, test del tema y panel de calidad", { skip: !existe }, () => {
  for (const o of COB) {
    assert.ok(fs.existsSync(`docs/admin/oposiciones/${o.id}/quality/index.html`), o.id);
    assert.match(fs.readFileSync(`docs/admin/oposiciones/${o.id}/quality/index.html`, "utf8"), /noindex/);
    o.temas.forEach((t, i) => {
      const h = fs.readFileSync(`docs/oposiciones/${o.id}/tema-${i + 1}/index.html`, "utf8");
      assert.match(h, /Estudiar/, `${o.id} tema ${i + 1}`);
      if (t.preguntas) assert.match(h, /data-tema="\d+"/, `${o.id} tema ${i + 1} tiene test del tema`);
      else assert.match(h, /noindex/, `${o.id} tema ${i + 1} sin preguntas no se indexa`);
    });
  }
});

test("build: las preguntas de la oposición llevan sus temas y la cobertura es coherente", { skip: !existe }, () => {
  for (const o of COB) {
    if (!o.temas.length) { assert.equal(o.completitud.total, 0, `${o.id}: sin temario oficial no puede figurar como completa`); continue; }
    const d = JSON.parse(fs.readFileSync(`docs/datos/${o.id}.json`, "utf8"));
    const porTema = o.temas.map(() => 0);
    for (const q of d.qs) if (q.tm) { assert.ok(q.tm.length && q.tm.every((i) => i >= 0 && i < o.temas.length), q.id); q.tm.forEach((i) => porTema[i]++); }
    assert.equal(d.qs.filter((q) => !q.tm).length, o.sin_tema, `${o.id}: preguntas fuera de todo tema (solo en tests mixtos)`);
    // Las leyes se comparten entre oposiciones: las preguntas de artículos que solo entran en temas de OTRA oposición (p. ej. el
    // Código Penal amplio de la Escala Ejecutiva) aparecen aquí sin tema y se usan en tests mixtos. El límite detecta ámbitos rotos.
    assert.ok(o.sin_tema < d.qs.length * 0.25, `${o.id}: demasiadas preguntas sin tema`);
    o.temas.forEach((t, i) => assert.equal(porTema[i], t.preguntas, `${o.id} tema ${i + 1}`));
    assert.ok(o.completitud.total > 0 && o.completitud.total <= 100);
    assert.ok(o.estructura.some((p) => p.en_simulacro), `${o.id}: al menos una parte del examen se simula`);
  }
});

test("build: página «Mis errores» y ninguna pregunta retirada publicada", { skip: !existe }, () => {
  assert.match(fs.readFileSync("docs/errores/index.html", "utf8"), /errores\.js/);
  for (const o of COB.filter((x) => x.temas.length)) {
    const d = JSON.parse(fs.readFileSync(`docs/datos/${o.id}.json`, "utf8"));
    assert.ok(!d.qs.some((q) => ["OUTDATED", "DEPRECATED"].includes(q.verification_status)), o.id);
  }
});
