#!/bin/zsh

set -euo pipefail

if [ "$#" -ne 2 ]; then
  echo "usage: $0 <app-path> <version-or-tag>"
  exit 1
fi

APP_PATH="$1"
VERSION="${2#v}"
PLIST_BUDDY="/usr/libexec/PlistBuddy"
EXPECTED_BUNDLE_ID="com.seongmin.madi"
EXPECTED_APP_NAME="Madi"
EXPECTED_EXECUTABLE="madi"
EXPECTED_HELPER_EXECUTABLE="madi-cloudkit-bridge"
EXPECTED_CONTAINER="iCloud.com.seongmin.madi"
OLD_PRODUCT_NAME="$(printf 'Min%s' 'Note')"
OLD_PRODUCT_LOWER="$(printf 'min%s' 'note')"
OLD_PRODUCT_TITLE="$(printf 'Min%s' 'note')"
LEGACY_PATTERN="$OLD_PRODUCT_NAME|$OLD_PRODUCT_LOWER|$OLD_PRODUCT_TITLE|${OLD_PRODUCT_LOWER:u}|${OLD_PRODUCT_NAME}Zone|com\\.seongmin\\.$OLD_PRODUCT_LOWER|iCloud\\.com\\.seongmin\\.$OLD_PRODUCT_LOWER|$OLD_PRODUCT_LOWER\\.sqlite3"

fail() {
  echo "$1"
  exit 1
}

plist_value() {
  local plist_path="$1"
  local key="$2"
  "$PLIST_BUDDY" -c "Print :$key" "$plist_path" 2>/dev/null || true
}

entitlement_value() {
  local plist_path="$1"
  local key="$2"
  "$PLIST_BUDDY" -c "Print :Entitlements:$key" "$plist_path" 2>/dev/null ||
    "$PLIST_BUDDY" -c "Print :$key" "$plist_path" 2>/dev/null ||
    true
}

assert_equal() {
  local actual="$1"
  local expected="$2"
  local label="$3"
  if [ "$actual" != "$expected" ]; then
    fail "$label mismatch: expected $expected, got ${actual:-"(empty)"}"
  fi
}

validate_info_plist() {
  local bundle_path="$1"
  local expected_bundle_id="$2"
  local expected_executable="$3"
  local label="$4"
  local info_plist="$bundle_path/Contents/Info.plist"

  [ -f "$info_plist" ] || fail "$label Info.plist missing: $info_plist"
  assert_equal "$(plist_value "$info_plist" CFBundleIdentifier)" "$expected_bundle_id" "$label CFBundleIdentifier"
  assert_equal "$(plist_value "$info_plist" CFBundleExecutable)" "$expected_executable" "$label CFBundleExecutable"

  if [ "$label" = "app" ]; then
    assert_equal "$(plist_value "$info_plist" CFBundleName)" "$EXPECTED_APP_NAME" "app CFBundleName"
    assert_equal "$(plist_value "$info_plist" CFBundleShortVersionString)" "$VERSION" "app CFBundleShortVersionString"
  fi
}

validate_entitlement_file() {
  local plist_path="$1"
  local label="$2"
  local application_identifier containers container_count

  [ -f "$plist_path" ] || fail "$label entitlements plist missing: $plist_path"
  containers="$(entitlement_value "$plist_path" "com.apple.developer.icloud-container-identifiers")"
  echo "$containers" | grep -Fq "$EXPECTED_CONTAINER" || fail "$label entitlements missing $EXPECTED_CONTAINER"
  if echo "$containers" | grep -Eiq "$OLD_PRODUCT_LOWER|$OLD_PRODUCT_NAME"; then
    fail "$label entitlements contain old app identity"
  fi
  container_count="$(echo "$containers" | grep -Ec 'iCloud\.')"
  [ "$container_count" -eq 1 ] || fail "$label entitlements must contain exactly one iCloud container"

  application_identifier="$(entitlement_value "$plist_path" "application-identifier")"
  if [ -n "$application_identifier" ]; then
    echo "$application_identifier" | grep -Fq "$EXPECTED_BUNDLE_ID" || fail "$label application-identifier must target $EXPECTED_BUNDLE_ID"
    ! echo "$application_identifier" | grep -Eiq "$OLD_PRODUCT_LOWER|$OLD_PRODUCT_NAME" || fail "$label application-identifier contains old app identity"
  fi
}

validate_profile() {
  local profile_path="$1"
  local label="$2"
  local profile_plist

  [ -f "$profile_path" ] || fail "$label embedded provisioning profile missing: $profile_path"
  profile_plist="$(mktemp "${TMPDIR:-/tmp}/madi-profile.XXXXXX.plist")"
  security cms -D -i "$profile_path" > "$profile_plist"
  validate_entitlement_file "$profile_plist" "$label provisioning profile"
  rm -f "$profile_plist"
}

validate_codesign_entitlements() {
  local bundle_path="$1"
  local label="$2"
  local entitlements_plist

  entitlements_plist="$(mktemp "${TMPDIR:-/tmp}/madi-entitlements.XXXXXX.plist")"
  codesign -d --entitlements :- "$bundle_path" > "$entitlements_plist" 2>/dev/null
  validate_entitlement_file "$entitlements_plist" "$label codesign"
  rm -f "$entitlements_plist"
}

[ -d "$APP_PATH/Contents" ] || fail "Madi.app bundle missing: $APP_PATH"
validate_info_plist "$APP_PATH" "$EXPECTED_BUNDLE_ID" "$EXPECTED_EXECUTABLE" "app"
[ -f "$APP_PATH/Contents/MacOS/$EXPECTED_EXECUTABLE" ] || fail "app executable missing"
validate_profile "$APP_PATH/Contents/embedded.provisionprofile" "app"
validate_codesign_entitlements "$APP_PATH" "app"

HELPER_PATH="$APP_PATH/Contents/Resources/madi-cloudkit-bridge.app"
if [ -d "$HELPER_PATH" ]; then
  validate_info_plist "$HELPER_PATH" "$EXPECTED_BUNDLE_ID" "$EXPECTED_HELPER_EXECUTABLE" "helper"
  [ -f "$HELPER_PATH/Contents/MacOS/$EXPECTED_HELPER_EXECUTABLE" ] || fail "helper executable missing"
  validate_profile "$HELPER_PATH/Contents/embedded.provisionprofile" "helper"
  validate_codesign_entitlements "$HELPER_PATH" "helper"
fi

if LC_ALL=C grep -R -a -E "$LEGACY_PATTERN" "$APP_PATH" >/tmp/madi-release-legacy-scan.txt 2>/dev/null; then
  echo "App bundle contains old app identity terms:"
  head -50 /tmp/madi-release-legacy-scan.txt
  rm -f /tmp/madi-release-legacy-scan.txt
  exit 1
fi
rm -f /tmp/madi-release-legacy-scan.txt

echo "Release app bundle validated: $APP_PATH ($VERSION)"
