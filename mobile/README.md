# GST Books Mobile

Expo SDK 57 app sharing the web API via `@accounting/api-client`.

## Setup (official Expo + NativeWind v5)

This app lives in a Bun workspace monorepo. Expo SDK 52+ auto-configures Metro for monorepos — no manual `watchFolders` or `nodeModulesPaths` needed ([Expo monorepo guide](https://docs.expo.dev/guides/monorepos/)).

**From repo root:**

```bash
bun install
cd mobile
bunx --bun expo install --fix
bunx expo-doctor
```

**Tailwind v4 + NativeWind v5** ([NativeWind v5 install](https://www.nativewind.dev/v5/getting-started/installation)):

- `postcss.config.mjs` — `@tailwindcss/postcss` plugin
- `metro.config.js` — `withNativewind` with `inlineVariables: false`, `globalClassNamePolyfill: false`
- `src/global.css` — Tailwind v4 imports + `@source` paths; imported in `app/_layout.tsx`
- `package.json` `overrides` — pin `lightningcss` to `1.30.1` (prevents Expo Go splash hang)

**After dependency or Metro changes:**

```bash
cd mobile
rm -rf .expo
bunx expo export -p ios --clear
bunx expo start --clear
```

## Test on web first (recommended)

Use **Expo web** on your computer while Expo Go fixes land. It hits the same API and database as the main web app — no phone or LAN IP setup.

**Terminal 1 — API (repo root)**

```bash
bun run dev
```

**Terminal 2 — Expo**

```bash
cd mobile
bun install
bun run start
```

Press **`w`** to open **http://localhost:8081**. The app talks to **http://localhost:3000** automatically — you do **not** need `mobile/.env` or a LAN IP for web testing.

Sign in with the same account you use on the web app. You should land on the dashboard when you already have a company.

## Develop on Expo Go (physical phone)

**Terminal 1 — API (repo root)**

```bash
bun run dev:lan
```

Use `dev:lan` (not `dev`) so the API listens on your LAN IP. Expo Go on a phone cannot reach `localhost`.

**Terminal 2 — Expo**

```bash
cd mobile
bun install
cp .env.example .env   # then set your LAN IP
bun run start
```

Scan the QR code with **Expo Go** on a phone (same Wi‑Fi as your computer).

### Environment (Expo Go only)

Copy `mobile/.env.example` to `mobile/.env` and set:

```bash
# Expo Go on a physical phone — use your computer's LAN IP:
EXPO_PUBLIC_API_URL=http://192.168.1.100:3000

# Android emulator — host loopback alias (not localhost):
EXPO_PUBLIC_API_URL=http://10.0.2.2:3000
```

Find your LAN IP (macOS Wi‑Fi): `ipconfig getifaddr en0`

Restart Expo after changing `.env` (`r` in the Expo terminal).

## Test on Expo Go today

1. Connect phone and Mac to the same Wi‑Fi.
2. In repo root: `bun run dev:lan`
3. Confirm API is reachable from your Mac: `curl http://$(ipconfig getifaddr en0):3000/api/auth/get-session`
4. In `mobile/.env`, set `EXPO_PUBLIC_API_URL=http://<LAN_IP>:3000`
5. In `mobile/`: `bun run start`
6. Open Expo Go on the phone and scan the QR code
7. If the app shows **Cannot reach API**, fix `.env` or firewall, then tap **Retry connection**
8. Sign in — you should land on the dashboard if you already have a company

## Test (TDD)

```bash
bun run test
```

From repo root:

```bash
bun run test:mobile
bun run test:api-client
```

## Build

```bash
bunx expo export --platform web
bunx expo export --platform android
eas build --profile preview
```

## Auth

Uses `@better-auth/expo` with scheme `gstbooks://`. The web server trusts mobile origins (see `src/lib/auth-mobile-config.ts`).

- **Expo web** uses `credentials: 'omit'` for cross-origin auth to `localhost:3000`; the session token is stored in localStorage and sent to tRPC as `Authorization: Bearer <token>`.
- **Expo Go** stores the session token in SecureStore and sends the same bearer header on tRPC requests.

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `Cannot reach API` on Expo web | Start API with `bun run dev` from repo root |
| `Cannot reach API` on Expo Go | Start API with `bun run dev:lan`; confirm `curl` to LAN IP works |
| `Failed to fetch` on login | Same as above; confirm API is running |
| Expo Go cannot connect to Metro | Same Wi‑Fi; use `bun run start` (includes `--lan`); allow port 8081 in firewall |
| Phone login fails / 401 on companies | Set `EXPO_PUBLIC_API_URL` to `http://<LAN_IP>:3000`, not `localhost`; restart Expo after `.env` changes |
| Android emulator stuck on splash / cannot reach API | Use `EXPO_PUBLIC_API_URL=http://10.0.2.2:3000` (or leave unset); start API with `bun run dev:lan`; restart Expo after `.env` changes |
| Web login lands on onboarding incorrectly | Sign out, sign in again; tRPC waits for the bearer token before `companies.list` |

## Expo Go only (not available on Expo web yet)

- Native camera capture for purchase OCR (`expo-image-picker` camera)
- SecureStore-backed session persistence (web uses localStorage instead)
- Deep links via `gstbooks://` scheme
- EAS preview / native builds
