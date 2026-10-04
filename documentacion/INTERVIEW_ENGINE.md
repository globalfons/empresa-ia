# Interview Engine (Mossos 360 · Fase 3)

Entrenador reutilizable de entrevista por competencias. La primera oposición que lo usa es Mossos d'Esquadra (convocatoria 46/26); cualquier otra lo activa en cuanto tenga **la prueba de entrevista oficial verificada**, sus **competencias oficiales verificadas** y **escenarios publicados** (`catalogo/entrevista/<id>.json`). No hay código específico de Mossos en el motor.

## Oficial frente a TestLey

| Qué | Procedencia | Dónde |
|---|---|---|
| Existencia de la entrevista, su objeto («desenvolupament personal i professional»), resultado apto/no apto, nombres de las 10 competencias y las 3 clave | **OFFICIAL_VERIFIED**: bases de la convocatoria (cita literal, fuente, `call_id`) | `catalogo/preparacion/mossos-esquadra.json` (Fase 0, verificado por `catalogo/perfil.py`) |
| Escenarios, preguntas, indicadores orientativos, errores frecuentes, repreguntas | **TESTLEY_TRAINING** | `catalogo/entrevista/mossos-esquadra.json` |
| Rúbrica de análisis y feedback | **Criterios de entrenamiento de TestLey** | `web/assets/entrevista.js` |
| Análisis complementario con IA | **IA**, etiquetado como tal | función `tutor`, modo `entrevista` |

Las bases **no publican preguntas, respuestas modelo ni criterios de puntuación** de la entrevista. TestLey no los inventa: nada se presenta como criterio del tribunal, no hay «respuesta correcta», no se calcula probabilidad de aprobar ni se predice el resultado, y no hay diagnóstico de personalidad ni de salud mental. Lo garantizan el validador (frases prohibidas), el juez (`sin_afirmaciones_oficiales`, `sin_diagnostico`), los tests y los avisos de la interfaz.

## Arquitectura

```
catalogo/preparacion/<id>.json → competencias + prueba de entrevista (OFICIAL, verificadas)
        │
fabrica/entrevista.py  (Interview Scenario Factory; reutiliza el circuito de fabrica/competencias.py)
  GENERADOR (subagente redactor, fabrica/entrevista/<lote>/prompt_redactor.txt) → candidatas.json
  → VALIDADOR determinista (validar)
  → JUEZ independiente (subagentes con solo lectura de su tanda, tandas ≤ 10, prompt congelado
    fabrica/prompts/juez-entrevista-v1.txt, guards 1:1, claves exactas, guard de respuestas agregadas)
  → VALID / REVIEW_REQUIRED / REJECTED (el más conservador entre lo que dice el juez y lo que se deduce de sus criterios)
  → PUERTA (publicar): solo VALID de tandas aceptadas, candidatas idénticas a las juzgadas y validación limpia
        │
catalogo/entrevista/<id>.json  (solo VALID, con traza) ── build.mjs ──► docs/datos/entrevista-<id>.json (sin trazas)
        │
web/assets/entrevista.js     (TLEntrevista: rúbrica, sesiones, informe, métricas, persistencia)
web/assets/entrevista-ui.js  → /oposiciones/<id>/entrevista/
```

Enlaces: tarjeta «Entrevista» en la ficha de la oposición y «Practicar la entrevista» en `/competencias/`.

### Validador determinista (`fabrica/entrevista.py → validar`)

- 1–3 `competency_ids`, todos oficiales y sin repetir (el primero es la competencia principal); ≥ 5 escenarios por competencia principal.
- `tipo` conductual («Explica'm una vegada que…») o situacional («Què faries si…»), categoría y dificultad admitidas.
- Pregunta de 20–220 caracteres terminada en «?» y no cerrada (sí/no); repregunta abierta.
- 3–5 indicadores orientativos de 15–140 caracteres (señales de una respuesta bien explicada, no una respuesta) y 2–3 errores frecuentes.
- Sin frases prohibidas: «respuesta correcta/modelo/ideal», «aprobarías», «probabilidad de aprobar», afirmaciones sobre lo que valora el tribunal, diagnósticos.
- Sin casi duplicados (Jaccard ≥ 0,45 sobre situación + pregunta) y sin campos reservados (`verification_status`, etc.).

### Juez independiente

Criterios: `coherente`, `realista`, `pregunta_abierta` (ni sí/no ni obvia), `indicadores_pertinentes` (no arbitrarios, no dictan una respuesta), `relevante` (la competencia se puede mostrar), `sin_afirmaciones_oficiales`, `sin_diagnostico`, `duplicado_de` (con la lista de preguntas parecidas de la misma competencia). Ante la duda: `false` → REVIEW_REQUIRED. Las tandas cuyo juez usa otra herramienta, lee otro fichero, omite ítems, escribe mal una clave o emite valoraciones agregadas se rechazan enteras y se relanzan con otro juez.

## Modelo de datos

- **InterviewProfile** (derivado en el build): `oposicion`, `call_id`, `competencias[{id, nombre, clave}]`, `oficial{citas, fuente, documento, verification_status}`.
- **InterviewScenario / InterviewQuestion**: `id`, `competency_ids`, `tipo`, `categoria`, `dificultad`, `contexto`, `situacion`, `pregunta`, `indicadores`, `errores_frecuentes`, `repregunta`, `opposition_id`, `call_id`, `source_type: TESTLEY_TRAINING`, `generated_by`, `verification_status: VALID`, `traza` (solo en el catálogo).
- **InterviewAnswer**: `{type: "text" | "voice", text, audio_reference, transcript}`. Hoy solo se usa `text`; una respuesta de voz se analiza por su `transcript` sin cambiar el motor (test incluido). El audio no está implementado.
- **InterviewEvaluation**: `scenario_id`, `tipo: INTERVIEW_OBJECTIVE_TRAINING_SCORE`, `answer_type`, `dimensiones`, `competency_scores`, `total`, `strengths`, `weaknesses`, `improvement_points`, `feedback`.
- **InterviewSession**: `id`, `user_id` (null en local), `opposition_id`, `call_id`, `started_at`, `completed_at`, `mode`, `scenario_ids`, `answers`, `evaluations`, `self_assessment`.

## Modos

| Modo | Preguntas | Selección |
|---|---|---|
| Práctica libre | 3 | de la competencia elegida |
| Entrevista mixta | 5 | una por competencia, empezando por las no practicadas o más débiles |
| Entrevista simulada | 8 | empieza por motivación y sigue como la mixta |
| Situaciones difíciles | 4 | categorías conflicto, presión, error, crítica y decisión |

Sin Pase: `entrevista_muestra` preguntas por sesión (`config.json → planes`); con el Pase (`entrevista_completa`), sesiones completas.

## Criterios de entrenamiento de TestLey (rúbrica)

Determinista y explicable: busca **indicios en el texto** (catalán o castellano), no entiende el contenido como una persona. Por eso se presenta siempre como orientativa.

| Dimensión | Qué mira |
|---|---|
| Claridad | extensión razonable (50–350 palabras), longitud media de frase, conectores que ordenan |
| Concreción | conductual: acciones en primera persona, situación concreta, datos; situacional: pasos concretos. Resta las generalidades («siempre», «normalmente») |
| Estructura | conductual: situación → acción → resultado → aprendizaje; situacional: qué haría → por qué → qué busca → qué haría si no funciona |
| Reflexión | aprendizaje, autocrítica, por qué |
| Relación con la pregunta | vocabulario compartido con la situación y la pregunta |
| Indicios de cada competencia | léxico asociado a la competencia + concreción |

`total` = media de las dimensiones y las competencias (0–10). Una respuesta más larga no puntúa más solo por longitud (claridad baja por encima de 350 palabras, el relleno no suma indicios, test incluido). Feedback en tres bloques: **Qué funciona** (≥ 7), **Qué falta** (≤ 4) y **Cómo mejorar** (consejo por dimensión débil). No hay respuesta modelo: se muestran los indicadores orientativos, los errores frecuentes y una repregunta posible.

**Dos resultados que nunca se mezclan:** `INTERVIEW_OBJECTIVE_TRAINING_SCORE` (la rúbrica) y `SELF_ASSESSMENT_SCORE` (los indicadores orientativos que la persona marca como presentes en su respuesta). Marcar indicadores no cambia la puntuación (test incluido).

## IA

Opcional y dependiente del Tutor IA. La función `supabase/functions/tutor` tiene un modo `entrevista` (Pase obligatorio, clave solo en secretos del servidor, escenario leído de la web publicada, respuesta del candidato tratada como dato y truncada a 3.000 caracteres) que devuelve un análisis etiquetado «Análisis generado por IA con criterios de entrenamiento de TestLey. No es la valoración del tribunal.». Su prompt prohíbe notas, probabilidades, diagnósticos y respuestas modelo. **Estado:** implementado y probado (`tests/deno/tutor_entrevista_test.ts`), pero el Tutor no está desplegado (`tutorUrl` vacío): la página muestra que el análisis con IA estará disponible cuando se active. La fase no depende de ello.

## Persistencia y progreso

Local: `localStorage["testley:entrevista:v1"] = {sesiones: [InterviewSession…]}` (máx. 50). Ya tiene la forma de las filas de servidor (`user_id`, `opposition_id`, `call_id`, timestamps), así que migrarlo es subir esas sesiones a una tabla `interview_sessions` sin cambiar el motor.

`TLEntrevista.metricas(op, data)` (para el panel 360 y el plan adaptativo): sesiones, competencias trabajadas x/10, media, última sesión, aspecto más débil (dimensión), competencia a reforzar, media por competencia, evolución. Sin datos devuelve `null`: nunca porcentajes inventados. El informe de sesión añade fortalezas, competencias a reforzar, errores recurrentes (dimensión baja en ≥ 2 respuestas), autoevaluación aparte y la diferencia con la sesión anterior.

## Reutilizar en otra oposición

1. Verificar en `catalogo/preparacion/<id>.json` la prueba de entrevista y las competencias (con citas literales).
2. Redactar un lote (`fabrica/entrevista/<lote>/candidatas.json`), `python3 -m fabrica.entrevista validar|preparar <lote>`, jueces independientes, `registrar`, `publicar`.
3. `npm run build`: la página y la tarjeta aparecen solas.

## Contenido publicado (lote E00001)

- **60 candidatos** (redactor independiente): 6 por competencia principal (4 conductuales + 2 situacionales), 14 categorías, dificultad 1/2/3 = 10/30/20, 40 con una competencia secundaria. Validación determinista limpia.
- **Juicio** en 6 tandas de 10. Tandas 01–05: juez Haiku, aceptadas (02 en el segundo intento). Tanda 06: tres jueces Haiku rechazados por el guard (escribían la clave `indicadores_pertinents`, en catalán); el cuarto intento, con **el mismo prompt congelado** y un modelo superior (Sonnet), se aceptó y el modelo queda en la traza de esa tanda (`judge_model`). El guard no se relajó.
- **Auditoría del lote** (`fabrica/entrevista/E00001/auditoria.json`, solo puede retener): similitud entre preguntas (Jaccard máx. 0,31; ningún duplicado), preguntas obvias, realismo y criterios arbitrarios. El sesgo por longitud de opciones no aplica: no hay opciones. Retenidos: `ent-autogestio-3` (solapa con `ent-autocontrol-3`) y `ent-resolucio-problemes-5` (contrastar versiones de un hecho se acerca a un procedimiento de investigación).
- **Resultado:** **55 VALID publicados**, 5 en REVIEW_REQUIRED (`ent-habilitats-socials-1`, `-2`, `-4` del juez; los 2 retenidos por la auditoría) y 0 REJECTED. Por competencia principal: 6 en 7 competencias, 5 en resolución de problemas y autogestión, 3 en habilidades sociales.
- **Observación de calibración:** los jueces Haiku aprobaron 50/50 y el juez Sonnet 7/10, con motivos razonables (un error frecuente que penaliza una respuesta sincera, una repregunta que presupone neutralidad, una competencia secundaria poco evaluable). Antes de ampliar el banco conviene recalibrar el juez (o rejuzgar las tandas 01–05 con el modelo superior). Hasta entonces el contenido publicado es VALID según el circuito vigente.
