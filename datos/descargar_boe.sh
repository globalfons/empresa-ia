#!/bin/sh
# Descarga el texto consolidado de una norma del BOE (espejo legalize-es) y lo convierte a JSON por artículo.
# Uso: sh datos/descargar_boe.sh BOE-A-2003-20254 ley-33-2003
set -e
id="$1"; slug="$2"; tmp="${TMPDIR:-/tmp}/$id.md"
curl -sSf "https://raw.githubusercontent.com/legalize-dev/legalize-es/main/es/$id.md" -o "$tmp"
python3 "$(dirname "$0")/parse_boe.py" "$tmp" "$(dirname "$0")/$slug-articulos.json"
