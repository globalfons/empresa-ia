"""Convierte el Markdown consolidado del BOE (espejo legalize-es) en datos/<slug>-articulos.json.
Uso: python3 datos/parse_boe.py fuente.md salida.json
"""
import re,json,sys
UN={'primero':1,'segundo':2,'tercero':3,'cuarto':4,'quinto':5,'sexto':6,'séptimo':7,'septimo':7,'octavo':8,'noveno':9,'décimo':10,'decimo':10,'undécimo':11,'duodécimo':12,'decimotercero':13,'decimocuarto':14,'decimoquinto':15,'decimosexto':16,'decimoséptimo':17,'decimoctavo':18,'decimonoveno':19,'vigésimo':20}
DEC={'vigésimo':20,'trigésimo':30,'cuadragésimo':40,'quincuagésimo':50,'sexagésimo':60,'septuagésimo':70,'octogésimo':80,'nonagésimo':90,'centésimo':100}
CARD={'uno':1,'una':1,'dos':2,'tres':3,'cuatro':4,'cinco':5,'seis':6,'siete':7,'ocho':8,'nueve':9,'diez':10,'once':11,'doce':12,'trece':13,'catorce':14,'quince':15,'dieciséis':16,'dieciseis':16,'diecisiete':17,'dieciocho':18,'diecinueve':19,'veinte':20,'veintiuno':21,'veintiún':21,'veintidós':22,'veintidos':22,'veintitrés':23,'veintitres':23,'veinticuatro':24,'veinticinco':25,'veintiséis':26,'veintiseis':26,'veintisiete':27,'veintiocho':28,'veintinueve':29,'treinta':30,'cuarenta':40,'cincuenta':50,'sesenta':60,'setenta':70,'ochenta':80,'noventa':90,'cien':100,'ciento':100}
def palabra(w):
    t=[x for x in w.lower().split() if x!='y']
    if t and all(x in CARD for x in t): return sum(CARD[x] for x in t)
    return palabra0(w)
def palabra0(w):
    w=w.lower().strip()
    if w in UN: return UN[w]
    parts=w.split()
    tot=0
    for x in parts:
        if x in DEC: tot+=DEC[x]
        elif x in UN: tot+=UN[x]
        else: return None
    return tot or None
src,out=sys.argv[1],sys.argv[2]
t=open(src).read()
t=t.split('\n---\n',1)[1] if t.startswith('---') else t
arts=[];cur=None;ctx={'titulo':'','capitulo':''}
for line in t.split('\n'):
    m=re.match(r'^#{2,6}\s+(Artículo\s+(\d+(?:\s?(?:bis|ter|qu[aá]ter|quinquies|sexies|septies|octies|nonies|decies)\b(?:\s[a-z](?=\.))?)?)\.?\s*(.*))$',line)
    if m:
        n=m.group(2).replace(' ','').replace('á','a')
        k=int(re.match(r'\d+',n).group())
        if any(a['n']==n for a in arts) or (arts and k<max(int(re.match(r'\d+',a['n']).group()) for a in arts)):
            cur=None; continue  # texto citado de otra ley (disposiciones finales)
        cur={'n':n,'titulo':m.group(3).strip().rstrip('.'),'bloque':ctx['titulo'],'capitulo':ctx['capitulo'],'texto':''};arts.append(cur);continue
    m=re.match(r'^#{2,6}\s+Artículo\s+([a-záéíóúñ ]+?)\.?\s*$',line,re.I)
    if m and palabra(m.group(1)):
        cur={'n':str(palabra(m.group(1))),'titulo':'','bloque':ctx['titulo'],'capitulo':ctx['capitulo'],'texto':''};arts.append(cur);continue
    h=re.match(r'^(#{2,6})\s+(.*)$',line)
    if h:
        s=h.group(2)
        if s.upper().startswith('TÍTULO') or s.upper().startswith('TITULO'): ctx['titulo']=s;ctx['capitulo']='';cur=None
        elif s.upper().startswith('CAPÍTULO'): ctx['capitulo']=s;cur=None
        elif s.startswith('Disposici'): cur=None
        continue
    if cur is not None: cur['texto']+=line+'\n'
for a in arts: a['texto']=re.sub(r'\n{3,}','\n\n',a['texto']).strip()
json.dump(arts,open(out,'w'),ensure_ascii=False,indent=0)
print(len(arts),'artículos')
