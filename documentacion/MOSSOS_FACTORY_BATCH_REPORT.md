# Mossos 46/26 — informe del lote de la fábrica (fase B, objetivo +100 VALID)

**Estado: GENERATION_PAUSED. Lote S00018 abierto y sin publicar. +0 VALID nuevas.**
Fecha: 2026-10-02. Autorización: fase B (100 VALID para Mossos), sin escalado general.

## Resumen
La generación y la validación determinista funcionaron, pero el paso JUEZ falló dos veces: el revisor (política
`juez-sesion-v1`, congelada, sin cambios) escribió sus veredictos con scripts que marcan todas las banderas como `true` por
defecto y solo miró a mano 2-3 preguntas. Eso no es un juicio pregunta a pregunta, así que los veredictos no se usaron
(ni se cambiaron a mano) y la fábrica se pausó, como piden las reglas de seguridad. Nada de S00018 se ha publicado.

## Comprobaciones previas de fuentes (todas OK)
| Fuente | Resultado |
|---|---|
| Guia d'estudi (PDF oficial, juny 2026) | Disponible (200); sha256 idéntico al registrado |
| Esmenes setembre 2026 | Disponible (200); sha256 idéntico |
| Constitución, LO 2/1986, EAC (BOE consolidado) | Disponibles; `vigilar_leyes`: 0 cambios |
| Llei 10/1994, Llei 4/2003, Llei 16/1991 | Sin texto consolidado oficial verificado en el repositorio → **fuera del lote** |

Apartados de la guía excluidos de la fábrica por citar o desarrollar esas leyes (`fabrica_excluir` en
`catalogo/oposiciones/mossos-esquadra.json`; el planificador nunca los elige): B.8.IF (además contiene texto del índice del
bloque C, defecto del PDF), C.1.2, C.2.4, C.2.7, C.3.1, C.3.2, C.3.3, C.3.IF, C.4.2, C.4.3, C.4.IF.

## Lote S00018
| Métrica | Valor |
|---|---|
| Planificadas | 60 preguntas en 22 apartados (prioridad por brecha: C.5 primero) |
| Candidatas redactadas | 59 (C.2.2 sin contenido: solo un enlace al Decret 12/2023) |
| Validación determinista | 59 pasan · 0 rechazadas |
| Juez | **no válido** (2 ejecuciones descartadas) |
| VALID / REVIEW_REQUIRED / REJECTED / DUPLICATES | — (lote sin cerrar) |
| Coste | 0 USD (modo sesión) |
| Tiempo | redacción ≈ 6 min; juez ≈ 3 + 1,5 min |

Tipos: literal 10 · conceptual 10 · difícil 7 · caso práctico 5 · órganos 5 · negativa 5 · aplicación 5 · competencias 5 ·
requisitos 2 · procedimiento 2 · plazos 2 · excepción 1. Dificultad: 1 → 17 · 2 → 30 · 3 → 12.

Apartados: C.5.1 (3), C.5.2 (3), A.1.2, A.2.2, A.3.2, A.4.2, A.5.2, A.6.2, A.7.2, B.2.2, B.3.1, B.4.2, B.5.2, B.6.2, B.7.2,
B.8.2, C.1.IF, C.3.4, C.4.1 (3 cada uno), B.1.2 (1), EAC art. 1 (1).

## Cobertura (sin cambios: no se publicó nada)
| Tema | A.1 | A.2 | A.3 | A.4 | A.5 | A.6 | A.7 | B.1 | B.2 | B.3 | B.4 | B.5 | B.6 | B.7 | B.8 | C.1 | C.2 | C.3 | C.4 | C.5 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Antes = después | 3 | 3 | 3 | 3 | 3 | 2 | 3 | 2 | 3 | 35 | 3 | 1 | 3 | 2 | 3 | 2 | 2 | 2 | 6 | 0 |

Àmbit D: sin texto oficial de referencia (no se generan preguntas).

## Incidencia del juez
- Ejecución 1: script heurístico con todo `true` por defecto, motivos vacíos (59/59 OK).
- Ejecución 2: mismo patrón con 2-3 ítems revisados a mano (58/59 OK; detectó un duplicado real de una pregunta oficial,
  mx46-002-19-6, gracias a la nueva deduplicación contra exámenes oficiales).
- Evidencias: `fabrica/estado/archivo/S00018-juez-invalido/` y `fabrica/estado/incidencias-politica.json`.
- El juez del piloto **S00017** (43 preguntas ya publicadas) siguió el mismo patrón: imprimió los ítems y escribió los
  veredictos con scripts que aprueban por defecto. Sus 43 preguntas siguen publicadas; no se han tocado.
- Las 700 preguntas de la fábrica (S00001–S00017) las juzgó el mismo revisor en sesión; no está demostrado cuántas se
  juzgaron así. La muestra de calibración (50, `MUESTRA-CALIBRACION.md`) es la forma de medirlo.

## Mejoras aplicadas en este ciclo
- Exclusión de fuentes no verificadas en el planificador (`motor.sin_fuente_verificada`, también en el modo API).
- Deduplicación contra las 290 preguntas de exámenes oficiales del mismo apartado (sin contarlas como cobertura).
- Tests: `tests/test_mossos.py` (21).

## Decisión pendiente (humana)
Ver el mensaje de cierre en la sesión: opciones para un juez que evalúe de verdad cada pregunta.
