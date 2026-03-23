#!/bin/bash
set -e

PACKAGE_DIR="$(dirname "$0")/../sync-sidecar"
BINARIES_DIR="$(dirname "$0")/../src-tauri/binaries"

mkdir -p "$BINARIES_DIR"

echo "Building MNSyncDaemon for arm64..."
swift build -c release \
  --package-path "$PACKAGE_DIR" \
  --arch arm64

echo "Building MNSyncDaemon for x86_64..."
swift build -c release \
  --package-path "$PACKAGE_DIR" \
  --arch x86_64

cp "$PACKAGE_DIR/.build/arm64-apple-macosx/release/MNSyncDaemon" \
   "$BINARIES_DIR/minnote-sync-aarch64-apple-darwin"

cp "$PACKAGE_DIR/.build/x86_64-apple-macosx/release/MNSyncDaemon" \
   "$BINARIES_DIR/minnote-sync-x86_64-apple-darwin"

echo "Sidecar binaries built successfully."
