#!/bin/bash
curl -sS -m 120 -o /tmp/todos.json "https://api.arasaac.org/v1/pictograms/all/es"
python3 - <<'PY'
import json, collections
d=json.load(open('/tmp/todos.json'))
idx=collections.defaultdict(list)
for p in d:
    for i,k in enumerate(p.get('keywords',[])):
        if k.get('type')==2: idx[k.get('keyword','').lower()].append((i,p['_id'],p.get('categories',[]),p.get('tags',[])))
for w in ['mesa','sopa','oso','pato','mamá','casa','mano','libro','pelota','nada','vida','más','vez','verdad','uso','tiempo','paseo','museo','poesía','momento','drogas','muerte','misa','pipí','bala','guerra','mundo','hombres','amor','día','seguro','cariño','noche']:
    e=sorted(idx.get(w,[]))[:1]
    for i,pid,c,t in e: print(f"{w:9} #{pid} pos{i} cats={c} tags={t}")
    if not e: print(w,'—')
cats=collections.Counter(c for p in d for c in p.get('categories',[]))
print('CATEGORIAS', len(cats)); print(cats.most_common(400))
PY
