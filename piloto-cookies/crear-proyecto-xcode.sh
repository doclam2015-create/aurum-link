#!/bin/bash
# Piloto de Cookies: crea el proyecto de Xcode (Mac + iPhone + iPad) a partir de la extensión.
# Uso: abre Terminal en esta carpeta y escribe:  ./crear-proyecto-xcode.sh
set -e
cd "$(dirname "$0")"

if ! xcrun --find safari-web-extension-converter >/dev/null 2>&1; then
  echo "❌ No encuentro Xcode. Instálalo gratis desde la App Store, ábrelo una vez y vuelve a intentar."
  exit 1
fi

BUNDLE="${1:-cl.doclam.pilotocookies}"
echo "▶ Creando el proyecto con el identificador $BUNDLE …"
xcrun safari-web-extension-converter extension \
  --project-location xcode \
  --app-name "Piloto de Cookies" \
  --bundle-identifier "$BUNDLE" \
  --swift --copy-resources --no-open --force --no-prompt

PROJ=$(find xcode -name "*.xcodeproj" -maxdepth 3 | head -1)
echo "✅ Listo: $PROJ"
echo "   Se abrirá Xcode. Sigue la «Parte 3» de la guía (README.md)."
open "$PROJ"
