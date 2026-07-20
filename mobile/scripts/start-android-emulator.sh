#!/usr/bin/env bash
set -euo pipefail

MOBILE="$(cd "$(dirname "$0")/.." && pwd)"
PACKAGE="com.hisaabkro.mobile"

echo "Waiting for Android device/emulator..."
adb wait-for-device
while ! adb shell getprop sys.boot_completed 2>/dev/null | grep -q 1; do
  sleep 1
done

echo "Setting up adb reverse (API)..."
adb reverse tcp:3000 tcp:3000

launch_standalone_app() {
  if adb shell pm path "$PACKAGE" >/dev/null 2>&1; then
    echo "Opening $PACKAGE on emulator..."
    adb shell am start -n "$PACKAGE/.MainActivity" >/dev/null
  else
    echo "Standalone app not installed. Build once:"
    echo "  cd mobile && bunx expo run:android"
    exit 1
  fi
}

# Standalone debug builds reach Metro via the emulator host alias (10.0.2.2).
export REACT_NATIVE_PACKAGER_HOSTNAME=10.0.2.2

if lsof -ti:8081 >/dev/null 2>&1; then
  echo "Metro already listening on :8081 — reusing it."
  launch_standalone_app
  exit 0
fi

cd "$MOBILE"
echo "Starting Metro for standalone Android build (--lan, packager host 10.0.2.2)..."
echo "Ensure API is running from repo root: bun run dev:lan"
echo "Set EXPO_PUBLIC_API_URL=http://10.0.2.2:3000 in mobile/.env"
launch_standalone_app
exec bunx expo start --lan --clear --port 8081
