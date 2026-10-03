# Mossos 360 · estado final (cierre B1–B6 + generación controlada)

Fecha: 2026-10-03. Alcance: Mossos d'Esquadra, mosso/a, convocatoria 46/26.

# MOSSOS STATUS: **READY_PENDING_MANUAL_DEPLOYMENT**

**No es READY.** El código que protege el banco premium está hecho y probado, pero no está desplegado. Hasta que el propietario siga `PREMIUM_DEPLOYMENT.md`, el banco completo **sigue siendo descargable desde `docs/datos/*.json`**, porque `config.json → bancoPrivado: false` mantiene el comportamiento anterior para no romper el sitio. Desplegar y activar `bancoPrivado: true` es el único paso que falta para cerrar B1.

La cobertura sigue en **PARCIAL** (103 preguntas TESTLEY_GENERATED; faltan 456 para el objetivo de 30 por tema). No es un bloqueo de seguridad: la generación funciona, pero está **en pausa a propósito** tras el segundo lote (ver «Generación»).

## Estado B1–B6

| Bloque | Estado | Evidencia | Pendiente |
|---|---|---|---|
| **B1** Premium | **CODE_DONE · PENDING_MANUAL_DEPLOYMENT** | Función `supabase/functions/banco` (`mi_plan()` con el token del usuario o licencia de Lemon Squeezy validada en el servidor). Tabla `banco_premium` con RLS y sin políticas. `build.mjs` publica solo una muestra de 10 por ley premium. Las preguntas BOE por artículo siguen gratis, como promete la página de precios. Tests: `tests/js/premium.test.mjs`, `tests/deno/banco_test.ts` (anónimo 401, FREE 403, PREMIUM 200, licencias falsas, caducadas o de otra tienda 403), `tests/test_sql.py` | El propietario aplica el SQL, configura los secretos `LS_STORE_ID`/`SITE_ORIGIN`, ejecuta `supabase functions deploy banco` y activa `bancoPrivado: true` (`PREMIUM_DEPLOYMENT.md`) |
| **B2** juez-sesion-v3 | **DONE** | Versión nueva y registrada (v2 intacta). Veredicto trazable: la puerta lo recalcula a partir de la respuesta archivada del juez, la huella de la pregunta y la política activa. Calibración CAL50-v3: CALIBRATION_PASS_CONSERVATIVE. `JUDGE_V3.md`; `tests/test_juez_v3.py` | — |
| **B3** Leyes catalanas | **SOURCE_BLOCKED (correcto)** | Llei 4/2003, 10/1994 y 16/1991 → FOUND_OFFICIAL_NON_CONSOLIDATED (BOE «Desactualizado»; el Portal Jurídic «no tenen caràcter oficial») → OFFICIAL_PENDING_REVIEW. No se generan preguntas que dependan de ellas; la puerta bloquea sus apartados. `datos/fuentes-leyes-catalanas.json` | Texto consolidado oficial y vigente |
| **B4** Àmbit D | **SOURCE_GAP (correcto)** | El CoverageEngine lo cuenta como hueco de FUENTE, no de generación (`tipo_gap: FUENTE`) | Fuente oficial de referencia |
| **B5** S00017 / S00018 | **DONE (sin publicación automática)** | Veredictos v1 contaminados e invalidados. Reevaluación solo con v3. S00017 queda en 35 VALID servidas, 5 a revisión y 3 retiradas. **S00018 sigue cerrado y sin publicar** (v3: 55 VALID / 3 REVIEW / 1 REJECTED). Las 6 REVIEW_REQUIRED no se publicaron | Decisión humana. Antes de autorizar S00018 hay que volver a deduplicarlo: unas 7 preguntas repiten hechos ya publicados en S00019 |
| **B6** Psicotécnicos | **DONE (motor) · SIN_BANCO_VERIFICADO** | `PsychotechnicalEngine` separado: OFFICIAL_EXAM y TESTLEY_GENERATED no se mezclan; sin nota oficial inventada (`formula_verificable: false`). `PSYCHOTECHNICAL_ENGINE.md` | Ejercicios con fuente oficial |

## Generación controlada

| Lote | Planificadas | Generadas | Validadas | VALID | Revisión | Rechazadas | Publicadas | Duplicadas | Errores cita/fuente | Incidentes | Decisión |
|---|---|---|---|---|---|---|---|---|---|---|---|
| S00019 (C.5, C.3, C.2) | 15 | 11 | 11 | 11 | 0 | 0 | 11 | 0 | 0/0 | 0 | OK_SIGUIENTE_TANDA |
| S00020 (C.5, C.3, C.2) | 20 | 16 | 16 | 16 | 0 | 0 | 16 | 1 (auditoría) | 0/0 | 1 de proceso, 0 de seguridad | **PAUSE_GENERATION** |

**Fábrica: GENERATION_PAUSED** (`fabrica/estado/estado.json`). Motivos:
1. En S00020 apareció un defecto del circuito: la deduplicación no comparaba las «Idees força» con los apartados de su tema. Se detectó en la auditoría previa al juicio y se corrigió con un test. Los jueces se pararon antes de dar veredicto y volvieron a juzgar.
2. Con la corrección, el juez sí recibió la pregunta parecida, pero no marcó como duplicada guia-mossos-67 (frente a guia-mossos-51).
3. 27 de 27 VALID en dos lotes da una tasa de revisión del 0 %, frente al 18 % de la calibración CAL50. Antes de escalar conviene una revisión humana de una muestra. Hallazgos de la auditoría: 3, todos MINOR (`fabrica/estado/auditoria-lotes.json`).

Reanudar: revisar las métricas y la auditoría, y después `python3 -m fabrica.sesion plan … --reanudar`.

## Criterios

| # | Criterio | Cumple |
|---|---|---|
| 1 | El banco premium no se descarga sin Pase | **Pendiente de despliegue** (código y tests OK) |
| 2 | Ningún `service_role` en el navegador | Sí (solo en la función y en los secretos de GitHub; test) |
| 3 | Solo `Banco.publicar()` publica | Sí |
| 4 | El generador no escribe veredicto, estado ni confianza | Sí (campos reservados → incidencia y bloqueo) |
| 5 | Veredicto trazable a la respuesta archivada del juez y a la política activa | Sí |
| 6 | Política congelada; v2 intacta | Sí |
| 7 | S00017/S00018 sin veredictos contaminados; S00018 sin publicar | Sí |
| 8 | REVIEW_REQUIRED nunca se publica de forma automática | Sí |
| 9 | Solo fuentes oficiales; leyes sin texto oficial consolidado aisladas | Sí |
| 10 | Àmbit D contado como hueco de fuente | Sí |
| 11 | Psicotécnicos sin mezclar oficial y generado, y sin nota inventada | Sí |
| 12 | Lotes pequeños con métricas y pausa ante anomalías | Sí (pausa activa) |
| 13 | Preguntas nuevas visibles en estudio, test, simulacro y cobertura | Sí (E2E y build) |
| 14 | Tests, build, crawler y E2E sin regresiones | Sí (`MOSSOS_360_E2E.md`) |
| 15 | Cobertura mínima por tema | **No** (PARCIAL; generación en pausa voluntaria) |

## Informes
`MOSSOS_360_SECURITY.md` · `MOSSOS_360_COVERAGE.md` · `MOSSOS_360_QUESTIONS.md` · `MOSSOS_360_E2E.md` · `MOSSOS_360_ARCHITECTURE.md` · `PREMIUM_DEPLOYMENT.md` · `JUDGE_V3.md` · `PSYCHOTECHNICAL_ENGINE.md`. Los informes generados a partir de datos son `MOSSOS_360_COVERAGE_MATRIX.md`, `MOSSOS_360_SOURCES_REPORT.md` y `MOSSOS_360_QUESTIONS_REPORT.md`, y se regeneran con `python3 catalogo/perfil.py && python3 -m fabrica.cobertura mossos-esquadra && python3 scripts/informe_mossos360.py`.
