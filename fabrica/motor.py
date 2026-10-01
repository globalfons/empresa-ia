"""Fábrica de preguntas de TestLey: produce lotes pequeños de preguntas propias a partir del texto oficial del BOE.

Flujo de cada lote: cobertura (scripts/brecha_preguntas.py) → temas y artículos con déficit → generación (Opus) →
validación determinista → duplicados → juez (Haiku) → VALID al banco / REVIEW_REQUIRED y REJECTED a la cola → métricas.
Se detiene sola (GENERATION_PAUSED) si la calidad o el coste se salen de los límites de fabrica/config.json.
Reanudable: cada ejecución recalcula el déficit desde los ficheros, así que continúa donde terminó la anterior.

Uso:
  python3 -m fabrica.motor --dry-run --oposicion auxiliar-administrativo-age --lotes 3
  python3 -m fabrica.motor --oposicion auxiliar-administrativo-age --lote 10 --objetivo 50 --lotes 5
  python3 -m fabrica.motor --simulado ...     (sin API: preguntas deterministas, solo para probar el circuito)
  python3 -m fabrica.motor --reanudar ...     (levanta una pausa después de corregir su causa)
"""
import argparse, collections, datetime, json, os, sys, time

R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, R)
sys.path.insert(0, os.path.join(R, "scripts"))
import brecha_preguntas as BR  # noqa: E402
from fabrica import fuente as F, validacion as V, generador as G, banco as B, metricas as M, politica as P  # noqa: E402

CFG = os.path.join(R, "fabrica", "config.json")
ESTADO = os.path.join(R, "fabrica", "estado", "estado.json")
ORIGEN = "Generada por la fábrica de TestLey (IA) a partir del texto consolidado del BOE y validada automáticamente"
ORIGEN_GUIA = "Generada por la fábrica de TestLey (IA) a partir de la Guia d'estudi oficial de la Generalitat y validada automáticamente"


def hoy():
    return datetime.date.today().isoformat()


def coste(uso, cfg):
    pe, ps = cfg["precios_usd_mtok"].get(uso["modelo"], cfg["precios_usd_mtok"][cfg["modelos"]["generador"]])
    return (uso["entrada"] * pe + uso["salida"] * ps) / 1e6


# ---------- Planificación (qué temas y artículos) ----------
def objetivo_de(fuentes, cfg):
    c = cfg["cobertura"]

    def f(oid, i, leyes):
        cap = sum(fuentes.ley(L["ley"]).capacidad(n, cfg) for L in leyes for n in dict.fromkeys(L["articulos_ambito"]) if fuentes.ley(L["ley"]))
        return min(c["objetivo_tema_max"], cap)  # 100–200 si el contenido lo permite; menos si no da para más sin forzar
    return f


def resolver_oposiciones(valor, cfg):
    if not valor or valor == "todas":
        return list(cfg["oposiciones_prioridad"])
    ids = [cfg["alias_oposicion"].get(v.strip(), v.strip()) for v in valor.split(",")]
    conocidas = {o["id"] for o in json.load(open(os.path.join(R, "catalogo", "oposiciones.json"), encoding="utf-8"))}
    for i in ids:
        if i not in conocidas:
            raise SystemExit(f"Oposición desconocida: {i}")
    return ids


def planificar(cfg, fuentes, oposiciones):
    salida = BR.calcular(objetivo_de(fuentes, cfg))
    prio = {o: k for k, o in enumerate(oposiciones)}
    temas = [t for t in salida["temas"] if t["oposicion"] in prio and t["faltan"] > 0]
    for t in temas:
        t["arts"] = {L["ley"]: list(dict.fromkeys(L["_arts"])) for L in t["leyes"]}
        t["prio"] = prio[t["oposicion"]]
    sin = [t for t in salida["temas_sin_fuente"] if t["oposicion"] in prio]
    return temas, sin


def orden_temas(temas):
    # 1) temas sin preguntas, 2) menor cobertura relativa, 3) prioridad de la oposición, 4) orden del temario
    return sorted([t for t in temas if t["faltan"] > 0],
                  key=lambda t: (t["preguntas"] > 0, t["preguntas"] / max(1, t["objetivo"]), t["prio"], t["indice"]))


def elegir(temas, fuentes, banco, cfg, tamano, usados):
    """Reparte el lote entre temas (ronda) y, en cada tema, el artículo menos cubierto de su ámbito."""
    slots, total, lc = [], 0, cfg["lote"]
    pendiente = {id(t): t["faltan"] for t in temas}
    progreso = True
    while total < tamano and progreso:
        progreso = False
        for t in orden_temas(temas):
            if total >= tamano:
                break
            if pendiente[id(t)] <= 0:
                continue
            mejor = None
            for slug, arts in t["arts"].items():
                ley = fuentes.ley(slug)
                if not ley:
                    continue
                for pos, n in enumerate(arts):
                    cap = ley.capacidad(n, cfg)
                    ya = banco.cuenta(slug, n) + sum(s["k"] for s in slots if (s["slug"], s["n"]) == (slug, n))
                    if cap <= ya or banco.rechazos(slug, n) >= lc["max_rechazos_por_articulo"] or (slug, n) in usados:
                        continue
                    clave = (ya > 0, ya / cap, pos)
                    if mejor is None or clave < mejor[0]:
                        mejor = (clave, slug, n, cap - ya)
            if not mejor:
                pendiente[id(t)] = 0
                continue
            _, slug, n, libre = mejor
            k = min(lc["max_preguntas_por_llamada"], libre, pendiente[id(t)], tamano - total)
            slots.append({"tema": t, "slug": slug, "n": n, "k": k})
            usados.add((slug, n))
            pendiente[id(t)] -= k
            total += k
            progreso = True
    return slots


def pedir_tipos(ley, n, k, cuenta_tipos, cuenta_dif, cfg, dist):
    posibles = ley.tipos_posibles(n)
    total = sum(cuenta_dif.values()) + 1
    out = []
    for _ in range(k):
        # la dificultad con más déficit respecto a la distribución objetivo; dentro, el tipo menos usado
        for d in sorted((1, 2, 3), key=lambda d: cuenta_dif[d] - dist[str(d)] * total):
            tipos = [t for t in posibles if cfg["tipos"][t]["dif"] == d and not (
                t == "caso_practico" and cuenta_tipos["caso_practico"] + 1 > cfg["max_proporcion_caso_practico"] * max(10, total))]
            if tipos:
                t = min(tipos, key=lambda x: (cuenta_tipos[x], x))
                out.append({"tipo": t, "dif": d})
                cuenta_tipos[t] += 1; cuenta_dif[d] += 1; total += 1
                break
    return out


# ---------- Validación común (API y sesión): controles deterministas + duplicados, y veredictos del juez ----------
def validar_candidatas(slot, cands, fuentes, banco, cfg):
    """Devuelve (res, parecidas, idx): res = [[q, problemas, dup]]; idx = las que pasan al juez semántico."""
    ley, n, t = fuentes.ley(slot["slug"]), slot["n"], slot["tema"]
    existentes = banco.existentes(slot["slug"], n)
    tema_arts = set(t["arts"].get(slot["slug"], []))
    res, aceptadas, parecidas = [], [], {}
    for pos, q in enumerate(cands):  # id provisional: el juez puede señalar duplicados dentro del propio lote
        if isinstance(q, dict):
            q.setdefault("id", f"nueva:{slot['slug']}:{n}:{pos}")
    for pos, q in enumerate(cands):
        if pos >= slot["k"]:  # nunca se descartan en silencio: quedan registradas como rechazadas
            res.append([q, [("REJECTED", "más preguntas de las pedidas para este artículo")], None]); continue
        probs = V.comprobar(q, ley, n, tema_arts, cfg)
        dup, did, sosp = V.duplicado(q, existentes + aceptadas, cfg) if isinstance(q.get("o"), list) and isinstance(q.get("a"), int) else (None, None, [])
        if dup in ("exacto", "lexico"):
            probs.append(("REJECTED", f"duplicado {dup} de {did}"))
        if not any(e == "REJECTED" for e, _ in probs):
            parecidas[len(res)] = sosp
            aceptadas.append(q)
        res.append([q, probs, dup])
    idx = [i for i, (_, p, _) in enumerate(res) if not any(e == "REJECTED" for e, _ in p)]
    return res, parecidas, idx


def aplicar_veredictos(res, idx, ver):
    """ver: lista de {i, respaldada, unica, clara, duplicada_de, motivo} (i = posición dentro de idx) o None."""
    por_i = {v.get("i"): v for v in (ver or []) if isinstance(v, dict)}
    for k, i in enumerate(idx):
        v = por_i.get(k)
        if v is None:
            res[i][1].append(("REVIEW_REQUIRED", "el juez no devolvió veredicto"))
        elif v.get("duplicada_de"):
            res[i][1].append(("REJECTED", f"duplicado semántico de {v['duplicada_de']}")); res[i][2] = "semantico"
        elif not (v.get("respaldada") and v.get("unica") and v.get("clara")):
            res[i][1].append(("REVIEW_REQUIRED", "juez: " + str(v.get("motivo") or "respuesta no respaldada, no única o ambigua")[:200]))
    salida = []
    for q, probs, dup in res:
        estado = "REJECTED" if any(e == "REJECTED" for e, _ in probs) else "REVIEW_REQUIRED" if probs else "VALID"
        salida.append((estado, q, [m for _, m in probs], dup))
    return salida


# ---------- Una llamada a la API: generar, validar, juzgar ----------
def procesar(slot, prov, fuentes, banco, cfg, pedidas, pol):
    ley, n, t = fuentes.ley(slot["slug"]), slot["n"], slot["tema"]
    existentes = banco.existentes(slot["slug"], n)
    relacionados = ley.relacionados(n) if any(p["tipo"] == "relacion_articulos" for p in pedidas) else []
    usos, incid = [], []
    try:
        cands, uso = prov.generar(G.prompt_generacion(ley, n, pedidas, existentes, t["titulo"], relacionados))
    except Exception as e:  # red, límite de uso, JSON inválido… se registra y el lote sigue
        return [], [], [f"generación {slot['slug']} art. {n}: {type(e).__name__}"]
    usos.append(uso)
    if uso.get("incidencia"):
        incid.append(f"{slot['slug']} art. {n}: {uso['incidencia']}")
    res, parecidas, idx = validar_candidatas(slot, cands, fuentes, banco, cfg)
    ver = None
    if idx:  # juez semántico barato solo para las que pasaron los controles deterministas
        try:
            ver, uso_j = prov.juzgar(G.prompt_juez(ley, n, [res[i][0] for i in idx], {k: parecidas.get(i, []) for k, i in enumerate(idx)},
                                                   pol["componentes"]["criterios_api"]), pol["componentes"]["sistema"])
            usos.append(uso_j)
            por_i = {v.get("i"): v for v in (ver or []) if isinstance(v, dict)}
            for k, i in enumerate(idx):  # veredicto del juez de cada pregunta, para su trazabilidad (no se publica)
                res[i][0]["_veredicto"] = por_i.get(k)
        except Exception as e:
            incid.append(f"juez {slot['slug']} art. {n}: {type(e).__name__}")
    return aplicar_veredictos(res, idx, ver), usos, incid


def ficha(q, estado, motivos, ley, n, slot, modelos, lote, cfg, generador="fabrica-v1", traza=None):
    f = {"art": n, "q": q.get("q"), "o": q.get("o"), "a": q.get("a"), "cita": q.get("cita"), "dif": q.get("dif"), "exp": q.get("exp"),
         "tipo": q.get("tipo"), "procedencia": "TESTLEY_GENERATED", "origen": ORIGEN_GUIA if getattr(ley, "tipo", "") == "guia_oficial" else ORIGEN, "generador": generador,
         "modelo": modelos.get("generador"), "juez": modelos.get("juez"), "lote": lote,
         "tema_objetivo": f"{slot['tema']['oposicion']}#{slot['tema']['indice']}", "fuente_url": ley.url,
         "creada_el": hoy(), "verificada_contra": ley.version, "verificada_el": hoy()}
    if q.get("apartado"):
        f["apartado"] = q["apartado"]
    if q.get("tipo") in cfg["tipos"] and isinstance(q.get("dif"), int):
        f["dif"] = V.dificultad(q, cfg)
    if estado != "VALID":
        f.update(verification_status=estado, motivo="; ".join(motivos)[:500], estado_desde=hoy())
    if traza is not None:  # metadatos de auditoría (solo admin: build.mjs no los exporta a la web)
        f["traza"] = traza
    return f


def traza_api(q, estado, ley, n, slot, modelos, lote, pol):
    v = q.get("_veredicto")
    juicio = ("NO_JUZGADA (rechazada por la validación determinista)" if "_veredicto" not in q else "SIN_VEREDICTO" if v is None
              else "REJECTED" if v.get("duplicada_de") else "VALID" if v.get("respaldada") and v.get("unica") and v.get("clara") else "REVIEW_REQUIRED")
    ahora = datetime.datetime.now().isoformat(timespec="seconds")
    return {"batch_id": lote, "session_id": os.environ.get("GITHUB_RUN_ID", "local"), "opposition_id": slot["tema"]["oposicion"],
            "topic_id": f"{slot['tema']['oposicion']}#{slot['tema']['indice']}", "article": n, "source_document": ley.id, "source_url": ley.url,
            "source_version": ley.version, "generator": "fabrica-v1", "generator_model": modelos.get("generador"),
            "generator_prompt_version": "generador-api-v1", "judge": "juez API", "judge_model": modelos.get("juez"),
            "judge_policy_version": pol["version"], "judge_policy_sha256": pol["sha256"], "judge_verdict": juicio,
            "judge_flags": {k: v.get(k) for k in ("respaldada", "unica", "clara", "duplicada_de")} if v else None,
            "judge_reason": (v or {}).get("motivo", ""), "validation_status": estado, "created_at": ahora, "validated_at": ahora,
            "reviewed_at": None, "published_at": ahora if estado == "VALID" else None}


# ---------- Reglas de parada ----------
def comprobar_calidad(estado, cfg):
    lc, ult = cfg["lote"], estado["lotes"][-1]
    if ult["generadas"] and ult["REJECTED"] / ult["generadas"] > lc["max_rechazo"]:
        return f"tasa de rechazo {ult['REJECTED']}/{ult['generadas']} en {ult['id']} (> {lc['max_rechazo']:.0%})"
    ven = [x for x in estado["lotes"][-lc["ventana_lotes"]:] if x.get("modo") in ("real", "sesion")]
    gen = sum(x["generadas"] for x in ven)
    if len(ven) >= 3 and gen:
        if sum(x["REVIEW_REQUIRED"] for x in ven) / gen > lc["max_revision_ventana"]:
            return f"demasiadas preguntas a revisión en los últimos {len(ven)} lotes"
        if sum(x["duplicadas"] for x in ven) / gen > lc["max_duplicados_ventana"]:
            return f"demasiados duplicados en los últimos {len(ven)} lotes"
        val = sum(x["VALID"] for x in ven)
        if val and sum(x["coste_usd"] for x in ven) / val > lc["max_coste_por_valida_usd"]:
            return f"coste por pregunta válida por encima de {lc['max_coste_por_valida_usd']} USD"
    return None


def main(argv=None):
    ap = argparse.ArgumentParser(description="Fábrica de preguntas de TestLey")
    ap.add_argument("--oposicion", default="todas", help="id o alias (auxiliar-administrativo-age…), varios con comas, o «todas»")
    ap.add_argument("--lote", type=int, default=None, help="preguntas por lote (por defecto el tamaño inicial de config)")
    ap.add_argument("--objetivo", type=int, default=50, help="preguntas VALID nuevas en esta ejecución")
    ap.add_argument("--lotes", type=int, default=5, help="máximo de lotes en esta ejecución")
    ap.add_argument("--max-coste", type=float, default=5.0, help="tope de coste estimado de la ejecución (USD)")
    ap.add_argument("--dry-run", action="store_true", help="simula la selección sin llamar a la API ni tocar el banco")
    ap.add_argument("--simulado", action="store_true", help="proveedor simulado (sin API) para probar el circuito")
    ap.add_argument("--reanudar", action="store_true", help="levanta la pausa anterior")
    ap.add_argument("--simulado-fallos", type=float, default=0.0, help=argparse.SUPPRESS)  # tests: proporción de preguntas defectuosas
    ap.add_argument("--informe", help="fichero JSON donde guardar el informe de la ejecución")
    a = ap.parse_args(argv)
    cfg = json.load(open(CFG, encoding="utf-8"))
    tamano = max(1, min(a.lote or cfg["lote"]["tamano_inicial"], cfg["lote"]["tamano_maximo"]))
    estado = B.leer(ESTADO, {"lotes": [], "pausa": None})
    if estado.get("pausa") and not a.reanudar and not a.dry_run:
        print(f"GENERATION_PAUSED desde {estado['pausa']['fecha']}: {estado['pausa']['motivo']}. Corrige la causa y usa --reanudar.")
        return 3
    if a.reanudar and estado.get("pausa"):
        estado.setdefault("pausas_levantadas", []).append(dict(estado["pausa"], levantada=hoy()))
        estado["pausa"] = None
    oposiciones = resolver_oposiciones(a.oposicion, cfg)
    fuentes, banco = F.Fuentes(), B.Banco()
    temas, sin_fuente = planificar(cfg, fuentes, oposiciones)
    dist = cfg["dificultad_por_oposicion"].get(oposiciones[0], cfg["dificultad_por_defecto"]) if len(oposiciones) == 1 else cfg["dificultad_por_defecto"]
    informe = {"fecha": datetime.datetime.now().isoformat(timespec="seconds"), "oposiciones": oposiciones, "modo": "dry-run" if a.dry_run else "simulado" if a.simulado else "real",
               "temas_con_deficit": len(temas), "deficit_total": sum(t["faltan"] for t in temas),
               "temas_sin_fuente": [f"{t['oposicion']} T{t['tema']}: {t['motivo']}" for t in sin_fuente], "lotes": []}
    print(f"Oposiciones: {', '.join(oposiciones)} · temas con déficit: {len(temas)} · faltan {informe['deficit_total']} preguntas hasta el objetivo por tema")
    usados = set()
    if a.dry_run:
        for k in range(a.lotes):
            slots = elegir(temas, fuentes, banco, cfg, tamano, usados)
            if not slots:
                break
            for s in slots:
                s["tema"]["faltan"] -= s["k"]; s["tema"]["preguntas"] += s["k"]
            lote = [{"oposicion": s["tema"]["oposicion"], "tema": s["tema"]["tema"], "ley": s["slug"], "art": s["n"], "preguntas": s["k"]} for s in slots]
            ley_palabras = sum(fuentes.ley(s["slug"]).palabras(s["n"]) for s in slots)
            est = {"modelo": cfg["modelos"]["generador"], "entrada": int(len(slots) * 1800 + ley_palabras * 1.6), "salida": sum(s["k"] for s in slots) * 700}
            est_j = {"modelo": cfg["modelos"]["juez"], "entrada": int(len(slots) * 900 + ley_palabras * 1.6), "salida": sum(s["k"] for s in slots) * 90}
            informe["lotes"].append({"lote": k + 1, "preguntas": sum(s["k"] for s in slots), "coste_estimado_usd": round(coste(est, cfg) + coste(est_j, cfg), 4), "articulos": lote})
            print(f"  lote {k + 1}: {sum(s['k'] for s in slots)} preguntas en {len(slots)} artículos · coste estimado {informe['lotes'][-1]['coste_estimado_usd']} USD")
            for x in lote:
                print(f"    {x['oposicion']} T{x['tema']} · {x['ley']} art. {x['art']} × {x['preguntas']}")
        if a.informe:
            B.escribir(a.informe, informe)
        print("Dry run: no se ha llamado a la API ni modificado el banco.")
        return 0
    prov = G.proveedor(cfg, simulado=a.simulado, fallos=a.simulado_fallos)
    congelada = P.congelar()  # política del juez congelada para toda la ejecución
    pol = P.verificar(congelada)
    modelos = cfg["modelos"]
    cuenta_tipos, cuenta_dif = collections.Counter(), collections.Counter()
    validas_run = coste_run = 0
    vacios = 0
    for _ in range(a.lotes):
        if validas_run >= a.objetivo or coste_run >= a.max_coste:
            break
        slots = elegir(temas, fuentes, banco, cfg, min(tamano, a.objetivo - validas_run), usados)
        if not slots:
            print("No quedan artículos con capacidad en los temas con déficit.")
            break
        lote_id = f"L{len(estado['lotes']) + 1:05d}"
        t0, cnt, tokens, incid, cst = time.time(), collections.Counter(), collections.defaultdict(lambda: [0, 0]), [], 0.0
        for s in slots:
            ley = fuentes.ley(s["slug"])
            pedidas = pedir_tipos(ley, s["n"], s["k"], cuenta_tipos, cuenta_dif, cfg, dist)
            res, usos, inc = procesar(s, prov, fuentes, banco, cfg, pedidas, pol)
            incid += inc
            for u in usos:
                tokens[u["modelo"]][0] += u["entrada"]; tokens[u["modelo"]][1] += u["salida"]; cst += coste(u, cfg)
            for est, q, motivos, dup in res:
                cnt["generadas"] += 1; cnt[est] += 1; cnt["duplicadas"] += bool(dup and est == "REJECTED")
                banco.anadir(s["slug"], ficha(q, est, motivos, ley, s["n"], s, modelos, lote_id, cfg,
                                              traza=traza_api(q, est, ley, s["n"], s, modelos, lote_id, pol)))
                if est == "VALID":  # cuenta para todos los temas del plan cuyo ámbito incluye el artículo
                    for t in temas:
                        if s["n"] in t["arts"].get(s["slug"], ()):
                            t["preguntas"] += 1; t["faltan"] -= 1
        P.verificar(congelada, lote=lote_id)  # si la política cambió durante el lote: se bloquea antes de escribir nada
        banco.guardar()
        reg = {"id": lote_id, "fecha": datetime.datetime.now().isoformat(timespec="seconds"), "modo": "simulado" if a.simulado else "real",
               "oposiciones": oposiciones, "articulos": len(slots), "generadas": cnt["generadas"], "VALID": cnt["VALID"],
               "REVIEW_REQUIRED": cnt["REVIEW_REQUIRED"], "REJECTED": cnt["REJECTED"], "duplicadas": cnt["duplicadas"],
               "tokens": {k: {"entrada": v[0], "salida": v[1]} for k, v in tokens.items()}, "coste_usd": round(cst, 5),
               "segundos": round(time.time() - t0, 1), "incidencias": incid[:20], "judge_policy_version": pol["version"],
               "judge_policy_sha256": pol["sha256"]}
        estado["lotes"].append(reg)
        validas_run += cnt["VALID"]; coste_run += cst
        vacios = vacios + 1 if not cnt["generadas"] else 0
        motivo = comprobar_calidad(estado, cfg) if cnt["generadas"] else None
        if vacios >= 2:
            motivo = "dos lotes seguidos sin ninguna pregunta generada (API o contenido)"
        if motivo:
            estado["pausa"] = {"estado": "GENERATION_PAUSED", "motivo": motivo, "lote": lote_id, "fecha": hoy()}
        B.escribir(ESTADO, estado)
        informe["lotes"].append(reg)
        print(f"{lote_id}: {cnt['generadas']} generadas · {cnt['VALID']} VALID · {cnt['REVIEW_REQUIRED']} a revisión · {cnt['REJECTED']} rechazadas "
              f"({cnt['duplicadas']} duplicadas) · {reg['coste_usd']} USD · {reg['segundos']} s" + (f" · incidencias: {len(incid)}" if incid else ""))
        if motivo:
            print(f"GENERATION_PAUSED: {motivo}")
            break
    M.guardar(M.calcular(estado))
    informe.update(validas=validas_run, coste_usd=round(coste_run, 4), pausa=estado.get("pausa"))
    if a.informe:
        B.escribir(a.informe, informe)
    print(f"Ejecución terminada: {validas_run} preguntas VALID nuevas · {round(coste_run, 4)} USD")
    return 3 if estado.get("pausa") else 0


if __name__ == "__main__":
    sys.exit(main())
