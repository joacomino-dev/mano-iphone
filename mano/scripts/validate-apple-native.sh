#!/bin/bash
# Unsigned native verification only. Never archives, signs, exports or uploads.
set -euo pipefail
cd "$(dirname "$0")/.."
if [ "$(uname -s)" != Darwin ]; then
  echo 'NO VERIFICABLE EN ESTE ENTORNO: macOS/Xcode and Apple SDKs are required.' >&2
  exit 78
fi
for tool in node npm xcodebuild xcrun swiftc plutil; do
  command -v "$tool" >/dev/null || { echo "NO VERIFICABLE: required tool missing: $tool" >&2; exit 78; }
done
xcode_version=$(xcodebuild -version)
[[ "$xcode_version" =~ Xcode\ ([0-9]+) ]] && [ "${BASH_REMATCH[1]}" -ge 26 ] || { echo 'BLOCKED: Xcode26+ required.' >&2; exit 78; }
sdk_version=$(xcrun --sdk iphoneos --show-sdk-version)
[ "${sdk_version%%.*}" -ge 26 ] || { echo 'BLOCKED: iOS SDK26+ required.' >&2; exit 78; }
test -d node_modules || { echo 'NO VERIFICABLE: install the existing package-lock with npm ci first.' >&2; exit 78; }
out="$PWD/build/apple-readiness"
mkdir -p "$out"
git rev-parse HEAD > "$out/source.txt"
git status --short > "$out/working-tree.txt"
xcodebuild -version > "$out/xcode.txt"
xcodebuild -showsdks > "$out/sdks.txt"
xcrun simctl list -j > "$out/simulators.json"
npm test
npm run check:runtime
node --experimental-strip-types --test tests/native-contract.test.mjs
node --test tests/release.test.mjs
node scripts/check-release.mjs > "$out/release-source.json"
swiftc ios/App/App/SignatureIndex.swift tests/swift/main.swift -o "$out/signature-tests"
"$out/signature-tests" > "$out/signature-tests.log"
swiftc ios/App/App/DevelopmentSafety.swift tests/swift-safety/main.swift -o "$out/safety-tests"
"$out/safety-tests" > "$out/safety-tests.log"
npm run sync:ios
# Check generated configuration too; don't accept a lowered target or missing bridge.
node --experimental-strip-types --test tests/native-contract.test.mjs
xcodebuild -project ios/App/App.xcodeproj -scheme App -configuration Release \
  -sdk iphoneos -destination 'generic/platform=iOS' -derivedDataPath "$out/DerivedData" \
  CODE_SIGNING_ALLOWED=NO CODE_SIGNING_REQUIRED=NO CODE_SIGN_IDENTITY='' build > "$out/build.log" 2>&1
app="$out/DerivedData/Build/Products/Release-iphoneos/App.app"
test -d "$app"
plutil -lint "$app/Info.plist" "$app/PrivacyInfo.xcprivacy"
test "$(/usr/libexec/PlistBuddy -c 'Print :CFBundleIdentifier' "$app/Info.plist")" = work.joaquin.mano
test "$(/usr/libexec/PlistBuddy -c 'Print :MinimumOSVersion' "$app/Info.plist")" = 17.0
for language in es en fr de it ar ja; do
  test -s "$app/$language.lproj/InfoPlist.strings"
done
xcrun lipo -info "$app/App" > "$out/architectures.txt"
find "$app" -name PrivacyInfo.xcprivacy -print > "$out/privacy-manifest-paths.txt"
find ios/App "$out/DerivedData" -name Package.resolved -print > "$out/package-resolution-paths.txt"
mkdir -p "$out/resolutions"
resolution_count=0
while IFS= read -r resolution; do
  resolution_count=$((resolution_count + 1))
  cp "$resolution" "$out/resolutions/Package-$resolution_count.resolved"
done < "$out/package-resolution-paths.txt"
test "$resolution_count" -gt 0 || { echo 'ERROR: native dependency resolution was not retained.' >&2; exit 1; }
printf '%s\n' \
  'VERIFICADO: unsigned native compilation, pure Swift tests, bundle/deployment and localized resources.' \
  'PENDIENTE: PhotoKit destructive fixtures, real device matrix, Instruments, signed archive and TestFlight.' \
  'A native build is not a runtime or distribution acceptance result.' > "$out/RESULT.txt"
if [ "${1:-}" = --simulator-smoke ]; then
  # The legacy smoke resets global SwiftPM caches. Restrict that operation to
  # a disposable hosted runner, never a personal Mac or a self-hosted machine.
  test "${GITHUB_ACTIONS:-}" = true && test "${RUNNER_ENVIRONMENT:-}" = github-hosted || {
    echo 'REFUSED: legacy simulator smoke requires a disposable GitHub-hosted runner.' >&2; exit 78;
  }
  bash scripts/test-ios-simulator.sh
  printf '%s\n' 'VERIFICADO: existing real PhotoKit read/video smoke also passed. Destructive native tests remain pending.' >> "$out/RESULT.txt"
fi
cat "$out/RESULT.txt"
