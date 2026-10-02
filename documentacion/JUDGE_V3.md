# juez-sesion-v3 (B2)

Versión nueva y registrada en `fabrica/politica_juez/registro.json` (activa desde 2026-10-02). **juez-sesion-v2 no se ha tocado**: su fichero conserva la huella registrada y queda como histórica.

## Qué cambia respecto a v2
Mismo mecanismo:
- tandas de ≤ 10 preguntas;
- el juez es un subagente que solo puede leer su tanda;
- la respuesta se extrae de su transcripción;
- guards 1:1 y JSON estricto.

Cambios de criterio (de `JUDGE_V2_DEFECTS.md`):
1. **`cita_suficiente`**, criterio bloqueante: la cita sola debe contener todo lo necesario para elegir la opción correcta (D1). En las preguntas negativas, debe mostrar también que las demás opciones sí figuran (D2). Si es `false`, la pregunta va a REVIEW_REQUIRED.
2. **Trivialidad explícita** en `clara` (D3).
3. Los metadatos (D4: dificultad, tipo, tema) **no** se añaden: no bloquean y obligarían a dar al juez datos del generador.

## Garantías y dónde se comprueban

| Requisito | Implementación | Test |
|---|---|---|
| El generador no escribe `verdict`, `status`, `confidence` ni `publication_state` | `Banco.RAIZ_PROHIBIDA` → bloqueo + incidencia | `test_publicacion`, `test_juez_v3` |
| El juez solo recibe lo necesario: question_id, norma, art, texto, q, o, a, cita, parecidas | `juez_v2.preparar` | `test_juez_v3.test_tandas_de_10…` |
| Máximo 10 por evaluación | política `mecanismo.tamano_tanda` | ídem |
| Resultado estructurado y validado | `comprobar` con los criterios de la política | `test_juez_v3.test_cita_insuficiente…` |
| Veredicto ausente → REVIEW_REQUIRED; sin aprobación por defecto | `aplicar_veredictos`, guards 1:1, tanda con scripts → RECHAZADA | `test_sin_aprobacion_por_defecto` |
| Campo reservado → INCIDENT + bloqueo | `Banco.verificar_publicacion` | `test_publicacion` |
| Registro de policy_version, policy_hash, prompt_hash, model, timestamp y session_id | `evaluacion.json` (por tanda: `prompt_sha256`, `registrada_el`, huella de cada pregunta, respuesta íntegra y su sha256) y traza de la pregunta (`judge_*`) | `test_registra_politica…` |
| Política congelada; cambiarla invalida la sesión | `politica.verificar` (huella y versión activa) | `test_cambiar_la_politica…` |
| Solo `Banco.publicar()` publica | La puerta recalcula el VALID desde la respuesta archivada del juez y exige que la pregunta sea idéntica a la juzgada y que la política sea la activa. El invariante de `scripts/integridad_banco.py` exige veredicto trazable a toda pregunta servida que no existía al activar v3 (`fabrica/estado/banco-pre-v3.json`) | `VeredictoTrazable` (4 tests), `test_pregunta_nueva_sin_evidencia…` |
| Ningún script cambia veredictos a posteriori | Tandas aceptadas inmutables. Si se edita el veredicto archivado, la puerta lo recalcula desde la respuesta; si se edita la respuesta, su huella no cuadra | `test_veredicto_editado_despues_no_publica`, `test_veredictos_inmutables` |

Límite honesto: quien controle el repositorio podría falsificar a la vez la respuesta, su huella y el veredicto. Lo que el sistema garantiza es que ningún script de la fábrica ni ninguna edición parcial publique, y que toda pregunta nueva deje una evidencia completa y auditable.

## Validación (CAL50-v3, 2026-10-02)
Se usaron las mismas 50 preguntas de la validación documental independiente contra el BOE (`JUDGE_V2_INDEPENDENT_VALIDATION.md`), con jueces reales (5 tandas). Evidencia en `fabrica/estado/archivo/evaluaciones/CAL50-v3/` (incluye `comparacion-documental.json`).

| | Documental VALID | Documental REVIEW |
|---|---|---|
| **v3 VALID** | 40 | **1** (lef-1954-38, trivial: MINOR) |
| **v3 REVIEW** | 5 (cita_suficiente estricto) | 4 (lef-1954-36, ley-19-2013-57, lo-4-2000-84, codigo-penal-626) |

- **Los 4 defectos MAJOR que v2 aprobaba (D1/D2), detectados.** No pasa ningún error CRITICAL ni MAJOR.
- 1 defecto MINOR (trivialidad, D3) no detectado: sigue siendo una limitación conocida.
- 5 preguntas correctas enviadas a revisión. Son sobre todo preguntas negativas en las que la cita no muestra las otras opciones. Es un error en la dirección segura: cuesta revisión humana, no calidad.
- El criterio previo («exactamente 5 REVIEW y 45 VALID») **no se cumple al pie de la letra**. Veredicto: **CALIBRATION_PASS_CONSERVATIVE**, apto para la generación controlada en lotes pequeños con auditoría. No apto todavía para escalado masivo hasta medir la tasa de revisión en lotes reales.
- Incidencia de la calibración: un falso positivo del guard de respuestas agregadas («…en el resto de los casos», una cita de la ley). Se acotó el patrón con un test y se volvió a registrar la misma respuesta (`fabrica/estado/incidencias-politica.json`).
