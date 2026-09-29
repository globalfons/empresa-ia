# SEO Engine

`build.mjs` genera las páginas a partir de entidades reales. `crecimiento/seo.py` y `catalogo/seo_calidad.json` deciden si se indexan; la misma puerta de calidad se usa en Python y en la build.

**Por página:**
- `title`, `description`, `canonical` y Open Graph;
- JSON-LD: Course + FAQPage en las fichas, BreadcrumbList en todas las páginas principales, NewsArticle y Quiz;
- `lastmod` real en el sitemap (verificación de la ficha, publicación del artículo, fecha de actualización de la ley);
- `robots.txt` y `llms.txt`;
- enlazado interno: categoría ↔ ficha ↔ convocatoria ↔ leyes ↔ artículos.

**Puerta de calidad:**

| Tipo de página | Condición para indexarse | Si no la cumple |
|---|---|---|
| Convocatoria | ≥ 2 datos útiles además de organismo, territorio y boletín | `noindex` (hoy 224 de 1.792) |
| Artículo (`/noticias/`) | ≥ 90 palabras, enlace a la fuente oficial, enlace interno/CTA, dato OFFICIAL_VERIFIED o PENDING_REVIEW, sin duplicado de la misma convocatoria | `noindex` |
| Categoría sin contenido | — | `noindex` |

**Rutas:**
- `/oposiciones/<slug>/`, `/oposiciones/categoria/<id>/`, `/convocatorias/<id>/`, `/noticias/<slug>/`, `/leyes/`.
- **No** se crean `/tests/<op>`, `/requisitos/<op>`, `/temario/<op>` ni `/pruebas/<op>`: duplicarían secciones de la ficha, que tiene anclas `#requisitos`, `#temario`, `#pruebas` y `#tests`.
- La categoría usa `/oposiciones/categoria/<id>/` y no `/oposiciones/<categoria>/`, para no colisionar con los slugs de oposición. Las URL existentes se conservan.

**Bucle:**
1. El evento dispara `update_seo`.
2. `evaluar_entidad` decide entre página existente o nueva y si se indexa.
3. Se emite `SEO_PAGE_UPDATED`.
4. La build publica.

No hay páginas «keyword + texto IA».
