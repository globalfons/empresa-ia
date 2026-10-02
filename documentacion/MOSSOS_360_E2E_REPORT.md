# Mossos 360 · informe E2E (F21)

Fecha: 2026-10-02. Script: `scripts/e2e-mossos360.cjs` (Playwright, Chromium), contra `docs/` servido en local; Supabase, Lemon Squeezy y analítica bloqueados.

Errores de JavaScript: 0.

## móvil · 21/21

| Paso | Resultado | Detalle |
|---|---|---|
| 01 HOME | OK |  |
| 02 CATÁLOGO enlaza Mossos | OK |  |
| 03 FICHA · datos oficiales y calendario | OK |  |
| 04 FICHA · fuente oficial citada (DOGC) | OK |  |
| 05 FICHA · CTA «Preparar Mossos» | OK |  |
| 06 SEGUIR Mossos d'Esquadra 46/26 | OK |  |
| 07 TEMARIO · 21 temas | OK |  |
| 08 TEMA · estudiar con fuente oficial | OK |  |
| 09 TEST DEL TEMA → resultado | OK |  |
| 10 MIS ERRORES | OK |  |
| 11 REPASO arranca | OK |  |
| 12 SIMULACRO (30 preguntas, 35 min) → resultado | OK |  |
| 13 SESIÓN registrada con tipo SIMULATION y oposición | OK | ["CUSTOM","SIMULATION"] |
| 14 EXAMEN OFICIAL → resultado | OK |  |
| 15 EXAMEN OFICIAL separado (sesión OFFICIAL_EXAM) | OK |  |
| 16 PANEL · «Qué debo estudiar hoy» con minutos | OK |  |
| 17 MÓDULO no medible · checklist persiste (sin nota) | OK |  |
| 18 REGISTRO MANUAL anotado | OK |  |
| 19 CALENDARIO · próximas fechas oficial/previsión | OK |  |
| 19b AVISOS tipificados de la convocatoria seguida | OK |  |
| 20 ADMIN · métricas 360 | OK |  |

## escritorio · 21/21

| Paso | Resultado | Detalle |
|---|---|---|
| 01 HOME | OK |  |
| 02 CATÁLOGO enlaza Mossos | OK |  |
| 03 FICHA · datos oficiales y calendario | OK |  |
| 04 FICHA · fuente oficial citada (DOGC) | OK |  |
| 05 FICHA · CTA «Preparar Mossos» | OK |  |
| 06 SEGUIR Mossos d'Esquadra 46/26 | OK |  |
| 07 TEMARIO · 21 temas | OK |  |
| 08 TEMA · estudiar con fuente oficial | OK |  |
| 09 TEST DEL TEMA → resultado | OK |  |
| 10 MIS ERRORES | OK |  |
| 11 REPASO arranca | OK |  |
| 12 SIMULACRO (30 preguntas, 35 min) → resultado | OK |  |
| 13 SESIÓN registrada con tipo SIMULATION y oposición | OK | ["CUSTOM","SIMULATION"] |
| 14 EXAMEN OFICIAL → resultado | OK |  |
| 15 EXAMEN OFICIAL separado (sesión OFFICIAL_EXAM) | OK |  |
| 16 PANEL · «Qué debo estudiar hoy» con minutos | OK |  |
| 17 MÓDULO no medible · checklist persiste (sin nota) | OK |  |
| 18 REGISTRO MANUAL anotado | OK |  |
| 19 CALENDARIO · próximas fechas oficial/previsión | OK |  |
| 19b AVISOS tipificados de la convocatoria seguida | OK |  |
| 20 ADMIN · métricas 360 | OK |  |

## Regresión: E2E de las 7 oposiciones (`scripts/e2e-oposiciones.cjs`)

| Vista | Oposición | OK |
|---|---|---|
| móvil | guardia-civil-cabos-guardias | 6/6 |
| móvil | policia-nacional-escala-basica | 14/14 |
| móvil | age-administrativo-c1 | 14/14 |
| móvil | age-auxiliar-administrativo-c2 | 14/14 |
| móvil | mossos-esquadra | 17/17 |
| móvil | age-gestion-a2 | 14/14 |
| móvil | policia-nacional-escala-ejecutiva | 14/14 |
| escritorio | guardia-civil-cabos-guardias | 6/6 |
| escritorio | policia-nacional-escala-basica | 14/14 |
| escritorio | age-administrativo-c1 | 14/14 |
| escritorio | age-auxiliar-administrativo-c2 | 14/14 |
| escritorio | mossos-esquadra | 17/17 |
| escritorio | age-gestion-a2 | 14/14 |
| escritorio | policia-nacional-escala-ejecutiva | 14/14 |

Errores JS: 0. Usuario gratuito ve la muestra: True.

Correcciones hechas por el E2E: el panel se ensanchaba a 552 px en móvil (columna `1fr` sin `minmax(0, …)` y filas del calendario sin salto de línea).
