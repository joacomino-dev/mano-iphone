#!/bin/bash
# CI only (ubuntu-latest): a disposable Android emulator for the startup test.
# Every step has a time limit; a failed boot or test restarts the emulator once.
# Failures are written as GitHub annotations (readable without signing in).
set -uo pipefail
APK=${1:?usage: android-emulator.sh <apk>}
API=${COCO_EMULATOR_API:-35}
IMAGE="system-images;android-$API;google_apis;x86_64"
OUT=build/android-startup
mkdir -p "$OUT"
SDK=${ANDROID_HOME:-$ANDROID_SDK_ROOT}
export PATH="$SDK/cmdline-tools/latest/bin:$SDK/emulator:$SDK/platform-tools:$PATH"
note() { echo "::error title=Android emulator::$*"; echo "$*" >> "$OUT/emulator-errors.txt"; }

if ! timeout 600 bash -c "yes | sdkmanager --install '$IMAGE' 'emulator' 'platform-tools' > '$OUT/sdkmanager.txt' 2>&1"; then
  note "sdkmanager failed: $(tail -c 600 "$OUT/sdkmanager.txt" | tr '\n' ' ')"; exit 1
fi
echo no | avdmanager create avd -n coco -k "$IMAGE" -d pixel_6 --force > "$OUT/avdmanager.txt" 2>&1 || { note "avdmanager failed: $(tail -c 600 "$OUT/avdmanager.txt" | tr '\n' ' ')"; exit 1; }
ls -l /dev/kvm >> "$OUT/emulator-errors.txt" 2>&1 || note 'no /dev/kvm on this runner'

boot() {
  adb kill-server >/dev/null 2>&1 || true
  emulator -avd coco -no-window -gpu swiftshader_indirect -no-snapshot -noaudio -no-boot-anim -camera-back none -camera-front none \
    > "$OUT/emulator-$1.txt" 2>&1 &
  EMU=$!
  timeout 60 adb wait-for-device || { note "attempt $1: emulator never appeared: $(tail -c 500 "$OUT/emulator-$1.txt" | tr '\n' ' ')"; return 1; }
  for _ in $(seq 1 150); do
    [ "$(timeout 10 adb shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" = 1 ] && break
    kill -0 "$EMU" 2>/dev/null || { note "attempt $1: emulator exited: $(tail -c 500 "$OUT/emulator-$1.txt" | tr '\n' ' ')"; return 1; }
    sleep 2
  done
  [ "$(timeout 10 adb shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" = 1 ] || { note "attempt $1: boot did not complete in 5 min"; return 1; }
  timeout 30 adb shell settings put global window_animation_scale 0 >/dev/null 2>&1 || true
  timeout 30 adb shell settings put global transition_animation_scale 0 >/dev/null 2>&1 || true
  timeout 30 adb shell settings put global animator_duration_scale 0 >/dev/null 2>&1 || true
}
stop() { timeout 30 adb emu kill >/dev/null 2>&1 || true; kill "$EMU" >/dev/null 2>&1 || true; wait "$EMU" 2>/dev/null || true; }

for attempt in 1 2; do
  if boot "$attempt"; then
    rm -f "$OUT/result.txt"
    if timeout 300 bash scripts/test-android-startup.sh "$APK"; then stop; exit 0; fi
    note "attempt $attempt: $(tr '\n' ' ' < "$OUT/result.txt" 2>/dev/null || echo 'startup test timed out')"
  fi
  stop
done
exit 1
