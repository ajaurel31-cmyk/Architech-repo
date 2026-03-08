# CLAUDE.md

## Project Overview

KidneyCare+ — a post-kidney transplant nutrition guide app with AI-powered food analysis, meal recommendations, vital monitoring, and medication reminders. Built as a Next.js web app with Capacitor wrappers for iOS and Android.

## Tech Stack

- **Framework:** Next.js 16 (App Router) with TypeScript
- **Mobile:** Capacitor 8 (iOS + Android)
- **AI:** Anthropic Claude SDK for vision-based food safety analysis
- **Charts:** Recharts for health vital visualization
- **Notifications:** Web Push + Capacitor Local/Push Notifications
- **IAP:** @capgo/native-purchases (StoreKit)
- **Deployment:** Vercel (web), Xcode/Android Studio (native)

## Commands

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm start            # Start production server
npm run cap:sync     # Sync web build to native projects
npm run cap:ios      # Open in Xcode
npm run cap:android  # Open in Android Studio
```

There are no test or lint commands configured.

## Project Structure

- `app/` — Next.js App Router pages and API routes
  - `app/api/analyze/` — Claude AI food safety analysis endpoint
  - `app/api/meals/` — AI meal recommendation endpoint
  - `app/api/push/` — Push notification routes
  - `app/lib/` — Utilities (rate-limit, secure-storage, camera, validation, storekit)
  - `app/meals/`, `app/vitals/`, `app/medications/` — Feature pages
  - `app/disclaimer/`, `app/terms/`, `app/privacy/`, `app/support/` — Legal/support pages
- `ios/` — Capacitor iOS project
- `android/` — Capacitor Android project
- `public/` — Static assets, PWA manifest, service worker
- `scripts/` — Icon generation and VAPID key scripts

## Key Conventions

- TypeScript strict mode is enabled
- Path alias `@/*` maps to the project root
- All health data is stored locally with AES-256-GCM encryption (see `app/lib/secure-storage.ts`)
- API routes use in-memory rate limiting (20 req/min for analyze, 30 req/min for meals)
- Security headers (CSP, HSTS, X-Frame-Options) are configured in `next.config.js`
- Environment variables: `ANTHROPIC_API_KEY` required in `.env.local` (server-side only)
- Capacitor app ID: `com.kidneycareplus.app`
- Build output goes to `out/` directory for Capacitor static export
