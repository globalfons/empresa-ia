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
   - Nombre: **"Pase Opositor — 12 meses"**
   - Precio: **19 €**
   - Tipo: pago único (o suscripción anual si lo prefieres)
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
