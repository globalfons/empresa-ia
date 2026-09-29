# Telegram

- **Bot** (`supabase/functions/telegram`): /start, /oposiciones, /seguir <id>, /test, /alertas, /mioposicion, /pregunta, /baja, /ayuda. Solo chats privados.
- **Canal público:** el orquestador publica ahí el contenido aprobado y la pregunta del día (con flag `telegram`).
- **Avisos personales:** los eventos de una oposición (fecha de examen, listas, cambios) llegan solo a los chats que la siguen (`telegram_suscriptores`). Máximo 25 mensajes por segundo.

## Activación
1. Crea el bot con @BotFather y guarda el token como secreto (`TELEGRAM_BOT_TOKEN`) en Supabase y en GitHub. No lo pegues en un chat.
2. Genera un secreto aleatorio `TELEGRAM_WEBHOOK_SECRET` y guárdalo en Supabase.
3. `supabase functions deploy telegram --no-verify-jwt`.
4. Registra el webhook: `https://api.telegram.org/bot<TOKEN>/setWebhook?url=<URL de la función>&secret_token=<TELEGRAM_WEBHOOK_SECRET>`.
5. (Canal) Crea el canal, añade el bot como administrador y pon `TELEGRAM_CHANNEL_ID` en GitHub.
6. `config.json → flags.telegram = true`. Para autopublicar, `crecimiento.modo_publicacion.telegram = "AUTO_PUBLISH"`; aun así, solo se autopublica lo OFFICIAL_VERIFIED.

Sin token, los trabajos quedan en `sin_proveedor` y se reactivan con `python3 -m crecimiento.cli reactivar telegram`.
