# Aptitude Engine (Mossos 360 · Fase 1)

| Pieza | Dónde |
|---|---|
| Generadores y esquema `AptitudeExercise` | `web/assets/aptitud.js` (`TLAptitud`) |
| Sesión, resultado y progreso (por categoría, subtipo, dificultad, evolución, errores recurrentes) | `web/assets/psicotecnicos.js` (`TLPsico`, ampliado sin romper B6) |
| Interfaz | `web/assets/aptitud-ui.js` → `/oposiciones/<id>/aptitudinal/` (solo si el perfil tiene la estructura aptitudinal oficial verificada) |
| Datos oficiales | `catalogo/preparacion/<id>.json → aptitud` (Mossos 46/26: 80 preguntas, 35 min, sin penalización, apto ≥ 5) |
| Gate | `config.json → planes`: `aptitud_completo` (Pase) y `aptitud_muestra` (10 sin Pase; solo mixto y por categoría) |
| Tests | `tests/js/aptitud.test.mjs` (8) · E2E `scripts/e2e-mossos360.cjs` pasos 21a–21c |

## Contenido
Ejercicios **originales** de TestLey (`source_type: TESTLEY_GENERATED`). Ningún ejercicio reproduce pruebas oficiales ni material comercial. Cada ejercicio sale de un generador determinista: la misma semilla da el mismo ejercicio y su id permite regenerarlo.

| Categoría | Subtipos | Estímulo |
|---|---|---|
| Numérica | serie (aritmética, geométrica, alterna, cuadrados, diferencias crecientes), porcentaje, proporción | texto |
| Abstracta | serie de figuras: marco, flecha orientada, puntos y relleno (figura asimétrica, sin ambigüedad de giro) | SVG |
| Espacial | rotación de una cuadrícula asimétrica (las 8 transformaciones son distintas); los distractores son reflejos y otros giros | SVG |
| Perceptiva | parejas idénticas (con caracteres confundibles: O/0, S/5…) y recuento de un símbolo | texto/tabla |
| Verbal | serie de letras y orden alfabético (verbal formal, verificable por cálculo) | texto |

**Límite honesto:** la aptitud verbal semántica (sinónimos, analogías, comprensión) requiere redacción y **no se genera automáticamente**. Si se añade, entrará como `AI_GENERATED_REVIEW_REQUIRED` por la puerta de revisión humana.

## Calidad (medida por tests)
- **Cobertura de categorías:** 5/5, con 3 dificultades cada una.
- **Solubilidad y unicidad:** `verificar()` regenera el ejercicio desde su id y exige 4 opciones distintas y una sola correcta. Sobre 150 semillas × cada subtipo × 3 dificultades no hay ningún fallo. Las respuestas se comprueban además con cálculos independientes del generador (porcentaje, proporción, parejas, recuento, orden, rotación, series de letras).
- **Unicidad entre ejercicios:** ≥ 70 ejercicios distintos por cada 100 semillas en cada subtipo.
- **Tiempo:** `estimated_time` entre 25 y 40 s; el contrarreloj usa el ritmo oficial de 26 s por ejercicio (35 min / 80).
- **Sin nota oficial:** las bases no publican la conversión de aciertos a puntos.

## Modos
Por categoría, por dificultad, mixto, contrarreloj y adaptativo. El adaptativo usa una regla explicable: sube de nivel tras 2 aciertos seguidos, baja tras un fallo y elige primero la aptitud sin datos y después la de menor acierto.
