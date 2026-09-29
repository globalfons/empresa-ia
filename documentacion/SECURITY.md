# Seguridad

| Área | Medida | Verificado |
|---|---|---|
| **Aislamiento multiusuario** | RLS en todas las tablas. `progreso`, `perfiles`, `notif_preferencias` y `suscripciones`: cada usuario ve solo lo suyo. `eventos`, `referidos`, `afiliados`, `admins`, `tutor_uso`, `telegram_suscriptores` y `lead_pesos`: sin acceso directo para `anon`/`authenticated` | `tests/test_sql.py` (PostgreSQL real) |
| **Escritura de eventos desde el navegador** | Solo mediante la RPC `registrar_evento`, que aplica estos controles: <br>• lista blanca de tipos (el navegador no puede emitir `SUBSCRIPTION_*`, referidos ni afiliados); <br>• `user_id` tomado del JWT y nunca del cliente; <br>• tamaño máximo y formato del `anon_id`; <br>• 300 eventos por hora y dispositivo; <br>• claves de idempotencia con espacio de nombres por usuario | `tests/test_sql.py` |
| **Admin** | Las métricas de negocio solo las devuelven `admin_metricas()` y `admin_leads()`, si el usuario está en `admins` o es el servicio. `detectar_inactivos()` es solo para el servicio. Las páginas `/admin/*` son estáticas y `noindex`, sin datos personales ni de negocio | `tests/test_sql.py`, `tests/js/build.test.mjs` |
| **Premium** | Entitlement en el servidor: `mi_plan()` a partir de `suscripciones`, que solo escribe el webhook firmado. El tutor comprueba el plan en el servidor. <br>⚠️ **Límite conocido:** los bancos de preguntas se publican como JSON estático en un repositorio público, así que el muro de pago de los tests se puede saltar. Solución prevista: servir los bancos premium desde una Edge Function y sacarlos del repositorio público | — |
| **Webhook de Lemon Squeezy** | Comprueba la firma HMAC-SHA256 (`X-Signature`) en tiempo constante antes de leer el cuerpo. Filtra la tienda por `LS_STORE_ID`. Es idempotente. `custom_data` se valida (el uuid se comprueba y los textos se acotan) | `tests/deno/lemon_webhook_test.ts` |
| **Telegram** | Cabecera `X-Telegram-Bot-Api-Secret-Token` obligatoria. Solo chats privados. Solo se guarda `chat_id` y las oposiciones elegidas. `/baja` lo desactiva todo | `tests/deno/telegram_test.ts` |
| **Secretos** | Nunca en el código ni en logs (`crecimiento/nucleo.secreto`). Van en los secretos de GitHub o Supabase (`.env.example`). En la web solo está la clave publicable de Supabase | `tests/js/build.test.mjs` |
| **Inyección de instrucciones** | Documentos externos y hechos se pasan como datos delimitados, con un prompt de sistema que prohíbe seguir instrucciones que vengan dentro. Salida con esquema cerrado. Validación literal de cita y valor. Verificación de datos determinista del contenido generado | `tests/test_ingesta.py`, `tests/test_growth.py` |
| **XSS** | Todo texto externo se escapa (`esc()`) en build y en navegador. El markdown de las noticias escapa antes de dar formato. Solo se enlazan URLs `http(s)` | revisión de código |
| **SSRF** | Los crawlers solo visitan dominios registrados y los enlaces que salen de ellos. `robots.txt` respetado. Las funciones solo llaman a `SITE_URL`, Supabase, Lemon Squeezy, Telegram y el proveedor de email | revisión de código |
| **Privacidad** | Analítica propia, sin terceros, con banner de consentimiento (sin él no se envía nada ni se crea identificador) y enlace para revocarla. Las comunicaciones comerciales exigen `marketing = true`; los avisos oficiales, `email_activo`. `crecimiento/privado/` no se sube a git | `tests/js/eventos.test.mjs` |
| **CSRF** | No aplica a la web estática. Las RPC usan el JWT en la cabecera `Authorization`, no cookies | — |

## Pendiente
- Servir el contenido premium desde el servidor (ver arriba).
- Limitar la frecuencia en las Edge Functions (hoy la limitan Supabase y Lemon Squeezy).
- Revisar la política de privacidad pública (`web/paginas/privacidad.html`) para mencionar la analítica propia antes de activar `flags.analytics`.
