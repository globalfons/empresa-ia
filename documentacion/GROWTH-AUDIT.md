# TestLey — Auditoría de crecimiento (Growth OS), 29/09/2026

Complementa `TESTLEY-AUDIT.md`. Objetivo: conectar un sistema de crecimiento a la arquitectura existente sin crear otra arquitectura.

## Lo que ya existe y se reutiliza

| Pieza existente | Qué hace hoy | Papel en el Growth OS |
|---|---|---|
| **Motor de ingesta** (`ingesta/`) | Rastrea fuentes oficiales, detecta cambios por hash, extrae datos con cita literal y los valida | **Productor de eventos oficiales**: nueva convocatoria, documento cambiado, fuente caída |
| **Vigilancia del BOE** (`catalogo/vigilar_boe.py`) | Novedades de las oposiciones del catálogo (listas, fechas, modificaciones) | Productor de eventos: fecha de examen, listas, modificaciones |
| **Estados de verificación** (`catalogo/estados_verificacion.json`) | Vocabulario común OFFICIAL_VERIFIED … DEPRECATED | **Puerta de las reglas**: solo lo verificado puede autopublicarse |
| **Notificaciones** (tablas `notif_*` + función `notificar`) | Eventos → abanico a seguidores → cola → proveedor de email intercambiable → log | **Email Engine**: se amplía con una acción de difusión segmentada, en vez de crear otro sistema |
| **GitHub Actions** (`ingesta.yml`, diario) | Worker programado con red abierta y commits auditables | **Cron del orquestador**: se añade `crecimiento.yml` (cada hora, diario y semanal) |
| **Build estático** (`build.mjs`) | Metadatos, canonical, OG, sitemap, JSON-LD, noindex | **SEO Engine**: añade una puerta de calidad y publica los artículos aprobados |
| **Supabase** (Auth + RLS) | Cuentas, progreso, ajustes | Almacén de eventos de producto, suscripciones, referidos, afiliados y métricas protegidas |
| **Lemon Squeezy** | Checkout y clave de licencia validada en el navegador | Se añade un webhook firmado y el derecho de acceso (entitlement) en el servidor |
| **Planes** (`config.json → planes`) | Free/Premium configurables | Se añaden los interruptores de funciones (feature flags) del Growth OS |

## Lo que no existe (verificado)

- **Analítica:** no hay ninguna herramienta (sin gtag, Plausible ni Umami) ni registro de UTM, first/last touch o landing de entrada.
- **Eventos de producto:** no se registran altas, activación, tests, muro de pago ni checkout. Solo existen el progreso y las sesiones de estudio en localStorage y Supabase.
- **Sin bus de eventos común:** cada productor (ingesta, vigilancia) escribe su propio fichero.
- **Sin nada de:**
  - cola de trabajos genérica con reintentos y estado dead-letter;
  - tracking de costes de LLM;
  - router de modelos.
- **Sin estas piezas de crecimiento:**
  - Content Factory;
  - Telegram;
  - referidos;
  - afiliados;
  - campañas;
  - experimentos;
  - lead scoring.
- **Sin `.env.example`.** Variables usadas hoy: `ANTHROPIC_API_KEY`, `ANTHROPIC_BASE_URL`, `INGESTA_MODEL`, más los secretos de las Edge Functions documentados en su cabecera.
- **Sin consentimiento de cookies o almacenamiento para analítica.** Hoy no hace falta porque no hay analítica; con el Growth OS **sí** hace falta.
- **Rutas de admin sin protección:**
  - `/admin/fuentes/` es una página estática `noindex`. Solo muestra datos públicos (estado de fuentes oficiales), así que es aceptable.
  - Las métricas de negocio (ingresos, usuarios) **no pueden** servirse así.

## Restricciones de la arquitectura (y cómo se respetan)

1. **Web estática, sin servidor propio.** Los eventos del navegador van a Supabase por una RPC validada y con límite de frecuencia. Los eventos del sistema se escriben en el propio worker.
2. **Un solo esquema de evento, dos transportes:**
   - fichero JSONL versionado en git, para eventos oficiales generados por el worker de Actions (auditable, sin credenciales);
   - tabla `eventos` de Supabase, para eventos de producto.
   - El orquestador lee ambos con el mismo modelo.
3. **Credenciales:** ninguna integración externa está conectada hoy (Telegram, proveedor de email, vídeo, Ads, Reddit). Todas tienen modo MOCK y quedan en estado `sin_proveedor` hasta que se configure la credencial. No se simula que estén conectadas.
4. **Coste:** reglas deterministas para detectar, clasificar, segmentar y enviar. Un LLM solo para redactar, y solo si hay clave, y siempre con verificación de datos después. Las plantillas deterministas son la opción por defecto, con coste 0.
5. **Políticas de plataforma:**
   - Nada de publicación automática en Reddit, cuentas masivas ni DMs.
   - Todo lo promocional pasa por revisión humana salvo lo que una regla marque explícitamente como AUTO_PUBLISH y cumpla OFFICIAL_VERIFIED.

## Decisiones

- **Rutas SEO adicionales** (`/tests/<op>`, `/requisitos/<op>`, `/temario/<op>`, `/pruebas/<op>`): **no se crean.**
  - Duplicarían secciones de la ficha `/oposiciones/<op>/`, que ya tiene anclas `#requisitos`, `#temario`, `#pruebas` y `#tests`, y crearían contenido fino o duplicado.
  - Se reconsiderará para una oposición cuando una sección tenga contenido propio suficiente (por ejemplo, un temario desarrollado con fuentes).
- **Artículos** (`/noticias/<slug>/`): solo a partir de un evento oficial, con datos citados, aprobados y que pasen la puerta de calidad SEO.
- **Métricas de negocio:** se calculan en Postgres (`admin_metricas()`) y solo las puede leer un usuario de la tabla `admins`. La página `/admin/growth/` estática solo contiene lo no sensible: cola de contenido, trabajos, reglas y flags.
