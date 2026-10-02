# Mossos 360 · seguridad del juez y de la publicación (F1)

## Puerta única
`fabrica/banco.py → Banco.verificar_publicacion(slug, q)` / `Banco.publicar()` es el único camino al banco:
`sesion.cerrar → banco.anadir → publicar`, `revision.decidir → publicar`, `reevaluacion.aplicar → verificar_publicacion(republicar=True)` (si falla, la pregunta se queda en REVIEW_REQUIRED_REEVALUATION con el motivo).

| Comprobación | Bloquea si… |
|---|---|
| Campos reservados | la candidata trae `verdict`, `status`, `confidence`, `publication_state`, `veredicto`, `respaldada`, `published`… → además **incidencia** en `fabrica/estado/incidencias-politica.json` |
| Estructura | enunciado < 10, ≠ 4 opciones distintas, respuesta fuera de 0-3, cita < 12, sin artículo |
| Estado | REJECTED, DEPRECATED, OUTDATED, REVIEW_REQUIRED(_REEVALUATION) sin aprobación humana |
| Veredicto | falta o no es VALID (un veredicto ausente nunca es VALID: REVIEW_REQUIRED) |
| Identidad del juez | falta `judge_model`/`judge`, o versión/huella sha256 de la política distinta de la congelada en el registro |
| Fuente | ley inexistente, artículo sin texto, fuente en `sin_fuente_verificada()` (p. ej. leyes catalanas), cita no literal |
| Duplicado | mismo enunciado y respuesta que otra publicada o que una pregunta OFFICIAL_EXAM del mismo apartado |

## Independencia del juez
- El juez v2 solo lee su tanda (≤ 10): `question_id, norma, art, texto, q, o, a, cita, parecidas`; nada del generador (test).
- Guards: JSON estricto, IDs 1:1, motivo ≥ 20 caracteres y distinto, `criteria_checked`, fusión conservadora; ALL_VALID → revisión.
- Política congelada con huella; si cambia durante un lote → `PoliticaBloqueada` + incidencia.

## Tests
`tests/test_publicacion.py` (12) · `tests/test_juez_v2.py` (18) · `tests/test_juez_independiente.py` (12). Todos OK.
El test de política congelada ya no escribe en el registro real de incidencias (antes añadía entradas «prueba»).

## Pendiente
Juez v3 (`cita_suficiente`, `JUDGE_V2_DEFECTS.md`) propuesto, no aplicado: requiere autorización. Hasta entonces GENERATION_PAUSED.
