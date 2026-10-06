# Mossos 360 · readiness (checklist con evidencia)

Estado global: **NOT READY**. Solo se marca un punto con evidencia comprobable.

- [x] **Fuentes oficiales verificadas** · `catalogo/fuentes/DOGC-1046460.txt` (sha256 en la ficha), `catalogo/preparacion/mossos-esquadra.json` · tests `tests/test_preparacion.py` (citas literales, barems idénticos al Anexo 2, capítulos del Anexo 3) · OFFICIAL_VERIFIED
- [x] **Convocatoria modelada** · `call_id` 46/26 en `motor360`; una convocatoria nueva es una clave nueva (test `test_otra_convocatoria_no_hereda_datos`) · calendario y eventos en el perfil
- [x] **Temario operativo** · 21 temas, `/oposiciones/mossos-esquadra/tema-N/` · `tests/test_perfil.py`
- [ ] **Knowledge tests operativos** · funcionan, pero la cobertura es PARCIAL: 99 preguntas TestLey VALID; 3 temas P0 (B.1, B.5, C.1: menos de 10 preguntas servibles), 0 simulacros TestLey disjuntos con el reparto oficial; apartados sin texto oficial en B.8, C.1-C.4 y tema D sin fuente (`MOSSOS_360_CONTENT_COVERAGE.md`); la fábrica está en GENERATION_PAUSED
- [x] **Official exams separados** · 290 OFFICIAL_EXAM en su propio banco · `scripts/integridad_banco.py`, `tests/test_mossos.py`
- [ ] Aptitud verbal · PARCIAL: series de letras y orden alfabético (`web/assets/aptitud.js`, tests en `tests/js/aptitud.test.mjs`). La verbal semántica (sinónimos, analogías) necesita un banco revisado por personas
- [x] **Aptitud numérica** · `web/assets/aptitud.js` + `/oposiciones/mossos-esquadra/aptitudinal/` · `tests/js/aptitud.test.mjs` (solubilidad, unicidad, cálculo independiente) · E2E 21a–21c en 375 px y escritorio · contenido TESTLEY_GENERATED, nunca oficial
- [x] **Aptitud abstracta** · `web/assets/aptitud.js` + `/oposiciones/mossos-esquadra/aptitudinal/` · `tests/js/aptitud.test.mjs` (solubilidad, unicidad, cálculo independiente) · E2E 21a–21c en 375 px y escritorio · contenido TESTLEY_GENERATED, nunca oficial
- [x] **Aptitud espacial** · `web/assets/aptitud.js` + `/oposiciones/mossos-esquadra/aptitudinal/` · `tests/js/aptitud.test.mjs` (solubilidad, unicidad, cálculo independiente) · E2E 21a–21c en 375 px y escritorio · contenido TESTLEY_GENERATED, nunca oficial
- [x] **Aptitud perceptiva** · `web/assets/aptitud.js` + `/oposiciones/mossos-esquadra/aptitudinal/` · `tests/js/aptitud.test.mjs` (solubilidad, unicidad, cálculo independiente) · E2E 21a–21c en 375 px y escritorio · contenido TESTLEY_GENERATED, nunca oficial
- [x] **Competency training** · 10 competencias oficiales (cita, fuente, 46/26) + 10 fichas y 60 situaciones TestLey publicadas solo como VALID del juez independiente (`fabrica/competencias.py`, `catalogo/competencias/mossos-esquadra.json`, lote C00002) · `/oposiciones/mossos-esquadra/competencias/` · `tests/test_competencias.py`, `tests/js/competencias.test.mjs`, E2E 22a–22e en 375 px y escritorio · **pendiente de recalibración** (P1): juzgadas solo con Haiku, que en la calibración de entrevista resultó laxo (tanda `MOSSOS-COMPETENCY-REJUDGE-001`)
- [x] **Psychometric foundation** · cuestionario de autopercepción (20 ítems, pares invertidos, consistencia, evolución) como SELF_ASSESSMENT separado de OBJECTIVE_SCORE, sin respuestas correctas ni diagnóstico (`web/assets/competencias.js`) · tests JS · E2E 22d
- [x] **Interview trainer** · 56 escenarios TESTLEY_TRAINING VALID (lotes E00001-E00003) con la política `juez-entrevista-v2` (Sonnet como referencia, prompt congelado, combinación conservadora de rondas) y la regla determinista v2; las 10 competencias oficiales con ≥ 5; 29 en REVIEW_REQUIRED y 19 REJECTED, nunca servidos · `/oposiciones/mossos-esquadra/entrevista/` · `tests/test_entrevista.py`, `tests/js/entrevista.test.mjs`, `tests/deno/tutor_entrevista_test.ts`, E2E 23a–23i · `INTERVIEW_ENGINE.md`. Análisis con IA: implementado, pendiente del despliegue del Tutor IA
- [x] **Content coverage audit** · `fabrica/cobertura360.py` → `MOSSOS_360_CONTENT_COVERAGE.md` (calculado desde los datos), objetivos razonados y `MOSSOS_360_CONTENT_GENERATION_PLAN.md`; `python3 -m fabrica.cobertura360 siguientes` · `tests/test_cobertura360.py`. La auditoría muestra huecos P0 (abajo)
- [ ] Physical tracker · barems oficiales verificados; sin registro de marcas (Fase 4)
- [ ] Catalan information · datos verificados en el perfil; sin vista para el usuario (Fase 6)
- [ ] Psychophysical information · capítulos del Anexo 3 verificados; sin vista (Fase 6)
- [ ] Simulation · solo conocimientos (Fase 5)
- [ ] Adaptive plan · solo conocimientos (Fase 5)
- [ ] Progress dashboard · Fase 6
- [ ] Mobile QA · se repite en cada fase con UI
- [x] **Tests green** · `npm test` (estado de la Fase 0)
- [ ] Security review · Fase 7
- [ ] Premium gates · B1 pendiente del despliegue del propietario (`PREMIUM_DEPLOYMENT.md`)
- [x] **Source traceability** · cada bloque con citas, `fuente`, `documento`, `call_id` y `verification_status`

## Actualización 2026-10-05 · desbloqueo de prioridades P0 (sin Physical Engine)

- **Fuentes**: B.8 y C.1–C.4 desbloqueados como fuente de la fábrica. Para B.8 se corrigió el troceado del PDF oficial (la página del índice del bloque siguiente ya no se pega al último tema). C.1–C.4 se basan solo en el texto de la Guia d'estudi oficial. Las leyes 4/2003, 10/1994 y 16/1991 siguen OFFICIAL_PENDING_REVIEW: no se incorporan. La decisión está en `catalogo/oposiciones/mossos-esquadra.json → fuentes_decisiones`. **D sigue bloqueado** porque no hay documento oficial de referencia (`fuentes_bloqueadas`).
- **Conocimientos**: política `juez-sesion-v4` (v3 con Sonnet como juez, mismos criterios).
  - S00021: 10 VALID publicadas (B.1.2 ×3, B.5.1 ×4, C.1.2 ×3).
  - S00022: el juez dio 10/10 VALID, pero la segunda comprobación ALL_VALID_SIN_EVIDENCIA lo retuvo sin publicar. Las razones de 1.0 y 4.0 están en castellano sobre preguntas en catalán y no comparten vocabulario con ellas. No se relajó el guard ni se volvió a juzgar. Queda pendiente de decisión humana (`fabrica/estado/retenidos/S00022/`).
  - La fábrica vuelve a estar en GENERATION_PAUSED.
- **Competencias**: política `juez-competencias-v2` (Sonnet de referencia, criterios y prompt sin cambios). Se hizo una ronda nueva sin sobrescribir la de Haiku. Resultado: 45 escenarios y 9 fichas VALID; 16 ítems en REVIEW_REQUIRED (`cola_revision`).
- **Aptitud verbal**: se añaden `anagrama` y `codificacion`, deterministas y verificados por cálculo. Los formatos semánticos van a un banco HUMAN_REVIEW vacío (`catalogo/aptitud/verbal-semantica-mossos-esquadra.json`) que nunca se sirve.
- **Entrevista**: sin más volumen; los REVIEW_REQUIRED siguen pendientes.
- **Physical Engine**: no iniciado.

## Actualización 2026-10-06 · cierre de huecos P0 de conocimientos
- **S00022**: RETENIDO_DEFINITIVO. No se aprueba a mano, no se rejuzga y no se publica. Evidencia y trazabilidad de las dos preguntas sin evidencia propia (1.0 y 4.0) en `fabrica/estado/retenidos/S00022/DECISION.json`.
- **Lotes ejecutados** (`juez-sesion-v4`, solo B.1/B.5/C.1, sin excedente):

  | lote | generadas | VALID | REVIEW_REQUIRED | REJECTED |
  |---|---|---|---|---|
  | S00023 | 17 | 14 | 3 | 0 |
  | S00024 | 2 | 2 | 0 | 0 |
  | S00025 | 1 | 1 | 0 | 0 |
  | **Total** | 20 | **17** | 3 | 0 |

  En REVIEW_REQUIRED: dos por claridad (el juez vio que la forma de las opciones delataba la respuesta) y un caso práctico (revisión humana obligatoria).
- **Resultado**: B.1 12/12, B.5 10/10, C.1 8/8 (el CoverageEngine propone 9 para C.1; no se generó más porque la autorización fijaba 8). La fábrica vuelve a GENERATION_PAUSED.
- **Tests**: Deno SKIPPED (no está instalado en el entorno; `supabase/` no se ha modificado).

## Actualización 2026-10-06 · fase banco de conocimientos (objetivo 1.000 VALID)
- **Resultado**: TESTLEY_GENERATED VALID pasa de 126 a **588**. La fábrica se detiene de forma automática antes de llegar a 1.000 (ver motivo).
- **Lotes** (`juez-sesion-v4`, planificador general, sin Tema D ni leyes 4/2003, 10/1994 y 16/1991):

  | lote | generadas | VALID | REVIEW_REQUIRED | REJECTED |
  |---|---|---|---|---|
  | S00026 | 30 | 28 | 2 | 0 |
  | S00027 | 49 | 44 | 5 | 0 |
  | S00028 | 50 | 45 | 5 | 0 |
  | S00029 | 50 | 45 | 5 | 0 |
  | S00030 | 50 | 44 | 6 | 0 |
  | S00031 | 50 | 45 | 5 | 0 |
  | S00032 | 50 | 44 | 5 | 1 (duplicada) |
  | S00033 | 46 | 39 | 5 | 2 |
  | S00034 | 48 | 39 | 8 | 1 |
  | S00035 | 50 | 45 | 4 | 1 |
  | S00036 | 50 | 44 | 6 | 0 |
  | **Total** | 523 | **462** | 56 | 5 |
  | S00037 | 50 | RETENIDO | — | — |

- **Parada automática (S00037)**: el juez dio 50/50 VALID, pero la comprobación ALL_VALID_SIN_EVIDENCIA encontró 4 razones sin vocabulario propio de la pregunta (11.1, 12.1, 15.0 y 17.0). Es la condición de parada «aparecen problemas de evidencia». El lote queda retenido sin publicar ni rejuzgar en `fabrica/estado/retenidos/S00037/DECISION.json`, y la fábrica pasa a GENERATION_PAUSED. Para reanudar hace falta una decisión humana y `--reanudar`. En la tanda 04 hubo un rechazo de FORMATO; se repitió con un juez nuevo, como permite la política.
- **S00022**: `SOLAPES.json` registra las preguntas nuevas que tratan hechos de S00022. Ninguno de los dos hechos vetados (1.0 y 4.0) tiene pregunta publicada.
- **Capacidad restante**: 151 apartados de la guía, 21 llenos (tope de 10 preguntas por apartado) y 535 huecos libres. Con la tasa observada (~85 % VALID), el techo queda en ≈ 1.040 VALID: muy justo para 1.000.
- **Fuentes que limitan la generación**:
  - Tema D: sin fuente oficial.
  - Leyes 4/2003, 10/1994 y 16/1991: OFFICIAL_PENDING_REVIEW.
  - C.2.2 y C.2.3: solo índice o enlace; omitidos.
  - Textos con defectos de origen: tabla dialectal A.4.2, tabla de población A.5.6, puntos duplicados en C.3, erratas de OCR.
  - REVIEW_REQUIRED también consume capacidad.
- **Incidencias**:
  - El commit 9d2ea48a59 se subió con un test Python dependiente de los datos en rojo (`test_plan_desde_cobertura…`, 13 ≠ 15). Se corrigió en 1ab839e3bb, y desde entonces la batería de comprobaciones se corta al primer fallo.
  - Hubo un límite de tasa (429) de los jueces en S00033; se relanzaron sin que hubiera veredictos previos.
  - Hubo un veredicto inconsistente en S00033 (REJECTED sin duplicado); se aplicó el criterio más conservador.
- **Tests**: Deno SKIPPED (no está instalado; `supabase/` sin modificar). Physical Engine: no iniciado.
