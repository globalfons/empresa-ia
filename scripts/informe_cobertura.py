"""Genera documentacion/OPOSITIONS-COVERAGE-REPORT.md a partir de los datos reales (no se escribe a mano para que no se desfase):
  docs/datos/cobertura.json  (build: cobertura por tema y completitud)   docs/datos/<id>.json (preguntas publicadas)
  catalogo/oposiciones/<id>.json (fuentes, pendientes, estructura del examen)   datos/calidad.json (control de calidad)
Uso: npm run build && python3 scripts/informe_cobertura.py
"""
import json, os, datetime
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
J = lambda *p: json.load(open(os.path.join(R, *p)))

# Observaciones de revisión humana por oposición (lo que los datos no dicen solos). Mantener cortas y verificables.
NOTAS = {
    "guardia-civil-cabos-guardias": {
        "problemas": ["El temario oficial (Resolución de 26/06/2019, mod. 03/10/2022) no se publica en el BOE y la web de la Guardia Civil no es accesible desde el entorno de TestLey: no hay temas ni tests por tema, y no se inventan.",
                      "El simulacro existe, pero es de preparación (leyes comunes), no la prueba oficial de conocimientos."],
        "pasos": ["Descargar el temario oficial desde web.guardiacivil.es (a mano o con el crawler si el sitio permite el acceso) y cargarlo como `temario.tipo = oficial_publicado` con su fuente.",
                  "Con el temario cargado se generan solas las páginas de tema, los tests por tema, el ámbito de cada tema y la cobertura."],
    },
    "policia-nacional-escala-basica": {
        "problemas": ["Los temas no legislativos (sociología, ética, técnicas de comunicación, etc.) no tienen contenido: TestLey solo publica preguntas con cita literal de una norma del BOE."],
        "pasos": ["Incorporar fuentes oficiales no consolidadas en el BOE (DOUE/EUR-Lex, convenios de derechos humanos) para los temas 4 y 27.",
                  "Pruebas físicas, reconocimiento médico, entrevista y psicotécnicos: solo información oficial, sin simulador."],
    },
    "policia-nacional-escala-ejecutiva": {
        "problemas": ["23 temas no legislativos (criminología, sociología, técnicas policiales…) sin contenido.",
                      "El segundo ejercicio (supuestos prácticos) no se simula: requiere corrección humana."],
        "pasos": ["Subir a ≥ 30 preguntas los temas penales con más peso (partes especiales del Código Penal, LECrim).",
                  "Fuentes oficiales para los temas de la UE y de protección internacional no consolidados."],
    },
    "age-auxiliar-administrativo-c2": {
        "problemas": ["El bloque II (ofimática) y las preguntas psicotécnicas no tienen contenido: no hay texto legal que citar y TestLey no inventa preguntas sin fuente.",
                      "Los temas de atención al público y de la UE no tienen fuente consolidada en el BOE."],
        "pasos": ["Definir una fuente oficial (documentación de Microsoft 365 citada en las bases) antes de crear preguntas de ofimática, con revisión humana.",
                  "Psicotécnicos: solo con un banco con licencia; nunca generados sin fuente."],
    },
    "age-administrativo-c1": {
        "problemas": ["El bloque VI (ofimática) y el supuesto práctico no se simulan.",
                      "Los temas de la UE y de atención al público no tienen fuente consolidada en el BOE."],
        "pasos": ["Subir a ≥ 30 preguntas los temas de gestión financiera (Ley 47/2003) y de personal (TREBEP).",
                  "Fuente oficial para la parte de la UE (EUR-Lex)."],
    },
    "age-gestion-a2": {
        "problemas": ["Los temas de la Unión Europea y de política económica tienen legislación asignada pero su contenido real está en fuentes no consolidadas en el BOE.",
                      "El segundo ejercicio (supuesto práctico escrito) no se simula."],
        "pasos": ["Incorporar EUR-Lex (Tratados) como fuente oficial para los temas de la UE.",
                  "Revisar a mano el ámbito de los temas marcados «sin precisar»."],
    },
}

def pct(a, b): return f"{round(100 * a / b)} %" if b else "—"

def main():
    cob = J("docs", "datos", "cobertura.json"); cal = J("datos", "calidad.json")
    hoy = datetime.date.today().isoformat()
    fil, sec = [], []
    for o in cob:
        cat = J("catalogo", "oposiciones", f"{o['id']}.json"); t = o["temas"]; c = o["completitud"]
        datos = J("docs", "datos", f"{o['id']}.json") if os.path.exists(os.path.join(R, "docs", "datos", f"{o['id']}.json")) else {"qs": []}
        nq = len(datos["qs"]); leyes = sorted({q["ley"] for q in datos["qs"]})
        err = sum(len(cal.get(l, {}).get("errores", [])) for l in leyes)
        con10 = [x for x in t if x["test"]]; parc = [x for x in t if x["test_parcial"]]; cero = [x for x in t if not x["preguntas"]]
        sim = (cat.get("examen") or {}).get("simulacro") or {}; est = (cat.get("examen") or {}).get("estructura") or []
        fuentes = cat.get("fuentes") or {}
        estado = ("PARCIAL · sin temario oficial" if not t else
                  "UTILIZABLE · con pendientes" if c["total"] >= 75 else "PARCIAL")
        fil.append(f"| {o['nombre']} | {'Oficial, ' + str(len(t)) + ' temas' if o['temario_tipo'] == 'oficial_publicado' else 'Pendiente'} | {c['contenido']} % de temas con texto oficial | "
                   f"{nq} ({c['preguntas']} % del objetivo de 30/tema) | {len(con10)}/{len(t)} temas con test ≥ 10 | "
                   f"{'Oficial' if sim.get('origen') == 'oficial' else 'Adaptado' if sim else '—'} · {sum(p['en_simulacro'] for p in est)}/{len(est)} partes | "
                   f"{len(fuentes)} (BOE) | {estado} · {c['total']} % |")
        etq = lambda x: (x["bloque"].split(")")[0].split(".")[0] + " · " if x.get("bloque") and sum(1 for y in t if y["tema"] == x["tema"]) > 1 else "") + f"T{x['tema']}"
        s = [f"## {o['nombre']}\n", f"Estado: **{estado}** · cobertura de contenido {c['total']} % (no es probabilidad de aprobar).\n", "### COMPLETADO"]
        if t:
            s += [f"- Temario oficial: {len(t)} temas copiados literalmente de la convocatoria ({(fuentes.get('convocatoria') or {}).get('id', '')}), cada uno con su página: estudio (índice oficial de artículos del BOE, texto vigente) y test del tema.",
                  f"- Tests por tema: {len(con10)} temas con ≥ 10 preguntas" + (f", {len(parc)} con 1–9" if parc else "") + f"; test a medida por tema, bloque, ley, dificultad y tipo (nuevas, falladas, difíciles, favoritas); modo examen.",
                  f"- {nq} preguntas publicadas, todas con cita literal del artículo vigente, dificultad, explicación y versión del texto legal contra la que se verificaron. Control de calidad: {err} errores."]
        else:
            s += [f"- Ficha con datos oficiales citados de la convocatoria ({(fuentes.get('convocatoria') or {}).get('id', '')}): requisitos, plazas y estructura del proceso.",
                  f"- {nq} preguntas de preparación (leyes comunes), con cita literal y versión del texto legal."]
        if sim: s.append(f"- Simulacro: {sim['preguntas']} preguntas, {sim['minutos']} min, {sim['opciones']} opciones, penalización {round(sim['penalizacion'], 2)} ({'regla oficial' if sim.get('origen') == 'oficial' else 'adaptado'}).")
        s.append(f"- Estructura oficial del examen con cita de las bases: " + "; ".join(f"{p['parte']} ({'se simula' if p['en_simulacro'] else 'no se simula'})" for p in est) + ".")
        s.append("- Mis errores, repetición espaciada, plan de estudio con días disponibles" + (", estadísticas por tema" if t else "") + " y panel de calidad (`/admin/oposiciones/" + o["id"] + "/quality/`).")
        s.append("\n### PENDIENTE")
        if cero: s.append(f"- {len(cero)} temas sin preguntas: " + ", ".join(etq(x) + (" (no legislativo)" if not x["legislativo"] else "") for x in cero) + ".")
        for p in est:
            if not p["en_simulacro"]:
                m = next((x.get("motivo") for x in cat["examen"]["estructura"] if x["parte"] == p["parte"]), "")
                s.append(f"- {p['parte']}: no se simula. {m}")
        for p in cat.get("pendientes", []): s.append(f"- {p['campo']}: {p['motivo']}")
        s.append("\n### PROBLEMAS")
        sp = [x for x in t if x["ambito"] == "sin_precisar"]
        if sp: s.append(f"- {len(sp)} temas con una ley repartida entre varios temas cuyo ámbito no se ha podido precisar ({', '.join(etq(x) for x in sp)}): se usa la ley completa y la página lo indica.")
        if t and o.get("sin_tema"): s.append(f"- {o['sin_tema']} preguntas de sus leyes quedan fuera del ámbito de todos los temas: solo aparecen en tests mixtos y simulacros.")
        s += [f"- {x}" for x in NOTAS.get(o["id"], {}).get("problemas", [])]
        s.append("\n### FUENTES")
        for k, f in fuentes.items(): s.append(f"- {f.get('titulo', k)} — {f.get('url', '')} (publicado {f.get('fecha_publicacion', '—')})")
        s.append(f"- Legislación: {len(leyes)} normas del BOE consolidado ({', '.join(leyes)}), vigiladas a diario por artículo (`datos/vigilar_leyes.py`).")
        s.append("\n### PRÓXIMOS PASOS")
        s += [f"- {x}" for x in NOTAS.get(o["id"], {}).get("pasos", [])]
        sec.append("\n".join(s) + "\n")
    cab = f"""# Cobertura de las oposiciones actuales

Generado el {hoy} con `python3 scripts/informe_cobertura.py` a partir de la build (`docs/datos/cobertura.json`), el catálogo y el control de calidad.
Está en `documentacion/` y no en `docs/` porque `docs/` es la web publicada y la build la regenera entera.

**Cómo leerlo.** «Cobertura» mide el contenido que TestLey tiene de cada oposición (temario, texto oficial, preguntas, tests, simulacro);
**no es una probabilidad de aprobar**. Un tema cuenta como «con test» cuando tiene ≥ 10 preguntas verificadas; el objetivo por tema es 30.
Nada se marca como completo si no lo está: los temas sin fuente oficial consolidada quedan «pendientes de verificación oficial».

| Oposición | Temario | Contenido | Preguntas | Tests | Simulacros | Fuentes | Estado |
|---|---|---|---|---|---|---|---|
""" + "\n".join(fil) + "\n\n"
    e2e = os.path.join(R, "documentacion", "e2e-oposiciones.json")
    if os.path.exists(e2e):
        e = json.load(open(e2e))
        pie_e2e = [f"## Verificación automática\n", f"E2E del {e['fecha']} (`scripts/e2e-oposiciones.cjs`, Playwright, móvil 375 px y escritorio 1280 px): HOME → OPOSICIÓN → TEMARIO → TEMA → TEST → RESULTADO → REPASAR ERRORES → MIS ERRORES → SIMULACRO → PANEL → CALIDAD, sin desbordamiento horizontal.\n",
                   "| Oposición | Móvil | Escritorio | Falla |", "|---|---|---|---|"]
        for oid in dict.fromkeys(r["id"] for r in e["resultados"]):
            m = next(r for r in e["resultados"] if r["id"] == oid and r["vista"] == "móvil"); d = next(r for r in e["resultados"] if r["id"] == oid and r["vista"] == "escritorio")
            pie_e2e.append(f"| {oid} | {m['ok']}/{m['total']} | {d['ok']}/{d['total']} | {', '.join(sorted(set(m['fallan'] + d['fallan']))) or '—'} |")
        pie_e2e.append(f"\nErrores de JavaScript: {len(e['errores_js'])}. Usuario sin Pase: {'ve el test de muestra y la oferta' if e['gratis_ve_muestra'] else 'NO ve el test de muestra'}. "
                       "Guardia Civil tiene menos pasos porque no tiene temario oficial (sin temas ni test por tema).\n"
                       "Además: `npm test` (lint, validación de preguntas y catálogo, tests de Python y de la build), `tests/test_calidad.py` (vigilancia de leyes, calidad, ámbito de temas, estructura del examen) y `tests/js/estudio.test.mjs` (repetición espaciada, plan, estadísticas por tema, salida de la build por oposición).\n")
        sec.append("\n".join(pie_e2e))
    pie = """## Cómo se mantiene al día

FUENTE → EVENTO → OPOSICIÓN → REVISIÓN, sin intervención manual salvo la revisión:
- Convocatoria nueva o modificada en el BOE → `ingesta/` la detecta y versiona → evento `NEW_CONVOCATORIA` → propuesta de actualización de la oposición (revisión humana en `/admin/growth/`).
- Artículo de una ley modificado → `datos/vigilar_leyes.py` guarda la versión anterior en `datos/versiones/`, actualiza el texto y marca sus preguntas `REVIEW_REQUIRED` (la cita sigue en el texto) u `OUTDATED` (ya no está; se retira de los tests sin borrarla) → evento `LAW_UPDATED` → lista de revisión en el panel de calidad de cada oposición.
- Cada build valida estructura, contenido, respuesta, fuente y duplicados de todas las preguntas (`datos/calidad_preguntas.py`) y la estructura del examen contra las bases (`catalogo/validar_catalogo.py`).
"""
    open(os.path.join(R, "documentacion", "OPOSITIONS-COVERAGE-REPORT.md"), "w").write(cab + "\n".join(sec) + "\n" + pie)
    print("documentacion/OPOSITIONS-COVERAGE-REPORT.md:", len(cob), "oposiciones")

if __name__ == "__main__": main()
