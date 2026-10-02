# PsychotechnicalEngine (B6)

Motor genérico de psicotécnicos, **separado de las preguntas legales** (no comparte banco, sesiones ni cobertura con el banco de leyes).

| Pieza | Dónde |
|---|---|
| Categorías y estructura oficial de cada prueba (con cita literal) | `catalogo/psicotecnicos.json` |
| Motor de práctica (validación, sesión, resultado, progreso) | `web/assets/psicotecnicos.js` (`TLPsico`) |
| En el perfil de la oposición | módulo `psicotecnicos` → `psicotecnico` (estructura, fuente, tamaño de los bancos) |
| Tests | `tests/js/psicotecnicos.test.mjs` |

Categorías: verbal, numérico, abstracto, espacial, lógico, atención, percepción, memoria.

## Reglas
- Cada ejercicio es `OFFICIAL_EXAM` (obligatoria su fuente oficial: URL y documento) o `TESTLEY_GENERATED` (prohibido `reproduccion_oficial` o `fuente`: nunca se presenta como oficial).
- Una sesión no mezcla `OFFICIAL_EXAM` y `TESTLEY_GENERATED` (error).
- El resultado da aciertos, errores, blancos, tiempo, desglose por categoría y por dificultad y el progreso por categoría (acierto y segundos por pregunta).
- `puntuacion_oficial` es siempre `null` si la prueba no tiene `formula_verificable: true`, con el motivo.

## Mossos d'Esquadra 46/26 (subprova aptitudinal)
Fuente: bases de la convocatoria (DOGC, Resolució ISP/1763/2026), citadas literalmente: 80 preguntas, 35 minutos, 4 opciones y sin penalización. Evalúa razonamiento abstracto, razonamiento espacial, aptitud verbal, numérica y perceptiva. La nota va de 0 a 10, con un mínimo de 5.
Las bases **no** dan la conversión de aciertos a puntos → `formula_verificable: false`: TestLey no calcula nota oficial.

Estado: **SIN_BANCO_VERIFICADO**. No hay ejercicios: los modelos de pruebas aptitudinales de convocatorias anteriores no se han incorporado y verificado como `OFFICIAL_EXAM`, y no se han generado ejercicios propios. El módulo sigue funcionando como checklist con registro manual. Para activarlo basta con añadir ejercicios válidos a `bancos` (lo comprueba `TLPsico.validar`).

## Replicar en otras oposiciones
Añadir `pruebas.<id>` con su parte oficial, las citas literales de sus bases y sus categorías. Policía Nacional y Guardia Civil tienen psicotécnicos en su estructura oficial; Auxiliar AGE tiene una parte psicotécnica en la primera prueba.
