// E2E Mossos 360 (F21): recorrido real de 20 pasos de una persona que prepara Mossos d'Esquadra 46/26, en móvil (375 px) y escritorio.
// Uso: servir docs/ en E2E_BASE y ejecutar  E2E_BASE=http://localhost:8765/empresa-ia/ node scripts/e2e-mossos360.cjs
// Escribe documentacion/e2e-mossos360.json. Falla (código 1) si algún paso falla, hay errores de JS o desbordamiento horizontal.
const path = require('path'); const fs = require('fs');
let chromium; try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require(process.env.PLAYWRIGHT_PATH || '/opt/node22/lib/node_modules/playwright')); }
const RAIZ = path.join(__dirname, '..');
const base = process.env.E2E_BASE || 'http://localhost:8765/empresa-ia/';
const OP = 'mossos-esquadra';
(async () => {
  const b = await chromium.launch(); const informe = []; const errs = [];
  for (const [w, tag] of [[375, 'móvil'], [1280, 'escritorio']]) {
    const c = await b.newContext({ viewport: { width: w, height: 900 } }); const p = await c.newPage();
    await c.route(/lemonsqueezy|supabase|plausible/, (r) => r.abort());
    p.on('pageerror', (e) => errs.push(`${tag} ${e.message}`));
    const pasos = []; const ok = (paso, cond, det = '') => pasos.push([paso, !!cond, String(det).slice(0, 120)]);
    const ir = async (u) => { await p.goto(base + u); await p.waitForTimeout(250); const s = await p.evaluate(() => document.documentElement.scrollWidth); if (s > w) pasos.push(['sin desbordamiento ' + u, false, s]); };
    const texto = async () => (await p.innerText('main')).replace(/\s+/g, ' ');
    const jugar = async (k) => { for (let i = 0; i < k; i++) { if (!(await p.locator('.opt:not([disabled])').count())) break; await p.locator('.opt:not([disabled])').nth(i % 2).click(); const nx = p.locator('[data-next]'); if (await nx.count()) await nx.click(); else await p.waitForTimeout(950); } };
    const terminar = async () => { if (await p.locator('[data-exit]').count()) await p.click('[data-exit]'); await p.waitForSelector('.result-card', { timeout: 6000 }).catch(() => {}); return p.locator('.result-card').count(); };
    const prog = () => p.evaluate(() => JSON.parse(localStorage.getItem('testley:progreso:v2') || '{}'));

    await ir(''); ok('01 HOME', (await p.textContent('h1')).length > 5);
    await p.evaluate(() => localStorage.setItem('testley:pase', JSON.stringify({ clave: 'QA', ok: true, t: Date.now() })));
    await ir('oposiciones/'); ok('02 CATÁLOGO enlaza Mossos', await p.locator(`a[href*="oposiciones/${OP}/"]`).count());
    await ir(`oposiciones/${OP}/`); const ficha = await texto();
    ok('03 FICHA · datos oficiales y calendario', /Calendario del proceso/.test(ficha) && /1\.587|1587/.test(ficha));
    ok('04 FICHA · fuente oficial citada (DOGC)', await p.locator('a[href*="dogc.gencat.cat"]').count());
    ok('05 FICHA · CTA «Preparar Mossos»', await p.locator('#elegir', { hasText: 'Preparar Mossos' }).count());
    await p.click('#seguir'); await p.waitForTimeout(150);
    ok('06 SEGUIR Mossos d\'Esquadra 46/26', (await p.getAttribute('#seguir', 'aria-pressed')) === 'true' && /46\/26/.test(await p.textContent('#seguir')));
    ok('07 TEMARIO · 21 temas', (await p.locator(`a[href*="oposiciones/${OP}/tema-"]`).count()) >= 21);
    await ir(`oposiciones/${OP}/tema-10/`);
    ok('08 TEMA · estudiar con fuente oficial', /Estudiar/.test(await texto()) && /gencat\.cat|boe\.es/.test(await p.innerHTML('main')));
    await p.waitForSelector('[data-m="10"]', { timeout: 8000 }).catch(() => {});
    if (await p.locator('[data-m="10"]').count()) await p.click('[data-m="10"]');
    await jugar(12); ok('09 TEST DEL TEMA → resultado', await p.locator('.result-card').count());
    await ir(`errores/?c=${OP}`); await p.waitForTimeout(500); ok('10 MIS ERRORES', /Repas/.test(await texto()));
    await ir(`oposiciones/${OP}/#test=repaso`); await p.waitForSelector('.opt', { timeout: 8000 }).catch(() => {});
    ok('11 REPASO arranca', await p.locator('.opt').count());
    await ir(`oposiciones/${OP}/#test=simulacro`); await p.waitForSelector('.opt:not([disabled])', { timeout: 8000 }).catch(() => {});
    await jugar(3); ok('12 SIMULACRO (30 preguntas, 35 min) → resultado', await terminar());
    const ses = Object.values(await prog()).flatMap((x) => x.ses || []).filter((x) => x[8]);
    ok('13 SESIÓN registrada con tipo SIMULATION y oposición', ses.some((x) => x[8].tipo === 'SIMULATION' && x[8].oposicion === OP), JSON.stringify(ses.map((x) => x[8].tipo)));
    await ir(`oposiciones/${OP}/examenes-oficiales/`);
    const ex = await p.locator(`a[href*="examenes-oficiales/"]`).first().getAttribute('href').catch(() => null);
    if (ex) await ir(`oposiciones/${OP}/examenes-oficiales/${ex.replace(/\/$/, '').split('/').pop()}/`);
    await p.waitForSelector('[data-m="oficial"]', { timeout: 8000 }).catch(() => {});
    if (await p.locator('[data-m="oficial"]').count()) await p.click('[data-m="oficial"]');
    await jugar(3); ok('14 EXAMEN OFICIAL → resultado', await terminar());
    const sesOf = Object.values(await prog()).flatMap((x) => x.ses || []).filter((x) => x[8] && x[8].tipo === 'OFFICIAL_EXAM');
    ok('15 EXAMEN OFICIAL separado (sesión OFFICIAL_EXAM)', sesOf.length);
    await p.evaluate((id) => { const a = JSON.parse(localStorage.getItem('testley:ajustes') || '{}'); a.oposicion = id; a.dias = [0, 1, 2, 3, 4, 5, 6]; a.horasSemana = 7; localStorage.setItem('testley:ajustes', JSON.stringify(a)); }, OP);
    await ir(`panel/?c=${OP}`); await p.waitForSelector('#que-estudiar', { timeout: 8000 }).catch(() => {});
    ok('16 PANEL · «Qué debo estudiar hoy» con minutos', /Qué debo estudiar hoy/.test(await texto()) && /min recomendados/.test(await texto()));
    const mod = p.locator('[data-mod="prueba_fisica"]');
    if (await mod.count()) { await mod.locator('summary').click(); await mod.locator('[data-acc="0"]').check(); }
    await ir(`panel/?c=${OP}`); await p.waitForSelector('#preparacion', { timeout: 8000 }).catch(() => {});
    ok('17 MÓDULO no medible · checklist persiste (sin nota)', /1\/3 hecho/.test(await p.locator('[data-mod="prueba_fisica"] summary').innerText().catch(() => '')));
    const m2 = p.locator('[data-mod="prueba_fisica"]');
    if (await m2.count()) { await m2.locator('summary').click(); await m2.locator('input[name="t"]').fill('Course Navette: palier 7'); await m2.locator('.reg-manual button').click(); await p.waitForTimeout(300); }
    ok('18 REGISTRO MANUAL anotado', /palier 7/.test(await texto()));
    ok('19 CALENDARIO · próximas fechas oficial/previsión', /Próximas fechas/.test(await texto()));
    await p.waitForSelector('#avisos-t', { timeout: 6000 }).catch(() => {});
    ok('19b AVISOS tipificados de la convocatoria seguida', /Avisos de tus convocatorias/.test(await texto()));
    await ir(`admin/oposiciones/${OP}/quality/`);
    const adm = await texto();
    ok('20 ADMIN · métricas 360', ['coverage', 'question_count', 'official_exam_count', 'review_required', 'source_health', 'last_sync'].every((k) => adm.includes(k)));
    informe.push({ tag, pasos });
    await c.close();
  }
  let fallos = 0;
  for (const r of informe) {
    const mal = r.pasos.filter((x) => !x[1]); fallos += mal.length;
    console.log(`${r.tag.padEnd(10)} ${r.pasos.length - mal.length}/${r.pasos.length}` + (mal.length ? '  FALLAN: ' + mal.map((x) => x[0] + (x[2] ? ` (${x[2]})` : '')).join(' | ') : ''));
  }
  console.log('errores JS:', errs.slice(0, 10));
  fs.writeFileSync(path.join(RAIZ, 'documentacion/e2e-mossos360.json'), JSON.stringify({ fecha: new Date().toISOString().slice(0, 10), errores_js: errs,
    resultados: informe.map((r) => ({ vista: r.tag, ok: r.pasos.filter((x) => x[1]).length, total: r.pasos.length, pasos: r.pasos.map((x) => ({ paso: x[0], ok: x[1], detalle: x[2] })) })) }, null, 1) + '\n');
  await b.close();
  process.exit(fallos || errs.length ? 1 : 0);
})();
