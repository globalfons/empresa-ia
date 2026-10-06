# Mossos 360 · Content Generation Plan

Generado por `python3 -m fabrica.cobertura360 informe mossos-esquadra` a partir de `MOSSOS_360_CONTENT_COVERAGE.md` (mismos datos). Fábrica de preguntas: **ACTIVE**: las tandas de conocimientos quedan preparadas pero NO se ejecutan hasta levantar la pausa (`python3 -m fabrica.motor --reanudar` tras revisar las métricas, como exige la fábrica).

Orden: primero lo que corrige fuentes y calidad (P0 de fuentes, recalibración), después la cobertura P0/P1 y por último la ampliación. Tamaño de tanda de conocimientos = `lote.tamano_inicial` de la fábrica (10) tras una pausa.

Siguientes tandas en cualquier momento: `python3 -m fabrica.cobertura360 siguientes mossos-esquadra --n 3`.

## Lotes recientes de la fábrica

| lote | generadas | VALID | REVIEW_REQUIRED | REJECTED | política del juez |
|---|---|---|---|---|---|
| S00023 | 17 | 14 | 3 | 0 | juez-sesion-v4 |
| S00024 | 2 | 2 | 0 | 0 | juez-sesion-v4 |
| S00025 | 1 | 1 | 0 | 0 | juez-sesion-v4 |
| S00026 | 30 | 28 | 2 | 0 | juez-sesion-v4 |
| S00027 | 49 | 44 | 5 | 0 | juez-sesion-v4 |

- **S00022 · RETENIDO_DEFINITIVO** (2026-10-06): ALL_VALID_SIN_EVIDENCIA (juez_v2.resultado → evidencia_individual). No se publica ni se rejuzga; evidencia en `fabrica/estado/retenidos/S00022/DECISION.json`.

| área | prioridad | elementos planificados |
|---|---|---|
| APTITUDE | P1 | 60 |
| COMPETENCIES | P1 | 54 |
| INTERVIEW | P1 | 4 |
| KNOWLEDGE | P0 | 0 |
| KNOWLEDGE | P1 | 120 |
| KNOWLEDGE | P2 | 41 |

## BATCH MOSSOS-SOURCES-001

- prioridad: P0 · tipo: fuentes · ejecutable ahora: no — requiere fuentes oficiales (trabajo de ingesta, no generación)
- temas: D
- cantidad: 0
- accion: verificar o fijar la fuente oficial de los apartados bloqueados (texto oficial en catalogo/fuentes, fabrica.fuente); el tema D no tiene documento de referencia oficial: no se genera hasta tenerlo
- validacion: catalogo/perfil.py → verificar_bloque / fabrica.fuente
- judge: —
- criterio de publicación: no aplica

## BATCH MOSSOS-KNOWLEDGE-001

- prioridad: P1 · tipo: generacion · ejecutable ahora: sí
- temas: C.2
- subtemas: C.2.2, C.2.3, C.2.4, C.2.7
- cantidad: 10
- dificultad: {"1": 3, "2": 2}
- tipos: {"literal": 2, "organos": 3, "plazos": 3, "aplicacion": 2}
- fuente: guia-mossos:C.2.2, guia-mossos:C.2.3, guia-mossos:C.2.4, guia-mossos:C.2.7
- validacion: fabrica.validacion (estructura, respuesta única, cita literal, duplicados) + fabrica.fuente
- judge: juez independiente con la política activa (fabrica/politica_juez/registro.json), tandas de solo lectura
- criterio de publicación: solo VALID por la puerta de la fábrica (fabrica.sesion/motor); REVIEW_REQUIRED a revisión humana

## BATCH MOSSOS-KNOWLEDGE-002

- prioridad: P1 · tipo: generacion · ejecutable ahora: sí
- temas: C.2
- subtemas: C.2.2, C.2.3, C.2.4, C.2.7, C.2.IF
- cantidad: 10
- dificultad: {"2": 2}
- tipos: {"competencias": 2, "conceptual": 2, "negativa": 2, "procedimiento": 2, "requisitos": 2}
- fuente: guia-mossos:C.2.2, guia-mossos:C.2.3, guia-mossos:C.2.4, guia-mossos:C.2.7, guia-mossos:C.2.IF
- validacion: fabrica.validacion (estructura, respuesta única, cita literal, duplicados) + fabrica.fuente
- judge: juez independiente con la política activa (fabrica/politica_juez/registro.json), tandas de solo lectura
- criterio de publicación: solo VALID por la puerta de la fábrica (fabrica.sesion/motor); REVIEW_REQUIRED a revisión humana

## BATCH MOSSOS-KNOWLEDGE-003

- prioridad: P1 · tipo: generacion · ejecutable ahora: sí
- temas: C.2
- subtemas: C.2.2, C.2.3, C.2.4
- cantidad: 6
- dificultad: {"3": 3}
- tipos: {"caso_practico": 3, "dificil": 3}
- fuente: guia-mossos:C.2.2, guia-mossos:C.2.3, guia-mossos:C.2.4
- validacion: fabrica.validacion (estructura, respuesta única, cita literal, duplicados) + fabrica.fuente
- judge: juez independiente con la política activa (fabrica/politica_juez/registro.json), tandas de solo lectura
- criterio de publicación: solo VALID por la puerta de la fábrica (fabrica.sesion/motor); REVIEW_REQUIRED a revisión humana
- revisión humana obligatoria (tipo de pregunta con revisión obligatoria)

## BATCH MOSSOS-KNOWLEDGE-004

- prioridad: P1 · tipo: generacion · ejecutable ahora: sí
- temas: C.3
- subtemas: C.3.1, C.3.2, C.3.IF
- cantidad: 10
- dificultad: {"1": 2, "2": 1}
- tipos: {"literal": 1, "organos": 1, "plazos": 2, "aplicacion": 1, "comparativa": 1, "competencias": 1, "conceptual": 1, "negativa": 1, "requisitos": 1}
- fuente: guia-mossos:C.3.1, guia-mossos:C.3.2, guia-mossos:C.3.IF
- validacion: fabrica.validacion (estructura, respuesta única, cita literal, duplicados) + fabrica.fuente
- judge: juez independiente con la política activa (fabrica/politica_juez/registro.json), tandas de solo lectura
- criterio de publicación: solo VALID por la puerta de la fábrica (fabrica.sesion/motor); REVIEW_REQUIRED a revisión humana

## BATCH MOSSOS-KNOWLEDGE-005

- prioridad: P1 · tipo: generacion · ejecutable ahora: sí
- temas: C.3
- subtemas: C.3.1, C.3.3, C.3.IF
- cantidad: 6
- dificultad: {"3": 3}
- tipos: {"caso_practico": 3, "dificil": 3}
- fuente: guia-mossos:C.3.1, guia-mossos:C.3.3, guia-mossos:C.3.IF
- validacion: fabrica.validacion (estructura, respuesta única, cita literal, duplicados) + fabrica.fuente
- judge: juez independiente con la política activa (fabrica/politica_juez/registro.json), tandas de solo lectura
- criterio de publicación: solo VALID por la puerta de la fábrica (fabrica.sesion/motor); REVIEW_REQUIRED a revisión humana
- revisión humana obligatoria (tipo de pregunta con revisión obligatoria)

## BATCH MOSSOS-KNOWLEDGE-006

- prioridad: P1 · tipo: generacion · ejecutable ahora: sí
- temas: B.2
- subtemas: B.2.2, B.2.4, B.2.5, B.2.IF
- cantidad: 10
- dificultad: {"1": 2, "2": 1}
- tipos: {"literal": 2, "organos": 3, "plazos": 2, "aplicacion": 2, "competencias": 1}
- fuente: guia-mossos:B.2.2, guia-mossos:B.2.4, guia-mossos:B.2.5, guia-mossos:B.2.IF
- validacion: fabrica.validacion (estructura, respuesta única, cita literal, duplicados) + fabrica.fuente
- judge: juez independiente con la política activa (fabrica/politica_juez/registro.json), tandas de solo lectura
- criterio de publicación: solo VALID por la puerta de la fábrica (fabrica.sesion/motor); REVIEW_REQUIRED a revisión humana

## BATCH MOSSOS-KNOWLEDGE-007

- prioridad: P1 · tipo: generacion · ejecutable ahora: sí
- temas: B.2
- subtemas: B.2.4, B.2.5
- cantidad: 6
- dificultad: {"2": 2}
- tipos: {"conceptual": 2, "negativa": 2, "procedimiento": 2}
- fuente: guia-mossos:B.2.4, guia-mossos:B.2.5
- validacion: fabrica.validacion (estructura, respuesta única, cita literal, duplicados) + fabrica.fuente
- judge: juez independiente con la política activa (fabrica/politica_juez/registro.json), tandas de solo lectura
- criterio de publicación: solo VALID por la puerta de la fábrica (fabrica.sesion/motor); REVIEW_REQUIRED a revisión humana

## BATCH MOSSOS-KNOWLEDGE-008

- prioridad: P1 · tipo: generacion · ejecutable ahora: sí
- temas: A.1
- subtemas: A.1.4, A.1.5, A.1.6, A.1.7, A.1.8, A.1.9
- cantidad: 10
- dificultad: {"1": 6, "2": 4}
- tipos: {"literal": 6, "aplicacion": 4}
- fuente: guia-mossos:A.1.4, guia-mossos:A.1.5, guia-mossos:A.1.6, guia-mossos:A.1.7, guia-mossos:A.1.8, guia-mossos:A.1.9
- validacion: fabrica.validacion (estructura, respuesta única, cita literal, duplicados) + fabrica.fuente
- judge: juez independiente con la política activa (fabrica/politica_juez/registro.json), tandas de solo lectura
- criterio de publicación: solo VALID por la puerta de la fábrica (fabrica.sesion/motor); REVIEW_REQUIRED a revisión humana

## BATCH MOSSOS-KNOWLEDGE-009

- prioridad: P1 · tipo: generacion · ejecutable ahora: sí
- temas: A.1
- subtemas: A.1.4, A.1.5, A.1.6, A.1.7
- cantidad: 6
- dificultad: {"2": 2}
- tipos: {"conceptual": 4, "negativa": 2}
- fuente: guia-mossos:A.1.4, guia-mossos:A.1.5, guia-mossos:A.1.6, guia-mossos:A.1.7
- validacion: fabrica.validacion (estructura, respuesta única, cita literal, duplicados) + fabrica.fuente
- judge: juez independiente con la política activa (fabrica/politica_juez/registro.json), tandas de solo lectura
- criterio de publicación: solo VALID por la puerta de la fábrica (fabrica.sesion/motor); REVIEW_REQUIRED a revisión humana

## BATCH MOSSOS-KNOWLEDGE-010

- prioridad: P1 · tipo: generacion · ejecutable ahora: sí
- temas: A.4
- subtemas: A.4.1, A.4.3, A.4.4, A.4.IF
- cantidad: 10
- dificultad: {"1": 3, "2": 2}
- tipos: {"literal": 3, "organos": 3, "aplicacion": 2, "comparativa": 2}
- fuente: guia-mossos:A.4.1, guia-mossos:A.4.3, guia-mossos:A.4.4, guia-mossos:A.4.IF
- validacion: fabrica.validacion (estructura, respuesta única, cita literal, duplicados) + fabrica.fuente
- judge: juez independiente con la política activa (fabrica/politica_juez/registro.json), tandas de solo lectura
- criterio de publicación: solo VALID por la puerta de la fábrica (fabrica.sesion/motor); REVIEW_REQUIRED a revisión humana

## BATCH MOSSOS-KNOWLEDGE-011

- prioridad: P1 · tipo: generacion · ejecutable ahora: sí
- temas: A.2
- subtemas: A.2.4, A.2.5, A.2.7, A.2.8, A.2.IF
- cantidad: 10
- dificultad: {"1": 2, "2": 2}
- tipos: {"literal": 2, "organos": 2, "plazos": 2, "aplicacion": 2, "competencias": 2}
- fuente: guia-mossos:A.2.4, guia-mossos:A.2.5, guia-mossos:A.2.7, guia-mossos:A.2.8, guia-mossos:A.2.IF
- validacion: fabrica.validacion (estructura, respuesta única, cita literal, duplicados) + fabrica.fuente
- judge: juez independiente con la política activa (fabrica/politica_juez/registro.json), tandas de solo lectura
- criterio de publicación: solo VALID por la puerta de la fábrica (fabrica.sesion/motor); REVIEW_REQUIRED a revisión humana

## BATCH MOSSOS-KNOWLEDGE-012

- prioridad: P1 · tipo: generacion · ejecutable ahora: sí
- temas: A.5
- subtemas: A.5.1, A.5.3, A.5.4, A.5.5, A.5.6, A.5.IF
- cantidad: 9
- dificultad: {"1": 4, "2": 1}
- tipos: {"literal": 4, "plazos": 4, "aplicacion": 1}
- fuente: guia-mossos:A.5.1, guia-mossos:A.5.3, guia-mossos:A.5.4, guia-mossos:A.5.5, guia-mossos:A.5.6, guia-mossos:A.5.IF
- validacion: fabrica.validacion (estructura, respuesta única, cita literal, duplicados) + fabrica.fuente
- judge: juez independiente con la política activa (fabrica/politica_juez/registro.json), tandas de solo lectura
- criterio de publicación: solo VALID por la puerta de la fábrica (fabrica.sesion/motor); REVIEW_REQUIRED a revisión humana

## BATCH MOSSOS-KNOWLEDGE-013

- prioridad: P1 · tipo: generacion · ejecutable ahora: sí
- temas: B.8
- subtemas: B.8.1, B.8.3, B.8.IF
- cantidad: 9
- dificultad: {"1": 2, "2": 1}
- tipos: {"literal": 3, "organos": 3, "plazos": 2, "aplicacion": 1}
- fuente: guia-mossos:B.8.1, guia-mossos:B.8.3, guia-mossos:B.8.IF
- validacion: fabrica.validacion (estructura, respuesta única, cita literal, duplicados) + fabrica.fuente
- judge: juez independiente con la política activa (fabrica/politica_juez/registro.json), tandas de solo lectura
- criterio de publicación: solo VALID por la puerta de la fábrica (fabrica.sesion/motor); REVIEW_REQUIRED a revisión humana

## BATCH MOSSOS-KNOWLEDGE-014

- prioridad: P1 · tipo: generacion · ejecutable ahora: sí
- temas: B.6
- subtemas: B.6.2, B.6.3, B.6.4, B.6.IF
- cantidad: 8
- dificultad: {"1": 3, "2": 1}
- tipos: {"literal": 4, "organos": 3, "aplicacion": 1}
- fuente: guia-mossos:B.6.2, guia-mossos:B.6.3, guia-mossos:B.6.4, guia-mossos:B.6.IF
- validacion: fabrica.validacion (estructura, respuesta única, cita literal, duplicados) + fabrica.fuente
- judge: juez independiente con la política activa (fabrica/politica_juez/registro.json), tandas de solo lectura
- criterio de publicación: solo VALID por la puerta de la fábrica (fabrica.sesion/motor); REVIEW_REQUIRED a revisión humana

## BATCH MOSSOS-KNOWLEDGE-015

- prioridad: P2 · tipo: generacion · ejecutable ahora: sí
- temas: C.4
- subtemas: C.4.2, C.4.3, C.4.IF
- cantidad: 9
- dificultad: {"1": 3, "2": 1}
- tipos: {"literal": 3, "organos": 3, "aplicacion": 2, "comparativa": 1}
- fuente: guia-mossos:C.4.2, guia-mossos:C.4.3, guia-mossos:C.4.IF
- validacion: fabrica.validacion (estructura, respuesta única, cita literal, duplicados) + fabrica.fuente
- judge: juez independiente con la política activa (fabrica/politica_juez/registro.json), tandas de solo lectura
- criterio de publicación: solo VALID por la puerta de la fábrica (fabrica.sesion/motor); REVIEW_REQUIRED a revisión humana

## BATCH MOSSOS-KNOWLEDGE-016

- prioridad: P2 · tipo: generacion · ejecutable ahora: sí
- temas: B.4
- subtemas: B.4.4, B.4.5, B.4.6, B.4.7
- cantidad: 9
- dificultad: {"1": 3, "2": 1}
- tipos: {"literal": 2, "organos": 3, "plazos": 3, "aplicacion": 1}
- fuente: guia-mossos:B.4.4, guia-mossos:B.4.5, guia-mossos:B.4.6, guia-mossos:B.4.7
- validacion: fabrica.validacion (estructura, respuesta única, cita literal, duplicados) + fabrica.fuente
- judge: juez independiente con la política activa (fabrica/politica_juez/registro.json), tandas de solo lectura
- criterio de publicación: solo VALID por la puerta de la fábrica (fabrica.sesion/motor); REVIEW_REQUIRED a revisión humana

## BATCH MOSSOS-KNOWLEDGE-017

- prioridad: P2 · tipo: generacion · ejecutable ahora: sí
- temas: A.6
- subtemas: A.6.1, A.6.4, A.6.5
- cantidad: 4
- dificultad: {"1": 2}
- tipos: {"literal": 2, "organos": 2}
- fuente: guia-mossos:A.6.1, guia-mossos:A.6.4, guia-mossos:A.6.5
- validacion: fabrica.validacion (estructura, respuesta única, cita literal, duplicados) + fabrica.fuente
- judge: juez independiente con la política activa (fabrica/politica_juez/registro.json), tandas de solo lectura
- criterio de publicación: solo VALID por la puerta de la fábrica (fabrica.sesion/motor); REVIEW_REQUIRED a revisión humana

## BATCH MOSSOS-KNOWLEDGE-018

- prioridad: P2 · tipo: generacion · ejecutable ahora: sí
- temas: A.7
- subtemas: A.7.4, A.7.5, A.7.6, A.7.IF
- cantidad: 6
- dificultad: {"1": 2, "2": 1}
- tipos: {"literal": 1, "organos": 2, "plazos": 2, "aplicacion": 1}
- fuente: guia-mossos:A.7.4, guia-mossos:A.7.5, guia-mossos:A.7.6, guia-mossos:A.7.IF
- validacion: fabrica.validacion (estructura, respuesta única, cita literal, duplicados) + fabrica.fuente
- judge: juez independiente con la política activa (fabrica/politica_juez/registro.json), tandas de solo lectura
- criterio de publicación: solo VALID por la puerta de la fábrica (fabrica.sesion/motor); REVIEW_REQUIRED a revisión humana

## BATCH MOSSOS-KNOWLEDGE-019

- prioridad: P2 · tipo: generacion · ejecutable ahora: sí
- temas: B.7
- subtemas: B.7.1, B.7.3, B.7.4, B.7.5, B.7.6, B.7.IF
- cantidad: 8
- dificultad: {"1": 4, "2": 1}
- tipos: {"literal": 3, "organos": 4, "aplicacion": 1}
- fuente: guia-mossos:B.7.1, guia-mossos:B.7.3, guia-mossos:B.7.4, guia-mossos:B.7.5, guia-mossos:B.7.6, guia-mossos:B.7.IF
- validacion: fabrica.validacion (estructura, respuesta única, cita literal, duplicados) + fabrica.fuente
- judge: juez independiente con la política activa (fabrica/politica_juez/registro.json), tandas de solo lectura
- criterio de publicación: solo VALID por la puerta de la fábrica (fabrica.sesion/motor); REVIEW_REQUIRED a revisión humana

## BATCH MOSSOS-KNOWLEDGE-020

- prioridad: P2 · tipo: generacion · ejecutable ahora: sí
- temas: A.3
- subtemas: A.3.3, A.3.4, A.3.5, A.3.IF
- cantidad: 4
- dificultad: {"1": 1}
- tipos: {"literal": 3, "organos": 1}
- fuente: guia-mossos:A.3.3, guia-mossos:A.3.4, guia-mossos:A.3.5, guia-mossos:A.3.IF
- validacion: fabrica.validacion (estructura, respuesta única, cita literal, duplicados) + fabrica.fuente
- judge: juez independiente con la política activa (fabrica/politica_juez/registro.json), tandas de solo lectura
- criterio de publicación: solo VALID por la puerta de la fábrica (fabrica.sesion/motor); REVIEW_REQUIRED a revisión humana

## BATCH MOSSOS-KNOWLEDGE-021

- prioridad: P2 · tipo: generacion · ejecutable ahora: sí
- temas: C.1
- subtemas: C.1.2
- cantidad: 1
- dificultad: {"1": 1}
- tipos: {"literal": 1}
- fuente: guia-mossos:C.1.2
- validacion: fabrica.validacion (estructura, respuesta única, cita literal, duplicados) + fabrica.fuente
- judge: juez independiente con la política activa (fabrica/politica_juez/registro.json), tandas de solo lectura
- criterio de publicación: solo VALID por la puerta de la fábrica (fabrica.sesion/motor); REVIEW_REQUIRED a revisión humana

## BATCH MOSSOS-INTERVIEW-001

- prioridad: P1 · tipo: generacion · ejecutable ahora: sí
- temas: responsabilitat, adaptabilitat, motivacio, habilitats-socials
- cantidad: 4 · por competencia: {'responsabilitat': 1, 'adaptabilitat': 1, 'motivacio': 1, 'habilitats-socials': 1}
- dificultad: 1-3 (repartida)
- tipos: conductual y situacional (mín. 2 situacionales por competencia)
- fuente: nombres oficiales de las competencias (catalogo/preparacion); el contenido es TESTLEY_TRAINING
- validacion: fabrica.entrevista.validar (reglas v2, sin duplicados con lotes anteriores)
- judge: política juez-entrevista-v2 (modelo de referencia: sonnet)
- criterio de publicación: puerta de fabrica.entrevista: VALID del modelo de referencia, ningún veredicto más conservador, sin retención de auditoría

## BATCH MOSSOS-COMPETENCY-REJUDGE-001

- prioridad: P1 · tipo: reevaluacion · ejecutable ahora: sí
- temas: C00002
- cantidad: 54
- accion: rejuzgar fichas y situaciones con el modelo de referencia y el mismo prompt congelado (juez-competencias-v1), combinación conservadora como en entrevista; no se genera contenido nuevo
- validacion: fabrica.competencias.validar (sin cambios)
- judge: Sonnet (referencia) · prompt congelado
- criterio de publicación: solo VALID del modelo de referencia sin veredicto más conservador

## BATCH MOSSOS-APTITUDE-VERBAL-001

- prioridad: P1 · tipo: banco_revisado · ejecutable ahora: no — requiere revisor humano de catalán
- temas: verbal
- subtemas: vocabulario/sinónimos, antónimos, analogías, comprensión de frases
- cantidad: 60 (3 dificultades × 4 formatos × 5 ítems: mínimo para practicar cada formato sin repetir en una sesión)
- fuente: ninguna oficial (las bases no publican ejercicios): contenido TESTLEY_GENERATED
- validacion: respuesta única comprobable (diccionario normativo IEC/DIEC como referencia), 4 opciones, sin ambigüedad
- judge: juez independiente + REVISIÓN HUMANA obligatoria (decisión de la Fase 1: la verbal semántica no se verifica por cálculo)
- criterio de publicación: solo tras revisión humana

