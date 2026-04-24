#!/bin/zsh

set -euo pipefail

if [ "$#" -lt 3 ]; then
  echo "usage: $0 <app-path> <output-dir> <version> [arch]"
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
SETTINGS_FILE="$ROOT_DIR/scripts/dmg-assets/dmgbuild-settings.py"
BACKGROUND_PNG="${BACKGROUND_PNG:-$ROOT_DIR/scripts/dmg-assets/background.png}"
APP_PATH="$1"
OUTPUT_DIR="$2"
VERSION="$3"
ARCH="${4:-aarch64}"
VOLUME_NAME="${VOLUME_NAME:-Install MinNote}"
WINDOW_W="${WINDOW_W:-640}"
WINDOW_H="${WINDOW_H:-420}"
APP_ICON_X="${APP_ICON_X:-170}"
APP_ICON_Y="${APP_ICON_Y:-230}"
APPS_ICON_X="${APPS_ICON_X:-470}"
APPS_ICON_Y="${APPS_ICON_Y:-230}"

mkdir -p "$OUTPUT_DIR"

FINAL_DMG="$OUTPUT_DIR/MinNote_${VERSION}_${ARCH}.dmg"
rm -f "$FINAL_DMG"

if [ ! -d "$APP_PATH" ]; then
  echo "app bundle not found: $APP_PATH" >&2
  exit 1
fi

if [ ! -f "$SETTINGS_FILE" ]; then
  echo "dmgbuild settings not found: $SETTINGS_FILE" >&2
  exit 1
fi

DMGBUILD_BIN=""
for candidate in dmgbuild "$HOME/.local/bin/dmgbuild"; do
  if command -v "$candidate" >/dev/null 2>&1; then
    DMGBUILD_BIN="$(command -v "$candidate")"
    break
  fi
done

if [ -z "$DMGBUILD_BIN" ]; then
  echo "dmgbuild is required to create MinNote installer DMGs." >&2
  echo "Install it with: pipx install dmgbuild" >&2
  exit 1
fi

VOLUME_ICON="${VOLUME_ICON:-}"
if [ -z "$VOLUME_ICON" ]; then
  for candidate in \
    "$APP_PATH/Contents/Resources/icon.icns" \
    "$APP_PATH/Contents/Resources/AppIcon.icns" \
    "$ROOT_DIR/src-tauri/icons/icon.icns"
  do
    if [ -f "$candidate" ]; then
      VOLUME_ICON="$candidate"
      break
    fi
  done
fi

if [ -d "/Volumes/$VOLUME_NAME" ]; then
  hdiutil detach "/Volumes/$VOLUME_NAME" -force >/dev/null 2>&1 || true
fi

DMG_APP_PATH="$APP_PATH" \
DMG_BACKGROUND_PNG="$BACKGROUND_PNG" \
DMG_VOLUME_ICON="$VOLUME_ICON" \
DMG_WINDOW_W="$WINDOW_W" \
DMG_WINDOW_H="$WINDOW_H" \
DMG_APP_ICON_X="$APP_ICON_X" \
DMG_APP_ICON_Y="$APP_ICON_Y" \
DMG_APPS_ICON_X="$APPS_ICON_X" \
DMG_APPS_ICON_Y="$APPS_ICON_Y" \
"$DMGBUILD_BIN" \
  -s "$SETTINGS_FILE" \
  "$VOLUME_NAME" \
  "$FINAL_DMG" >/dev/null

if [ -f "$VOLUME_ICON" ] && command -v Rez >/dev/null 2>&1 \
  && command -v DeRez >/dev/null 2>&1 && command -v SetFile >/dev/null 2>&1; then
  ICON_TMP="$(mktemp -d "${TMPDIR:-/tmp}/minnote-dmg-icon.XXXXXX")"
  cp "$VOLUME_ICON" "$ICON_TMP/icon.icns"
  sips -i "$ICON_TMP/icon.icns" >/dev/null
  DeRez -only icns "$ICON_TMP/icon.icns" > "$ICON_TMP/icon.rsrc"
  Rez -append "$ICON_TMP/icon.rsrc" -o "$FINAL_DMG"
  SetFile -a C "$FINAL_DMG"
  rm -rf "$ICON_TMP"
fi

echo "$FINAL_DMG"
