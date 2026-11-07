#!/bin/bash
# Disposable emulator only: install, first launch, stay alive, relaunch.
# No Photos permission is granted and nothing is deleted. Every adb call has a
# time limit so a stalled emulator fails the attempt instead of hanging the job.
set -euo pipefail
APK=${1:?usage: test-android-startup.sh <apk>}
PKG=work.joaquin.mano
OUT=build/android-startup
mkdir -p "$OUT"
fail() {
  timeout 30 adb logcat -d > "$OUT/logcat.txt" 2>&1 || true
  { echo "ANDROID_STARTUP_FAILED: $*"
    grep -A40 "FATAL EXCEPTION" "$OUT/logcat.txt" 2>/dev/null | grep -E "FATAL|Process:|Caused by|Exception:|Error:" | head -6 || true
    grep -E "COCOWASH_JS_ERROR|Capacitor/Console.*(rror|ncaught)" "$OUT/logcat.txt" 2>/dev/null | tail -3 || true
  } > "$OUT/result.txt"
  cat "$OUT/result.txt"; exit 1
}
shot() { timeout 30 adb exec-out screencap -p > "$1" 2>/dev/null || echo "screenshot skipped: $1" >&2; }
alive() { [ -n "$(timeout 15 adb shell pidof "$PKG" 2>/dev/null | tr -d '\r')" ]; }

timeout 120 adb wait-for-device
for _ in $(seq 1 60); do
  [ "$(timeout 10 adb shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" = 1 ] && break
  sleep 2
done
timeout 180 adb install -r "$APK" > "$OUT/install.txt" || fail 'install'
timeout 15 adb logcat -c || true

timeout 60 adb shell am start -W -n "$PKG/.MainActivity" > "$OUT/launch.txt" || fail 'first launch'
sleep 20
alive || fail 'process died after first launch'
shot "$OUT/first-launch.png"
timeout 30 adb shell uiautomator dump /sdcard/window.xml >/dev/null 2>&1 && timeout 30 adb pull /sdcard/window.xml "$OUT/first-launch.xml" >/dev/null 2>&1 || true

timeout 30 adb shell am force-stop "$PKG"
timeout 60 adb shell am start -W -n "$PKG/.MainActivity" >> "$OUT/launch.txt" || fail 'relaunch'
sleep 15
alive || fail 'process died after relaunch'
shot "$OUT/relaunch.png"

timeout 30 adb logcat -d > "$OUT/logcat.txt" 2>&1 || true
# Only CocoWash's own crashes count (UiAutomation, used for the screen dump, can crash on its own).
if grep -A2 "FATAL EXCEPTION" "$OUT/logcat.txt" | grep -q "Process: $PKG,"; then fail "crash of $PKG in logcat"; fi
if grep -q "ANR in $PKG" "$OUT/logcat.txt"; then fail 'ANR in logcat'; fi
grep -E "Capacitor/Console|Capacitor" "$OUT/logcat.txt" > "$OUT/capacitor.txt" || true
grep -q "Loading app at https://localhost" "$OUT/logcat.txt" || fail 'web app did not load'
timeout 30 adb shell am force-stop "$PKG"
echo 'ANDROID_STARTUP_OK: installed, first launch alive 20 s, relaunch alive, web app loaded, no crash or ANR' | tee "$OUT/result.txt"
