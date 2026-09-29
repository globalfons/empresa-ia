# Analítica

Propia (Supabase), sin terceros ni publicidad. Se activa con `flags.analytics`, y solo después de aplicar el esquema v4 y de actualizar la política de privacidad.

**Consentimiento:**
- Banner con «Aceptar» y «Rechazar». Sin consentimiento no se envía nada y no se crea identificador.
- «Desactivar analítica» en el pie de página.

## Eventos del navegador (`web/assets/eventos.js` → RPC `registrar_evento`)
| Evento | Cuándo |
|---|---|
| LANDING_VISIT / PAGE_VIEW | Primera página con campaña o referente nuevo / resto |
| SEARCH | Búsqueda (con nº de resultados; las de 0 resultados alimentan las oportunidades) |
| OPPOSITION_VIEW | Ficha de oposición |
| TEST_STARTED / TEST_COMPLETED | Motor de tests |
| SIMULATION_STARTED / SIMULATION_COMPLETED | Simulacros |
| PAYWALL_REACHED | Menú de muestra de una ley u oposición de pago |
| ONBOARDING_COMPLETED | Fin de `/bienvenida/` |
| USER_REGISTERED / USER_ACTIVATED | Alta / activación (una vez) |
| CHECKOUT_STARTED | Clic en el checkout |
| EXPERIMENT_EXPOSURE | Variante mostrada |

**Eventos del servidor** (solo el webhook): SUBSCRIPTION_STARTED, _RENEWED, _CANCELLED, _EXPIRED, PAYMENT_FAILED, REFERRAL_CONVERTED, AFFILIATE_CONVERSION. **Del worker:** USER_INACTIVE.

## Dashboard (`/admin/growth/`, RPC `admin_metricas`, solo admins)
- Embudo: visitas → registros → activados → muro de pago → checkout → premium, con conversión por paso.
- Negocio: MRR (importe del último cobro de cada suscripción activa), suscripciones activas, retención semanal.
- LTV: solo con ≥ 20 bajas.
- Canales: first touch.
- Top landings, top oposiciones, búsquedas sin resultado, afiliados, referidos y experimentos.

**CAC:** gasto importado (`crecimiento/privado/ads_gasto.csv`) / nuevos premium del canal, calculado cuando hay datos. **No se muestran cifras inventadas:** sin datos, «—».

Para ser administrador: `insert into public.admins values ('<tu user_id>');` en el SQL editor de Supabase.
