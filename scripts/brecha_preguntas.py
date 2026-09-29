"""Brecha de preguntas: cuántas faltan para que cada tema legislativo de cada oposición llegue a OBJETIVO preguntas,
agrupado por ley. Determinista: solo lee ficheros del repositorio.

Entradas: docs/datos/cobertura.json y docs/datos/<oposicion>.json (build), catalogo/oposiciones.json, catalogo/normas_base.json,
catalogo/temas_ambito.json, datos/<slug>-articulos.json, datos/preguntas-<slug>.json.
Salida: documentacion/brecha-preguntas.json y un resumen por pantalla.
Uso: npm run build && python3 scripts/brecha_preguntas.py

Cálculo por ley:
  - demanda_suma: suma de lo que falta en cada tema, repartido entre las leyes del tema (con texto) en proporción al nº de
    artículos de su ámbito (restos mayores, desempate por orden de las normas del tema).
  - demanda_minima: una pregunta cuenta para todos los temas (de todas las oposiciones) cuyo ámbito incluye su artículo.
    Los temas de la ley se agrupan en componentes conexas por solapamiento de ámbito; en cada componente basta con el máximo
    de los faltantes (no la suma) y las componentes disjuntas se suman. Es una cota inferior realista.
"""
import json, os
from collections import defaultdict

R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OBJETIVO = 30
RETIRADAS = {"OUTDATED", "DEPRECATED"}


def J(*p):
    with open(os.path.join(R, *p), encoding="utf-8") as f:
        return json.load(f)


def existe(*p):
    return os.path.exists(os.path.join(R, *p))


def reparto(total, pesos):
    """Reparte el entero total en proporción a pesos (lista de (clave, peso)) con restos mayores; determinista."""
    suma = sum(p for _, p in pesos)
    if not suma:
        return {k: 0 for k, _ in pesos}
    base = {k: total * p // suma for k, p in pesos}
    resto = total - sum(base.values())
    orden = sorted(range(len(pesos)), key=lambda i: (-((total * pesos[i][1]) % suma), i))
    for i in orden[:resto]:
        base[pesos[i][0]] += 1
    return base


def calcular(objetivo_de=None):
    """Déficit por tema y por ley. objetivo_de(oposicion, indice, leyes) → objetivo del tema (por defecto OBJETIVO).
    Cada ley del detalle de un tema lleva en «_arts» la lista de artículos de su ámbito (uso interno: fabrica/)."""
    objetivo_de = objetivo_de or (lambda oid, i, leyes: OBJETIVO)
    cob = {o["id"]: o for o in J("docs", "datos", "cobertura.json")}
    opos = J("catalogo", "oposiciones.json")
    slug_de = {n["id"]: n["slug"] for n in J("catalogo", "normas_base.json")}
    ambitos = J("catalogo", "temas_ambito.json")

    # Leyes: artículos (orden oficial) y preguntas válidas por artículo
    arts, preg, preg_art = {}, {}, {}
    slugs_preg = sorted(f[len("preguntas-"):-len(".json")] for f in os.listdir(os.path.join(R, "datos"))
                        if f.startswith("preguntas-") and f.endswith(".json"))
    for sl in slugs_preg:
        qs = [q for q in J("datos", f"preguntas-{sl}.json") if q.get("verification_status") not in RETIRADAS]
        preg[sl] = len(qs)
        cnt = defaultdict(int)
        for q in qs:
            cnt[str(q.get("art", ""))] += 1
        preg_art[sl] = cnt

    def articulos(sl):
        if sl not in arts:
            arts[sl] = [str(a["n"]) for a in J("datos", f"{sl}-articulos.json")] if existe("datos", f"{sl}-articulos.json") else None
        return arts[sl]

    temas_def, sin_fuente, temas_ley = [], [], defaultdict(list)
    for o in opos:
        oid = o["id"]
        if oid not in cob:
            continue
        ct = cob[oid]["temas"]
        # comprobación cruzada: preguntas por tema de cobertura.json frente a tm de docs/datos/<id>.json
        nq_tm = defaultdict(int)
        if existe("docs", "datos", f"{oid}.json"):
            for q in J("docs", "datos", f"{oid}.json")["qs"]:
                for i in q.get("tm", []):
                    nq_tm[i] += 1
        for i, t in enumerate(o["temario"]):
            c = ct[i]
            if not c["legislativo"]:
                continue
            assert c["preguntas"] == nq_tm[i], f"{oid} tema {i}: cobertura {c['preguntas']} != tm {nq_tm[i]}"
            leyes, sin_texto = [], []
            for nid in t["normas"]:
                sl = slug_de.get(nid)
                if sl and articulos(sl) is not None:
                    a = ambitos.get(f"{oid}#{i}#{sl}")
                    if a and a.get("estado") == "precisado":
                        amb = [str(x) for x in a["articulos"]]
                        tipo = "precisado"
                    else:
                        amb = list(articulos(sl))
                        tipo = "ley_completa" if not a else a.get("estado", "ley_completa")
                    leyes.append({"ley": sl, "ambito": tipo, "articulos_ambito": amb})
                else:
                    sin_texto.append(sl or nid)
            objetivo = objetivo_de(oid, i, leyes) if leyes else OBJETIVO
            faltan = max(0, objetivo - c["preguntas"])
            ident = {"oposicion": oid, "indice": i, "tema": t["tema"], "bloque": t.get("bloque"), "titulo": c["titulo"]}
            if not leyes:
                sin_fuente.append({**ident, "preguntas": c["preguntas"], "faltan": faltan, "normas": t["normas"],
                                   "motivo": "sin normas asignadas en el temario" if not t["normas"] else "ley sin texto en datos/ (" + ", ".join(sin_texto) + ")"})
                continue
            if faltan == 0:
                for L in leyes:
                    temas_ley[L["ley"]].append({**ident, "faltan": 0, "arts": set(L["articulos_ambito"])})
                continue
            rep = reparto(faltan, [(L["ley"], len(L["articulos_ambito"])) for L in leyes])
            detalle = []
            for L in leyes:
                sin_p = [n for n in L["articulos_ambito"] if not preg_art.get(L["ley"], {}).get(n)]
                detalle.append({"ley": L["ley"], "ambito": L["ambito"], "articulos_ambito": len(L["articulos_ambito"]),
                                "faltan_asignadas": rep[L["ley"]], "articulos_sin_preguntas": sin_p, "_arts": L["articulos_ambito"]})
                temas_ley[L["ley"]].append({**ident, "faltan": rep[L["ley"]], "arts": set(L["articulos_ambito"])})
            temas_def.append({**ident, "preguntas": c["preguntas"], "objetivo": objetivo, "faltan": faltan, "leyes_sin_texto": sin_texto, "leyes": detalle})

    # Por ley
    por_ley = []
    for sl in sorted(set(slugs_preg) | set(temas_ley)):
        ts = temas_ley.get(sl, [])
        con = [x for x in ts if x["faltan"] > 0]
        # componentes conexas por solapamiento de ámbito (entre todos los temas con déficit de la ley)
        padre = list(range(len(con)))

        def raiz(k):
            while padre[k] != k:
                padre[k] = padre[padre[k]]
                k = padre[k]
            return k
        for a in range(len(con)):
            for b in range(a + 1, len(con)):
                if con[a]["arts"] & con[b]["arts"]:
                    padre[raiz(a)] = raiz(b)
        comp = defaultdict(list)
        for k in range(len(con)):
            comp[raiz(k)].append(con[k])
        componentes = sorted(([{"oposicion": x["oposicion"], "tema": x["tema"], "indice": x["indice"], "faltan": x["faltan"]} for x in g]
                              for g in comp.values()), key=lambda g: (g[0]["oposicion"], g[0]["indice"]))
        # artículos prioritarios: en el ámbito de temas con déficit y sin ninguna pregunta; más temas afectados primero
        peso = defaultdict(int)
        for x in con:
            for n in x["arts"]:
                if not preg_art.get(sl, {}).get(n):
                    peso[n] += 1
        orden = {n: k for k, n in enumerate(articulos(sl) or [])}
        prior = sorted(peso, key=lambda n: (-peso[n], orden.get(n, 10**9), n))
        por_ley.append({
            "ley": sl, "texto": articulos(sl) is not None, "fichero_preguntas": sl in preg,
            "preguntas_actuales": preg.get(sl, 0),
            "demanda_suma": sum(x["faltan"] for x in con),
            "demanda_minima": sum(max(x["faltan"] for x in g) for g in componentes),
            "temas_con_deficit": len(con),
            "oposiciones_afectadas": sorted({x["oposicion"] for x in con}),
            "componentes": componentes,
            "articulos_prioritarios": [{"n": n, "temas": peso[n]} for n in prior],
        })

    total = {"demanda_suma": sum(x["demanda_suma"] for x in por_ley), "demanda_minima": sum(x["demanda_minima"] for x in por_ley),
             "faltan_temas": sum(t["faltan"] for t in temas_def), "temas_con_deficit": len(temas_def),
             "temas_sin_fuente": len(sin_fuente), "faltan_sin_fuente": sum(t["faltan"] for t in sin_fuente)}
    return {"objetivo_por_tema": OBJETIVO, "total": total, "por_ley": por_ley, "temas": temas_def, "temas_sin_fuente": sin_fuente}


def main():
    salida = calcular()
    total, por_ley, sin_fuente = salida["total"], salida["por_ley"], salida["temas_sin_fuente"]
    for t in salida["temas"]:
        t.pop("objetivo", None)
        for L in t["leyes"]:
            L.pop("_arts", None)
    os.makedirs(os.path.join(R, "documentacion"), exist_ok=True)
    with open(os.path.join(R, "documentacion", "brecha-preguntas.json"), "w", encoding="utf-8") as f:
        json.dump(salida, f, ensure_ascii=False, indent=1)
        f.write("\n")

    # Resumen
    print(f"Brecha a {OBJETIVO} preguntas por tema legislativo")
    print(f"Temas con déficit: {total['temas_con_deficit']} · faltan (por tema): {total['faltan_temas']} · "
          f"a añadir: mínimo {total['demanda_minima']}, suma {total['demanda_suma']}")
    print(f"\n{'ley':<22}{'actuales':>9}{'mínimo':>8}{'suma':>7}{'arts.prior':>11}  oposiciones")
    for x in sorted(por_ley, key=lambda x: (-x["demanda_minima"], -x["demanda_suma"], x["ley"])):
        print(f"{x['ley']:<22}{x['preguntas_actuales']:>9}{x['demanda_minima']:>8}{x['demanda_suma']:>7}"
              f"{len(x['articulos_prioritarios']):>11}  {', '.join(x['oposiciones_afectadas'])}")
    print("\nArtículos prioritarios sin preguntas (hasta 10 por ley):")
    for x in por_ley:
        if x["articulos_prioritarios"]:
            print(f"  {x['ley']}: " + ", ".join(f"{a['n']}({a['temas']})" for a in x["articulos_prioritarios"][:10]))
    print(f"\nTemas legislativos sin fuente ({len(sin_fuente)}):")
    for t in sin_fuente:
        print(f"  {t['oposicion']} T{t['tema']} [{t['indice']}] faltan {t['faltan']}: {t['motivo']} · {t['titulo'][:70]}")
    print("\n→ documentacion/brecha-preguntas.json")


if __name__ == "__main__":
    main()
