# Validación documental independiente del juez v2 (muestra de 50)

Fecha: 2026-10-02. Política evaluada: juez-sesion-v2 (`a72e35e2…`), sin cambios. Banco, IDs, textos e históricos sin cambios. Fábrica: **GENERATION_PAUSED**.

## 1. Metodología

1. **Fuente primaria verificada en origen.** Para cada pregunta se descargó de la API oficial de legislación consolidada del BOE (`/datosabiertos/api/legislacion-consolidada/id/<BOE>/texto/bloque/<artículo>`) la última versión del artículo, se comparó con el texto que usa TestLey y se comprobó que la cita aparece literalmente en el texto del BOE. Solo lectura: no se actualizó ningún dato.
2. **Revisión pregunta a pregunta** contra ese texto oficial, sin mirar antes el veredicto v2, la segunda opinión ni el legacy: respuesta, opciones, unicidad, cita y su suficiencia (debe contener el fundamento necesario; si la respuesta tiene dos elementos y la cita uno, `citation_complete=false` → al menos REVIEW_REQUIRED), vigencia, claridad, duplicados (preguntas del mismo artículo y exámenes oficiales), tipo, dificultad y explicación. Se distingue ERROR JURÍDICO de DEFECTO DE CALIDAD y de METADATOS (tipo/dificultad/tema no rechazan por sí solos).
3. **Después** se comparó con v2, con el veredicto legacy y, como dato secundario, con la segunda opinión de modelo de la fase anterior.
4. **Límite declarado:** la revisión la ha hecho el modelo orquestador de la sesión (la misma familia de modelo que redactó las preguntas de la fábrica). Para compensarlo, cada conclusión se apoya en el texto literal del BOE consultado hoy y queda trazada (URL, versión del artículo, fecha de consulta). No es una revisión de un jurista.

## 2. Fuentes utilizadas

- BOE, texto consolidado vigente de 24 normas (consulta 2026-10-02). 50/50 artículos localizados (**0 SOURCE_UNVERIFIED**). Texto idéntico al de TestLey en 48/50; en 2 la diferencia es de formato (un espacio en ley-19-2013-43; espacios y una nota del BOE sobre una remisión en rd-240-2007-14). 50/50 citas literales en el BOE vigente.
- Para S00018: Guia d'estudi oficial de la Generalitat (edición junio 2026 con esmenes de septiembre; huella sha256 idéntica a la del PDF oficial descargado el 02/10/2026) y el examen oficial 46/002/19.
- No se ha usado ninguna academia, blog, Wikipedia ni web de terceros.

## 3–4. Tabla completa y veredicto independiente

| # | question_id | tipo | dif. | fuente (BOE) | art. | resp. correcta | cita suficiente | clara | única | duplicado | tipo ok | dif. ok | expl. ok | issues | confianza | **independiente** | v2 | legacy |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | ley-19-2013-43 | literal | 1 | [BOE-A-2013-12887](https://www.boe.es/buscar/act.php?id=BOE-A-2013-12887#a4) | 4 | sí | sí | sí | sí | no | sí | sí | sí | — | alta | **VALID** | VALID | VALID |
| 2 | ley-33-2003-37 | literal | 1 | [BOE-A-2003-20254](https://www.boe.es/buscar/act.php?id=BOE-A-2003-20254#a13) | 13 (apdo. 2) | sí | sí | sí | sí | no | sí | sí | sí | — | alta | **VALID** | VALID | VALID |
| 3 | ley-38-2003-57 | literal | 1 | [BOE-A-2003-20977](https://www.boe.es/buscar/act.php?id=BOE-A-2003-20977#a53) | 53 (apdo. b)) | sí | sí | sí | sí | no | sí | sí | sí | — | alta | **VALID** | VALID | VALID |
| 4 | ley-9-2017-92 | literal | 1 | [BOE-A-2017-12902](https://www.boe.es/buscar/act.php?id=BOE-A-2017-12902#a30) | 30 (apdo. 4) | sí | sí | sí | sí | no | sí | sí | sí | — | alta | **VALID** | VALID | VALID |
| 5 | lo-3-2018-61 | literal | 1 | [BOE-A-2018-16673](https://www.boe.es/buscar/act.php?id=BOE-A-2018-16673#a24) | 24 | sí | sí | sí | sí | no | sí | sí | sí | — | alta | **VALID** | VALID | VALID |
| 6 | rdl-8-2015-56 | literal | 1 | [BOE-A-2015-11724](https://www.boe.es/buscar/act.php?id=BOE-A-2015-11724#a17) | 17 (apdo. 2) | sí | sí | sí | sí | no | sí | sí | sí | — | alta | **VALID** | VALID | VALID |
| 7 | lo-4-2015-55 | literal | 1 | [BOE-A-2015-3442](https://www.boe.es/buscar/act.php?id=BOE-A-2015-3442#a26) | 26 | sí | sí | sí | sí | no | sí | sí | sí | — | alta | **VALID** | VALID | VALID |
| 8 | ley-42-2007-27 | literal | 1 | [BOE-A-2007-21490](https://www.boe.es/buscar/act.php?id=BOE-A-2007-21490#a2) | 2 (apdo. f)) | sí | sí | sí | sí | no | sí | sí | sí | — | alta | **VALID** | VALID | VALID |
| 9 | lef-1954-47 | literal | 1 | [BOE-A-1954-15431](https://www.boe.es/buscar/act.php?id=BOE-A-1954-15431#atreintaytres) | 33 (apdo. 1) | sí | sí | sí | sí | no | sí | sí | sí | — | alta | **VALID** | VALID | VALID |
| 10 | lo-4-2000-82 | literal | 1 | [BOE-A-2000-544](https://www.boe.es/buscar/act.php?id=BOE-A-2000-544#a10) | 10 (apdo. 2) | sí | sí | sí | sí | no | sí | sí | sí | — | alta | **VALID** | VALID | VALID |
| 11 | lef-1954-36 | aplicacion | 2 | [BOE-A-1954-15431](https://www.boe.es/buscar/act.php?id=BOE-A-1954-15431#aoctavo) | 8 | sí | NO | sí | sí | no | sí | sí | sí | CITA_INCOMPLETA | alta | **REVIEW_REQUIRED** | VALID | VALID |
| 12 | lef-1954-41 | aplicacion | 2 | [BOE-A-1954-15431](https://www.boe.es/buscar/act.php?id=BOE-A-1954-15431#adiecinueve) | 19 (apdo. 1) | sí | sí | sí | sí | no | sí | sí | sí | — | alta | **VALID** | VALID | VALID |
| 13 | codigo-penal-674 | aplicacion | 2 | [BOE-A-1995-25444](https://www.boe.es/buscar/act.php?id=BOE-A-1995-25444#a331) | 331 | sí | sí | sí | sí | no | sí | sí | sí | — | alta | **VALID** | VALID | VALID |
| 14 | lef-1954-32 | aplicacion | 2 | [BOE-A-1954-15431](https://www.boe.es/buscar/act.php?id=BOE-A-1954-15431#acuarto) | 4 (apdo. 1) | sí | sí | sí | sí | no | sí | sí | sí | — | alta | **VALID** | VALID | VALID |
| 15 | codigo-penal-650 | aplicacion | 2 | [BOE-A-1995-25444](https://www.boe.es/buscar/act.php?id=BOE-A-1995-25444#a327) | 327 (apdo. c)) | sí | sí | sí | sí | no | sí | sí | sí | — | alta | **VALID** | VALID | VALID |
| 16 | lef-1954-40 | aplicacion | 2 | [BOE-A-1954-15431](https://www.boe.es/buscar/act.php?id=BOE-A-1954-15431#adieciseis) | 16 | sí | sí | sí | sí | no | sí | sí | sí | — | media | **VALID** | VALID | VALID |
| 17 | ley-12-2009-43 | aplicacion | 2 | [BOE-A-2009-17242](https://www.boe.es/buscar/act.php?id=BOE-A-2009-17242#a7) | 7 (apdo. 2) | sí | sí | sí | sí | no | sí | sí | sí | — | alta | **VALID** | VALID | VALID |
| 18 | reglamento-armas-60 | aplicacion | 2 | [BOE-A-1993-6202](https://www.boe.es/buscar/act.php?id=BOE-A-1993-6202#a20) | 20 (apdo. 1) | sí | sí | sí | sí | no | sí | sí | sí | ERRATA_EXPLICACION | alta | **VALID** | VALID | VALID |
| 19 | lecrim-192 | aplicacion | 2 | [BOE-A-1882-6036](https://www.boe.es/buscar/act.php?id=BOE-A-1882-6036#a11) | 11 | sí | sí | sí | sí | no | sí | sí | sí | — | alta | **VALID** | VALID | VALID |
| 20 | lef-1954-38 | aplicacion | 2 | [BOE-A-1954-15431](https://www.boe.es/buscar/act.php?id=BOE-A-1954-15431#atrece) | 13 | sí | sí | sí | sí | no | NO | sí | sí | TRIVIAL, TIPO | alta | **REVIEW_REQUIRED** | VALID | VALID |
| 21 | ley-19-2013-57 | dificil | 3 | [BOE-A-2013-12887](https://www.boe.es/buscar/act.php?id=BOE-A-2013-12887#a31) | 31 (apdo. 4.a)) | sí | NO | sí | sí | no | sí | sí | sí | CITA_INCOMPLETA | alta | **REVIEW_REQUIRED** | VALID | VALID |
| 22 | ley-50-1997-49 | dificil | 3 | [BOE-A-1997-25336](https://www.boe.es/buscar/act.php?id=BOE-A-1997-25336#a7) | 7 (apdo. 1) | sí | sí | sí | sí | no | sí | NO | sí | DIFICULTAD | alta | **VALID** | VALID | VALID |
| 23 | rgc-23 | dificil | 3 | [BOE-A-2003-23514](https://www.boe.es/buscar/act.php?id=BOE-A-2003-23514#a1) | 1 (apdo. 4) | sí | sí | sí | sí | no | sí | NO | sí | DIFICULTAD, TEMA | alta | **VALID** | VALID | VALID |
| 24 | ley-33-2003-35 | dificil | 3 | [BOE-A-2003-20254](https://www.boe.es/buscar/act.php?id=BOE-A-2003-20254#a11) | 11 (apdo. 1) | sí | sí | sí | sí | no | sí | NO | sí | DIFICULTAD | alta | **VALID** | VALID | VALID |
| 25 | ley-23-2014-48 | dificil | 3 | [BOE-A-2014-12029](https://www.boe.es/buscar/act.php?id=BOE-A-2014-12029#a21) | 21 (apdo. 2) | sí | sí | sí | sí | no | sí | sí | sí | — | alta | **VALID** | VALID | VALID |
| 26 | lo-9-2015-18 | dificil | 3 | [BOE-A-2015-8468](https://www.boe.es/buscar/act.php?id=BOE-A-2015-8468#a9) | 9 (apdo. i)) | sí | sí | sí | sí | no | sí | NO | sí | DIFICULTAD | alta | **VALID** | VALID | VALID |
| 27 | ley-4-2015-38 | dificil | 3 | [BOE-A-2015-4606](https://www.boe.es/buscar/act.php?id=BOE-A-2015-4606#a22) | 22 | sí | sí | sí | sí | no | sí | NO | sí | DIFICULTAD | alta | **VALID** | VALID | VALID |
| 28 | lo-6-1985-71 | dificil | 3 | [BOE-A-1985-12666](https://www.boe.es/buscar/act.php?id=BOE-A-1985-12666#aseptimo) | 7 (apdo. 3) | sí | sí | sí | sí | no | sí | NO | sí | DIFICULTAD | alta | **VALID** | VALID | VALID |
| 29 | lo-4-2000-84 | dificil | 3 | [BOE-A-2000-544](https://www.boe.es/buscar/act.php?id=BOE-A-2000-544#a62quinquies) | 62quinquies (apdo. 3) | sí | NO | sí | sí | no | sí | sí | sí | CITA_INCOMPLETA, TEMA | alta | **REVIEW_REQUIRED** | VALID | VALID |
| 30 | ley-23-2014-40 | dificil | 3 | [BOE-A-2014-12029](https://www.boe.es/buscar/act.php?id=BOE-A-2014-12029#a12) | 12 | sí | sí | sí | sí | no | sí | sí | sí | — | alta | **VALID** | VALID | VALID |
| 31 | ley-23-2014-56 | negativa | 2 | [BOE-A-2014-12029](https://www.boe.es/buscar/act.php?id=BOE-A-2014-12029#a32) | 32 (apdo. 3.a)) | sí | sí | sí | sí | no | sí | sí | sí | — | alta | **VALID** | VALID | VALID |
| 32 | codigo-penal-626 | negativa | 2 | [BOE-A-1995-25444](https://www.boe.es/buscar/act.php?id=BOE-A-1995-25444#a566) | 566 (apdo. 2) | sí | NO | sí | sí | no | sí | sí | sí | CITA_INCOMPLETA_ENGAÑOSA | alta | **REVIEW_REQUIRED** | VALID | VALID |
| 33 | lecrim-219 | negativa | 2 | [BOE-A-1882-6036](https://www.boe.es/buscar/act.php?id=BOE-A-1882-6036#a507) | 507 (apdo. 1) | sí | sí | sí | sí | no | sí | sí | sí | — | alta | **VALID** | VALID | VALID |
| 34 | lo-4-2000-103 | negativa | 2 | [BOE-A-2000-544](https://www.boe.es/buscar/act.php?id=BOE-A-2000-544#a16) | 16 (apdo. 2) | sí | sí | sí | sí | no | sí | sí | sí | — | alta | **VALID** | VALID | VALID |
| 35 | ley-12-2009-58 | negativa | 2 | [BOE-A-2009-17242](https://www.boe.es/buscar/act.php?id=BOE-A-2009-17242#a46) | 46 (apdo. 1) | sí | sí | sí | sí | no | sí | sí | sí | — | alta | **VALID** | VALID | VALID |
| 36 | ley-3-2023-42 | comparativa | 2 | [BOE-A-2023-5365](https://www.boe.es/buscar/act.php?id=BOE-A-2023-5365#a21) | 21 | sí | sí | sí | sí | no | sí | sí | sí | — | alta | **VALID** | VALID | VALID |
| 37 | lo-4-2000-72 | comparativa | 2 | [BOE-A-2000-544](https://www.boe.es/buscar/act.php?id=BOE-A-2000-544#a35) | 35 (apdo. 6) | sí | sí | sí | sí | no | NO | sí | sí | TIPO | alta | **VALID** | VALID | VALID |
| 38 | lo-3-2018-43 | comparativa | 2 | [BOE-A-2018-16673](https://www.boe.es/buscar/act.php?id=BOE-A-2018-16673#a4) | 4 (apdo. 2.b)) | sí | sí | sí | sí | no | NO | sí | sí | TIPO | alta | **VALID** | VALID | VALID |
| 39 | ley-19-2013-55 | comparativa | 2 | [BOE-A-2013-12887](https://www.boe.es/buscar/act.php?id=BOE-A-2013-12887#a29) | 29 (apdo. 1.c)) | sí | sí | sí | sí | no | sí | sí | sí | — | alta | **VALID** | VALID | VALID |
| 40 | ley-5-2014-42 | comparativa | 2 | [BOE-A-2014-3649](https://www.boe.es/buscar/act.php?id=BOE-A-2014-3649#a21) | 21 (apdo. 1.e)) | sí | sí | sí | sí | no | sí | sí | sí | — | alta | **VALID** | VALID | VALID |
| 41 | lo-3-2018-60 | excepcion | 2 | [BOE-A-2018-16673](https://www.boe.es/buscar/act.php?id=BOE-A-2018-16673#a23) | 23 (apdo. 4) | sí | sí | sí | sí | no | sí | sí | sí | — | alta | **VALID** | VALID | VALID |
| 42 | rd-240-2007-14 | excepcion | 2 | [BOE-A-2007-4184](https://www.boe.es/buscar/act.php?id=BOE-A-2007-4184#a3) | 3 (apdo. 2) | sí | sí | sí | sí | no | sí | sí | sí | — | alta | **VALID** | VALID | VALID |
| 43 | lecrim-216 | excepcion | 2 | [BOE-A-1882-6036](https://www.boe.es/buscar/act.php?id=BOE-A-1882-6036#a506) | 506 (apdo. 2) | sí | sí | sí | sí | no | sí | sí | sí | — | alta | **VALID** | VALID | VALID |
| 44 | lo-9-2015-15 | excepcion | 2 | [BOE-A-2015-8468](https://www.boe.es/buscar/act.php?id=BOE-A-2015-8468#a8) | 8 (apdo. 2) | sí | sí | sí | sí | no | sí | sí | sí | — | alta | **VALID** | VALID | VALID |
| 45 | rdl-8-2015-63 | excepcion | 2 | [BOE-A-2015-11724](https://www.boe.es/buscar/act.php?id=BOE-A-2015-11724#a21) | 21 (apdo. 2) | sí | sí | sí | sí | no | sí | sí | sí | REDACCION | alta | **VALID** | VALID | VALID |
| 46 | lo-4-2000-85 | plazos | 1 | [BOE-A-2000-544](https://www.boe.es/buscar/act.php?id=BOE-A-2000-544#a62quinquies) | 62quinquies (apdo. 3) | sí | sí | sí | sí | no | sí | sí | sí | — | alta | **VALID** | VALID | VALID |
| 47 | codigo-penal-661 | plazos | 1 | [BOE-A-1995-25444](https://www.boe.es/buscar/act.php?id=BOE-A-1995-25444#a329) | 329 (apdo. 1) | sí | sí | sí | sí | no | sí | sí | sí | — | alta | **VALID** | VALID | VALID |
| 48 | codigo-penal-655 | plazos | 1 | [BOE-A-1995-25444](https://www.boe.es/buscar/act.php?id=BOE-A-1995-25444#a328) | 328 (apdo. b)) | sí | sí | sí | sí | no | sí | sí | sí | — | alta | **VALID** | VALID | VALID |
| 49 | ley-5-2014-40 | plazos | 1 | [BOE-A-2014-3649](https://www.boe.es/buscar/act.php?id=BOE-A-2014-3649#a21) | 21 (apdo. 1.e)) | sí | sí | sí | sí | no | sí | sí | sí | — | alta | **VALID** | VALID | VALID |
| 50 | l39-168 | plazos | 1 | [BOE-A-2015-10565](https://www.boe.es/buscar/act.php?id=BOE-A-2015-10565#a28) | 28 (apdo. 4) | sí | sí | sí | sí | no | sí | sí | sí | — | alta | **VALID** | VALID | VALID |

**Resultado independiente:** VALID 45 · REVIEW_REQUIRED 5 · REJECTED 0 · SOURCE_UNVERIFIED 0.

### Notas por pregunta (solo las que tienen observaciones)

- **lef-1954-36** — La respuesta (B) es correcta según el art. 8, pero la cita termina en «si resultase compatible» y omite «y existiera acuerdo entre el expropiante y el titular del derecho», que es justo el elemento que distingue B de las demás opciones.
- **codigo-penal-674** — Correcta (art. 331). La referencia del enunciado al «capítulo III del título XVI» coincide con la estructura oficial del Código Penal (arts. 325-331).
- **lef-1954-40** — Correcta: reproduce el art. 16 tal como figura en el BOE consolidado vigente («Concordato vigente»); la pregunta no exige identificar qué instrumento concordatario está hoy en vigor.
- **reglamento-armas-60** — Correcta (art. 20.1). Errata menor en la explicación («de el Reglamento»).
- **lef-1954-38** — Correcta: el art. 13 remite al «mismo procedimiento previsto en el artículo anterior» y la opción D lo reproduce casi literal. Es trivial (repite un artículo de una sola frase) y el tipo «aplicacion» no corresponde (es literal). No requiere el contenido del art. 12. La mención del texto a los arts. 30-31 del Fuero de los Españoles es la del BOE consolidado vigente (la pregunta no la usa). Defecto de calidad, no error jurídico.
- **ley-19-2013-57** — Correcta (C): instrucción por la Oficina de Conflictos de Intereses (art. 31.3) y sanción por el Consejo de Ministros (art. 31.4.a). La pregunta tiene dos elementos y la cita solo cubre la sanción.
- **ley-50-1997-49** — Correcta y única (B = art. 7.1: órganos superiores, responsables de la acción del Gobierno en un sector específico). A y C son «directivos» (el texto dice superiores); D es falsa porque actúan bajo el titular del Departamento y solo bajo el Presidente si están adscritos a Presidencia (7.2). La cita cubre la respuesta. La explicación es correcta (lo de «no directivos» se deduce de «órganos superiores»). Solapa en tema con ley-50-1997-48 (que pregunta por el 7.2) pero no es duplicado. Dificultad 3 alta para una definición: 2.
- **rgc-23** — Correcta (C = art. 1.4). La cita recoge la condición («siempre que lo hagan de manera que no desvirtúen…»), que es lo que discrimina. Tema asignado (Tema 80, vehículo prioritario) no corresponde al art. 1 (ámbito de aplicación): metadato. Dificultad 3 alta: 2.
- **ley-33-2003-35** — Correcta y literal del art. 11.1. Dificultad 3 alta: 1-2.
- **lo-9-2015-18** — Correcta (art. 9.i, segundo párrafo); la opción A recoge la regla del estado de excepción o sitio, buen distractor. Dificultad 3 alta: 2.
- **ley-4-2015-38** — Correcta y literal del art. 22. Dificultad 3 alta: 1-2. No duplica ley-4-2015-39 (pregunta a quién corresponde adoptar las medidas).
- **lo-6-1985-71** — Correcta y literal del art. 7.3 (texto vigente tras la reforma de 2025). Dificultad 3 alta: 2.
- **lo-4-2000-84** — Correcta (B) según el art. 62 quinquies.3. La cita cubre la autorización previa del director y no la comunicación «lo antes posible a la autoridad judicial que autorizó el internamiento», segundo elemento de la respuesta. Tema asignado (Tema 11, infracciones) no corresponde al contenido (centros de internamiento): metadato.
- **ley-23-2014-56** — Correcta: la comisión de los hechos en territorio español es causa potestativa del apartado 3.a), no del apartado 1; A, B y C están en 1.c), 1.b) y 1.a). La cita muestra dónde está el supuesto D.
- **codigo-penal-626** — Correcta (A): reparar armas de fuego reglamentadas no figura en el art. 566.2. Pero la cita corta la enumeración antes de «o inicien preparativos militares para su empleo o no las destruyan con infracción de los tratados», que es el fundamento de que la opción D SÍ figure: mostrada como justificación, haría creer que D tampoco está en el apartado.
- **lo-4-2000-103** — Correcta: el art. 16.2 atribuye la reagrupación a los extranjeros residentes; A y D están en el 16.1 y B en el 16.2. La cita (16.2) basta para descartar C.
- **lo-4-2000-72** — Correcta (art. 35.6, segundo párrafo). El tipo «comparativa» no corresponde: el enunciado pregunta una regla única (la comparación solo está en la explicación).
- **lo-3-2018-43** — Correcta (art. 4.2.b). El tipo «comparativa» no corresponde: pregunta una regla concreta.
- **rd-240-2007-14** — Correcta: el art. 3.2 vigente (BOE consolidado, versión de 03/11/2010) contiene exactamente la excepción citada. Los ** del texto de TestLey son la negrita de la consolidación. La nota del BOE sobre la remisión al art. 96.5 (hoy art. 200.3 del Reglamento de la LO 4/2000) no afecta a la respuesta. Vigencia confirmada.
- **rdl-8-2015-63** — Correcta (art. 21.2). Enunciado algo forzado («…expresamente mencionada, la:»), comprensible.

## 5. Discrepancias con v2

v2 dio VALID a las 50. Coincidencia con la revisión independiente: **45/50**. Las 5 discrepancias van todas en la misma dirección (v2 más permisivo):

- **lef-1954-36** — v2: VALID · independiente: REVIEW_REQUIRED · criterio: CITA_INCOMPLETA
- **lef-1954-38** — v2: VALID · independiente: REVIEW_REQUIRED · criterio: TRIVIAL, TIPO
- **ley-19-2013-57** — v2: VALID · independiente: REVIEW_REQUIRED · criterio: CITA_INCOMPLETA
- **lo-4-2000-84** — v2: VALID · independiente: REVIEW_REQUIRED · criterio: CITA_INCOMPLETA, TEMA
- **codigo-penal-626** — v2: VALID · independiente: REVIEW_REQUIRED · criterio: CITA_INCOMPLETA_ENGAÑOSA

## 6. Discrepancias con legacy

El legacy (juez v0.x/v1 de cada lote) también dio VALID a las 50: mismas 5 discrepancias. Segunda opinión de modelo (dato secundario): coincide con la revisión independiente en 39/50; su alarma de vigencia en rd-240-2007-14 y su objeción a ley-50-1997-49 no se confirman contra el BOE, y no detectó la cita engañosa de codigo-penal-626.

## 7. Errores jurídicos

**Ninguno.** En las 50 la respuesta marcada es la correcta según el texto vigente del BOE y no hay otra opción razonablemente correcta.

## 8. Errores de cita

- **lef-1954-36** — La respuesta (B) es correcta según el art. 8, pero la cita termina en «si resultase compatible» y omite «y existiera acuerdo entre el expropiante y el titular del derecho», que es justo el elemento que distingue B de las demás opciones.
- **ley-19-2013-57** — Correcta (C): instrucción por la Oficina de Conflictos de Intereses (art. 31.3) y sanción por el Consejo de Ministros (art. 31.4.a). La pregunta tiene dos elementos y la cita solo cubre la sanción.
- **lo-4-2000-84** — Correcta (B) según el art. 62 quinquies.3. La cita cubre la autorización previa del director y no la comunicación «lo antes posible a la autoridad judicial que autorizó el internamiento», segundo elemento de la respuesta. Tema asignado (Tema 11, infracciones) no corresponde al contenido (centros de internamiento): metadato.
- **codigo-penal-626** — Correcta (A): reparar armas de fuego reglamentadas no figura en el art. 566.2. Pero la cita corta la enumeración antes de «o inicien preparativos militares para su empleo o no las destruyan con infracción de los tratados», que es el fundamento de que la opción D SÍ figure: mostrada como justificación, haría creer que D tampoco está en el apartado.

## 9. Claridad y calidad

- **lef-1954-38** — TRIVIAL (repite un artículo de una frase) y tipo incorrecto: REVIEW_REQUIRED como defecto de calidad, no error jurídico.
- Menores sin efecto en el veredicto: rdl-8-2015-63 (redacción forzada), reglamento-armas-60 (errata «de el» en la explicación).

## 10. Duplicados

Ninguno en la muestra (comparadas con las preguntas del mismo artículo y, en S00018, con los exámenes oficiales).

## 11–12. Tipo, dificultad y tema (METADATOS, no afectan al veredicto)

- Dificultad sobrestimada: ley-50-1997-49, rgc-23, ley-33-2003-35, lo-9-2015-18, ley-4-2015-38, lo-6-1985-71 (casi todas etiquetadas «dificil»/3 siendo lectura casi literal).
- Tipo que no corresponde: lef-1954-38, lo-4-2000-72, lo-3-2018-43.
- Tema asignado que no corresponde: rgc-23 (Tema 80), lo-4-2000-84 (Tema 11).

## 13. SOURCE_UNVERIFIED

Ninguno: los 50 artículos se verificaron en el BOE vigente.

## 14. Conclusión

- v2 **no ha aprobado ninguna respuesta jurídicamente errónea** en la muestra y su mecanismo (evaluación individual, guards) funciona.
- v2 es **demasiado permisivo con la suficiencia de la cita** (4 de 50, una de ellas engañosa) y con la **trivialidad** (1 de 50): 5/50 = 10 % de sus VALID no lo son según la revisión documental. El criterio actual permite justificar con «el texto del artículo (y la cita)», no exige que la cita sola contenga el fundamento. Ver `JUDGE_V2_DEFECTS.md`.
- Decisión de calibración: **CALIBRATION_PASS_WITH_REVIEW** — utilizable como filtro de corrección jurídica, pero no para publicar sin corregir antes el criterio de cita (propuesta v3, no aplicada).

## S00018 (no publicado)

| question_id | tipo | fuente | resp. correcta | cita suficiente | claridad | tipo ok | dif. ok | independiente | motivo |
|---|---|---|---|---|---|---|---|---|---|
| S00018-0.2 | caso_practico | Guia d'estudi 2026, apartat C.5.1 | sí | sí | sí | sí | NO | **VALID** | Respuesta D literal en C.5.1 («no solament ha de complir i fer complir la llei, sinó que, a més, ha de mostrar respecte cap als drets de les persones»). Cita suficiente. Caso práctico ligero; dificultad 3 alta (2). |
| S00018-8.2 | caso_practico | Guia d'estudi 2026, apartat B.4.2 | sí | NO | sí | sí | NO | **REVIEW_REQUIRED** | Respuesta B correcta (B.4.2 sitúa el art. 21 entre los drets de participació o polítics; arts. 16 y 19 personales; art. 28 econòmics i socials). Pero la cita («el dret de reunió i manifestació (art. 21)») no contiene la categoría que se pregunta: cita incompleta. |
| S00018-9.0 | literal | Guia d'estudi 2026, apartat B.7.2 | sí | sí | sí | sí | sí | **VALID** | Respuesta B (1979) literal en B.7.2. Dato histórico aislado de valor limitado (DATO_AISLADO), pero no es la fecha de un decreto ni una fórmula: es un hito del Estado autonómico, material habitual de examen. Defecto de calidad menor, no error. |
| S00018-12.1 | caso_practico | Guia d'estudi 2026, apartat B.2.2 | sí | sí | sí | sí | sí | **VALID** | Respuesta B (TSJC) literal en B.2.2 para delitos comesos en territorio de Cataluña; el Supremo solo fuera de Cataluña. Escenario (Girona) resoluble con la cita. |
| S00018-15.1 | caso_practico | Guia d'estudi 2026, apartat B.6.2 | sí | sí | sí | sí | sí | **VALID** | Respuesta A literal en B.6.2: aval de 25 miembros de la carrera judicial en servicio activo «o bé» de una asociación judicial (alternativo, no acumulativo como en B). |
| S00018-18.2 | caso_practico | Guia d'estudi 2026, apartat C.4.1 (art. 5.3.a LO 2/1986) | sí | sí | sí | sí | NO | **VALID** | Respuesta B literal en C.4.1 (3.a: identificarse en el momento de la detención); el «fuera de servicio» del enunciado no cambia la regla (punto 4: intervienen estén o no de servicio). Distractores débiles; dificultad 3 alta (1-2). |
| S00018-3.0 | literal | Guia d'estudi 2026, apartat A.1.2 + examen oficial 46/002/19 (mx46-002-19-6) | sí | sí | sí | sí | sí | **REJECTED** | Respuesta correcta (Tarraco), pero es la misma pregunta que la oficial mx46-002-19-6 («La ciutat més important de la Catalunya romana fou: … Tarraco»): duplicado sustancial. Se mantiene REJECTED. |

Las 6 REVIEW_REQUIRED: 5 son jurídicamente correctas con cita suficiente (0.2, 9.0, 12.1, 15.1, 18.2) y 1 tiene cita incompleta (8.2). Sus problemas de tipo/dificultad son metadatos. Las 4 de caso práctico siguen sujetas a la regla vigente de la fábrica (caso práctico → aprobación explícita), así que no pasan a publicarse solas. Tarraco (3.0) sigue REJECTED por duplicado oficial. Nada de S00018 se ha publicado.

## Plan preparado (NO ejecutado) para las 425 y las 185

1. Autorizar y crear juez-sesion-v3 (`JUDGE_V2_DEFECTS.md`), validarlo con estas mismas 50 (debe marcar exactamente las 5 REVIEW y las 45 VALID).
2. Piloto estratificado de 50 de las 425 (semilla fija; oposición, ley, tipo, dificultad) con v3; comparar legacy ↔ v3 ↔ contraste documental contra el BOE de una submuestra de 20.
3. Si el piloto no muestra errores jurídicos aprobados: reevaluar las 425 por lotes de 50 con `fabrica.reevaluacion` (marcar → juez en tandas de 10 → aplicar). Se conservan `legacy_verdict`, `legacy_policy_version`, `legacy_judge`, `legacy_batch` y se añaden `reevaluation_verdict`, `reevaluation_policy_version`, `reevaluation_at`, `reevaluation_reason` y el historial `reevaluaciones[]`; nunca se sobrescribe. Durante cada lote: REVIEW_REQUIRED_REEVALUATION (no se sirven, mismo ID).
4. Después, las 185 de riesgo medio con el mismo procedimiento.
5. GENERATION_PAUSED durante todo el proceso.
