# Cobertura de las oposiciones actuales

Generado el 2026-09-29 con `python3 scripts/informe_cobertura.py` a partir de la build (`docs/datos/cobertura.json`), el catálogo y el control de calidad.
Está en `documentacion/` y no en `docs/` porque `docs/` es la web publicada y la build la regenera entera.

**Cómo leerlo.** «Cobertura» mide el contenido que TestLey tiene de cada oposición (temario, texto oficial, preguntas, tests, simulacro);
**no es una probabilidad de aprobar**. Un tema cuenta como «con test» cuando tiene ≥ 10 preguntas verificadas; el objetivo por tema es 30.
Nada se marca como completo si no lo está: los temas sin fuente oficial consolidada quedan «pendientes de verificación oficial».

| Oposición | Temario | Contenido | Preguntas | Tests | Simulacros | Fuentes | Estado |
|---|---|---|---|---|---|---|---|
| Guardia Civil, Escala de Cabos y Guardias | Pendiente | 0 % de temas con texto oficial | 618 (0 % del objetivo de 30/tema) | 0/0 temas con test ≥ 10 | Adaptado · 1/6 partes | 1 (BOE) | PARCIAL · sin temario oficial · 0 % |
| Policía Nacional, Escala Básica (categoría de Policía) | Oficial, 45 temas | 60 % de temas con texto oficial | 1288 (48 % del objetivo de 30/tema) | 27/45 temas con test ≥ 10 | Oficial · 1/5 partes | 2 (BOE) | UTILIZABLE · con pendientes · 80 % |
| Cuerpo General Administrativo de la Administración del Estado | Oficial, 45 temas | 78 % de temas con texto oficial | 1294 (69 % del objetivo de 30/tema) | 35/45 temas con test ≥ 10 | Adaptado · 1/3 partes | 1 (BOE) | UTILIZABLE · con pendientes · 83 % |
| Cuerpo General Auxiliar de la Administración del Estado | Oficial, 28 temas | 61 % de temas con texto oficial | 1175 (59 % del objetivo de 30/tema) | 17/28 temas con test ≥ 10 | Adaptado · 1/3 partes | 1 (BOE) | UTILIZABLE · con pendientes · 75 % |
| Cuerpo de Gestión de la Administración Civil del Estado | Oficial, 58 temas | 91 % de temas con texto oficial | 1573 (81 % del objetivo de 30/tema) | 53/58 temas con test ≥ 10 | Oficial · 1/2 partes | 1 (BOE) | UTILIZABLE · con pendientes · 93 % |
| Policía Nacional, Escala Ejecutiva (categoría de Inspector) | Oficial, 81 temas | 68 % de temas con texto oficial | 1501 (41 % del objetivo de 30/tema) | 54/81 temas con test ≥ 10 | Oficial · 1/5 partes | 2 (BOE) | UTILIZABLE · con pendientes · 82 % |

## Guardia Civil, Escala de Cabos y Guardias

Estado: **PARCIAL · sin temario oficial** · cobertura de contenido 0 % (no es probabilidad de aprobar).

### COMPLETADO
- Ficha con datos oficiales citados de la convocatoria (BOE-A-2026-9982): requisitos, plazas y estructura del proceso.
- 618 preguntas de preparación (leyes comunes), con cita literal y versión del texto legal.
- Simulacro: 100 preguntas, 60 min, 4 opciones, penalización 0.33 (adaptado).
- Estructura oficial del examen con cita de las bases: Conocimientos · ortografía (5 frases) (no se simula); Conocimientos · gramática (20 frases) (no se simula); Conocimientos generales · 100 preguntas del temario (se simula); Lengua inglesa · 20 preguntas (no se simula); Prueba psicotécnica (no se simula); Aptitud psicofísica · pruebas físicas, entrevista y reconocimiento médico (no se simula).
- Mis errores, repetición espaciada, plan de estudio con días disponibles y panel de calidad (`/admin/oposiciones/guardia-civil-cabos-guardias/quality/`).

### PENDIENTE
- Conocimientos · ortografía (5 frases): no se simula. Ejercicio de ortografía: pendiente.
- Conocimientos · gramática (20 frases): no se simula. Ejercicio de gramática: pendiente.
- Lengua inglesa · 20 preguntas: no se simula. Preguntas de inglés: pendiente.
- Prueba psicotécnica: no se simula. Psicotécnicos: pendiente.
- Aptitud psicofísica · pruebas físicas, entrevista y reconocimiento médico: no se simula. Pruebas físicas, entrevista y reconocimiento médico.
- temario: El temario oficial está en la Resolución de 26 de junio de 2019 (modificada el 3 de octubre de 2022) de la Dirección General de la Guardia Civil, que no se publica en el BOE. Pendiente de verificar en la web oficial de la Guardia Civil.
- fechas_examen: El lugar, fecha y hora de las pruebas los anuncia el Tribunal de Selección en la web oficial de la Guardia Civil.

### PROBLEMAS
- El temario oficial (Resolución de 26/06/2019, mod. 03/10/2022) no se publica en el BOE y la web de la Guardia Civil no es accesible desde el entorno de TestLey: no hay temas ni tests por tema, y no se inventan.
- El simulacro existe, pero es de preparación (leyes comunes), no la prueba oficial de conocimientos.

### FUENTES
- Resolución 160/38243/2026, de 5 de mayo, de la Dirección General de la Guardia Civil (BOE-A-2026-9982) — https://www.boe.es/diario_boe/txt.php?id=BOE-A-2026-9982 (publicado 2026-05-08)
- Legislación: 10 normas del BOE consolidado (codigo-penal, constitucion, lecrim, ley-4-2015, lo-2-1986, lo-3-2007, lo-3-2018, lo-4-2000, lo-4-2015, lo-6-1984), vigiladas a diario por artículo (`datos/vigilar_leyes.py`).

### PRÓXIMOS PASOS
- Descargar el temario oficial desde web.guardiacivil.es (a mano o con el crawler si el sitio permite el acceso) y cargarlo como `temario.tipo = oficial_publicado` con su fuente.
- Con el temario cargado se generan solas las páginas de tema, los tests por tema, el ámbito de cada tema y la cobertura.

## Policía Nacional, Escala Básica (categoría de Policía)

Estado: **UTILIZABLE · con pendientes** · cobertura de contenido 80 % (no es probabilidad de aprobar).

### COMPLETADO
- Temario oficial: 45 temas copiados literalmente de la convocatoria (BOE-A-2026-15055), cada uno con su página: estudio (índice oficial de artículos del BOE, texto vigente) y test del tema.
- Tests por tema: 27 temas con ≥ 10 preguntas; test a medida por tema, bloque, ley, dificultad y tipo (nuevas, falladas, difíciles, favoritas); modo examen.
- 1288 preguntas publicadas, todas con cita literal del artículo vigente, dificultad, explicación y versión del texto legal contra la que se verificaron. Control de calidad: 0 errores.
- Simulacro: 100 preguntas, 50 min, 3 opciones, penalización 0.5 (regla oficial).
- Estructura oficial del examen con cita de las bases: Primera prueba · conocimientos (se simula); Segunda prueba · aptitud física (no se simula); Tercera prueba · reconocimiento médico (no se simula); Tercera prueba · entrevista profesional y personal (no se simula); Tercera prueba · test psicotécnicos (no se simula).
- Mis errores, repetición espaciada, plan de estudio con días disponibles, estadísticas por tema y panel de calidad (`/admin/oposiciones/policia-nacional-escala-basica/quality/`).

### PENDIENTE
- 18 temas sin preguntas: T4, T27, T28 (no legislativo), T29 (no legislativo), T30 (no legislativo), T31 (no legislativo), T32 (no legislativo), T33 (no legislativo), T34 (no legislativo), T35 (no legislativo), T36 (no legislativo), T37 (no legislativo), T38 (no legislativo), T39 (no legislativo), T40 (no legislativo), T41 (no legislativo), T44 (no legislativo), T45 (no legislativo).
- Segunda prueba · aptitud física: no se simula. Prueba física.
- Tercera prueba · reconocimiento médico: no se simula. Prueba médica.
- Tercera prueba · entrevista profesional y personal: no se simula. Entrevista personal.
- Tercera prueba · test psicotécnicos: no se simula. TestLey todavía no tiene psicotécnicos verificados.
- temas_sin_fuente_consolidada: Temas 4, 27 (Unión Europea, derechos humanos o atención al ciudadano): sus textos oficiales no están consolidados en el BOE (Tratados en el DOUE/EUR-Lex, convenios internacionales, RD 208/1996). Aún no tienen test; se añadirán cuando el motor incorpore esas fuentes oficiales.

### PROBLEMAS
- 2 temas con una ley repartida entre varios temas cuyo ámbito no se ha podido precisar (T7, T8): se usa la ley completa y la página lo indica.
- 108 preguntas de sus leyes quedan fuera del ámbito de todos los temas: solo aparecen en tests mixtos y simulacros.
- Los temas no legislativos (sociología, ética, técnicas de comunicación, etc.) no tienen contenido: TestLey solo publica preguntas con cita literal de una norma del BOE.

### FUENTES
- Resolución de 7 de julio de 2026, de la Dirección General de la Policía (BOE-A-2026-15055) — https://www.boe.es/diario_boe/txt.php?id=BOE-A-2026-15055 (publicado 2026-07-10)
- Ley Orgánica 9/2015, de Régimen de Personal de la Policía Nacional (art. 17) — https://www.boe.es/buscar/act.php?id=BOE-A-2015-8468#a17 (publicado 2015-07-29)
- Legislación: 30 normas del BOE consolidado (codigo-civil, codigo-penal, constitucion, lecrim, ley-12-2009, ley-31-1995, ley-39-2006, ley-4-2015, ley-4-2023, ley-40-2015, ley-5-2014, ley-50-1997, ley-8-2011, ley-trafico, lo-1-2004, lo-2-1986, lo-3-1981, lo-3-2007, lo-3-2018, lo-4-2000, lo-4-2010, lo-4-2015, lo-6-1984, lo-7-2021, lo-9-2015, rd-207-2024, rd-240-2007, reglamento-armas, rgc, trebep), vigiladas a diario por artículo (`datos/vigilar_leyes.py`).

### PRÓXIMOS PASOS
- Incorporar fuentes oficiales no consolidadas en el BOE (DOUE/EUR-Lex, convenios de derechos humanos) para los temas 4 y 27.
- Pruebas físicas, reconocimiento médico, entrevista y psicotécnicos: solo información oficial, sin simulador.

## Cuerpo General Administrativo de la Administración del Estado

Estado: **UTILIZABLE · con pendientes** · cobertura de contenido 83 % (no es probabilidad de aprobar).

### COMPLETADO
- Temario oficial: 45 temas copiados literalmente de la convocatoria (BOE-A-2025-26262), cada uno con su página: estudio (índice oficial de artículos del BOE, texto vigente) y test del tema.
- Tests por tema: 35 temas con ≥ 10 preguntas; test a medida por tema, bloque, ley, dificultad y tipo (nuevas, falladas, difíciles, favoritas); modo examen.
- 1294 preguntas publicadas, todas con cita literal del artículo vigente, dificultad, explicación y versión del texto legal contra la que se verificaron. Control de calidad: 0 errores.
- Simulacro: 40 preguntas, 44 min, 4 opciones, penalización 0.33 (adaptado).
- Estructura oficial del examen con cita de las bases: Primera parte · bloques I a V (se simula); Primera parte · bloque VI (ofimática) (no se simula); Segunda parte · supuesto práctico (bloques II a V) (no se simula).
- Mis errores, repetición espaciada, plan de estudio con días disponibles, estadísticas por tema y panel de calidad (`/admin/oposiciones/age-administrativo-c1/quality/`).

### PENDIENTE
- 10 temas sin preguntas: T11, II · T1, VI · T1 (no legislativo), VI · T2 (no legislativo), VI · T3 (no legislativo), VI · T4 (no legislativo), VI · T5 (no legislativo), VI · T6 (no legislativo), VI · T7 (no legislativo), VI · T8 (no legislativo).
- Primera parte · bloque VI (ofimática): no se simula. Contenido de ofimática pendiente: no hay fuente oficial consolidada.
- Segunda parte · supuesto práctico (bloques II a V): no se simula. TestLey todavía no tiene supuestos prácticos verificados.
- temas_sin_fuente_consolidada: Temas 11, 1 (Unión Europea, derechos humanos o atención al ciudadano): sus textos oficiales no están consolidados en el BOE (Tratados en el DOUE/EUR-Lex, convenios internacionales, RD 208/1996). Aún no tienen test; se añadirán cuando el motor incorpore esas fuentes oficiales.

### PROBLEMAS
- 4 temas con una ley repartida entre varios temas cuyo ámbito no se ha podido precisar (I · T6, IV · T6, IV · T7, V · T5): se usa la ley completa y la página lo indica.
- 111 preguntas de sus leyes quedan fuera del ámbito de todos los temas: solo aparecen en tests mixtos y simulacros.
- El bloque VI (ofimática) y el supuesto práctico no se simulan.
- Los temas de la UE y de atención al público no tienen fuente consolidada en el BOE.

### FUENTES
- Resolución de 18 de diciembre de 2025, de la Secretaría de Estado de Función Pública (BOE-A-2025-26262) — https://www.boe.es/diario_boe/txt.php?id=BOE-A-2025-26262 (publicado 2025-12-22)
- Legislación: 22 normas del BOE consolidado (constitucion, ley-19-2013, ley-29-1998, ley-38-2003, ley-39-2006, ley-39-2015, ley-4-2023, ley-40-2015, ley-47-2003, ley-50-1997, ley-53-1984, ley-7-1985, ley-9-2017, lo-1-2004, lo-2-1979, lo-3-1981, lo-3-2007, lo-3-2018, lo-6-1985, rdl-1-2013, rdl-8-2015, trebep), vigiladas a diario por artículo (`datos/vigilar_leyes.py`).

### PRÓXIMOS PASOS
- Subir a ≥ 30 preguntas los temas de gestión financiera (Ley 47/2003) y de personal (TREBEP).
- Fuente oficial para la parte de la UE (EUR-Lex).

## Cuerpo General Auxiliar de la Administración del Estado

Estado: **UTILIZABLE · con pendientes** · cobertura de contenido 75 % (no es probabilidad de aprobar).

### COMPLETADO
- Temario oficial: 28 temas copiados literalmente de la convocatoria (BOE-A-2025-26262), cada uno con su página: estudio (índice oficial de artículos del BOE, texto vigente) y test del tema.
- Tests por tema: 17 temas con ≥ 10 preguntas; test a medida por tema, bloque, ley, dificultad y tipo (nuevas, falladas, difíciles, favoritas); modo examen.
- 1175 preguntas publicadas, todas con cita literal del artículo vigente, dificultad, explicación y versión del texto legal contra la que se verificaron. Control de calidad: 0 errores.
- Simulacro: 30 preguntas, 25 min, 4 opciones, penalización 0.33 (adaptado).
- Estructura oficial del examen con cita de las bases: Primera parte · bloque I (organización, derecho administrativo, empleo público) (se simula); Primera parte · psicotécnicas (no se simula); Segunda parte · bloque II (ofimática: Windows 11 y Microsoft 365) (no se simula).
- Mis errores, repetición espaciada, plan de estudio con días disponibles, estadísticas por tema y panel de calidad (`/admin/oposiciones/age-auxiliar-administrativo-c2/quality/`).

### PENDIENTE
- 11 temas sin preguntas: I · T10, II · T1, II · T2, II · T5 (no legislativo), II · T6 (no legislativo), II · T7 (no legislativo), II · T8 (no legislativo), II · T9 (no legislativo), II · T10 (no legislativo), II · T11 (no legislativo), II · T12 (no legislativo).
- Primera parte · psicotécnicas: no se simula. TestLey todavía no tiene preguntas psicotécnicas verificadas.
- Segunda parte · bloque II (ofimática: Windows 11 y Microsoft 365): no se simula. Contenido de ofimática pendiente: no hay fuente oficial consolidada.
- temas_sin_fuente_consolidada: Temas 10, 1, 2 (Unión Europea, derechos humanos o atención al ciudadano): sus textos oficiales no están consolidados en el BOE (Tratados en el DOUE/EUR-Lex, convenios internacionales, RD 208/1996). Aún no tienen test; se añadirán cuando el motor incorpore esas fuentes oficiales.

### PROBLEMAS
- 1 temas con una ley repartida entre varios temas cuyo ámbito no se ha podido precisar (I · T6): se usa la ley completa y la página lo indica.
- 59 preguntas de sus leyes quedan fuera del ámbito de todos los temas: solo aparecen en tests mixtos y simulacros.
- El bloque II (ofimática) y las preguntas psicotécnicas no tienen contenido: no hay texto legal que citar y TestLey no inventa preguntas sin fuente.
- Los temas de atención al público y de la UE no tienen fuente consolidada en el BOE.

### FUENTES
- Resolución de 18 de diciembre de 2025, de la Secretaría de Estado de Función Pública (BOE-A-2025-26262) — https://www.boe.es/diario_boe/txt.php?id=BOE-A-2025-26262 (publicado 2025-12-22)
- Legislación: 19 normas del BOE consolidado (constitucion, ley-19-2013, ley-29-1998, ley-39-2006, ley-39-2015, ley-4-2023, ley-40-2015, ley-47-2003, ley-50-1997, ley-7-1985, lo-1-2004, lo-2-1979, lo-3-1981, lo-3-2007, lo-3-2018, lo-6-1985, rdl-1-2013, rdl-8-2015, trebep), vigiladas a diario por artículo (`datos/vigilar_leyes.py`).

### PRÓXIMOS PASOS
- Definir una fuente oficial (documentación de Microsoft 365 citada en las bases) antes de crear preguntas de ofimática, con revisión humana.
- Psicotécnicos: solo con un banco con licencia; nunca generados sin fuente.

## Cuerpo de Gestión de la Administración Civil del Estado

Estado: **UTILIZABLE · con pendientes** · cobertura de contenido 93 % (no es probabilidad de aprobar).

### COMPLETADO
- Temario oficial: 58 temas copiados literalmente de la convocatoria (BOE-A-2025-26262), cada uno con su página: estudio (índice oficial de artículos del BOE, texto vigente) y test del tema.
- Tests por tema: 53 temas con ≥ 10 preguntas; test a medida por tema, bloque, ley, dificultad y tipo (nuevas, falladas, difíciles, favoritas); modo examen.
- 1573 preguntas publicadas, todas con cita literal del artículo vigente, dificultad, explicación y versión del texto legal contra la que se verificaron. Control de calidad: 0 errores.
- Simulacro: 100 preguntas, 90 min, 4 opciones, penalización 0.33 (regla oficial).
- Estructura oficial del examen con cita de las bases: Primer ejercicio · cuestionario (se simula); Segundo ejercicio · supuesto práctico escrito (bloques IV, V y VI) (no se simula).
- Mis errores, repetición espaciada, plan de estudio con días disponibles, estadísticas por tema y panel de calidad (`/admin/oposiciones/age-gestion-a2/quality/`).

### PENDIENTE
- 5 temas sin preguntas: II · T1, II · T2, II · T3, II · T4, II · T6.
- Segundo ejercicio · supuesto práctico escrito (bloques IV, V y VI): no se simula. Es un ejercicio de desarrollo por escrito, no tipo test.
- temas_sin_fuente_consolidada: Temas 1, 2, 3, 4, 6 (Unión Europea, derechos humanos o atención al ciudadano): sus textos oficiales no están consolidados en el BOE (Tratados en el DOUE/EUR-Lex, convenios internacionales, RD 208/1996). Aún no tienen test; se añadirán cuando el motor incorpore esas fuentes oficiales.

### PROBLEMAS
- 3 temas con una ley repartida entre varios temas cuyo ámbito no se ha podido precisar (IV · T1, V · T9, VI · T6): se usa la ley completa y la página lo indica.
- 75 preguntas de sus leyes quedan fuera del ámbito de todos los temas: solo aparecen en tests mixtos y simulacros.
- Los temas de la Unión Europea y de política económica tienen legislación asignada pero su contenido real está en fuentes no consolidadas en el BOE.
- El segundo ejercicio (supuesto práctico escrito) no se simula.

### FUENTES
- Resolución de 18 de diciembre de 2025, de la Secretaría de Estado de Función Pública (BOE-A-2025-26262) — https://www.boe.es/diario_boe/txt.php?id=BOE-A-2025-26262 (publicado 2025-12-22)
- Legislación: 31 normas del BOE consolidado (constitucion, lef-1954, ley-12-2009, ley-14-1986, ley-19-2013, ley-29-1998, ley-3-2023, ley-33-2003, ley-38-2003, ley-39-2006, ley-39-2015, ley-4-2023, ley-40-2015, ley-42-2007, ley-47-2003, ley-50-1997, ley-53-1984, ley-58-2003, ley-7-1985, ley-7-2021, ley-9-2017, lo-1-2004, lo-2-1979, lo-3-1981, lo-3-2007, lo-3-2018, lo-4-2000, lo-6-1985, rdl-1-2013, rdl-8-2015, trebep), vigiladas a diario por artículo (`datos/vigilar_leyes.py`).

### PRÓXIMOS PASOS
- Incorporar EUR-Lex (Tratados) como fuente oficial para los temas de la UE.
- Revisar a mano el ámbito de los temas marcados «sin precisar».

## Policía Nacional, Escala Ejecutiva (categoría de Inspector)

Estado: **UTILIZABLE · con pendientes** · cobertura de contenido 82 % (no es probabilidad de aprobar).

### COMPLETADO
- Temario oficial: 81 temas copiados literalmente de la convocatoria (BOE-A-2026-15054), cada uno con su página: estudio (índice oficial de artículos del BOE, texto vigente) y test del tema.
- Tests por tema: 54 temas con ≥ 10 preguntas, 1 con 1–9; test a medida por tema, bloque, ley, dificultad y tipo (nuevas, falladas, difíciles, favoritas); modo examen.
- 1501 preguntas publicadas, todas con cita literal del artículo vigente, dificultad, explicación y versión del texto legal contra la que se verificaron. Control de calidad: 0 errores.
- Simulacro: 100 preguntas, 50 min, 3 opciones, penalización 0.5 (regla oficial).
- Estructura oficial del examen con cita de las bases: Primera prueba · aptitud física (no se simula); Segunda prueba · cuestionario de conocimientos (se simula); Segunda prueba · supuestos prácticos (no se simula); Tercera prueba · reconocimiento médico (no se simula); Tercera prueba · entrevista profesional y personal (no se simula).
- Mis errores, repetición espaciada, plan de estudio con días disponibles, estadísticas por tema y panel de calidad (`/admin/oposiciones/policia-nacional-escala-ejecutiva/quality/`).

### PENDIENTE
- 26 temas sin preguntas: T8, T9, T54 (no legislativo), T55, T56 (no legislativo), T57 (no legislativo), T58 (no legislativo), T59 (no legislativo), T60 (no legislativo), T61 (no legislativo), T62 (no legislativo), T63 (no legislativo), T64 (no legislativo), T65 (no legislativo), T66 (no legislativo), T67 (no legislativo), T68 (no legislativo), T69 (no legislativo), T70 (no legislativo), T71 (no legislativo), T72 (no legislativo), T73 (no legislativo), T74 (no legislativo), T75 (no legislativo), T76 (no legislativo), T77 (no legislativo).
- Primera prueba · aptitud física: no se simula. Prueba física.
- Segunda prueba · supuestos prácticos: no se simula. Ejercicio de desarrollo ante el tribunal, no tipo test.
- Tercera prueba · reconocimiento médico: no se simula. Prueba médica.
- Tercera prueba · entrevista profesional y personal: no se simula. Entrevista personal.
- temas_sin_fuente_consolidada: Temas 8, 9 y 55 (Unión Europea, TEDH/TJUE y derechos humanos): pendientes de incorporar sus fuentes oficiales.

### PROBLEMAS
- 4 temas con una ley repartida entre varios temas cuyo ámbito no se ha podido precisar (T5, T6, T10, T48): se usa la ley completa y la página lo indica.
- 42 preguntas de sus leyes quedan fuera del ámbito de todos los temas: solo aparecen en tests mixtos y simulacros.
- 23 temas no legislativos (criminología, sociología, técnicas policiales…) sin contenido.
- El segundo ejercicio (supuestos prácticos) no se simula: requiere corrección humana.

### FUENTES
- Resolución de 7 de julio de 2026, de la Dirección General de la Policía (BOE-A-2026-15054) — https://www.boe.es/diario_boe/txt.php?id=BOE-A-2026-15054 (publicado 2026-07-10)
- Ley Orgánica 9/2015, de Régimen de Personal de la Policía Nacional (art. 17) — https://www.boe.es/buscar/act.php?id=BOE-A-2015-8468#a17 (publicado 2015-07-29)
- Legislación: 32 normas del BOE consolidado (codigo-civil, codigo-penal, constitucion, lecrim, ley-12-2009, ley-23-2014, ley-31-1995, ley-39-2006, ley-39-2015, ley-4-2015, ley-4-2023, ley-40-2015, ley-5-2014, ley-50-1997, ley-7-1985, ley-8-2011, ley-trafico, lo-1-2004, lo-2-1986, lo-3-2007, lo-3-2018, lo-4-2000, lo-4-2015, lo-6-1984, lo-6-1985, lo-7-2021, lo-9-2015, rd-207-2024, rd-240-2007, reglamento-armas, rgc, trebep), vigiladas a diario por artículo (`datos/vigilar_leyes.py`).

### PRÓXIMOS PASOS
- Subir a ≥ 30 preguntas los temas penales con más peso (partes especiales del Código Penal, LECrim).
- Fuentes oficiales para los temas de la UE y de protección internacional no consolidados.

## Verificación automática

E2E del 2026-09-29 (`scripts/e2e-oposiciones.cjs`, Playwright, móvil 375 px y escritorio 1280 px): HOME → OPOSICIÓN → TEMARIO → TEMA → TEST → RESULTADO → REPASAR ERRORES → MIS ERRORES → SIMULACRO → PANEL → CALIDAD, sin desbordamiento horizontal.

| Oposición | Móvil | Escritorio | Falla |
|---|---|---|---|
| guardia-civil-cabos-guardias | 6/6 | 6/6 | — |
| policia-nacional-escala-basica | 14/14 | 14/14 | — |
| age-administrativo-c1 | 14/14 | 14/14 | — |
| age-auxiliar-administrativo-c2 | 14/14 | 14/14 | — |
| age-gestion-a2 | 14/14 | 14/14 | — |
| policia-nacional-escala-ejecutiva | 14/14 | 14/14 | — |

Errores de JavaScript: 0. Usuario sin Pase: ve el test de muestra y la oferta. Guardia Civil tiene menos pasos porque no tiene temario oficial (sin temas ni test por tema).
Además: `npm test` (lint, validación de preguntas y catálogo, tests de Python y de la build), `tests/test_calidad.py` (vigilancia de leyes, calidad, ámbito de temas, estructura del examen) y `tests/js/estudio.test.mjs` (repetición espaciada, plan, estadísticas por tema, salida de la build por oposición).

## Cómo se mantiene al día

FUENTE → EVENTO → OPOSICIÓN → REVISIÓN, sin intervención manual salvo la revisión:
- Convocatoria nueva o modificada en el BOE → `ingesta/` la detecta y versiona → evento `NEW_CONVOCATORIA` → propuesta de actualización de la oposición (revisión humana en `/admin/growth/`).
- Artículo de una ley modificado → `datos/vigilar_leyes.py` guarda la versión anterior en `datos/versiones/`, actualiza el texto y marca sus preguntas `REVIEW_REQUIRED` (la cita sigue en el texto) u `OUTDATED` (ya no está; se retira de los tests sin borrarla) → evento `LAW_UPDATED` → lista de revisión en el panel de calidad de cada oposición.
- Cada build valida estructura, contenido, respuesta, fuente y duplicados de todas las preguntas (`datos/calidad_preguntas.py`) y la estructura del examen contra las bases (`catalogo/validar_catalogo.py`).
