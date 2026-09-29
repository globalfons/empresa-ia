# Ads y campañas

**Interfaz:** `AdsProvider` en `crecimiento/canales.py`.
- Hoy no hay ninguna API de Ads conectada. `AdsManual` lee el gasto de `crecimiento/privado/ads_gasto.csv`, con columnas `fecha,canal,campana,gasto_eur,clics,impresiones`, y ese gasto sirve para calcular el CAC.
- Conectar Google Ads, Meta Ads o TikTok Ads exige cuenta, token de desarrollador y verificación de la API. Hasta entonces no se simula ninguna integración.

**Campañas:** en `crecimiento/campanas.json` (nombre, canal, objetivo, audiencia, fechas, presupuesto, estado, UTM, contenido).
- Canales: SEO, TikTok, Instagram, YouTube, Telegram, Email, Google Ads, Meta Ads, Reddit Ads y Affiliate.
- Métricas por `utm_campaign`.

**Experimentos:** en `crecimiento/experimentos.json` (variantes con peso, estado, objetivo). Se sirven solo los `activo`, y solo con `flags.experiments`.
- La asignación es determinista por dispositivo.
- Métricas: exposición → registro (`admin_metricas().experimentos`).
- Los de precio o plan exigen `autorizado_por`; si falta, la build falla. Nunca se cambian precios automáticamente.

**Reddit:** solo una cola de oportunidades con borrador, para revisión humana (`python3 -m crecimiento.cli reddit …`). No hay publicación automática, ni cuentas, ni DMs.
