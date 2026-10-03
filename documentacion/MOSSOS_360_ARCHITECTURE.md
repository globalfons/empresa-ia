# Mossos 360 · arquitectura reutilizable (F23, actualizada en el cierre B1–B6)

Una oposición = **datos** (ficha del catálogo) + **perfil generado** + **motores genéricos**. Añadir una oposición no requiere código.

```
catalogo/oposiciones/<id>.json  (ficha: datos oficiales con cita literal, fuentes, temario, examen, módulos)
catalogo/modulos_preparacion.json  (catálogo genérico de módulos)
datos/fuentes-*.json · datos/preguntas-*.json · datos/candidatas/*.json · datos/examens-oficials/<id>.json · catalogo/novedades.json
        │  catalogo/perfil.py  (OppositionProfile; lo ejecuta catalogo/construir.py)
        ▼
catalogo/perfiles/<id>.json  ──►  fabrica/cobertura.py (CoverageEngine) ──► documentacion/cobertura-<id>.json
        │                                                                   └► admin «Métricas 360»
        │  build.mjs (versión reducida, sin preguntas)
        ▼
docs/datos/perfil-<id>.json ──► web/assets/motores.js (TrainingEngine, módulos, calendario) + plan.js + store.js
```

| Motor | Dónde | Entrada | Salida |
|---|---|---|---|
| OppositionProfile | `catalogo/perfil.py` | ficha, fuentes, banco, exámenes, novedades | `catalogo/perfiles/<id>.json` (schema `opposition-profile/1`) |
| OppositionEngine | `catalogo/construir.py` + `build.mjs` | fichas | catálogo, páginas, datos por oposición |
| OfficialSourceEngine | `ingesta/`, `datos/fuentes-*.json`, `catalogo/validar_catalogo.py` | BOE / DOGC / web del organismo | textos, huellas sha256, citas literales verificadas |
| AlertEngine | `catalogo/vigilar_boe.py`, `catalogo/vigilar_gencat.py`, `perfil.eventos_por_cambio` | sumario BOE, web oficial, perfiles | `novedades.json` con `evento` tipificado |
| ExamEngine | `ingesta/examens_mossos.py`, `test.js` modo `oficial` | PDF oficiales | OFFICIAL_EXAM separado |
| CoverageEngine | `fabrica/cobertura.py` | perfil, texto oficial por artículo, config de la fábrica | necesidades concretas por tema/tipo/dificultad/apartados; bloqueos |
| Publicación | `fabrica/banco.py → Banco.publicar()` | candidata + veredicto del juez | única puerta al banco |
| TrainingEngine | `web/assets/motores.js → TLMotor.hoy()` | stats, ajustes, perfil | TODAY_PLAN |
| StudyPlanEngine | `web/assets/plan.js → TLPlan.generar()` | stats, ajustes | plan semanal/diario |
| SimulationEngine | `build.mjs` (reparto desde el perfil) + `store.js → seleccionSimulacro` | perfil, banco | simulacro con reparto, reserva y sin repetidas |
| Sesiones | `store.js → registrarSesion(…, detalle)` | test.js | sesión tipificada |
| PremiumGate (B1) | `build.mjs → separarPremium` + `supabase/functions/banco` + `store.js → conPremium` | banco, `mi_plan()` o licencia LS | muestra pública de 10 y banco completo solo con Pase (despliegue: `PREMIUM_DEPLOYMENT.md`) |
| Juez v3 (B2) | `fabrica/juez_v2.py` (mecanismo) + `fabrica/politica_juez/juez-sesion-v3.json` | tandas ≤ 10 | veredicto archivado; la puerta lo recalcula (`veredicto_archivado`) |
| Generación controlada | `fabrica/sesion.py plan --temas …` (`slots_desde_cobertura`) → redactor → `validar` → juez → `cerrar` | necesidades del CoverageEngine | lote pequeño publicado por la puerta |
| Métricas por lote | `scripts/metricas_lote.py` + `fabrica/estado/auditoria-lotes.json` | estado, validación, banco, incidencias, auditoría | `metricas-lotes.json`; ante anomalías, GENERATION_PAUSED real |
| PsychotechnicalEngine (B6) | `catalogo/psicotecnicos.json` + `web/assets/psicotecnicos.js` (`TLPsico`) | ejercicios OFFICIAL_EXAM o TESTLEY_GENERATED | práctica, tiempo, errores y progreso, sin nota oficial inventada |
| Fuentes catalanas (B3) | `ingesta/leyes_catalanas.py` → `datos/fuentes-leyes-catalanas.json` | BOE / DOGC / Portal Jurídic | FOUND_OFFICIAL_* / NOT_FOUND / PENDING_REVIEW con versión |

Reglas del modelo: el código no contiene datos de ninguna oposición (test); todo dato oficial lleva cita y procedencia; lo que no tiene fuente verificada queda `OFFICIAL_PENDING_REVIEW` o `BLOCKED`; OFFICIAL_EXAM y TESTLEY_GENERATED son bancos distintos.

## Cómo se añade una oposición
1. Ficha `catalogo/oposiciones/<id>.json` con `oficial.*` citado (valida `validar_catalogo.py`).
2. `preparacion_modulos` (qué módulos aplica y qué datos oficiales los sustentan) y, si hay, `oficial.calendario`.
3. `python3 catalogo/construir.py && node build.mjs` → perfil, páginas, motores.
4. `python3 -m fabrica.cobertura <id>` → necesidades (la generación sigue sujeta a la autorización de la fábrica).
