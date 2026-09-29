# Estado del Growth OS — 29/09/2026 (verificado en esta sesión)

> Va en `documentacion/`, no en `docs/`: `docs/` es la web publicada y `build.mjs` la borra y la regenera en cada build.

**Criterios:**
- **Completado:** código funcionando con tests.
- **Parcial:** funciona, pero le falta una parte.
- **Bloqueado:** el código está listo y probado con MOCK, pero falta una credencial o infraestructura que solo el propietario puede dar.

El % mide el trabajo de código terminado, no el uso en producción.

**Verificación de esta sesión:**
- Tests: 33 de Python, 7 de SQL contra PostgreSQL 16, 14 de JS y 9 de Deno.
- Calidad: lint sin errores, `deno check` de las 4 funciones y build de 11.264 páginas.
- E2E en 375 px y 1280 px, sin errores de JavaScript.
- Publicación: el último commit está desplegado en GitHub Pages y el CI pasa en GitHub.

| Componente | Estado | % | Bloqueo | Siguiente paso |
|---|---|---|---|---|
| Event Bus | Completado | 100 | — | — |
| Growth Orchestrator (reglas) | Completado | 100 | — | Reglas nuevas cuando haya datos de conversión |
| Official Sources Engine | Parcial | 80 | Solo el BOE es accesible desde el entorno de desarrollo; las demás fuentes no se han probado en producción | Ejecutar la ingesta en Actions y revisar `/admin/fuentes/` |
| Conexión ingesta → Growth OS | Completado | 100 | — | — |
| Flujo NUEVA CONVOCATORIA | Completado | 95 | Canales externos sin credencial (se quedan en revisión y en `sin_proveedor`) | Primer caso real: la próxima convocatoria de una oposición del catálogo |
| Vínculo convocatoria ↔ oposición y propuesta de actualización | Completado | 100 | — | Aplicar las propuestas cuando lleguen (revisión humana) |
| Idempotencia y deduplicación | Completado | 100 | — | — |
| Content Factory | Completado | 90 | Redacción con LLM desactivada (`ai_growth`), usa plantillas | Activar `ai_growth` con la clave de Anthropic en GitHub, si se quiere |
| SEO Engine | Completado | 90 | — | Primer artículo aprobado en `/noticias/` |
| Analytics | Bloqueado | 90 | Esquema v4 sin aplicar en Supabase; `flags.analytics` apagado hasta revisar la política de privacidad | Aplicar v4, actualizar la política de privacidad y activar el flag |
| Attribution | Bloqueado | 95 | Igual que Analytics | Igual que Analytics |
| Lead scoring y embudo | Bloqueado | 85 | Esquema v4 | Aplicar v4 |
| Email | Bloqueado | 90 | Falta elegir proveedor; faltan `NOTIF_URL` y `NOTIF_CRON_SECRET` | Elegir Resend, Brevo o Postmark y desplegar `notificar` |
| Telegram | Bloqueado | 90 | Falta crear el bot y configurar `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHANNEL_ID` y `TELEGRAM_WEBHOOK_SECRET` | `documentacion/TELEGRAM.md` |
| Retention | Bloqueado | 85 | Falta `SUPABASE_SERVICE_ROLE_KEY` en Actions, además del esquema v4 y el email | Configurar los secretos |
| Referral | Bloqueado | 90 | Esquema v4 y `flags.referral` apagado | Aplicar v4 y activar el flag |
| Affiliate | Bloqueado | 85 | Esquema v4 y el webhook de Lemon Squeezy (**Lemon Squeezy todavía está en modo prueba**) | Dar de alta el webhook cuando se active la cuenta |
| Pagos en servidor (webhook y `mi_plan`) | Bloqueado | 95 | **Lemon Squeezy en modo prueba**, esquema v4 y despliegue de la función | Se puede probar ya con compras de prueba: desplegar `lemon-webhook` y apuntar el webhook del modo prueba |
| Social Content | Parcial | 70 | No hay ninguna API de redes conectada: publicación manual desde el calendario | Mantener manual. Solo X o Meta con cuenta propia, si se decide |
| Vídeo | Solo diseñado | 30 | Sin proveedor | Guiones listos; falta un adaptador cuando haya cuenta |
| Campaign Engine | Parcial | 70 | Sin Ads conectados; métricas por campaña y por contenido disponibles cuando exista v4 | Registrar el gasto en `crecimiento/privado/ads_gasto.csv` si se hacen anuncios |
| Experiment Engine | Parcial | 75 | `flags.experiments` apagado y ningún experimento activo | Activar `cta-hero` cuando haya tráfico medible |
| Growth Analyst | Completado | 90 | Sin métricas de negocio hasta tener v4 y la clave de servicio | Se genera cada lunes |
| Candidatas al catálogo (a partir de datos oficiales) | Completado | 100 | — | Primera: Policía Local (≈130 convocatorias) |
| Growth Dashboard (`/admin/growth/`) | Completado | 95 | Métricas de negocio solo con v4 y usuario admin | — |
| Content Calendar | Parcial | 80 | Aprobar o reprogramar se hace con la CLI o con el workflow (sin botones en la web) | Pasar la cola a Supabase para aprobar desde la web |
| Job Queue | Completado | 100 | — | — |
| Cron y tareas programadas | Bloqueado (sin verificar) | 90 | **GitHub no ha disparado todavía ninguna ejecución programada** (0 ejecuciones `schedule` en más de 5 h; CI y Pages sí funcionan) | Lanzar a mano «Ingesta de fuentes oficiales» y «Growth OS» (Actions → Run workflow) y comprobar que después se programan solos |
| Cost Tracking | Completado | 100 | — | — |
| Admin (fuentes, growth, trabajos, sistema) | Completado | 95 | — | — |
| Feature flags | Completado | 100 | — | — |
| Vigilancia de leyes → preguntas (LAW_UPDATED) | Completado | 95 | Depende del cron diario de `ingesta.yml` (aún sin ejecuciones programadas) | Revisar en `/admin/oposiciones/<id>/quality/` las preguntas `REVIEW_REQUIRED` cuando llegue el primer cambio |
| Seguridad (RLS, admin, secretos, firma) | Completado | 95 | Límite conocido: los bancos de preguntas son públicos (las preguntas son gratis por artículo por diseño) | — |

## Flujo verificado (`tests/test_flujo_convocatoria.py`)
```
BOE → ingesta (hash, versión) → extracción (cita literal + valor dentro de la cita) → ficha (OFFICIAL_PENDING_REVIEW)
→ vínculo con la oposición del catálogo (catalogo/vinculos.py: misma_convocatoria | nueva_convocatoria | mismo_cuerpo)
→ NEW_CONVOCATION (idempotente) → importancia → reglas
→ update_opposition (propuesta en HUMAN_REVIEW, nunca se aplica sola) · update_seo · generate_content (articulo, faq,
  telegram, email, x, instagram, facebook, tiktok, youtube_short, cta → HUMAN_REVIEW) · notify_followers · analytics_event
→ publicación tras aprobación → UTM por pieza → conversión medida por campaña y por contenido (admin_metricas)
```
