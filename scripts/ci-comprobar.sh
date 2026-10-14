#!/bin/bash
# Comprobación completa para la rama dev. Escribe un informe legible en $1.
# No se detiene al primer fallo: queremos ver todos los errores de una vez.
OUT="$1"
paso() {
  local nombre="$1"; shift
  echo "===== $nombre" >> "$OUT"
  "$@" >> "$OUT" 2>&1
  local codigo=$?
  echo "===== fin $nombre: código $codigo" >> "$OUT"
  return $codigo
}
: > "$OUT"
estado=0
# npm install (no ci): en dev el package.json cambia y hay que regenerar el lock.
paso "npm install" npm install --no-audit --no-fund || estado=1
paso "typescript" npx tsc -b --pretty false || estado=1
paso "tests" npx vitest run --reporter=dot || estado=1
if [ -f vitest.reglas.config.ts ]; then
  paso "reglas" npx -y firebase-tools@latest emulators:exec --only firestore --project demo-viaje-lector "npx vitest run -c vitest.reglas.config.ts --reporter=verbose" || estado=1
fi
[ -x scripts/ci-extra.sh ] && { paso "extra" scripts/ci-extra.sh || estado=1; }
paso "build" npm run build || estado=1
echo "ESTADO FINAL: $estado" >> "$OUT"
exit $estado
