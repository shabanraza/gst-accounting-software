#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
MOBILE="$(cd "$(dirname "$0")/.." && pwd)"

echo "Waiting for Android device/emulator..."
adb wait-for-device

echo "Setting up adb reverse (Metro + API)..."
adb reverse tcp:8081 tcp:8081
adb reverse tcp:3000 tcp:3000

if lsof -ti:8081 >/dev/null 2>&1; then
  echo "Port 8081 in use — stop other Metro/Expo processes first, or run: lsof -ti:8081 | xargs kill -9"
  exit 1
fi

cd "$MOBILE"
echo "Starting Expo for Android emulator (localhost + adb reverse)..."
echo "Ensure API is running from repo root: bun run dev"
exec bunx expo start --android --localhost --clear --port 8081
