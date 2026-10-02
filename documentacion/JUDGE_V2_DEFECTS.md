# Defectos del juez v2 (juez-sesion-v2) detectados en la validación documental

Fecha: 2026-10-02. Base: `JUDGE_V2_INDEPENDENT_VALIDATION.md` (50 preguntas contrastadas con el BOE vigente) y la revisión documental de S00018. **No se ha corregido nada en silencio y la política v2 no se ha cambiado.**

| # | Defecto | Severidad | Casos | Efecto |
|---|---|---|---|---|
| D1 | Acepta citas que no contienen todo el fundamento de la respuesta (la respuesta tiene dos elementos y la cita solo uno, o la cita se corta antes del elemento decisivo) | **MAJOR** | lef-1954-36, ley-19-2013-57, lo-4-2000-84 (muestra) · S00018-8.2 (Mossos) | La respuesta es correcta, pero la justificación que se muestra al opositor es insuficiente |
| D2 | Acepta una cita parcial que, mostrada como justificación, contradice en apariencia otra opción | **MAJOR** | codigo-penal-626 | Puede inducir a aprender que la opción D no figura en el art. 566.2 cuando sí figura |
| D3 | No siempre detecta preguntas triviales (repetición de un artículo de una frase) aunque su criterio «clara» las excluye | **MINOR** | lef-1954-38 | Pregunta correcta de poco valor; además v2 marcó trivial una pregunta que no lo es (S00018-9.0): aplica el criterio de forma inconsistente |
| D4 | No evalúa metadatos: dificultad (6 sobrestimadas), tipo (3 incorrectos), tema asignado (2) | **METADATA_ONLY** | ver tabla de la validación | Estadísticas y simulacros por dificultad/tipo menos fiables; no afecta a la corrección |
| — | Errores jurídicos aprobados (respuesta incorrecta o doble respuesta) | **CRITICAL: ninguno** | — | — |

Tasa en la muestra: 5/50 VALID de v2 no son VALID según la revisión documental (10 %), todas por D1–D3. Ninguna por error jurídico.

## Causa

El criterio `respaldada` de v1/v2 dice: *«true only if the article text (and the cita) clearly justifies that option a is correct»*. El paréntesis permite que el juez se apoye en el texto completo del artículo aunque la cita no contenga el fundamento. No existe ningún criterio que exija que la cita sola baste, ni para descartar los distractores en preguntas negativas.

## Cambio propuesto (juez-sesion-v3) — NO aplicado

Mismo mecanismo de v2 (tandas de 10, solo lectura, guards). Dos cambios de criterio y uno informativo:

1. **Nuevo criterio bloqueante `cita_suficiente`** (booleano, en `criteria_checked`):
   > `cita_suficiente`: true only if the cita ALONE contains every element needed to choose option a (if the answer combines several elements — e.g. who instructs AND who sanctions, a requirement AND a condition — all of them must be in the cita) and, for NO/negative questions, every element needed to see that the other options do appear in the text. If the answer is in the texto but not in the cita, cita_suficiente = false.

   Regla de estado: `cita_suficiente = false` → **REVIEW_REQUIRED** (nunca VALID).
2. **Trivialidad explícita** en `clara`:
   > If the article is a single sentence and the correct option merely restates it (e.g. «the same procedure as the previous article»), clara = false. A historical date or figure that is a milestone of the syllabus is NOT trivial.
3. **Metadatos no bloqueantes**: `difficulty_ok`, `type_ok`, `topic_ok` (booleanos informativos en el veredicto; no cambian el estado; alimentan una cola de corrección de metadatos).

Validación de v3 antes de usarlo: repetir con v3 las mismas 50 y comprobar que marca REVIEW exactamente en lef-1954-36, ley-19-2013-57, lo-4-2000-84, codigo-penal-626 y lef-1954-38, y VALID en las 45 restantes.
