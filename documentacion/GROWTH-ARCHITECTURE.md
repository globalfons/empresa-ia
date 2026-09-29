# Growth OS — arquitectura

Integrado en la arquitectura existente (Python en GitHub Actions + Supabase + web estática). Sin microservicios ni sistemas duplicados.

```
FUENTES OFICIALES → ingesta/ (motor existente) ─┐
NAVEGADOR (web/assets/eventos.js) → RPC registrar_evento → public.eventos ─┤
LEMON SQUEEZY → función lemon-webhook (firma) → suscripciones + eventos ─┤
                                                                          ▼
                        crecimiento/productores.py  →  BUS DE EVENTOS (crecimiento/eventos.py; esquema único, idempotente)
                                                                          ▼
                        GROWTH ORCHESTRATOR (crecimiento/orquestador.py): importancia → reglas (crecimiento/reglas.json)
                                                                          ▼
                        JOB QUEUE (crecimiento/jobs.py): reintentos, espera exponencial, dead-letter, sin_proveedor
                                                                          ▼
     update_seo · generate_content (Content Factory) · notify_followers · publish_scheduled · daily_question
     reactivation_email · analytics_event · growth_report (Growth Analyst)
                                                                          ▼
     web (build.mjs: fichas, /noticias/, /admin/*) · Telegram (Bot API) · Email (función notificar) · redes (manual)
```

## Piezas
| Pieza | Fichero | Notas |
|---|---|---|
| Event Bus | `crecimiento/eventos.py`, tabla `eventos` | `{id, type, timestamp, source, entity_type, entity_id, payload, metadata, correlation_id, idempotency_key}` |
| Orquestador y reglas | `crecimiento/orquestador.py`, `reglas.json` | Reglas configurables WHEN/IF/THEN. Cada acción hereda el `correlation_id` |
| Importancia | `crecimiento/importancia.py` | LOW/MEDIUM/HIGH/CRITICAL, sin LLM |
| Cola de trabajos | `crecimiento/jobs.py` → `estado/jobs.json` | `started_at`, `finished_at`, `status`, `error`, `retries`, `provider`, `cost`, `event_id` |
| Content Factory | `crecimiento/contenido.py` | Plantillas por canal y verificación de datos (ver `CONTENT-ENGINE.md`) |
| SEO Engine | `crecimiento/seo.py`, `build.mjs`, `catalogo/seo_calidad.json` | Ver `SEO-ENGINE.md` |
| Canales | `crecimiento/canales.py`, `supabase/functions/{telegram,notificar}` | Proveedores intercambiables, modo MOCK, `sin_proveedor` |
| LLM | `crecimiento/llm.py` | Router FAST/BALANCED/ADVANCED, coste en `estado/costes.jsonl` |
| Analista | `crecimiento/analista.py` | Informe semanal y oportunidades. **Propone, no ejecuta** |
| Revisión humana | `crecimiento/cli.py`, workflow «Growth OS» (input `cli`) | aprobar, rechazar, editar, reprogramar, archivar, reintentar, cancelar |
| Admin | `/admin/growth/`, `/admin/growth/jobs/`, `/admin/system/` | Estáticas y sin datos sensibles. Métricas de negocio por RPC solo para admins |

## Almacenes
- **`crecimiento/estado/`** (git, público): eventos del sistema, trabajos, contenidos, costes, ciclos y el informe operativo. **Sin datos personales.**
- **`crecimiento/privado/`** (no se sube): informes con métricas de negocio y gasto en Ads.
- **Supabase:** eventos de producto, suscripciones, referidos, afiliados, preferencias, suscriptores de Telegram.

## Planificación (`.github/workflows/crecimiento.yml`)
| Frecuencia | Qué hace |
|---|---|
| Cada hora | Productores y orquestador (eventos urgentes) |
| Diario 06:40 UTC | `DAILY_TICK` (pregunta del día, publicar lo programado) y `RETENTION_SCAN` (reactivación) |
| Lunes 07:25 UTC | `WEEKLY_TICK` (informe de crecimiento) |

La ingesta sigue en `ingesta.yml` (diario 05:17 UTC). Los dos workflows comparten el grupo de concurrencia `escritura-repo`.

## Feature flags (`config.json → flags`)
`growth_engine`, `seo_engine`, `social_content`, `telegram`, `email`, `analytics`, `referral`, `affiliate`, `ai_growth`, `ads`, `experiments`.

Hoy están encendidos `growth_engine`, `seo_engine` y `social_content`; el resto está apagado hasta que exista su requisito (ver `progress.md`).

## Qué NO hace (a propósito)
- Publicar en Reddit, crear cuentas o enviar DMs.
- Cambiar precios o experimentos de precio sin `autorizado_por`.
- Autopublicar datos oficiales que no estén `OFFICIAL_VERIFIED`.
- Enviar comunicaciones comerciales sin consentimiento.
