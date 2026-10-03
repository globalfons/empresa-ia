# Mossos 360 · verificación final (2026-10-03)

| Comprobación | Resultado |
|---|---|
| `npm test` (Python + JS) | exit 0 · Python 175 OK (8 omitidos) · JS 51 OK |
| Deno (`deno test tests/deno`, `deno check supabase/functions/*/index.ts`) | 15 OK · typecheck OK |
| SQL (`npm run test:sql` en PostgreSQL 16 local) | 8 OK |
| Integridad del banco (`scripts/integridad_banco.py`) | OK (0 IDs duplicados, 0 textos duplicados, invariante v3 OK) |
| `node build.mjs` | 11 701 páginas (4 534 indexables) |
| Crawler (`scripts/crawler_enlaces.py`) | 11 702 páginas · 308 354 enlaces internos · 0 rotos |
| E2E Mossos 360 (`scripts/e2e-mossos360.cjs`) | móvil 375 px 21/21 · escritorio 21/21 · 0 errores JS |
| E2E de las 7 oposiciones (`scripts/e2e-oposiciones.cjs`) | móvil y escritorio: Guardia Civil 6/6 · PN básica 14/14 · AGE C1 14/14 · AGE C2 14/14 · Mossos 17/17 · AGE A2 14/14 · PN ejecutiva 14/14 · 0 errores JS · muestra gratuita y upsell OK |

## Regresión detectada y corregida en esta verificación
El primer E2E móvil dio 21/24: la ficha de Mossos desbordaba a 398 px en 375 px. La causa fue un código interno largo (`FOUND_OFFICIAL_NON_CONSOLIDATED`) que el cierre B3 había metido en un aviso visible. Se reescribieron los avisos en lenguaje llano (los campos estructurados `estado_fuente` y `tipo_gap` no cambian) y el E2E volvió a 21/21.

URL canónica sin cambios: `/oposiciones/mossos-esquadra/` (no existe `/oposiciones/mossos/`).
