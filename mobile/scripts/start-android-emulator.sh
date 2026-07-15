#!/usr/bin/env bash
set -euo pipefail

MOBILE="$(cd "$(dirname "$0")/.." && pwd)"
PACKAGE="com.gstbooks.mobile"
DEV_CLIENT_URL="gstbooks://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A8081"

echo "Waiting for Android device/emulator..."
adb wait-for-device
while ! adb shell getprop sys.boot_completed 2>/dev/null | grep -q 1; do
  sleep 1
done

echo "Setting up adb reverse (Metro + API)..."
adb reverse tcp:8081 tcp:8081
adb reverse tcp:3000 tcp:3000

export REACT_NATIVE_PACKAGER_HOSTNAME=127.0.0.1

launch_dev_client() {
  if adb shell pm path "$PACKAGE" >/dev/null 2>&1; then
    echo "Opening development build on emulator (127.0.0.1:8081)..."
    adb shell am start -n "$PACKAGE/.MainActivity" \
      -a android.intent.action.VIEW \
      -d "$DEV_CLIENT_URL" >/dev/null
  else
    echo "No $PACKAGE on this device. Install once:"
    echo "  cd mobile && bunx expo run:android --no-bundler"
    exit 1
  fi
}

if lsof -ti:8081 >/dev/null 2>&1; then
  echo "Metro already listening on :8081 — reusing it."
  launch_dev_client
  exit 0
fi

cd "$MOBILE"
echo "Starting Metro for Android emulator (localhost + adb reverse)..."
echo "Ensure API is running from repo root: bun run dev"
exec bunx expo start --dev-client --android --localhost --clear --port 8081
