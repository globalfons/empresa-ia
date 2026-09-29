# Lo que necesito de ti

## 1. Activar la web (2 minutos) — IMPRESCINDIBLE
https://github.com/globalfons/empresa-ia/settings/pages
→ **Source:** Deploy from a branch
→ **Branch:** `main`, carpeta `/docs`
→ **Save**
En 1–3 minutos estará en https://globalfons.github.io/empresa-ia/

## 2. Cuenta de cobro como particular (15 minutos)
1. Crea una cuenta en https://www.lemonsqueezy.com. Elige **Individual / persona física**. Te pedirá identidad y cuenta bancaria o PayPal.
   Lemon Squeezy es el vendedor registrado (merchant of record): factura al cliente y gestiona el IVA, así que no necesitas empresa.
2. Crea un producto:
   - Nombre: **"Pase Opositor"**
   - Precio: **15,99 € al mes**, con 3 días de prueba gratis — HECHO ✅
3. Copia el **enlace de pago (checkout link)** y pégamelo en el chat. Lo pongo en la web y el botón de compra se activa solo.

**Si Lemon Squeezy no acepta particulares de España** cuando te registres: alternativas con el mismo modelo son **Polar.sh** o **Paddle**. Dime cuál y lo adapto.

## 3. Aviso legal — HECHO ✅

## 3b. Activar cuentas y ranking con Supabase — CONECTADO ✅ (comprueba que ejecutaste esquema.sql y desactivaste "Confirm email")
La web ya tiene registro, inicio de sesión, progreso en la nube y ranking programados. Solo falta la base de datos:
1. Crea una cuenta en https://supabase.com y pulsa **New project**. Nombre: `testley`. Región: **West EU (Ireland)** o **Central EU (Frankfurt)**. Guarda la contraseña de la base de datos en un sitio seguro (no me la pases).
2. Ve a **SQL Editor → New query**, pega el contenido entero de `supabase/esquema.sql` y pulsa **Run**.
3. Ve a **Authentication → Sign In / Providers → Email** y desactiva **"Confirm email"**. Así la gente entra al momento; el servidor de correo gratuito de Supabase solo envía unos pocos emails por hora.
4. Ve a **Authentication → URL Configuration** y en **Site URL** pon `https://globalfons.github.io/empresa-ia/`.
5. Ve a **Project Settings → API** y pégame estos dos datos:
   - **Project URL** (algo como `https://abcd.supabase.co`)
   - **anon public key**. Es pública y va en la web, así que se puede compartir. **NO** me pases la `service_role`.

Con eso activo las cuentas y el ranking en 2 minutos.

## 4. Difusión (30 minutos a la semana, cuando puedas)
Publica los textos de `negocio/difusion.md` en 2–3 grupos de Telegram o foros de opositores. Es lo único que acelera las primeras visitas, porque yo no puedo publicar en redes.

## 5. Google Search Console (5 minutos)
https://search.google.com/search-console → añade la URL de la web → envía `sitemap.xml`.

## 6. Activar el tutor IA (opcional, 15 minutos)
El código ya está hecho (`supabase/functions/tutor/index.ts`). Mientras no lo actives, el tutor no aparece en la web.
1. Crea una clave de API en https://console.anthropic.com (tiene coste por uso; el tutor usa por defecto un modelo económico y un límite de 40 consultas al día por usuario). **No me la pases**: va directamente a Supabase.
2. Supabase → **SQL Editor → New query**: pega el bloque «v2 (tutor IA)» del final de `supabase/esquema.sql` y pulsa **Run**.
3. Supabase → **Edge Functions → Deploy a new function → Via editor**: nombre `tutor`, pega el contenido de `supabase/functions/tutor/index.ts` y despliega.
4. Supabase → **Edge Functions → Secrets**: añade `ANTHROPIC_API_KEY` (tu clave), `SITE_URL` = `https://globalfons.github.io/empresa-ia/` y `LS_STORE_ID` = `485627`.
5. Dime «tutor desplegado» y yo pongo su dirección en `config.json` y lo pruebo.

## 7. Motor de ingesta automático (5 minutos)
El motor ya está en el repositorio (`ingesta/`) y un flujo de GitHub Actions lo ejecuta cada día sin intervención de nadie.
1. GitHub → repo empresa-ia → pestaña **Actions** → si pide activarlas, pulsa **Enable**.
2. (Opcional, mejora la extracción) **Settings → Secrets and variables → Actions → New repository secret**: `ANTHROPIC_API_KEY`.
3. Para lanzarlo a mano: Actions → «Ingesta de fuentes oficiales» → **Run workflow**.
Estado de las fuentes: https://globalfons.github.io/empresa-ia/admin/fuentes/

## 8. Avisos por email (cuando elijas proveedor)
1. Supabase → SQL Editor: pega el bloque «v3 (notificaciones)» del final de `supabase/esquema.sql` y pulsa Run.
2. Supabase → Edge Functions → nueva función `notificar` con los ficheros de `supabase/functions/notificar/` (index.ts y plantillas.ts).
3. Secrets de Supabase: `NOTIF_CRON_SECRET` (una contraseña larga inventada), `SITE_URL`, y cuando tengas proveedor: `EMAIL_PROVIDER` (`resend`, `brevo` o `postmark`), `EMAIL_FROM` y su clave (`RESEND_API_KEY`, `BREVO_API_KEY` o `POSTMARK_TOKEN`).
4. GitHub → Secrets de Actions: `NOTIF_URL` (la URL de la función) y `NOTIF_CRON_SECRET` (la misma contraseña).
Hasta que haya proveedor, los avisos se guardan en cola y se envían en cuanto lo configures.

## 9. Growth OS: pagos en servidor, analítica, Telegram y afiliados (activar por partes)
Todo funciona ya sin esto (el orquestador corre en GitHub Actions y deja el contenido en revisión). Cada paso desbloquea una función:
1. **Esquema v4** (5 min): Supabase → SQL Editor → pega `supabase/esquema.sql` entero → Run (se puede repetir sin problema).
2. **Hazte administrador** (1 min): en el SQL Editor, `insert into public.admins select id from auth.users where email = 'TU_EMAIL';` → verás las métricas en `/admin/growth/`.
3. **Webhook de Lemon Squeezy** (10 min): despliega `supabase functions deploy lemon-webhook --no-verify-jwt`; en Lemon Squeezy → Settings → Webhooks → añade la URL de la función, marca los eventos `subscription_*` y `order_created`, copia el «Signing secret» y guárdalo en Supabase → Edge Functions → Secrets como `LEMONSQUEEZY_WEBHOOK_SECRET` (y `LS_STORE_ID=485627`). Así Premium lo decide el servidor.
4. **Secreto del worker** (2 min): en GitHub → Settings → Secrets → Actions añade `SUPABASE_SERVICE_ROLE_KEY` (cópiala tú de Supabase; no me la pases). Activa retención, avisos por Telegram a seguidores e informe con métricas.
5. **Analítica** (cuando revises la política de privacidad): pon `"analytics": true` en `config.json → flags`. Sale un banner de consentimiento.
6. **Telegram** (15 min): sigue `documentacion/TELEGRAM.md` y pon `"telegram": true`.
7. **Invitaciones y afiliados**: `"referral": true` / `"affiliate": true`. Para dar de alta una academia: ver `documentacion/AFFILIATES.md`.
8. **Revisar contenido**: cuando el orquestador genere borradores, los verás en `/admin/growth/`. Para aprobar: GitHub → Actions → «Growth OS» → Run workflow → campo `cli`: `aprobar <ID>` (o pídemelo a mí).
