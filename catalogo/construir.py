"""Construye catalogo/oposiciones.json y catalogo/normas.json.
- Temarios: copiados literalmente de la convocatoria oficial guardada en catalogo/fuentes/.
- Asignación tema -> normas: 'explicita' si el tema cita la norma por su nombre; 'inferida' si se deduce
  por la materia (revisable). Los temas de ofimática/informática son 'no_legislativo'.
Uso: python3 catalogo/construir.py
"""
import json, re, os
D = os.path.dirname(os.path.abspath(__file__))
NORMAS = {n["id"]: n for n in json.load(open(os.path.join(D, "normas_base.json")))}
PUBLICADAS = {"BOE-A-2015-10565": "ley-39-2015"}   # normas con test en la web

# (regex sobre el título del tema, [normas], explícita?)
REGLAS = [
    (r"Constituci[oó]n Espa[nñ]ola", ["BOE-A-1978-31229"], True),
    (r"Corona|Cortes Generales|Congreso|Senado|reforma de la Constituci|Derechos y deberes fundamentales|Comunidades Aut[oó]nomas|Estatutos de Autonom", ["BOE-A-1978-31229"], False),
    (r"Tribunal Constitucional", ["BOE-A-1978-31229", "BOE-A-1979-23709"], False),
    (r"Defensor del Pueblo", ["BOE-A-1981-10325"], False),
    (r"Poder Judicial|poder judicial|organizaci[oó]n judicial", ["BOE-A-1978-31229", "BOE-A-1985-12666"], False),
    (r"Presidente del Gobierno|Consejo de Ministros|poder ejecutivo|El Gobierno y la Administraci", ["BOE-A-1978-31229", "BOE-A-1997-25336"], False),
    (r"Ley 19/2013", ["BOE-A-2013-12887"], True),
    (r"Administraci[oó]n General del Estado\. |sector p[uú]blico institucional", ["BOE-A-2015-10566"], False),
    (r"Administraci[oó]n local|municipio", ["BOE-A-1985-5392"], False),
    (r"Procedimiento Administrativo Com[uú]n", ["BOE-A-2015-10565"], True),
    (r"R[eé]gimen Jur[ií]dico del Sector P[uú]blico", ["BOE-A-2015-10566"], True),
    (r"acto administrativo|silencio administrativo|derechos de los ciudadanos en el procedimiento", ["BOE-A-2015-10565"], False),
    (r"contencioso-administrativ", ["BOE-A-1998-16718"], False),
    (r"responsabilidad patrimonial", ["BOE-A-2015-10566", "BOE-A-2015-10565"], False),
    (r"protecci[oó]n de datos", ["BOE-A-2018-16673"], False),
    (r"Estatuto B[aá]sico del Empleado P[uú]blico", ["BOE-A-2015-11719"], True),
    (r"personal funcionario|funcionarios|personal al servicio|empleados p[uú]blicos|Selecci[oó]n de personal|Provisi[oó]n de puestos", ["BOE-A-2015-11719"], False),
    (r"[Ii]ncompatibilidades", ["BOE-A-1985-151"], False),
    (r"[Pp]resupuest", ["BOE-A-2003-21614"], False),
    (r"igualdad y contra la violencia de g[eé]nero", ["BOE-A-2007-6115", "BOE-A-2004-21760"], False),
    (r"LGTBI", ["BOE-A-2023-5366"], False),
    (r"Discapacidad y dependencia", ["BOE-A-2013-12632", "BOE-A-2006-21990"], False),
    (r"contratos del sector p[uú]blico|Contratos del Sector P[uú]blico", ["BOE-A-2017-12902"], False),
    (r"[Ss]ubvenciones", ["BOE-A-2003-20977"], False),
]
NO_LEG = r"Inform[aá]tica|Windows|Word 365|Excel 365|Access 365|Outlook 365|Red Internet|hardware"

def clasificar(titulo):
    normas, explicitas = [], []
    for rx, ids, exp in REGLAS:
        if re.search(rx, titulo):
            for i in ids:
                if i not in normas: normas.append(i)
                if exp and i not in explicitas: explicitas.append(i)
    if re.search(NO_LEG, titulo): return "no_legislativo", [], []
    if not normas: return "legislativo_generico", [], []
    return "legislativo", normas, explicitas

def temario(texto, ini, fin):
    s = texto[ini:fin].replace("\u2003", " ").replace("\xa0", " ")
    s = s[s.find("Programa"):]
    s = re.sub(r"\n(hardware|software)\n", r" \1 ", s)
    bloques, temas, bloque = [], [], None
    for linea in s.split("\n"):
        linea = linea.strip()
        m = re.match(r"^([IVX]+)\. (.+)$", linea)
        if m: bloque = f"{m.group(1)}. {m.group(2)}"; continue
        m = re.match(r"^(\d+)\. (.+)$", linea)
        if m and bloque and temas and int(m.group(1)) != temas[-1]["tema"] + 1 and not (temas[-1]["bloque"] != bloque): break
        if m and bloque:
            tipo, normas, exp = clasificar(m.group(2))
            temas.append({"bloque": bloque, "tema": int(m.group(1)), "titulo": m.group(2), "tipo": tipo, "normas": normas,
                          "asignacion": {n: ("explicita" if n in exp else "inferida") for n in normas}})
        if re.match(r"^\d+\.\d", linea) or linea.startswith("ANEXO"): 
            if temas: break
    return temas

conv = open(os.path.join(D, "fuentes", "BOE-A-2025-26262.txt")).read()
def anexo(nombre):
    a = conv.find("ANEXO " + nombre + "\n"); b = conv.find("\nANEXO ", a + 10)
    return a, b
URL = "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2025-26262"
BASE = {"referencia": "Resolución de 18 de diciembre de 2025, de la Secretaría de Estado de Función Pública (BOE-A-2025-26262)",
        "fecha_publicacion": "2025-12-22", "url_oficial": URL, "estado": "convocada"}
OPOS = [
    ("age-auxiliar-administrativo-c2", "Cuerpo General Auxiliar de la Administración del Estado", "C2", "I"),
    ("age-administrativo-c1", "Cuerpo General Administrativo de la Administración del Estado", "C1", "III"),
    ("age-gestion-a2", "Cuerpo de Gestión de la Administración Civil del Estado", "A2", "VII"),
]
opos = []
for oid, nombre, grupo, an in OPOS:
    a, b = anexo(an)
    txt = conv[a:b].replace("\n", " ")
    plazas = int(re.search(r"será de\s+([\d\.]+)\s*plazas", txt).group(1).replace(".", ""))
    opos.append({"id": oid, "nombre": nombre, "ambito": "estatal", "administracion": "AGE", "grupo": grupo,
                 "convocatoria": dict(BASE, anexo=an, plazas=plazas, turno="libre"),
                 "temario": temario(conv, a, b), "fuente_temario": URL, "verificado": "2026-09-28", "notas": ""})

# Normas: a qué oposiciones y temas afectan + prioridad
normas = []
for nid, n in NORMAS.items():
    usos = [(o, t) for o in opos for t in o["temario"] if nid in t["normas"]]
    ops = sorted({o["id"] for o, _ in usos})
    peso = sum(o["convocatoria"]["plazas"] * (1.5 if o["convocatoria"]["estado"] == "convocada" else 1)
               for o in opos if o["id"] in ops)
    normas.append(dict(n, fuente=f"https://raw.githubusercontent.com/legalize-dev/legalize-es/main/es/{nid}.md",
                       estado_testley="publicada" if nid in PUBLICADAS else "pendiente",
                       oposiciones=ops, temas=len(usos), prioridad=round(peso * len(usos) / max(1, len(ops)))))
normas.sort(key=lambda x: (x["estado_testley"] != "pendiente", -x["prioridad"]))

# Cobertura legislativa por oposición
for o in opos:
    leg = [t for t in o["temario"] if t["tipo"] != "no_legislativo"]
    cub = sum(len([n for n in t["normas"] if n in PUBLICADAS]) / len(t["normas"]) for t in leg if t["normas"])
    o["cobertura"] = {"temas_total": len(o["temario"]), "temas_legislativos": len(leg),
                      "temas_no_legislativos": len(o["temario"]) - len(leg),
                      "pct_legislativo_cubierto": round(100 * cub / max(1, len(leg)), 1)}

json.dump(opos, open(os.path.join(D, "oposiciones.json"), "w"), ensure_ascii=False, indent=1)
json.dump(normas, open(os.path.join(D, "normas.json"), "w"), ensure_ascii=False, indent=1)
for o in opos: print(o["id"], o["convocatoria"]["plazas"], "plazas,", o["cobertura"])
print("\nCola de normas (prioridad):")
for n in normas[:12]: print(f'  {n["prioridad"]:>7}  {n["estado_testley"]:9}  {n["nombre"]}  ({n["temas"]} temas)')
