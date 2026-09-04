#!/bin/bash
set -e

# OmniSeam 3D - Automated Version Bump & Git Push Workflow
# Usage:
#   ./scripts/bump_and_push.sh "Your commit message"                   (defaults to patch)
#   ./scripts/bump_and_push.sh [patch|minor|major] "Your commit message"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$ROOT_DIR"

BUMP_TYPE="patch"
COMMIT_MSG=""

if [ "$1" == "patch" ] || [ "$1" == "minor" ] || [ "$1" == "major" ]; then
    BUMP_TYPE="$1"
    COMMIT_MSG="$2"
else
    COMMIT_MSG="$1"
fi

if [ -z "$COMMIT_MSG" ]; then
    COMMIT_MSG="auto update application changes"
fi

echo "=================================================="
echo "🚀 OmniSeam 3D: Automated Version Bump & Release"
echo "=================================================="

# 1. Bump version across frontend & backend
echo "📦 [1/4] Bumping Semantic Version (${BUMP_TYPE})..."
VERSION_OUTPUT=$(python3 "$SCRIPT_DIR/bump_version.py" "$BUMP_TYPE")
OLD_VER=$(echo "$VERSION_OUTPUT" | awk '{print $1}')
NEW_VER=$(echo "$VERSION_OUTPUT" | awk '{print $3}')
echo "   Version updated: v${OLD_VER} -> v${NEW_VER}"

# 2. Run Test Verification Suite & Frontend Build
echo "🧪 [2/4] Running automated test suite & frontend build..."
"$SCRIPT_DIR/run_tests.sh"

# 3. Git Stage, Commit & Tag
echo "📝 [3/4] Staging changes and committing..."
git add -A
FULL_COMMIT_MSG="release(v${NEW_VER}): ${COMMIT_MSG}"
git commit -m "$FULL_COMMIT_MSG"

echo "🏷️ Tagging release v${NEW_VER}..."
git tag -a "v${NEW_VER}" -m "Release v${NEW_VER}: ${COMMIT_MSG}"

# 4. Git Push to Remote
echo "📤 [4/4] Pushing commits and tags to GitHub (origin/main)..."
git push origin main
git push origin "v${NEW_VER}"

echo ""
echo "=================================================="
echo "🎉 SUCCESS: OmniSeam 3D v${NEW_VER} Released & Pushed!"
echo "   Commit: $(git rev-parse --short HEAD)"
echo "   Tag: v${NEW_VER}"
echo "=================================================="
