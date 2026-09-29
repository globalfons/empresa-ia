# progress.md — TestLey

## Sesión 29/09/2026 (tarde): continuación del Growth OS
Estado detallado por componente: `documentacion/GROWTH-STATUS.md`.

**Verificación:**
- Tests: 33 de Python, 7 de SQL, 14 de JS y 9 de Deno.
- Calidad: lint, `deno check` y build de 11.264 páginas.
- E2E en móvil y escritorio, sin errores de JavaScript.
- Publicación: Pages desplegado con el último commit y CI verde en GitHub.
- Sin secretos en el código.

### COMPLETED (esta sesión)
- **Vínculo convocatoria ↔ oposición** con una sola regla para todo el sistema (`catalogo/vinculos.py`, que usan la vigilancia del BOE y la extracción). Distingue `misma_convocatoria`, `nueva_convocatoria` y `mismo_cuerpo`.
  - Antes, una convocatoria nueva de una oposición del catálogo no se vinculaba.
  - Corregidos 3 falsos positivos: listas de aprobados, pruebas de especialidad de la AEAT y Policía Local de Galicia enlazada a Policía Nacional porque el grupo de vigilancia era demasiado amplio. Las novedades que ya no encajan se retiran.
- **Nueva convocatoria de una oposición del catálogo:**
  - Evento con la relación → regla → acción `update_opposition`.
  - Crea una propuesta de actualización en HUMAN_REVIEW: dato actual frente a nuevo, con citas y URLs, y los pasos a seguir.
  - Se ve en `/admin/growth/` y se gestiona con `crecimiento.cli propuestas | propuesta-aplicada | propuesta-descartada`. Nunca modifica la ficha sola.
- **Deduplicación entre fuentes:** la misma convocatoria llegada desde otra web oficial que cita su BOE se fusiona como `fuentes_adicionales`, sin crear otra ficha, y se muestra en la ficha.
- **Conversión medida por pieza de contenido y por campaña:** `utm_content` y `utm_campaign` llegan del enlace al checkout y al webhook, y se reflejan en `admin_metricas` (`por_contenido`, `por_campana`) y en `/admin/growth/`.
- **Catálogo nacional, candidatas a partir de datos oficiales:** el analista agrupa las convocatorias por tipo de plaza y propone las más repetidas, con sus identificadores del BOE, sin crear páginas: administrativo local (97), Policía Local (64 + 43 agente + 25 oficial), auxiliar administrativo local (58), TAG (41)…
- **Tests nuevos** en `tests/test_flujo_convocatoria.py`: flujo completo, idempotencia, fallo a medias y reintento sin duplicados, fusión entre fuentes y candidatas. También SQL `por_contenido` y el webhook con `utm_content`.

### BLOCKED (nuevo)
- **Lemon Squeezy en modo prueba.** El webhook se puede probar ya con compras de prueba si se despliega `lemon-webhook`.
- **Crons de GitHub Actions:** 0 ejecuciones programadas en más de 5 h, aunque CI y Pages funcionan. Hay que lanzarlos una vez a mano desde Actions → «Run workflow».

### NEXT
1. Primera oposición de la categoría candidata número 1 con datos verificados: «Agente de Policía Local» como oposición tipo que agrupa las convocatorias municipales. Las bases y el temario están en cada BOP, que el entorno de desarrollo no alcanza; se hará desde Actions o con los textos que publica el BOE.
2. Pasar la cola de contenido a Supabase para aprobar desde la web.
3. Justicia e Instituciones Penitenciarias a partir de sus convocatorias en el BOE.

---

Última actualización: 29/09/2026. Verificación ejecutada en esta sesión:
- **Lint:** `npm run lint`, 0 errores.
- **Validadores:** `npm run validar`, 0 errores.
- **Tests:**
  - Python: `npm run test:py`, 28 tests.
  - SQL: `npm run test:sql`, 7 tests contra PostgreSQL 16.
  - JS: `npm run test:js`, 14 tests.
  - Deno: `deno test tests/deno/`, 9 tests.
  - Tipos: `deno check supabase/functions/*/index.ts`.
- **Build:** 11.264 páginas.
- **E2E:** Playwright en móvil (375 px) y escritorio (1280 px): portada, buscador y filtros, ficha, onboarding → primer test, simulacro con comparación, panel, precios y admin. 0 errores de JavaScript.
- **Crawler:** 11.256 páginas, 0 enlaces rotos.

## DONE
- **Auditoría:** `documentacion/TESTLEY-AUDIT.md` y `documentacion/GROWTH-AUDIT.md`.
- **Estados de verificación** comunes (OFFICIAL_VERIFIED … DEPRECATED) en catálogo, convocatorias, preguntas, tutor y web.
- **Ingesta:**
  - versiones de documento con diff y `previous_version_id`;
  - métricas por ejecución;
  - defensa frente a inyección (prompt de sistema, esquema cerrado, valor dentro de la cita);
  - categorización por título y epígrafe;
  - apartados numerados ya no cuentan como plazas;
  - se excluyen los concursos de provisión de puestos (41 fichas reclasificadas);
  - una ficha revisada a mano nunca se sobrescribe (bug corregido: `--rehacer` la pisaba).
- **Catálogo:**
  - 19 categorías (se añaden diputaciones y otros organismos);
  - filtros por administración, estado y estudios;
  - tarjetas con preguntas, fuente y fecha de verificación;
  - categorías «en incorporación»;
  - vínculo convocatoria → oposición (Policía Nacional);
  - bug corregido: el buscador no ocultaba las tarjetas filtradas.
- **Ficha de oposición:** cabecera con estado, última verificación y «Empezar a preparar»; índice de 11 secciones; fechas; legislación; documentación oficial; FAQ solo con datos citados; JSON-LD de FAQPage y BreadcrumbList.
- **Preguntas desfasadas:** `datos/revisar_vigencia.py` las marca DEPRECATED sin borrarlas, la build no las publica y `/admin/system/` las lista.
- **Landing nueva:** «Todas las oposiciones de España, en un solo lugar»; problema, solución, cómo funciona, búsqueda, preparación, IA, alertas, premium, FAQ y CTA final. Páginas nuevas: `/precios/` (desde `config.planes`), `/faq/` y `/leyes/`.
- **Dashboard:** «Tu sesión de hoy» con tareas y minutos, más «Tu semana» (puntos por constancia, precisión y progreso; niveles; objetivo semanal).
- **Onboarding** `/bienvenida/`: 4 preguntas → ajustes → sigue la oposición → primer test. Sin Pase empieza el test de muestra.
- **Simulacros:** comparación con el anterior y con la media.
- **Growth OS:**
  - bus de eventos idempotente;
  - orquestador con reglas configurables;
  - importancia;
  - cola de trabajos con reintentos, dead-letter, `sin_proveedor` y compactación;
  - Content Factory con 12 canales y verificación de datos;
  - SEO Engine con puerta de calidad compartida y `/noticias/`;
  - router de LLM con registro de costes;
  - Growth Analyst;
  - CLI de revisión humana;
  - productores conectados a la ingesta.
- **Supabase v4** (probado en PostgreSQL real):
  - `eventos` y RPC `registrar_evento` (lista blanca, límite, idempotencia);
  - `suscripciones` y `mi_plan()`, el entitlement en servidor;
  - referidos con antifraude y afiliados;
  - `admins`, `admin_metricas`, `admin_leads`;
  - `detectar_inactivos`;
  - `telegram_suscriptores`;
  - consentimiento `marketing`.
- **Edge Functions:**
  - `lemon-webhook`, con firma HMAC;
  - `telegram`, el bot con 9 comandos;
  - `notificar`, ampliada con difusión segmentada y reactivación;
  - `tutor`, que usa el entitlement del servidor.
- **Navegador:** `eventos.js` con consentimiento, atribución first/last/conversion touch, `?ref=`, experimentos y checkout con atribución; plan en el servidor en `store.js`; invitaciones en el panel.
- **Admin:** `/admin/growth/` (métricas por RPC solo para admins, cola, calendario, rechazados, oportunidades, reglas, flags, campañas, experimentos, costes), `/admin/growth/jobs/` y `/admin/system/`.
- **Workflows:** `crecimiento.yml` (cada hora, diario y semanal, con orden manual de revisión) y `ci.yml` (lint, validadores, Python, SQL con PostgreSQL, Deno y build). Concurrencia común con la ingesta.
- **Documentación y configuración:** `.env.example`, `package.json` y los documentos de `documentacion/`: ARCHITECTURE, INGESTION, SOURCES, SECURITY, PRODUCT y los 11 documentos de growth.

## IN PROGRESS
- Contenido para las categorías con más convocatorias y sin ficha preparada, según el informe del analista: ayuntamientos (860), personal laboral (335), universidades (148), diputaciones (108).

## BLOCKED (necesitan acción del propietario; ver `TU-PARTE.md` §9)
- **Premium en servidor en producción:** hay que ejecutar el esquema v4, desplegar `lemon-webhook` y configurar el webhook en Lemon Squeezy.
- **Analítica:** hace falta revisar la política de privacidad y activar `flags.analytics`.
- **Telegram:** hace falta crear el bot, los secretos y el despliegue.
- **Email:** falta elegir proveedor (`EMAIL_PROVIDER`) y el secreto `NOTIF_URL`.
- **Retención y métricas en el informe:** falta el secreto `SUPABASE_SERVICE_ROLE_KEY` en GitHub Actions.
- **Fuentes distintas del BOE:** la red del entorno de desarrollo bloquea `*.gob.es`, guardiacivil.es, etc. Deberían funcionar en Actions; revisar `/admin/fuentes/` tras la primera ejecución.
- **Vídeo y Ads:** no hay cuenta ni API verificada. Solo existen la interfaz y el MOCK.

## NEXT
1. Servir los bancos de preguntas premium desde el servidor (Edge Function + almacenamiento privado) para cerrar el muro de pago. Es el límite de seguridad conocido.
2. Primera oposición de administración local o personal laboral con temario verificado.
3. Enlazar correcciones y modificaciones del BOE con su convocatoria automática (hoy solo para las oposiciones del catálogo).
4. Pasar la cola de contenido a Supabase para aprobar desde `/admin/growth/` sin usar la CLI.
5. Partir `build.mjs` en módulos cuando supere las 1.000 líneas.
