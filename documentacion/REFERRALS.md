# Referidos

Flujo: USER → enlace `?ref=<código>` → nuevo usuario → alta → activación → premium → recompensa.

- **Código:** `mi_codigo_referido()`, 8 caracteres y estable. En el panel (flag `referral`).
- **Registro:** al crear la cuenta, `registrar_referido(código, anon_id)`.
- **Tabla `referidos`:** `codigo`, `referrer`, `referred` (único), `estado` (registrado | activado | convertido | rechazado | revision), `motivo`, `recompensa`, `creado`, `convertido`.
- **Conversión:** con el **primer cobro real** (no con el alta en prueba gratis), en el webhook → `REFERRAL_CONVERTED`.
- **Recompensa:** se aplica a mano (por ejemplo, un mes gratis con un descuento de Lemon Squeezy) y se marca `recompensa = 'aplicada'`.

## Antifraude
Probado en `tests/test_sql.py`:
- autorreferido → rechazado;
- solo cuentas de menos de 48 h;
- un único referido por persona;
- mismo dispositivo que quien refiere → rechazado;
- más de 20 al día → revisión.
