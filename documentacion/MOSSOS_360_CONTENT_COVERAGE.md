# Mossos 360 · Content Coverage (auditoría real)

Generado por `python3 -m fabrica.cobertura360 informe mossos-esquadra` desde los datos del repositorio (nada a mano). Convocatoria 46/26 · fábrica de preguntas: **GENERATION_PAUSED**.

Estados: **OFFICIAL_EXAM** = pregunta de un examen oficial · **OFFICIAL_VERIFIED** = dato de las bases verificado contra el texto · **TESTLEY_GENERATED/TESTLEY_TRAINING** = contenido propio · **REVIEW_REQUIRED** = no se sirve · **DEPRECATED/OUTDATED** = retirado. Los objetivos usan parámetros de entrenamiento de TestLey (abajo), nunca requisitos oficiales.

## Resumen

| área | contenido servido | en revisión | retirado | oficial |
|---|---|---|---|---|
| Conocimientos | 109 TestLey | 14 | 4 | 266 OFFICIAL_EXAM VALID (9 exámenes) |
| Aptitud | generadores: 11 formatos × 3 dificultades | 0 | 0 | estructura (80 preguntas, 35 min); sin ejercicios oficiales |
| Competencias | 45 situaciones + 9 fichas | 15 | 0 | 10 nombres de competencias |
| Entrevista | 56 escenarios | 29 | 0 | objeto de la entrevista y 10 competencias |
| Idiomas | 0 | 0 | 0 | requisito C1, estructura de la prueba e idiomas voluntarios |
| Física | — (Fase 4) | 0 | 0 | 3 pruebas con barems verificados |

## 1. Knowledge

Formato oficial del simulacro: 30 preguntas, 35 min, penalización 0.25. Peso de cada tema = su proporción en los exámenes oficiales transcritos. Preguntas oficiales sin apartado asignado: 33 ({'VALID': 31, 'REVIEW_REQUIRED': 2}).

| tema | apartados (con fuente) | TestLey VALID | REVIEW | DEPRECATED | oficial VALID / REVIEW / OUTDATED | peso exámenes | capacidad | objetivo | faltan | prioridad |
|---|---|---|---|---|---|---|---|---|---|---|
| A.1 Història de Catalunya (part I) | 10 (10) | 2 | 0 | 1 | 19 / 0 / 0 | 7.4% | 90 | 23 | 21 | P1 |
| A.2 Història de Catalunya (part II) | 9 (9) | 2 | 1 | 0 | 14 / 0 / 0 | 5.5% | 89 | 18 | 16 | P1 |
| A.3 Història de la policia a Catalunya | 6 (6) | 3 | 0 | 0 | 7 / 0 / 0 | 2.7% | 55 | 12 | 9 | P1 |
| A.4 Àmbit sociolingüístic | 5 (5) | 3 | 0 | 0 | 16 / 0 / 0 | 6.2% | 50 | 19 | 16 | P1 |
| A.5 Marc geogràfic de Catalunya | 7 (7) | 3 | 0 | 0 | 12 / 0 / 0 | 4.7% | 60 | 15 | 12 | P1 |
| A.6 Entorn social a Catalunya | 6 (6) | 2 | 1 | 0 | 9 / 1 / 0 | 3.9% | 60 | 12 | 10 | P1 |
| A.7 Les tecnologies de la informació e | 7 (7) | 2 | 1 | 0 | 8 / 0 / 0 | 3.1% | 66 | 14 | 12 | P1 |
| B.1 L'Estatut d'autonomia de Catalunya | 6 (6) | 5 | 1 | 0 | 4 / 2 / 0 | 2.3% | 53 | 12 | 7 | P0 |
| B.2 Les institucions polítiques de Cat | 6 (6) | 2 | 0 | 1 | 20 / 0 / 0 | 7.8% | 58 | 24 | 22 | P1 |
| B.3 L'ordenament jurídic de l'Estat | 32 (32) | 35 | 0 | 0 | 11 / 0 / 0 | 4.3% | 101 | 64 | 29 | P2 |
| B.4 Els drets humans i els drets const | 9 (9) | 3 | 0 | 0 | 11 / 1 / 0 | 4.7% | 85 | 18 | 15 | P1 |
| B.5 Les institucions polítiques de l'E | 5 (5) | 4 | 3 | 0 | 5 / 0 / 0 | 1.9% | 45 | 10 | 6 | P0 |
| B.6 Els òrgans jurisdiccionals. Poder  | 5 (5) | 3 | 0 | 0 | 11 / 0 / 0 | 4.3% | 46 | 13 | 10 | P1 |
| B.7 L'organització territorial de l'Es | 8 (8) | 2 | 1 | 0 | 8 / 0 / 0 | 3.1% | 56 | 16 | 14 | P1 |
| B.8 La Unió Europea | 4 (4) | 3 | 0 | 0 | 11 / 1 / 0 | 4.7% | 39 | 15 | 12 | P1 |
| C.1 Les competències de la Generalitat | 3 (3) | 4 | 0 | 1 | 6 / 1 / 0 | 2.7% | 18 | 9 | 5 | P1 |
| C.2 El Departament d'Interior | 8 (8) | 4 | 1 | 0 | 23 / 9 / 3 | 13.6% | 58 | 41 | 37 | P1 |
| C.3 La coordinació policial | 6 (6) | 12 | 3 | 0 | 22 / 3 / 0 | 9.7% | 60 | 30 | 18 | P1 |
| C.4 El marc legal de la seguretat | 5 (5) | 6 | 0 | 0 | 14 / 1 / 0 | 5.8% | 50 | 18 | 12 | P1 |
| C.5 El Codi deontològic policial | 4 (4) | 9 | 2 | 1 | 4 / 0 / 0 | 1.6% | 26 | 8 | 0 | P3 |
| D Coneixement de l'entorn polític, e | 0 (0) | 0 | 0 | 0 | 0 / 0 / 0 | 0.0% | 0 | 0 | 0 | P1 |

### Apartados sin cobertura, bloqueados y concentración

| tema | apartados sin preguntas | apartados bloqueados (sin texto oficial) | sobreexplotados | concentración excesiva | tipos mínimos ausentes |
|---|---|---|---|---|---|
| A.1 | A.1.2, A.1.3, A.1.4, A.1.5, A.1.6, A.1.7, A.1.8, A.1.9, A.1.IF | — | — | — | aplicacion, negativa, dificil, caso_practico |
| A.2 | A.2.2, A.2.3, A.2.4, A.2.5, A.2.6, A.2.7, A.2.8, A.2.IF | — | — | — | aplicacion, negativa, dificil, caso_practico |
| A.3 | A.3.2, A.3.3, A.3.4, A.3.5, A.3.IF | — | — | — | negativa, dificil, caso_practico |
| A.4 | A.4.2, A.4.3, A.4.4, A.4.IF | — | — | — | literal, aplicacion, negativa, dificil, caso_practico |
| A.5 | A.5.2, A.5.3, A.5.4, A.5.5, A.5.6, A.5.IF | — | — | — | literal, conceptual, caso_practico |
| A.6 | A.6.2, A.6.3, A.6.4, A.6.5, A.6.IF | — | — | — | literal, aplicacion, negativa, dificil, caso_practico |
| A.7 | A.7.2, A.7.3, A.7.4, A.7.5, A.7.6, A.7.IF | — | — | — | conceptual, aplicacion, negativa, dificil, caso_practico |
| B.1 | B.1.3, B.1.4, B.1.5, B.1.IF | — | — | — | aplicacion, negativa, dificil, caso_practico |
| B.2 | B.2.2, B.2.3, B.2.4, B.2.5, B.2.IF | — | — | — | literal, conceptual, aplicacion, dificil, caso_practico |
| B.3 | B.3.1, B.3.2, B.3.3, B.3.4, B.3.5, B.3.6, B.3.IF, 83, 84, 88, 89, 92 | — | 1, 2, 3, 7, 8, 9, 95, 96 | sí: 32% del banco TestLey frente a 4% del examen | literal, conceptual, aplicacion, negativa, dificil, caso_practico |
| B.4 | B.4.2, B.4.3, B.4.4, B.4.5, B.4.6, B.4.7, B.4.8, B.4.IF | — | — | — | negativa, dificil, caso_practico |
| B.5 | B.5.2, B.5.3, B.5.4, B.5.IF | — | — | — | conceptual, negativa, dificil, caso_practico |
| B.6 | B.6.2, B.6.3, B.6.4, B.6.IF | — | — | — | literal, conceptual, negativa, dificil, caso_practico |
| B.7 | B.7.2, B.7.3, B.7.4, B.7.5, B.7.6, B.7.7, B.7.IF | — | — | — | literal, aplicacion, negativa, caso_practico |
| B.8 | B.8.2, B.8.3, B.8.IF | — | — | — | literal, conceptual, aplicacion, negativa, dificil, caso_practico |
| C.1 | C.1.IF | — | — | — | conceptual, negativa, dificil, caso_practico |
| C.2 | C.2.2, C.2.3, C.2.4, C.2.7, C.2.IF | — | — | — | conceptual, aplicacion, dificil, caso_practico |
| C.3 | C.3.1, C.3.2, C.3.3, C.3.IF | — | — | — | dificil, caso_practico |
| C.4 | C.4.1, C.4.2, C.4.3, C.4.IF | — | 5 | — | literal, conceptual, aplicacion, negativa, dificil, caso_practico |
| C.5 | C.5.IF | — | — | — | aplicacion, dificil, caso_practico |
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

- Conocimientos: 3 de 9 exámenes oficiales con todas sus preguntas VALID (simulacro oficial real). Simulacros TestLey disjuntos respetando el reparto oficial: **0** (limitan: B.2, A.1, C.2, A.2, A.4); mezclando TestLey y oficiales: 6; sin respetar el reparto: 12. Objetivo: 10.
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
| KNOWLEDGE | A.1 Història de Catalunya (part I) | 3 | 2 | 0 | 19 | 23 | 21 | P1 |
| KNOWLEDGE | A.2 Història de Catalunya (part II) | 3 | 2 | 1 | 14 | 18 | 16 | P1 |
| KNOWLEDGE | A.3 Història de la policia a Catalunya | 3 | 3 | 0 | 7 | 12 | 9 | P1 |
| KNOWLEDGE | A.4 Àmbit sociolingüístic | 3 | 3 | 0 | 16 | 19 | 16 | P1 |
| KNOWLEDGE | A.5 Marc geogràfic de Catalunya | 3 | 3 | 0 | 12 | 15 | 12 | P1 |
| KNOWLEDGE | A.6 Entorn social a Catalunya | 3 | 2 | 1 | 9 | 12 | 10 | P1 |
| KNOWLEDGE | A.7 Les tecnologies de la informació en el | 3 | 2 | 1 | 8 | 14 | 12 | P1 |
| KNOWLEDGE | B.1 L'Estatut d'autonomia de Catalunya (EA | 6 | 5 | 1 | 4 | 12 | 7 | P0 |
| KNOWLEDGE | B.2 Les institucions polítiques de Catalun | 3 | 2 | 0 | 20 | 24 | 22 | P1 |
| KNOWLEDGE | B.3 L'ordenament jurídic de l'Estat | 35 | 35 | 0 | 11 | 64 | 29 | P2 |
| KNOWLEDGE | B.4 Els drets humans i els drets constituc | 3 | 3 | 0 | 11 | 18 | 15 | P1 |
| KNOWLEDGE | B.5 Les institucions polítiques de l'Estat | 7 | 4 | 3 | 5 | 10 | 6 | P0 |
| KNOWLEDGE | B.6 Els òrgans jurisdiccionals. Poder judi | 3 | 3 | 0 | 11 | 13 | 10 | P1 |
| KNOWLEDGE | B.7 L'organització territorial de l'Estat | 3 | 2 | 1 | 8 | 16 | 14 | P1 |
| KNOWLEDGE | B.8 La Unió Europea | 3 | 3 | 0 | 11 | 15 | 12 | P1 |
| KNOWLEDGE | C.1 Les competències de la Generalitat en  | 5 | 4 | 0 | 6 | 9 | 5 | P1 |
| KNOWLEDGE | C.2 El Departament d'Interior | 5 | 4 | 1 | 23 | 41 | 37 | P1 |
| KNOWLEDGE | C.3 La coordinació policial | 15 | 12 | 3 | 22 | 30 | 18 | P1 |
| KNOWLEDGE | C.4 El marc legal de la seguretat | 6 | 6 | 0 | 14 | 18 | 12 | P1 |
| KNOWLEDGE | C.5 El Codi deontològic policial | 12 | 9 | 2 | 4 | 8 | 0 | P3 |
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

- KNOWLEDGE B.1 L'Estatut d'autonomia de Catalunya (EA: menos de 10 preguntas servibles (TestLey + oficiales): no hay ni un test del tema
- KNOWLEDGE B.5 Les institucions polítiques de l'Estat: menos de 10 preguntas servibles (TestLey + oficiales): no hay ni un test del tema


