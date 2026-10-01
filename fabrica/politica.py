"""Política del juez: fuente versionada, de solo lectura y congelada por lote.

- fabrica/politica_juez/registro.json lista las versiones (solo se añaden) con la huella sha256 de su fichero; «activa» es la vigente.
- Cada versión es un fichero JSON que nunca se reescribe: un cambio de política es SIEMPRE una versión nueva (nueva_version).
- Al planificar un lote, la política activa queda congelada en el lote (versión + huella). Validar y cerrar comprueban que el
  fichero sigue siendo exactamente el congelado; si alguien lo ha tocado durante el lote: se bloquea, se registra el intento
  en fabrica/estado/incidencias-politica.json y no se publica nada.
- Ni el generador ni el cierre pueden cambiar la política: nueva_version se niega mientras haya un lote abierto.
"""
import datetime, hashlib, json, os, stat

R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIR = os.path.join(R, "fabrica", "politica_juez")


class PoliticaBloqueada(SystemExit):
    """Error claro de integridad o de permisos sobre la política del juez (detiene el proceso sin publicar)."""


def _rutas(raiz):
    d = os.path.join(raiz, "fabrica", "politica_juez")
    return d, os.path.join(d, "registro.json"), os.path.join(raiz, "fabrica", "estado", "incidencias-politica.json"), \
        os.path.join(raiz, "fabrica", "sesion", "abierto.json")


def huella(ruta):
    with open(ruta, "rb") as f:
        return hashlib.sha256(f.read()).hexdigest()


def registro(raiz=R):
    return json.load(open(_rutas(raiz)[1], encoding="utf-8"))


def _entrada(version, raiz):
    for e in registro(raiz)["versiones"]:
        if e["version"] == version:
            return e
    raise PoliticaBloqueada(f"POLÍTICA DEL JUEZ BLOQUEADA: la versión {version} no está en el registro.")


def incidencia(tipo, detalle, raiz=R, lote=None):
    ruta = _rutas(raiz)[2]
    log = json.load(open(ruta, encoding="utf-8")) if os.path.exists(ruta) else []
    log.append({"fecha": datetime.datetime.now().isoformat(timespec="seconds"), "tipo": tipo, "lote": lote, "detalle": detalle})
    os.makedirs(os.path.dirname(ruta), exist_ok=True)
    with open(ruta, "w", encoding="utf-8") as f:
        f.write(json.dumps(log, ensure_ascii=False, indent=1) + "\n")


def cargar(version=None, raiz=R):
    """Devuelve {version, sha256, componentes} comprobando que el fichero coincide con su huella registrada."""
    version = version or registro(raiz)["activa"]
    e = _entrada(version, raiz)
    ruta = os.path.join(raiz, e["fichero"])
    if not os.path.exists(ruta) or huella(ruta) != e["sha256"]:
        incidencia("politica_alterada", f"{e['fichero']} no coincide con la huella registrada de {version}", raiz)
        raise PoliticaBloqueada(f"POLÍTICA DEL JUEZ BLOQUEADA: {e['fichero']} ha sido modificado (no coincide con la huella de {version}). "
                                "No se publica nada. Un cambio de política debe ser una versión nueva (fabrica.politica.nueva_version).")
    doc = json.load(open(ruta, encoding="utf-8"))
    return {"version": version, "sha256": e["sha256"], "componentes": doc["componentes"]}


def proteger(raiz=R):
    """Ficheros de política en solo lectura dentro de la ejecución (además de la huella, que es la garantía real)."""
    for e in registro(raiz)["versiones"]:
        ruta = os.path.join(raiz, e["fichero"])
        if os.path.exists(ruta):
            os.chmod(ruta, stat.S_IRUSR | stat.S_IRGRP | stat.S_IROTH)


def congelar(raiz=R):
    """Política activa congelada para un lote: {judge_policy_version, sha256, congelada_el}."""
    p = cargar(None, raiz)
    proteger(raiz)
    return {"judge_policy_version": p["version"], "sha256": p["sha256"], "congelada_el": datetime.datetime.now().isoformat(timespec="seconds")}


def verificar(congelada, raiz=R, lote=None):
    """La política del lote sigue intacta: misma versión activa, mismo fichero, misma huella. Si no: bloquea y registra."""
    if not congelada or not congelada.get("judge_policy_version"):
        incidencia("lote_sin_politica", "lote sin política congelada", raiz, lote)
        raise PoliticaBloqueada(f"POLÍTICA DEL JUEZ BLOQUEADA: el lote {lote} no tiene política congelada; no se publica.")
    v = congelada["judge_policy_version"]
    try:
        p = cargar(v, raiz)
    except PoliticaBloqueada:
        incidencia("intento_modificacion", f"la política {v} cambió durante el lote", raiz, lote)
        raise
    if p["sha256"] != congelada["sha256"]:
        incidencia("intento_modificacion", f"huella de {v} distinta de la congelada en el lote", raiz, lote)
        raise PoliticaBloqueada(f"POLÍTICA DEL JUEZ BLOQUEADA: la política {v} no es la congelada al planificar {lote}. No se publica.")
    if registro(raiz)["activa"] != v:
        incidencia("intento_modificacion", f"la política activa cambió de {v} a {registro(raiz)['activa']} durante el lote", raiz, lote)
        raise PoliticaBloqueada(f"POLÍTICA DEL JUEZ BLOQUEADA: la política activa cambió durante el lote {lote}. No se publica.")
    return p


def nueva_version(componentes, motivo, autor, raiz=R, activar=True):
    """Crea juez-sesion-vN+1 (nunca sobrescribe) y la registra. Prohibido con un lote abierto (el generador no cambia el juez)."""
    d, reg_ruta, _, abierto = _rutas(raiz)
    if os.path.exists(abierto):
        lote = json.load(open(abierto, encoding="utf-8")).get("lote")
        incidencia("intento_modificacion", f"nueva versión de política pedida por {autor} con el lote {lote} abierto", raiz, lote)
        raise PoliticaBloqueada(f"POLÍTICA DEL JUEZ BLOQUEADA: hay un lote abierto ({lote}); la política no puede cambiar durante una ejecución.")
    reg = registro(raiz)
    mayores = [int(e["version"].rsplit("-v", 1)[1]) for e in reg["versiones"] if e["version"].rsplit("-v", 1)[1].isdigit()]
    version = f"juez-sesion-v{max(mayores, default=0) + 1}"
    fichero = os.path.join("fabrica", "politica_juez", f"{version}.json")
    ruta = os.path.join(raiz, fichero)
    if os.path.exists(ruta):
        raise PoliticaBloqueada(f"POLÍTICA DEL JUEZ BLOQUEADA: {fichero} ya existe; una versión nunca se sobrescribe.")
    with open(ruta, "w", encoding="utf-8") as f:
        f.write(json.dumps({"version": version, "componentes": componentes, "nota": motivo}, ensure_ascii=False, indent=1) + "\n")
    reg["versiones"].append({"version": version, "fichero": fichero, "sha256": huella(ruta), "estado": "activa" if activar else "registrada",
                             "primer_uso": None, "lotes": [], "origen": f"nueva versión creada por {autor}", "nota": motivo,
                             "creada_el": datetime.datetime.now().isoformat(timespec="seconds")})
    if activar:
        for e in reg["versiones"]:
            if e["version"] == reg["activa"]:
                e["estado"] = "historica"
        reg["activa"] = version
    with open(reg_ruta, "w", encoding="utf-8") as f:
        f.write(json.dumps(reg, ensure_ascii=False, indent=1) + "\n")
    proteger(raiz)
    return version


def prompt_revisor(p, lote):
    """Texto exacto que recibe el juez del modo sesión: la plantilla de la versión con el lote (única sustitución)."""
    return p["componentes"]["prompt_revisor"].replace("{LOTE}", lote)
