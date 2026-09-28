# Prompt operativo: catálogo de oposiciones y cobertura de temarios

> Instrucciones para Claude en las sesiones de trabajo de TestLey (manuales o programadas).
> Objetivo: saber qué oposiciones existen, qué normas exige cada temario oficial y cubrirlas por orden de rentabilidad, sin inventar nada.

## 0. Principios que no se negocian
1. **Solo fuentes oficiales para decidir el temario:** la convocatoria o las bases publicadas en el BOE o en el boletín autonómico o provincial. Las webs de academias sirven para descubrir convocatorias, nunca como fuente del temario. Cada oposición guarda la URL oficial de la que sale.
2. **Solo preguntas verificables:** TestLey cubre la parte de legislación (normas publicadas en el BOE o en boletines autonómicos). Los temas que no son legislación (ofimática, psicotécnicos, materias técnicas como enfermería o educación) se marcan como `no_legislativo` y no se cubren con este sistema.
3. **Nada inventado:** si un dato (plazas, fecha, tema) no está confirmado en una fuente, se deja vacío y se marca como `pendiente_verificar`. Nunca se rellena por estimación.
4. **Todo va en datos, no en texto:** el catálogo vive en `catalogo/` en JSON validado. La web se genera a partir de él.

## 1. Estructura de datos (`catalogo/`)

### `catalogo/oposiciones.json`: una entrada por oposición
```json
{
  "id": "age-auxiliar-administrativo-c2",
  "nombre": "Cuerpo General Auxiliar de la Administración del Estado",
  "ambito": "estatal",              // estatal | autonomico | local | justicia | otros
  "administracion": "AGE",          // AGE, Generalitat de Catalunya, Ayto. de Madrid...
  "grupo": "C2",                    // A1 | A2 | C1 | C2 | AP (agrupaciones profesionales)
  "convocatoria": {
    "referencia": "Orden TDF/1459/2025",
    "fecha_publicacion": "2025-12-22",
    "url_oficial": "https://www.boe.es/...",
    "plazas": null,                  // número o null si no está confirmado
    "estado": "convocada"            // prevista | convocada | examen_realizado | cerrada
  },
  "temario": [
    { "tema": 1, "titulo": "La Constitución Española de 1978...", "normas": ["BOE-A-1978-31229"], "tipo": "legislativo" },
    { "tema": 25, "titulo": "Informática básica...", "normas": [], "tipo": "no_legislativo" }
  ],
  "verificado": "2026-09-28",
  "fuente_temario": "https://www.boe.es/...",
  "notas": ""
}
```

### `catalogo/normas.json`: una entrada por norma, compartida entre oposiciones
```json
{
  "id": "BOE-A-2015-10565",
  "nombre": "Ley 39/2015, del Procedimiento Administrativo Común",
  "slug": "ley-39-2015",
  "fuente": "https://raw.githubusercontent.com/legalize-dev/legalize-es/main/es/BOE-A-2015-10565.md",
  "estado_testley": "publicada",    // pendiente | en_curso | publicada
  "preguntas": 126,
  "oposiciones": ["age-auxiliar-administrativo-c2", "..."]   // se calcula automáticamente
}
```

### `catalogo/validar_catalogo.py`
Debe fallar si:
- una oposición no tiene `fuente_temario` oficial;
- un tema legislativo cita una norma que no está en `normas.json`;
- aparece una cifra (plazas, fechas) sin fuente;
- hay ids duplicados.

## 2. Descubrimiento de oposiciones (en cada sesión, 15–20 minutos como máximo)
Orden de búsqueda:
1. **Estatales (AGE):** Auxiliar Administrativo (C2), Administrativo (C1), Gestión (A2), Técnicos de Hacienda, Agentes de Hacienda, Auxilio Judicial, Tramitación Procesal, Gestión Procesal, Instituciones Penitenciarias, Correos.
2. **Autonómicas:** auxiliares y administrativos de las 17 comunidades autónomas. Empezar por las más grandes: Andalucía, Madrid, Cataluña, Comunidad Valenciana, Galicia y Castilla y León.
3. **Locales:** auxiliares administrativos de diputaciones y de ayuntamientos de más de 100.000 habitantes.
4. **Otras con mucho temario legislativo:** Policía Nacional y Guardia Civil (solo la parte jurídica), y celadores y auxiliares administrativos de servicios de salud.

Para cada una: localizar la convocatoria oficial, copiar el temario tal cual y **asignar a cada tema las normas que cita expresamente**. Si el tema no cita una norma concreta, se marca como `tipo: "legislativo_generico"` y se deja la asignación para una revisión manual.

## 3. Priorización (qué norma cubrir después)
Para cada norma pendiente se calcula:

`puntuacion = Σ (peso de cada oposición que la incluye)`, con `peso = plazas_confirmadas` (o 50 si no están confirmadas) × `1,5` si el estado es `convocada`.

**Se cubre primero la norma con mayor puntuación.** Previsiblemente, el orden será:
1. Constitución Española
2. Ley 40/2015
3. TREBEP
4. Ley 19/2013 (transparencia)
5. Ley 50/1997 (Gobierno)
6. LOPDGDD (Ley Orgánica 3/2018)
7. Leyes de igualdad (Ley Orgánica 3/2007) y de violencia de género (Ley Orgánica 1/2004)

Recalcularlo siempre con los datos reales del catálogo.

## 4. Producción de preguntas (igual que para la Ley 39/2015)
- Descargar el texto consolidado desde legalize-es y parsearlo a `datos/<slug>-articulos.json`.
- Entre 40 y 60 preguntas por sesión, priorizando los artículos que más caen en examen: plazos, órganos, mayorías, derechos y procedimientos.
- Cada pregunta con `cita` literal del artículo. `datos/validar.py` debe dar 0 errores.
- Generar la página resumen de la ley y una página por artículo, y añadir la ley a la portada.

## 5. Web (a medida que el catálogo crezca)
- **Página por oposición** (`/oposiciones/<id>/`): temario oficial, qué temas cubre TestLey (con enlace al test de cada norma), porcentaje de cobertura legislativa y enlace a la convocatoria oficial. Es la página que busca el opositor ("test auxiliar administrativo estado").
- **Test combinado por oposición:** mezcla preguntas de todas sus normas, respetando el peso de cada tema.
- **El panel del usuario** permite elegir "mi oposición" y muestra el progreso sobre su temario, no por ley suelta.

## 6. Informe al terminar cada sesión
- Oposiciones añadidas o actualizadas (con su fuente oficial).
- Normas: publicadas, en curso y siguiente en la cola, con su puntuación.
- Cobertura legislativa de las 5 oposiciones principales (en %).
- Problemas encontrados, por ejemplo fuentes a las que no se pudo acceder.

## Limitación conocida del entorno
Desde las sesiones en la nube, `boe.es` y algunos boletines están bloqueados por la política de red. Sí funcionan GitHub (legalize-es) y la búsqueda web. Si no se puede abrir la convocatoria oficial, la oposición se registra con `estado_verificacion: "fuente_no_accesible"` y no se publica su temario en la web hasta verificarlo. El propietario puede desbloquearlo añadiendo `www.boe.es` a los dominios permitidos del entorno.
