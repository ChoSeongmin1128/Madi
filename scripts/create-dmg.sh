#!/bin/zsh

set -euo pipefail

if [ "$#" -lt 3 ]; then
  echo "usage: $0 <app-path> <output-dir> <version>"
  exit 1
fi

APP_PATH="$1"
OUTPUT_DIR="$2"
VERSION="$3"
WORK_DIR="$OUTPUT_DIR/create-dmg-work"

mkdir -p "$WORK_DIR"
rm -rf "$WORK_DIR"/*

pnpm dlx create-dmg "$APP_PATH" "$WORK_DIR" \
  --overwrite \
  --window-size 720 420 \
  --window-pos 240 180 \
  --icon-size 128 \
  --icon "MinNote.app" 190 210 \
  --app-drop-link 520 210

RAW_DMG="$(find "$WORK_DIR" -maxdepth 1 -type f -name '*.dmg' -print -quit)"

if [ -z "$RAW_DMG" ] || [ ! -f "$RAW_DMG" ]; then
  echo "create-dmg output not found"
  exit 1
fi

FINAL_DMG="$OUTPUT_DIR/MinNote_${VERSION}_aarch64.dmg"
mv "$RAW_DMG" "$FINAL_DMG"
echo "$FINAL_DMG"
