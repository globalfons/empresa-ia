"""Valida el catálogo de oposiciones (catalogo/oposiciones/*.json). Sale con código 1 si hay errores.
Regla de oro: todo dato oficial lleva 'cita' literal que debe aparecer en el texto de su fuente,
y todo título de tema debe aparecer literalmente en la fuente del temario. Así no se puede inventar nada.
"""
import json, os, re, sys, glob
D = os.path.dirname(os.path.abspath(__file__))
R = os.path.dirname(D)
CATS = {c["id"] for c in json.load(open(os.path.join(D, "categorias.json")))}
NORMAS = {n["id"] for n in json.load(open(os.path.join(D, "normas_base.json")))}
OBLIG = ["id", "nombre", "categoria", "organismo", "ambito", "territorio", "estado", "actualizado", "fuentes", "oficial", "temario"]
ESTADOS = {"activa", "proxima", "cerrada", "historica"}
TIPOS_TEMARIO = {"oficial_publicado", "derivado_bases", "preparacion", "pendiente"}
norm = lambda s: re.sub(r"\s+", " ", s.replace(" ", " ").replace("\xa0", " ")).strip()
err = []
def textos(o):
    out = {}
    for k, f in o["fuentes"].items():
        if not f.get("url", "").startswith("https://"): err.append(f"{o['id']}: fuente {k} sin URL oficial https")
        for c in ("tipo", "titulo", "fecha_publicacion"):
            if not f.get(c): err.append(f"{o['id']}: fuente {k} sin {c}")
        p = os.path.join(R, f.get("texto", ""))
        out[k] = norm(open(p).read()) if f.get("texto") and os.path.exists(p) else None
        if out[k] is None: err.append(f"{o['id']}: fuente {k} sin texto guardado para verificar")
    return out
def dato(o, T, nombre, d):
    # Un dato oficial: {valor, fuente, cita} o, si se calcula, {valor, fuente, citas: [...], calculo: "suma"}
    if not isinstance(d, dict) or "valor" not in d or "fuente" not in d or not (d.get("cita") or d.get("citas")):
        err.append(f"{o['id']}: {nombre} debe tener valor, fuente y cita"); return
    t = T.get(d["fuente"])
    citas = d.get("citas") or [d["cita"]]
    for c in citas:
        if t is not None and norm(c) not in t: err.append(f"{o['id']}: {nombre}: la cita no aparece en la fuente: {c[:70]}")
    if d.get("calculo") == "suma":
        nums = [int(x) for c in citas for x in re.findall(r"\((\d[\d.]*)\)", c.replace(".", ""))]
        if sum(nums) != d["valor"]: err.append(f"{o['id']}: {nombre}: la suma de las citas ({sum(nums)}) no da {d['valor']}")
    elif isinstance(d["valor"], int) and f"{d['valor']:,}".replace(",", ".") not in citas[0] and str(d["valor"]) not in citas[0]:
        err.append(f"{o['id']}: {nombre}: el número {d['valor']} no aparece en su cita")
ids = []
for p in sorted(glob.glob(os.path.join(D, "oposiciones", "*.json"))):
    o = json.load(open(p)); ids.append(o.get("id"))
    if os.path.basename(p) != f"{o.get('id')}.json": err.append(f"{p}: el nombre del fichero no coincide con el id")
    for c in OBLIG:
        if o.get(c) in (None, "", {}, []): err.append(f"{o.get('id')}: falta {c}")
    if o.get("categoria") not in CATS: err.append(f"{o['id']}: categoría desconocida {o.get('categoria')}")
    if o.get("estado") not in ESTADOS: err.append(f"{o['id']}: estado desconocido {o.get('estado')}")
    T = textos(o)
    for k, v in (o.get("oficial") or {}).items():
        for i, x in enumerate(v if isinstance(v, list) else [v]): dato(o, T, f"oficial.{k}[{i}]", x)
    tm = o.get("temario") or {}
    tt = T.get(tm.get("fuente"))
    tipo_t = tm.get("tipo")
    if tipo_t not in TIPOS_TEMARIO: err.append(f"{o['id']}: temario.tipo debe ser uno de {sorted(TIPOS_TEMARIO)}")
    if tt is None: err.append(f"{o['id']}: el temario no tiene fuente verificable")
    if tipo_t == "pendiente" and not any(x.get("campo") == "temario" for x in o.get("pendientes", [])):
        err.append(f"{o['id']}: temario pendiente sin explicar en 'pendientes'")
    for x in o.get("pendientes", []):
        if not x.get("campo") or not x.get("motivo"): err.append(f"{o['id']}: pendiente sin campo o motivo")
    for n in (o.get("preparacion") or {}).get("normas", []):
        if n not in NORMAS: err.append(f"{o['id']}: preparación: norma {n} no está en normas_base.json")
    # Solo el temario oficial exige títulos literales; el derivado exige una cita de las bases por tema.
    if tipo_t == "derivado_bases":
        for t in tm.get("temas", []):
            if not t.get("cita") or (tt is not None and norm(t["cita"]) not in tt): err.append(f"{o['id']} tema {t.get('tema')}: tema derivado sin cita literal de las bases")
    ns = [t["tema"] for t in tm.get("temas", [])]
    if ns != list(range(1, len(ns) + 1)) and len(set((t["bloque"], t["tema"]) for t in tm.get("temas", []))) != len(ns):
        err.append(f"{o['id']}: numeración de temas repetida")
    for t in tm.get("temas", []):
        if tipo_t == "oficial_publicado" and tt is not None and norm(t["titulo"]) not in tt: err.append(f"{o['id']} tema {t['tema']}: el título no aparece literal en la fuente")
        if t["tipo"] not in ("legislativo", "legislativo_generico", "no_legislativo"): err.append(f"{o['id']} tema {t['tema']}: tipo {t['tipo']}")
        if t["tipo"] == "legislativo" and not t["normas"]: err.append(f"{o['id']} tema {t['tema']}: legislativo sin normas")
        for n in t["normas"]:
            if n not in NORMAS: err.append(f"{o['id']} tema {t['tema']}: norma {n} no está en normas_base.json")
    ex = (o.get("examen") or {}).get("simulacro")
    if ex:
        for c in ("preguntas", "minutos", "opciones", "penalizacion", "origen", "nota"):
            if ex.get(c) in (None, ""): err.append(f"{o['id']}: simulacro sin {c}")
        if ex.get("origen") not in ("oficial", "adaptado"): err.append(f"{o['id']}: simulacro.origen debe ser oficial o adaptado")
        if ex.get("opciones") not in (2, 3, 4): err.append(f"{o['id']}: simulacro.opciones debe ser 2, 3 o 4")
if len(ids) != len(set(ids)): err.append("ids de oposición duplicados")
for e in err: print("ERROR:", e)
print(f"{len(ids)} oposiciones, {len(NORMAS)} normas, {len(err)} errores")
sys.exit(1 if err else 0)
