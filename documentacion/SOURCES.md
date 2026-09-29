# Fuentes oficiales

El registro está en `ingesta/fuentes.json`. Para añadir una fuente basta con añadir un objeto; no hay que tocar código. No se hace scraping indiscriminado: solo se consultan los dominios configurados, respetando `robots.txt` y con un User-Agent identificable.

| Campo | Significado |
|---|---|
| `id`, `nombre`, `organismo`, `domain`, `url` | Identidad y punto de entrada |
| `tipo` | html · json · xml · csv · pdf |
| `crawler` | `boe_api` (API de datos abiertos) · `http` · `playwright` (solo webs que necesitan JavaScript) |
| `parser` | `boe_sumario` · `html_enlaces` · … |
| `frecuencia_horas`, `prioridad`, `activo` | Planificación y activación |
| `opciones.incluir` / `excluir` | Filtros de títulos o enlaces |

El estado de cada fuente está en `ingesta/estado/fuentes-estado.json`: `estado`, `ultimo_escaneo`, `ultimo_exito`, `ultimo_error`, `errores_consecutivos`, `proximo_escaneo`, `hash` y `documentos`. Se ve en `/admin/fuentes/` y `/admin/system/`.

| Prioridad | Fuente | Estado actual |
|---|---|---|
| 1 | BOE, sumario diario (sección 2B) | ✅ En producción: 1.835 documentos (julio–septiembre 2026) |
| 2 | Punto de Acceso General (administracion.gob.es) | Registrada. No se puede probar desde el entorno de desarrollo (bloqueo de red); debería funcionar en Actions |
| 3 | Policía Nacional | Registrada. «Inaccesible» desde el entorno de desarrollo (403 del proxy) |
| 4 | Guardia Civil | Igual que la anterior |
| 5–6 | Defensa, Justicia | Registradas |
| 7 | CCAA (BOCM, DOGC, BOJA) | Registradas |
| 8 | Administración local | Cubierta por el BOE 2B. Los BOP provinciales se añadirán como fuentes propias |

**Para activar una fuente de verdad:** ejecuta el workflow «Ingesta de fuentes oficiales» con `fuente=<id>` y revisa `/admin/fuentes/`. Si falla por HTML distinto al esperado, ajusta `opciones.incluir`.
