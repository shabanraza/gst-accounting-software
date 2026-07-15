# GST Books Mobile

Expo SDK 57 app sharing the web API via `@accounting/api-client`.

## Develop

```bash
cd mobile
bun install
bun run start
```

Set `EXPO_PUBLIC_API_URL` to your web API origin (defaults to `http://localhost:3000`).

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

Uses `@better-auth/expo` with scheme `gstbooks://`. Ensure the web server trusts mobile origins (see `src/lib/auth-mobile-config.ts`).
