# Mossos 360º — auditoría previa (Fase 0)

Fecha: 2026-10-02. Alcance: todo lo que toca la oposición Mossos d'Esquadra (mosso/a, convocatoria 46/26) y las piezas
genéricas que la sostienen. Regla aplicada: **no duplicar lo que ya existe**; las fases nuevas se construyen encima.

## 1. Lo que YA existe (no se reimplementa)

| Bloque | Dónde | Estado |
|---|---|---|
| Ficha de oposición data-driven | `catalogo/oposiciones/mossos-esquadra.json` (datos oficiales con cita literal y fuente) → `catalogo/construir.py` → `build.mjs` | Completo |
| Fuentes oficiales Generalitat | `ingesta/gencat.py`, `datos/fuentes-gencat.json` (sha256, retrieved/verified), `catalogo/fuentes/DOGC-*.txt` | Completo |
| Convocatoria 46/26 | ficha + `catalogo/convocatorias/DOGC-1046460.json` (citas reverificadas) | Completo (estado por fechas oficiales) |
| Temario oficial (21 temas, A–D) | `temario.temas` con `codigo`, ámbito por apartado de la guía (`catalogo/ambito_temas.py`) | Completo; leyes catalanas OFFICIAL_PENDING_REVIEW |
| Guía 2026 + esmenes | `ingesta/gencat.py` (`ESMENES`, `aplicar_esmenes`, hash por apartado, `revisar_preguntas_guia`) | Completo (sin campo ORIGINAL/CORRECTION/CURRENT explícito por apartado) |
| Exámenes oficiales | `ingesta/examens_mossos.py` → 9 exámenes, 290 OFFICIAL_EXAM, páginas `/examenes-oficiales/<id>/` | Completo |
| Separación OFFICIAL_EXAM / generado | tests `test_mossos`, `scripts/integridad_banco.py` | Completo |
| Fábrica + juez v2 | `fabrica/sesion.py`, `fabrica/juez_v2.py` (tandas ≤10, solo lectura, guards 1:1), política congelada con huella | Completo; calibración PASS_WITH_REVIEW, propuesta v3 pendiente |
| Exclusión de fuentes no verificadas | `motor.sin_fuente_verificada()` + `fabrica_excluir` | Completo |
| Dedup con exámenes oficiales | `banco.Banco.oficiales()` | Completo |
| Test por tema / ley / medida / fallos / repaso / simulacro / examen oficial | `web/assets/test.js` (`#test=repaso|simulacro|fallos|medida|tema-N`, modo oficial/estudi) | Completo |
| Repetición espaciada | `store.js` (`INTERVALOS` 0,1,3,7,16,35 días; `proximoRepaso`, `vencida`) | Completo |
| Errores | `/errores/` (`errores.js`) | Completo |
| Sesiones registradas | `store.registrarSesion(ley, n, ok, ko, blancos, modo, pen, segundos)` | Parcial: sin temas ni tipo de sesión normalizado |
| Plan de estudio | `web/assets/plan.js` (`TLPlan.generar`: fecha, días, horas, nivel, prioridad por dominio y fallos) | Completo (es el StudyPlanEngine; falta API de «plan de hoy» con minutos por bloque) |
| «Tu sesión de hoy» | `panel.js → seccionHoy` | Parcial: deriva del plan, sin desglose recuperación/debilidad/nuevo/simulación |
| Simulacro | `test.js → simulacro()` con `o.examen.simulacro` (preguntas, minutos, penalización) | Parcial: sin distribución temática ni pool de reserva ni control de repeticiones |
| Alertas | `vigilar_boe.py`, `vigilar_gencat.py` → `novedades.json`; seguir oposición (`store.sigo`), campana, `notificar`, Telegram | Completo para BOE/Mossos; eventos no tipificados como CALL_UPDATED… |
| Estructura del examen (incluye física, psicotècnics, entrevista, idiomes, català) | `examen.estructura` con cita literal de las bases | Datos completos; sin módulos de preparación propios |
| Admin | `/admin/oposiciones/<id>/quality/` (+ bloque Generalitat: fuentes, vigilancia, alertas, oficiales vs generadas, esmenes) | Parcial: faltan métricas agregadas (source_health, last_sync…) |
| Entitlement servidor | `supabase/esquema.sql → mi_plan()`, `lemon-webhook` | Existe, pero no protege los datos (ver riesgos) |
| E2E | `scripts/e2e-oposiciones.cjs` (17 pasos Mossos) | Parcial respecto al recorrido de 20 pasos pedido |

## 2. Incompleto

1. **Puerta única de publicación**: hoy publican tres caminos (`sesion.cerrar → banco.anadir`, `reevaluacion.aplicar`, `fabrica.revision`). Falta `Banco.publicar()` con todas las comprobaciones.
2. **Perfil declarativo**: los datos están en la ficha del catálogo, pero no hay un `OppositionProfile` normalizado (módulos de preparación, reglas de simulacro, calendario, tipos de contenido) que lean los motores.
3. **TODAY_PLAN** con desglose (repaso / debilidad / nuevo / simulación) y minutos recomendados: hoy es una lista de tareas.
4. **SimulationEngine** con distribución por tema, reserva y anti-repetición.
5. **Tipos de sesión** normalizados (QUICK_TEST, TRAINING, WEAKNESS, REVIEW, SIMULATION, OFFICIAL_EXAM, CUSTOM) con temas y puntuación.
6. **Coverage Engine** con necesidades concretas («N preguntas de tipo X del tema Y sobre los apartados Z»): hay brecha por tema (`scripts/brecha_preguntas.py`) y planificador por artículo, no el informe de necesidades por tipo/dificultad.
7. **Eventos de convocatoria tipificados** (CALL_UPDATED, CALL_DEADLINE_CHANGED, EXAM_DATE_CHANGED, NEW_OFFICIAL_DOCUMENT, NEW_CORRECTION, NEW_TRIBUNAL_NOTICE).
8. **Trazabilidad de esmenes** ORIGINAL → CORRECTION → CURRENT_VALUE por apartado.

## 3. Inexistente

- Módulos de preparación más allá del test (física, psicotècnics, adequació psicoprofessional, entrevista, català, requisitos, documentación, calendario) con checklist/registro manual.
- Matriz de migración para las otras 5 oposiciones.
- Protección real del banco premium (ver riesgos).

## 4. Dependencias

- Juez: generación nueva de Mossos depende de autorizar **juez-sesion-v3** (criterio de cita suficiente; `JUDGE_V2_DEFECTS.md`). Fábrica en **GENERATION_PAUSED**.
- Leyes catalanas (Llei 10/1994, 4/2003, 16/1991): sin texto consolidado oficial verificado → OFFICIAL_PENDING_REVIEW.
- Protección premium: requiere desplegar una función en Supabase (cuenta del propietario).

## 5. Riesgos y contradicciones

| Riesgo | Gravedad | Decisión |
|---|---|---|
| **El banco completo con respuestas está en `docs/datos/*.json` público** (17 MB). El bloqueo del Pase es solo del navegador (`test.js → bloqueado()`, `TL.puede`). Un usuario sin Pase obtiene todo con DevTools. | Crítica | **BLOCKED_FOR_PRODUCTION**. No se finge protección. Se documenta la solución (servir el banco premium desde una función de Supabase que compruebe `mi_plan()`), que requiere despliegue del propietario. |
| Contradicción del encargo: pide `/oposiciones/mossos/`; la URL canónica existente es `/oposiciones/mossos-esquadra/` (indexada, enlazada). | Media | No se crea una URL duplicada: se mejora la existente (regla del proyecto: sin URLs artificiales). |
| Generar preguntas Mossos con el juez v2 tal cual | Alta | No se genera: GENERATION_PAUSED hasta v3 (el 10 % de VALID de v2 tenía cita insuficiente). |
| Módulos físicos/psicotécnicos sin medición real | Media | Solo checklist, planificación y registro manual con la cita oficial; ninguna nota inventada. |

## 6. Archivos afectados (previsión)

`fabrica/banco.py`, `fabrica/sesion.py`, `fabrica/reevaluacion.py`, `fabrica/revision.py`, `catalogo/perfil.py` (nuevo), `catalogo/perfiles/` (nuevo, generado), `catalogo/vigilar_gencat.py`, `fabrica/cobertura.py` (nuevo), `web/assets/motores.js` (nuevo), `web/assets/test.js`, `web/assets/panel.js`, `web/assets/preparacion.js` (nuevo), `build.mjs`, `scripts/e2e-oposiciones.cjs`, tests nuevos.

## 7. Criterios de aceptación por bloque

| Bloque | Aceptado cuando |
|---|---|
| Fase 1 · publicación | Ningún camino escribe en el banco sin `Banco.publicar()`; tests de seguridad cubren estado ≠ VALID, campos reservados, cita no literal, fuente no verificada, política/juez ausentes, duplicado, deprecated |
| Fases 2–3 · perfil | `catalogo/perfiles/mossos-esquadra.json` generado solo desde la ficha oficial; cada dato oficial conserva cita y procedencia; test de esquema |
| Fase 4 · convocatoria | Estados CURRENT_CALL/HISTORICAL_CALL/OFFICIAL_EXAM/TESTLEY_GENERATED en el perfil; eventos tipificados en `novedades.json`; test |
| Fase 5–6 · temario/guía | Cada tema con fuente, cobertura y estado; esmenes con ORIGINAL/CORRECTION/CURRENT; tests |
| Fases 8–9 · cobertura | Informe de necesidades por tema/tipo/dificultad; sin generar (pausa) |
| Fases 10–14 · motores | `TLTraining.hoy()` con desglose y minutos; simulacro por perfil con distribución y reserva; tipos de sesión; módulos de preparación con checklist; tests JS |
| Fases 16–18 · web/admin | Landing, panel y admin muestran lo anterior; E2E 20 pasos en móvil y escritorio |
| Fase 19 · premium | Documentado como BLOCKED con solución; nada nuevo premium en JS público |
| Fases 20–24 | Todo verde; `MOSSOS_360_STATUS.md` con READY/NOT READY honesto; matriz de migración |
