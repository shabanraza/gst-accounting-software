# GST Books Mobile

Expo SDK 57 app sharing the web API via `@accounting/api-client`.

## Develop (two terminals)

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

- Press `w` for **Expo web** on this computer (`http://localhost:8081`). API URL defaults to `http://localhost:3000`.
- Scan the QR code with **Expo Go** on a phone (same Wi‑Fi as your computer).

### Environment

Copy `mobile/.env.example` to `mobile/.env` and set:

```bash
# Expo Go on a physical phone — use your computer's LAN IP:
EXPO_PUBLIC_API_URL=http://192.168.1.100:3000
```

Find your LAN IP (macOS Wi‑Fi): `ipconfig getifaddr en0`

Expo web on this machine can omit `.env`; it defaults to `http://localhost:3000`.

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

## Build

```bash
bunx expo export --platform android
eas build --profile preview
```

## Auth

Uses `@better-auth/expo` with scheme `gstbooks://`. The web server trusts mobile origins (see `src/lib/auth-mobile-config.ts`).

- Expo web uses `credentials: 'omit'` for cross-origin auth to `localhost:3000`; session cookies are stored in localStorage and forwarded to tRPC via the `cookie` header.
- Expo Go stores the session in SecureStore and forwards the same `cookie` header on tRPC requests.

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `Cannot reach API` on launch | Start API with `bun run dev:lan` from repo root |
| `Failed to fetch` on login | Same as above; confirm `curl` to LAN IP works |
| Expo Go cannot connect to Metro | Same Wi‑Fi; use `bun run start` (includes `--lan`); allow port 8081 in firewall |
| Phone login fails / 401 on companies | Set `EXPO_PUBLIC_API_URL` to `http://<LAN_IP>:3000`, not `localhost`; restart Expo after `.env` changes |
| Web login lands on onboarding incorrectly | Sign out, sign in again; tRPC now waits for the session cookie before `companies.list` |
