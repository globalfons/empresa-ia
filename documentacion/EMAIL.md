# Email

Un único servicio: la función `supabase/functions/notificar`. Proveedor intercambiable con `EMAIL_PROVIDER` = none | resend | brevo | postmark.

| Acción | Destinatarios | Requisito |
|---|---|---|
| `ciclo` (avisos oficiales) | Quien sigue la oposición | `email_activo` y tipo de aviso elegido |
| `difusion` (contenido aprobado del Growth OS) | Seguidores de la oposición del segmento; al resto, solo con `marketing` | Contenido aprobado y verificado |
| `reactivacion` (5/14/30 días) | Usuarios inactivos, no premium | `email_activo` y `marketing` |

- Plantillas en `plantillas.ts`: aviso, resumen diario/semanal, difusión, reactivación. Todas con pie de baja.
- Recibos y emails de suscripción: los envía Lemon Squeezy (vendedor registrado).
- Emails de acceso y contraseña: Supabase Auth.
- Estados de la cola `notif_cola`: pendiente → enviado | fallido (hasta 5 intentos) | sin_proveedor | omitido.
- Registro en `notif_log`.
