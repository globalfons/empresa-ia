# Auditoría de legislación: Código Civil y Código Penal (29/09/2026)

Fuente única: API de datos abiertos del BOE (legislación consolidada) y texto oficial de las leyes modificadoras en boe.es.
Cada artículo local se comparó con la última versión de su bloque en el BOE.

## Resultado
- Código Civil (BOE-A-1889-4763): 1.988 artículos; coinciden con el BOE vigente salvo los casos documentados abajo.
- Código Penal (BOE-A-1995-25444): 750 artículos; ídem.

## Corregido
1. **Vigilante diario (`datos/vigilar_leyes.py`)**: `num_articulo` no reconocía los títulos «Art 1» / «Art. 1» del índice del Código Civil ni «quáter» con tilde, así que nunca detectaba cambios en el Código Civil. Ahora los reconoce; los rangos («Art. 1231 A 1253») se ignoran. Tests en `tests/test_calidad.py`.
2. **Errores de extracción resincronizados con el BOE** (sin cambio de contenido legal; texto anterior guardado en `datos/versiones/<ley>.json`):
   - CC: 16, 270, 396, 608, 707, 753, 756, 1087, 1459, 1568, 1873, 1911, 1975, 1976.
   - CP: 9, 78 bis, 137, 517, 518, 526, 603, 616 quáter.
3. **Artículos sin vigencia cuyo bloque consolidado del BOE conserva la redacción anterior** (marcados `vigencia: SIN_VIGENCIA`, con norma, fecha y nota; página noindex con aviso; texto anterior en el historial):

| Artículo | Norma | Publicación | En vigor | Confianza |
|---|---|---|---|---|
| CP 183 ter y 183 quater | LO 10/2022 (BOE-A-2022-14630), disposición final cuarta, apartado nueve: «Se suprime el Capítulo II bis del Título VIII del Libro II» | 07/09/2022 | 07/10/2022 | Alta |
| CC 237 bis | Ley 8/2021 (BOE-A-2021-9233), art. segundo, apartado veintiuno: nueva redacción íntegra del Título IX (arts. 199-238) sin el 237 bis | 03/06/2021 | 03/09/2021 | Media-alta (pendiente de verificación) |
| CC 239 bis | Ley 8/2021, art. segundo, apartado veintidós: nueva redacción íntegra del Título X (arts. 239-248) sin el 239 bis | 03/06/2021 | 03/09/2021 | Media-alta (pendiente de verificación) |

## Sin cambios (coherentes con el BOE)
- Derogados: 44 del CC (incluido el 322, derogado por la Ley 8/2021 con efectos de 03/09/2021) y CP 88 y 93 (LO 1/2015) y demás suprimidos. Las diferencias restantes (CC 301, 332; CP 88, 93) son solo de forma («**(Derogados)**» frente a «(Derogado)»).
- CC 307 y 1231: el bloque del BOE está vacío; se conserva la marca local «(Sin contenido)» / «(Derogados)».
- Bloques del BOE sin artículo local: CC 1863 bis a 1872 bis, todos «(Derogados)» desde 1954.

## Preguntas
- Ninguna pregunta en los artículos sin vigencia.
- Las preguntas de los artículos resincronizados (CC 16; CP 9, 78 bis) mantienen su cita literal en el texto vigente: `validar.py` 0 errores. No requieren revisión.
