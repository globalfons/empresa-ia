# Mossos · auditoría final de calidad (S00019 + S00020)

Fecha: 2026-10-03. Método: `fabrica/auditoria_calidad.py` (`python3 -m fabrica.auditoria_calidad aplicar S00019 S00020`). Informe íntegro en `fabrica/estado/auditoria-calidad.json`; tests en `tests/test_auditoria_calidad.py`.

**Independiente del juez.** La deduplicación no lee ningún veredicto (hay un test que lo comprueba). Cada una de las 27 preguntas se compara con:
- el banco Mossos completo (servidas, retiradas y en revisión);
- los dos lotes auditados, S00019 y S00020;
- las 290 preguntas de exámenes oficiales.

Dimensiones que se comparan:
- apartado de la guía: mismo apartado, «Idees força» frente a los apartados de su tema, o mismo tema;
- idea-fuerza y hecho evaluado (tokens de la cita frente a enunciado, respuesta y cita del otro);
- respuesta correcta y enunciado.

Además se repiten los controles deterministas contra el texto vigente y se aplican reglas de calidad: cita que no sostiene la respuesta, términos absolutos solo en distractores, identificación trivial de una norma y respuesta delatada por su longitud.

Criterio de duplicado inequívoco (se retira la más reciente):
- respuesta ≥ 0,8, hecho ≥ 0,6 y enunciado ≥ 0,3; o
- enunciado ≥ 0,8, hecho ≥ 0,8 y respuesta ≥ 0,5 (respuesta reformulada).

Si respuesta ≥ 0,5 y hecho ≥ 0,4 sin llegar a duplicado, va a revisión. Los veredictos históricos del juez **no se han cambiado**: solo cambian el estado de servicio y el registro `auditoria_calidad`.

## Resultado: 23 KEEP · 3 REVIEW_REQUIRED · 1 REJECTED_DUPLICATE · 0 REJECTED_CONTENT

### KEEP (siguen servidas)

guia-mossos-43 · guia-mossos-45 · guia-mossos-46 · guia-mossos-47 · guia-mossos-48 · guia-mossos-49 · guia-mossos-50 · guia-mossos-51 · guia-mossos-52 · guia-mossos-53 · guia-mossos-54 · guia-mossos-55 · guia-mossos-56 · guia-mossos-58 · guia-mossos-59 · guia-mossos-60 · guia-mossos-61 · guia-mossos-62 · guia-mossos-63 · guia-mossos-64 · guia-mossos-65 · guia-mossos-68 · guia-mossos-69

### REVIEW_REQUIRED (fuera de servicio: `REVIEW_REQUIRED_REEVALUATION` hasta decisión humana)

| Pregunta | Lote | Apartado | Motivo | ¿Coincide con la decisión preliminar? |
|---|---|---|---|---|
| guia-mossos-44 | S00019 | C.5.1 | calidad de distractores: los términos absolutos solo aparecen en distractores y la correcta es la más larga | Sí (calidad de distractores) |
| guia-mossos-57 | S00020 | C.5.3 | calidad de distractores: los términos absolutos solo aparecen en distractores y la correcta es la más larga | No estaba en la lista: misma regla que 44 (la correcta es la más larga y «sempre» solo aparece en un distractor) |
| guia-mossos-66 | S00020 | C.2.3 | trivialidad límite: solo pide identificar una norma por su número y fecha | Sí (trivialidad límite) |

### REJECTED (retiradas: DEPRECATED; el id y el texto se conservan)

| question_id | duplicate_id | Hecho común | Por qué evalúan lo mismo | Similitud |
|---|---|---|---|---|
| guia-mossos-67 (C.5.IF) | guia-mossos-51 (C.5.2) | La Recomanació REC(2001)10 sobre el Codi europeu d'ètica de la policia procede del Consell d'Europa | guia-mossos-51 pregunta qué órgano la adoptó («El Comitè de Ministres del Consell d'Europa»); guia-mossos-67 pregunta qué organismo la recomienda («El Consell d'Europa»). Con la misma recomendación y las mismas opciones de distractor (Comissió Europea, Parlament Europeu…), quien sabe una sabe la otra. Las «Idees força» resumen el apartado C.5.2 | respuesta 1.0, hecho 0.69, enunciado 0.47 |

REJECTED_CONTENT: **ninguna**. Las 27 superan los controles deterministas contra el texto vigente de la guía.

## Duplicados encontrados

- Entre las 27 y el banco o las oficiales: 1 (guia-mossos-67 → guia-mossos-51).
- Entre S00019 y S00020: ninguno más.
- Revisé a mano cada apartado tocado (C.2.x, C.3.x, C.5.x) frente a S00017 y las oficiales.
- Las coincidencias más cercanas que **no** son duplicado: 58 frente a la oficial mx46-25-18 (58 evalúa qué destaca el Codi; la oficial, que no reglamenta prácticas concretas), 68 frente a 47/48 (Europol frente a Interpol) y 54–59 frente a mx46-19-4 (definición general del Codi).

## Falsos negativos de deduplicación

| Caso | Qué falló | Estado |
|---|---|---|
| guia-mossos-67 ↔ 51 | La deduplicación de la fábrica comparaba solo el mismo apartado; las «Idees força» no se cruzaban con su tema | Corregido en S00020 (`fabrica.banco.afin`, con test) |
| guia-mossos-67 ↔ 51 | Con la corrección, el juez v3 recibió 51 como parecida y aun así dio VALID («òrgan que va adoptar» frente a «organisme») | Limitación del juez: lo cubre esta auditoría independiente |
| S00018: S00018-3.0, S00018-5.2, S00018-11.0, S00018-20.1 | La deduplicación original (léxica y por apartado) no los marcaba; la independiente sí (3.0 y 11.0 frente a exámenes oficiales; 5.2 frente a guia-mossos-48; 20.1 frente a 52 con respuesta reformulada) | Detectados; S00018 sin publicar |
| Auditoría: S00018-20.1 ↔ 52 | La primera regla (respuesta ≥ 0,8) no lo veía: respuesta 0,78 | Añadida la regla «respuesta reformulada», con test |

## S00018

**Cerrado y SIN publicar.** Deduplicado de nuevo contra el banco resultante y las oficiales (`fabrica/estado/dedup-S00018.json`):
- 7 DUPLICADO: 0.0→43, 0.1→45, 20.0→51, 20.1→52, 5.2→48, 3.0→mx46-002-19-6 (ya REJECTED por v3), 11.0→mx46-24-15;
- 5 SOSPECHA_REVISION: 5.0, 5.1 (≈ guia-mossos-49), 11.2, 14.0, 18.2;
- 47 sin duplicado.

Si se autorizara, serían publicables como máximo **44** (sin duplicado y con VALID en v3); los 5 sospechosos irían a revisión. No se ha publicado nada.

## Juez v3

- Política `juez-sesion-v3` congelada y sin cambios; no se ha modificado ningún veredicto histórico.
- Fiabilidad observada en lotes reales: 27/27 VALID, de las que la auditoría saca 4 (1 duplicado y 3 de calidad, ninguna con error de contenido).
- Conclusión: v3 es fiable en **corrección factual y cita**, pero **flojo en duplicidad semántica y en calidad de distractores**. Hasta integrar esta auditoría en el circuito, cada lote debe pasar `fabrica.auditoria_calidad` antes de escalar.

## Fábrica

**GENERATION_PAUSED** (`fabrica/estado/estado.json`). No se ha generado nada nuevo.

## Cobertura actualizada

| | Antes de la auditoría | Después |
|---|---|---|
| TESTLEY_GENERATED servidas | 103 | 99 |
| En revisión | 11 | 14 |
| Necesidades del CoverageEngine | 456 | 460 |
| C.2 / C.3 / C.5 | 5 / 12 / 12 | 4 / 12 / 9 |

## Verificación

`npm test` (Python 185, JS 51) · `npm run validar` · `npm run build` · integridad · crawler (0 enlaces rotos) · E2E Mossos 21/21 en móvil y escritorio · E2E de las 7 oposiciones sin regresiones · 0 errores JS. Las 4 preguntas retiradas ya no aparecen en `docs/datos`.

**No READY**: B1 sigue pendiente del despliegue del propietario (`MOSSOS_360_STATUS.md`).
