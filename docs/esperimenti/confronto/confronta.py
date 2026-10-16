"""Confronto fra le proposte dell'individuazione assistita (capp. VI-X) e le occorrenze del dataset.
Richiede i fogli di lavoro riservati (con estratti), non pubblicati. Eseguito sul dataset al commit 133692c (10/10/2026).
Abbinamento: stessa pagina +/-1; >=90% delle parole dell'estratto dell'occorrenza nell'estratto proposto; bonus 0,5 se il luogo proposto coincide.
"""
import openpyxl,glob,csv,re,collections as C,unicodedata,json,sys
import os
# Percorsi dei materiali riservati (fogli di lavoro con estratti, NON pubblicati) e delle tabelle del dataset.
U=os.environ.get('ESTRAZIONE_DIR','materiali_riservati/')
TABLES=os.environ.get('TABLES_DIR','data/source/tables')
files={'VI':'estrazione_cap6_p166-175.xlsx','VII':'GaddAtlas_cap7_estrazione_spaziale.xlsx','VIII':'GaddAtlas_cap8_estrazione_spaziale.xlsx','IX':'GaddAtlas_cap09_estrazione_spaziale.xlsx','X':'GaddAtlas_cap10_estrazione_spaziale.xlsx'}
P=[]
for ch,f in files.items():
    ws=openpyxl.load_workbook(U+f,read_only=True,data_only=True).worksheets[0]
    rows=list(ws.iter_rows(values_only=True)); h=rows[0]
    for r in rows[1:]:
        if not r[0]: continue
        d=dict(zip(h,r)); d['ch']=ch
        try: d['page']=int(d['Page_Count'])
        except: d['page']=int(re.sub(r'\D','',str(d['Source_Reference']))[:3] or 0)
        P.append(d)
L=lambda n:list(csv.DictReader(open(f'{TABLES}/{n}.tsv',encoding='utf-8'),delimiter='\t'))
R=L('References'); NP={p['NarrativePlace_ID']:p for p in L('NarrativePlaces')}
def toks(s):
    s=unicodedata.normalize('NFKD',str(s or '')).lower()
    s=re.sub(r'[^a-z0-9 ]',' ',s.replace('’',' ').replace("'",' '))
    return [t for t in s.split() if len(t)>2]
def gpage(r):
    m=re.match(r'A (\d+)',r['Source_Reference']); return int(m.group(1)) if m else None
rng={}
for ch in files:
    ps=[p['page'] for p in P if p['ch']==ch]; rng[ch]=(min(ps),max(ps))
G=[r for r in R if r['Witness_ID']=='qpa' and gpage(r) and any(a<=gpage(r)<=b for a,b in rng.values())]
# match each gold ref to best proposal on same page
used=set(); match={}
for g in G:
    gp=gpage(g); gt=set(toks(g['Excerpt']))
    best=None;bs=0
    for i,p in enumerate(P):
        if abs(p['page']-gp)>1: continue
        pt=set(toks(p['Excerpt']))
        ov=len(gt&pt)/max(1,len(gt))
        sc=ov+(0.5 if str(p['Luogo_proposto'] or '').strip()==g['NarrativePlace_ID'] else 0)
        if sc>bs: bs,best=sc,i
    if best is not None and bs>=0.9: match[g['Reference_ID']]=(best,bs)
acc=C.Counter(); 
accepted_idx=C.Counter(i for i,_ in match.values())
print('ranges',rng)
print('proposals',len(P),C.Counter(p['ch'] for p in P))
print('stato',C.Counter(p['Stato_luogo'] for p in P))
print('modalita',C.Counter(p['Modalita'] for p in P))
print('gold refs in ranges',len(G),C.Counter(next(ch for ch,(a,b) in rng.items() if a<=gpage(g)<=b) for g in G))
print('gold matched',len(match),'unmatched',len(G)-len(match))
print('distinct proposals matched',len(accepted_idx))
samep=sum(1 for g in G if g['Reference_ID'] in match and str(P[match[g['Reference_ID']][0]]['Luogo_proposto']).strip()==g['NarrativePlace_ID'])
print('matched with same place id',samep)
# acceptance by modality and stato among proposals
mod_tot=C.Counter(p['Modalita'] for p in P); mod_acc=C.Counter(P[i]['Modalita'] for i in accepted_idx)
for m in mod_tot: print(' mod',m,mod_tot[m],mod_acc[m],round(100*mod_acc[m]/mod_tot[m],1))
st_tot=C.Counter(p['Stato_luogo'] for p in P); st_acc=C.Counter(P[i]['Stato_luogo'] for i in accepted_idx)
for m in st_tot: print(' stato',m,st_tot[m],st_acc[m])
ch_tot=C.Counter(p['ch'] for p in P); ch_acc=C.Counter(P[i]['ch'] for i in accepted_idx)
for m in ch_tot: print(' ch',m,ch_tot[m],ch_acc[m])

un=[g for g in G if g['Reference_ID'] not in match]
print('UNMATCHED gold sample:')
for g in un[:25]: print(' ',g['Source_Reference'],g['NarrativePlace_ID'],'|',g['Excerpt'][:90])

# --- extra stats
imag5={'roccafringoli','monte_nuncupale','scerpure','casa_del_butiro','castel_porcano'}
agree=C.Counter()
for gid,(i,sc) in match.items():
    g=next(x for x in G if x['Reference_ID']==gid); p=P[i]
    if str(p['Luogo_proposto']).strip()!=g['NarrativePlace_ID']: continue
    fin=NP.get(g['NarrativePlace_ID'],{}).get('Reality_Status','')
    if g['NarrativePlace_ID'] in imag5: fin='invented'
    hyp=str(p['Reality_Status_ipotesi'] or '').strip().lower()
    agree[(hyp==fin)]+=1
print('status hyp agrees with final (same-place matches):',agree)
acc_places=set(str(P[i]['Luogo_proposto']).strip() for i in accepted_idx)
rej=[p for i,p in enumerate(P) if i not in accepted_idx and p['Stato_luogo']=='NUOVO']
names=C.Counter(str(p['Luogo_proposto']).strip() for p in rej)
print('rejected NUOVO rows',len(rej),'distinct proposed new places',len(names))
print('most frequent rejected new places:',names.most_common(40))
sc=[p for p in P if p['Stato_luogo']=='SCARTATO']
print('SCARTATO notes sample:')
for p in sc[:15]: print('  ',p['Source_Reference'],p['Luogo_proposto'],'|',str(p['Nota'])[:90])
# distinct places proposed vs final distinct places in these pages
print('distinct proposed places',len(set(str(p['Luogo_proposto']).strip() for p in P if p['Stato_luogo']!='SCARTATO')),'final distinct places in pages',len({g['NarrativePlace_ID'] for g in G}))
