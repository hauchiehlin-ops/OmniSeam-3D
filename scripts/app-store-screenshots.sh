#!/usr/bin/env bash
# =============================================================================
# OmniSeam 3D — App Store screenshots from the iOS Simulator
#
# Builds the app in screenshot mode (VITE_SCREENSHOT_MODE=1, never shipped),
# installs it on an iPhone 6.3" and an iPad 13" simulator, drives each scene
# through frontend/src/platform/screenshot-mode.ts, sets a clean status bar
# (9:41, full battery) and saves alpha-free PNGs to:
#   docs/app-store/screenshots/<device>/<lang>/<NN>-<scene>.png
#
# Usage:  scripts/app-store-screenshots.sh
# Env:    LANGS="en zh-TW"                 UI languages (en zh-TW zh-CN ja ko th)
#         SCENES="holes repair report heatmap home"   (ar needs a real device)
#         IPHONE="iPhone 17 Pro"  IPAD="iPad Pro 13-inch (M4)"
#         DEVICES="iphone ipad"                 capture only some devices
#
# App Store Connect sizes: the "iPhone with Dynamic Island (medium)" slot takes
# 6.1"/6.3" shots (1179x2556 or 1206x2622): iPhone 17 Pro = 1206x2622.
# =============================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FRONTEND="$ROOT/frontend"
OUT="$ROOT/docs/app-store/screenshots"
LANGS="${LANGS:-en zh-TW}"
SCENES="${SCENES:-holes repair report heatmap home}"
IPHONE="${IPHONE:-iPhone 17 Pro}"
IPHONE_LABEL="${IPHONE_LABEL:-iphone-6.3in}"
DEVICES="${DEVICES:-iphone ipad}"
IPAD="${IPAD:-iPad Pro 13-inch (M4)}"
BUNDLE_ID="$(sed -n "s/.*appId: *'\([^']*\)'.*/\1/p" "$FRONTEND/capacitor.config.ts" | sed -n 1p)"
DERIVED="$HOME/Library/Developer/Xcode/DerivedData/OmniSeam3D-Screenshots"
TMP="$(mktemp -d "${TMPDIR:-/tmp}/omniseam-shots.XXXXXX")"
trap 'rm -rf "$TMP"' EXIT

info() { printf "\033[1;34m▶ %s\033[0m\n" "$*"; }
ok()   { printf "\033[1;32m✔ %s\033[0m\n" "$*"; }

device_udid() {
  xcrun simctl list devices available -j | python3 -c "
import json,sys
name=sys.argv[1]
for rt,devs in json.load(sys.stdin)['devices'].items():
    for d in devs:
        if d['name']==name and d.get('isAvailable',True):
            print(d['udid']); sys.exit(0)
sys.exit('Simulator not found: '+name)" "$1"
}

wait_for() {  # seconds per scene ($2 = 1 on iPad, which renders slower)
  local s
  case "$1" in
    home) s=7 ;; holes|heatmap) s=12 ;; repair|report) s=20 ;; *) s=14 ;;
  esac
  [ "${2:-0}" = "1" ] && s=$((s * 3 / 2))
  echo "$s"
}

sim_locale() {  # UI language -> simulator AppleLanguages / AppleLocale (status-bar date)
  case "$1" in
    zh-TW) echo "zh-Hant-TW zh_TW" ;; zh-CN) echo "zh-Hans-CN zh_CN" ;;
    ja) echo "ja-JP ja_JP" ;; ko) echo "ko-KR ko_KR" ;; th) echo "th-TH th_TH" ;;
    *) echo "en-US en_US" ;;
  esac
}

prepare_sim() {  # boot with the given language and a clean status bar
  local udid="$1" lang="$2" apple_lang apple_locale
  read -r apple_lang apple_locale <<<"$(sim_locale "$lang")"
  xcrun simctl boot "$udid" 2>/dev/null || true
  xcrun simctl bootstatus "$udid" -b >/dev/null
  xcrun simctl spawn "$udid" defaults write -g AppleLanguages -array "$apple_lang"
  xcrun simctl spawn "$udid" defaults write -g AppleLocale "$apple_locale"
  xcrun simctl shutdown "$udid" >/dev/null 2>&1 || true
  xcrun simctl boot "$udid"
  xcrun simctl bootstatus "$udid" -b >/dev/null
  xcrun simctl status_bar "$udid" override --time "9:41" --dataNetwork wifi \
    --wifiMode active --wifiBars 3 --cellularMode active --cellularBars 4 \
    --batteryState charged --batteryLevel 100 >/dev/null 2>&1 || true
}

# ---------------------------------------------------------------- build ------
info "Building screenshot-mode app"
cd "$FRONTEND"
[ -d node_modules ] || npm ci --no-audit --no-fund
VITE_SCREENSHOT_MODE=1 npm run build >/dev/null
npx cap sync ios >/dev/null
find ios/App/App/public -name '._*' -delete 2>/dev/null || true
xcodebuild -project ios/App/App.xcodeproj -scheme App -configuration Debug \
  -sdk iphonesimulator -derivedDataPath "$DERIVED" build CODE_SIGNING_ALLOWED=NO \
  | grep -E "error:|BUILD (SUCCEEDED|FAILED)"
APP="$DERIVED/Build/Products/Debug-iphonesimulator/App.app"
[ -d "$APP" ] || { echo "Build failed"; exit 1; }

# ---------------------------------------------------------------- capture ----
capture_device() {
  local label="$1" name="$2" is_ipad="$3" udid
  udid="$(device_udid "$name")"
  info "$label: $name ($udid)"
  xcrun simctl boot "$udid" 2>/dev/null || true
  xcrun simctl bootstatus "$udid" -b >/dev/null
  local orig_langs orig_locale
  orig_langs="$(xcrun simctl spawn "$udid" defaults read -g AppleLanguages 2>/dev/null | tr -d '()" \n' | cut -d, -f1)"
  orig_locale="$(xcrun simctl spawn "$udid" defaults read -g AppleLocale 2>/dev/null || true)"
  xcrun simctl uninstall "$udid" "$BUNDLE_ID" >/dev/null 2>&1 || true
  xcrun simctl install "$udid" "$APP"

  for lang in $LANGS; do
    prepare_sim "$udid" "$lang"
    local container; container="$(xcrun simctl get_app_container "$udid" "$BUNDLE_ID" app)"
    mkdir -p "$OUT/$label/$lang"
    local n=1
    for scene in $SCENES; do
      printf '{"scene":"%s","lang":"%s"}\n' "$scene" "$lang" > "$container/public/demo-scene.json"
      xcrun simctl terminate "$udid" "$BUNDLE_ID" >/dev/null 2>&1 || true
      xcrun simctl launch "$udid" "$BUNDLE_ID" >/dev/null
      sleep "$(wait_for "$scene" "$is_ipad")"
      local file; file="$(printf '%02d-%s.png' "$n" "$scene")"
      xcrun simctl io "$udid" screenshot --type=png "$TMP/$file" >/dev/null 2>&1
      # App Store rejects screenshots with an alpha channel: flatten if present.
      if [ "$(sips -g hasAlpha "$TMP/$file" | awk '/hasAlpha/{print $2}')" = "yes" ]; then
        sips -s format jpeg "$TMP/$file" --out "$TMP/flat.jpg" >/dev/null
        sips -s format png "$TMP/flat.jpg" --out "$TMP/$file" >/dev/null
      fi
      cp "$TMP/$file" "$OUT/$label/$lang/$file"
      ok "$label/$lang/$file  $(sips -g pixelWidth -g pixelHeight "$TMP/$file" | awk '/pixel/{printf "%s ", $2}')"
      n=$((n + 1))
    done
  done
  xcrun simctl terminate "$udid" "$BUNDLE_ID" >/dev/null 2>&1 || true
  xcrun simctl status_bar "$udid" clear >/dev/null 2>&1 || true
  # Restore the simulator's original language
  if [ -n "$orig_langs" ]; then
    xcrun simctl spawn "$udid" defaults write -g AppleLanguages -array "$orig_langs"
    [ -n "$orig_locale" ] && xcrun simctl spawn "$udid" defaults write -g AppleLocale "$orig_locale"
  fi
}

case " $DEVICES " in *" iphone "*) capture_device "$IPHONE_LABEL" "$IPHONE" 0 ;; esac
case " $DEVICES " in *" ipad "*) capture_device "ipad-13in" "$IPAD" 1 ;; esac

# ------------------------------------------------- restore normal web build --
info "Restoring the normal (production) web build in the iOS project"
cd "$FRONTEND" && npm run build >/dev/null && npx cap sync ios >/dev/null
find "$OUT" -name '._*' -delete 2>/dev/null || true
ok "Screenshots saved in docs/app-store/screenshots/"
