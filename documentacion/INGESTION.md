# Motor de ingesta de fuentes oficiales

Detalle técnico y comandos: `ingesta/README.md`. Este documento resume el flujo y las garantías.

```
SOURCE (ingesta/fuentes.json) → CRAWL (boe_api | http | playwright) → DOWNLOAD (reintentos, robots.txt)
→ CHANGE DETECTION (SHA-256; versión anterior conservada + diff) → PARSE (html/pdf/json/xml/csv)
→ EXTRACT (reglas deterministas; Claude opcional) → VALIDATE (cita literal + valor dentro de la cita + esquema cerrado)
→ NORMALIZE (ficha con procedencia por dato y verification_status) → DATABASE (catalogo/convocatorias, git)
→ PUBLICATION (build.mjs) → EVENTOS (crecimiento/productores.py)
```

## Detección de cambios y versiones
Cada documento guarda estos campos:
- `url`, `sha256`, `retrieved_at`, `published_at` y `updated_at`;
- `content_type`, `document_version`, `previous_version_id` y `versiones[]`.

Si el hash cambia, el proceso es este:
1. Se conserva la versión anterior (`<id>.vN.txt`).
2. Se calcula un diff (líneas añadidas y quitadas, con muestras) y se registra en `ingesta/estado/cambios.jsonl`, que funciona como registro de auditoría.
3. El documento vuelve a la cola de extracción.
4. `extraer.py` compara los datos antes y después. Si cambian plazas, plazo, sistema u otro dato, crea una novedad en `catalogo/novedades-convocatorias.json`.
5. Esa novedad genera un evento `CONVOCATION_UPDATED`: le llega un aviso a quien sigue la convocatoria y el orquestador decide qué más hacer.

## Extracción sin inventar
- **Reglas:** cada dato es una frase literal del documento.
  - Las plazas exigen un número válido: «2.704», no un apartado numerado como «2.2.1».
  - El plazo solo se guarda si la frase contiene el plazo.
  - No se calcula ninguna fecha.
- **Claude** (solo con `ANTHROPIC_API_KEY`):
  - Prompt de sistema que declara el documento como **dato no fiable**.
  - El documento va delimitado.
  - Esquema cerrado: claves y tipos conocidos, longitudes acotadas.
  - La cita tiene que aparecer literalmente y el valor tiene que estar dentro de la cita.
  - Lo que no cumple se descarta y queda anotado en `descartados_por_no_literales`.
- **Exclusiones:** los procesos que no son de acceso (provisión de puestos, libre designación, concursos de méritos) no se tratan como convocatorias (`ingesta/reglas.json → excluir_titulo`).
- **Revisión manual:** una ficha con `"revision": "manual"` nunca se sobrescribe, tampoco con `--rehacer`.

## Fallos
- Una fuente que falla no borra nada: queda en estado `error` o `inaccesible` y se reintenta con espera creciente.
- La web muestra `SOURCE_TEMPORARILY_UNAVAILABLE` sobre el último dato válido.

## Métricas
Cada ejecución añade una línea a `ingesta/estado/metricas.jsonl`:
- **Rastreo:** fuentes activas y con fallo, documentos procesados y cambiados, duración.
- **Extracción:** registros actualizados, con cambios y pendientes de revisión; interpretados por IA; fallos.

Se ven en `/admin/system/`.
