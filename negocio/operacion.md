# Operación — qué hace Claude cada semana

Rutina semanal (sesión programada o manual con "sigue con TestLey"):

0. **Catálogo:** seguir `negocio/prompt-catalogo.md` (descubrir oposiciones, mapear temarios a normas, priorizar la siguiente norma).
1. **Contenido:** añadir 40–60 preguntas nuevas.
   - Orden: completar la Ley 39/2015 (Títulos IV y VI), luego Ley 40/2015, Constitución y TREBEP.
   - Cada pregunta con `cita` literal. `python3 datos/validar.py <artículos> <preguntas>` debe dar 0 errores.
2. **Leyes nuevas:** descargar el texto consolidado desde `raw.githubusercontent.com/legalize-dev/legalize-es/main/es/<ID-BOE>.md` y parsearlo a `datos/<ley>-articulos.json`.
3. **Reformas:** comparar `last_updated` del texto consolidado con el guardado. Si una ley cambia, volver a validar todas sus preguntas y corregir las que fallen.
4. **Build y QA:** `node build.mjs`, crawler de enlaces, prueba del test en móvil.
5. **Commit y push a `main`** (GitHub Pages publica solo).
6. **Métricas:** si hay datos de ventas o de Search Console disponibles, anotarlos en `negocio/metricas.md` y ajustar prioridades.

IDs del BOE:
- Ley 39/2015 = BOE-A-2015-10565
- Ley 40/2015 = BOE-A-2015-10566
- Constitución = BOE-A-1978-31229
- TREBEP = BOE-A-2015-11719
