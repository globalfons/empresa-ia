# Mossos 360 · Content Generation Plan

Generado por `python3 -m fabrica.cobertura360 informe mossos-esquadra` a partir de `MOSSOS_360_CONTENT_COVERAGE.md` (mismos datos). Fábrica de preguntas: **ACTIVE**: las tandas de conocimientos quedan preparadas pero NO se ejecutan hasta levantar la pausa (`python3 -m fabrica.motor --reanudar` tras revisar las métricas, como exige la fábrica).

Orden: primero lo que corrige fuentes y calidad (P0 de fuentes, recalibración), después la cobertura P0/P1 y por último la ampliación. Tamaño de tanda de conocimientos = `lote.tamano_inicial` de la fábrica (10) tras una pausa.

Siguientes tandas en cualquier momento: `python3 -m fabrica.cobertura360 siguientes mossos-esquadra --n 3`.

## Lotes recientes de la fábrica

| lote | generadas | VALID | REVIEW_REQUIRED | REJECTED | política del juez |
|---|---|---|---|---|---|
| S00029 | 50 | 45 | 5 | 0 | juez-sesion-v4 |
| S00030 | 50 | 44 | 6 | 0 | juez-sesion-v4 |
| S00031 | 50 | 45 | 5 | 0 | juez-sesion-v4 |
| S00032 | 50 | 44 | 5 | 1 | juez-sesion-v4 |
| S00033 | 46 | 39 | 5 | 2 | juez-sesion-v4 |

- **S00022 · RETENIDO_DEFINITIVO** (2026-10-06): ALL_VALID_SIN_EVIDENCIA (juez_v2.resultado → evidencia_individual). No se publica ni se rejuzga; evidencia en `fabrica/estado/retenidos/S00022/DECISION.json`.

| área | prioridad | elementos planificados |
|---|---|---|
| APTITUDE | P1 | 60 |
| COMPETENCIES | P1 | 54 |
| INTERVIEW | P1 | 4 |
| KNOWLEDGE | P0 | 0 |
| KNOWLEDGE | P1 | 11 |
| KNOWLEDGE | P2 | 5 |

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
- dificultad: {"1": 2, "2": 1, "3": 1}
- tipos: {"literal": 2, "organos": 1, "plazos": 2, "aplicacion": 1, "conceptual": 1, "negativa": 1, "requisitos": 1, "caso_practico": 1}
- fuente: guia-mossos:C.2.2, guia-mossos:C.2.3, guia-mossos:C.2.4, guia-mossos:C.2.7
- validacion: fabrica.validacion (estructura, respuesta única, cita literal, duplicados) + fabrica.fuente
- judge: juez independiente con la política activa (fabrica/politica_juez/registro.json), tandas de solo lectura
- criterio de publicación: solo VALID por la puerta de la fábrica (fabrica.sesion/motor); REVIEW_REQUIRED a revisión humana
- revisión humana obligatoria (tipo de pregunta con revisión obligatoria)

## BATCH MOSSOS-KNOWLEDGE-002

- prioridad: P1 · tipo: generacion · ejecutable ahora: sí
- temas: C.2
- subtemas: C.2.2
- cantidad: 1
- dificultad: {"3": 1}
- tipos: {"dificil": 1}
- fuente: guia-mossos:C.2.2
- validacion: fabrica.validacion (estructura, respuesta única, cita literal, duplicados) + fabrica.fuente
- judge: juez independiente con la política activa (fabrica/politica_juez/registro.json), tandas de solo lectura
- criterio de publicación: solo VALID por la puerta de la fábrica (fabrica.sesion/motor); REVIEW_REQUIRED a revisión humana

## BATCH MOSSOS-KNOWLEDGE-003

- prioridad: P2 · tipo: generacion · ejecutable ahora: sí
- temas: C.3
- subtemas: C.3.1
- cantidad: 2
- dificultad: {"3": 1}
- tipos: {"caso_practico": 1, "dificil": 1}
- fuente: guia-mossos:C.3.1
- validacion: fabrica.validacion (estructura, respuesta única, cita literal, duplicados) + fabrica.fuente
- judge: juez independiente con la política activa (fabrica/politica_juez/registro.json), tandas de solo lectura
- criterio de publicación: solo VALID por la puerta de la fábrica (fabrica.sesion/motor); REVIEW_REQUIRED a revisión humana
- revisión humana obligatoria (tipo de pregunta con revisión obligatoria)

## BATCH MOSSOS-KNOWLEDGE-004

- prioridad: P2 · tipo: generacion · ejecutable ahora: sí
- temas: B.2
- subtemas: B.2.5
- cantidad: 1
- dificultad: {"1": 1}
- tipos: {"plazos": 1}
- fuente: guia-mossos:B.2.5
- validacion: fabrica.validacion (estructura, respuesta única, cita literal, duplicados) + fabrica.fuente
- judge: juez independiente con la política activa (fabrica/politica_juez/registro.json), tandas de solo lectura
- criterio de publicación: solo VALID por la puerta de la fábrica (fabrica.sesion/motor); REVIEW_REQUIRED a revisión humana

## BATCH MOSSOS-KNOWLEDGE-005

- prioridad: P2 · tipo: generacion · ejecutable ahora: sí
- temas: A.1
- subtemas: A.1.IF
- cantidad: 1
- dificultad: {"1": 1}
- tipos: {"literal": 1}
- fuente: guia-mossos:A.1.IF
- validacion: fabrica.validacion (estructura, respuesta única, cita literal, duplicados) + fabrica.fuente
- judge: juez independiente con la política activa (fabrica/politica_juez/registro.json), tandas de solo lectura
- criterio de publicación: solo VALID por la puerta de la fábrica (fabrica.sesion/motor); REVIEW_REQUIRED a revisión humana

## BATCH MOSSOS-KNOWLEDGE-006

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

