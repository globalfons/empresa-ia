"""Banco verbal semántico (vocabulario, sinónimos, antónimos, analogías, comprensión) con REVISIÓN HUMANA obligatoria.

Estos formatos no tienen respuesta calculable: ni se generan automáticamente ni los aprueba un juez de IA. El circuito es:
  1. Una persona redacta los ítems (CSV) con la referencia normativa usada (DIEC2 para el catalán, DLE para el castellano).
  2. `importar` los añade como BORRADOR tras la validación estructural (nunca publicados).
  3. `aprobar` / `rechazar` los decide una persona en un terminal interactivo (pide su nombre y confirmación; se niega sin TTY).
  4. El build publica únicamente los APROBADO_HUMANO en docs/datos/verbal-revisado-<oposición>.json y el entrenador los sirve.

  python3 -m fabrica.verbal estado   <oposición>
  python3 -m fabrica.verbal importar <oposición> <fichero.csv>
  python3 -m fabrica.verbal aprobar  <oposición> <id>     (solo una persona, en terminal interactivo)
  python3 -m fabrica.verbal rechazar <oposición> <id>     (ídem)

CSV (cabecera): id,formato,idioma,dificultad,enunciado,texto,opcion_a,opcion_b,opcion_c,opcion_d,correcta(a-d),explicacion,fuente,url,autor
"""
import csv, datetime, json, os, re, sys

R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FORMATOS = ("vocabulario", "sinonimos", "antonimos", "analogias", "comprension_lectora")
FUENTES = ("DIEC2", "DLE", "Optimot", "GDLC", "DNV")
ESTADOS = ("BORRADOR", "APROBADO_HUMANO", "RECHAZADO")


def ruta(op):
    return os.path.join(R, "catalogo", "aptitud", f"verbal-semantica-{op}.json")


def leer(op):
    return json.load(open(ruta(op), encoding="utf-8"))


def escribir(op, banco):
    banco["actualizado"] = datetime.date.today().isoformat()
    with open(ruta(op), "w", encoding="utf-8") as f:
        f.write(json.dumps(banco, ensure_ascii=False, indent=1) + "\n")


def validar_item(x):
    """Controles estructurales ([] = pasa). No juzgan el contenido lingüístico: eso lo decide la persona revisora."""
    p = []
    if not re.fullmatch(r"[a-z0-9-]{3,40}", str(x.get("id") or "")):
        p.append("id: minúsculas, números y guiones (3-40)")
    if x.get("formato") not in FORMATOS:
        p.append(f"formato: uno de {FORMATOS}")
    if x.get("idioma") not in ("ca", "es"):
        p.append("idioma: ca o es")
    if x.get("dificultad") not in (1, 2, 3):
        p.append("dificultad 1-3")
    if len(x.get("enunciado") or "") < 10:
        p.append("enunciado demasiado breve")
    if x.get("formato") == "comprension_lectora" and len(x.get("texto") or "") < 120:
        p.append("comprensión lectora: texto de al menos 120 caracteres")
    ops = x.get("opciones") or []
    if len(ops) != 4 or len({o.strip().lower() for o in ops}) != 4 or any(not o.strip() for o in ops):
        p.append("4 opciones distintas y no vacías")
    if x.get("correcta") not in (0, 1, 2, 3):
        p.append("correcta: índice 0-3")
    if len(x.get("explicacion") or "") < 30:
        p.append("explicación de al menos 30 caracteres")
    ref = x.get("referencia") or {}
    if ref.get("fuente") not in FUENTES or not str(ref.get("url") or "").startswith("https://"):
        p.append(f"referencia normativa: fuente en {FUENTES} y url https")
    if not x.get("autor"):
        p.append("autor (persona que lo redacta)")
    if x.get("estado") not in ESTADOS:
        p.append(f"estado en {ESTADOS}")
    if x.get("estado") == "APROBADO_HUMANO":
        h = x.get("human_review") or {}
        if not h.get("aprobado_por") or not h.get("fecha"):
            p.append("aprobado sin human_review.aprobado_por y fecha")
    return p


def publicables(banco):
    return [x for x in banco.get("items", []) if x.get("estado") == "APROBADO_HUMANO" and not validar_item(x)]


def importar(op, fichero):
    banco = leer(op)
    ids = {x["id"] for x in banco["items"]}
    nuevos, errores = [], {}
    for fila in csv.DictReader(open(fichero, encoding="utf-8")):
        x = {"id": (fila.get("id") or "").strip(), "formato": (fila.get("formato") or "").strip(), "idioma": (fila.get("idioma") or "").strip(),
             "dificultad": int(fila["dificultad"]) if str(fila.get("dificultad") or "").isdigit() else None,
             "enunciado": (fila.get("enunciado") or "").strip(), "texto": (fila.get("texto") or "").strip() or None,
             "opciones": [(fila.get(k) or "").strip() for k in ("opcion_a", "opcion_b", "opcion_c", "opcion_d")],
             "correcta": "abcd".find((fila.get("correcta") or "").strip().lower()) if (fila.get("correcta") or "").strip() else None,
             "explicacion": (fila.get("explicacion") or "").strip(), "referencia": {"fuente": (fila.get("fuente") or "").strip(), "url": (fila.get("url") or "").strip()},
             "autor": (fila.get("autor") or "").strip(), "estado": "BORRADOR", "source_type": "TESTLEY_TRAINING", "importado_el": datetime.date.today().isoformat()}
        if x["correcta"] == -1:
            x["correcta"] = None
        p = validar_item(x) + (["id repetido"] if x["id"] in ids else [])
        if p:
            errores[x["id"] or f"fila-{len(nuevos) + len(errores) + 2}"] = p
        else:
            nuevos.append(x); ids.add(x["id"])
    if errores:
        raise SystemExit("No se importa nada: corrige el CSV.\n" + json.dumps(errores, ensure_ascii=False, indent=1))
    banco["items"] += nuevos
    escribir(op, banco)
    return len(nuevos)


def decidir(op, item_id, decision, entrada=input, tty=None):
    """Aprobación o rechazo HUMANOS: exige terminal interactivo, el nombre de la persona y que confirme tras ver el ítem."""
    if not (sys.stdin.isatty() if tty is None else tty):
        raise SystemExit("La revisión es humana: ejecuta este comando en un terminal interactivo (sin TTY no se aprueba nada).")
    banco = leer(op)
    x = next((i for i in banco["items"] if i["id"] == item_id), None)
    if not x:
        raise SystemExit(f"No existe el ítem {item_id}")
    if validar_item(x):
        raise SystemExit("El ítem no pasa la validación estructural: " + "; ".join(validar_item(x)))
    print(json.dumps({k: x[k] for k in ("formato", "idioma", "enunciado", "texto", "opciones", "correcta", "explicacion", "referencia")}, ensure_ascii=False, indent=1))
    nombre = entrada("Tu nombre (persona revisora): ").strip()
    if len(nombre) < 3 or nombre.lower() in ("claude", "ia", "ai", "bot") or nombre == x.get("autor"):
        raise SystemExit("Nombre no válido: la revisión la hace una persona distinta de quien redactó el ítem.")
    if entrada(f"Escribe «{decision}» para confirmar: ").strip() != decision:
        raise SystemExit("Sin confirmación: no se cambia nada.")
    x["estado"] = "APROBADO_HUMANO" if decision == "APROBAR" else "RECHAZADO"
    x["human_review"] = {"aprobado_por" if decision == "APROBAR" else "rechazado_por": nombre, "fecha": datetime.date.today().isoformat()}
    escribir(op, banco)
    return x["estado"]


def main(argv=None):
    a = argv or sys.argv[1:]
    if len(a) < 2:
        raise SystemExit(__doc__)
    if a[0] == "estado":
        b = leer(a[1])
        cuenta = {e: sum(1 for x in b["items"] if x.get("estado") == e) for e in ESTADOS}
        print(json.dumps({"items": len(b["items"]), **cuenta, "publicables": len(publicables(b))}, ensure_ascii=False))
    elif a[0] == "importar":
        print(f"{importar(a[1], a[2])} ítems importados como BORRADOR (no se publican hasta su aprobación humana)")
    elif a[0] in ("aprobar", "rechazar"):
        print(decidir(a[1], a[2], "APROBAR" if a[0] == "aprobar" else "RECHAZAR"))
    else:
        raise SystemExit(__doc__)


if __name__ == "__main__":
    main()
