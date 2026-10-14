#!/bin/bash
# Sondeo de ARASAAC: qué significa el campo "type" de cada keyword.
curl -sS -m 120 -o /tmp/todos.json "https://api.arasaac.org/v1/pictograms/all/es"
python3 - <<'PY'
import json, collections
d=json.load(open('/tmp/todos.json'))
idx=collections.defaultdict(list)
for p in d:
    for k in p.get('keywords',[]):
        idx[k.get('keyword','').lower()].append((p['_id'],k.get('type'),k.get('plural'),p.get('sex'),p.get('violence')))
for w in ['pato','mesa','comer','grande','pequeño','rojo','hola','madrid','mamá','sopa','oso','sol','y','la','dos','tres','el']:
    print(w, idx.get(w,[])[:6])
print('tipos:', collections.Counter(k.get('type') for p in d for k in p.get('keywords',[])))
print('claves de keyword:', sorted({kk for p in d for k in p.get('keywords',[]) for kk in k}))
PY
