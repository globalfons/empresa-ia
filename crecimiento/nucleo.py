"""Rutas, reloj, persistencia atómica y feature flags del Growth OS."""
import json, os, datetime, uuid, hashlib

R = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.dirname(R)
EST = os.environ.get("TL_CRECIMIENTO_ESTADO") or os.path.join(R, "estado")      # público (git): sin datos personales
PRIV = os.environ.get("TL_CRECIMIENTO_PRIVADO") or os.path.join(R, "privado")   # nunca se sube (métricas de negocio, informes)

def ahora(): return datetime.datetime.now(datetime.timezone.utc).replace(microsecond=0)
def iso(dt=None): return (dt or ahora()).isoformat().replace("+00:00", "Z")
def parse(s): return datetime.datetime.fromisoformat(s.replace("Z", "+00:00"))
def nuevo_id(): return uuid.uuid4().hex
def huella(x): return hashlib.sha256(json.dumps(x, sort_keys=True, ensure_ascii=False).encode()).hexdigest()[:16]

def ruta(nombre, privado=False):
    d = PRIV if privado else EST
    os.makedirs(d, exist_ok=True)
    return os.path.join(d, nombre)
def leer(nombre, defecto, privado=False):
    p = ruta(nombre, privado)
    return json.load(open(p)) if os.path.exists(p) else defecto
def guardar(nombre, datos, privado=False):
    p = ruta(nombre, privado); tmp = p + ".tmp"
    json.dump(datos, open(tmp, "w"), ensure_ascii=False, indent=1); os.replace(tmp, p)
def anadir(nombre, fila, privado=False):
    with open(ruta(nombre, privado), "a") as f: f.write(json.dumps(fila, ensure_ascii=False) + "\n")
def leer_lineas(nombre, privado=False):
    p = ruta(nombre, privado)
    return [json.loads(l) for l in open(p) if l.strip()] if os.path.exists(p) else []

def config():
    return json.load(open(os.path.join(RAIZ, "config.json")))
def flag(nombre):
    """Feature flags en config.json → flags. Una función desactivada no genera trabajos ni envía nada."""
    return bool(config().get("flags", {}).get(nombre, False))
def secreto(nombre):
    """Lee un secreto del entorno. Nunca se imprime ni se escribe en logs."""
    v = os.environ.get(nombre, "").strip()
    return v or None
