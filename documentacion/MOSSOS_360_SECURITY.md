# Mossos 360 · seguridad (B1 premium + B2 publicación)

## B1 · Banco premium: estado **PENDING_MANUAL_DEPLOYMENT**

| Pieza | Dónde | Comprobado por |
|---|---|---|
| Qué es premium | Las preguntas de leyes con guía privada (la guía de Mossos) que no están en `planes.free.leyes_completas`. Las preguntas BOE por artículo son gratis (promesa de la página de precios) | `PREMIUM_DEPLOYMENT.md` (tabla de auditoría) |
| Separación en el build | `build.mjs → separarPremium`: `docs/datos` recibe una muestra de 10 y el resto va a `.banco-privado/` (en `.gitignore`) | `tests/js/premium.test.mjs` (build real: ningún id ni texto premium aparece en ningún json, html ni js público) |
| Almacén | `public.banco_premium`: RLS activado, sin políticas, `revoke all` a anon y authenticated | `tests/test_sql.py::test_banco_premium_inaccesible_salvo_servicio` |
| Autorización | La función `banco` comprueba `mi_plan()` con el token del usuario, o la licencia de Lemon Squeezy en el servidor (exige `LS_STORE_ID`). Respuestas: 401 sin credencial, 403 FREE, 200 PREMIUM; `Cache-Control: private, no-store` | `tests/deno/banco_test.ts` (15 pruebas) |
| service_role | Solo dentro de la función y en los secretos de GitHub (`scripts/subir_banco.py`, que nunca la imprime). Nunca llega al navegador | Tests de build y revisión de `store.js` |
| Cliente | `store.js → conPremium`: un usuario FREE no llama a la función; un Pase falso recibe 403; PREMIUM fusiona las preguntas sin duplicados | `tests/js/premium.test.mjs` |
| Datos internos | `PUBLICO` quita `legacy_*`, `reevaluaciones`, `reevaluation_*` y `current_status` | Test de build |

**Mientras no se despliegue**, `bancoPrivado: false` y el banco completo sigue público. Pasos exactos en `PREMIUM_DEPLOYMENT.md`. Al activarlo: subir el banco (`subir_banco.py`, ya en los workflows) y poner `bancoPrivado: true`; el build deja de publicar las preguntas premium.

## B2 · Integridad de la publicación

Única puerta: `Banco.publicar()`, que exige todo lo siguiente.
- Política activa (v3) congelada.
- Veredicto VALID **recalculado desde la respuesta archivada del juez** (sha256 de la respuesta, huella de la pregunta, política).
- Ningún campo reservado del generador; fuente oficial verificada; cita literal; sin duplicados.

El invariante `scripts/integridad_banco.py` (estado de referencia `banco-pre-v3.json`) exige que toda pregunta servida que no existiera al activar v3 tenga evidencia v3 o aprobación humana. El modo API está bloqueado con v3 (exit 4). Detalle en `JUDGE_V3.md` y `MOSSOS_360_JUDGE_SECURITY.md`.

## Incidencias de esta fase (`fabrica/estado/incidencias-politica.json`)

| Fecha | Lote | Tipo | Resolución |
|---|---|---|---|
| 2026-10-02 | CAL50-v3 | guard_falso_positivo («el resto de los casos» citado) | Patrón acotado con un test; se registró de nuevo la misma respuesta |
| 2026-10-02 | S00020 | deduplicacion_incompleta (Idees força frente a los apartados del tema) | Jueces detenidos antes de dar veredicto, `fabrica.banco.afin` con test, validar repetido y nuevo juicio. Cuenta como incidente de proceso y pausa la generación |

Incidentes de seguridad (campos reservados, scripts escribiendo veredictos, publicación saltándose la puerta): **0**.
