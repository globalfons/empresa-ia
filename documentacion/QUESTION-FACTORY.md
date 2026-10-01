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

## Modo sesión (sin API)
Mismos controles que el modo API, con la redacción y el juicio hechos por subagentes de una sesión de Claude Code:
1. `python3 -m fabrica.sesion plan --oposicion todas --lote 50` → `fabrica/sesion/<lote>/plan.json` y `prompt_redactor.txt`
   (instrucciones versionadas `fabrica/prompts/redactor-sesion-v1.txt`). **Congela la política del juez** del lote.
2. Redactor (Opus) con `prompt_redactor.txt` → `candidatas.json`; `python3 -m fabrica.sesion validar` → `revision.json` y
   `prompt_juez.txt` (generado desde la política congelada; se le pasa al juez **sin modificar ni una palabra**).
3. Juez (Haiku, subagente distinto) → `veredictos.json`. 4. `python3 -m fabrica.sesion cerrar` → banco/cola, archivo y métricas.

## Independencia del juez y separación de funciones
- **Política del juez** (`fabrica/politica_juez/`): un fichero JSON por versión, de solo lectura, con su huella sha256 en
  `registro.json` (solo se añaden versiones; `activa` = la vigente). Contiene el sistema, el formato de revisión, las
  instrucciones del juez de sesión y los criterios del modo API. Vigente: **juez-sesion-v1** (texto exacto usado en S00015,
  la última versión anterior al cambio no autorizado de S00016). Las versiones v0.1–v0.9 (S00001–S00014) y la no autorizada
  `v1-mod-S00016` están en `historico/` para auditar esos lotes.
- **Congelada por lote**: `plan` guarda versión + huella; `validar` y `cerrar` comprueban que el fichero, la versión activa
  y la huella siguen iguales. Si no: **bloquean, registran el intento** en `fabrica/estado/incidencias-politica.json` y no
  publican nada. `fabrica.politica.nueva_version()` se niega con un lote abierto y nunca sobrescribe una versión.
- **Generador**: solo escribe `candidatas.json`. Si trae campos de estado o veredicto (`verification_status`, `respaldada`,
  `judge_verdict`, `aprobacion_humana`, `traza`…) → REJECTED. Si `veredictos.json` existe antes de validar → bloqueo.
  Si las candidatas, `revision.json` o `prompt_juez.txt` cambian después de validar → bloqueo.
- **Juez**: solo escribe `veredictos.json` con `r, respaldada, unica, clara, duplicada_de, motivo`; cualquier otro campo
  (p. ej. una «corrección» del coordinador) bloquea el cierre. No modifica preguntas ni publica.
- **Cierre**: aplica los veredictos tal cual; no tiene ninguna opción para cambiarlos. Archiva el lote en
  `fabrica/estado/archivo/<lote>/` (candidatas, validación, lo que vio el juez, veredictos, política y prompts).
- **Publicación** (`Banco.publicar`, única puerta al banco): solo VALID (validación + juez) o REVIEW_REQUIRED con aprobación
  humana explícita. **Revisión humana**: `python3 -m fabrica.revision listar` / `decidir --id cand-… --decision aprobar|rechazar
  --revisor "Nombre" --motivo "…"` (reservado a personas; rechaza identidades de máquina; repite los controles contra el texto
  vigente; queda en `aprobacion_humana` y `fabrica/estado/revisiones-humanas.json`).
- «Es memorística» **no** es motivo de rechazo ni de revisión: plazos, cifras, órganos, definiciones o penas son materia de
  examen. Deciden exactitud, fuente, cita, respuesta única, claridad, vigencia y ámbito.
- **Trazabilidad** (`traza` en cada pregunta; no se publica en la web): id, batch_id, session_id, opposition_id, topic_id,
  article, source_document/url/version, generator, generator_model, generator_prompt_version, judge, judge_model,
  judge_policy_version (+ sha256), judge_verdict, judge_flags, judge_reason, validation_status, created_at, validated_at,
  reviewed_at, published_at. En S00001–S00015 está reconstruida desde el archivo de cada lote (`reconstruida: true`).
- Auditoría: `python3 -m fabrica.auditoria` → `documentacion/QUESTION-FACTORY-AUDIT.md`.

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
