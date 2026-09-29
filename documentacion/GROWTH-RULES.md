# Reglas de crecimiento (`crecimiento/reglas.json`)

Formato: `{"id", "cuando": <tipo de evento>, "si": {importancia_min, importancia_max, flag, payload{campo: valor|[valores]}}, "entonces": [{accion, …}]}`.

| Regla | Cuando | Si | Entonces |
|---|---|---|---|
| convocatoria-nueva-relevante | NEW_CONVOCATION | importancia ≥ HIGH | SEO, contenido multicanal (AUTO_PUBLISH solo si el dato está verificado), avisos a seguidores, analítica |
| convocatoria-nueva-media | NEW_CONVOCATION | importancia MEDIUM | SEO; borrador de Telegram y CTA para revisión humana |
| convocatoria-nueva-menor | NEW_CONVOCATION | importancia LOW | Solo SEO y analítica (sin difusión: evita spam) |
| cambio-convocatoria | CONVOCATION_UPDATED | ≥ MEDIUM | SEO, avisos a seguidores |
| fecha-examen | EXAM_DATE_CHANGED | CRITICAL | SEO, avisos a seguidores |
| listas-publicadas | OFFICIAL_LIST_PUBLISHED | — | Avisos a seguidores |
| retencion-diaria | RETENTION_SCAN | flag `email` | Reactivación a 5, 14 y 30 días: solo no premium y con consentimiento comercial |
| pregunta-diaria | DAILY_TICK | flag `telegram` | Pregunta del día (contenido verificado) |
| publicar-programado | DAILY_TICK | — | Publica lo aprobado cuya hora ha llegado |
| informe-semanal | WEEKLY_TICK | — | Growth Analyst |

## Importancia
| Nivel | Casos |
|---|---|
| CRITICAL | Cambio de fecha de examen |
| HIGH | Nueva convocatoria de una oposición del catálogo o con ≥ 100 plazas; cambio de plazas o plazo; listas; temario |
| MEDIUM | Convocatoria con 10–99 plazas; otros cambios; fuente caída ≥ 3 veces |
| LOW | Resto |

## Lead scoring
Pesos en `reglas.json → lead_scoring` y en la tabla `lead_pesos`, que deben coincidir:

| Evento | Puntos |
|---|---|
| Visita | 1 |
| Vista de oposición | 2 |
| Test iniciado | 3 |
| Test completado | 5 |
| Registro | 8 |
| Onboarding | 10 |
| Varias sesiones (≥ 3 días) | 15 |
| Muro de pago o checkout | 30 |

`admin_leads()` los calcula (máximo 5 eventos del mismo tipo por lead, en los últimos 30 días). **No se toman decisiones comerciales automáticas por score.**

## Activación
Usuario con cuenta que elige oposición y completa su primer test (el panel lo detecta) → `USER_ACTIVATED`, una sola vez. El embudo `registros → activados` se ve en `/admin/growth/`.
