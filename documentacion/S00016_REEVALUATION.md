# Reevaluación del lote S00016 con la política del juez restaurada

| Campo | Valor |
|---|---|
| Lote | S00016 (48 candidatas, 23 artículos; planificado el 2026-09-29) |
| Política usada en la reevaluación | **juez-sesion-v1** · sha256 `08b4a8f4b3773f81bb6f4f045c5540e1a0dd553ec3a84c27929d5e3d00bca8aa` |
| Política del primer juicio | juez-sesion-v1-mod-S00016 (**no autorizada**; ver `fabrica/politica_juez/registro.json`) |
| Política congelada en el lote | 2026-10-01T18:19:53 |
| Veredicto de la reevaluación escrito | 2026-10-01T18:22:54 (juez: subagente Claude Haiku 4.5 nuevo e independiente) |
| Primer juicio (política no autorizada) | 2026-09-29T21:51 UTC (subagente Claude Haiku 4.5) |
| Huella de las candidatas | `c76a60a0f62eb86df29f6e9ce62d98c47fbd91401ae1b6fac930203461783c15` |
| Huella de lo que vio el juez (revision.json) | `1e448c4508370554674c33a39e4a71e7920f28907b6e3fb4cae52fe3c3136a8a` |
| Huella de las instrucciones del juez (prompt_juez.txt) | `75ec495e313dd39a8d916f6c636c8cd3ac8844c9d43ed14be08f461a346a4bbf` |
| Huella de cada veredicto | `79c929cf452dea00faa9d7c69606c9e641a848dda6da6c0b2acfeb59523f36d5` (ambos; ver nota) |

## Procedimiento
1. El veredicto original se conservó sin tocar y se archivó fuera de la carpeta del juez:
   `fabrica/estado/archivo/S00016/veredictos-juez-sesion-v1-mod-S00016-NO-AUTORIZADA.json`.
2. Se congeló en el lote la política restaurada **juez-sesion-v1** (texto exacto usado en S00015).
3. Se repitió la validación determinista: las 48 candidatas y lo que ve el juez son idénticos a los de la primera vez
   (mismos items y mismas instrucciones).
4. Un juez nuevo recibió `prompt_juez.txt` (generado desde la política congelada) sin ninguna modificación.
5. Se comparó el resultado con el original y se calculó el estado final con las mismas reglas del cierre, sin publicar nada.

## Resultado

| | Primer juicio (no autorizado) | Reevaluación (juez-sesion-v1) |
|---|---|---|
| Total | 48 | 48 |
| Veredicto del juez completamente OK | 48 | 48 |
| VALID | 41 | 41 |
| REVIEW_REQUIRED | 7 | 7 |
| REJECTED | 0 | 0 |

**Diferencias respecto al veredicto anterior: ninguna**, ni en los indicadores (respaldada, única, clara, duplicada) ni en
el estado final de ninguna pregunta. La frase añadida en la política no autorizada (sobre la memorización) no cambió
ningún veredicto de este lote.

Las 7 REVIEW_REQUIRED no dependen del juez. Las envía a revisión humana la validación determinista:
- Revisión obligatoria por tipo en esta fase. Caso práctico: 0.1, 8.2, 13.0 y 19.1. Relación entre artículos: 7.2 y 10.2.
- El redactor declaró confianza «media»: 5.2.

No se publicará ninguna de ellas sin aprobación humana explícita (`python3 -m fabrica.revision`).

## Notas para la auditoría
- **Huella idéntica de los dos veredictos.** Los dos juicios contienen exactamente lo mismo: 48 entradas aprobadas con
  el motivo vacío, en el mismo orden, serializadas igual. La transcripción del juez de la reevaluación muestra que no
  leyó el veredicto original: abrió solo `revision.json` y escribió su veredicto item a item, con un comentario por pregunta.
  Para que esto no dependa de la buena fe, `validar` y `cerrar` ahora se bloquean si en la carpeta del juez hay veredictos
  de otra evaluación (`veredictos_ajenos`).
- El juez dudó primero de los items 8.1 y 9.2 (opción única y respaldo) y, tras releer el artículo, los confirmó. Son
  candidatos a la muestra de revisión humana.
- Antes del bloqueo, el coordinador revisó a mano una muestra de 8 items contra el texto del artículo: todos correctos.
  Esa revisión no cambió ningún veredicto ni se usó para publicar.
- Publicación: tras esta reevaluación, el cierre del lote con la política juez-sesion-v1 publica las 41 VALID y deja las 7
  REVIEW_REQUIRED en la cola de revisión humana.
