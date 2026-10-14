#!/bin/bash
# Sondeo de endpoints externos (se ejecuta en GitHub, que sí tiene Internet).
ORIGEN="https://carlosbotella.github.io"
sondear() {
  echo "--- $1"
  curl -sS -m 120 -o /tmp/cuerpo -D /tmp/cabeceras -H "Origin: $ORIGEN" -w "HTTP %{http_code} · %{size_download} bytes · %{time_total}s\n" "$1"
  grep -i -E '^(access-control|content-type|content-encoding|cache-control)' /tmp/cabeceras
  echo "inicio del cuerpo:"; head -c 600 /tmp/cuerpo; echo
}
sondear "https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/es/es_50k.txt"
sondear "https://api.arasaac.org/v1/pictograms/all/es"
python3 - <<'PY'
import json
d=json.load(open('/tmp/cuerpo'))
print("pictogramas:", len(d))
print("claves del primero:", sorted(d[0].keys()))
print("ejemplo:", json.dumps({k:d[0][k] for k in d[0] if k in ('_id','keywords','sex','violence','categories','tags','schematic','aac','skin','hair')}, ensure_ascii=False)[:800])
print("sex=True:", sum(1 for p in d if p.get('sex')), " violence=True:", sum(1 for p in d if p.get('violence')))
PY
echo "--- comprimido (gzip) del listado"
curl -sS -m 120 -o /dev/null -H 'Accept-Encoding: gzip' -w "gzip: %{size_download} bytes\n" "https://api.arasaac.org/v1/pictograms/all/es"
sondear "https://api.arasaac.org/v1/pictograms/es/search/pato"
sondear "https://static.arasaac.org/pictograms/2271/2271_300.png"
curl -sS -m 30 -o /dev/null -D - "https://api.arasaac.org/docs" | head -5
exit 0
