#!/bin/bash
# LOCAL archive/export only. No upload and no automatic provisioning changes.
# Owner invokes after the native/manual gates; signing credentials stay in Keychain.
set -euo pipefail
cd "$(dirname "$0")/.."
if [ "$(uname -s)" != Darwin ]; then echo 'BLOCKED: macOS/Xcode required.' >&2; exit 78; fi
test "${COCOWASH_SIGNING_AUTHORIZED:-}" = YES || { echo 'REFUSED: owner must explicitly authorize local signing with COCOWASH_SIGNING_AUTHORIZED=YES.' >&2; exit 78; }
: "${COCOWASH_TEAM_ID:?Set the existing Apple team ID; never a private key}"
: "${COCOWASH_VERSION:?Choose the marketing version after checking App Store Connect}"
: "${COCOWASH_BUILD:?Choose an unused build after checking App Store Connect}"
: "${COCOWASH_EXPORT_OPTIONS:?Absolute path to a locally reviewed ExportOptions.plist}"
[[ "$COCOWASH_TEAM_ID" =~ ^[A-Z0-9]{10}$ ]] || exit 1
[[ "$COCOWASH_VERSION" =~ ^[0-9]+\.[0-9]+(\.[0-9]+)?$ ]] || exit 1
[[ "$COCOWASH_BUILD" =~ ^[1-9][0-9]*$ ]] || exit 1
test -f "$COCOWASH_EXPORT_OPTIONS"
plutil -lint "$COCOWASH_EXPORT_OPTIONS"
test "$(/usr/libexec/PlistBuddy -c 'Print :method' "$COCOWASH_EXPORT_OPTIONS")" = app-store-connect
test "$(/usr/libexec/PlistBuddy -c 'Print :destination' "$COCOWASH_EXPORT_OPTIONS")" = export
test "$(/usr/libexec/PlistBuddy -c 'Print :teamID' "$COCOWASH_EXPORT_OPTIONS")" = "$COCOWASH_TEAM_ID"
test "$(/usr/libexec/PlistBuddy -c 'Print :manageAppVersionAndBuildNumber' "$COCOWASH_EXPORT_OPTIONS")" = false
test "$(/usr/libexec/PlistBuddy -c 'Print :uploadSymbols' "$COCOWASH_EXPORT_OPTIONS")" = false
python3 ../scripts/check-apple-privacy.py --submission
node scripts/check-release.mjs
node scripts/check-mobile-runtime.mjs
npm test
npm run sync:ios
out="$PWD/build/distribution/$(git rev-parse --short HEAD)-$COCOWASH_VERSION-$COCOWASH_BUILD"
test ! -e "$out" || { echo 'REFUSED: output already exists; preserve the previous archive.' >&2; exit 1; }
mkdir -p "$out"
git rev-parse HEAD > "$out/source.txt"
git status --short > "$out/working-tree.txt"
xcodebuild -version > "$out/xcode.txt"
xcodebuild -project ios/App/App.xcodeproj -scheme App -configuration Release \
  -destination 'generic/platform=iOS' -archivePath "$out/CocoWash.xcarchive" \
  DEVELOPMENT_TEAM="$COCOWASH_TEAM_ID" MARKETING_VERSION="$COCOWASH_VERSION" \
  CURRENT_PROJECT_VERSION="$COCOWASH_BUILD" archive > "$out/archive.log" 2>&1
app="$out/CocoWash.xcarchive/Products/Applications/App.app"
test -d "$app"
codesign --verify --deep --strict --verbose=2 "$app" > "$out/signature.txt" 2>&1
codesign -d --entitlements :- "$app" > "$out/entitlements.plist" 2> "$out/entitlements.log"
security cms -D -i "$app/embedded.mobileprovision" > "$out/profile.plist"
test "$(/usr/libexec/PlistBuddy -c 'Print :application-identifier' "$out/entitlements.plist")" = "$COCOWASH_TEAM_ID.work.joaquin.mano"
test "$(/usr/libexec/PlistBuddy -c 'Print :get-task-allow' "$out/entitlements.plist")" = false
test "$(/usr/libexec/PlistBuddy -c 'Print :TeamIdentifier:0' "$out/profile.plist")" = "$COCOWASH_TEAM_ID"
for forbidden in ProvisionedDevices ProvisionsAllDevices; do
  if /usr/libexec/PlistBuddy -c "Print :$forbidden" "$out/profile.plist" >/dev/null 2>&1; then echo 'REFUSED: not an App Store provisioning profile' >&2; exit 1; fi
done
plist="$app/Info.plist"
test "$(/usr/libexec/PlistBuddy -c 'Print :CFBundleIdentifier' "$plist")" = work.joaquin.mano
test "$(/usr/libexec/PlistBuddy -c 'Print :CFBundleShortVersionString' "$plist")" = "$COCOWASH_VERSION"
test "$(/usr/libexec/PlistBuddy -c 'Print :CFBundleVersion' "$plist")" = "$COCOWASH_BUILD"
test "$(/usr/libexec/PlistBuddy -c 'Print :MinimumOSVersion' "$plist")" = 17.0
test "$(/usr/libexec/PlistBuddy -c 'Print :GADApplicationIdentifier' "$plist")" = 'ca-app-pub-5676353604168025~4587143429'
test "$(/usr/libexec/PlistBuddy -c 'Print :CocoNativeAdUnitID' "$plist")" = 'ca-app-pub-5676353604168025/8219266678'
for flag in CocoWashTestAds CocoWashDevelopmentReset; do
  if /usr/libexec/PlistBuddy -c "Print :$flag" "$plist" >/dev/null 2>&1; then echo "REFUSED: $flag in archive" >&2; exit 1; fi
done
# Export may fail if local profiles/certificates/options are not prepared. No
# -allowProvisioningUpdates and no automatic upload fallback are permitted here.
xcodebuild -exportArchive -archivePath "$out/CocoWash.xcarchive" \
  -exportPath "$out/export" -exportOptionsPlist "$COCOWASH_EXPORT_OPTIONS" > "$out/export.log" 2>&1
find "$out/export" -name '*.ipa' -exec shasum -a 256 {} \; > "$out/ipa-sha256.txt"
test -s "$out/ipa-sha256.txt"
echo "Archive/export created locally: $out. No upload. Native safety, privacy report and TestFlight acceptance are separate gates."
