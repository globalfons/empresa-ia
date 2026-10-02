"""Informes Mossos 360 generados desde datos del repositorio (nada escrito a mano):
  documentacion/MOSSOS_360_COVERAGE_MATRIX.md · MOSSOS_360_SOURCES_REPORT.md · MOSSOS_360_QUESTIONS_REPORT.md
Entradas: catalogo/perfiles/<id>.json, documentacion/cobertura-<id>.json (fabrica.cobertura), datos/preguntas-*.json, datos/candidatas/*.json.
Uso: python3 catalogo/perfil.py && python3 -m fabrica.cobertura mossos-esquadra && python3 scripts/informe_mossos360.py [oposicion]"""
import collections, json, os, sys

R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, R)
from catalogo import perfil as PF  # noqa: E402

DOC = os.path.join(R, "documentacion")


def escribir(nombre, lineas):
    with open(os.path.join(DOC, nombre), "w", encoding="utf-8") as f:
        f.write("\n".join(lineas) + "\n")


def cobertura(p, nec):
    por_tema = {t["tema"]: t for t in (nec or {}).get("temas", [])}
    L = [f"# Mossos 360 · matriz de cobertura ({p['id']})", "",
         f"Generado de `catalogo/perfiles/{p['id']}.json` ({p['generado']}) y `documentacion/cobertura-{p['id']}.json` (CoverageEngine). "
         f"Objetivo mínimo por tema: {PF.OBJETIVO_TEMA} preguntas TESTLEY_GENERATED, limitado por la capacidad real de sus apartados. "
         "OFFICIAL_EXAM se cuenta aparte y no es cobertura.", "",
         "| Tema | Título | Estado | TestLey | Objetivo | Capacidad | Oficiales | Revisión | Retiradas | Dificultad 1/2/3 | Sin preguntas | Bloqueados | Leyes pendientes |",
         "|---|---|---|---|---|---|---|---|---|---|---|---|---|"]
    for t in p["temario"]:
        c = por_tema.get(t["id"], {})
        d = t["dificultad"]
        L.append(f"| {t['id']} | {t['titulo'][:48]} | {t['cobertura']} | {t['preguntas']['TESTLEY_GENERATED']} | {c.get('objetivo', t['objetivo'])} | "
                 f"{c.get('capacidad', '—')} | {t['preguntas']['OFFICIAL_EXAM']} | {t['preguntas']['REVIEW_REQUIRED']} | "
                 f"{t['preguntas']['DEPRECATED'] + t['preguntas']['OUTDATED']} | {d.get('1', 0)}/{d.get('2', 0)}/{d.get('3', 0)} | "
                 f"{len(c.get('articulos_sin_preguntas', []))} | {len(c.get('apartados_bloqueados', []))} | {', '.join(l['nombre'][:24] for l in t['leyes_pendientes']) or '—'} |")
    if nec:
        L += ["", f"## Necesidades concretas (fábrica {nec['estado_fabrica']}: no se genera nada)", "",
              f"Total: **{nec['total_necesario']} preguntas** en {len(nec['necesidades'])} necesidades. Primeras 25 por prioridad:", ""]
        L += [f"- {n['texto']}" + (" · revisión humana obligatoria" if n["revision_humana"] else "") for n in nec["necesidades"][:25]]
        L += ["", "## Bloqueados", ""] + [f"- {b['tema']}: {b['motivo']}" + (f" ({', '.join(b['leyes_pendientes'])})" if b["leyes_pendientes"] else "") for b in nec["bloqueados"]]
    escribir("MOSSOS_360_COVERAGE_MATRIX.md", L)


def fuentes(p):
    L = [f"# Mossos 360 · informe de fuentes ({p['id']})", "", "Solo fuentes oficiales. Cada dato oficial del perfil conserva su cita literal y la procedencia de su documento.", "",
         "| Clave | Tipo | Documento | Publicado | Descargado | Verificado | Estado | sha256 |", "|---|---|---|---|---|---|---|---|"]
    for f in p["fuentes"]:
        L.append(f"| {f['clave']} | {f['source_type']} | [{(f['source_document'] or '')[:70]}]({f['source_url']}) | {f['published_at'] or '—'} | "
                 f"{(f['retrieved_at'] or '—')[:16]} | {f['verified_at'] or '—'} | {f['verification_status']} | `{(f.get('sha256') or '')[:12]}` |")
    L += ["", "## Datos oficiales y su fuente", "", "| Dato | Valor | Fuente | Estado |", "|---|---|---|---|"]
    for k, d in p["datos_oficiales"].items():
        val = d["valor"] if not isinstance(d["valor"], list) else f"{len(d['valor'])} elementos"
        fu = d.get("fuente") or ((d.get("elementos") or [{}])[0].get("fuente")) or {}
        L.append(f"| {k} | {str(val)[:70]} | {fu.get('clave', '—')} | {d.get('verification_status') or fu.get('verification_status', '—')} |")
    L += ["", "## Leyes del temario", "", "| Tema | Ley | Estado | Texto en TestLey |", "|---|---|---|---|"]
    for t in p["temario"]:
        for l in t["leyes"]:
            L.append(f"| {t['id']} | {l['nombre'][:70]} | {l['verification_status']} | {'sí' if l.get('texto_en_testley') else 'no'} |")
    L += ["", "## Correcciones oficiales de la guía (ORIGINAL → CORRECTION → CURRENT_VALUE)", ""]
    for c in p["guia"]["correcciones"]:
        L.append(f"- **{c['tema']}** · {c['lloc']} · {c['estado']} (aplicada a {', '.join(c['aplicada_a']) or '—'})  \n  ORIGINAL: «{c['ORIGINAL'][:140]}»  \n  CURRENT_VALUE: «{c['CURRENT_VALUE'][:140]}»")
    L += ["", "## Alertas recientes (eventos tipificados)", ""] + [f"- {a['fecha']} · {a['evento']} · {a['fuente']} · {a['titulo'][:100]}" for a in p["alertas"]["recientes"]]
    L += ["", "## Pendientes", ""] + [f"- **{x['campo']}**: {x['motivo']}" for x in p["pendientes"]]
    escribir("MOSSOS_360_SOURCES_REPORT.md", L)


def preguntas(p):
    banco = PF.cargar_banco()
    leyes = {l["slug"] for t in p["temario"] for l in t["leyes"] if l.get("slug")}
    qs = [q for s in leyes for q in banco.get(s, []) if any(a["ley"] == s and a["art"] == q.get("art") for t in p["temario"] for a in t["articulos"])]
    est = collections.Counter(PF.estado_pregunta(q) for q in qs)
    vivas = [q for q in qs if PF.estado_pregunta(q) == "TESTLEY_GENERATED"]
    c = p["contenido"]
    L = [f"# Mossos 360 · informe de preguntas ({p['id']})", "",
         "| Contenido | Preguntas | Se sirve | Nota |", "|---|---|---|---|",
         f"| OFFICIAL_EXAM | {c['OFFICIAL_EXAM']} | sí, solo en «exámenes oficiales» | literales del organismo; banco separado |",
         f"| TESTLEY_GENERATED | {c['TESTLEY_GENERATED']} | sí | publicadas tras la puerta `Banco.publicar()` |",
         f"| REVIEW_REQUIRED | {c['REVIEW_REQUIRED']} | no | cola humana (6 del lote S00017; S00018 sigue archivado sin cerrar ni publicar) |",
         f"| DEPRECATED | {c['DEPRECATED']} | no | retiradas |", f"| OUTDATED | {c['OUTDATED']} | no | desfasadas |", "",
         "## TESTLEY_GENERATED por tipo y dificultad", "",
         "| Tipo | Preguntas |", "|---|---|"] + [f"| {k} | {v} |" for k, v in collections.Counter(q.get("tipo") or "sin_tipo" for q in vivas).most_common()]
    L += ["", "| Dificultad | Preguntas |", "|---|---|"] + [f"| {k} | {v} |" for k, v in sorted(collections.Counter(str(q.get("dif", "?")) for q in vivas).items())]
    L += ["", "## Por origen", "", "| Ley / fuente | Publicadas | En cola |", "|---|---|---|"]
    for s in sorted(leyes):
        pub = [q for q in vivas if q in banco.get(s, [])]
        cola = [q for q in banco.get(s, []) if q.get("_cola") and q in qs]
        L.append(f"| {s} | {len(pub)} | {len(cola)} |")
    L += ["", f"Estados contados en el ámbito del temario: {dict(est)}.", "",
          "Generación: **GENERATION_PAUSED** (fabrica/estado/estado.json). No se ha generado ni publicado ninguna pregunta nueva en Mossos 360."]
    escribir("MOSSOS_360_QUESTIONS_REPORT.md", L)


if __name__ == "__main__":
    oid = sys.argv[1] if len(sys.argv) > 1 else "mossos-esquadra"
    p = PF.leer(f"catalogo/perfiles/{oid}.json")
    nec = PF.leer(f"documentacion/cobertura-{oid}.json")
    cobertura(p, nec); fuentes(p); preguntas(p)
    print("documentacion/MOSSOS_360_COVERAGE_MATRIX.md, MOSSOS_360_SOURCES_REPORT.md, MOSSOS_360_QUESTIONS_REPORT.md")
