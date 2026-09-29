# Producto

**Promesa:** descubre tu oposición → entiende la convocatoria → prepara el temario → practica → detecta tus puntos débiles → sigue tu progreso → recibe avisos importantes.

## Web pública
| Página | Ruta |
|---|---|
| Portada | `/` |
| Buscador y filtros | `/oposiciones/` (administración, estado, estudios, categoría) |
| Categorías | `/oposiciones/categoria/<id>/` |
| Fichas de oposición | `/oposiciones/<id>/`: cabecera con estado, última verificación y «Empezar a preparar»; índice; convocatoria, requisitos, plazas, fechas, temario, pruebas, legislación, documentación, tests, simulacros y FAQ |
| Convocatorias | `/convocatorias/` y `/convocatorias/<id>/` |
| Precios | `/precios/` (desde `config.json → planes`) |
| FAQ | `/faq/` |
| Noticias | `/noticias/` |
| Leyes | `/leyes/` |

## Aplicación
| Función | Dónde |
|---|---|
| Onboarding | `/bienvenida/`: oposición, fecha, horas y nivel → primer test |
| Dashboard | `/panel/`: tu sesión de hoy, tu semana (puntos, nivel, objetivo), nota, dominio por tema, puntos débiles, evolución, simulacros, plan, seguimiento y avisos, tutor, invitaciones, cuenta |
| Tests | Por oposición, tema, dificultad, aleatorio, fallos, favoritas; modo examen y entrenamiento; nº de preguntas, tiempo y penalización |
| Simulacros | Con análisis y comparación con los anteriores |
| Alertas | In-app (campana y panel), email (servicio `notificar`) y Telegram (bot) |

## Planes
Configurables en `config.json → planes`, con precio y prueba.
- **Free:** catálogo, convocatorias, Ley 39/2015 completa, tests por artículo y 10 preguntas de muestra por ley u oposición.
- **Pase Opositor:** todo lo demás.

## Gamificación
- Puntos por constancia (días de estudio y racha), precisión (acierto semanal ≥ 70 % dobla) y progreso (preguntas dominadas). No premia el volumen.
- Niveles y objetivo semanal ligado a las horas declaradas.
- Logros y ranking opcional.
