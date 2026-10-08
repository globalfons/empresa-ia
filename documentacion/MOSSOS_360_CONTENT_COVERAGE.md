# Mossos 360 · Content Coverage (auditoría real)

Generado por `python3 -m fabrica.cobertura360 informe mossos-esquadra` desde los datos del repositorio (nada a mano). Convocatoria 46/26 · fábrica de preguntas: **ACTIVE**.

Estados: **OFFICIAL_EXAM** = pregunta de un examen oficial · **OFFICIAL_VERIFIED** = dato de las bases verificado contra el texto · **TESTLEY_GENERATED/TESTLEY_TRAINING** = contenido propio · **REVIEW_REQUIRED** = no se sirve · **DEPRECATED/OUTDATED** = retirado. Los objetivos usan parámetros de entrenamiento de TestLey (abajo), nunca requisitos oficiales.

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

## Resumen

| área | contenido servido | en revisión | retirado | oficial |
|---|---|---|---|---|
| Conocimientos | 1013 TestLey | 140 | 4 | 266 OFFICIAL_EXAM VALID (9 exámenes) |
| Aptitud | generadores: 11 formatos × 3 dificultades | 0 | 0 | estructura (80 preguntas, 35 min); sin ejercicios oficiales |
| Competencias | 45 situaciones + 9 fichas | 15 | 0 | 10 nombres de competencias |
| Entrevista | 56 escenarios | 29 | 0 | objeto de la entrevista y 10 competencias |
| Idiomas | 0 | 0 | 0 | requisito C1, estructura de la prueba e idiomas voluntarios |
| Física | — (Fase 4) | 0 | 0 | 3 pruebas con barems verificados |

## 1. Knowledge

Formato oficial del simulacro: 30 preguntas, 35 min, penalización 0.25. Peso de cada tema = su proporción en los exámenes oficiales transcritos. Preguntas oficiales sin apartado asignado: 33 ({'VALID': 31, 'REVIEW_REQUIRED': 2}).

| tema | apartados (con fuente) | TestLey VALID | REVIEW | DEPRECATED | oficial VALID / REVIEW / OUTDATED | peso exámenes | capacidad | objetivo | faltan | prioridad |
|---|---|---|---|---|---|---|---|---|---|---|
| A.1 Història de Catalunya (part I) | 10 (10) | 64 | 19 | 1 | 19 / 0 / 0 | 7.4% | 90 | 23 | 0 | P3 |
| A.2 Història de Catalunya (part II) | 9 (9) | 78 | 5 | 0 | 14 / 0 / 0 | 5.5% | 89 | 18 | 0 | P3 |
| A.3 Història de la policia a Catalunya | 6 (6) | 50 | 5 | 0 | 7 / 0 / 0 | 2.7% | 55 | 12 | 0 | P3 |
| A.4 Àmbit sociolingüístic | 5 (5) | 43 | 8 | 0 | 16 / 0 / 0 | 6.2% | 50 | 19 | 0 | P3 |
| A.5 Marc geogràfic de Catalunya | 7 (7) | 52 | 8 | 0 | 12 / 0 / 0 | 4.7% | 60 | 15 | 0 | P3 |
| A.6 Entorn social a Catalunya | 6 (6) | 54 | 7 | 0 | 9 / 1 / 0 | 3.9% | 60 | 12 | 0 | P3 |
| A.7 Les tecnologies de la informació e | 7 (7) | 59 | 6 | 0 | 8 / 0 / 0 | 3.1% | 66 | 14 | 0 | P3 |
| B.1 L'Estatut d'autonomia de Catalunya | 6 (6) | 59 | 10 | 0 | 4 / 2 / 0 | 2.3% | 53 | 12 | 0 | P3 |
| B.2 Les institucions polítiques de Cat | 6 (6) | 49 | 10 | 1 | 20 / 0 / 0 | 7.8% | 58 | 24 | 0 | P3 |
| B.3 L'ordenament jurídic de l'Estat | 32 (32) | 82 | 6 | 0 | 11 / 0 / 0 | 4.3% | 101 | 64 | 0 | P3 |
| B.4 Els drets humans i els drets const | 9 (9) | 73 | 4 | 0 | 11 / 1 / 0 | 4.7% | 85 | 18 | 0 | P3 |
| B.5 Les institucions polítiques de l'E | 5 (5) | 35 | 10 | 0 | 5 / 0 / 0 | 1.9% | 45 | 10 | 0 | P3 |
| B.6 Els òrgans jurisdiccionals. Poder  | 5 (5) | 39 | 8 | 0 | 11 / 0 / 0 | 4.3% | 46 | 13 | 0 | P3 |
| B.7 L'organització territorial de l'Es | 8 (8) | 50 | 6 | 0 | 8 / 0 / 0 | 3.1% | 56 | 16 | 0 | P3 |
| B.8 La Unió Europea | 4 (4) | 36 | 3 | 0 | 11 / 1 / 0 | 4.7% | 39 | 15 | 0 | P3 |
| C.1 Les competències de la Generalitat | 3 (3) | 18 | 0 | 1 | 6 / 1 / 0 | 2.7% | 18 | 9 | 0 | P3 |
| C.2 El Departament d'Interior | 8 (8) | 54 | 5 | 0 | 23 / 9 / 3 | 13.6% | 58 | 41 | 0 | P3 |
| C.3 La coordinació policial | 6 (6) | 51 | 11 | 0 | 22 / 3 / 0 | 9.7% | 60 | 30 | 0 | P3 |
| C.4 El marc legal de la seguretat | 5 (5) | 44 | 6 | 0 | 14 / 1 / 0 | 5.8% | 50 | 18 | 0 | P3 |
| C.5 El Codi deontològic policial | 4 (4) | 23 | 3 | 1 | 4 / 0 / 0 | 1.6% | 26 | 8 | 0 | P3 |
| D Coneixement de l'entorn polític, e | 0 (0) | 0 | 0 | 0 | 0 / 0 / 0 | 0.0% | 0 | 0 | 0 | P1 |

### Apartados sin cobertura, bloqueados y concentración

| tema | apartados sin preguntas | apartados bloqueados (sin texto oficial) | sobreexplotados | concentración excesiva | tipos mínimos ausentes |
|---|---|---|---|---|---|
| A.1 | — | — | — | — | caso_practico |
| A.2 | — | — | — | — | caso_practico |
| A.3 | — | — | — | — | caso_practico |
| A.4 | — | — | — | — | caso_practico |
| A.5 | — | — | — | — | caso_practico |
| A.6 | — | — | — | — | caso_practico |
| A.7 | — | — | — | — | caso_practico |
| B.1 | — | — | — | sí: 6% del banco TestLey frente a 2% del examen | negativa, dificil, caso_practico |
| B.2 | — | — | — | — | caso_practico |
| B.3 | 88 | — | 1, 2, 3, 7, 8, 9, 95, 96 | — | caso_practico |
| B.4 | — | — | — | — | caso_practico |
| B.5 | — | — | — | — | caso_practico |
| B.6 | — | — | — | — | negativa, caso_practico |
| B.7 | — | — | — | — | caso_practico |
| B.8 | — | — | — | — | caso_practico |
| C.1 | — | — | — | — | negativa, caso_practico |
| C.2 | C.2.2 | — | — | — | caso_practico |
| C.3 | — | — | — | — | caso_practico |
| C.4 | — | — | — | — | conceptual, negativa, caso_practico |
| C.5 | — | — | — | — | caso_practico |
| D | — | — | — | — | — |

## 2. Aptitude

Oficial (OFFICIAL_VERIFIED): 80 preguntas, 35 min, sin penalización, mínimo 5; aptitudes: abstracto, espacial, verbal, numerico, perceptivo. Las bases no publican la conversión de aciertos a puntos: TestLey no calcula una nota oficial aptitudinal. Contenido: generadores deterministas (web/assets/aptitud.js, VERIFIED_BY_COMPUTATION, TESTLEY_GENERATED); espacio real medido ejecutando el generador con 2000 semillas por combinación.

| aptitud | formatos (subtipos) | dificultades | banco oficial/revisado | mín. ejercicios distintos por combinación | errores de verificación | huecos | prioridad |
|---|---|---|---|---|---|---|---|
| abstract | serie_figuras | 1-3 | 0 | 1818 | 0 | un solo formato de ejercicio | P2 |
| spatial | rotacion | 1-3 | 0 | 1685 | 0 | un solo formato de ejercicio | P2 |
| verbal | serie_letras, orden_alfabetico, anagrama, codificacion | 1-3 | 0 | 1249 | 0 | solo formatos formales (series de letras, orden alfabético): sin vocabulario, sinónimos, antónimos, analogías ni comprensión; las bases solo dicen «aptitud verbal», no publican formatos | P1 |
| numerical | serie, porcentaje, proporcion | 1-3 | 0 | 1022 | 0 | — | P3 |
| perceptive | pares_identicos, contar_simbolo | 1-3 | 0 | 2000 | 0 | — | P3 |

## 3. Competencies

Lotes publicados: C00002 · modelos del juez: claude-haiku-4-5 · **requiere recalibración** (solo juzgado con un modelo que en entrevista resultó laxo)

| competencia oficial | ficha VALID | situaciones | VALID | REVIEW | formatos | ítems de autoevaluación | objetivo | faltan |
|---|---|---|---|---|---|---|---|---|
| Responsabilitat i orientació a la qualitat | 1 | 4 | 4 | 2 | {'eleccion': 3, 'ranking': 1} | 2 | 6 | 2 |
| Cooperació i treball en equip | 1 | 6 | 6 | 0 | {'eleccion': 4, 'ranking': 2} | 2 | 6 | 0 |
| Autonomia i iniciativa | 1 | 4 | 4 | 2 | {'eleccion': 3, 'ranking': 1} | 2 | 6 | 2 |
| Resolució de problemes | 1 | 4 | 4 | 2 | {'eleccion': 4} | 2 | 6 | 2 |
| Orientació de servei a les persones | 1 | 4 | 4 | 2 | {'eleccion': 3, 'ranking': 1} | 2 | 6 | 2 |
| Adaptabilitat i flexibilitat | 1 | 4 | 4 | 2 | {'eleccion': 3, 'ranking': 1} | 2 | 6 | 2 |
| Autocontrol i resistència a la pressió | 1 | 5 | 5 | 1 | {'eleccion': 4, 'ranking': 1} | 2 | 6 | 1 |
| Autogestió i desenvolupament personal | 1 | 5 | 5 | 1 | {'eleccion': 4, 'ranking': 1} | 2 | 6 | 1 |
| Motivació i identificació amb l'organització | 1 | 4 | 4 | 2 | {'eleccion': 3, 'ranking': 1} | 2 | 6 | 2 |
| Habilitats socials i comunicatives | 0 | 5 | 5 | 1 | {'eleccion': 4, 'ranking': 1} | 0 | 6 | 1 |

## 4. Interview

Lotes: E00001, E00002, E00003 · política del juez juez-entrevista-v2 (referencia: sonnet).

| competencia oficial | escenarios (todos los lotes) | VALID | REVIEW | situacionales VALID | como secundaria | objetivo | faltan | prioridad |
|---|---|---|---|---|---|---|---|---|
| Responsabilitat i orientació a la qualitat | 12 | 5 | 5 | 1 | 6 | 6 | 1 | P1 |
| Cooperació i treball en equip | 7 | 6 | 1 | 2 | 4 | 6 | 0 | P3 |
| Autonomia i iniciativa | 10 | 6 | 2 | 2 | 1 | 6 | 0 | P3 |
| Resolució de problemes | 12 | 6 | 3 | 2 | 3 | 6 | 0 | P3 |
| Orientació de servei a les persones | 10 | 6 | 2 | 2 | 2 | 6 | 0 | P3 |
| Adaptabilitat i flexibilitat | 10 | 5 | 3 | 2 | 5 | 6 | 1 | P1 |
| Autocontrol i resistència a la pressió | 10 | 6 | 2 | 2 | 4 | 6 | 0 | P3 |
| Autogestió i desenvolupament personal | 12 | 6 | 3 | 2 | 3 | 6 | 0 | P3 |
| Motivació i identificació amb l'organització | 9 | 5 | 4 | 2 | 0 | 6 | 1 | P1 |
| Habilitats socials i comunicatives | 12 | 5 | 4 | 2 | 3 | 6 | 1 | P1 |

En REVIEW_REQUIRED (no se sirven): ent-responsabilitat-2, ent-responsabilitat-3, ent-responsabilitat-5, ent-responsabilitat-6, ent-responsabilitat-10, ent-cooperacio-3, ent-autonomia-1, ent-autonomia-2, ent-resolucio-problemes-2, ent-resolucio-problemes-3, ent-resolucio-problemes-5, ent-orientacio-servei-1, ent-orientacio-servei-3, ent-adaptabilitat-2, ent-adaptabilitat-4, ent-adaptabilitat-9, ent-autocontrol-1, ent-autocontrol-4, ent-autogestio-1, ent-autogestio-2, ent-autogestio-4, ent-motivacio-1, ent-motivacio-2, ent-motivacio-4, ent-motivacio-9, ent-habilitats-socials-1, ent-habilitats-socials-2, ent-habilitats-socials-4, ent-habilitats-socials-12. Sustituidos por una versión corregida VALID: —.

## 5. Language

**Oficial (OFFICIAL_VERIFIED, bases 46/26):**

- Català: Nivell de suficiència de català (C1), equivalent o superior. Exención: Acreditar C1 o equivalent (o haver-lo superat en altres processos de la mateixa oferta) en el termini de deu dies hàbils indicat a la base 6.1.4.1. Prueba: parte 1: Redacció d'un text de 180 paraules com a mínim i cinc blocs de preguntes sintàctiques i de comprensió (90 min); parte 2: Lectura en veu alta i conversa (10 min); resultado apte/no apte, mínimo 70 %.
- Idiomas voluntarios: 6 preguntas por idioma tras una grabación, máximo 2 idiomas, 1.5 puntos por idioma (máx. 3).

**TestLey:** 0 ejercicios. TestLey no tiene contenido de catalán ni de idiomas: todo lo listado es OFFICIAL_VERIFIED de las bases.

## 6. Physical (solo documentación; el engine es la Fase 4, no iniciada)

Datos OFFICIAL_VERIFIED (46/26, https://dogc.gencat.cat/ca/document-del-dogc/?documentId=1046460):

| prueba | unidad | mejor | intentos | barem | condiciones |
|---|---|---|---|---|---|
| Circuit d'agilitat | segons | menor | 2 | CA | — |
| Pressió sobre banc | repeticions | mayor | 1 | PB | carga_kg: {'homes': 40, 'dones': 25}, tiempo_max_s: 45 |
| Cursa de llançadora | períodes (paliers) | mayor | 1 | CL | — |

Barems disponibles (filas por sexo y prueba): {'homes': {'CA': 11, 'PB': 11, 'CL': 11}, 'dones': {'CA': 11, 'PB': 11, 'CL': 11}}. Otros datos: {"categorias": ["homes", "dones"], "ponderacion": {"circuit-agilitat": 33.33, "pressio-banc": 33.33, "cursa-llancadora": 33.33}, "minimo_por_ejercicio": 1, "minimo_total": 5, "escala": [0, 10], "interpretacion_barem": "Las bases publican puntos de corte (P = 0…10). TestLey asigna a una marca la puntuación del último corte alcanzado (tiempo ≤ corte en el circuito; repeticiones o períodos ≥ corte), con los extremos «<» y «>» literales del barem. Es una lectura de la tabla, no una nota oficial: la nota la pone el tribunal."}.

Lo que necesitará la Fase 4: registro de marcas por prueba e intento; puntuación según el barem de la convocatoria (`call_id`, sexo y edad si el barem la usa); mejor marca y evolución; objetivo y proximidad al mínimo; recomendaciones de entrenamiento etiquetadas como TestLey (no oficiales); persistencia local migrable; tests contra los barems verificados. No hace falta contenido generado.

## 7. Simulations

- Conocimientos: 3 de 9 exámenes oficiales con todas sus preguntas VALID (simulacro oficial real). Simulacros TestLey disjuntos respetando el reparto oficial: **13** (limitan: C.2, C.3, B.2, C.1, A.4); mezclando TestLey y oficiales: 18; sin respetar el reparto: 42. Objetivo: 10.
- Aptitud: práctica cronometrada al ritmo oficial con ejercicios generados (ilimitada); NO es una réplica de la subprueba: las bases no publican el reparto por aptitudes y la verbal es parcial.
- Entrevista: 5 simulaciones completas sin repetir escenario (limitan: responsabilitat, adaptabilitat, motivacio, habilitats-socials); objetivo 6.
- Primera prueba completa: no disponible: combinaría conocimientos (simulable), aptitudinal (solo práctica) e idiomas (sin contenido).

## Content targets

Cómo se calcula cada objetivo:
- **Conocimientos**: objetivo = min(capacidad del texto oficial, max(2 × apartados con fuente, ⌈30 × peso del tema × 10 simulacros disjuntos⌉)). Capacidad = lo que admite el texto oficial de cada apartado (fabrica.cobertura); peso = frecuencia histórica en exámenes oficiales; las OFFICIAL_EXAM no cuentan para el objetivo TestLey (son un banco aparte). P0 = menos de 10 preguntas servibles en el tema; P1 = menos de la mitad del objetivo o sin fuente; P2 = por debajo; P3 = cubierto.
- **Aptitud**: no hay número oficial por aptitud; el objetivo es de formatos (variedad) con generadores verificados por cálculo.
- **Competencias**: 6 situaciones por competencia; **Entrevista**: 6 escenarios por competencia (una simulación usa uno por competencia), ≥ 2 situacionales.

| AREA | SUBAREA | ACTUAL | VALID | REVIEW | OFICIAL | OBJETIVO | FALTAN | PRIORIDAD |
|---|---|---|---|---|---|---|---|---|
| KNOWLEDGE | A.1 Història de Catalunya (part I) | 84 | 64 | 19 | 19 | 23 | 0 | P3 |
| KNOWLEDGE | A.2 Història de Catalunya (part II) | 83 | 78 | 5 | 14 | 18 | 0 | P3 |
| KNOWLEDGE | A.3 Història de la policia a Catalunya | 55 | 50 | 5 | 7 | 12 | 0 | P3 |
| KNOWLEDGE | A.4 Àmbit sociolingüístic | 51 | 43 | 8 | 16 | 19 | 0 | P3 |
| KNOWLEDGE | A.5 Marc geogràfic de Catalunya | 60 | 52 | 8 | 12 | 15 | 0 | P3 |
| KNOWLEDGE | A.6 Entorn social a Catalunya | 61 | 54 | 7 | 9 | 12 | 0 | P3 |
| KNOWLEDGE | A.7 Les tecnologies de la informació en el | 65 | 59 | 6 | 8 | 14 | 0 | P3 |
| KNOWLEDGE | B.1 L'Estatut d'autonomia de Catalunya (EA | 69 | 59 | 10 | 4 | 12 | 0 | P3 |
| KNOWLEDGE | B.2 Les institucions polítiques de Catalun | 60 | 49 | 10 | 20 | 24 | 0 | P3 |
| KNOWLEDGE | B.3 L'ordenament jurídic de l'Estat | 88 | 82 | 6 | 11 | 64 | 0 | P3 |
| KNOWLEDGE | B.4 Els drets humans i els drets constituc | 77 | 73 | 4 | 11 | 18 | 0 | P3 |
| KNOWLEDGE | B.5 Les institucions polítiques de l'Estat | 45 | 35 | 10 | 5 | 10 | 0 | P3 |
| KNOWLEDGE | B.6 Els òrgans jurisdiccionals. Poder judi | 47 | 39 | 8 | 11 | 13 | 0 | P3 |
| KNOWLEDGE | B.7 L'organització territorial de l'Estat | 56 | 50 | 6 | 8 | 16 | 0 | P3 |
| KNOWLEDGE | B.8 La Unió Europea | 39 | 36 | 3 | 11 | 15 | 0 | P3 |
| KNOWLEDGE | C.1 Les competències de la Generalitat en  | 19 | 18 | 0 | 6 | 9 | 0 | P3 |
| KNOWLEDGE | C.2 El Departament d'Interior | 59 | 54 | 5 | 23 | 41 | 0 | P3 |
| KNOWLEDGE | C.3 La coordinació policial | 62 | 51 | 11 | 22 | 30 | 0 | P3 |
| KNOWLEDGE | C.4 El marc legal de la seguretat | 50 | 44 | 6 | 14 | 18 | 0 | P3 |
| KNOWLEDGE | C.5 El Codi deontològic policial | 27 | 23 | 3 | 4 | 8 | 0 | P3 |
| KNOWLEDGE | D Coneixement de l'entorn polític, econò | 0 | 0 | 0 | 0 | 0 | 0 | P1 |
| APTITUDE | abstract | 1 | 1 | 0 | 0 | formatos | un solo formato de ejercicio | P2 |
| APTITUDE | spatial | 1 | 1 | 0 | 0 | formatos | un solo formato de ejercicio | P2 |
| APTITUDE | verbal | 4 | 4 | 0 | 0 | formatos semánticos | solo formatos formales (series de letras, orden alfabético): sin vocabulario, sinónimos, antónimos, analogías ni comprensión; las bases solo dicen «aptitud verbal», no publican formatos | P1 |
| APTITUDE | numerical | 3 | 3 | 0 | 0 | formatos | — | P3 |
| APTITUDE | perceptive | 2 | 2 | 0 | 0 | formatos | — | P3 |
| COMPETENCIES | responsabilitat | 4 | 4 | 2 | nombre | 6 | 2 | P1 |
| COMPETENCIES | cooperacio | 6 | 6 | 0 | nombre | 6 | 0 | P1 |
| COMPETENCIES | autonomia | 4 | 4 | 2 | nombre | 6 | 2 | P1 |
| COMPETENCIES | resolucio-problemes | 4 | 4 | 2 | nombre | 6 | 2 | P1 |
| COMPETENCIES | orientacio-servei | 4 | 4 | 2 | nombre | 6 | 2 | P1 |
| COMPETENCIES | adaptabilitat | 4 | 4 | 2 | nombre | 6 | 2 | P1 |
| COMPETENCIES | autocontrol | 5 | 5 | 1 | nombre | 6 | 1 | P1 |
| COMPETENCIES | autogestio | 5 | 5 | 1 | nombre | 6 | 1 | P1 |
| COMPETENCIES | motivacio | 4 | 4 | 2 | nombre | 6 | 2 | P1 |
| COMPETENCIES | habilitats-socials | 5 | 5 | 1 | nombre | 6 | 1 | P1 |
| INTERVIEW | responsabilitat | 12 | 5 | 5 | nombre | 6 | 1 | P1 |
| INTERVIEW | cooperacio | 7 | 6 | 1 | nombre | 6 | 0 | P3 |
| INTERVIEW | autonomia | 10 | 6 | 2 | nombre | 6 | 0 | P3 |
| INTERVIEW | resolucio-problemes | 12 | 6 | 3 | nombre | 6 | 0 | P3 |
| INTERVIEW | orientacio-servei | 10 | 6 | 2 | nombre | 6 | 0 | P3 |
| INTERVIEW | adaptabilitat | 10 | 5 | 3 | nombre | 6 | 1 | P1 |
| INTERVIEW | autocontrol | 10 | 6 | 2 | nombre | 6 | 0 | P3 |
| INTERVIEW | autogestio | 12 | 6 | 3 | nombre | 6 | 0 | P3 |
| INTERVIEW | motivacio | 9 | 5 | 4 | nombre | 6 | 1 | P1 |
| INTERVIEW | habilitats-socials | 12 | 5 | 4 | nombre | 6 | 1 | P1 |
| LANGUAGE | català (C1) | 0 | 0 | 0 | requisito y estructura de la prueba | — | todo el contenido de práctica | P2 |
| LANGUAGE | idiomes voluntaris | 0 | 0 | 0 | 6 preguntas por idioma, máx. 2, 1,5 p | — | comprensión oral (audio) | P3 |
| PHYSICAL | registro y barems | 0 | 0 | 0 | pruebas y barems verificados | motor (Fase 4) | Physical Engine | P1 |

### Huecos P0

- ninguno

