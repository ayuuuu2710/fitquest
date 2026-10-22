# FitQuest

FitQuest is a fitness companion for building steady habits through workouts, nutrition, progress, and community quests.

## Current phase

Phase 1 provides the React + TypeScript + Vite app shell and Express + TypeScript API foundation. Phase 2 adds server-side MongoDB sessions, password hashing, CSRF protection, rate-limited sign-in and registration, email verification and password-reset flows, and a persisted onboarding/profile API. Phase 3 adds user-scoped manual workout records with exercise, set, rep, and duration fields. The dashboard and nutrition diary still contain preview content; nutrition entries are not yet saved. Account and workout persistence require MongoDB Atlas, while account email flows also require Resend. Those flows have not yet been verified against live services.

No automatic or camera-based rep counting is part of the product.

## Run locally

1. Install Node.js 20 or newer.
2. Run `npm install`.
3. Copy `.env.example` to `.env` and set `MONGODB_URI`, `RESEND_API_KEY`, and `EMAIL_FROM` for account flows. `CLIENT_ORIGIN` and `APP_BASE_URL` must match the frontend origin. The API can start without MongoDB, but authentication and readiness will remain unavailable.
4. Run `npm run dev:all` and open `http://localhost:5173`.

Do not open `index.html` directly from the file system. The app needs its Vite server; if opened directly, the HTML now shows a launch guide instead of a blank page.

`npm run build` type-checks and builds the frontend and backend. `npm test` covers API health, CSRF rejection, and request validation.

The backend exposes `GET /api/v1/health/live` and `GET /api/v1/health/ready`. The live endpoint confirms the process is responding. Readiness returns unavailable until MongoDB Atlas is configured and connected.

Authentication uses an opaque HttpOnly cookie backed by revocable MongoDB sessions. In production, configure the frontend and API on domains where browsers permit credentialed cross-origin cookies, set `CLIENT_ORIGIN` to the exact frontend origin, and use HTTPS. Never put server credentials in `VITE_*` variables.

## Planned architecture

- `src/` — React + TypeScript frontend
- `server/` — Node.js + Express + TypeScript API foundation
- MongoDB Atlas — planned application data store
- OpenAI API — backend-only coach, workout generation, and food-photo analysis
- Cloudinary — planned user media storage
- Resend — planned verification and account email delivery
- Socket.IO — planned community chat and live updates
- Netlify — planned frontend hosting
- Render — planned API hosting

Open decisions still to resolve before related features ship: nutrition data source/licensing, AI model and usage limits, verified email sender domain, chat retention/moderation policy, reminder delivery, account/media retention, and whether the feed ships in the first public release. Keep secrets only in local environment files and hosting secret stores. Never commit real credentials.

## Hosting setup

`netlify.toml` configures the Vite build and SPA fallback. Set `VITE_API_BASE_URL` in Netlify to the deployed API origin. `render.yaml` defines the Express API service and asks for production-only values (`CLIENT_ORIGIN`, `APP_BASE_URL`, `MONGODB_URI`, `RESEND_API_KEY`, and `EMAIL_FROM`) during setup. Use the exact Netlify origin for both frontend URL settings. Never commit those values.
