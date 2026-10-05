# Competency Engine + Psychometric foundation (Mossos 360 · Fase 2)

## Arquitectura

```
catalogo/preparacion/<id>.json → competencias (OFICIAL, cita literal, verificada contra las bases por catalogo/perfil.py)
        │
fabrica/competencias.py  (Competency Exercise Factory, separada de la fábrica de preguntas)
  GENERADOR (subagente redactor) → candidatas.json
  → VALIDADOR determinista (validar)
  → JUEZ independiente (subagentes con solo lectura de su tanda, tandas ≤ 10, prompt congelado
    fabrica/prompts/juez-competencias-v1.txt, guards y transcripción de fabrica/juez_v2.py)
  → VALID / REVIEW_REQUIRED / REJECTED
  → PUERTA (publicar): recalcula el veredicto desde las tandas aceptadas y exige candidatas idénticas a las juzgadas
        │
catalogo/competencias/<id>.json  (solo VALID, con traza) ── build.mjs ──► docs/datos/competencias-<id>.json (sin trazas)
        │
web/assets/competencias.js (TLCompetencias: perfiles, puntuación, cuestionario, estado)
web/assets/competencias-ui.js → /oposiciones/<id>/competencias/  (Competencias · Entrenamiento · Autoconocimiento · Progreso)
```

La página y la tarjeta de la ficha («Competencias y psicología») solo existen si el perfil tiene competencias oficiales verificadas **y** contenido publicado. Gate: `config.json → planes` (`competencias_completo`; `competencias_muestra` situaciones por competencia sin Pase).

## Modelo de datos

**CompetencyProfile** (`TLCompetencias.perfiles`):

| Campo | Procedencia |
|---|---|
| `id`, `opposition_id`, `call_id`, `official_name`, `clave`, `citation`, `official_source`, `verification_status` | **OFFICIAL_VERIFIED**: bases de la convocatoria |
| `official_definition` | `null` + `official_definition_note`: **las bases no definen las competencias** y TestLey no inventa una definición |
| `training` (explicación, cómo trabajarla), `observable_behaviours` | **TESTLEY_TRAINING** |
| `training_scenarios` | **TESTLEY_GENERATED** |
| `self_assessment_items`, `reflection_questions`, `interview_relevance` | TESTLEY_TRAINING |
| `interview_question_ids` | contrato para Interview Engine (Fase 3); vacío por ahora |

**Scenario**: `id`, `competency_id`, `formato` (`eleccion` | `ranking`), `situacion`, `contexto`, `pregunta`, `opciones[{texto, puntos{competencia: 0-2}}]`, `orden_recomendado` (ranking), `justificacion`, `expected_dimensions`, `dificultad`, `source_type: TESTLEY_GENERATED`, `generated_by`, `verification_status: VALID`, `interview_question_ids`, `traza`.

En la interfaz, cada ficha separa la caja **«Información oficial»** de la caja **«Entrenamiento TestLey»**.

## Puntuación (explicable y determinista)
Formatos priorizados: los que se pueden puntuar de forma fiable sin juicio humano.
- **Elección:** cada actuación tiene puntos (0-2) por dimensión. Las dimensiones son las competencias oficiales, usadas como **criterio de entrenamiento de TestLey, no como baremo del tribunal**.
  - Puntuación por dimensión = puntos de la actuación elegida / máximo de esa dimensión × 10.
  - Total = puntos totales de la elegida / máximo × 10.
- **Ranking:** 10 × (1 − distancia entre tu orden y el recomendado / 8), donde 8 es la distancia máxima entre dos órdenes de 4 elementos.
- Las respuestas abiertas (preguntas de reflexión) no se puntúan.

Resultado `OBJECTIVE_SCORE`: sirve para ver qué reforzar. No hay porcentajes de aprobado ni predicciones.

## Base psicométrica
Cuestionario de autopercepción: 2 ítems por competencia, uno directo y otro invertido, en escala 1-5.
- **Escala por competencia (1-10):** se recodifica el ítem invertido (6 − v), se hace la media y se multiplica por 2.
- **Consistencia:** diferencia en cada par de ítems. 0 es coherente y 4 contradictorio. Se marca para revisar si es ≥ 3.
- El resultado es `SELF_ASSESSMENT`. No tiene respuesta correcta, no es nota ni diagnóstico, y se muestra la evolución entre sesiones.

`OBJECTIVE_SCORE` y `SELF_ASSESSMENT` nunca se mezclan: van en columnas distintas del progreso, y `competency_strength` solo usa `OBJECTIVE_SCORE`.

## Contrato para el Adaptive Training Engine
`TLCompetencias.estado(op, data)` → por competencia:
- `competency_strength`: media de las últimas 10 `OBJECTIVE_SCORE`, o `null`;
- `competency_training_count`, `last_training`, `self_assessment` (aparte) y `recommended_next`.

Regla de `recommended_next`: primero las no entrenadas, con las clave delante; después la de menor fuerza.

## Persistencia
Local, en `localStorage` (`testley:competencias:v1`): ejercicios resueltos (id, competencia, formato, total, dimensiones, fecha) y sesiones de autopercepción (escalas y consistencia). No se crea ninguna base de datos ni migración. Más adelante necesitarán servidor la sincronización entre dispositivos y las sesiones de entrevista con IA (Fase 3), con una migración de Supabase que despliega el propietario.

## Relación con la entrevista (Fase 3)
Cada escenario y cada perfil llevan `competency_id` e `interview_question_ids` (vacío). Las preguntas de reflexión y `interview_relevance` son la base de las preguntas de trayectoria personal y profesional. El Interview Engine solo tendrá que rellenar `interview_question_ids`.

## Contenido publicado y calidad (Mossos 46/26)
- **10 fichas** (una por competencia oficial) y **60 situaciones**: 6 por competencia (4 de elección y 2 de ranking), dificultades 1-3 y contextos variados (trabajo, estudios, deporte, voluntariado, atención al público, prácticas en la academia).
- **C00001:** juez 70/70 VALID, pero **no se publicó**. La auditoría independiente vio que la actuación recomendada era la más larga en 44-48 de 60 situaciones (pista por longitud). El validador incorporó dos reglas (`es_mas_larga`, `posicion_longitud`): la recomendada como la más larga en ≤ 1/3 de las situaciones, y ninguna posición por longitud en más del 40 %.
- **C00002:** mismas situaciones y mismos puntos, con las longitudes reequilibradas (15/15/15/15 en cada posición). Validación limpia y un juicio nuevo completo: 70/70 VALID. Es lo **publicado** (`catalogo/competencias/mossos-esquadra.json`, con traza por item).
- Incidencias del juez, sin cambiar criterios ni prompt:
  - 2 tandas rechazadas por los guards (clave de criterio mal escrita) y repetidas con jueces nuevos;
  - 1 falso positivo del guard de valoraciones agregadas («diferente de las anteriores» al deduplicar), acotado con un test, con la misma respuesta registrada de nuevo (`fabrica/estado/incidencias-politica.json`).
- Límite honesto: el juez de competencias aprobó el 100 % en los dos lotes. La calidad se apoya en el validador determinista y en la auditoría independiente; antes de escalar el volumen conviene una revisión humana de una muestra.

## Política del juez versionada (2026-10-05)
`fabrica/politica_juez/competencias/` (registro + versiones inmutables). La versión activa es `juez-competencias-v2`: el modelo de referencia es Sonnet; los criterios y el prompt son los mismos que en v1 (sha 08bce888…).
- `python3 -m fabrica.competencias reevaluar <lote> <ronda>` crea una ronda nueva (`evaluacion-<ronda>.json`) y nunca sobrescribe las anteriores.
- Regla de combinación: VALID solo si el modelo de referencia dio VALID y ningún veredicto aceptado es más conservador; cualquier REJECTED gana; los dudosos van a REVIEW_REQUIRED.
