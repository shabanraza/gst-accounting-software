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

Uses `@better-auth/expo` with scheme `gstbooks://`. The web server trusts mobile origins (see `src/lib/auth-mobile-config.ts`). Expo web uses `credentials: 'omit'` for cross-origin auth to `localhost:3000`.

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `Failed to fetch` on login | Start API with `bun run dev:lan` from repo root |
| Expo Go cannot connect | Same Wi‑Fi; use `bun run start` (includes `--lan`); allow port 8081 in firewall |
| Phone login fails | Set `EXPO_PUBLIC_API_URL` to `http://<LAN_IP>:3000`, not `localhost` |
