"""Valida el catálogo de oposiciones. Sale con código 1 si hay errores."""
import json, os, sys
D = os.path.dirname(os.path.abspath(__file__))
opos = json.load(open(os.path.join(D, "oposiciones.json")))
normas = {n["id"] for n in json.load(open(os.path.join(D, "normas.json")))}
err = []
ids = [o["id"] for o in opos]
if len(ids) != len(set(ids)): err.append("ids de oposición duplicados")
for o in opos:
    if not o.get("fuente_temario", "").startswith("https://"): err.append(f"{o['id']}: sin fuente oficial del temario")
    c = o["convocatoria"]
    if c.get("plazas") is not None and not c.get("url_oficial"): err.append(f"{o['id']}: plazas sin fuente")
    if not o["temario"]: err.append(f"{o['id']}: temario vacío")
    for t in o["temario"]:
        for n in t["normas"]:
            if n not in normas: err.append(f"{o['id']} tema {t['tema']}: norma {n} no está en normas.json")
        if t["tipo"] == "legislativo" and not t["normas"]: err.append(f"{o['id']} tema {t['tema']}: legislativo sin normas")
for e in err: print("ERROR:", e)
print(f"{len(opos)} oposiciones, {len(normas)} normas, {len(err)} errores")
sys.exit(1 if err else 0)
