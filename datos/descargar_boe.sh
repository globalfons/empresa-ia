#!/bin/sh
# Descarga el texto consolidado de una norma del BOE (espejo legalize-es) y lo convierte a JSON por artículo.
# Uso: sh datos/descargar_boe.sh BOE-A-2003-20254 ley-33-2003
set -e
id="$1"; slug="$2"; tmp="${TMPDIR:-/tmp}/$id.md"
# Si el espejo no la tiene, se usa la API oficial de datos abiertos del BOE (texto consolidado en XML)
if ! curl -sSf "https://raw.githubusercontent.com/legalize-dev/legalize-es/main/es/$id.md" -o "$tmp" 2>/dev/null; then
  curl -sSf -H "Accept: application/xml" "https://www.boe.es/datosabiertos/api/legislacion-consolidada/id/$id/texto" -o "$tmp.xml"
  python3 "$(dirname "$0")/boe_xml_md.py" "$tmp.xml" "$tmp"
fi
python3 "$(dirname "$0")/parse_boe.py" "$tmp" "$(dirname "$0")/$slug-articulos.json"
