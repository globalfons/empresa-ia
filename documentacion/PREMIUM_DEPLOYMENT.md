# Despliegue de la protección premium (B1)

Estado: **código listo y probado en el repositorio; despliegue PENDIENTE del propietario**. Mientras `config.json → bancoPrivado` sea `false`,
el contenido premium sigue en `docs/datos/` (público) para no dejar sin servicio a quien ya paga. **Mossos no puede declararse READY hasta completar estos pasos.**

## 0. Qué es contenido premium (auditoría)

| Recurso | ¿Premium? | Motivo |
|---|---|---|
| Preguntas de leyes del BOE (`docs/datos/<ley>.json`, y dentro de cada oposición) | **No** | La página de precios promete «los tests de cada artículo son y seguirán siendo gratis»; cada artículo tiene su test sin bloqueo. Protegerlas sería un cambio de producto (decisión del propietario, no técnica). |
| Exámenes oficiales (`examen-*.json`) | No | Documentos públicos del organismo, acceso libre. |
| Preguntas de la Guia d'estudi de Mossos (`guia-mossos`, sin páginas de artículo) | **Sí** | Solo se pueden practicar dentro de la oposición; sin Pase solo hay 10 de muestra. |
| Funciones premium (simulacro, test completo, plan, tutor, alertas) | Funcionalidad | Se bloquean en el navegador sobre contenido gratuito; el tutor ya comprueba el plan en el servidor. |

Hoy: 41 preguntas de la guía (31 premium + 10 de muestra). Toda pregunta nueva de Mossos que salga de la guía será premium automáticamente.

## Infraestructura existente (auditada)

- `public.suscripciones` (RLS: cada usuario ve las suyas; solo escribe el webhook firmado) y `public.mi_plan()` (security definer; premium si hay suscripción activa, en prueba, `past_due` o cancelada sin vencer).
- `supabase/functions/lemon-webhook` (firma HMAC) y `supabase/functions/tutor` (ya consulta `mi_plan()`).
- El Pase también puede ser una **clave de licencia** de Lemon Squeezy sin cuenta: la función nueva la valida en el servidor.
- `config.json`: `supabaseUrl`, clave publicable (anon), `lsStoreId` 485627, planes free/premium.

## 1. Función que debe desplegarse

`supabase/functions/banco/index.ts` (incluida). Comprueba el entitlement en el servidor (mi_plan con el token del usuario, o licencia de la tienda LS_STORE_ID) y solo entonces lee `public.banco_premium` con la clave de servicio.

## 2. SQL exacto (SQL Editor de Supabase)

```sql
create table if not exists public.banco_premium (clave text primary key check (clave ~ '^[a-z0-9-]{2,60}$'), datos jsonb not null, actualizado timestamptz not null default now());
alter table public.banco_premium enable row level security;
revoke all on public.banco_premium from anon, authenticated;
```
(Es el bloque añadido a `supabase/esquema.sql`; también puede ejecutarse el esquema completo, que es idempotente.)

## 3. Configuración

- `config.json`: `"bancoPrivado": true` (solo **después** de los pasos 4–6).
- Lemon Squeezy: nada nuevo (el webhook ya existe).

## 4. Variables y secretos

| Dónde | Nombre | Valor |
|---|---|---|
| Supabase → Edge Functions → Secrets | `LS_STORE_ID` | `485627` (obligatoria: sin ella no se acepta ninguna licencia) |
| Supabase → Edge Functions → Secrets | `LS_PRODUCT_ID` | opcional, el producto del Pase |
| Supabase → Edge Functions → Secrets | `SITE_ORIGIN` | `https://globalfons.github.io` (o el dominio propio) |
| GitHub → Settings → Secrets → Actions | `SUPABASE_SERVICE_ROLE_KEY` | ya existe para `crecimiento.yml`; los workflows de ingesta y fábrica ahora también lo usan para subir el banco |

`SUPABASE_URL`, `SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY` de la función los inyecta Supabase. **La clave de servicio nunca va al navegador ni al repositorio.**

## 5. Permisos

- `banco_premium`: RLS activa sin políticas + `revoke all` → anon y authenticated (también premium) no pueden leer ni escribir (test SQL `test_banco_premium_inaccesible_salvo_servicio`).
- Función `banco`: desplegada **con** verificación de JWT (por defecto); el navegador envía la clave anónima o el token de sesión.

## 6. Pasos de despliegue

1. Ejecutar el SQL del paso 2.
2. `supabase secrets set LS_STORE_ID=485627 SITE_ORIGIN=https://globalfons.github.io`
3. `supabase functions deploy banco`
4. En local o en Actions: `TL_BANCO_PRIVADO=1 node build.mjs` y `SUPABASE_SERVICE_ROLE_KEY=… python3 scripts/subir_banco.py` (o lanzar el workflow de ingesta tras el paso 5).
5. Cambiar `config.json → "bancoPrivado": true`, commit y push. A partir de aquí cada build (ingesta, crecimiento, fábrica) sube el banco antes de publicar; si falla la subida, el workflow falla.
6. Hacer las pruebas 7–9.

Nota: el historial de git y la caché de GitHub Pages conservan versiones antiguas de `docs/datos/`; lo ya publicado no se puede «despublicar». La protección cubre el contenido desde la activación (incluidas todas las preguntas nuevas).

## 7. Prueba con usuario anónimo

```bash
curl -s -o /dev/null -w "%{http_code}\n" -X POST "$SB/functions/v1/banco" -H "apikey: $ANON" -H "Authorization: Bearer $ANON" -H "Content-Type: application/json" -d '{"clave":"mossos-esquadra"}'
curl -s "$SB/rest/v1/banco_premium?select=clave" -H "apikey: $ANON"
```
Esperado: `401`; la segunda devuelve error de permisos (nunca filas). `docs/datos/mossos-esquadra.json` solo trae 10 preguntas de la guía.

## 8. Prueba con usuario free (cuenta sin suscripción)

Mismo `curl` con `Authorization: Bearer <access_token del usuario free>` → `403`. Con una licencia inventada (`"licencia":"X"`) → `403`.

## 9. Prueba con usuario premium

Con el token de una cuenta con suscripción activa (o `"licencia":"<clave real>"`) → `200` y `{"clave":"mossos-esquadra","qs":[…31 preguntas…]}`. En la web, con el Pase, el test de Mossos muestra las 41 preguntas de la guía.

## 10. Resultado esperado

| Usuario | Recursos públicos | Función banco | Lo que ve |
|---|---|---|---|
| Anónimo | 10 de muestra | 401 | muestra |
| Free | 10 de muestra | 403 | muestra |
| Pase falso en localStorage | 10 de muestra | 403 (el servidor no se fía del navegador) | muestra |
| Premium (suscripción o licencia válida) | 10 de muestra | 200 | banco completo |

Pruebas automáticas que lo demuestran: `tests/js/premium.test.mjs` (build real con bancoPrivado: ningún JSON, HTML ni JS público contiene una pregunta premium; cliente free/falso/premium), `tests/deno/banco_test.ts` (anónimo 401, free 403, premium 200, licencias de otra tienda/caducadas/inventadas 403), `tests/test_sql.py` (RLS).
