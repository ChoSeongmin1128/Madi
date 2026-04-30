#!/bin/zsh

set -euo pipefail

if [ "$#" -ne 1 ]; then
  echo "usage: $0 <version>"
  exit 1
fi

VERSION="$1"
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

PACKAGE_JSON="$ROOT_DIR/package.json"
TAURI_CONF="$ROOT_DIR/src-tauri/tauri.conf.json"
CARGO_TOML="$ROOT_DIR/src-tauri/Cargo.toml"
CARGO_LOCK="$ROOT_DIR/src-tauri/Cargo.lock"

VERSION="$VERSION" perl -0pi -e 's/"version": "\K[^"]+(?=")/$ENV{VERSION}/g if $. == 1' "$PACKAGE_JSON"
VERSION="$VERSION" perl -0pi -e 's/"version": "\K[^"]+(?=")/$ENV{VERSION}/g if $. == 1' "$TAURI_CONF"
VERSION="$VERSION" perl -0pi -e 's/^version = ".*"$/version = "$ENV{VERSION}"/m' "$CARGO_TOML"
VERSION="$VERSION" perl -0pi -e 's{(\[\[package\]\]\nname = "madi"\nversion = ")([^"]+)(")}{$1.$ENV{VERSION}.$3}se' "$CARGO_LOCK"

PACKAGE_VERSION="$(jq -r '.version' "$PACKAGE_JSON")"
TAURI_VERSION="$(jq -r '.version' "$TAURI_CONF")"
CARGO_VERSION="$(sed -n 's/^version = "\(.*\)"/\1/p' "$CARGO_TOML" | head -n1)"
LOCK_VERSION="$(perl -0ne 'print $1 if /\[\[package\]\]\nname = "madi"\nversion = "([^"]+)"/s' "$CARGO_LOCK")"

if [ "$PACKAGE_VERSION" != "$VERSION" ] || [ "$TAURI_VERSION" != "$VERSION" ] || [ "$CARGO_VERSION" != "$VERSION" ] || [ "$LOCK_VERSION" != "$VERSION" ]; then
  echo "버전 체크리스트 검증 실패"
  echo "package.json: $PACKAGE_VERSION"
  echo "tauri.conf.json: $TAURI_VERSION"
  echo "Cargo.toml: $CARGO_VERSION"
  echo "Cargo.lock (madi): $LOCK_VERSION"
  exit 1
fi

echo "버전 반영 완료: $VERSION"
