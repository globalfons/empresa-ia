# empresa-ia — TestLey

Tests de leyes para oposiciones; cada respuesta se justifica con la cita literal del BOE.
El propietario (particular, sin empresa) solo gestiona cuentas: GitHub Pages, Lemon Squeezy y la difusión en grupos. Claude opera lo demás con las skills `/money-*`.

## Estructura
- `datos/<ley>-articulos.json`: texto consolidado por artículo. Fuente: legalize-es, espejo de datos abiertos del BOE.
- `datos/preguntas-<ley>.json`: preguntas `{art, q, o[4], a, cita}`. La opción correcta puede ir en cualquier posición porque la app baraja las opciones.
- `datos/validar.py`: comprueba que cada `cita` aparece literalmente en su artículo. **Obligatorio que dé 0 errores antes de publicar.**
- `web/assets/`: CSS; `store.js` (progreso local, estadísticas, nota orientativa, cliente REST de Supabase sin librerías y cabecera de cuenta); `test.js` (modos repaso/simulacro/rápido/fallos); `panel.js`, `ranking.js`, `cuenta.js`.
- `supabase/esquema.sql`: tablas `perfiles` y `progreso` con RLS, trigger de perfil y función `ranking(p_ley)`. Si `config.json` no tiene `supabaseUrl`/`supabaseAnonKey`, la web funciona en modo invitado (sin cuentas ni ranking) y nunca muestra datos inventados.
- Pruebas del modo cuentas: `TL_SUPABASE_URL=http://127.0.0.1:8766 TL_OUT=/tmp/... node build.mjs` contra un mock local.
- `web/paginas/`: páginas legales.
- `build.mjs`: genera `docs/` (portada, página resumen de la ley, una página por artículo, Pase, sitemap y llms.txt). **No editar `docs/` a mano.**
- `config.json`: nombre, URL y `checkoutUrl` (enlace de pago de Lemon Squeezy).
- `negocio/`: plan, operación semanal y textos de difusión. `TU-PARTE.md`: tareas del propietario.
- `archivo/viajaia/`: proyecto anterior, archivado.

## Reglas
- Nunca inventar preguntas sin cita verificable. Preguntas de dificultad real de examen, con distractores plausibles.
- No prometer en la web funciones que no existan. Las funciones de pago se marcan como progresivas hasta que existan.
- Antes de hacer push: validar, `node build.mjs`, crawler de enlaces sin roturas, test jugable en 375 px sin errores de JS.
