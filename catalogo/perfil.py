"""OppositionProfile: perfil declarativo de cada oposición, generado SOLO a partir de datos ya verificados del repositorio.

Lee la ficha oficial (catalogo/oposiciones/<id>.json), el registro de fuentes (datos/fuentes-*.json), los módulos de
preparación genéricos (catalogo/modulos_preparacion.json), el ámbito de cada tema (catalogo/temas_ambito.json), el banco
(datos/preguntas-*.json), los exámenes oficiales (datos/examens-oficials/<id>.json) y las novedades (catalogo/novedades.json),
y escribe catalogo/perfiles/<id>.json. Los motores (cobertura, entrenamiento, simulacro, plan, alertas) leen este perfil:
ninguna oposición tiene datos propios en el código. Este script no inventa nada: si un dato no está en una fuente
verificada, el perfil lo marca como pendiente.

Separación de contenidos (nunca se mezclan):
  CURRENT_CALL / HISTORICAL_CALL · convocatorias (vigente / anteriores con examen oficial publicado)
  OFFICIAL_EXAM · preguntas literales de exámenes oficiales   TESTLEY_GENERATED · preguntas de TestLey publicadas
  REVIEW_REQUIRED · pendientes de revisión (no se sirven)     DEPRECATED / OUTDATED · retiradas

Uso: python3 catalogo/perfil.py [id ...]   (sin argumentos: todas las oposiciones)
"""
import collections, datetime, glob, json, os, re, sys

D = os.path.dirname(os.path.abspath(__file__))
R = os.path.dirname(D)
ESQUEMA = "opposition-profile/1"
SALIDA = os.path.join(D, "perfiles")
NO_SERVIR = {"REVIEW_REQUIRED", "REJECTED", "DEPRECATED", "OUTDATED", "REVIEW_REQUIRED_REEVALUATION"}
RETIRADAS = {"DEPRECATED", "OUTDATED", "REJECTED"}
OBJETIVO_TEMA = 30
# Eventos tipificados de una convocatoria (los genera el vigilante de fuentes y la comparación de perfiles)
EVENTOS = ("CALL_UPDATED", "CALL_DEADLINE_CHANGED", "EXAM_DATE_CHANGED", "NEW_OFFICIAL_DOCUMENT", "NEW_CORRECTION", "NEW_TRIBUNAL_NOTICE")
EVENTO_POR_TIPO = {"correccion": "NEW_CORRECTION", "modificacion": "CALL_UPDATED", "convocatoria": "CALL_UPDATED",
                   "fecha_examen": "NEW_TRIBUNAL_NOTICE", "listas": "NEW_OFFICIAL_DOCUMENT", "aprobados": "NEW_OFFICIAL_DOCUMENT",
                   "nombramiento": "NEW_OFFICIAL_DOCUMENT", "otro": "NEW_OFFICIAL_DOCUMENT"}


def leer(p, defecto=None):
    p = p if os.path.isabs(p) else os.path.join(R, p)
    return json.load(open(p, encoding="utf-8")) if os.path.exists(p) else defecto


def evento_de(novedad):
    """Tipo de evento de una novedad oficial (BOE, DOGC o web del organismo)."""
    return novedad.get("evento") or EVENTO_POR_TIPO.get(novedad.get("tipo"), "NEW_OFFICIAL_DOCUMENT")


def evento_hito(tipo):
    """Evento de un hito del calendario cuya fecha cambia: plazos → CALL_DEADLINE_CHANGED; pruebas → EXAM_DATE_CHANGED."""
    if tipo.startswith(("plazo", "subsanacion")):
        return "CALL_DEADLINE_CHANGED"
    if tipo.startswith(("examen", "prueba")):
        return "EXAM_DATE_CHANGED"
    return "CALL_UPDATED"


def eventos_por_cambio(antes, ahora):
    """Compara dos perfiles: fechas de calendario cambiadas → CALL_DEADLINE_CHANGED / EXAM_DATE_CHANGED; datos oficiales
    cambiados → CALL_UPDATED. Solo describe cambios entre datos ya verificados; no consulta ninguna web."""
    if not antes:
        return []
    ev = []
    previo = {c["tipo"]: c for c in antes.get("calendario", [])}
    for c in ahora.get("calendario", []):
        p = previo.get(c["tipo"])
        if p and p.get("fecha") != c.get("fecha"):
            ev.append({"evento": evento_hito(c["tipo"]), "hito": c["hito"], "antes": p.get("fecha"), "ahora": c.get("fecha")})
    a, b = antes.get("datos_oficiales", {}), ahora.get("datos_oficiales", {})
    for k in sorted(set(a) & set(b)):
        if a[k].get("valor") != b[k].get("valor") and k != "calendario":
            ev.append({"evento": "CALL_UPDATED", "dato": k, "antes": a[k].get("valor"), "ahora": b[k].get("valor")})
    return ev


def registro_fuentes():
    docs = {}
    for f in glob.glob(os.path.join(R, "datos", "fuentes-*.json")):
        for d in (leer(f, {}) or {}).get("documentos", []):
            docs[d["source_url"]] = d
    return docs


def procedencia(f, reg, actualizado):
    """Campos de trazabilidad de una fuente de la ficha (completados con el registro de fuentes si consta)."""
    r = reg.get(f.get("url"), {})
    return {"source_url": f.get("url"), "source_document": f.get("titulo"), "source_type": f.get("tipo"),
            "published_at": f.get("fecha_publicacion") or r.get("published_at"),
            "retrieved_at": f.get("retrieved_at") or r.get("retrieved_at"),
            "verified_at": r.get("verified_at") or actualizado,
            "verification_status": f.get("verification_status") or r.get("verification_status") or "OFFICIAL_VERIFIED",
            "sha256": f.get("sha256") or r.get("sha256"), "texto": f.get("texto")}


def dato_oficial(v, fuentes):
    """Un dato oficial de la ficha con la procedencia de su fuente; las listas se conservan elemento a elemento."""
    if isinstance(v, list):
        return {"valor": [x.get("valor") for x in v], "elementos": [dict(x, fuente=fuentes.get(x.get("fuente"))) for x in v]}
    return {"valor": v.get("valor"), "cita": v.get("cita"), "fuente": fuentes.get(v.get("fuente")),
            "verification_status": v.get("verification_status") or (fuentes.get(v.get("fuente")) or {}).get("verification_status")}


def alcance_oficial(texto_temario, codigo):
    """Subapartados literales del tema en el temario oficial («Tema C.4» … hasta el siguiente tema o ámbito)."""
    if not texto_temario or not codigo:
        return None
    lineas = [l.strip() for l in texto_temario.splitlines()]
    try:
        i = lineas.index(f"Tema {codigo}")
    except ValueError:
        return None
    out = []
    for l in lineas[i + 2:]:
        if l.startswith("Tema ") or l.startswith("Àmbit ") or not l:
            break
        out.append(l)
    return out or None


def texto_oficial(slug):
    """El texto oficial de la ley está incorporado (datos/<slug>-articulos.json o, para las guías no versionadas, su caché)."""
    return bool(slug) and any(os.path.exists(os.path.join(R, "datos", d, f"{slug}-articulos.json")) for d in ("", "cache"))


def cargar_banco():
    """Banco publicado + cola de revisión (datos/candidatas/<ley>.json, siempre REVIEW_REQUIRED: no se sirve)."""
    banco = {}
    for f in glob.glob(os.path.join(R, "datos", "preguntas-*.json")):
        banco[os.path.basename(f)[len("preguntas-"):-len(".json")]] = leer(f, [])
    for f in glob.glob(os.path.join(R, "datos", "candidatas", "*.json")):
        slug = os.path.basename(f)[:-len(".json")]
        banco.setdefault(slug, [])
        banco[slug] = banco[slug] + [dict(q, verification_status="REVIEW_REQUIRED", _cola=True) for q in leer(f, [])]
    return banco


def estado_pregunta(q):
    s = q.get("verification_status")
    if s in RETIRADAS:
        return "DEPRECATED" if s != "OUTDATED" else "OUTDATED"
    if s in NO_SERVIR:
        return "REVIEW_REQUIRED"
    return "TESTLEY_GENERATED"


def construir(oid, banco=None, reg=None, hoy=None):
    o = leer(os.path.join(D, "oposiciones", f"{oid}.json"))
    if o is None:
        raise SystemExit(f"No existe la ficha {oid}")
    hoy = hoy or datetime.date.today().isoformat()
    banco = cargar_banco() if banco is None else banco
    reg = registro_fuentes() if reg is None else reg
    normas = {n["id"]: n for n in leer("catalogo/normas_base.json", [])}
    ambito = leer("catalogo/temas_ambito.json", {})
    modulos = {m["id"]: m for m in leer("catalogo/modulos_preparacion.json", {"modulos": []})["modulos"]}
    fuentes = {k: dict(procedencia(f, reg, o.get("actualizado")), clave=k) for k, f in o["fuentes"].items()}
    datos = {k: dato_oficial(v, fuentes) for k, v in o["oficial"].items() if isinstance(v, (dict, list))}

    # Exámenes oficiales: separados del banco generado (OFFICIAL_EXAM) y origen de las convocatorias históricas
    exo = leer(f"datos/examens-oficials/{oid}.json", {"examenes": []})
    oficiales_por_apartado = collections.Counter(q.get("apartat_guia") for e in exo["examenes"] for q in e["preguntes"])
    historicas = collections.defaultdict(list)
    for e in exo["examenes"]:
        historicas[e.get("convocatoria")].append(e)

    guia_reg = next((d for d in reg.values() if d.get("source_type") == "GUIA_ESTUDI"), None) if o["temario"].get("guia_estudi") else None
    excluir = {(x["ley"], a) for x in o.get("fabrica_excluir", []) for a in x["arts"]}
    pendientes_ley = collections.defaultdict(list)
    for lp in o["temario"].get("leyes_pendientes", []):
        pendientes_ley[lp["tema"]].append({"nombre": lp["ley"], "verification_status": lp["verification_status"], "cita": lp["cita"],
                                           "fuente": fuentes.get(lp["fuente"])})
    texto_temario = None
    ft = fuentes.get(o["temario"].get("fuente"))
    if ft and ft.get("texto") and os.path.exists(os.path.join(R, ft["texto"])):
        texto_temario = open(os.path.join(R, ft["texto"]), encoding="utf-8").read()
    esmenes = correcciones(guia_reg)
    cambiados = set(((guia_reg or {}).get("canvis_darrera_revisio") or {}).get("apartats") or [])

    temas, vistas = [], {}
    for i, t in enumerate(o["temario"]["temas"]):
        codigo = t.get("codigo") or str(t["tema"])
        leyes, articulos, qs = [], [], []
        for nid in t["normas"]:
            n = normas.get(nid, {"slug": None, "nombre": nid})
            amb = ambito.get(f"{oid}#{i}#{n.get('slug')}") or {}
            arts = amb.get("articulos") or []
            publicada = any(not q.get("_cola") for q in banco.get(n.get("slug"), []))
            texto = n.get("tipo") == "guia_oficial" and bool(guia_reg) or texto_oficial(n.get("slug"))  # guía: no versionada, consta en el registro
            leyes.append({"id": nid, "slug": n.get("slug"), "nombre": n["nombre"],
                          "verification_status": "OFFICIAL_VERIFIED" if texto else "OFFICIAL_PENDING_REVIEW",
                          "texto_en_testley": texto, "preguntas_publicadas": publicada, "alcance": amb.get("estado", "sin_precisar")})
            articulos += [dict({"ley": n.get("slug"), "art": a}, **({"excluido": True} if (n.get("slug"), a) in excluir else {})) for a in arts]
            qs += [q for q in banco.get(n.get("slug"), []) if not arts or q.get("art") in arts]
        leyes += [dict(lp, id=None, slug=None, texto_en_testley=False) for lp in pendientes_ley.get(codigo, [])]
        est = collections.Counter(estado_pregunta(q) for q in qs)
        vivas = [q for q in qs if estado_pregunta(q) == "TESTLEY_GENERATED"]
        usadas = collections.Counter(q.get("art") for q in vivas)
        n_ofi = sum(c for a, c in oficiales_por_apartado.items() if a and (a == codigo or str(a).startswith(codigo + ".")))
        vistas.update({(q.get("id") or id(q)): estado_pregunta(q) for q in qs})
        fechas = [q.get("estado_desde") for q in qs if q.get("estado_desde")]
        if not t["normas"]:
            cob = "SIN_FUENTE_OFICIAL"
        elif not vivas:
            cob = "SIN_PREGUNTAS"
        elif len(vivas) < OBJETIVO_TEMA:
            cob = "PARCIAL"
        else:
            cob = "CUBIERTO"
        temas.append({
            "id": codigo, "numero": t["tema"], "titulo": t["titulo"], "bloque": t.get("bloque"), "tipo": t.get("tipo"),
            "alcance_oficial": alcance_oficial(texto_temario, t.get("codigo")),
            "fuente": ft, "documentos": [l for l in leyes if l.get("id")], "leyes": leyes,
            "leyes_pendientes": [l for l in leyes if l["verification_status"] != "OFFICIAL_VERIFIED"],
            "articulos": [dict(a, preguntas=usadas.get(a["art"], 0)) for a in articulos],
            "cobertura": cob, "objetivo": OBJETIVO_TEMA if t["normas"] else 0,
            "preguntas": {"TESTLEY_GENERATED": len(vivas), "OFFICIAL_EXAM": n_ofi, "REVIEW_REQUIRED": est["REVIEW_REQUIRED"],
                          "DEPRECATED": est["DEPRECATED"], "OUTDATED": est["OUTDATED"]},
            "dificultad": dict(sorted(collections.Counter(str(q.get("dif", "?")) for q in vivas).items())),
            "tipos": dict(sorted(collections.Counter(q.get("tipo") or "sin_tipo" for q in vivas).items())),
            "ultima_actualizacion": max([o.get("actualizado") or ""] + fechas) or None,
            "cambios_recientes": [e for e in esmenes if e["tema"] == codigo] +
                                 [{"apartat": a, "tipo": "APARTAT_CANVIAT"} for a in sorted(cambiados) if a.startswith(codigo + ".")],
        })

    total = collections.Counter(vistas.values())  # cada pregunta una vez aunque su ley esté en varios temas
    estructura = o["examen"].get("estructura") or []
    sim = dict(o["examen"].get("simulacro") or {})
    pesos = distribucion(temas, oficiales_por_apartado)
    sim.update({"distribucion": pesos["pesos"], "distribucion_origen": pesos["origen"], "reserva": 0.5, "evitar_repetidas": True,
                "incluye_OFFICIAL_EXAM": bool(exo["examenes"]), "incluye_TESTLEY_GENERATED": True})

    mods = []
    for m in o.get("preparacion_modulos") or []:
        base = modulos.get(m["modulo"])
        if not base:
            continue
        claves = m.get("oficial") or []
        claves = [claves] if isinstance(claves, str) else claves
        mods.append(dict(base, parte_oficial=m.get("estructura"),
                         datos_oficiales={k: datos[k] for k in claves if k in datos}))

    perfil = {
        "schema": ESQUEMA, "id": oid, "nombre": o["nombre"], "organismo": o["organismo"], "administracion": o["administracion"],
        "ambito": o["ambito"], "territorio": o.get("territorio"), "grupo": o.get("grupo"), "categoria": o["categoria"],
        "generado": hoy, "ficha_actualizada": o.get("actualizado"),
        "convocatoria": {
            "actual": {"estado": "CURRENT_CALL" if o["estado"] == "activa" else "SIN_CONVOCATORIA_VIGENTE", "codigo": o.get("convocatoria_registro"),
                       "documento": fuentes.get("convocatoria"), "seguir": f"{o['nombre'].split(' · ')[0]} {o.get('convocatoria_registro') or ''}".strip()},
            "historicas": [{"estado": "HISTORICAL_CALL", "codigo": c, "examenes": [e["id"] for e in es],
                            "fuente": es[0].get("pagina"), "documentos": [e.get("font") for e in es]} for c, es in sorted(historicas.items()) if c],
        },
        "contenido": {"OFFICIAL_EXAM": sum(len(e["preguntes"]) for e in exo["examenes"]), "TESTLEY_GENERATED": total["TESTLEY_GENERATED"],
                      "REVIEW_REQUIRED": total["REVIEW_REQUIRED"], "DEPRECATED": total["DEPRECATED"], "OUTDATED": total["OUTDATED"],
                      "nota": "OFFICIAL_EXAM y TESTLEY_GENERATED son bancos separados: nunca se mezclan en un examen oficial ni cuentan como cobertura uno del otro."},
        "fuentes": list(fuentes.values()),
        "datos_oficiales": datos,
        "temario": temas,
        "guia": {"documento": {k: guia_reg.get(k) for k in ("source_url", "source_document", "published_at", "retrieved_at", "verified_at", "verification_status", "sha256")} if guia_reg else None,
                 "correcciones": esmenes},
        "examen": {"estructura": estructura, "oficial": o["examen"].get("oficial"), "simulacro": sim},
        "modulos": mods,
        "calendario": [{k: c.get(k) for k in ("fecha", "hito", "tipo", "caracter", "cita")} | {"fuente": fuentes.get(c.get("fuente"))}
                       for c in o["oficial"].get("calendario", [])],
        "alertas": {"fuentes": sorted({"BOE"} | ({"DOGC", "WEB_ORGANISMO"} if (o.get("vigilancia") or {}).get("web") else set())),
                    "eventos": list(EVENTOS), "recientes": novedades(oid)},
        "pendientes": o.get("pendientes", []),
    }
    return perfil


def correcciones(guia_reg):
    """Esmenes oficiales de la guía con su valor ORIGINAL, la CORRECTION y el CURRENT_VALUE aplicado."""
    if not guia_reg:
        return []
    sys.path.insert(0, R)
    from ingesta import gencat as G
    log = {(e["tema"], e["lloc"]): e for e in guia_reg.get("esmenes") or []}
    out = []
    for e in G.ESMENES:
        l = log.get((e["tema"], e["lloc"]), {})
        aplicada = l.get("estado") == "aplicada"
        out.append({"tema": e["tema"], "lloc": e["lloc"], "ORIGINAL": e["on_diu"], "CORRECTION": e["ha_de_dir"],
                    "CURRENT_VALUE": e["ha_de_dir"] if aplicada else e["on_diu"], "aplicada_a": l.get("aplicada_a", []),
                    "estado": "aplicada" if aplicada else "OFFICIAL_PENDING_REVIEW", "fuente": G.GUIA["esmenes_url"], "fecha": "2026-09"})
    return out


def distribucion(temas, oficiales_por_apartado):
    """Pesos por tema para el simulacro: proporción real de preguntas por tema en los exámenes oficiales si los hay;
    si no, reparto uniforme entre los temas con fuente oficial."""
    con_fuente = [t for t in temas if t["documentos"]]
    if sum(oficiales_por_apartado.values()):
        n = {t["id"]: t["preguntas"]["OFFICIAL_EXAM"] for t in con_fuente}
        tot = sum(n.values())
        if tot:
            return {"origen": "OFFICIAL_EXAM", "pesos": {k: round(v / tot, 4) for k, v in n.items() if v}}
    return {"origen": "UNIFORME", "pesos": {t["id"]: round(1 / len(con_fuente), 4) for t in con_fuente} if con_fuente else {}}


def novedades(oid, n=10):
    nov = [x for x in leer("catalogo/novedades.json", []) if x.get("oposicion") == oid]
    nov.sort(key=lambda x: (x.get("fecha") or "", x.get("id")), reverse=True)
    return [{"evento": evento_de(x), "fecha": x.get("fecha"), "titulo": x.get("titulo"), "url": x.get("url"), "fuente": x.get("fuente", "BOE"),
             "verification_status": x.get("verification_status", "OFFICIAL_VERIFIED")} for x in nov[:n]]


def escribir(perfil):
    os.makedirs(SALIDA, exist_ok=True)
    f = os.path.join(SALIDA, f"{perfil['id']}.json")
    antes = leer(f)
    cambios = eventos_por_cambio(antes, perfil)
    if antes:
        perfil["eventos_por_cambio"] = cambios + [e for e in antes.get("eventos_por_cambio", []) if e not in cambios][:20]
        if {k: v for k, v in antes.items() if k not in ("generado", "eventos_por_cambio")} == \
           {k: v for k, v in perfil.items() if k not in ("generado", "eventos_por_cambio")} and not cambios:
            return f, []  # sin cambios: no se reescribe (sin ruido de fechas)
    with open(f, "w", encoding="utf-8") as fh:
        fh.write(json.dumps(perfil, ensure_ascii=False, indent=1) + "\n")
    return f, cambios


def todas():
    return [os.path.basename(p)[:-5] for p in sorted(glob.glob(os.path.join(D, "oposiciones", "*.json")))]


if __name__ == "__main__":
    banco, reg = cargar_banco(), registro_fuentes()
    for oid in sys.argv[1:] or todas():
        p = construir(oid, banco, reg)
        f, ev = escribir(p)
        c = p["contenido"]
        print(f"{oid}: {len(p['temario'])} temas · {c['TESTLEY_GENERATED']} TESTLEY_GENERATED · {c['OFFICIAL_EXAM']} OFFICIAL_EXAM · "
              f"{c['REVIEW_REQUIRED']} REVIEW_REQUIRED · {len(p['modulos'])} módulos" + (f" · eventos {[e['evento'] for e in ev]}" if ev else ""))
