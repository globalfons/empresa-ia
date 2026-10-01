// E2E por oposición: HOME → OPOSICIÓN → TEMARIO → TEMA → TEST → RESULTADO → ERRORES → SIMULACRO → PANEL (+ calidad), móvil y escritorio.
// Uso: servir docs/ en E2E_BASE (p. ej. python3 -m http.server en una carpeta con empresa-ia → docs) y ejecutar:
//   E2E_BASE=http://localhost:8765/empresa-ia/ node scripts/e2e-oposiciones.cjs      (requiere playwright instalado)
// Escribe documentacion/e2e-oposiciones.json, que scripts/informe_cobertura.py incluye en el informe.
const path = require('path'); const fs = require('fs');
let chromium; try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require(process.env.PLAYWRIGHT_PATH || '/opt/node22/lib/node_modules/playwright')); }
const RAIZ = path.join(__dirname, '..');
const base = process.env.E2E_BASE || 'http://localhost:8765/empresa-ia/';
const COB = JSON.parse(fs.readFileSync(path.join(RAIZ, 'docs/datos/cobertura.json'), 'utf8'));
(async () => {
  const b = await chromium.launch(); const informe = []; const errs = [];
  for (const [w, tag] of [[375, 'móvil'], [1280, 'escritorio']]) {
    for (const o of COB) {
      const c = await b.newContext({ viewport: { width: w, height: 900 } }); const p = await c.newPage();
      await c.route(/lemonsqueezy|supabase|plausible/, (r) => r.abort());
      p.on('pageerror', (e) => errs.push(`${tag} ${o.id} ${e.message}`));
      const pasos = []; const ok = (paso, cond, det = '') => pasos.push([paso, !!cond, det]);
      const ir = async (u) => { await p.goto(base + u); await p.waitForTimeout(200); const s = await p.evaluate(() => document.documentElement.scrollWidth); if (s > w) pasos.push(['sin desbordamiento ' + u, false, s]); };
      const responder = async (max) => {
        for (let i = 0; i < max; i++) {
          if (await p.locator('.result-card').count()) return true;
          const opt = p.locator('.opt:not([disabled])');
          if (!(await opt.count())) { await p.waitForTimeout(300); if (!(await p.locator('.opt:not([disabled])').count())) break; }
          await p.locator('.opt:not([disabled])').nth(i % 2).click();
          const nx = p.locator('[data-next]'); if (await nx.count()) await nx.click(); else await p.waitForTimeout(950);
        }
        return !!(await p.locator('.result-card').count());
      };
      // 1. Home
      await ir(''); ok('HOME', (await p.textContent('h1')).length > 5);
      await p.evaluate(() => localStorage.setItem('testley:pase', JSON.stringify({ clave: 'QA', ok: true, t: Date.now() })));
      // 2. Oposición + temario
      await ir(`oposiciones/${o.id}/`);
      ok('OPOSICIÓN', await p.locator('h1').count());
      const enlaces = await p.locator(`a[href*="oposiciones/${o.id}/tema-"]`).count();
      ok('TEMARIO', o.temas.length ? enlaces >= o.temas.length : /pendiente/i.test(await p.innerText('main')), `${enlaces} enlaces a temas`);
      ok('ESTRUCTURA OFICIAL', /Estructura oficial del proceso/.test(await p.innerText('main')));
      if (o.temas.length) {
        // 3. Tema con preguntas
        const i = o.temas.findIndex((t) => t.test);
        await ir(`oposiciones/${o.id}/tema-${i + 1}/`);
        const txt = await p.innerText('main');
        ok('TEMA · estudiar', /Estudiar/.test(txt) && /boe\.es|BOE|gencat\.cat/.test(await p.innerHTML('main')));
        await p.waitForSelector('[data-m="10"]', { timeout: 8000 }).catch(() => {});
        ok('TEMA · test del tema', await p.locator('[data-tema]').count() && await p.locator('[data-m="10"]').count());
        // 4. Test del tema → 5. Resultado
        await p.click('[data-m="10"]');
        const fin = await responder(12);
        const res = fin ? await p.innerText('.result-card') : '';
        ok('TEST + RESULTADO', fin && /%/.test(res), res.replace(/\s+/g, ' ').slice(0, 90));
        ok('RESULTADO · repasar errores', (await p.locator('[data-errores]').count()) > 0 || !/fallad|error/i.test(res));
        const tmFor = await p.evaluate(() => JSON.parse(localStorage.getItem('testley:progreso:v2') || '{}'));
        ok('progreso guardado', Object.keys(tmFor).length > 0);
        if (await p.locator('[data-errores]').count()) { await p.click('[data-errores]'); await p.waitForTimeout(300); ok('REPASAR ERRORES arranca', await p.locator('.opt').count()); }
        // 6. Mis errores
        await ir(`errores/?c=${o.id}`); await p.waitForTimeout(600);
        const et = await p.innerText('main');
        ok('MIS ERRORES', /Crear test con mis errores|Repaso de hoy/.test(et) && /Repasar/.test(et), et.replace(/\s+/g, ' ').slice(0, 80));
        // 7. Simulacro
        await ir(`oposiciones/${o.id}/#test=simulacro`); await p.waitForSelector('.opt:not([disabled])', { timeout: 8000 }).catch(() => {});
        for (let k = 0; k < 3; k++) { if (!(await p.locator('.opt:not([disabled])').count())) break; await p.locator('.opt:not([disabled])').first().click(); await p.waitForTimeout(950); }
        if (await p.locator('[data-exit]').count()) await p.click('[data-exit]');
        await p.waitForSelector('.result-card', { timeout: 6000 }).catch(() => {});
        ok('SIMULACRO + repetir', (await p.locator('.result-card').count()) && (await p.locator('[data-repetir]').count()));
      }
      // 7b. Exámenes oficiales anteriores (OFFICIAL_EXAM): orden y formato oficiales, corrección con la plantilla oficial
      if (fs.existsSync(path.join(RAIZ, `docs/oposiciones/${o.id}/examenes-oficiales/index.html`))) {
        await ir(`oposiciones/${o.id}/examenes-oficiales/`);
        const ex = await p.locator(`a[href*="examenes-oficiales/"]`).first().getAttribute('href').catch(() => null);
        ok('EXÁMENES OFICIALES · índice', ex);
        if (ex) {
          await ir(`oposiciones/${o.id}/examenes-oficiales/${ex.replace(/\/$/, '').split('/').pop()}/`);
          await p.waitForSelector('[data-m="oficial"]', { timeout: 8000 }).catch(() => {});
          ok('EXAMEN OFICIAL · menú', await p.locator('[data-m="oficial"]').count());
          if (await p.locator('[data-m="oficial"]').count()) {
            await p.click('[data-m="oficial"]');
            for (let k = 0; k < 3; k++) { if (!(await p.locator('.opt:not([disabled])').count())) break; await p.locator('.opt:not([disabled])').first().click(); await p.waitForTimeout(950); }
            if (await p.locator('[data-exit]').count()) await p.click('[data-exit]');
            await p.waitForSelector('.result-card', { timeout: 6000 }).catch(() => {});
            ok('EXAMEN OFICIAL · resultado', await p.locator('.result-card').count());
          }
        }
      }
      // 8. Panel
      await p.evaluate((id) => { const a = JSON.parse(localStorage.getItem('testley:ajustes') || '{}'); a.oposicion = id; a.dias = [1, 2, 3, 4, 5]; a.horasSemana = 6; localStorage.setItem('testley:ajustes', JSON.stringify(a)); }, o.id);
      await ir('panel/'); await p.waitForSelector('.hoy', { timeout: 6000 }).catch(() => {});
      ok('PANEL · sesión de hoy', await p.locator('.hoy').count());
      // Calidad (admin)
      await ir(`admin/oposiciones/${o.id}/quality/`);
      ok('CALIDAD', /TOPIC_COVERAGE|Cobertura/i.test(await p.innerText('main')));
      informe.push({ tag, id: o.id, pasos });
      await c.close();
    }
  }
  // Usuario gratuito: en una oposición de pago ve el test de muestra, no el banco completo
  const c = await b.newContext(); const p = await c.newPage(); await c.route(/lemonsqueezy|supabase|plausible/, (r) => r.abort());
  await p.goto(base + 'oposiciones/age-gestion-a2/tema-1/'); await p.waitForTimeout(800);
  const libre = await p.innerText('main');
  console.log('GRATIS muestra/upsell:', /Pase Opositor|muestra/i.test(libre));
  for (const r of informe) {
    const mal = r.pasos.filter((x) => !x[1]);
    console.log(`${r.tag.padEnd(10)} ${r.id.padEnd(36)} ${r.pasos.length - mal.length}/${r.pasos.length}` + (mal.length ? '  FALLAN: ' + mal.map((x) => x[0] + (x[2] ? ` (${x[2]})` : '')).join(' | ') : ''));
  }
  console.log('errores JS:', errs.slice(0, 10));
  fs.writeFileSync(path.join(RAIZ, 'documentacion/e2e-oposiciones.json'), JSON.stringify({ fecha: new Date().toISOString().slice(0, 10), gratis_ve_muestra: /Pase Opositor|muestra/i.test(libre), errores_js: errs, resultados: informe.map((r) => ({ vista: r.tag, id: r.id, ok: r.pasos.filter((x) => x[1]).length, total: r.pasos.length, fallan: r.pasos.filter((x) => !x[1]).map((x) => x[0]) })) }, null, 1));
  await b.close();
})();
