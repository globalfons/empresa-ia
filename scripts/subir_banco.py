"""Sube el banco premium (B1) que genera la build en .banco-privado/ a public.banco_premium de Supabase.
Solo en GitHub Actions, con el secreto SUPABASE_SERVICE_ROLE_KEY (nunca se imprime ni se guarda). Ver documentacion/PREMIUM_DEPLOYMENT.md.
  - bancoPrivado desactivado en config.json → no hace nada (código 0).
  - bancoPrivado activo y sin secreto → error (código 1): la web ya no lleva ese contenido y los usuarios premium se quedarían sin él.
Uso: node build.mjs && python3 scripts/subir_banco.py"""
import glob, json, os, sys, urllib.request

R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PRIV = os.environ.get("TL_PRIV") or os.path.join(R, ".banco-privado")


def main():
    cfg = json.load(open(os.path.join(R, "config.json"), encoding="utf-8"))
    if not cfg.get("bancoPrivado"):
        print("bancoPrivado desactivado: no se sube nada")
        return 0
    clave = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    url = (os.environ.get("SUPABASE_URL") or cfg.get("supabaseUrl") or "").rstrip("/")
    if not clave or not url:
        print("ERROR: bancoPrivado activo pero falta SUPABASE_SERVICE_ROLE_KEY (secreto de GitHub) o supabaseUrl", file=sys.stderr)
        return 1
    filas = []
    for f in sorted(glob.glob(os.path.join(PRIV, "*.json"))):
        d = json.load(open(f, encoding="utf-8"))
        filas.append({"clave": d["clave"], "datos": {"qs": d["qs"]}})
    if not filas:
        print("ERROR: no hay banco premium generado (¿se ejecutó la build con bancoPrivado?)", file=sys.stderr)
        return 1
    req = urllib.request.Request(f"{url}/rest/v1/banco_premium?on_conflict=clave", method="POST", data=json.dumps(filas).encode(),
                                 headers={"apikey": clave, "Authorization": f"Bearer {clave}", "Content-Type": "application/json",
                                          "Prefer": "resolution=merge-duplicates,return=minimal"})
    try:
        urllib.request.urlopen(req, timeout=60).read()
    except Exception as e:  # sin cabeceras ni cuerpo de la petición: la clave no puede aparecer en el registro
        print(f"ERROR al subir el banco premium: {type(e).__name__} {getattr(e, 'code', '')}", file=sys.stderr)
        return 1
    print(f"banco premium subido: {len(filas)} claves, {sum(len(x['datos']['qs']) for x in filas)} preguntas")
    return 0


if __name__ == "__main__":
    sys.exit(main())
