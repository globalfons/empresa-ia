# Content Factory

Un evento → un **contenido maestro** (hechos oficiales estructurados con su fuente) → una variante por canal, adaptada en longitud, tono, estructura y CTA:
- `articulo`, `faq` y `cta` (web);
- `telegram` y `email`;
- `x`, `instagram`, `facebook`, `tiktok` (guion), `youtube_short` y `youtube_descripcion`;
- `anuncio`.

## Objeto de contenido
Campos:
- Identidad: `id`, `type`, `category`, `title`, `body`.
- Origen: `source_event`, `event_type`, `target_audience`, `opposition_id`, `campaign_id`, `source_urls`, `facts`.
- Generación: `generated_by` (plantilla | llm | …+editado), `model`, `confidence`, `cost`, `importance`.
- Estado: `status`, `created_at`, `approved_at`, `scheduled_for`, `published_at`, `updated_at`, `history[]`.

Se guarda en `crecimiento/estado/contenidos/<id>.json`.

## Estados
`DRAFT → AI_REVIEW` (verificación automática) `→ REJECTED | HUMAN_REVIEW | APPROVED → SCHEDULED → PUBLISHED`, y además `ARCHIVED`.
- **AUTO_PUBLISH** exige las cuatro condiciones: regla, canal que lo permita, `config.crecimiento.modo_publicacion[canal] = AUTO_PUBLISH` y dato `OFFICIAL_VERIFIED`.
- Todo lo demás pasa a `HUMAN_REVIEW`.
- Redes sin API conectada: aprobado → programado → «publicar a mano» (se marca `PUBLISHED` con `cli publicado ID URL`).

## Verificación de datos (determinista)
- Cada número del texto tiene que estar en los hechos oficiales (o en la fecha de publicación).
- Enlaces: solo la web de TestLey o la URL oficial de la fuente.
- Prohibido: garantías de aprobar, «100 % aprobados», testimonios, sueldos, «el mejor…».
- Límite de longitud por canal (en X, cada enlace cuenta como 23 caracteres).
- Editar un texto vuelve a pasar la verificación.

## Redacción con IA (opcional)
Con `flags.ai_growth` y una clave, el artículo se redacta con el modelo BALANCED a partir de `<hechos>` (tratados como datos). Si el texto no pasa la verificación, se usa la plantilla. El contenido redactado con IA se etiqueta como `AI_GENERATED` en la web.

## Vídeo
Pipeline `guion → voz → vídeo → subtítulos → miniatura → QA → publicar` con la interfaz `VideoProvider` (`canales.py`).
- Hoy: guiones (tiktok, youtube_short) y proveedor MOCK.
- Adaptadores reales: pendientes de cuenta y de verificar la API del proveedor. No se inventan endpoints.

## Social y calendario
- Categorías: EDUCATIONAL, NEWS, QUIZ, MOTIVATION, CONVOCATION, LEGAL, STUDY_TIPS, PRODUCT, COMMUNITY.
- Calendario: máximo `max_por_canal_y_dia` por canal y día, en dos franjas.
- Se revisa en `/admin/growth/` (Hoy · Mañana · Semana · Mes) y se gestiona con `crecimiento/cli.py` (aprobar, rechazar, editar, reprogramar).
