# Piloto histórico del juez v2 (50 de las 425 de riesgo alto)

Estado: **NO EJECUTADO — bloqueado** (2026-10-02).

1. **Objetivo.** Medir cómo cambian los veredictos de preguntas históricas aprobadas por scripts por defecto (riesgo alto, `FACTORY_JUDGE_AUDIT.md`) al pasar por juez-sesion-v2, comparando legacy ↔ v2 ↔ revisión humana.
2. **Por qué no se ha ejecutado.** La instrucción condiciona el piloto a que la calibración humana demuestre que v2 es estable. La muestra de calibración no tiene ninguna revisión humana (`JUDGE_V2_HUMAN_CALIBRATION.md`), así que no hay base para ejecutarlo. Tampoco se ha seleccionado la muestra, para no adelantar una fase no autorizada.
3. **Metodología prevista (sin cambios en v2 cuando se desbloquee).** Selección estratificada y reproducible (semilla fija) entre las 425: oposición, ley, artículo distinto, tipo (literal, conceptual, aplicación, caso práctico, negativa, excepción, plazos, competencias, requisitos, procedimiento, difícil) y dificultad 1-3; IDs y motivo de cada selección registrados. Evaluación con `fabrica.juez_v2` (tandas de 10, solo lectura, extracción desde la transcripción, guards), sin publicar nada; comparación legacy_verdict ↔ v2 ↔ humano.
4. **Requisito para desbloquear.** Revisión humana de las 50 de calibración (`REVISION_HUMANA_PENDIENTE.csv`) y decisión CALIBRATION_PASS o CALIBRATION_PASS_WITH_REVIEW.
5. **Riesgos ya detectados (diagnóstico de la 2ª opinión de modelo).** v2 acepta citas parciales, no detecta siempre preguntas triviales y no evalúa metadatos (tipo, dificultad, tema). Conviene que la revisión humana confirme o descarte estos patrones antes del piloto.
6. **Conclusión técnica.** Sin referencia humana no es posible afirmar que v2 sea fiable para reevaluar el histórico. Estado de las 425: HISTORICAL_REEVALUATION_BLOCKED.
