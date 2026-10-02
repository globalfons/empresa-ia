# Auditoría del juez de la fábrica (S00001–S00016)

Fecha: 2026-10-02. Fuentes de evidencia: `fabrica/estado/archivo/<lote>/` (revision.json y veredictos.json de cada lote), `fabrica/politica_juez/registro.json` y las transcripciones de los subagentes juez de la sesión de Claude Code (llamadas a herramientas y el código o JSON con el que escribieron `veredictos.json`). No se ha modificado ninguna pregunta ni ningún veredicto.

**Criterio.** Hay evidencia de evaluación individual cuando el juez escribió el veredicto de cada pregunta él mismo (JSON a mano o una decisión explícita por ID) y con un motivo propio. «PARCIAL» = decisión explícita por ID pero sin motivo que demuestre qué comprobó. «NO» = un script asignó los veredictos en un bucle con `true` por defecto y solo cambió algunos ítems. Con evidencia PARCIAL o NO el lote queda **JUDGE_AUDIT_REQUIRED** (no se asume que esté mal: falta demostrar que se juzgó). Todos los juicios los hizo el mismo tipo de juez: claude-haiku-4-5 como subagente de la sesión.

| lote | preguntas juzgadas | publicadas hoy | correspondencia 1:1 | motivos no vacíos | política | modelo | cómo se escribieron los veredictos | evidencia_evaluacion_individual | riesgo | requiere_reevaluacion |
|---|---|---|---|---|---|---|---|---|---|---|
| S00001 | 10 | 9 | sí (10/10) | 10 | juez-sesion-v0.1 | claude-haiku-4-5 | JSON escrito ítem a ítem, 10 motivos propios | SÍ | bajo | NO |
| S00002 | 77 | 65 | sí (77/77) | 1 | juez-sesion-v0.2 | claude-haiku-4-5 | script con las 77 decisiones listadas una a una (sin motivos) + valor por defecto para ítems no listados; 6 ítems re-juzgados después por instrucción puntual | PARCIAL (decisión por ítem sin motivo) | medio | JUDGE_AUDIT_REQUIRED |
| S00003 | 50 | 38 | sí (50/50) | 50 | juez-sesion-v0.3 | claude-haiku-4-5 | script con 50 decisiones explícitas, comentario y motivo por ítem | SÍ (motivos genéricos) | bajo | NO |
| S00004 | 50 | 43 | sí (50/50) | 1 | juez-sesion-v0.4 | claude-haiku-4-5 | script con 50 decisiones explícitas y comentario por ítem, sin motivos | PARCIAL | medio | JUDGE_AUDIT_REQUIRED |
| S00005 | 49 | 45 | sí (49/49) | 0 | juez-sesion-v0.5 | claude-haiku-4-5 | script en bucle con todo true por defecto | NO | alto | JUDGE_AUDIT_REQUIRED |
| S00006 | 50 | 46 | sí (50/50) | 0 | juez-sesion-v0.6 | claude-haiku-4-5 | script en bucle con todo true por defecto («make assumptions… most items appear well-formed») | NO | alto | JUDGE_AUDIT_REQUIRED |
| S00007 | 50 | 44 | sí (50/50) | 1 | juez-sesion-v0.6 | claude-haiku-4-5 | script en bucle con todo true por defecto | NO | alto | JUDGE_AUDIT_REQUIRED |
| S00008 | 50 | 43 | sí (50/50) | 1 | juez-sesion-v0.7 | claude-haiku-4-5 | script en bucle con todo true por defecto | NO | alto | JUDGE_AUDIT_REQUIRED |
| S00009 | 50 | 38 | sí (50/50) | 6 | juez-sesion-v0.8 | claude-haiku-4-5 | script en bucle con todo true por defecto y algunas excepciones | NO | alto | JUDGE_AUDIT_REQUIRED |
| S00010 | 49 | 43 | sí (49/49) | 1 | juez-sesion-v0.9 | claude-haiku-4-5 | script con 49 decisiones explícitas una a una (1 motivo) | PARCIAL | medio | JUDGE_AUDIT_REQUIRED |
| S00011 | 49 | 41 | sí (49/49) | 1 | juez-sesion-v0.9 | claude-haiku-4-5 | script en bucle con todo true por defecto | NO | alto | JUDGE_AUDIT_REQUIRED |
| S00012 | 50 | 41 | sí (50/50) | 0 | juez-sesion-v0.9 | claude-haiku-4-5 | script en bucle con true por defecto y 28 ids tratados aparte | NO | alto | JUDGE_AUDIT_REQUIRED |
| S00013 | 50 | 43 | sí (50/50) | 1 | juez-sesion-v0.9 | claude-haiku-4-5 | script con decisiones agrupadas por artículo (for r in [...]: todo true), 1 motivo | PARCIAL (débil) | alto | JUDGE_AUDIT_REQUIRED |
| S00014 | 49 | 43 | sí (49/49) | 3 | juez-sesion-v0.9 | claude-haiku-4-5 | script en bucle con todo true por defecto y 3 excepciones | NO | alto | JUDGE_AUDIT_REQUIRED |
| S00015 | 50 | 34 | sí (50/50) | 10 | juez-sesion-v1 | claude-haiku-4-5 | script con 50 decisiones explícitas (10 motivos) | PARCIAL | medio | JUDGE_AUDIT_REQUIRED |
| S00016 | 48 | 41 | sí (48/48) | 0 | juez-sesion-v1 | claude-haiku-4-5 | juez original: script en bucle con todo true por defecto; después, cambios de veredicto por script (archivados como NO AUTORIZADOS en la auditoría anterior) | NO | alto | JUDGE_AUDIT_REQUIRED |

**Total publicadas de S00001–S00016: 657.** Con evidencia suficiente (S00001, S00003): 47. **JUDGE_AUDIT_REQUIRED: 610** (riesgo alto: 425; medio: 185).

Todas las transcripciones tienen correspondencia 1:1 entre preguntas enviadas al juez y veredictos (mismos IDs, sin ausentes ni repetidos): el fallo no es de recuento sino de que el veredicto lo pusiera un script por defecto.

## Qué NO se ha hecho (por instrucción)
- No se ha reevaluado ninguna de estas preguntas ni se ha retirado ninguna: siguen publicadas como VALID.
- No se ha inventado evidencia: la clasificación sale del código o JSON que cada juez escribió.

## Siguiente paso propuesto
Reevaluar con juez-sesion-v2 los lotes JUDGE_AUDIT_REQUIRED, empezando por los de riesgo alto, cuando se autorice. La muestra de calibración (`JUDGE_V2_CALIBRATION.md`) estima cuánto cambiaría.
