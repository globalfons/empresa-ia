# SEO técnico y on-page

Qué hace la build (`build.mjs`) para que Google y Bing puedan rastrear, entender e indexar TestLey, y qué tiene que hacer el propietario fuera del código. La puerta de calidad que decide qué se indexa está en [SEO-ENGINE.md](SEO-ENGINE.md).

## Lo que está hecho

### Sitemaps y robots
- `docs/sitemap.xml` es un **índice** que apunta a cuatro sitemaps por tipo: `sitemap-leyes.xml` (leyes y artículos), `sitemap-oposiciones.xml` (fichas, temas y categorías), `sitemap-convocatorias.xml` (fichas de convocatoria) y `sitemap-general.xml` (portada, FAQ, precios…).
- Solo entran páginas **indexables**: nada con `noindex` (admin, panel, cuenta, bienvenida, temas sin preguntas, convocatorias con pocos datos, categorías vacías). No hay redirecciones en el sitio. Cada `<loc>` coincide con el `canonical` de su página.
- `lastmod` es la fecha real del contenido: verificación de la ficha de oposición, verificación de la convocatoria, y para leyes y artículos el último commit de `datos/preguntas-<ley>.json` o `datos/<ley>-articulos.json`. Nunca es posterior al día de la build. En un clon superficial (CI con `fetch-depth: 1`) no hay historia fiable y se usa `updated` de `config.json`.
- `robots.txt` permite todo y declara `Sitemap: <url>/sitemap.xml`. Las páginas privadas se excluyen con `noindex` (no con `Disallow`, que impediría a Google ver el `noindex`).

### Metadatos por página
- `<title>` y `meta description` **únicos** en todas las páginas indexables. Si dos páginas coinciden, la build pasa a una variante más específica (ubicación del artículo, fecha o referencia de la convocatoria, año de la oposición). El test `tests/js/seo.test.mjs` falla si queda algún duplicado o si un título o descripción se sale de longitud.
- Títulos orientados a búsqueda, sin relleno de palabras clave. Ejemplos reales de la build:
  - `Test Constitución Española 2026: 223 preguntas con solución`
  - `Test Ley 39/2015 gratis: 163 preguntas con solución` (sin año cuando el nombre de la norma ya lleva uno)
  - `Policía Nacional Escala Básica 2026: plazas, temario y test` (año de la convocatoria oficial)
  - `I · Tema 3. Las Cortes – Auxiliar Administrativo del Estado`
  - `Buscador de oposiciones 2026: convocatorias, temario y tests`
  - La marca `| TestLey` se añade al final cuando cabe en 65 caracteres.
- `canonical` absoluto en todas las páginas.
- Open Graph (`og:type`, `og:site_name`, `og:title`, `og:description`, `og:url`, `og:locale`, `og:image` 1200×630) y Twitter Card `summary_large_image`.
- Imagen social `web/assets/og-testley.png` y logo `web/assets/logo-testley.png` (512×512) con la identidad v4. Se regeneran con `node scripts/og-imagen.mjs` (usa Playwright con Chromium).
- Verificación de buscadores: `googleSiteVerification` y `bingSiteVerification` en `config.json`. Si tienen valor, la portada pinta `<meta name="google-site-verification">` y `<meta name="msvalidate.01">`. Vacíos no se pinta nada.

### Datos estructurados (JSON-LD)
- Portada: `Organization` (con logo) y `WebSite` con `SearchAction` hacia `/oposiciones/?q=…`. Esa URL funciona de verdad: `buscador.js` lee `q` y filtra. Google ya no muestra la caja de búsqueda en resultados, pero el marcado es válido y lo usan otros buscadores.
- `BreadcrumbList` en todas las páginas con migas, generado a partir de las migas **visibles**, para que el marcado coincida con lo que ve el usuario.
- `FAQPage` solo donde la página muestra ese mismo FAQ: portada, `/faq/`, `/precios/` y fichas de oposición. El test lo comprueba.
- `Quiz` en el test de cada ley, `LearningResource` en cada artículo y `NewsArticle` en noticias. Se quitó `Course` de las fichas de oposición: la ficha informa de una convocatoria con tests, no es un curso.

### Enlazado interno
- Artículo: enlaces al artículo anterior y siguiente (con su título) y bloque «Oposiciones y temas con este artículo», que enlaza a cada oposición y a los temas cuyo ámbito incluye el artículo (asignación orientativa de TestLey, indicada en la página).
- Test de ley: bloque «Oposiciones con <ley> en el temario» con enlaces a las oposiciones y temas.
- Tema: enlaces a los artículos de sus leyes, a los temas del bloque y al tema anterior y siguiente.
- `/convocatorias/` enlaza a las páginas de categoría, que siguen listando todas sus convocatorias en HTML.

### Peso de `/convocatorias/`
- El HTML trae las **60 convocatorias más recientes** (unos 50 kB en lugar de 1,2 MB). El resto está en `docs/datos/convocatorias.json`, que `buscador.js` descarga la primera vez que el usuario busca, filtra o pulsa «Ver las N convocatorias». La búsqueda por URL (`?q=`, filtros) sigue funcionando.
- Las fichas de cada convocatoria siguen enlazadas desde las páginas de categoría y están en `sitemap-convocatorias.xml`, así que no pierden rastreo.

## Tareas del propietario

1. **Google Search Console**
   - Añadir una propiedad de tipo «Prefijo de URL» con `https://globalfons.github.io/empresa-ia/` (en GitHub Pages sin dominio propio no se puede verificar la propiedad de dominio por DNS).
   - Elegir el método «Etiqueta HTML», copiar solo el valor de `content` en `googleSiteVerification` de `config.json`, publicar (build y push) y pulsar «Verificar».
   - En «Sitemaps», enviar `sitemap.xml`. Revisar a los pocos días «Páginas» (indexación) y «Mejoras» (migas, FAQ).
   - Pedir la indexación manual de la portada, `/oposiciones/`, `/convocatorias/` y los tests de las leyes principales con «Inspección de URLs».
2. **Bing Webmaster Tools**
   - Se puede importar la propiedad desde Search Console. Si no, verificar con la metaetiqueta: valor en `bingSiteVerification` de `config.json`.
   - Enviar `sitemap.xml`. Bing también alimenta a otros buscadores y asistentes.
3. **Dominio propio (recomendado)**
   - Un dominio propio (por ejemplo, uno `.es` con la marca) da control sobre la URL a largo plazo: si algún día se sale de GitHub Pages, un dominio propio conserva el posicionamiento; `globalfons.github.io/empresa-ia/` no.
   - Cuanto antes se haga, menos señales hay que migrar. Pasos: comprar el dominio, poner `customDomain` en `config.json` y cambiar `url` y `basePath`, configurar el DNS según la documentación de GitHub Pages, activar HTTPS, y en Search Console añadir la nueva propiedad y usar «Cambio de dirección». GitHub Pages redirige la URL antigua al dominio propio.
4. **Contenido** (ideas, sin estimaciones de volumen: comprobarlas en Search Console una vez haya datos)
   - «Requisitos», «temario» y «pruebas» ya son secciones de cada ficha de oposición: ampliarlas con texto propio (explicaciones, no copia de las bases).
   - Artículos de la Constitución y de la Ley 39/2015 con una breve explicación propia además del texto del BOE: forman parte del temario de varias oposiciones del catálogo.
   - Guías por oposición («cómo se estructura el examen», «qué leyes entran») enlazadas desde la ficha.
   - Noticias de convocatorias nuevas (el sistema ya las genera; publicar las que pasen la puerta de calidad).
   - Tras 4-8 semanas, mirar en Search Console qué consultas dan impresiones con CTR bajo y ajustar esos títulos y descripciones.
5. **Seguimiento**: tras cada cambio grande, comprobar la cobertura en Search Console y la prueba de resultados enriquecidos de Google en una ficha de oposición y un artículo.
