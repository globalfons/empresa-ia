// Renderiza una página dinámica con Chromium (Playwright) y devuelve {url, html} por la salida estándar.
// Uso: node crawler_playwright.cjs <url> [espera_ms]
let pw;
try { pw = require("playwright"); } catch (e) { pw = require("/opt/node22/lib/node_modules/playwright"); }
(async () => {
  const [url, espera = "2500"] = process.argv.slice(2);
  const opts = process.env.PLAYWRIGHT_CHROMIUM_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } : {};
  const b = await pw.chromium.launch(opts);
  // PLAYWRIGHT_IGNORE_TLS=1 solo para entornos con proxy que intercepta TLS; en producción se valida el certificado.
  const p = await b.newPage({ ignoreHTTPSErrors: process.env.PLAYWRIGHT_IGNORE_TLS === "1", userAgent: "TestLeyBot/1.0 (+https://globalfons.github.io/empresa-ia/; globalprsx@gmail.com)", locale: "es-ES" });
  try {
    await p.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
    await p.waitForTimeout(+espera);
    process.stdout.write(JSON.stringify({ url: p.url(), html: await p.content() }));
  } catch (e) { console.error(String(e).split("\n")[0]); process.exitCode = 1; }
  finally { await b.close(); }
})();
