#!/usr/bin/env bash
# =============================================================================
# OmniSeam 3D — one-command Apple release
#   bump version → build web app → sync Capacitor → archive → upload to
#   App Store Connect (TestFlight) → optional git commit/tag/push
#
# One iOS build covers every Apple platform the app ships on:
#   • iPhone and iPad (universal build, TARGETED_DEVICE_FAMILY = 1,2)
#   • Mac with Apple silicon and Apple Vision Pro, through App Store Connect's
#     "iPhone and iPad apps on Apple silicon Macs / Apple Vision Pro" availability
#     (no separate build needed; see docs/app-store/ASC-上架手冊.md).
#
# Usage
#   scripts/apple-release.sh [patch|minor|major|none] [options]
#
#   patch|minor|major   bump the marketing version first (default: patch)
#   none                keep the current version, only upload a new build
#
# Options
#   --no-upload         archive and export an .ipa locally, do not upload
#   --check             unsigned archive only (no Apple account needed); validates
#                       the pipeline end to end, nothing is uploaded or bumped
#   --git               commit the version bump and tag it (ios-v<ver>-b<build>)
#   --push              like --git, then push the commit and tag to origin
#   --build-number N    use N instead of the timestamp build number
#   -h, --help          show this help
#
# Configuration (required unless --check): copy .asc.env.example to .asc.env
#   APPLE_TEAM_ID      10-character Team ID (developer.apple.com → Membership)
#   ASC_KEY_ID         App Store Connect API key ID
#   ASC_ISSUER_ID      App Store Connect API issuer ID (UUID)
#   ASC_KEY_PATH       absolute path to AuthKey_<KEY_ID>.p8
#   BUNDLE_ID          optional, defaults to the value in capacitor.config.ts
# =============================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FRONTEND="$ROOT/frontend"
PROJECT="$FRONTEND/ios/App/App.xcodeproj"
SCHEME="App"
# Archives and exports live on the internal (APFS) disk: macOS writes AppleDouble
# "._*" files on exFAT volumes, which would break the code signature.
ARCHIVE_ROOT="$HOME/Library/Developer/Xcode/Archives/OmniSeam3D"
EXPORT_ROOT="$HOME/Library/Developer/Xcode/Exports/OmniSeam3D"
DERIVED_DATA="$HOME/Library/Developer/Xcode/DerivedData/OmniSeam3D-Release"

BUMP="patch"; UPLOAD=1; CHECK=0; GIT=0; PUSH=0; BUILD_NUMBER=""

c_info() { printf "\033[1;34m▶ %s\033[0m\n" "$*"; }
c_ok()   { printf "\033[1;32m✔ %s\033[0m\n" "$*"; }
c_warn() { printf "\033[1;33m⚠ %s\033[0m\n" "$*"; }
die()    { printf "\033[1;31m✘ %s\033[0m\n" "$*" >&2; exit 1; }
usage()  { sed -n '2,32p' "$0" | sed 's/^# \{0,1\}//'; exit 0; }

while [ $# -gt 0 ]; do
  case "$1" in
    patch|minor|major|none) BUMP="$1" ;;
    --no-upload) UPLOAD=0 ;;
    --check) CHECK=1; UPLOAD=0; BUMP="none" ;;
    --git) GIT=1 ;;
    --push) GIT=1; PUSH=1 ;;
    --build-number) shift; BUILD_NUMBER="${1:-}" ;;
    -h|--help) usage ;;
    *) die "Unknown argument: $1 (see --help)" ;;
  esac
  shift
done

# ---------------------------------------------------------------- preflight --
c_info "Preflight"
command -v xcodebuild >/dev/null || die "Xcode is not installed (xcodebuild not found)."
command -v npm >/dev/null || die "Node.js/npm is not installed."
command -v python3 >/dev/null || die "python3 is not installed."
xcodebuild -version | sed -n 1p

if [ -f "$ROOT/.asc.env" ]; then
  # shellcheck disable=SC1091
  set -a; . "$ROOT/.asc.env"; set +a
fi

CAP_BUNDLE_ID="$(sed -n "s/.*appId: *'\([^']*\)'.*/\1/p" "$FRONTEND/capacitor.config.ts" | sed -n 1p)"
BUNDLE_ID="${BUNDLE_ID:-$CAP_BUNDLE_ID}"
[ -n "$BUNDLE_ID" ] || die "Could not determine the bundle ID."

if [ "$CHECK" -eq 0 ]; then
  : "${APPLE_TEAM_ID:?Set APPLE_TEAM_ID in .asc.env (see .asc.env.example)}"
  : "${ASC_KEY_ID:?Set ASC_KEY_ID in .asc.env}"
  : "${ASC_ISSUER_ID:?Set ASC_ISSUER_ID in .asc.env}"
  : "${ASC_KEY_PATH:?Set ASC_KEY_PATH in .asc.env}"
  [ -f "$ASC_KEY_PATH" ] || die "API key file not found: $ASC_KEY_PATH"
  [ "$BUNDLE_ID" = "$CAP_BUNDLE_ID" ] || die "BUNDLE_ID ($BUNDLE_ID) differs from capacitor.config.ts appId ($CAP_BUNDLE_ID). Change both (and PRODUCT_BUNDLE_IDENTIFIER in Xcode) together."
  AUTH_ARGS=(-allowProvisioningUpdates
             -authenticationKeyPath "$ASC_KEY_PATH"
             -authenticationKeyID "$ASC_KEY_ID"
             -authenticationKeyIssuerID "$ASC_ISSUER_ID")
fi

if [ "$GIT" -eq 1 ] && [ -n "$(git -C "$ROOT" status --porcelain --untracked-files=no)" ]; then
  die "--git/--push needs a clean working tree (commit or stash your changes first)."
fi

# ------------------------------------------------------------------ version --
cd "$ROOT"
if [ "$BUMP" != "none" ]; then
  c_info "Bumping version ($BUMP)"
  python3 scripts/bump_version.py "$BUMP"
fi
VERSION="$(python3 -c "import json;print(json.load(open('frontend/package.json'))['version'])")"
[[ "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] || die "Version '$VERSION' is not MAJOR.MINOR.PATCH."
# Build numbers must increase for every upload of the same version: use a timestamp.
BUILD_NUMBER="${BUILD_NUMBER:-$(date +%Y%m%d%H%M)}"
[[ "$BUILD_NUMBER" =~ ^[0-9]+$ ]] || die "Build number must be digits only."
c_ok "Version $VERSION (build $BUILD_NUMBER) · bundle $BUNDLE_ID"

# ------------------------------------------------------------ web + capacitor --
c_info "Building web app and syncing into the iOS project"
cd "$FRONTEND"
[ -d node_modules ] || npm ci --no-audit --no-fund
npm run build
npx cap sync ios
find "$FRONTEND/ios/App/App/public" -name '._*' -delete 2>/dev/null || true

# ------------------------------------------------------------------ archive --
mkdir -p "$ARCHIVE_ROOT" "$EXPORT_ROOT"
ARCHIVE="$ARCHIVE_ROOT/OmniSeam3D-$VERSION-$BUILD_NUMBER.xcarchive"
COMMON=(-project "$PROJECT" -scheme "$SCHEME" -configuration Release
        -destination "generic/platform=iOS" -derivedDataPath "$DERIVED_DATA"
        MARKETING_VERSION="$VERSION" CURRENT_PROJECT_VERSION="$BUILD_NUMBER"
        PRODUCT_BUNDLE_IDENTIFIER="$BUNDLE_ID")

c_info "Archiving → $ARCHIVE"
if [ "$CHECK" -eq 1 ]; then
  xcodebuild archive "${COMMON[@]}" -archivePath "$ARCHIVE" \
    CODE_SIGNING_ALLOWED=NO CODE_SIGNING_REQUIRED=NO | tail -5
else
  xcodebuild archive "${COMMON[@]}" -archivePath "$ARCHIVE" \
    DEVELOPMENT_TEAM="$APPLE_TEAM_ID" CODE_SIGN_STYLE=Automatic \
    "${AUTH_ARGS[@]}" | tail -5
fi
[ -d "$ARCHIVE" ] || die "Archive failed."
APP_PLIST="$ARCHIVE/Products/Applications/App.app/Info.plist"
c_ok "Archived: $(/usr/libexec/PlistBuddy -c 'Print CFBundleShortVersionString' "$APP_PLIST") ($(/usr/libexec/PlistBuddy -c 'Print CFBundleVersion' "$APP_PLIST")) · $(/usr/libexec/PlistBuddy -c 'Print CFBundleIdentifier' "$APP_PLIST")"

if [ "$CHECK" -eq 1 ]; then
  [ -f "$ARCHIVE/Products/Applications/App.app/PrivacyInfo.xcprivacy" ] && c_ok "Privacy manifest bundled" || die "PrivacyInfo.xcprivacy missing from the app bundle"
  LEFT=$(find "$ARCHIVE" -name '._*' | wc -l | tr -d ' ')
  [ "$LEFT" = "0" ] && c_ok "No AppleDouble files in the archive" || die "$LEFT AppleDouble files found in the archive"
  c_ok "Check passed. Nothing was signed, bumped or uploaded."
  exit 0
fi

# ------------------------------------------------------------ export/upload --
EXPORT_DIR="$EXPORT_ROOT/$VERSION-$BUILD_NUMBER"
mkdir -p "$EXPORT_DIR"
OPTS="$EXPORT_DIR/ExportOptions.plist"
DESTINATION=$([ "$UPLOAD" -eq 1 ] && echo upload || echo export)
cat > "$OPTS" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>method</key><string>app-store-connect</string>
  <key>destination</key><string>$DESTINATION</string>
  <key>teamID</key><string>$APPLE_TEAM_ID</string>
  <key>signingStyle</key><string>automatic</string>
  <key>uploadSymbols</key><true/>
  <key>manageAppVersionAndBuildNumber</key><false/>
  <key>testFlightInternalTestingOnly</key><false/>
</dict>
</plist>
PLIST

if [ "$UPLOAD" -eq 1 ]; then
  c_info "Uploading to App Store Connect"
else
  c_info "Exporting .ipa → $EXPORT_DIR"
fi
xcodebuild -exportArchive -archivePath "$ARCHIVE" -exportPath "$EXPORT_DIR" \
  -exportOptionsPlist "$OPTS" "${AUTH_ARGS[@]}" | tail -8

if [ "$UPLOAD" -eq 1 ]; then
  c_ok "Uploaded $VERSION ($BUILD_NUMBER). App Store Connect → TestFlight shows it after processing (usually 5–30 min)."
else
  c_ok "Exported: $(ls "$EXPORT_DIR"/*.ipa 2>/dev/null || echo "$EXPORT_DIR")"
fi

# ---------------------------------------------------------------------- git --
if [ "$GIT" -eq 1 ]; then
  cd "$ROOT"
  TAG="ios-v$VERSION-b$BUILD_NUMBER"
  if [ "$BUMP" != "none" ]; then
    git add package.json frontend/package.json frontend/src/version.ts backend/app/config.py
    git commit -m "release(ios): v$VERSION build $BUILD_NUMBER"
  fi
  git tag -a "$TAG" -m "App Store build $VERSION ($BUILD_NUMBER)"
  c_ok "Tagged $TAG"
  if [ "$PUSH" -eq 1 ]; then
    git push origin HEAD
    git push origin "$TAG"
    c_ok "Pushed commit and tag"
  fi
elif [ "$BUMP" != "none" ]; then
  c_warn "Version files were bumped to $VERSION but not committed (use --git or --push next time)."
fi
