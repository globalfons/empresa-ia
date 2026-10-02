"""B3 · Estado de la fuente oficial de las leyes catalanas del temario de Mossos (Llei 4/2003, 10/1994, 16/1991).
Solo fuentes oficiales: API de datos abiertos del BOE (metadatos de la legislación consolidada) y Portal Jurídic de Catalunya
(Generalitat). Clasifica cada ley como FOUND_OFFICIAL_CONSOLIDATED · FOUND_OFFICIAL_NON_CONSOLIDATED · NOT_FOUND · PENDING_REVIEW y
guarda el resultado en datos/fuentes-leyes-catalanas.json (con historial: previous_version_id). No incorpora ningún texto:
mientras no haya un texto consolidado oficial y vigente, las leyes siguen OFFICIAL_PENDING_REVIEW y la fábrica no las usa.
Uso: python3 ingesta/leyes_catalanas.py"""
import datetime, hashlib, html, json, os, re, sys, urllib.request

R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REGISTRO = os.path.join(R, "datos", "fuentes-leyes-catalanas.json")
LEYES = [
    {"ley": "Llei 4/2003, de 7 d'abril, d'ordenació del sistema de seguretat pública de Catalunya", "tema": "C.3", "eli": "2003/04/07/4"},
    {"ley": "Llei 10/1994, d'11 de juliol, de la Policia de la Generalitat – Mossos d'Esquadra", "tema": "C.4", "eli": "1994/07/11/10"},
    {"ley": "Llei 16/1991, de 10 de juliol, de les policies locals de Catalunya", "tema": "C.4", "eli": "1991/07/10/16"},
]
AVISO_PJC = "Els textos consolidats (o versions actualitzades) de les normes que ofereix el Portal Jurídic de Catalunya no tenen caràcter oficial."


def http(u, json_=False):
    req = urllib.request.Request(u, headers={"Accept": "application/json" if json_ else "text/html", "User-Agent": "TestLey/1.0 (verificacion de fuentes oficiales)"})
    return urllib.request.urlopen(req, timeout=60).read()


def ahora():
    return datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds")


def clasificar(boe_estado, pjc_oficial):
    """Consolidado oficial solo si el BOE lo da por finalizado (no «Desactualizado») o el Portal Jurídic lo declara oficial."""
    if boe_estado == "Finalizado" or pjc_oficial:
        return "FOUND_OFFICIAL_CONSOLIDATED"
    if boe_estado:
        return "FOUND_OFFICIAL_NON_CONSOLIDATED"
    return "NOT_FOUND"


def comprobar(l):
    eli_boe = f"https://www.boe.es/eli/es-ct/l/{l['eli']}"
    ident = re.search(r"BOE-A-\d{4}-\d+", http(eli_boe).decode("utf-8", "ignore"))
    meta = json.loads(http(f"https://www.boe.es/datosabiertos/api/legislacion-consolidada/id/{ident.group(0)}/metadatos", True))["data"][0] if ident else {}
    pjc_url = f"https://portaljuridic.gencat.cat/eli/es-ct/l/{l['eli']}/con"
    pjc = re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", http(pjc_url).decode("utf-8", "ignore"))))
    pjc_no_oficial = AVISO_PJC in pjc
    estado_boe = (meta.get("estado_consolidacion") or {}).get("texto")
    return {"ley": l["ley"], "tema": l["tema"], "source_status": clasificar(estado_boe, not pjc_no_oficial and bool(pjc)),
            "verification_status": "OFFICIAL_PENDING_REVIEW",
            "fuentes": [
                {"source_url": f"https://www.boe.es/buscar/doc.php?id={meta.get('identificador')}", "source_document": meta.get("titulo"), "source_type": "BOE_ORIGINAL",
                 "published_at": meta.get("fecha_publicacion"), "oficial": True, "nota": "publicación oficial original (sin las modificaciones posteriores)"},
                {"source_url": meta.get("url_html_consolidada"), "source_document": f"{meta.get('titulo')} (texto consolidado BOE)", "source_type": "BOE_CONSOLIDADO",
                 "estado_consolidacion": estado_boe, "version": meta.get("fecha_actualizacion"), "oficial": estado_boe == "Finalizado",
                 "nota": "el BOE lo marca «Desactualizado»: no incorpora todas las modificaciones" if estado_boe == "Desactualizado" else ""},
                {"source_url": pjc_url, "source_document": f"{l['ley']} (text consolidat, Portal Jurídic de Catalunya)", "source_type": "PJC_CONSOLIDAT",
                 "oficial": not pjc_no_oficial, "cita": AVISO_PJC if pjc_no_oficial else None, "sha256": hashlib.sha256(pjc.encode()).hexdigest()},
            ],
            "retrieved_at": ahora(), "verified_at": ahora()[:10],
            "decision": "Sin texto consolidado oficial y vigente: no se incorpora texto ni se generan preguntas que dependan de esta ley (OFFICIAL_PENDING_REVIEW)."}


def main():
    prev = json.load(open(REGISTRO, encoding="utf-8")) if os.path.exists(REGISTRO) else {"leyes": []}
    previas = {x["ley"]: x for x in prev["leyes"]}
    out = []
    for l in LEYES:
        x = comprobar(l)
        p = previas.get(l["ley"])
        x["version_id"] = hashlib.sha256(json.dumps([f.get("version") or f.get("sha256") or f.get("published_at") for f in x["fuentes"]]).encode()).hexdigest()[:16]
        x["previous_version_id"] = (p.get("version_id") if p and p.get("version_id") != x["version_id"] else (p or {}).get("previous_version_id"))
        out.append(x)
        print(f"{l['ley'][:40]}: {x['source_status']} (BOE consolidado: {x['fuentes'][1]['estado_consolidacion']}; Portal Jurídic oficial: {x['fuentes'][2]['oficial']})")
    with open(REGISTRO, "w", encoding="utf-8") as f:
        f.write(json.dumps({"_ayuda": __doc__.split("\n")[0], "comprobado": ahora()[:10], "leyes": out}, ensure_ascii=False, indent=1) + "\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
