"""Vigila el BOE y registra las publicaciones oficiales que afectan a cada oposición del catálogo.
Lee el sumario diario (API de datos abiertos del BOE), secciones indicadas en "vigilancia" de cada oposición,
y guarda en catalogo/novedades.json: oposición, fecha, identificador BOE, título literal, URL y tipo.
Solo se guardan datos publicados por el BOE (título y enlace); la clasificación por tipo es automática y se indica como tal.
Uso: python3 catalogo/vigilar_boe.py [--desde AAAA-MM-DD]
"""
import json, os, re, sys, glob, datetime, urllib.request, time
D = os.path.dirname(os.path.abspath(__file__))
NOV = os.path.join(D, "novedades.json")
EST = os.path.join(D, "vigilancia-estado.json")
TIPOS = [  # (tipo, regex sobre el título). El primero que encaja gana.
    ("correccion", r"(?i)correcci[oó]n de errores|se corrigen errores"),
    ("modificacion", r"(?i)\bse modifica|por la que se modifica"),
    ("aprobados", r"(?i)relaci[oó]n (definitiva )?de (personas )?aprobad|aprobados"),
    ("listas", r"(?i)admitid[oa]s|excluid[oa]s"),
    ("fecha_examen", r"(?i)(fecha|lugar|hora)s? de (celebraci[oó]n|realizaci[oó]n)|se anuncia la fecha"),
    ("nombramiento", r"(?i)se nombra|nombramiento"),
    ("convocatoria", r"(?i)se convoca|convocan|convocatoria"),
]
def tipo(t):
    for k, rx in TIPOS:
        if re.search(rx, t): return k
    return "otro"
def items(x):
    if isinstance(x, dict):
        if "identificador" in x and "titulo" in x: yield x
        for v in x.values(): yield from items(v)
    elif isinstance(x, list):
        for v in x: yield from items(v)
def sumario(d):
    url = f"https://www.boe.es/datosabiertos/api/boe/sumario/{d:%Y%m%d}"
    for intento in range(3):
        try:
            return json.load(urllib.request.urlopen(urllib.request.Request(url, headers={"Accept": "application/json"}), timeout=30))
        except urllib.error.HTTPError as e:
            if e.code == 404: return None  # domingo o día sin BOE
            time.sleep(2 * (intento + 1))
        except Exception:
            time.sleep(2 * (intento + 1))
    raise RuntimeError(f"No se pudo leer el sumario del {d}")

opos = [json.load(open(p)) for p in sorted(glob.glob(os.path.join(D, "oposiciones", "*.json")))]
opos = [o for o in opos if o.get("vigilancia")]
nov = json.load(open(NOV)) if os.path.exists(NOV) else []
vistos = {(n["oposicion"], n["id"]) for n in nov}
est = json.load(open(EST)) if os.path.exists(EST) else {}
hoy = datetime.date.today()
if "--desde" in sys.argv: desde = datetime.date.fromisoformat(sys.argv[sys.argv.index("--desde") + 1])
elif est.get("ultimo_dia"): desde = datetime.date.fromisoformat(est["ultimo_dia"]) + datetime.timedelta(1)
else: desde = min(datetime.date.fromisoformat(o["fuentes"][o["temario"]["fuente"]]["fecha_publicacion"]) for o in opos)
d, nuevas = desde, 0
while d <= hoy:
    s = sumario(d)
    if s:
        for dia in s["data"]["sumario"]["diario"]:
            for sec in dia["seccion"]:
                for it in items(sec):
                    t = it["titulo"]
                    for o in opos:
                        if sec["codigo"] not in o["vigilancia"]["secciones"]: continue
                        if not any(all(term.lower() in t.lower() for term in g) for g in o["vigilancia"]["grupos"]): continue
                        if (o["id"], it["identificador"]) in vistos: continue
                        url = it.get("url_html") or f"https://www.boe.es/diario_boe/txt.php?id={it['identificador']}"
                        nov.append({"oposicion": o["id"], "fecha": d.isoformat(), "id": it["identificador"], "titulo": t, "url": url,
                                    "tipo": tipo(t), "seccion": sec["codigo"], "detectado": hoy.isoformat()})
                        vistos.add((o["id"], it["identificador"])); nuevas += 1
    d += datetime.timedelta(1)
# La propia convocatoria siempre figura (aunque su título no nombre el cuerpo, p. ej. convocatorias conjuntas)
for o in opos:
    f = o["fuentes"][o["temario"]["fuente"]]
    if (o["id"], f.get("id")) not in vistos and f.get("id"):
        nov.append({"oposicion": o["id"], "fecha": f["fecha_publicacion"], "id": f["id"], "titulo": f["titulo"], "url": f["url"],
                    "tipo": "convocatoria", "seccion": "2B", "detectado": hoy.isoformat()}); nuevas += 1
# Relevancia: de la convocatoria actual o solo del mismo cuerpo (se recalcula siempre con los datos vigentes)
por_id = {o["id"]: o for o in opos}
for n in nov:
    o = por_id.get(n["oposicion"])
    if not o: continue
    conv = o["fuentes"][o["temario"]["fuente"]].get("id")
    refs = o["vigilancia"].get("convocatoria_ref", [])
    cuerpo_titulo = n["titulo"].split(",", 1)[-1].lower()  # sin la fecha de la propia resolución
    n["relevancia"] = "convocatoria" if n["id"] == conv or any(r.lower() in cuerpo_titulo for r in refs) else "cuerpo"
nov.sort(key=lambda n: (n["fecha"], n["id"]), reverse=True)
json.dump(nov, open(NOV, "w"), ensure_ascii=False, indent=1)
json.dump({"ultimo_dia": hoy.isoformat(), "revisado": datetime.datetime.now().isoformat(timespec="minutes")}, open(EST, "w"), ensure_ascii=False, indent=1)
print(f"{nuevas} novedades nuevas desde {desde}; {len(nov)} en total")
for n in nov[:nuevas]: print(" ", n["fecha"], n["oposicion"], n["tipo"], n.get("relevancia"), n["id"], n["titulo"][:90])
