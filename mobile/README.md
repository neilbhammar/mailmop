# MailMop Mobile (Expo)

Native iOS/Android companion to the MailMop web app — same design language, privacy-first Gmail cleanup.

## Prerequisites

- Node.js 18+
- [Expo Go](https://expo.dev/go) on your phone (for dev preview)
- Supabase project (same as web app)
- Google Cloud OAuth credentials with **iOS** and/or **Android** client IDs

## Setup

1. Copy env file and fill in values:

```bash
cd mobile
cp .env.example .env
```

2. Install dependencies:

```bash
npm install
```

3. Configure Google OAuth (Google Cloud Console):

- Create **iOS** and **Android** OAuth clients for your bundle ID / package name (`com.mailmop.app`)
- Add authorized redirect URI: `mailmop://auth/gmail-callback`
- For Supabase Google sign-in, add redirect: `mailmop://auth/callback` in Supabase Auth settings

4. Start the dev server with tunnel (so your phone can connect):

```bash
npx expo start --tunnel
```

5. Scan the QR code with Expo Go.

## Environment variables

| Variable | Description |
|----------|-------------|
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `EXPO_PUBLIC_GOOGLE_CLIENT_ID` | Google OAuth client ID (iOS/Android) |
| `EXPO_PUBLIC_API_URL` | MailMop backend URL (default: `https://mailmop.com`) |

## Architecture

```
mobile/
├── app/                 # Expo Router screens
├── src/
│   ├── components/      # UI + dashboard components
│   ├── context/         # Auth, Gmail, Analysis providers
│   ├── hooks/           # Mobile hooks
│   ├── lib/             # Gmail API, storage, Supabase
│   └── theme/           # Design tokens (matches web)
packages/shared/         # Shared types & constants with web
```

## Backend requirements

The mobile app uses dedicated token routes (refresh tokens stored in SecureStore, not cookies):

- `POST /api/auth/mobile/exchange`
- `POST /api/auth/mobile/refresh`
- `POST /api/auth/mobile/revoke`

Deploy the web app with these routes before connecting Gmail on mobile.

## Parity status

| Feature | Status |
|---------|--------|
| Landing + sign in | ✅ |
| Dashboard layout + design tokens | ✅ |
| Gmail OAuth (native) | ✅ |
| Inbox stats | ✅ |
| Sender analysis storage (SQLite) | ✅ |
| Analysis pipeline + queue | 🚧 Scaffolded |
| Bulk actions (delete, labels, filters) | 🚧 UI wired, executors pending |
| Stripe Pro upgrade | 🚧 Opens web checkout |
| Crisp chat | ⏳ Not yet |

## Running on a physical device

Use `--tunnel` mode — the dev server runs in the cloud VM, not your local network. Expo Go connects via the tunnel URL.
