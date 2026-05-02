#!/bin/zsh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$ROOT_DIR/.env.release.local"

export PATH="$ROOT_DIR/node_modules/.bin:$PATH"

if [ -f "$ENV_FILE" ]; then
  set -a
  source "$ENV_FILE"
  set +a
fi

resolve_repo_path() {
  local value="$1"
  if [[ "$value" = /* ]]; then
    echo "$value"
  else
    echo "$ROOT_DIR/$value"
  fi
}

if [ -n "${TAURI_SIGNING_PRIVATE_KEY_PATH:-}" ]; then
  export TAURI_SIGNING_PRIVATE_KEY_PATH="$(resolve_repo_path "$TAURI_SIGNING_PRIVATE_KEY_PATH")"
fi

if [ -z "${TAURI_SIGNING_PRIVATE_KEY_PATH:-}" ]; then
  for candidate in \
    "$ROOT_DIR/.local-release/madi-updater.key" \
    "$HOME/Documents/madi/madi-updater.key" \
    "$HOME/Documents/madi-updater.key"
  do
    if [ -f "$candidate" ]; then
      export TAURI_SIGNING_PRIVATE_KEY_PATH="$candidate"
      break
    fi
  done
fi

if [ -z "${TAURI_SIGNING_PRIVATE_KEY:-}" ] && [ -n "${TAURI_SIGNING_PRIVATE_KEY_PATH:-}" ] && [ -f "${TAURI_SIGNING_PRIVATE_KEY_PATH}" ]; then
  export TAURI_SIGNING_PRIVATE_KEY="$(cat "$TAURI_SIGNING_PRIVATE_KEY_PATH")"
fi

if { [ -n "${TAURI_SIGNING_PRIVATE_KEY:-}" ] || [ -n "${TAURI_SIGNING_PRIVATE_KEY_PATH:-}" ]; } && [ -z "${TAURI_SIGNING_PRIVATE_KEY_PASSWORD:-}" ]; then
  echo "TAURI_SIGNING_PRIVATE_KEY_PASSWORD is required for local release builds when updater signing is enabled."
  exit 1
fi

BUILD_ARGS=("$@")
TARGET_VALUE=""

for ((i = 1; i <= ${#BUILD_ARGS[@]}; i++)); do
  if [ "${BUILD_ARGS[$i]}" = "--target" ]; then
    if [ "$i" -eq "${#BUILD_ARGS[@]}" ]; then
      echo "--target requires a value"
      exit 1
    fi

    TARGET_VALUE="${BUILD_ARGS[$((i + 1))]}"
    break
  fi
done

if [ -z "$TARGET_VALUE" ]; then
  BUILD_ARGS+=(--target aarch64-apple-darwin)
elif [ "$TARGET_VALUE" != "aarch64-apple-darwin" ]; then
  echo "Unsupported target: $TARGET_VALUE"
  echo "Madi release builds support Apple Silicon macOS only."
  exit 1
fi

tauri build "${BUILD_ARGS[@]}"
