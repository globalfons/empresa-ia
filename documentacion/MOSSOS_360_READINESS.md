# Mossos 360 · readiness (checklist con evidencia)

Estado global: **NOT READY**. Solo se marca un punto con evidencia comprobable.

- [x] **Fuentes oficiales verificadas** · `catalogo/fuentes/DOGC-1046460.txt` (sha256 en la ficha), `catalogo/preparacion/mossos-esquadra.json` · tests `tests/test_preparacion.py` (citas literales, barems idénticos al Anexo 2, capítulos del Anexo 3) · OFFICIAL_VERIFIED
- [x] **Convocatoria modelada** · `call_id` 46/26 en `motor360`; una convocatoria nueva es una clave nueva (test `test_otra_convocatoria_no_hereda_datos`) · calendario y eventos en el perfil
- [x] **Temario operativo** · 21 temas, `/oposiciones/mossos-esquadra/tema-N/` · `tests/test_perfil.py`
- [ ] **Knowledge tests operativos** · funcionan (E2E 21/21), pero la cobertura es PARCIAL (99 preguntas; `MOSSOS_360_KNOWLEDGE.md`) y la fábrica está en pausa
- [x] **Official exams separados** · 290 OFFICIAL_EXAM en su propio banco · `scripts/integridad_banco.py`, `tests/test_mossos.py`
- [ ] Aptitud verbal · PARCIAL: series de letras y orden alfabético (`web/assets/aptitud.js`, tests en `tests/js/aptitud.test.mjs`). La verbal semántica (sinónimos, analogías) necesita un banco revisado por personas
- [x] **Aptitud numérica** · `web/assets/aptitud.js` + `/oposiciones/mossos-esquadra/aptitudinal/` · `tests/js/aptitud.test.mjs` (solubilidad, unicidad, cálculo independiente) · E2E 21a–21c en 375 px y escritorio · contenido TESTLEY_GENERATED, nunca oficial
- [x] **Aptitud abstracta** · `web/assets/aptitud.js` + `/oposiciones/mossos-esquadra/aptitudinal/` · `tests/js/aptitud.test.mjs` (solubilidad, unicidad, cálculo independiente) · E2E 21a–21c en 375 px y escritorio · contenido TESTLEY_GENERATED, nunca oficial
- [x] **Aptitud espacial** · `web/assets/aptitud.js` + `/oposiciones/mossos-esquadra/aptitudinal/` · `tests/js/aptitud.test.mjs` (solubilidad, unicidad, cálculo independiente) · E2E 21a–21c en 375 px y escritorio · contenido TESTLEY_GENERATED, nunca oficial
- [x] **Aptitud perceptiva** · `web/assets/aptitud.js` + `/oposiciones/mossos-esquadra/aptitudinal/` · `tests/js/aptitud.test.mjs` (solubilidad, unicidad, cálculo independiente) · E2E 21a–21c en 375 px y escritorio · contenido TESTLEY_GENERATED, nunca oficial
- [x] **Competency training** · 10 competencias oficiales (cita, fuente, 46/26) + 10 fichas y 60 situaciones TestLey publicadas solo como VALID del juez independiente (`fabrica/competencias.py`, `catalogo/competencias/mossos-esquadra.json`, lote C00002) · `/oposiciones/mossos-esquadra/competencias/` · `tests/test_competencias.py`, `tests/js/competencias.test.mjs`, E2E 22a–22e en 375 px y escritorio
- [x] **Psychometric foundation** · cuestionario de autopercepción (20 ítems, pares invertidos, consistencia, evolución) como SELF_ASSESSMENT separado de OBJECTIVE_SCORE, sin respuestas correctas ni diagnóstico (`web/assets/competencias.js`) · tests JS · E2E 22d
- [ ] Interview trainer · Fase 3
- [ ] Physical tracker · barems oficiales verificados; sin registro de marcas (Fase 4)
- [ ] Catalan information · datos verificados en el perfil; sin vista para el usuario (Fase 6)
- [ ] Psychophysical information · capítulos del Anexo 3 verificados; sin vista (Fase 6)
- [ ] Simulation · solo conocimientos (Fase 5)
- [ ] Adaptive plan · solo conocimientos (Fase 5)
- [ ] Progress dashboard · Fase 6
- [ ] Mobile QA · se repite en cada fase con UI
- [x] **Tests green** · `npm test` (estado de la Fase 0)
- [ ] Security review · Fase 7
- [ ] Premium gates · B1 pendiente del despliegue del propietario (`PREMIUM_DEPLOYMENT.md`)
- [x] **Source traceability** · cada bloque con citas, `fuente`, `documento`, `call_id` y `verification_status`
