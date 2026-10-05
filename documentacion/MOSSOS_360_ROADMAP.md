# Mossos 360 · roadmap (ajustado a lo que ya existe)

| Fase | Contenido | Estado |
|---|---|---|
| **0** | Auditoría; datos oficiales por convocatoria (`catalogo/preparacion/mossos-esquadra.json`: aptitud, física con barems, competencias, adecuación, català, idiomas, médica), verificados contra las bases; `motor360` en el perfil y en el navegador; informe de cobertura real (`MOSSOS_360_KNOWLEDGE.md`) | **DONE** |
| 1 | **Aptitude Engine**: esquema `AptitudeExercise` (con `stimulus`); generadores deterministas originales para numérico, abstracto, espacial y perceptivo, con solución calculada; validador de solubilidad y unicidad; verbal por la puerta de revisión; página de entrenamiento con modos por categoría, dificultad, mixto, contrarreloj y adaptativo; métricas de precisión, velocidad y errores recurrentes | **DONE** (verbal semántica pendiente de un banco revisado; `APTITUDE_ENGINE.md`) |
| 2 | Competency + Psychometric: fichas de entrenamiento de las 10 competencias oficiales (contenido TESTLEY_TRAINING, no oficial), autoevaluación e historial; motor de cuestionarios con escalas y consistencia, sin respuestas correctas ni diagnósticos | **DONE** (`COMPETENCY_ENGINE.md`) |
| **3** | **Interview Engine**: `InterviewSession`/`InterviewAnswer` (texto; voz preparada con `transcript`), escenarios TESTLEY_TRAINING por competencia oficial (fábrica con juez independiente y auditoría que solo retiene), modos práctica/mixta/simulada/difíciles, rúbrica explicable (claridad, concreción, estructura, reflexión, relación, indicios por competencia) con Qué funciona / Qué falta / Cómo mejorar, SELF_ASSESSMENT aparte, informe y métricas reales; IA opcional con la función `tutor` (modo `entrevista`) cuando esté desplegada | **DONE** (`INTERVIEW_ENGINE.md`; IA pendiente del despliegue del Tutor) |
| **3.5** | **Consolidación de contenido**: juez de entrevista calibrado (política `juez-entrevista-v2`, Sonnet como referencia, prompt congelado), regla determinista v2, auditoría real de cobertura 360 (`fabrica/cobertura360.py` → `MOSSOS_360_CONTENT_COVERAGE.md`), objetivos razonados y plan de generación por tandas (`MOSSOS_360_CONTENT_GENERATION_PLAN.md`, `siguientes`) | **DONE** |
| 4 | Physical Training Engine: registro de marcas, puntuación según el barem de la convocatoria (`call_id`), mejor marca, evolución, objetivo, proximidad al mínimo y recomendaciones | Siguiente (pendiente de autorización) |
| 5 | Simulation + Adaptive: `SimulationProfile` (conocimientos y aptitudinal reproducibles; entrevista como práctica); `TLMotor.hoy()` con todos los módulos y días hasta la prueba | Pendiente |
| 6 | Dashboard/UX: centro Mossos 360 en `/oposiciones/mossos-esquadra/` (la URL canónica; no se crea `/mossos-desquadra/`) y panel con barras solo desde métricas reales | Pendiente |
| 7 | Hardening: gates premium por configuración (`config.json → planes`), revisión de seguridad, QA a 375 px, `MOSSOS_360_READINESS.md` con evidencia | Pendiente |

Fábricas: cada tipo de contenido tiene su circuito GENERATE → VALIDATE → JUDGE/REVIEW → PUBLISH, y el generador nunca fija su estado:
- **Preguntas:** la fábrica actual.
- **Aptitud:** generadores deterministas con verificación computacional; los verbales pasan por revisión.
- **Escenarios de entrevista y ejercicios de competencias:** contenido de entrenamiento; solo se publica lo VALID del juez de referencia de la política activa (tandas ≤ 10, solo lectura, prompt congelado), sin veredicto más conservador de otra ronda y sin retención en la auditoría del lote; lo dudoso queda en REVIEW_REQUIRED para revisión humana.
- **Qué generar después:** `python3 -m fabrica.cobertura360 siguientes mossos-esquadra` (por prioridad; las tandas de conocimientos no se ejecutan mientras la fábrica esté en GENERATION_PAUSED).
