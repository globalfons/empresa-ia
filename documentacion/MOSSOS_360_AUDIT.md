# Mossos 360 · auditoría del repositorio (preparación integral)

Fecha: 2026-10-03. Sustituye a la auditoría F0 del 2026-10-02 (sigue en el historial de git). Método: inspección del código y de los datos reales, no de la documentación.

Fuente oficial principal: **Resolució ISP/1763/2026 (DOGC núm. 9681)**, convocatoria 46/26, guardada en `catalogo/fuentes/DOGC-1046460.txt` (sha256 en la ficha). Incluye los anexos 2 (barems físicos) y 3 (exclusiones). Otras fuentes: temario DOGC 7382, Guia d'estudi 2026 con esmenes, calendario y webs de mossos.gencat.cat, exámenes anteriores.

## Matriz

| # | Módulo | Estado | Qué existe | Qué falta | Fuente | Prioridad |
|---|---|---|---|---|---|---|
| 1 | Temario / conocimientos | **DONE** | 21 temas con alcance literal del DOGC (`catalogo/oposiciones/mossos-esquadra.json`, `catalogo/perfil.py`), guía con esmenes, páginas `/oposiciones/mossos-esquadra/tema-N/` | Leyes catalanas sin texto consolidado oficial (B3); Àmbit D sin fuente (B4) | DOGC 7382 · Guia d'estudi | — |
| 2 | Tests de conocimientos | **PARCIAL** | 99 preguntas servidas (`MOSSOS_360_KNOWLEDGE.md`); modos repaso, simulacro, fallos y tema (`web/assets/test.js`); repetición espaciada (`store.js`) | Cobertura: 460 necesidades (CoverageEngine). Fábrica en GENERATION_PAUSED a propósito | Guia d'estudi | Media (calidad > volumen) |
| 3 | Exámenes oficiales históricos | **DONE** | 9 exámenes y 290 OFFICIAL_EXAM separados (`datos/examens-oficials/mossos-esquadra.json`, `/examenes-oficiales/`) | — | mossos.gencat.cat | — |
| 4 | Aptitud verbal | **PARCIAL (sin banco)** | Estructura oficial verificada (80 preguntas, 35 min, mínimo 5, sin penalización). Motor `TLPsico`: validación, sesión y resultado por categoría (`web/assets/psicotecnicos.js`) | Esquema `AptitudeExercise` con estímulo, banco original, página de entrenamiento, modos contrarreloj y adaptativo, métricas de velocidad y errores recurrentes | Bases 6.1.1 b) | **Alta** |
| 5 | Aptitud numérica | PARCIAL (sin banco) | Igual que 4 | Igual que 4 (generable y verificable por cálculo) | Bases 6.1.1 b) | **Alta** |
| 6 | Razonamiento abstracto | PARCIAL (sin banco) | Igual que 4 | Estímulos visuales (SVG) | Bases 6.1.1 b) | **Alta** |
| 7 | Razonamiento espacial | PARCIAL (sin banco) | Igual que 4 | Estímulos visuales (rotaciones) | Bases 6.1.1 b) | **Alta** |
| 8 | Aptitud perceptiva | PARCIAL (sin banco) | Igual que 4 | Ejercicios de comparación y detección con tiempo | Bases 6.1.1 b) | **Alta** |
| 9 | Psicométricos | **INEXISTENTE (motor)** | Dato oficial: la 3a prova incluye un «test de competències» (`catalogo/preparacion/mossos-esquadra.json → adecuacion`) | Motor de cuestionarios, escalas y consistencia, solo como formación y sin diagnósticos | Bases 6.1.3 | Media |
| 10 | Personalidad | **INEXISTENTE** | Ninguna fuente oficial describe un test de personalidad propio | Solo familiarización y autoconocimiento, sin «respuestas correctas» ni porcentajes | — (no hay fuente oficial) | Baja |
| 11 | Competencias | **PARCIAL (datos oficiales)** | 10 competencias oficiales, 3 clave, escala 1-10 y regla de apto (≥ 50 y > 3 en las clave), verificadas (Fase 0) | Comportamientos observables (no oficiales: contenido de entrenamiento), ejercicios, autoevaluación e historial | Bases 6.1.3 | **Alta** |
| 12 | Entrevista | **PARCIAL (datos oficiales)** | Descripción oficial: entrevista por competencias, integrada con el test y apto/no apto. Tutor IA: función `supabase/functions/tutor` (legal, Haiku; **no activa**: `tutorUrl` vacío) | Motor de sesiones (escenario → pregunta → respuesta → análisis → competencias → mejora), banco de escenarios y rúbrica | Bases 6.1.3 | **Alta (prioritario)** |
| 13 | Pruebas físicas | **PARCIAL (datos oficiales)** | 3 pruebas, barems de hombres y mujeres, ponderación 33,33 %, mínimo 1 por ejercicio y total ≥ 5, verificados contra el Anexo 2 (Fase 0). Módulo checklist `prueba_fisica` | Registro de marcas, puntuación según barem, evolución y objetivos | Bases 6.1.2 + Anexo 2 | **Alta** |
| 14 | Catalán | **PARCIAL (datos oficiales)** | Requisito C1, exención, prueba (2 partes, 90 + 10 min, 70 %) e idiomas voluntarios verificados (Fase 0). Checklist `idiomas` | Estado del usuario (acreditado, exento o prueba) | Bases 6.1.4 | Media |
| 15 | Requisitos / exclusiones psicofísicas | **PARCIAL (informativo)** | Requisitos citados en la ficha; 14 capítulos del Anexo 3 verificados; aviso «TestLey no determina la aptitud médica» | Página informativa por convocatoria | Base 2 + Anexo 3 | Media |
| 16 | Seguimiento de convocatoria | **DONE** | Calendario oficial, vigilancia del DOGC y de la web (`catalogo/vigilar_gencat.py`), eventos tipificados, seguir 46/26 y alertas | — | DOGC, mossos.gencat.cat | — |
| 17 | Simulacros | **PARCIAL** | Simulacro de conocimientos con reparto por tema según los exámenes oficiales, reserva y sin repetidas | `SimulationProfile` multimódulo (aptitudinal; entrevista como práctica) | Bases 6.1.1 | Media |
| 18 | Plan adaptativo | **PARCIAL** | `TLMotor.hoy()` (repaso, débiles, nuevas, difíciles, simulacro, minutos) y `TLPlan` | Entradas aptitudinales, de competencias, entrevista y física; días hasta la prueba | Calendario oficial | Media |
| 19 | Estadísticas / progreso | **PARCIAL** | Estadísticas por ley y contexto, racha y logros (`store.js`), panel | Métricas por módulo (precisión y velocidad aptitudinal, competencias, entrevista, física); «Sin datos suficientes» | — | Media |
| 20 | Tutor / entrenador IA | **PARCIAL (no activo)** | Función `tutor` con clave en secretos, anclada al texto oficial, límite diario y Pase | Modo entrevista; despliegue del propietario (`tutorUrl`, `ANTHROPIC_API_KEY`) | — | Media |

## Reutilizable sin cambios
Catálogo y perfil (`OppositionProfile`), CoverageEngine, la fábrica con juez v3 y su puerta única, `TLMotor`, `TLPlan`, `TLPsico`, `store.js` (progreso, racha, logros, sesiones), vigilancia de fuentes, función `banco` (premium) y Tutor IA.

## Riesgos técnicos
1. **Premium:** el banco de conocimientos sigue en JSON público hasta que el propietario despliegue B1 (`PREMIUM_DEPLOYMENT.md`). Los contenidos nuevos premium (aptitudinal completo, entrevistas) no deben servirse íntegros en JSON público. Los ejercicios generados en el navegador con generadores deterministas no son un banco descargable, pero el gating sigue siendo del navegador: riesgo aceptado y documentado.
2. **IA de entrevista:** requiere la función `tutor` desplegada y la clave del modelo. Sin ella, el entrenador funciona con una rúbrica determinista explicable.
3. **Persistencia:** el progreso es local (`localStorage`) con sincronización a Supabase solo para el progreso de tests. Guardar sesiones de entrevista o marcas físicas en el servidor exige una migración de esquema que despliega el propietario: se diseña sin destruir datos y, mientras tanto, se guarda en local.
4. **Contenido aptitudinal:** prohibido copiar material comercial. Los ejercicios numéricos, abstractos, espaciales y perceptivos se generan con algoritmos deterministas cuya solución se calcula y se comprueba (solubilidad y unicidad). Los verbales requieren redacción y pasan por la puerta de revisión.
5. **Psicometría:** riesgo de presentar «aprobado/suspenso» de personalidad. Se modela como autoconocimiento, sin puntuación de aptitud.

## Arquitectura mínima
`catalogo/preparacion/<id>.json` (datos oficiales por convocatoria, con cita) → `catalogo/perfil.py → motor360` (OppositionProfile con 10 motores: knowledge, aptitude, psychometric, competency, interview, physical, language, medical_information, simulation, adaptive_training) → `docs/datos/perfil-<id>.json` → motores JS genéricos (`TLPsico`/aptitud, física, entrevista, competencias) y `TLMotor.hoy()`. Policía Nacional solo necesitará su propio `catalogo/preparacion/<id>.json`.
