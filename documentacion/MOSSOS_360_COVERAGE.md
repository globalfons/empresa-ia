# Mossos 360 · cobertura antes y después (generación controlada)

Fuente: `catalogo/perfiles/mossos-esquadra.json` y `documentacion/cobertura-mossos-esquadra.json` (CoverageEngine), en el commit anterior a la fase (8d34852b51~1) y ahora. La matriz completa por tema está en `MOSSOS_360_COVERAGE_MATRIX.md`, que se genera.

| | Antes de la fase | Tras S00017-v3 + S00019 | Ahora (tras S00020) |
|---|---|---|---|
| TESTLEY_GENERATED servidas | 82 | 87 | **103** |
| En revisión humana | 6 | 11 | 11 |
| Necesidades del CoverageEngine | 479 | 472 | **456** |
| Dificultad 1 / 2 / 3 / sin dato | 22 / 35 / 2 / 23 | 23 / 39 / 2 / 23 | 29 / 49 / 2 / 23 |
| Estado de la fábrica | GENERATION_PAUSED | ACTIVE (v3) | **GENERATION_PAUSED** (métricas S00020) |

La reevaluación v3 de S00017 retiró 3 preguntas y mandó 5 a revisión. Por eso el total sube 21 y no 27, aunque se publicaron 27 nuevas.

## Temas trabajados (orden C.5 → C.3 → C.2)

| Tema | Antes | Ahora | Apartados cubiertos en los lotes |
|---|---|---|---|
| C.5 | 0 | **12** | C.5.1, C.5.2, C.5.3, C.5.IF |
| C.3 | 2 | **12** | C.3.4, C.3.5 (+ C.3.x de S00019); C.3 pierde guia-mossos-41/42, bloqueadas por depender de leyes catalanas |
| C.2 | 2 | **5** | C.2.3, C.2.6; C.2.2 omitido (sin contenido examinable) |

## Control de sobreexplotación
- Plan en *round-robin* por apartado (`slots_desde_cobertura`) con un tope `k` por apartado; los apartados omitidos se saltan.
- Deduplicación por apartado y, desde S00020, entre las «Idees força» y los apartados de su tema.
- Dificultad: S00020 planificó 14 de dificultad 2 y 6 de dificultad 1. **Hueco**: no hay preguntas nuevas de dificultad 3, porque `caso_practico` y `relacion_articulos` exigen revisión humana en esta fase.
- Concentración: B.3 sigue concentrando 35 preguntas (histórico); los lotes nuevos no tocan B.3.

## Huecos de fuente (no son de generación)
- Àmbit D: `tipo_gap: FUENTE` (OFFICIAL_PENDING_REVIEW).
- Leyes catalanas 4/2003, 10/1994 y 16/1991: FOUND_OFFICIAL_NON_CONSOLIDATED. Sus apartados están excluidos de la fábrica y bloqueados en la puerta.
