# Arquitectura de TestLey

Plataforma para encontrar, preparar y seguir oposiciones. Este documento recoge las decisiones técnicas importantes.

## Principios
1. **Nada inventado.** Todo dato oficial (plazas, requisitos, titulación, plazos, pruebas, temario) lleva su **cita literal** y la **fuente** (URL oficial, fecha de publicación). `catalogo/validar_catalogo.py` comprueba que cada cita y cada título de tema aparecen palabra por palabra en el texto oficial guardado en `catalogo/fuentes/`. Si no aparece, la build falla.
2. **Oficial ≠ TestLey ≠ IA.** La web etiqueta el contenido: «Fuente oficial» (convocatorias), «Contenido de TestLey» (preguntas redactadas por nosotros, cada una con la cita del BOE que la justifica) e «IA» (explicaciones generadas, nunca presentadas como oficiales).
3. **Datos fuera del código.** Añadir una oposición = añadir `catalogo/oposiciones/<id>.json`. El código (`construir.py`, `build.mjs`, `web/assets/*.js`) no contiene datos de ninguna oposición concreta.

## Piezas
| Capa | Tecnología | Por qué |
|---|---|---|
| Web pública (SEO) | Generador estático `build.mjs` → `docs/` → GitHub Pages | Miles de páginas indexables (una por artículo de ley), coste 0, rápida. |
| Cuentas y progreso | Supabase (Auth + Postgres con RLS), llamado desde el navegador con la clave publicable | Sin servidor propio; cada usuario solo puede leer/escribir sus filas. |
| Pagos | Lemon Squeezy (vendedor registrado, gestiona IVA) + clave de licencia validada en el navegador | Permite cobrar como particular. |
| IA (tutor) | Supabase Edge Function con la clave del modelo en los secretos de Supabase | La clave nunca llega al navegador. |
| Fuentes oficiales | API de datos abiertos del BOE + espejo legalize-es de textos consolidados | Datos oficiales y actualizables. |

## Modelo de datos del catálogo
`catalogo/oposiciones/<id>.json`:
- identidad: `id`, `nombre`, `categoria` (de `catalogo/categorias.json`), `organismo`, `administracion`, `ambito`, `territorio`, `grupo`, `estado`, `actualizado`
- `fuentes`: `{clave: {tipo, id, titulo, url, fecha_publicacion, texto}}`; `texto` apunta a la copia literal en `catalogo/fuentes/`
- `oficial`: `{plazas, titulacion, requisitos[], plazo_solicitudes, pruebas[], ...}`, donde cada dato es `{valor, fuente, cita}`
- `examen`: `oficial` (formato real) y `simulacro` (`preguntas`, `minutos`, `opciones`, `penalizacion`, `origen` oficial|adaptado, `nota`)
- `temario`: `{fuente, anexo, temas: [{bloque, tema, titulo, tipo, normas[]}]}`; `normas` son ids BOE de `catalogo/normas_base.json`

Flujo: `validar_catalogo.py` → `construir.py` (agrega y calcula cobertura → `oposiciones.json`, `normas.json`) → `node build.mjs`.
`sugerir_normas.py` es solo una ayuda para proponer normas por tema al añadir una oposición; la asignación final se revisa y se guarda en el JSON.

## Preguntas
`datos/preguntas-<slug>.json`: `{art, q, o[4], a, cita}`. `datos/validar.py` exige que la cita sea literal del artículo vigente y no esté cortada. Los simulacros adaptan el número de opciones (quitando distractores) y la penalización a la configuración de cada oposición.
