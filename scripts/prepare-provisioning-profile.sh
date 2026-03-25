#!/bin/zsh

set -euo pipefail

TARGET_PATH="/Users/seongmin/Personal/MinNote/src-tauri/embedded.provisionprofile"

if [ -f "$TARGET_PATH" ]; then
  exit 0
fi

declare -a CANDIDATES=()

if [ -n "${APPLE_PROVISIONING_PROFILE_PATH:-}" ]; then
  CANDIDATES+=("$APPLE_PROVISIONING_PROFILE_PATH")
fi

CANDIDATES+=(
  "$HOME/Personal/MinNote/.local-release/MinNote_Developer_ID_CloudKit.provisionprofile"
  "$HOME/Documents/minnote/MinNote_Developer_ID_CloudKit.provisionprofile"
  "$HOME/Documents/MinNote_Developer_ID_CloudKit.provisionprofile"
)

for candidate in "${CANDIDATES[@]}"; do
  if [ -f "$candidate" ]; then
    cp "$candidate" "$TARGET_PATH"
    exit 0
  fi
done

echo "embedded.provisionprofile not found. Set APPLE_PROVISIONING_PROFILE_PATH or place MinNote_Developer_ID_CloudKit.provisionprofile under ~/Documents/minnote."
exit 1
