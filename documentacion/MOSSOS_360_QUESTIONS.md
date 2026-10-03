# Mossos 360 · preguntas: lotes, métricas y auditoría

## B5 · S00017 y S00018
| Lote | Veredictos previos | Evaluación válida | Resultado aplicado |
|---|---|---|---|
| S00017 | v1 contaminados (aprobación por defecto con scripts): legacy | `S00017-v3`: 37 VALID / 3 REVIEW / 3 REJECTED | `reevaluacion.aplicar(..., publicar_nuevas=False)`: 35 VALID siguen servidas; 5 → REVIEW_REQUIRED_REEVALUATION (guia-mossos-5, 19 y 28 por cita insuficiente; 41 y 42 bloqueadas por la puerta, porque dependen de leyes catalanas); 3 → DEPRECATED (0, 22 y 38). **Nada nuevo publicado** |
| S00018 | v1 inválidos | `S00018-v3`: 55 VALID / 3 REVIEW / 1 REJECTED (duplicado Tarraco) | **Sigue cerrado y sin publicar.** Antes de una autorización humana hay que deduplicarlo de nuevo: unas 7 preguntas repiten hechos publicados después en S00019 (C.5.1, Europol, OCN, REC(2001)10) |

Las 6 REVIEW_REQUIRED de S00017 siguen en la cola humana, sin publicar.

## Métricas por lote (`fabrica/estado/metricas-lotes.json`, calculadas con `scripts/metricas_lote.py`)
| | S00019 | S00020 |
|---|---|---|
| planificadas / generadas | 15 / 11 | 20 / 16 |
| validated | 11 (100 %) | 16 (100 %) |
| judge_valid / review / rejected | 11 / 0 / 0 | 16 / 0 / 0 |
| published | 11 (100 %) | 16 (100 %) |
| duplicate | 0 | 1 (de auditoría: guia-mossos-67 ≈ 51) · 6,2 % |
| citation_errors / source_errors | 0 / 0 | 0 / 0 |
| security_incidents / process_incidents | 0 / 0 | 0 / 1 |
| auditoría (CRITICAL / MAJOR / MINOR) | 0 / 0 / 1 | 0 / 0 / 2 |
| decisión | OK_SIGUIENTE_TANDA | **PAUSE_GENERATION** |

IDs publicados: S00019 → guia-mossos-43…53 · S00020 → guia-mossos-54…69. Cada uno lleva `judge_evaluation`, `judge_question_id`, `judge_prompt_sha256`, `judge_session_id`, `judged_at`, `judge_model` y la política.

## Auditoría del operador (`fabrica/estado/auditoria-lotes.json`)
La hizo la sesión que dirige la fábrica, que no es ni el juez ni el redactor. Leí las 27 preguntas contra su cita. **No hay errores de contenido.**
- guia-mossos-44 (MINOR): las palabras absolutas solo aparecen en los distractores.
- guia-mossos-66 (MINOR): caso límite de trivialidad (número y fecha del decreto de estructura).
- guia-mossos-67 (MINOR, duplicado): repite el hecho de guia-mossos-51. Se propone retirarla, pero lo decide una persona; el veredicto del juez no se toca.

## Trazabilidad e invalidación
- Toda pregunta nueva se puede invalidar con `reevaluacion.aplicar` (VALID → servida; REVIEW → REVIEW_REQUIRED_REEVALUATION; REJECTED → DEPRECATED) o por decisión humana con `revision.decidir`. Ambas pasan por la puerta.
- Editar la pregunta, el veredicto o la respuesta archivada impide publicarla (tests `VeredictoTrazable`).
- La calibración del juez (CAL50) no usa preguntas de estos lotes: no se contamina.
