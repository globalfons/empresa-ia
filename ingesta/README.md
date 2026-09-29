# Motor de ingesta de fuentes oficiales

```
FUENTE (ingesta/fuentes.json)
  → RASTREO      crawler: boe_api (API de datos abiertos) · http (urllib) · playwright (webs con JavaScript)
  → DESCARGA     reintentos con espera exponencial, User-Agent identificado, respeto a robots.txt
  → CAMBIOS      hash SHA-256 del contenido; nuevo / modificado / sin cambios → ingesta/estado/cambios.jsonl
  → PARSEO       HTML · PDF (pypdf) · JSON · XML · CSV → texto (ingesta/documentos/<fuente>/<doc>.txt)
  → EXTRACCIÓN   reglas deterministas + Claude por API (opcional, ANTHROPIC_API_KEY) → JSON estructurado
  → VALIDACIÓN   solo se guarda un dato si su cita aparece literalmente en el documento
  → CATÁLOGO     catalogo/convocatorias/<id>.json (y, revisadas, catalogo/oposiciones/<id>.json)
  → WEB          node build.mjs → /convocatorias/, /oposiciones/, /admin/fuentes/
```

## Ficheros
| Fichero | Qué es |
|---|---|
| `fuentes.json` | Registro de fuentes: id, domain, url, tipo, crawler, parser, frecuencia_horas, prioridad, filtros |
| `estado/fuentes-estado.json` | Por fuente: último escaneo, último éxito, estado (ok/error/inaccesible), errores seguidos, último error, próxima ejecución, hash, cursor |
| `estado/documentos.json` | Documentos descargados: url, domain, tipo, sha256, published_at, retrieved_at, updated_at, texto, extracción |
| `estado/cambios.jsonl` | Historial de cambios detectados |
| `logs/AAAA-MM.jsonl` | Registro de ejecuciones y errores |
| `reglas.json` | Reglas de clasificación por categoría (datos, no código) |

## Procedencia de cada dato
`valor, cita, source_url, source_domain, source_document, published_at, updated_at, retrieved_at, confidence, verification_status, metodo`.
`verification_status`: `cita_verificada_automaticamente` (extracción automática con cita literal comprobada) → `revisado` (lo confirma una persona o Claude en una revisión). Una ficha con `"revision": "manual"` nunca se sobrescribe automáticamente.

## Si una fuente falla
No se borra nada: se conservan los documentos y datos anteriores, la fuente queda `inaccesible` o `error` con el motivo y se reintenta a la 1 h, 2 h, 4 h… (como máximo según su frecuencia). Las oposiciones del catálogo nunca dependen de que una web responda.

## Ejecutar
```
python3 ingesta/motor.py                       # fuentes que tocan
python3 ingesta/motor.py --fuente boe-sumario  # una fuente (fuerza la ejecución)
python3 ingesta/extraer.py                     # extraer documentos pendientes
```
En producción lo ejecuta `.github/workflows/ingesta.yml` cada día (GitHub Actions), sin intervención de Claude.
Claude solo interviene para interpretar documentos (extracción por API) y en la revisión semanal.

## Añadir una fuente
Añade una entrada a `fuentes.json`. Para una web de listados basta `crawler: http` (o `playwright` si necesita JavaScript), `parser: html_enlaces` y un filtro `incluir`.
