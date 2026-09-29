"""Herramienta de ayuda: sugiere las normas de cada tema a partir de su título (regex).
No se usa al construir la web: la asignación definitiva vive en catalogo/oposiciones/<id>.json y la revisa una persona.
Uso: python3 catalogo/sugerir_normas.py "Título del tema"
"""
import re, sys
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
    (r"personal funcionario|funcionarios|personal al servicio|empleados p[uú]blicos|(?i:selecci[oó]n de personal|provisi[oó]n de puestos|promoci[oó]n interna|carrera profesional|personal laboral al servicio)", ["BOE-A-2015-11719"], False),
    (r"(?i:acceso al empleo p[uú]blico.*discapacidad)", ["BOE-A-2015-11719", "BOE-A-2013-12632"], False),
    (r"(?i:fuentes del derecho administrativo|jerarqu[ií]a de las fuentes|decreto-ley y decreto legislativo|el reglamento: concepto)", ["BOE-A-1978-31229", "BOE-A-2015-10565", "BOE-A-1997-25336"], False),
    (r"(?i:modificaciones de los cr[eé]ditos|gastos plurianuales|control del gasto p[uú]blico|funci[oó]n interventora|anticipos de caja fija)", ["BOE-A-2003-21614"], False),
    (r"(?i:registro y archivo|funciones del registro)", ["BOE-A-2015-10565"], False),
    (r"(?i:administraci[oó]n electr[oó]nica y servicios al ciudadano)", ["BOE-A-2015-10565", "BOE-A-2015-10566"], False),
    (r"Gobierno Abierto", ["BOE-A-2013-12887"], False),
    (r"(?i:actividad de limitaci[oó]n, arbitral, de servicio p[uú]blico y de fomento)", ["BOE-A-2003-20977", "BOE-A-2017-12902"], False),
    (r"[Ii]ncompatibilidades", ["BOE-A-1985-151"], False),
    (r"[Pp]resupuest", ["BOE-A-2003-21614"], False),
    (r"igualdad y contra la violencia de g[eé]nero", ["BOE-A-2007-6115", "BOE-A-2004-21760"], False),
    (r"LGTBI", ["BOE-A-2023-5366"], False),
    (r"Discapacidad y dependencia", ["BOE-A-2013-12632", "BOE-A-2006-21990"], False),
    (r"contratos del sector p[uú]blico|Contratos del Sector P[uú]blico", ["BOE-A-2017-12902"], False),
    (r"[Ss]ubvenciones", ["BOE-A-2003-20977"], False),
    (r"Seguridad Social", ["BOE-A-2015-11724"], False),
    (r"(?i:expropiaci[oó]n forzosa)", ["BOE-A-1954-15431"], False),
    (r"(?i:r[eé]gimen patrimonial|dominio p[uú]blico|bienes patrimoniales)", ["BOE-A-2003-20254"], False),
    (r"(?i:servicios p[uú]blicos de empleo|evoluci[oó]n del empleo)", ["BOE-A-2023-5365"], False),
    (r"(?i:extranjeros|inmigraci[oó]n)", ["BOE-A-2000-544"], False),
    (r"(?i:derecho de asilo|refugiado)", ["BOE-A-2009-17242"], False),
    (r"(?i:sistema sanitario)", ["BOE-A-1986-10499"], False),
    (r"(?i:sistema tributario|ingresos p[uú]blicos)", ["BOE-A-2003-23186"], False),
    (r"(?i:pol[ií]tica ambiental|biodiversidad)", ["BOE-A-2007-21490"], False),
    (r"(?i:cambio clim[aá]tico)", ["BOE-A-2021-8447"], False),
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


if __name__ == "__main__":
    for t in sys.argv[1:]: print(clasificar(t))
