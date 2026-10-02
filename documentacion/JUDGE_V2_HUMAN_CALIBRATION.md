# Calibración del juez v2 con referencia humana — estado y diagnóstico

Fecha: 2026-10-02. Política: juez-sesion-v2 (`a72e35e2…`), sin cambios. Banco sin cambios. Fábrica: **GENERATION_PAUSED**.

## Fase 1 — Revisión humana de la muestra de 50

**No existe revisión humana registrada.** Las 50 fichas de `MUESTRA-CALIBRACION.md` tienen los campos «Revisión humana» en blanco (☐ sí ☐ no, sin comentario) y no hay ninguna otra revisión humana en el repositorio ni en el historial de Git. Por tanto `veredicto_humano = PENDIENTE` en las 50 y **no se puede calcular la concordancia v2 ↔ humano**. No se ha sustituido la revisión humana por una opinión de modelo.

Como **diagnóstico (no es una revisión humana)** se ha pedido una segunda opinión a otro modelo (Claude Sonnet, subagente independiente que solo pudo leer su fichero; respuestas 1:1 y extraídas de su transcripción) con los 10 controles pedidos. Los hallazgos con impacto se han comprobado a mano contra el texto oficial (columna «verificación»). Hoja para la revisión humana: `documentacion/REVISION_HUMANA_PENDIENTE.csv` (50 + 6 filas, columnas humanas vacías).

| question_id | oposición | tipo | dif. | ley | art. | veredicto_v2 | veredicto_humano | coincide | motivo_humano | 2ª opinión (modelo, NO humana) | criterios_problematicos (2ª opinión) |
|---|---|---|---|---|---|---|---|---|---|---|---|
| ley-19-2013-43 | Cuerpo General Auxiliar de la Administra | literal | 1 | BOE-A-2013-12887 | 4 | VALID | PENDIENTE | n/d | — | VALID | — |
| ley-33-2003-37 | Cuerpo de Gestión de la Administración C | literal | 1 | BOE-A-2003-20254 | 13 (apdo. 2) | VALID | PENDIENTE | n/d | — | VALID | — |
| ley-38-2003-57 | Cuerpo de Gestión de la Administración C | literal | 1 | BOE-A-2003-20977 | 53 (apdo. b)) | VALID | PENDIENTE | n/d | — | VALID | — |
| ley-9-2017-92 | Cuerpo de Gestión de la Administración C | literal | 1 | BOE-A-2017-12902 | 30 (apdo. 4) | VALID | PENDIENTE | n/d | — | VALID | — |
| lo-3-2018-61 | Cuerpo General Administrativo de la Admi | literal | 1 | BOE-A-2018-16673 | 24 | VALID | PENDIENTE | n/d | — | VALID | — |
| rdl-8-2015-56 | Cuerpo General Administrativo de la Admi | literal | 1 | BOE-A-2015-11724 | 17 (apdo. 2) | VALID | PENDIENTE | n/d | — | VALID | — |
| lo-4-2015-55 | Policía Nacional, Escala Básica (categor | literal | 1 | BOE-A-2015-3442 | 26 | VALID | PENDIENTE | n/d | — | VALID | — |
| ley-42-2007-27 | Cuerpo de Gestión de la Administración C | literal | 1 | BOE-A-2007-21490 | 2 (apdo. f)) | VALID | PENDIENTE | n/d | — | VALID | — |
| lef-1954-47 | Cuerpo de Gestión de la Administración C | literal | 1 | BOE-A-1954-15431 | 33 (apdo. 1) | VALID | PENDIENTE | n/d | — | VALID | — |
| lo-4-2000-82 | Policía Nacional, Escala Básica (categor | literal | 1 | BOE-A-2000-544 | 10 (apdo. 2) | VALID | PENDIENTE | n/d | — | VALID | — |
| lef-1954-36 | Cuerpo de Gestión de la Administración C | aplicacion | 2 | BOE-A-1954-15431 | 8 | VALID | PENDIENTE | n/d | — | REVIEW_REQUIRED | cita_respalda |
| lef-1954-41 | Cuerpo de Gestión de la Administración C | aplicacion | 2 | BOE-A-1954-15431 | 19 (apdo. 1) | VALID | PENDIENTE | n/d | — | VALID | — |
| codigo-penal-674 | Policía Nacional, Escala Ejecutiva (cate | aplicacion | 2 | BOE-A-1995-25444 | 331 | VALID | PENDIENTE | n/d | — | VALID | — |
| lef-1954-32 | Cuerpo de Gestión de la Administración C | aplicacion | 2 | BOE-A-1954-15431 | 4 (apdo. 1) | VALID | PENDIENTE | n/d | — | VALID | — |
| codigo-penal-650 | Policía Nacional, Escala Ejecutiva (cate | aplicacion | 2 | BOE-A-1995-25444 | 327 (apdo. c)) | VALID | PENDIENTE | n/d | — | VALID | — |
| lef-1954-40 | Cuerpo de Gestión de la Administración C | aplicacion | 2 | BOE-A-1954-15431 | 16 | VALID | PENDIENTE | n/d | — | VALID | — |
| ley-12-2009-43 | Policía Nacional, Escala Ejecutiva (cate | aplicacion | 2 | BOE-A-2009-17242 | 7 (apdo. 2) | VALID | PENDIENTE | n/d | — | VALID | — |
| reglamento-armas-60 | Policía Nacional, Escala Básica (categor | aplicacion | 2 | BOE-A-1993-6202 | 20 (apdo. 1) | VALID | PENDIENTE | n/d | — | VALID | — |
| lecrim-192 | Policía Nacional, Escala Ejecutiva (cate | aplicacion | 2 | BOE-A-1882-6036 | 11 | VALID | PENDIENTE | n/d | — | VALID | — |
| lef-1954-38 | Cuerpo de Gestión de la Administración C | aplicacion | 2 | BOE-A-1954-15431 | 13 | VALID | PENDIENTE | n/d | — | REVIEW_REQUIRED | vigencia, fuente_oficial |
| ley-19-2013-57 | Cuerpo General Administrativo de la Admi | dificil | 3 | BOE-A-2013-12887 | 31 (apdo. 4.a)) | VALID | PENDIENTE | n/d | — | REVIEW_REQUIRED | cita_respalda |
| ley-50-1997-49 | Cuerpo General Auxiliar de la Administra | dificil | 3 | BOE-A-1997-25336 | 7 (apdo. 1) | VALID | PENDIENTE | n/d | — | REVIEW_REQUIRED | dificultad_razonable, duplicacion, explicacion_correcta |
| rgc-23 | Policía Nacional, Escala Ejecutiva (cate | dificil | 3 | BOE-A-2003-23514 | 1 (apdo. 4) | VALID | PENDIENTE | n/d | — | REVIEW_REQUIRED | dificultad_razonable, tema_no_corresponde |
| ley-33-2003-35 | Cuerpo de Gestión de la Administración C | dificil | 3 | BOE-A-2003-20254 | 11 (apdo. 1) | VALID | PENDIENTE | n/d | — | REVIEW_REQUIRED | dificultad_razonable |
| ley-23-2014-48 | Policía Nacional, Escala Ejecutiva (cate | dificil | 3 | BOE-A-2014-12029 | 21 (apdo. 2) | VALID | PENDIENTE | n/d | — | VALID | — |
| lo-9-2015-18 | Policía Nacional, Escala Ejecutiva (cate | dificil | 3 | BOE-A-2015-8468 | 9 (apdo. i)) | VALID | PENDIENTE | n/d | — | REVIEW_REQUIRED | dificultad_razonable |
| ley-4-2015-38 | Policía Nacional, Escala Ejecutiva (cate | dificil | 3 | BOE-A-2015-4606 | 22 | VALID | PENDIENTE | n/d | — | REVIEW_REQUIRED | dificultad_razonable |
| lo-6-1985-71 | Policía Nacional, Escala Ejecutiva (cate | dificil | 3 | BOE-A-1985-12666 | 7 (apdo. 3) | VALID | PENDIENTE | n/d | — | REVIEW_REQUIRED | dificultad_razonable |
| lo-4-2000-84 | Policía Nacional, Escala Básica (categor | dificil | 3 | BOE-A-2000-544 | 62quinquies (apdo. 3) | VALID | PENDIENTE | n/d | — | REVIEW_REQUIRED | cita_respalda, tema_no_corresponde |
| ley-23-2014-40 | Policía Nacional, Escala Ejecutiva (cate | dificil | 3 | BOE-A-2014-12029 | 12 | VALID | PENDIENTE | n/d | — | REVIEW_REQUIRED | dificultad_razonable |
| ley-23-2014-56 | Policía Nacional, Escala Ejecutiva (cate | negativa | 2 | BOE-A-2014-12029 | 32 (apdo. 3.a)) | VALID | PENDIENTE | n/d | — | VALID | — |
| codigo-penal-626 | Policía Nacional, Escala Ejecutiva (cate | negativa | 2 | BOE-A-1995-25444 | 566 (apdo. 2) | VALID | PENDIENTE | n/d | — | VALID | — |
| lecrim-219 | Policía Nacional, Escala Ejecutiva (cate | negativa | 2 | BOE-A-1882-6036 | 507 (apdo. 1) | VALID | PENDIENTE | n/d | — | VALID | — |
| lo-4-2000-103 | Policía Nacional, Escala Básica (categor | negativa | 2 | BOE-A-2000-544 | 16 (apdo. 2) | VALID | PENDIENTE | n/d | — | VALID | — |
| ley-12-2009-58 | Policía Nacional, Escala Ejecutiva (cate | negativa | 2 | BOE-A-2009-17242 | 46 (apdo. 1) | VALID | PENDIENTE | n/d | — | VALID | — |
| ley-3-2023-42 | Cuerpo de Gestión de la Administración C | comparativa | 2 | BOE-A-2023-5365 | 21 | VALID | PENDIENTE | n/d | — | VALID | — |
| lo-4-2000-72 | Policía Nacional, Escala Ejecutiva (cate | comparativa | 2 | BOE-A-2000-544 | 35 (apdo. 6) | VALID | PENDIENTE | n/d | — | REVIEW_REQUIRED | tipo_corresponde |
| lo-3-2018-43 | Cuerpo General Auxiliar de la Administra | comparativa | 2 | BOE-A-2018-16673 | 4 (apdo. 2.b)) | VALID | PENDIENTE | n/d | — | REVIEW_REQUIRED | tipo_corresponde |
| ley-19-2013-55 | Cuerpo General Auxiliar de la Administra | comparativa | 2 | BOE-A-2013-12887 | 29 (apdo. 1.c)) | VALID | PENDIENTE | n/d | — | VALID | — |
| ley-5-2014-42 | Policía Nacional, Escala Básica (categor | comparativa | 2 | BOE-A-2014-3649 | 21 (apdo. 1.e)) | VALID | PENDIENTE | n/d | — | VALID | — |
| lo-3-2018-60 | Cuerpo General Auxiliar de la Administra | excepcion | 2 | BOE-A-2018-16673 | 23 (apdo. 4) | VALID | PENDIENTE | n/d | — | VALID | — |
| rd-240-2007-14 | Policía Nacional, Escala Básica (categor | excepcion | 2 | BOE-A-2007-4184 | 3 (apdo. 2) | VALID | PENDIENTE | n/d | — | REVIEW_REQUIRED | vigencia |
| lecrim-216 | Policía Nacional, Escala Ejecutiva (cate | excepcion | 2 | BOE-A-1882-6036 | 506 (apdo. 2) | VALID | PENDIENTE | n/d | — | VALID | — |
| lo-9-2015-15 | Policía Nacional, Escala Ejecutiva (cate | excepcion | 2 | BOE-A-2015-8468 | 8 (apdo. 2) | VALID | PENDIENTE | n/d | — | VALID | — |
| rdl-8-2015-63 | Cuerpo General Administrativo de la Admi | excepcion | 2 | BOE-A-2015-11724 | 21 (apdo. 2) | VALID | PENDIENTE | n/d | — | VALID | — |
| lo-4-2000-85 | Policía Nacional, Escala Básica (categor | plazos | 1 | BOE-A-2000-544 | 62quinquies (apdo. 3) | VALID | PENDIENTE | n/d | — | VALID | — |
| codigo-penal-661 | Policía Nacional, Escala Ejecutiva (cate | plazos | 1 | BOE-A-1995-25444 | 329 (apdo. 1) | VALID | PENDIENTE | n/d | — | VALID | — |
| codigo-penal-655 | Policía Nacional, Escala Ejecutiva (cate | plazos | 1 | BOE-A-1995-25444 | 328 (apdo. b)) | VALID | PENDIENTE | n/d | — | VALID | — |
| ley-5-2014-40 | Policía Nacional, Escala Básica (categor | plazos | 1 | BOE-A-2014-3649 | 21 (apdo. 1.e)) | VALID | PENDIENTE | n/d | — | VALID | — |
| l39-168 | Cuerpo General Auxiliar de la Administra | plazos | 1 | BOE-A-2015-10565 | 28 (apdo. 4) | VALID | PENDIENTE | n/d | — | VALID | — |

## Fase 2 — Concordancia

**v2 ↔ humano: no calculable (0 de 50 con revisión humana).** Lo que sigue es diagnóstico v2 ↔ segunda opinión de modelo; no es un score del juez.

- Total: 50 · coincidencias VALID: 36 · REVIEW_REQUIRED: 0 · REJECTED: 0 · discrepancias: 14 · concordancia: 36/50.
- Discrepancias con criterio **sustantivo** (cita, unicidad, claridad, vigencia, fuente): 6 · solo **metadatos** (tipo/dificultad/tema, que v2 no evalúa): 8.
- Respuesta marcada correcta según la 2ª opinión: **50/50** (ninguna respuesta jurídicamente errónea detectada).
- Por tipo: aplicacion: 8/10 · comparativa: 3/5 · dificil: 1/10 · excepcion: 4/5 · literal: 10/10 · negativa: 5/5 · plazos: 5/5
- Por dificultad: 1: 15/15 · 2: 20/25 · 3: 1/10
- Por oposición: Cuerpo General Administrativo de la Administración del Estado: 3/4 · Cuerpo General Auxiliar de la Administración del Estado: 4/6 · Cuerpo de Gestión de la Administración Civil del Estado: 9/12 · Policía Nacional, Escala Básica (categoría de Policía): 7/9 · Policía Nacional, Escala Ejecutiva (categoría de Inspector): 13/19
- Criterios señalados por la 2ª opinión: dificultad_razonable: 7 · cita_respalda: 3 · vigencia: 2 · tema_no_corresponde: 2 · tipo_corresponde: 2 · fuente_oficial: 1 · duplicacion: 1 · explicacion_correcta: 1

### Discrepancias (no corregidas)

- **lef-1954-36** (aplicacion, dif. 2) · V2 dijo: VALID · 2ª opinión (modelo) dijo: REVIEW_REQUIRED · criterio en conflicto: cita_respalda (sustantivo) · por qué: La respuesta B es correcta según el texto (compatibilidad + acuerdo entre expropiante y titular). Pero la cita literal se corta en 'si resultase compatible' y omite 'existiera acuerdo entre el expropiante y el titular', que es justo lo que distingue la opción correcta de las demás; la cita por sí sola no sostiene la respuesta. Debería ampliarse la cita hasta incluir el acuerdo. · **verificación:** Confirmado: la cita se corta antes de «y existiera acuerdo entre el expropiante y el titular del derecho», que es lo que decide la respuesta; el texto del artículo sí la respalda.
- **lef-1954-38** (aplicacion, dif. 2) · V2 dijo: VALID · 2ª opinión (modelo) dijo: REVIEW_REQUIRED · criterio en conflicto: vigencia, fuente_oficial (sustantivo) · por qué: La respuesta D coincide con el art. 13 (mismo procedimiento que el artículo anterior). Pero el propio texto remite a los arts. 30 y 31 del Fuero de los Españoles, norma de aparente carácter histórico, lo que sugiere un precepto obsoleto o de vigencia dudosa que debe confirmarse. Además, la pregunta no puede resolverse sin el art. 12, que no consta en el texto, y la opción D es casi tautológica con el enunciado. Es una pregunta de simple remisión, de utilidad dudosa. · **verificación:** Confirmado: la pregunta repite un artículo de una sola frase («el mismo procedimiento previsto en el artículo anterior»); el criterio clara de v2 la califica de trivial (clara=false) y v2 la aprobó. La referencia al Fuero de los Españoles es la del texto consolidado del BOE; su vigencia no se valora sin fuente oficial adicional.
- **ley-19-2013-57** (dificil, dif. 3) · V2 dijo: VALID · 2ª opinión (modelo) dijo: REVIEW_REQUIRED · criterio en conflicto: cita_respalda (sustantivo) · por qué: La respuesta C es correcta: instrucción por la Oficina de Conflictos de Intereses (art. 31.3, supuesto a) y sanción por el Consejo de Ministros (art. 31.4.a). Pero la cita literal solo respalda la mitad sancionadora y no menciona la instrucción, que requiere el apartado 3. Cita incompleta para una pregunta de dos partes. El texto menciona 'Ministro de Hacienda y Administraciones Públicas', denominación posiblemente desfasada (no determinable desde el texto). · **verificación:** Confirmado: la pregunta pide instrucción y sanción; la cita solo cubre la sanción.
- **ley-50-1997-49** (dificil, dif. 3) · V2 dijo: VALID · 2ª opinión (modelo) dijo: REVIEW_REQUIRED · criterio en conflicto: dificultad_razonable, duplicacion, explicacion_correcta (sustantivo) · por qué: La opción B es correcta según el art. 7.1 y la cita la respalda. La distinción 'superior' frente a 'directivo' se deduce solo del texto del art. 7.1. El texto no define 'directivo', pero la explicación lo afirma. La pregunta cubre el mismo artículo 7 que ley-50-1997-48 (apartado 2); no es duplicado literal pero hay solape temático. Dificultad 3 excesiva: la respuesta es casi literal del artículo.
- **rgc-23** (dificil, dif. 3) · V2 dijo: VALID · 2ª opinión (modelo) dijo: REVIEW_REQUIRED · criterio en conflicto: dificultad_razonable, tema_no_corresponde (metadatos) · por qué: La opción C es correcta según el art. 1.4 y la cita lo respalda. Dificultad 3 excesiva (la respuesta es casi literal y los distractores son claramente falsos). El tema asignado (vehículo prioritario, Tema 80) no corresponde al art. 1 del RGC sobre ámbito de aplicación; incoherencia de tema. La pregunta es cercana a rgc-24 pero versa sobre un apartado distinto.
- **ley-33-2003-35** (dificil, dif. 3) · V2 dijo: VALID · 2ª opinión (modelo) dijo: REVIEW_REQUIRED · criterio en conflicto: dificultad_razonable (metadatos) · por qué: La opción B es correcta y la cita la respalda literalmente. Dificultad 3 y tipo 'dificil' exagerados para una pregunta de lectura literal con distractores evidentes. El texto habla de 'Ministro de Hacienda' sin más; sin problema de vigencia detectable. Sin duplicado con ley-33-2003-36, que trata de la elevación al Consejo de Ministros.
- **lo-9-2015-18** (dificil, dif. 3) · V2 dijo: VALID · 2ª opinión (modelo) dijo: REVIEW_REQUIRED · criterio en conflicto: dificultad_razonable (metadatos) · por qué: La opción C es correcta según el art. 9.i) y la cita la respalda. La explicación es coherente: inmediata para excepción o sitio, emplazamiento para alarma. Dificultad 3 excesiva para una lectura casi literal. El tema (Tema 14) es genérico para este artículo, pero compatible. Sin duplicado con las parecidas, que tratan otros deberes.
- **ley-4-2015-38** (dificil, dif. 3) · V2 dijo: VALID · 2ª opinión (modelo) dijo: REVIEW_REQUIRED · criterio en conflicto: dificultad_razonable (metadatos) · por qué: La opción D es correcta y la cita la respalda. Dificultad 3 excesiva: respuesta literal y distractores sin base en el texto. Solape temático con ley-4-2015-39 (mismo artículo 22, otra parte de la frase), no duplicado literal. Texto del art. 22 sin señales de modificación.
- **lo-6-1985-71** (dificil, dif. 3) · V2 dijo: VALID · 2ª opinión (modelo) dijo: REVIEW_REQUIRED · criterio en conflicto: dificultad_razonable (metadatos) · por qué: La opción A es correcta: el art. 7.3 habla de 'resulten afectados o estén legalmente habilitados'. La explicación es correcta. Dificultad 3 excesiva (casi literal). El tema 45 (potestad jurisdiccional) encaja de forma laxa con el art. 7 LOPJ. Sin duplicado con lo-6-1985-69 y -70, que cubren los apartados 1 y 2.
- **lo-4-2000-84** (dificil, dif. 3) · V2 dijo: VALID · 2ª opinión (modelo) dijo: REVIEW_REQUIRED · criterio en conflicto: cita_respalda, tema_no_corresponde (sustantivo) · por qué: La opción B es correcta según el art. 62 quinquies.3. La cita cubre la autorización previa del director pero no la comunicación al juez, que está en la frase siguiente del texto; cita parcial. La explicación es correcta. El tema 11 (infracciones y sanciones) no corresponde a los centros de internamiento. No duplica lo-4-2000-83 ni -85. · **verificación:** Confirmado: la cita cubre la autorización previa y no la comunicación al juez (frase siguiente del texto).
- **ley-23-2014-40** (dificil, dif. 3) · V2 dijo: VALID · 2ª opinión (modelo) dijo: REVIEW_REQUIRED · criterio en conflicto: dificultad_razonable (metadatos) · por qué: La opción C es correcta y la cita la respalda literalmente. La explicación es coherente. Dificultad 3 excesiva: la respuesta es lectura literal y los distractores contradicen claramente el texto. No duplica ley-23-2014-39 ni -41, que tratan otros elementos del art. 12.
- **lo-4-2000-72** (comparativa, dif. 2) · V2 dijo: VALID · 2ª opinión (modelo) dijo: REVIEW_REQUIRED · criterio en conflicto: tipo_corresponde (metadatos) · por qué: El art. 35.6 dispone que, si el menor de 16 años con juicio suficiente manifiesta una voluntad contraria a la de su tutor, se suspende el procedimiento hasta el nombramiento del defensor judicial. La opción D es correcta y las demás son erróneas. C corresponde a los mayores de 16, pero el enunciado acota claramente a los menores de 16. El problema es que el tipo es 'comparativa' y el enunciado no compara nada: pregunta por una regla única. La explicación sí introduce una comparación. El tipo debería ser 'literal' o similar. Tampoco consta que el tema 16 cubra este contenido, aunque eso no puede determinarse con el texto.
- **lo-3-2018-43** (comparativa, dif. 2) · V2 dijo: VALID · 2ª opinión (modelo) dijo: REVIEW_REQUIRED · criterio en conflicto: tipo_corresponde (metadatos) · por qué: El art. 4.2.b) establece que el mediador o intermediario asume las responsabilidades derivadas de comunicar datos que no se correspondan con los facilitados por el afectado. La opción A es correcta. B, C y D no tienen apoyo en el texto: B contradice la exención de imputación al responsable que adopta medidas razonables. El tipo es 'comparativa', pero el enunciado pide una regla específica sin comparar ni contrastar, por lo que el tipo no corresponde. Las parecidas lo-3-2018-44 y lo-3-2018-45 tratan otros supuestos del apartado 4.2.
- **rd-240-2007-14** (excepcion, dif. 2) · V2 dijo: VALID · 2ª opinión (modelo) dijo: REVIEW_REQUIRED · criterio en conflicto: vigencia (sustantivo) · por qué: La respuesta c) coincide literalmente con el art. 3.2. Sin embargo, el texto marca en negrita (**) justo la salvedad que sustenta la pregunta, lo que indica una redacción modificada. Además conserva referencias antiguas (art. 39.4 TCE, nota (*) al art. 96.5 del Reglamento de la Ley Orgánica 4/2000). El texto no permite confirmar que la redacción siga vigente en los términos exactos. Se recomienda verificar la vigencia antes de validar. Las parecidas (15, 16) cubren otros extremos del artículo. · **verificación:** Verificado contra el texto consolidado del BOE (BOE-A-2007-4184, consulta 2026-10-02): la redacción citada es la vigente; los ** son negrita de la consolidación (texto introducido por modificación). Aviso de vigencia NO confirmado.

## Fase 3 — Decisión

**CALIBRATION_FAIL — por ausencia de referencia humana (INSUFFICIENT_HUMAN_REFERENCE).** No es una prueba de que v2 juzgue mal: no se ha encontrado ninguna respuesta jurídicamente errónea aprobada. Pero no hay base humana para concluir que v2 es fiable y el diagnóstico muestra debilidades reales de v2 frente a sus propios criterios:
1. **Trivialidad no detectada** (lef-1954-38: repetición de un artículo de una frase; el criterio clara de v2 la excluye y v2 la aprobó).
2. **Citas parciales aceptadas** (lef-1954-36, ley-19-2013-57, lo-4-2000-84): la respuesta está en el texto, pero la cita no la cubre entera; v2 marcó respaldada=true.
3. **Metadatos no evaluados**: dificultad sobrestimada en preguntas «dificil» casi literales (concentrado en la tanda 03) y tipo «comparativa» sin comparación. v2 no tiene criterio para esto (no se ha añadido: no se cambian los criterios en esta fase).
Se mantiene **GENERATION_PAUSED**.

## Fase 4 — S00018: las 6 REVIEW_REQUIRED (sin publicar)

Ninguna decisión humana registrada: `decisión_humana = PENDIENTE` y la acción es **mantener REVIEW_REQUIRED** hasta que una persona decida. No se ha modificado texto ni ID, no se ha ejecutado `cerrar` y no se ha publicado nada. El duplicado de Tarraco (S00018-3.0) sigue REJECTED.

| question_id | tipo | motivo_review | veredicto_v2 | 2ª opinión (modelo, NO humana) | decisión_humana | justificación (diagnóstico) | acción |
|---|---|---|---|---|---|---|---|
| S00018-0.2 | caso_practico | tipo caso_practico: revisión humana obligatoria en esta fase | VALID | REVIEW_REQUIRED | PENDIENTE | La opció D és correcta: el text diu que la policia no només ha de complir i fer complir la llei sinó també mostrar respecte cap als drets de les persones. La cita ho recolza literalment i l'explicació és coherent. Les opcions A i C contradiuen el text, i B (or | REVIEW_REQUIRED (sin cambios) |
| S00018-8.2 | caso_practico | tipo caso_practico: revisión humana obligatoria en esta fase | VALID | REVIEW_REQUIRED | PENDIENTE | La resposta B és correcta: el text situa el dret de reunió i manifestació (art. 21) entre els drets de participació o polítics. Les opcions A i D (art. 19 i 16) són drets personals i C (art. 28) és econòmic-social, segons el text, de manera que no hi ha segona | REVIEW_REQUIRED (sin cambios) |
| S00018-9.0 | literal | Pregunta sobre una data específica (any 1979). Segons les instruccions, les dates d'aprova | REVIEW_REQUIRED | REVIEW_REQUIRED | PENDIENTE | La resposta 1979 és correcta i literal segons el text, i la cita i l'explicació hi concorden. La pregunta és clara i literal, i la dificultat 1 és adequada. El motiu de revisió assenyala que és una dada de data pura i trivial, de poc valor discriminant. És una | REVIEW_REQUIRED (sin cambios) |
| S00018-12.1 | caso_practico | tipo caso_practico: revisión humana obligatoria en esta fase | VALID | VALID | PENDIENTE | La resposta B (TSJC) és correcta: el fur especial atribueix al TSJC els delictes comesos al territori de Catalunya, i l'escenari (delicte a Girona) és totalment resoluble amb el text. La Sala Penal del Suprem només correspon fora de Catalunya, i l'Audiència Pr | REVIEW_REQUIRED (sin cambios) |
| S00018-15.1 | caso_practico | tipo caso_practico: revisión humana obligatoria en esta fase | VALID | VALID | PENDIENTE | La resposta A és correcta: el text exigeix l'aval de 25 membres de la carrera judicial en servei actiu o bé el d'una associació judicial, de manera alternativa. La B (acumulatiu 'i') contradiu el text, i C i D són avals que el text no preveu. La cita és litera | REVIEW_REQUIRED (sin cambios) |
| S00018-18.2 | caso_practico | tipo caso_practico: revisión humana obligatoria en esta fase | VALID | REVIEW_REQUIRED | PENDIENTE | La resposta B és correcta: el text diu que s'han d'identificar degudament com a tals en el moment d'efectuar una detenció, i que han d'intervenir tant si són de servei com si no. L'escenari és resoluble amb el text, i l'explicació és coherent. Les opcions A, C | REVIEW_REQUIRED (sin cambios) |

Lectura: en las 6 la respuesta es correcta según el texto. Las dudas son de política (caso práctico → revisión humana obligatoria; pregunta de fecha aislada) y de metadatos (tipo/dificultad), no de corrección jurídica. 12.1 y 15.1 parecen publicables según la 2ª opinión, pero la decisión es humana.

## Fases 5–7 — Piloto histórico de 50

**NO EJECUTADO.** La condición era que la calibración humana demostrara estabilidad de v2; no hay calibración humana. Ver `JUDGE_V2_HISTORICAL_PILOT.md`.

## Fase 8 — Las 425 (riesgo alto)

**HISTORICAL_REEVALUATION_BLOCKED.** Siguen publicadas, sin cambios, marcadas JUDGE_AUDIT_REQUIRED.

## Fase 9 — Las 185 (riesgo medio)

Sin tocar: JUDGE_AUDIT_REQUIRED.
