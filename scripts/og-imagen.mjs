// Genera las imágenes de marca para redes sociales y datos estructurados con la identidad v4
// (Literata + Public Sans autoalojadas, papel/tinta/verde registro y sello), renderizando HTML con Playwright:
//   web/assets/og-testley.png   1200×630 (og:image / twitter:image)
//   web/assets/logo-testley.png 512×512  (logo de Organization en JSON-LD)
// Uso: node scripts/og-imagen.mjs   (las imágenes se versionan; build.mjs solo las enlaza si existen).
// Necesita Playwright con Chromium (PLAYWRIGHT_PATH para indicar dónde está si no se resuelve «playwright»).
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const pw = (() => {
  for (const p of [process.env.PLAYWRIGHT_PATH, "playwright", "/opt/node22/lib/node_modules/playwright"].filter(Boolean)) {
    try { return require(p); } catch {}
  }
  throw new Error("No se encuentra Playwright: instala «playwright» o define PLAYWRIGHT_PATH.");
})();

const raiz = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const fuente = (f) => "data:font/woff2;base64," + fs.readFileSync(path.join(raiz, "web/assets/fonts", f)).toString("base64");
const css = `
@font-face { font-family: "Literata"; font-weight: 200 900; src: url(${fuente("literata-latin-opsz-normal.woff2")}) format("woff2"); }
@font-face { font-family: "Public Sans"; font-weight: 100 900; src: url(${fuente("public-sans-latin-wght-normal.woff2")}) format("woff2"); }
* { box-sizing: border-box; margin: 0; }
body { background: #f4f5f2; color: #1b2a38; font-family: "Public Sans", sans-serif; }
.sello { display: inline-grid; place-items: center; border-radius: 50%; border: 6px solid #7b1e2c; color: #7b1e2c; font-family: "Literata", serif; font-weight: 600; line-height: 1; }
`;
const OG = `<!doctype html><html lang="es"><meta charset="utf-8"><style>${css}
.og { width: 1200px; height: 630px; padding: 72px 84px; display: flex; flex-direction: column; justify-content: space-between; border-top: 14px solid #0e5a4a; }
.marca { display: flex; align-items: center; gap: 22px; font-family: "Literata", serif; font-weight: 600; font-size: 46px; }
.marca .sello { width: 72px; height: 72px; font-size: 42px; border-width: 4px; }
h1 { font-family: "Literata", serif; font-weight: 600; font-size: 76px; line-height: 1.08; letter-spacing: -0.01em; max-width: 980px; }
h1 em { font-style: normal; color: #0e5a4a; }
.pie { display: flex; justify-content: space-between; align-items: flex-end; font-size: 28px; color: #5a6670; border-top: 2px solid #d9ddd6; padding-top: 26px; }
.pie b { color: #7b1e2c; font-weight: 600; }
</style><body><div class="og">
<div class="marca"><span class="sello">§</span>TestLey</div>
<h1>Test de leyes para oposiciones, <em>con la cita del BOE</em> en cada respuesta</h1>
<div class="pie"><span>Convocatorias oficiales, temario y simulacros</span><b>Texto consolidado del BOE</b></div>
</div></body></html>`;
const LOGO = `<!doctype html><html lang="es"><meta charset="utf-8"><style>${css}
body { width: 512px; height: 512px; display: grid; place-items: center; }
.sello { width: 400px; height: 400px; font-size: 250px; border-width: 22px; padding-bottom: 12px; }
</style><body><span class="sello">§</span></body></html>`;

const nav = await pw.chromium.launch();
try {
  for (const [html, w, h, out] of [[OG, 1200, 630, "og-testley.png"], [LOGO, 512, 512, "logo-testley.png"]]) {
    const p = await nav.newPage({ viewport: { width: w, height: h } });
    await p.setContent(html);
    await p.evaluate(() => document.fonts.ready);
    await p.screenshot({ path: path.join(raiz, "web/assets", out), clip: { x: 0, y: 0, width: w, height: h } });
    await p.close();
    console.log("web/assets/" + out);
  }
} finally {
  await nav.close();
}
