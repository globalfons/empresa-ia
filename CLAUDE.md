# empresa-ia — ViajaIA

Web de nicho monetizada con afiliación: herramientas y guías en español para viajar a Japón.
El propietario solo gestiona cuentas (afiliados, Stripe, Pinterest, dominio). Claude opera todo lo demás con las skills `/money-*`.

## Estructura
- `src/pages/**.html`: páginas. Cada una empieza con `<!--meta {JSON} -->` (title, description, h1, faq, affiliate, crumbs, scripts, updated, noindex).
- `src/assets/`: CSS, calculadoras y `afiliados.js` (IDs de afiliado, único sitio donde se configuran).
- `site.json`: nombre, URL base y dominio propio.
- `docs/`: salida generada que publica GitHub Pages. **No editar a mano.** Regenerar con `node build.mjs` y commitear siempre `src/` y `docs/` juntos.
- `negocio/`: estrategia, plan de tráfico y contenido para canales externos.
- `TU-PARTE.md`: tareas que solo puede hacer el propietario.

## Reglas de contenido
- Nunca inventar experiencias personales ni cifras. Cada dato de precio lleva fuente enlazada o se marca como aproximado.
- Los enlaces de afiliado usan `data-aff="<programa>"` con la URL normal como `href`. `afiliados.js` añade el ID y `rel="sponsored"`.
- Las páginas con afiliados llevan `"affiliate": true` en su meta.
- Las calculadoras dan el resultado honesto aunque perjudique la comisión.
- Revisar los precios del JR Pass, las tarifas del shinkansen y el cambio del yen cada 6 meses (próxima revisión: 2027-03).

## Verificación antes de hacer push
`node build.mjs`, servir `docs/` bajo `/empresa-ia/` y comprobar que no hay enlaces internos rotos, que las calculadoras no dan errores de JS y que no hay scroll horizontal a 375 px.
