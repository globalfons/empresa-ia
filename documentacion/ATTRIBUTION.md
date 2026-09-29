# Atribución

`web/assets/eventos.js → tocar()` (función pura, probada) guarda en el navegador:
- **first_touch:** primera visita con `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`, `ref` y landing. Si no hay UTM, el dominio que refiere (`utm_medium=referral`).
- **last_touch:** última visita que trae campaña o referente nuevo.
- **conversion_touch:** first y last en el momento del checkout. Se envían a Lemon Squeezy como `checkout[custom][fs|fc|ls|lc|ref|user_id|anon_id]`; el webhook los guarda en `suscripciones.atribucion` y en el evento SUBSCRIPTION_STARTED.

«¿De dónde vino este cliente?» → `suscripciones.atribucion.first` y `admin_metricas().por_canal`.

Todo lo que publica el Growth OS lleva UTM (`utm_source=<canal>&utm_medium=social|email|web&utm_campaign=<campaña>&utm_content=<id del contenido>`), así que el rendimiento de cada pieza se puede medir.
