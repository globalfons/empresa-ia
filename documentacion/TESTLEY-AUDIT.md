# TestLey — Auditoría técnica (29/09/2026)

Auditoría del repositorio `globalfons/empresa-ia` (rama `main`, 45 commits) antes de la fase de evolución a SaaS.
Todo lo que sigue sale de leer el código y de ejecutar los validadores, la build y los scripts de QA.

> **Nota sobre la ubicación:** `docs/` es la carpeta que publica GitHub Pages y `build.mjs` la borra y la regenera en cada build.
> Por eso la documentación del proyecto está en `documentacion/`. Si estuviera en `docs/`, se perdería en cada build y quedaría publicada en la web.

## 1. Arquitectura actual

```
datos/ (leyes + preguntas)   catalogo/ (oposiciones revisadas, convocatorias automáticas, fuentes literales)
          │                              ▲
          │                    ingesta/ (motor: fuentes → rastreo → descarga → cambios → parseo → extracción → validación)
          ▼                              │   ejecutado a diario por .github/workflows/ingesta.yml
   build.mjs (generador estático) ──► docs/ ──► GitHub Pages (≈11.300 páginas)
                                                  │ navegador: web/assets/*.js
                                                  ▼
                           Supabase (Auth + Postgres con RLS + Edge Functions tutor/notificar)
                           Lemon Squeezy (suscripción + claves de licencia)
```

| Capa | Tecnología | Estado |
|---|---|---|
| Web pública y app | HTML estático generado por `build.mjs` (Node 22, sin dependencias) + JS vanilla ES5 en `web/assets/` | Funciona; 0 enlaces rotos (crawler Playwright) |
| Datos | Ficheros JSON versionados en git (`datos/`, `catalogo/`, `ingesta/estado/`) | Funciona; trazable por historial de git |
| Cuentas | Supabase Auth por API REST (`store.js`, sin librerías) | Funciona (probado contra mock local) |
| Progreso | Tabla `progreso` (RLS por `user_id`) + localStorage | Funciona |
| Pagos | Lemon Squeezy: checkout + clave de licencia validada en el navegador | Funciona, **pero la comprobación solo se hace en el navegador** (ver riesgos) |
| IA | Edge Function `tutor` (Anthropic API; respuestas ancladas al texto oficial) | Código probado con Deno y mocks; **no desplegado** (`tutorUrl` vacío) |
| Ingesta | Python 3 (stdlib + pypdf opcional) + Playwright (Node) para webs dinámicas | BOE funcionando (1.835 documentos); otras fuentes bloqueadas por la red del sandbox |
| Notificaciones | Tablas v3 + Edge Function `notificar` con adaptador de proveedor | Código probado con mocks; sin proveedor de email configurado |

**Stack:** Node 22 (build), Python 3.11 (datos, catálogo, ingesta), Deno (Edge Functions), Supabase y GitHub Actions.
No hay `package.json`, framework ni bundler; se decidió así para que el coste sea 0 y el SEO sea máximo. **Se mantiene**: reescribir en Next.js no aporta nada a los criterios de éxito y rompería ≈11.000 URLs ya indexables.

## 2. Inventario

### Frontend (`web/assets/`)
- `store.js` (373 líneas): progreso local, estadísticas, nota orientativa, racha, logros, cliente REST de Supabase, ajustes, favoritos, seguimiento, Pase (Lemon Squeezy) y planes (`puede()`).
- `test.js`: motor de tests con estos modos:
  - repaso, simulacro, rápido, fallos, test a medida (tema, nº de preguntas, nuevas, falladas, difíciles, favoritas, dificultad) y examen;
  - temporizador, penalización configurable por oposición y análisis final.
- `panel.js` (dashboard) y `plan.js` (plan adaptativo determinista).
- `avisos.js`, `tutor.js`, `pase.js`, `ranking.js`, `cuenta.js`, `buscador.js`, `oposicion.js` y `admin.js`.

### Páginas generadas
- **Públicas:**
  - portada y `/oposiciones/` (buscador + 17 categorías);
  - `/oposiciones/<id>/` (6 fichas) y `/oposiciones/categoria/<id>/`;
  - `/convocatorias/` (1.833) y `/convocatorias/<id>/`;
  - hub de cada ley (50) y una página por artículo (≈9.000);
  - `/pase/`, `/ranking/` y las páginas legales.
- **Privadas (noindex):** `/panel/`, `/cuenta/`, `/admin/fuentes/`.

### Backend
- **`supabase/esquema.sql`:**
  - `perfiles`, `progreso` (RLS), trigger de perfil y RPC `ranking`;
  - v2 `tutor_uso` (solo servicio);
  - v3 `notif_*`.
- **Funciones:** `supabase/functions/tutor` y `supabase/functions/notificar`.

### Datos
- 50 normas con texto consolidado.
- 1.886 preguntas: cada una con una cita literal validada (`datos/validar.py`); las nuevas llevan `dif` y `exp`.
- 6 oposiciones revisadas: cada dato oficial con cita literal validada contra la fuente guardada (`catalogo/validar_catalogo.py`).
- 1.833 convocatorias automáticas, con procedencia por dato.

### Ingesta
- `ingesta/fuentes.json` registra 10 fuentes: BOE, PAG, Policía Nacional, Guardia Civil, Defensa, Justicia, BOCM, gencat, BOJA y local.
- Crawlers `boe_api`/`http`/`playwright`; parsers html/pdf/json/xml/csv.
- Detección de cambios por SHA-256; política de fallos con reintentos y backoff.
- Extracción por reglas y por Claude, con validación de cita literal.

### Tests existentes
**No hay suite automatizada.** La calidad descansa en:
- los validadores de datos (`validar.py`, `validar_catalogo.py`, `validar_todo.py`), que son obligatorios antes de publicar;
- scripts de QA con Playwright en el scratchpad (fuera del repositorio);
- pruebas manuales con Deno y mocks de las Edge Functions.

### Documentación
`ARQUITECTURA.md`, `CLAUDE.md`, `TU-PARTE.md`, `ingesta/README.md` y `negocio/*.md`.

## 3. Funcionalidades: estado real

| Área | Estado | Comentario |
|---|---|---|
| Catálogo de oposiciones data-driven | ✅ | Añadir una oposición = añadir un JSON; el frontend no cambia |
| Convocatorias separadas de oposiciones | ✅ parcial | Dos niveles, pero **sin vínculo** convocatoria → oposición (`oposicion_id`) |
| Trazabilidad por dato | ✅ | Cita literal + URL + fechas + confianza + método |
| Estados de verificación | ⚠️ | Ad hoc (`cita_verificada_automaticamente`, `pendientes[]`, etiquetas en la web). **No existe el vocabulario común** OFFICIAL_VERIFIED / … / DEPRECATED |
| Buscador y filtros | ⚠️ | Texto + categoría. **Faltan** filtros por administración, territorio, estado y nivel de estudios |
| Tarjetas de oposición | ⚠️ | No muestran nº de preguntas, última actualización ni fuente |
| Ficha de oposición | ✅ parcial | Buena en datos oficiales. **Faltan** CTA principal en cabecera, «Última verificación», FAQ y datos estructurados de FAQ y migas |
| Tests | ✅ | Por oposición, tema, dificultad, aleatorio, fallos, favoritas, examen, entrenamiento, nº de preguntas, tiempo y penalización |
| Simulacros | ✅ parcial | Temporizador, penalización, sin responder, análisis. **Falta** la comparación con simulacros anteriores en el resultado |
| Dashboard | ⚠️ | Rico, pero empieza por la nota y las gráficas. **No responde «¿qué hago hoy?»** arriba del todo |
| Onboarding | ❌ | Tras registrarse se va al panel; las preguntas (oposición, fecha, horas, nivel) están escondidas en «ajustes» |
| Plan adaptativo | ✅ | Determinista y explicable; se recalcula con cada visita |
| Tutor IA | ✅ código / ❌ despliegue | Separa oficial e IA; falta desplegar la función y rellenar `tutorUrl` |
| Seguimiento y alertas | ✅ parcial | In-app (campana + panel) funcionando. Email: arquitectura lista, sin proveedor |
| Gamificación | ⚠️ | Racha, logros y ranking. **Faltan** puntos, niveles y objetivo semanal ligados a constancia y precisión |
| Premium | ⚠️ | Planes configurables en `config.json`. **Sin webhook ni comprobación en servidor** |
| Landing | ⚠️ | Centrada en «tests citados del BOE», no en la promesa «todas las oposiciones en un solo lugar». Sin página de precios ni FAQ propias |
| SEO | ✅ parcial | Canonical, OG, sitemap, robots, llms.txt, schema Quiz/Course. **Faltan** BreadcrumbList, FAQPage y `lastmod` real por página. **Riesgo:** convocatorias sin datos indexadas (páginas «vacías») |
| Admin | ⚠️ | Solo `/admin/fuentes/` (estado de fuentes, cambios, errores, documentos). **Faltan** dashboard, métricas, revisión de calidad, preguntas y validaciones |
| Observabilidad | ⚠️ | Log JSONL por día + estado por fuente. **Faltan** métricas agregadas por ejecución (duración, cambios, pendientes de revisión, fallos de extracción) |
| Versionado de documentos | ⚠️ | Hash por documento y registro de cambios, pero **no se guarda la versión anterior** (`document_version`, `previous_version_id`) ni un diff |

## 4. Problemas encontrados (verificados)

1. **Premium solo se comprueba en el navegador.**
   - La clave de licencia se guarda en `localStorage` como `{ok:true}`, así que cualquiera puede escribir ese valor a mano.
   - Además, todas las preguntas se publican en `docs/datos/*.json` y el repositorio es público, así que el contenido premium no está protegido.
   - Hoy es un «muro de honor». Solo lo resuelve servir el contenido premium desde el servidor (ver recomendaciones).
2. **No hay webhook de Lemon Squeezy.**
   - Las cancelaciones se detectan solo al revalidar la clave en el navegador cada 24 h.
   - No hay registro en la base de datos de quién es suscriptor.
3. **Inyección de instrucciones en la extracción con Claude.**
   - El texto del documento externo va en el mismo mensaje que las instrucciones, sin prompt de sistema que lo declare como datos no fiables.
   - La validación de cita literal limita el daño, pero **no** comprueba que el valor numérico aparezca en la cita. Un documento malicioso podría inducir «plazas: 9999» con una cita real.
4. **Categorización automática errónea.**
   - Ejemplo: BOE-A-2026-20027 (orquesta del Consorcio de Santiago, epígrafe «Personal laboral») sale como `hacienda`, porque la regla mira el departamento del BOE antes que el epígrafe.
5. **Datos automáticos de poco valor.**
   - `plazo_solicitudes = "Ver texto oficial"` se guarda con una cita que habla de requisitos, no del plazo.
   - Territorio «España» para organismos locales sin ayuntamiento en el título.
6. **Páginas débiles indexables.** Las convocatorias sin ningún dato extraído se indexan igual que las completas.
7. **`lastmod` idéntico** (`config.updated`) en las ≈11.300 URLs del sitemap.
8. **No hay tests automatizados ni `npm test`.** Los scripts de QA viven fuera del repositorio.
9. **Documentación dispersa** (`ARQUITECTURA.md` en la raíz (movido a `documentacion/ARCHITECTURE.md`), `ingesta/README.md`, `CLAUDE.md`), sin documento de seguridad ni de producto.

## 5. Deuda técnica

- `build.mjs` es un único fichero de 545 líneas con plantillas en línea. Es aceptable para el tamaño actual, pero el siguiente crecimiento debería partirlo en módulos (`build/paginas/*.mjs`).
- El JS del navegador expone funciones globales (`window.TL`) y la lógica pura (puntuación, entitlements) no se puede probar en Node sin DOM.
- Los ajustes del usuario se guardan en una fila especial `progreso.ley = "ajustes-usuario"`. Funciona con las RLS existentes, pero una tabla `ajustes` sería más limpia.
- Estado de la ingesta en ficheros JSON: correcto hasta decenas de miles de documentos. El esquema está pensado para migrar a Postgres.

## 6. Riesgos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Contenido premium accesible sin pagar | Ingresos | Webhook + entitlement en servidor (fase J); a medio plazo, servir los bancos de preguntas premium desde una Edge Function y sacarlos del repositorio público |
| Fuentes distintas del BOE no probadas en producción | Cobertura | El workflow de Actions tiene red abierta; revisar el panel de fuentes tras la primera ejecución |
| Datos automáticos erróneos presentados como oficiales | Confianza | Estado `OFFICIAL_PENDING_REVIEW` visible, validación literal y comprobación número↔cita |
| Inyección de instrucciones vía documentos | Integridad | Prompt de sistema, documento delimitado como datos no fiables, esquema cerrado y valor contenido en la cita |
| Cambio de ley que deja preguntas desfasadas | Calidad | Estado `DEPRECATED` automático cuando la cita ya no está en el texto vigente, y exclusión en la build |
| Tamaño del repo (`docs/` ≈150 MB) | Operación | Aceptable para Pages (<1 GB). Vigilar; opción futura: publicar con Actions artifact en vez de commitear `docs/` |

## 7. Recomendaciones y plan por fases

Se conserva la arquitectura (estático + Supabase + Actions) y se corrige y amplía por fases:

| Fase | Trabajo |
|---|---|
| A | Esta auditoría + `progress.md` |
| B | Suite de tests (`npm test`: Python unittest + `node:test`), comprobación de sintaxis como lint, vocabulario de estados de verificación común para catálogo, convocatorias, preguntas y tutor |
| C | Categorías que faltan (diputaciones, empresas públicas, otros organismos), filtros (administración, territorio, estado, estudios), tarjetas con preguntas, actualización y fuente, vínculo convocatoria → oposición |
| D | Motor: versiones de documento (`document_version`, `previous_version_id`, diff), métricas por ejecución, defensa frente a inyección, categorización por epígrafe, descarte de datos vacíos |
| E | Ficha: cabecera con CTA y última verificación, índice de secciones, FAQ con datos citados y JSON-LD |
| F | Simulacros: comparación con anteriores |
| G | Dashboard «Tu sesión de hoy», onboarding de 4 preguntas |
| H | Gamificación: puntos por constancia, precisión y progreso, niveles y objetivo semanal |
| I | Alertas: evento automático cuando cambia un documento seguido |
| J | Webhook de Lemon Squeezy con firma HMAC, tabla `suscripciones`, RPC `mi_suscripcion()` y entitlement en servidor |
| K | SEO: BreadcrumbList, FAQPage, `lastmod` real, noindex en convocatorias sin datos |
| L | Admin: dashboard con métricas, salud de fuentes, calidad (pendientes de revisión, preguntas desfasadas) |
| M | QA: tests, build, crawler, 375 px, docs |

El avance real de cada fase se registra en `progress.md`.
