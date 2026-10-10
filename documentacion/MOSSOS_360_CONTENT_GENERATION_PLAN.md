# Mossos 360 · Content Generation Plan

Generado por `python3 -m fabrica.cobertura360 informe mossos-esquadra` a partir de `MOSSOS_360_CONTENT_COVERAGE.md` (mismos datos). Fábrica de preguntas: **ACTIVE**: las tandas de conocimientos quedan preparadas pero NO se ejecutan hasta levantar la pausa (`python3 -m fabrica.motor --reanudar` tras revisar las métricas, como exige la fábrica).

Orden: primero lo que corrige fuentes y calidad (P0 de fuentes, recalibración), después la cobertura P0/P1 y por último la ampliación. Tamaño de tanda de conocimientos = `lote.tamano_inicial` de la fábrica (10) tras una pausa.

Siguientes tandas en cualquier momento: `python3 -m fabrica.cobertura360 siguientes mossos-esquadra --n 3`.

## Lotes recientes de la fábrica

| lote | generadas | VALID | REVIEW_REQUIRED | REJECTED | política del juez |
|---|---|---|---|---|---|
| S00045 | 49 | 39 | 7 | 3 | juez-sesion-v4 |
| S00046 | 47 | 42 | 5 | 0 | juez-sesion-v4 |
| S00048 | 50 | 45 | 4 | 1 | juez-sesion-v4 |
| S00050 | 47 | 40 | 5 | 2 | juez-sesion-v4 |
| S00051 | 46 | 38 | 5 | 3 | juez-sesion-v4 |

- **S00022 · RETENIDO_DEFINITIVO** (2026-10-06): ALL_VALID_SIN_EVIDENCIA (juez_v2.resultado → evidencia_individual). No se publica ni se rejuzga; evidencia en `fabrica/estado/retenidos/S00022/DECISION.json`.
- **S00037 · RETENIDO** (2026-10-06): ALL_VALID_SIN_EVIDENCIA (juez_v2.resultado → evidencia_individual). No se publica ni se rejuzga; evidencia en `fabrica/estado/retenidos/S00037/DECISION.json`.
- **S00038 · RETENIDO** (2026-10-06): ALL_VALID_SIN_EVIDENCIA (juez_v2.resultado → evidencia_individual). No se publica ni se rejuzga; evidencia en `fabrica/estado/retenidos/S00038/DECISION.json`.
- **S00041 · RETENIDO** (2026-10-06): ALL_VALID_SIN_EVIDENCIA (juez_v2.resultado → evidencia_individual). No se publica ni se rejuzga; evidencia en `fabrica/estado/retenidos/S00041/DECISION.json`.
- **S00047 · RETENIDO** (2026-10-06): ALL_VALID_SIN_EVIDENCIA (juez_v2.resultado → evidencia_individual). No se publica ni se rejuzga; evidencia en `fabrica/estado/retenidos/S00047/DECISION.json`.
- **S00049 · RETENIDO** (2026-10-06): ALL_VALID_SIN_EVIDENCIA (juez_v2.resultado → evidencia_individual). No se publica ni se rejuzga; evidencia en `fabrica/estado/retenidos/S00049/DECISION.json`.

| área | prioridad | elementos planificados |
|---|---|---|
| APTITUDE | P1 | 60 |
| KNOWLEDGE | P0 | 0 |

## BATCH MOSSOS-SOURCES-001

- prioridad: P0 · tipo: fuentes · ejecutable ahora: no — requiere fuentes oficiales (trabajo de ingesta, no generación)
- temas: D
- cantidad: 0
- accion: verificar o fijar la fuente oficial de los apartados bloqueados (texto oficial en catalogo/fuentes, fabrica.fuente); el tema D no tiene documento de referencia oficial: no se genera hasta tenerlo
- validacion: catalogo/perfil.py → verificar_bloque / fabrica.fuente
- judge: —
- criterio de publicación: no aplica

## BATCH MOSSOS-APTITUDE-VERBAL-001

- prioridad: P1 · tipo: banco_revisado · ejecutable ahora: no — requiere revisor humano de catalán
- temas: verbal
- subtemas: vocabulario/sinónimos, antónimos, analogías, comprensión de frases
- cantidad: 60 (3 dificultades × 4 formatos × 5 ítems: mínimo para practicar cada formato sin repetir en una sesión)
- fuente: ninguna oficial (las bases no publican ejercicios): contenido TESTLEY_GENERATED
- validacion: respuesta única comprobable (diccionario normativo IEC/DIEC como referencia), 4 opciones, sin ambigüedad
- judge: juez independiente + REVISIÓN HUMANA obligatoria (decisión de la Fase 1: la verbal semántica no se verifica por cálculo)
- criterio de publicación: solo tras revisión humana

