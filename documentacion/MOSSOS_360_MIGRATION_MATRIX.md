# Mossos 360 · matriz de migración (F24)

Qué tiene ya cada oposición en su perfil (`catalogo/perfiles/<id>.json`, generado hoy) y qué falta para el nivel de Mossos. Los motores ya funcionan para todas; lo que falta son **datos oficiales** en la ficha.

| Capacidad | Mossos (referencia) | PN Básica | Guardia Civil | Auxiliar AGE (C2) | Administrativo AGE (C1) | Gestión AGE (A2) |
|---|---|---|---|---|---|---|
| Perfil generado | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| Convocatoria CURRENT_CALL con código | ✔ 46/26 | ✔ (sin código corto) | ✔ (sin código corto) | ✔ (sin código corto) | ✔ (sin código corto) | ✔ (sin código corto) |
| Fuentes OFFICIAL_VERIFIED | 6 | 2 | 1 | 1 | 1 | 1 |
| Datos oficiales citados | 15 | 7 | 9 | 5 | 5 | 5 |
| Temario oficial | 21 temas | 45 | **pendiente (0)** | 28 | 45 | 58 |
| Temas en objetivo / con fuente | 1 / 20 | 27 / 27 | — | 17 / 17 | 35 / 35 | 53 / 53 |
| Exámenes oficiales (OFFICIAL_EXAM) | 290 (9) | 0 | 0 | 0 | 0 | 0 |
| Simulacro | oficial, reparto por exámenes | oficial, uniforme | adaptado, uniforme | adaptado, uniforme | adaptado, uniforme | oficial, uniforme |
| Calendario | 10 hitos | — | — | — | — | — |
| Módulos de preparación | 11 | — | — | — | — | — |
| Alertas tipificadas | BOE + DOGC + web | BOE | BOE | BOE | BOE | BOE |
| CoverageEngine | ✔ | ✔ (ejecutable) | sin temario | ✔ | ✔ | ✔ |

Notas: «temas en objetivo» de las oposiciones AGE/PN cuenta todas las preguntas de una ley cuando el ámbito del tema está «sin precisar»; es optimista.

## Pasos por oposición (solo datos, sin código)

| Oposición | Pasos | Bloqueos |
|---|---|---|
| PN Escala Básica | `oficial.calendario` de la convocatoria; `preparacion_modulos` (conocimientos, prueba_fisica, reconocimiento_medico, entrevista, psicotecnicos, requisitos, documentacion, calendario) con las citas de las bases; transcribir exámenes oficiales si la DGP los publica | Exámenes oficiales: solo si hay publicación oficial |
| Guardia Civil | Primero el **temario oficial** (hoy pendiente); después lo mismo que PN (ortografía, gramática, inglés, psicotécnica, aptitud psicofísica) | Temario oficial no incorporado |
| Auxiliar AGE (C2) | Calendario; módulos conocimientos, psicotecnicos (parte de la 1.ª), ofimática (checklist), requisitos, documentacion, calendario | Ofimática fuera de TestLey |
| Administrativo AGE (C1) | Calendario; módulos conocimientos, supuesto práctico (checklist), requisitos, documentacion, calendario | Supuesto práctico no medible |
| Gestión AGE (A2) | Calendario; módulos conocimientos, supuesto práctico escrito (checklist), requisitos, documentacion, calendario | Ídem |

Común: añadir un código corto de convocatoria (`convocatoria_registro`) para el «seguir <oposición> <código>»; la generación de preguntas sigue pausada para todas.
