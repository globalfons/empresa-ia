"""Construye catalogo/oposiciones.json y catalogo/normas.json a partir de los datos del catálogo.
- Fuente de verdad: catalogo/oposiciones/<id>.json (una oposición por fichero, validada con validar_catalogo.py)
  y catalogo/normas_base.json (leyes del BOE).
- Publicadas: una ley está publicada cuando existe datos/preguntas-<slug>.json con preguntas.
- Este script no contiene datos de ninguna oposición: añadir una oposición = añadir un fichero JSON.
Uso: python3 catalogo/construir.py
"""
import json, os, glob
D = os.path.dirname(os.path.abspath(__file__))
NORMAS = {n["id"]: n for n in json.load(open(os.path.join(D, "normas_base.json")))}
CATS = {c["id"]: c for c in json.load(open(os.path.join(D, "categorias.json")))}
_DATOS = os.path.join(D, "..", "datos")
def _publicada(slug):
    f = os.path.join(_DATOS, "preguntas-%s.json" % slug)
    return os.path.exists(f) and len(json.load(open(f))) > 0
PUBLICADAS = {nid: n["slug"] for nid, n in NORMAS.items() if _publicada(n["slug"])}

# Fuentes oficiales no versionadas (guía de Mossos): se descargan de su origen oficial si no están en datos/cache/
import sys as _sys
_sys.path.insert(0, _DATOS)
from validar_lib import ruta_articulos  # noqa: E402
for _n in NORMAS.values():
    if _n.get("tipo") == "guia_oficial":
        ruta_articulos(_n["slug"])

opos = []
for p in sorted(glob.glob(os.path.join(D, "oposiciones", "*.json"))):
    o = json.load(open(p))
    fu = o["fuentes"].get("convocatoria") or o["fuentes"][o["temario"]["fuente"]]  # la convocatoria; si no hay, la fuente del temario
    plazas = (o["oficial"].get("plazas") or {}).get("valor")
    temas = [dict(t, asignacion={n: "revisada" for n in t["normas"]}) for t in o["temario"]["temas"]]
    o["temario_tipo"] = o["temario"]["tipo"]
    o["verificacion"] = "pendiente" if o["temario"]["tipo"] == "pendiente" else "parcial" if o.get("pendientes") else "verificada"
    leg = [t for t in temas if t["tipo"] != "no_legislativo"]
    cub = sum(len([n for n in t["normas"] if n in PUBLICADAS]) / len(t["normas"]) for t in leg if t["normas"])
    o.update({
        "categoria_nombre": CATS[o["categoria"]]["nombre"],
        # Compatibilidad con la web: resumen de la convocatoria a partir de la fuente oficial
        "convocatoria": {"referencia": fu["titulo"], "fecha_publicacion": fu["fecha_publicacion"], "url_oficial": fu["url"],
                         "estado": o["estado"], "anexo": o["temario"].get("anexo"), "plazas": plazas, "turno": "libre"},
        "temario": temas, "fuente_temario": fu["url"], "verificado": o["actualizado"],
        "cobertura": {"temas_total": len(temas), "temas_legislativos": len(leg), "temas_no_legislativos": len(temas) - len(leg),
                      "pct_legislativo_cubierto": round(100 * cub / max(1, len(leg)), 1)},
    })
    opos.append(o)
opos.sort(key=lambda o: -(o["convocatoria"]["plazas"] or 0))

# Normas: a qué oposiciones y temas afectan + prioridad (más plazas y más temas = antes)
normas = []
for nid, n in NORMAS.items():
    usos = [(o, t) for o in opos for t in o["temario"] if nid in t["normas"]]
    ops = sorted({o["id"] for o, _ in usos})
    peso = sum((o["convocatoria"]["plazas"] or 0) * (1.5 if o["estado"] == "activa" else 1) for o in opos if o["id"] in ops)
    normas.append(dict(n, fuente=f"https://raw.githubusercontent.com/legalize-dev/legalize-es/main/es/{nid}.md",
                       estado_testley="publicada" if nid in PUBLICADAS else "pendiente",
                       oposiciones=ops, temas=len(usos), prioridad=round(peso * len(usos) / max(1, len(ops)))))
normas.sort(key=lambda x: (x["estado_testley"] != "pendiente", -x["prioridad"]))

json.dump(opos, open(os.path.join(D, "oposiciones.json"), "w"), ensure_ascii=False, indent=1)
# Ámbito de cada tema dentro de las leyes que comparte con otros temas (títulos/capítulos oficiales): catalogo/temas_ambito.json
import ambito_temas
ambito_temas.construir(opos)
json.dump(normas, open(os.path.join(D, "normas.json"), "w"), ensure_ascii=False, indent=1)
for o in opos: print(o["id"], o["convocatoria"]["plazas"], "plazas,", o["cobertura"])
print("\nCola de normas (prioridad):")
for n in [x for x in normas if x["estado_testley"] == "pendiente"][:12]: print(f'  {n["prioridad"]:>7}  {n["nombre"]}  ({n["temas"]} temas)')
