# Mossos 360 · estado final

Fecha: 2026-10-02. Alcance: Mossos d'Esquadra, mosso/a, convocatoria 46/26, como implementación de referencia del modelo reutilizable (OppositionProfile + motores).
Fábrica: **GENERATION_PAUSED** (sin cambios). No se ha generado, publicado ni reevaluado ninguna pregunta; S00018 sigue sin publicar; política juez-sesion-v2 intacta.

## Veredicto

# MOSSOS 360: **NOT READY**

El producto funciona de punta a punta para una persona que prepara Mossos (E2E 21/21 en móvil y escritorio), pero hay dos bloqueos críticos que impiden declararlo listo para producción con honestidad:

1. **Banco premium sin protección real** (BLOCKED_FOR_PRODUCTION): las preguntas con respuesta están en JSON públicos.
2. **Cobertura de preguntas insuficiente y generación bloqueada**: 82 preguntas TESTLEY_GENERATED para 20 temas con fuente (objetivo 30/tema; faltan 479). Generar más requiere autorizar juez-sesion-v3 (criterio de cita suficiente).

## Tabla de componentes

| COMPONENTE | ESTADO | EVIDENCIA | BLOCKER |
|---|---|---|---|
| F0 Auditoría previa | DONE | `MOSSOS_360_AUDIT.md` (fffd1adc96) | — |
| F1 Puerta única de publicación + juez blindado | DONE | `Banco.verificar_publicacion/publicar`; reevaluación pasa por la puerta; `tests/test_publicacion.py` (12), `test_juez_v2` (18), `test_juez_independiente` (12) | — |
| F2 OppositionProfile declarativo | DONE | `catalogo/perfil.py` → `catalogo/perfiles/<id>.json` para las 7 oposiciones; sin datos de ninguna oposición en el código (test) | — |
| F3 Perfil completo de Mossos | DONE | 15 datos oficiales con cita literal + procedencia completa (source_url, source_document, published_at, retrieved_at, verified_at, verification_status); `tests/test_perfil.py` | — |
| F4 Convocatoria 46/26 + eventos | DONE | CURRENT_CALL 46/26, 9 HISTORICAL_CALL (exámenes), OFFICIAL_EXAM/TESTLEY_GENERATED separados; 6 eventos tipificados en vigilantes BOE/Gencat y por comparación de perfiles | — |
| F5 Temario 360º | DONE | 21 temas con alcance oficial literal (DOGC), leyes, artículos, cobertura, recuentos, dificultad, tipos, última actualización y cambios | — |
| F5 Leyes catalanas | BLOCKED (fuente) | Llei 4/2003, 10/1994, 16/1991 como OFFICIAL_PENDING_REVIEW con cita del temario; apartados excluidos de la fábrica | Sin texto consolidado oficial verificado en el repositorio |
| F6 Guía + esmenes | DONE | 4 esmenes con ORIGINAL / CORRECTION / CURRENT_VALUE y tests (aplicada y no aplicada) | — |
| F7 Separación de contenidos | DONE | 290 OFFICIAL_EXAM · 82 TESTLEY_GENERATED · 6 REVIEW_REQUIRED · 2 DEPRECATED; `scripts/integridad_banco.py` OK | — |
| F8 Generación por cobertura real | BLOCKED (autorización) | El gate VALIDATION + JUEZ + FUENTE + DUPLICADO + TRAZABILIDAD existe (F1); no se genera | GENERATION_PAUSED hasta autorizar juez-sesion-v3 |
| F9 CoverageEngine | DONE | `fabrica/cobertura.py`: 479 preguntas en 188 necesidades concretas; `MOSSOS_360_COVERAGE_MATRIX.md`; `tests/test_cobertura.py` (7) | — |
| F10 TrainingEngine (TODAY_PLAN) | DONE | `TLMotor.hoy()`: review, weak_topics, new_questions, difficult_questions, simulation, recommended_minutes | — |
| F11 Tipos de sesión | DONE | QUICK_TEST/TRAINING/WEAKNESS/REVIEW/SIMULATION/OFFICIAL_EXAM/CUSTOM con inicio, fin, preguntas, aciertos, errores, tiempo, temas, dificultad, nota y oposición | — |
| F12 SimulationEngine | DONE | Reparto por tema según los 290 exámenes oficiales, 30 preguntas/35 min/−1/4, reserva, sin repetidas de los últimos 7 días | — |
| F13 Módulos de preparación | DONE | 11 módulos; 9 no medibles con checklist + registro manual + cita oficial, sin nota inventada | — |
| F14 StudyPlanEngine | DONE (existente) | `web/assets/plan.js` (plan semanal y diario que se recalcula en cada visita); TrainingEngine lo reutiliza | — |
| F15 Alertas BOE + DOGC + Mossos | DONE | Eventos tipificados y fuente por aviso; seguir «Mossos d'Esquadra 46/26» | Email/Telegram dependen de secretos del propietario (ya existentes) |
| F16 Landing | DONE | URL canónica existente `/oposiciones/mossos-esquadra/` (no se duplica `/oposiciones/mossos/`); CTA «Preparar Mossos»; sin afirmaciones comerciales (test) | — |
| F17 Dashboard | DONE | Panel: «Qué debo estudiar hoy», preparación completa, calendario | — |
| F18 Admin | DONE | coverage, question_count, official_exam_count, review_required, deprecated, outdated, source_health, last_sync + necesidades | — |
| F19 Seguridad premium | **BLOCKED_FOR_PRODUCTION** | `docs/datos/*.json` (17 MB) públicos con respuestas; el bloqueo es solo del navegador | Requiere desplegar una función en Supabase (propietario) |
| F20 Tests | DONE | Python 152 OK (7 skip) · JS 41 OK · Deno 9 OK + typecheck · SQL 7 OK · build · crawler 0 rotos · 375 px sin errores | — |
| F21 E2E real | DONE | `scripts/e2e-mossos360.cjs`: 21/21 móvil y escritorio, 0 errores JS; E2E de las 7 oposiciones sin regresiones | — |
| F23 Motores genéricos | DONE | `MOSSOS_360_ARCHITECTURE.md` | — |
| F24 Matriz de migración | DONE | `MOSSOS_360_MIGRATION_MATRIX.md` | — |

## Lista exacta de BLOCKED

| # | Bloqueo | Gravedad | Qué lo desbloquea | Quién |
|---|---|---|---|---|
| B1 | Banco premium descargable sin Pase (`docs/datos/<oposición>.json` incluye `a` y `cita`) | Crítica | Servir el banco completo desde una función de Supabase que compruebe `mi_plan()` y publicar en `docs/datos/` solo la muestra gratuita | Propietario (despliegue y secretos) + cambio de código posterior |
| B2 | Generación de preguntas Mossos | Alta | Autorizar `juez-sesion-v3` (criterio `cita_suficiente`, `JUDGE_V2_DEFECTS.md`) y reanudar con lotes pequeños | Propietario |
| B3 | Leyes catalanas 4/2003, 10/1994, 16/1991 | Media | Incorporar su texto consolidado oficial (Portal Jurídic de Catalunya / DOGC) y verificar las citas | TestLey + revisión humana |
| B4 | Àmbit D (actualidad) | Media | No hay texto oficial de referencia: se queda sin preguntas (correcto) | — |
| B5 | Cola humana: 6 REVIEW_REQUIRED (S00017) y S00018 sin cerrar | Media | Revisión humana; publicación solo con aprobación explícita | Persona revisora |
| B6 | Psicotécnicos sin banco verificado | Baja | Fuente oficial de modelos de prueba; mientras, checklist | — |

## Criterios DONE (F22)

| Criterio | Cumple |
|---|---|
| Ningún camino publica sin `Banco.publicar()` | Sí |
| Generador sin control del veredicto/estado/confianza | Sí (campos reservados → incidencia) |
| Perfil declarativo, sin datos de oposición en el código | Sí |
| Cada dato oficial con cita literal y procedencia | Sí |
| OFFICIAL_EXAM nunca mezclado con TESTLEY_GENERATED | Sí |
| Leyes sin verificar nunca como oficiales | Sí |
| Módulos no medibles sin medición falsa | Sí |
| Tests de cada cambio y E2E en móvil/escritorio | Sí |
| Cobertura mínima por tema | **No** (18 temas PARCIAL, C.5 sin preguntas) |
| Banco premium protegido | **No** (B1) |

## Informes

`MOSSOS_360_COVERAGE_MATRIX.md` · `MOSSOS_360_SOURCES_REPORT.md` · `MOSSOS_360_QUESTIONS_REPORT.md` · `MOSSOS_360_JUDGE_SECURITY.md` · `MOSSOS_360_E2E_REPORT.md` · `MOSSOS_360_ARCHITECTURE.md` · `MOSSOS_360_MIGRATION_MATRIX.md`.
Regenerar: `python3 catalogo/perfil.py && python3 -m fabrica.cobertura mossos-esquadra && python3 scripts/informe_mossos360.py`.

## F19 · Seguridad premium (detalle)

- Estado: el Pase solo se comprueba en el navegador (`TL.puede`, `test.js → bloqueado()`). Cualquiera obtiene preguntas y respuestas de `docs/datos/*.json` con las herramientas del navegador.
- Lo nuevo de Mossos 360 no añade datos premium al JS público: `docs/datos/perfil-<id>.json` solo lleva datos oficiales públicos y recuentos, sin preguntas ni respuestas (test `build: perfil para el navegador sin preguntas ni respuestas`).
- Solución propuesta (no desplegada, requiere al propietario): función `banco` en Supabase que reciba `ley` y el JWT, llame a `mi_plan()` y devuelva el banco completo solo con Pase; `build.mjs` publicaría en `docs/datos/` solo las preguntas de muestra. Hasta entonces: **BLOCKED_FOR_PRODUCTION**.
- Además, el JSON público incluye campos internos (`legacy_*`, `reevaluation_*`) que no son premium pero conviene quitar al servir el banco desde la función.
