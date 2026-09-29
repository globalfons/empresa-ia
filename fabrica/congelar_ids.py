"""Congela los IDs de las preguntas existentes (una sola vez; idempotente).

La pregunta i de datos/preguntas-<ley>.json ya tenía, en el build, el id «<prefijo>-<i>» (así lo guarda el progreso de los
usuarios en el navegador y en Supabase). Este script escribe ese mismo id en cada pregunta, marca su procedencia
(TESTLEY_GENERATED) y guarda el recuento en datos/ids-congelados.json. No cambia el contenido ni el orden de ninguna pregunta.
Uso: python3 fabrica/congelar_ids.py
"""
import json, glob, os

R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PREFIJO = {"ley-39-2015": "l39"}  # el mismo mapa que build.mjs


def formato(raw):
    """Sangría original del fichero (0 o 1) para no reescribirlo entero."""
    return 1 if raw.startswith("[\n {") else 0 if raw.startswith("[\n{") else 1


def guardar(f, qs, raw):
    out = json.dumps(qs, ensure_ascii=False, indent=formato(raw))
    with open(f, "w", encoding="utf-8") as h:
        h.write(out + ("\n" if raw.endswith("\n") else ""))


def main():
    manifiesto = {}
    for f in sorted(glob.glob(os.path.join(R, "datos", "preguntas-*.json"))):
        slug = os.path.basename(f)[len("preguntas-"):-len(".json")]
        raw = open(f, encoding="utf-8").read()
        qs = json.loads(raw)
        p = PREFIJO.get(slug, slug)
        for i, q in enumerate(qs):
            esperado = f"{p}-{i}"
            if "id" in q and q["id"] != esperado:
                raise SystemExit(f"{slug} #{i}: id {q['id']} distinto del posicional {esperado}: no se toca nada")
            q["id"] = esperado
            q.setdefault("procedencia", "TESTLEY_GENERATED")
        manifiesto[slug] = {"prefijo": p, "congeladas": len(qs)}
        guardar(f, qs, raw)
    ruta = os.path.join(R, "datos", "ids-congelados.json")
    previo = json.load(open(ruta)) if os.path.exists(ruta) else None
    if previo:  # nunca se reduce lo ya congelado
        for s, v in previo["leyes"].items():
            manifiesto[s]["congeladas"] = max(manifiesto.get(s, v)["congeladas"], v["congeladas"])
    json.dump({"_nota": "IDs congelados: la pregunta i de datos/preguntas-<ley>.json tiene id <prefijo>-<i>, el mismo que ya usaba el "
               "progreso de los usuarios. Las preguntas nuevas se añaden solo al final con el siguiente número; nunca se reordena ni se borra.",
               "fecha": (previo or {}).get("fecha", "2026-09-29"), "leyes": manifiesto},
              open(ruta, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(sum(v["congeladas"] for v in manifiesto.values()), "preguntas con id congelado en", len(manifiesto), "leyes")


if __name__ == "__main__":
    main()
