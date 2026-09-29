# Fábrica de preguntas (Question Factory)

Produce preguntas propias de TestLey por lotes pequeños a partir del texto consolidado del BOE, las valida y solo publica
las VALID. Código en `fabrica/`, configuración en `fabrica/config.json`, workflow `.github/workflows/question-factory.yml`.

## Fuentes y separación
- Única fuente jurídica: `datos/<ley>-articulos.json` (texto consolidado del BOE, mantenido por `datos/vigilar_leyes.py`) y
  su versión en `datos/leyes-meta.json`. Nunca academias, plataformas comerciales ni bancos de terceros.
- `procedencia`: `TESTLEY_GENERATED` (todas las actuales y las de la fábrica) u `OFFICIAL_EXAM` (solo exámenes publicados
  por una administración, con `examen_oficial` = organismo, convocatoria, fecha_examen, url_oficial, documento; el test lo exige).
  En la web, las oficiales llevan su distintivo y su referencia; las generadas nunca se presentan como oficiales.

## IDs estables (progreso de los usuarios)
- `datos/ids-congelados.json` + `fabrica/congelar_ids.py`: la pregunta i de cada fichero tiene id `<prefijo>-<i>`, el mismo
  que ya usaba el progreso. Las nuevas se añaden solo al final. `tests/test_ids_estables.py` lo garantiza.

## Flujo de un lote
1. Cobertura: `scripts/brecha_preguntas.py` (`calcular()`) con objetivo por tema = mín(200, capacidad del contenido).
   Capacidad de un artículo = palabras/40 (1–10); 0 si no está vigente (derogado, suprimido, «sin vigencia») o es muy corto.
2. Selección: temas sin preguntas → menor cobertura relativa → prioridad de la oposición; en cada tema, el artículo menos
   cubierto de su ámbito; nunca más allá de su capacidad; artículos con 3 rechazos se saltan.
3. Tipos y dificultad: 15 tipos; solo los que el texto permite (señales: plazos, órganos, excepciones…). Reparto 30/50/20
   configurable por oposición (`dificultad_por_oposicion`). La dificultad final sale del tipo (criterio fijo), no del modelo.
4. Generación: Claude Opus 5.5 (salida JSON con esquema, fallbacks del servidor) con el artículo como único dato.
5. Validación determinista: esquema, cita literal y no cortada, artículo vigente, dentro del tema, opciones (pistas por
   longitud, respuesta en el enunciado, remisiones), explicación que cita el artículo, tipo, no oficial, duplicado exacto y léxico.
6. Juez semántico barato: Claude Haiku 4.5 comprueba que la cita respalda la respuesta, que es única y clara, y los
   duplicados semánticos frente a las parecidas (solo para las que pasaron el paso 5).
7. Estado: VALID → final del banco con trazabilidad (norma, artículo, apartado, URL, versión, fecha, cita, tipo, modelo, lote);
   REVIEW_REQUIRED y REJECTED → `datos/candidatas/<ley>.json` (no se publican). Caso práctico y relación entre artículos
   van siempre a revisión en esta fase.
8. Métricas: `fabrica/estado/metricas.json`; lotes y pausa en `fabrica/estado/estado.json`; página `/admin/preguntas/`.

## Paradas automáticas (GENERATION_PAUSED)
Rechazo del lote > 30 %; en los últimos 5 lotes, revisión > 45 %, duplicados > 30 % o coste por VALID > 0,25 USD; dos lotes
sin generar nada. La pausa persiste hasta relanzar con `resume` (workflow) o `--reanudar` (CLI) tras corregir la causa.

## Ejecución
- GitHub Actions → «Question Factory» → Run workflow: `opposition`, `batch_size`, `target_questions`, `dry_run`,
  `max_cost_usd`, `resume`. Requiere el secreto `ANTHROPIC_API_KEY`. Cada tramo de 5 lotes: validar banco → build →
  tests de ids y fábrica → commit y push. Se interrumpe sin perder lo guardado y continúa desde el déficit restante.
- Local: `npm run fabrica -- --dry-run --oposicion auxiliar-administrativo-age --lotes 3` (sin API ni cambios);
  `--simulado` prueba el circuito completo sin API.

## Coste
Precios en `fabrica/config.json` (Opus 5.5: 4/20 USD por millón de tokens; Haiku 4.5: 1/5). Estimación del dry run:
≈ 0,018 USD por pregunta generada; se mide el real en cada lote.
