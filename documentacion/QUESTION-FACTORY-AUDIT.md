# Auditoría de la Question Factory — 2026-10-01

Generado por `python3 -m fabrica.auditoria` (determinista, sin modelo, sin modificar preguntas). Datos completos en `fabrica/estado/auditoria.json`.

Política del juez activa: **juez-sesion-v1** (ver `fabrica/politica_juez/registro.json`).

## 1. Indicadores

| Indicador | Valor |
|---|---|
| Preguntas generadas por la fábrica (banco + cola) | 734 |
| VALID publicadas | 616 |
| REVIEW_REQUIRED (pendientes de revisión humana) | 115 |
| REJECTED | 3 |
| Aprobadas por revisión humana | 0 |
| FACTORY_VALID_RATE | 83.9 % |
| FACTORY_REVIEW_RATE | 15.7 % |
| FACTORY_REJECTION_RATE | 0.4 % |
| DUPLICATE_RATE | 0.3 % |
| Duplicados exactos en el banco | 0 |
| Casi duplicados (enunciado ≥ 60 % igual, mismo artículo) | 5 |
| Sospecha de mismo dato (misma respuesta, enunciado ≥ 35 %) | 0 |
| Citas que ya no están en el texto vigente | 0 |
| Citas cortas (< 25 caracteres) | 0 |
| Explicaciones breves (< 90 caracteres) | 0 |
| Preguntas sobre artículos cuya ley ha cambiado desde la generación | 0 |

## 2. Lotes

| Lote | Generadas | VALID | Revisión | Rechazadas | Política del juez |
|---|---|---|---|---|---|
| S00001 | 10 | 9 | 1 | 0 | juez-sesion-v0.1 |
| S00002 | 77 | 65 | 12 | 0 | juez-sesion-v0.2 |
| S00003 | 50 | 38 | 12 | 0 | juez-sesion-v0.3 |
| S00004 | 50 | 43 | 7 | 0 | juez-sesion-v0.4 |
| S00005 | 50 | 45 | 4 | 1 | juez-sesion-v0.5 |
| S00006 | 50 | 46 | 4 | 0 | juez-sesion-v0.6 |
| S00007 | 50 | 44 | 6 | 0 | juez-sesion-v0.6 |
| S00008 | 50 | 43 | 7 | 0 | juez-sesion-v0.7 |
| S00009 | 50 | 38 | 12 | 0 | juez-sesion-v0.8 |
| S00010 | 49 | 43 | 6 | 0 | juez-sesion-v0.9 |
| S00011 | 49 | 41 | 8 | 0 | juez-sesion-v0.9 |
| S00012 | 50 | 41 | 9 | 0 | juez-sesion-v0.9 |
| S00013 | 50 | 43 | 6 | 1 | juez-sesion-v0.9 |
| S00014 | 49 | 43 | 5 | 1 | juez-sesion-v0.9 |
| S00015 | 50 | 34 | 16 | 0 | juez-sesion-v1 |

## 3. Reparto

**Por oposición (tema objetivo de la generación)**

| Oposición | VALID |
|---|---|
| policia-nacional-escala-ejecutiva | 242 |
| age-gestion-a2 | 169 |
| policia-nacional-escala-basica | 81 |
| age-auxiliar-administrativo-c2 | 79 |
| age-administrativo-c1 | 45 |

**Por ley**

| Ley | VALID |
|---|---|
| codigo-penal | 68 |
| lecrim | 43 |
| lo-4-2000 | 35 |
| ley-47-2003 | 28 |
| ley-38-2003 | 27 |
| ley-5-2014 | 25 |
| lo-4-2015 | 25 |
| ley-3-2023 | 24 |
| ley-33-2003 | 24 |
| rdl-8-2015 | 23 |
| reglamento-armas | 21 |
| ley-23-2014 | 20 |
| ley-58-2003 | 20 |
| ley-19-2013 | 19 |
| rd-240-2007 | 19 |
| ley-12-2009 | 17 |
| ley-14-1986 | 17 |
| ley-40-2015 | 17 |
| lef-1954 | 16 |
| ley-9-2017 | 15 |
| lo-3-2018 | 15 |
| ley-39-2015 | 11 |
| rgc | 11 |
| lo-6-1985 | 10 |
| lo-9-2015 | 9 |
| rd-207-2024 | 9 |
| ley-trafico | 8 |
| ley-4-2015 | 7 |
| ley-7-1985 | 6 |
| ley-29-1998 | 5 |
| trebep | 4 |
| constitucion | 3 |
| ley-4-2023 | 3 |
| ley-42-2007 | 3 |
| ley-50-1997 | 3 |
| lo-2-1979 | 3 |
| lo-2-1986 | 2 |
| rdl-1-2013 | 1 |

**DIFFICULTY_DISTRIBUTION** (objetivo 30/50/20): dif 1: 34.9 % · dif 2: 56.2 % · dif 3: 8.9 %

**QUESTION_TYPE_DISTRIBUTION**: literal 93 · aplicacion 65 · organos 64 · dificil 55 · conceptual 54 · negativa 43 · comparativa 43 · requisitos 39 · excepcion 38 · plazos 37 · competencias 35 · procedimiento 29 · definiciones 21

**Temas con más preguntas de la fábrica**: policia-nacional-escala-ejecutiva#38 (27) · age-gestion-a2#33 (27) · age-gestion-a2#21 (24) · age-gestion-a2#35 (24) · policia-nacional-escala-basica#9 (21) · policia-nacional-escala-ejecutiva#23 (20) · age-gestion-a2#56 (20) · policia-nacional-escala-ejecutiva#43 (19) · policia-nacional-escala-ejecutiva#79 (19) · policia-nacional-escala-ejecutiva#47 (18) · policia-nacional-escala-ejecutiva#44 (17) · policia-nacional-escala-ejecutiva#16 (17) · age-gestion-a2#26 (17) · policia-nacional-escala-ejecutiva#15 (17) · age-administrativo-c1#30 (17)

## 4. ARTICLE_CONCENTRATION

- Artículos distintos: 315 · media 1.96 preguntas/artículo · máximo 3
- Los 10 artículos más usados concentran el 4.9 % · índice HHI 0.0037 (0 = disperso, 1 = todo en uno)
- Más usados: codigo-penal:320 (3) · codigo-penal:566 (3) · codigo-penal:323 (3) · codigo-penal:37 (3) · codigo-penal:570ter (3) · codigo-penal:326 (3) · codigo-penal:570quater (3) · codigo-penal:39 (3) · codigo-penal:327 (3) · codigo-penal:329 (3) · codigo-penal:46 (3) · codigo-penal:332 (3) · codigo-penal:575 (3) · lecrim:12 (3) · lecrim:503 (3)
- Artículos por encima de su capacidad (banco completo > palabras/40): 0

## 5. TOPIC_COVERAGE

- Temas con fuente en el plan: 163 (todos por debajo de su objetivo de 100–200 preguntas) · con preguntas de la fábrica: 63 · por debajo de 100 (o de su capacidad, si es menor): 131 · sin fuente asignada: 15
- Artículos del ámbito de los temas con alguna pregunta: 2438 de 6720 (36.3 %)
- Temas menos cubiertos:
  - age-gestion-a2#34 — La expropiación forzosa: concepto, naturaleza y elementos. Procedimientos de exp: 47/200
  - age-gestion-a2#26 — Otras políticas públicas. El sistema sanitario: distribución de competencias, ge: 49/200
  - policia-nacional-escala-ejecutiva#47 — Medidas cautelares personales: la detención y la prisión provisional. La incomun: 51/187
  - policia-nacional-escala-ejecutiva#45 — El proceso penal: principios que lo informan. Fases del proceso. El sumario: con: 56/200
  - age-gestion-a2#19 — Política ambiental. Distribución de competencias. Conservación de la biodiversid: 57/200
  - age-gestion-a2#21 — La evolución del empleo en España. Los servicios públicos de empleo: régimen de : 57/200
  - age-gestion-a2#32 — Los contratos regulados por la Ley de Contratos del Sector Público (II). Tipos. : 57/200
  - policia-nacional-escala-ejecutiva#48 — La prueba en el proceso penal. Concepto, objeto y medios de prueba. La prueba an: 57/200
  - policia-nacional-escala-ejecutiva#15 — Documentación de los extranjeros. La potestad sancionadora. Tipos de infraccione: 51/178
  - age-gestion-a2#18 — Política económica actual. Política presupuestaria. Evolución y distribución act: 49/171
  - age-gestion-a2#17 — Políticas de modernización de la Administración General del Estado. La Administr: 52/181
  - policia-nacional-escala-ejecutiva#16 — La protección internacional. Reglas procedimentales para el reconocimiento de la: 52/181
  - policia-nacional-escala-basica#8 — La Ley Orgánica 2/1986, de 13 de marzo, de Fuerzas y Cuerpos de Seguridad: dispo: 40/139
  - policia-nacional-escala-ejecutiva#42 — Delitos contra la Constitución: rebelión; delitos contra la Corona; de los delit: 36/125
  - policia-nacional-escala-basica#10 — De las infracciones en materia de extranjería y su régimen sancionador. Tipos de: 55/190
  - policia-nacional-escala-basica#9 — Entrada, libre circulación y residencia en España de ciudadanos de los Estados m: 58/200
  - policia-nacional-escala-basica#13 — La Ley Orgánica 4/2015, de 30 de marzo, de protección de la seguridad ciudadana.: 58/200
  - policia-nacional-escala-basica#41 — Origen de las armas de fuego. Definición, clasificación, categorías y funcionami: 58/200
  - age-administrativo-c1#9 — La Administración local: entidades que la integran. La provincia, el municipio y: 58/200
  - age-administrativo-c1#14 — La protección de datos personales y su régimen Jurídico: principios, derechos, r: 58/200

## 6. Revisión y riesgos

**Motivos de las REVIEW_REQUIRED pendientes**

- revisión obligatoria por tipo: 82
- juez: enunciado poco claro o trivial: 17
- el generador declaró confianza media/baja: 12
- otros: 2
- juez: más de una opción defendible: 1
- juez: no respaldada por el texto: 1

**Preguntas de tipo interpretativo publicadas** (aplicación, caso práctico, difícil, relación de artículos): 120 — caso_practico 0, relacion_articulos 0, dificil 55, aplicacion 65. Son las que más dependen de la lectura del artículo; el juez las aprobó una a una contra el texto, pero son las primeras candidatas a una revisión humana por muestreo.

**Pares a revisar por una persona (posible mismo dato)**

- lecrim-199 ↔ lecrim-200 (enunciados 60 % iguales)
- ley-12-2009-48 ↔ ley-12-2009-49 (enunciados 65 % iguales)
- ley-3-2023-46 ↔ ley-3-2023-47 (enunciados 64 % iguales)
- ley-47-2003-149 ↔ ley-47-2003-150 (enunciados 62 % iguales)
- lo-4-2015-40 ↔ lo-4-2015-41 (enunciados 62 % iguales)

