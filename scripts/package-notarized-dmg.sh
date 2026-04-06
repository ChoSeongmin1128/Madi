#!/bin/zsh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

usage() {
  cat <<'EOF'
usage:
  package-notarized-dmg.sh create <app-path> <output-dir> <version> <arch>
  package-notarized-dmg.sh notarize <dmg-path>
  package-notarized-dmg.sh verify <dmg-path>
  package-notarized-dmg.sh full <app-path> <output-dir> <version> <arch>
EOF
}

require_env() {
  local name="$1"
  if [ -z "${(P)name:-}" ]; then
    echo "$name is required"
    exit 1
  fi
}

create_dmg() {
  local app_path="$1"
  local output_dir="$2"
  local version="$3"
  local arch="$4"
  "$ROOT_DIR/scripts/create-dmg.sh" "$app_path" "$output_dir" "$version" "$arch"
}

notarize_dmg() {
  local dmg_path="$1"

  require_env APPLE_SIGNING_IDENTITY_REF
  require_env APPLE_ID
  require_env APPLE_PASSWORD
  require_env APPLE_TEAM_ID

  local started_at finished_at
  codesign --force --sign "$APPLE_SIGNING_IDENTITY_REF" "$dmg_path"
  started_at="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
  echo "Submitting DMG for notarization: $dmg_path"
  echo "DMG notarization started at $started_at"
  xcrun notarytool submit "$dmg_path" \
    --apple-id "$APPLE_ID" \
    --password "$APPLE_PASSWORD" \
    --team-id "$APPLE_TEAM_ID" \
    --wait
  finished_at="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
  echo "DMG notarization finished at $finished_at"
  xcrun stapler staple "$dmg_path"
}

verify_dmg() {
  local dmg_path="$1"
  xcrun stapler validate "$dmg_path"
  spctl --assess --type open --context context:primary-signature --verbose=4 "$dmg_path"
}

package_full() {
  local app_path="$1"
  local output_dir="$2"
  local version="$3"
  local arch="$4"
  local dmg_path

  dmg_path="$(create_dmg "$app_path" "$output_dir" "$version" "$arch")"
  notarize_dmg "$dmg_path"
  verify_dmg "$dmg_path"
}

if [ "$#" -lt 1 ]; then
  usage
  exit 1
fi

command="$1"
shift

case "$command" in
  create)
    [ "$#" -eq 4 ] || { usage; exit 1; }
    create_dmg "$1" "$2" "$3" "$4"
    ;;
  notarize)
    [ "$#" -eq 1 ] || { usage; exit 1; }
    notarize_dmg "$1"
    ;;
  verify)
    [ "$#" -eq 1 ] || { usage; exit 1; }
    verify_dmg "$1"
    ;;
  full)
    [ "$#" -eq 4 ] || { usage; exit 1; }
    package_full "$1" "$2" "$3" "$4"
    ;;
  *)
    usage
    exit 1
    ;;
esac
