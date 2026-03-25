#!/bin/zsh

set -euo pipefail

"$(dirname "$0")/prepare-provisioning-profile.sh"

if [ -z "${TAURI_SIGNING_PRIVATE_KEY:-}" ] && [ -z "${TAURI_SIGNING_PRIVATE_KEY_PATH:-}" ]; then
  for candidate in \
    "$HOME/Documents/minnote/minnote-updater.key" \
    "$HOME/Documents/minnote-updater.key"
  do
    if [ -f "$candidate" ]; then
      export TAURI_SIGNING_PRIVATE_KEY_PATH="$candidate"
      export TAURI_SIGNING_PRIVATE_KEY="$(cat "$candidate")"
      break
    fi
  done
fi

if { [ -n "${TAURI_SIGNING_PRIVATE_KEY:-}" ] || [ -n "${TAURI_SIGNING_PRIVATE_KEY_PATH:-}" ]; } && [ -z "${TAURI_SIGNING_PRIVATE_KEY_PASSWORD:-}" ]; then
  echo "TAURI_SIGNING_PRIVATE_KEY_PASSWORD is required for local release builds when updater signing is enabled."
  exit 1
fi

pnpm sidecar:build
tauri build "$@"
