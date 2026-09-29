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
- `catalogo/`: oposiciones con su temario oficial (`construir.py` a partir de la convocatoria guardada en `catalogo/fuentes/`), `normas.json` con la cola de prioridad, y `validar_catalogo.py`. Una ley cuenta como publicada en cuanto existe `datos/preguntas-<slug>.json`; tras añadirla, ejecutar `construir.py` para recalcular la cobertura y luego `node build.mjs`. Validar todo con `datos/validar_todo.py`. Para añadir una ley nueva: `sh datos/descargar_boe.sh <BOE-ID> <slug>` (descarga del espejo legalize-es y trocea con `datos/parse_boe.py`), añadirla a `catalogo/normas_base.json` y escribir sus preguntas. Temas sin texto consolidado en el BOE (Tratados de la UE, RD 208/1996 de atención al ciudadano) quedan fuera por no poder verificarse.
- Oposiciones en la web: `/oposiciones/` (directorio) y `/oposiciones/<id>/` (temario, cobertura, test combinado `datos/<id>.json`, botón "Preparar esta oposición"). El progreso de cada pregunta se guarda por ley; las sesiones y el ranking, por contexto (id de la oposición o slug de la ley). `panel/?c=` y `ranking/?c=` seleccionan el contexto.
- `web/paginas/`: páginas legales.
- `build.mjs`: genera `docs/` (portada, página resumen de la ley, una página por artículo, Pase, sitemap y llms.txt). **No editar `docs/` a mano.**
- `config.json`: nombre, URL y `checkoutUrl` (enlace de pago de Lemon Squeezy).
- `negocio/`: plan, operación semanal y textos de difusión. `TU-PARTE.md`: tareas del propietario.
- `archivo/viajaia/`: proyecto anterior, archivado.

## Reglas
- Nunca inventar preguntas sin cita verificable. Preguntas de dificultad real de examen, con distractores plausibles.
- No prometer en la web funciones que no existan. Las funciones de pago se marcan como progresivas hasta que existan.
- Antes de hacer push: validar, `node build.mjs`, crawler de enlaces sin roturas, test jugable en 375 px sin errores de JS.
- Pase Opositor: suscripción de Lemon Squeezy (`checkoutUrl` en `config.json`). Sin Pase, la Ley 39/2015 y los tests por artículo son completos y el resto de leyes y oposiciones solo ofrecen 10 preguntas de muestra (`web/assets/test.js`). La clave de licencia se valida en el navegador contra `api.lemonsqueezy.com/v1/licenses/validate` (`store.js`, `pase.js`) y se revalida cada 24 h; `lsStoreId`/`lsProductId` en `config.json` restringen las claves a nuestra tienda.

- Catálogo: una oposición por fichero en `catalogo/oposiciones/<id>.json` con datos oficiales citados literalmente (ver `documentacion/ARCHITECTURE.md`). Validar con `python3 catalogo/validar_catalogo.py`, después `python3 catalogo/construir.py` y `node build.mjs`. Nunca añadir un dato oficial sin su cita y su fuente guardada en `catalogo/fuentes/`.
- Alertas: `python3 catalogo/vigilar_boe.py` (rutina diaria) guarda en `catalogo/novedades.json` las publicaciones del BOE de cada oposición (término de búsqueda y `convocatoria_ref` en su JSON). Planes free/premium en `config.json → planes`. Tutor IA: `supabase/functions/tutor/` (se activa rellenando `tutorUrl`).
- Motor de ingesta: `ingesta/` (ver `ingesta/README.md`). Fuentes en `ingesta/fuentes.json`; `python3 ingesta/motor.py` descarga, `python3 ingesta/extraer.py` extrae a `catalogo/convocatorias/`. Lo ejecuta cada día `.github/workflows/ingesta.yml`. Si una fuente falla no se borra nada: queda `inaccesible` y se reintenta. Nunca editar a mano una ficha automática: corrige la regla y vuelve a extraer, o marca la ficha `"revision": "manual"` tras revisarla.
- Preguntas nuevas: añadir `dif` (1-3) y `exp` (explicación breve) además de la cita.

## Growth OS, tests y documentación (v3)
- Documentación del proyecto en `documentacion/` (no en `docs/`: esa carpeta es la web publicada y `build.mjs` la regenera). Estado en `progress.md`.
- Estados de verificación comunes: `catalogo/estados_verificacion.json` (+ `catalogo/verificacion.py`). Preguntas desfasadas: `python3 datos/revisar_vigencia.py` (las marca DEPRECATED; no borrar).
- Growth OS en `crecimiento/`: bus de eventos → orquestador (`reglas.json`) → cola de trabajos → Content Factory / SEO / canales. `python3 -m crecimiento.orquestador`; revisión humana con `python3 -m crecimiento.cli`. Nunca autopublicar datos no verificados, publicar en Reddit ni enviar comerciales sin consentimiento. Flags en `config.json → flags`.
- Tests antes de hacer push: `npm run lint`, `npm run validar`, `npm run test:py`, `npm run build`, `npm run test:js`; además `deno test --allow-env tests/deno/` y `npm run test:sql` (PostgreSQL local) si se tocan las funciones o el esquema.

## Forma de trabajar (norma del propietario)
- Nunca ejecutes el trabajo por tu cuenta: delega siempre la tarea a un subagente.
- No uses siempre Fable. Usa Opus 5.5 para tareas más simples.
- Distribución de modelos:
  - Fable 5.1: arquitectura, bugs complejos y revisión de código.
  - Opus 5.5: ediciones, pruebas, documentación y refactorización.
  - Haiku 4.5: investigaciones y resúmenes.
- Especifica el modelo en cada llamada al subagente.
- Delegación: un subagente por tarea; planifica antes de ejecutar; ejecuta en paralelo los subagentes independientes; lee el informe del subagente, nunca los archivos.
