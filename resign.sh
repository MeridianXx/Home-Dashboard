#!/usr/bin/env bash
# resign.sh — bygg och installera Boet på en ansluten iPhone via Xcode CLI.
#
# Sideloadade appar med gratis Apple Developer-konto är giltiga i 7 dagar.
# Kör det här skriptet var ~6:e dag för att bygga om och re-installera.
#
# FÖRSTA GÅNGEN:
#   1. Anslut iPhone via USB och godkänn "Trust this computer".
#   2. Kör `xcrun xctrace list devices` (eller `system_profiler SPUSBDataType`)
#      och hitta din iPhones UDID (formatet är typ 00008110-001A2B3C4D5E6F8E).
#   3. Klistra in UDID:t nedan i variabeln DEVICE_UDID.
#   4. Öppna ios/App/App.xcodeproj i Xcode en gång och fyll i
#      Signing & Capabilities (Team + Bundle Identifier).
#
# DEVICE_UDID="00000000-0000000000000000"   # ← FYLL I DIN IPHONES UDID HÄR
DEVICE_UDID="00008120-0011308036BBA01E"

set -euo pipefail

cd "$(dirname "$0")"

if [[ -z "${DEVICE_UDID}" ]]; then
  echo "✗ DEVICE_UDID är inte satt. Öppna resign.sh och fyll i din iPhones UDID."
  echo "  Hitta UDID:t med:  xcrun xctrace list devices"
  exit 1
fi

echo "▶ npx cap sync ios"
npx cap sync ios

echo "▶ xcodebuild clean install"
xcodebuild \
  -project ios/App/App.xcodeproj \
  -scheme App \
  -configuration Debug \
  -destination "id=${DEVICE_UDID}" \
  -allowProvisioningUpdates \
  clean install

echo "✓ Klart. Boet ska nu vara nyinstallerad på iPhonen."
echo "  Den fungerar i 7 dagar från idag — kör skriptet igen innan dess."
