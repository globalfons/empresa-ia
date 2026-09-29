# Afiliados

Para academias, preparadores y creadores.

- **Alta:**
  ```sql
  insert into public.afiliados (codigo, nombre, email, comision_pct) values ('academia123', 'Academia X', 'x@y.es', 20);
  ```
- **Enlace:** `https://globalfons.github.io/empresa-ia/?ref=academia123`. También vale con `utm_*` para la campaña.
- **Clics y registros:** eventos con `metadata.attr.first.ref = código`.
- **Conversiones:** el webhook crea `afiliado_conversiones` por cada cobro (sin duplicados por factura), con `comision_cent = importe × comision_pct` y `estado` pendiente → pagada | anulada.
- **Dashboard:** en `/admin/growth/` → Afiliados: clics, registros, activados, premium, ingresos y comisión.
- **Pago:** manual, fuera de la plataforma. Se marca `estado = 'pagada'`.
