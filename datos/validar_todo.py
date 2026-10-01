"""Valida las preguntas de todas las leyes: python3 datos/validar_todo.py"""
import glob, os, subprocess, sys
D = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, D)
from validar_lib import ruta_articulos  # noqa: E402
fallo = False
for f in sorted(glob.glob(os.path.join(D, "preguntas-*.json"))):
    slug = os.path.basename(f)[len("preguntas-"):-len(".json")]
    arts = ruta_articulos(slug)
    r = subprocess.run([sys.executable, os.path.join(D, "validar.py"), arts, f], capture_output=True, text=True)
    print(f"{slug:14} {r.stdout.strip().splitlines()[-1]}")
    if r.returncode: fallo = True; print(r.stdout)
sys.exit(1 if fallo else 0)
