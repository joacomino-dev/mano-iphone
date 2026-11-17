#!/bin/bash
# Checks a signed App Store IPA before it leaves the machine. Read-only on the IPA.
# Usage: verify-appstore-ipa.sh <ipa> <team-id> <marketing-version> <build>
set -euo pipefail
ipa=$1 team=$2 version=$3 build=$4
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
unzip -q "$ipa" -d "$work"
app="$work/Payload/App.app"
test -d "$app" || { echo 'REFUSED: Payload/App.app missing' >&2; exit 1; }
codesign --verify --deep --strict --verbose=2 "$app"
codesign -d --entitlements :- "$app" > "$work/entitlements.plist" 2>/dev/null
security cms -D -i "$app/embedded.mobileprovision" > "$work/profile.plist"
ent() { /usr/libexec/PlistBuddy -c "Print :$1" "$work/entitlements.plist"; }
prof() { /usr/libexec/PlistBuddy -c "Print :$1" "$work/profile.plist"; }
info() { /usr/libexec/PlistBuddy -c "Print :$1" "$app/Info.plist"; }
test "$(ent application-identifier)" = "$team.work.joaquin.mano"
# Every embedded framework must carry our team's signature, not the vendor's (App Store rejects it).
for framework in "$app"/Frameworks/*.framework; do
  [ -e "$framework" ] || continue
  signer=$(codesign -dv "$framework" 2>&1 | sed -n 's/^TeamIdentifier=//p')
  [ "$signer" = "$team" ] || { echo "REFUSED: $(basename "$framework") signed by '$signer', not $team" >&2; exit 1; }
done
test "$(ent get-task-allow)" = false
test "$(prof TeamIdentifier:0)" = "$team"
for forbidden in ProvisionedDevices ProvisionsAllDevices; do
  if prof "$forbidden" >/dev/null 2>&1; then echo 'REFUSED: not an App Store provisioning profile' >&2; exit 1; fi
done
test "$(info CFBundleIdentifier)" = work.joaquin.mano
test "$(info CFBundleShortVersionString)" = "$version"
test "$(info CFBundleVersion)" = "$build"
test "$(info MinimumOSVersion)" = 17.0
test "$(info UIDeviceFamily:0)" = 1
test "$(xcrun lipo -archs "$app/App")" = arm64
test "$(info GADApplicationIdentifier)" = 'ca-app-pub-5676353604168025~4587143429'
test "$(info CocoNativeAdUnitID)" = 'ca-app-pub-5676353604168025/8219266678'
for flag in CocoWashTestAds CocoWashDevelopmentReset; do
  if info "$flag" >/dev/null 2>&1; then echo "REFUSED: $flag in IPA" >&2; exit 1; fi
done
echo "IPA_OK: work.joaquin.mano $version ($build), App Store profile, team $team, real AdMob IDs, no developer flags"
