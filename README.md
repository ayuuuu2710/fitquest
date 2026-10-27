# FitQuest

FitQuest is a fitness companion for building steady habits through workouts, nutrition, progress, and community quests.

## Current phase

The application uses server-side MongoDB sessions, password hashing, CSRF protection, rate-limited sign-in and registration, and a persisted five-step onboarding/profile API. Registration enforces a 12-character password with uppercase, lowercase, number, and special-character requirements, plus confirmation in the UI. Signup does not require email or phone verification; an email address is used as the account's login name. Login sessions last eight hours unless Remember Me is selected, up to the configured session lifetime. Password reset by email still requires Resend configuration; the UI checks availability and reports when recovery cannot be used. Manual workouts and nutrition entries are stored per account. Dashboard metrics, the activity chart, and macro breakdown are calculated from that account's records; a new account with no records starts at zero. Nutrition estimates come from the built-in food list and are not medical guidance.

No automatic or camera-based rep counting is part of the product.

Nutrition logging supports the original FitQuest foods, quantity scaling by grams, USDA FoodData Central ingredient search when a backend-only USDA_API_KEY is configured, Open Food Facts packaged-food search and barcode lookup, built-in Indian recipe estimates, user-built recipes with cooked yield and ingredient-level nutrition, Quick Add, favorites, recent foods, repeat, edit, move between meals, and confirmed deletion. Meal records keep nutrient snapshots, quantity, source, and reference data. Open Food Facts data is community submitted and may be incomplete; recipe values are estimates and oil/ghee quantities should be adjusted to match preparation. Older entries remain readable with their original saved totals.

The signed-in app shell provides Dashboard, Workouts, Nutrition, Progress, and Profile & Settings navigation. Community and notification navigation are omitted while those features are unavailable. Workout history and food logs can be searched from the top bar. On mobile, the persistent quick log opens workout, food, water, and body-weight actions. Water and body-weight records are owner-scoped MongoDB records at /api/v1/metrics; weight is stored in kilograms and water in milliliters.

Workout records support detail expansion, editing, repeat entry, save-as-template, and confirmed deletion with a short undo action. User-owned workout templates can be created, reused, edited, and deleted through the authenticated template API. Workout exercises retain canonical kilograms plus the unit used for display, and may include a duration. Personal records are calculated from saved sessions (bench press, squat, deadlift, highest reps, and longest session). A rest timer offers 30, 60, 90, 120-second, and custom presets with pause/resume/reset and optional browser audio.

Dashboard calorie and macro targets start from editable tracking defaults and are stored in browser local storage per account. They are not a diet prescription. Exercise calorie estimates use a curated activity catalog from the 2024 Adult Compendium of Physical Activities, including source codes and activity-specific MET values. The API calculates gross estimated energy with (MET × 3.5 × body weight in kg ÷ 200) × minutes, and stores the selected activity, MET, duration, distance when provided, body weight snapshot, source, and estimate. The dashboard uses an active-calorie value that subtracts the 1-MET resting component so resting energy is not double-counted in the calorie budget. Estimates are available for users aged 19–59 with current weight on file; other ages and workouts without a selected activity show no estimate. The catalog is a curated subset, not the full Compendium; paid APIs and wearable integration are not required. The activity chart supports 7-day and 30-day ranges, with each date's workout names, durations, and available calorie estimates in its tooltip.

## Run locally

1. Install Node.js 20 or newer.
2. Run `npm install`.
3. Copy `.env.example` to `.env` and set `MONGODB_URI` for accounts and data. `CLIENT_ORIGIN` and `APP_BASE_URL` must match the frontend origin. `RESEND_API_KEY` and `EMAIL_FROM` are optional and only needed for password recovery by email. `USDA_API_KEY` is optional and stays on the backend for USDA FoodData Central searches. The API can start without MongoDB, but authentication and readiness will remain unavailable.
4. Run `npm run dev:all` and open `http://localhost:5173`.

Do not open `index.html` directly from the file system. The app needs its Vite server; if opened directly, the HTML now shows a launch guide instead of a blank page.

`npm run build` type-checks and builds the frontend and backend. `npm test` covers API health, CSRF rejection, request validation, password rules, resting-energy estimation, and food-catalog calculations.

The backend exposes `GET /api/v1/health/live` and `GET /api/v1/health/ready`. The live endpoint confirms the process is responding. Readiness returns unavailable until MongoDB Atlas is configured and connected.

Authentication uses an opaque HttpOnly cookie backed by revocable MongoDB sessions. In production, configure the frontend and API on domains where browsers permit credentialed cross-origin cookies, set `CLIENT_ORIGIN` to the exact frontend origin, and use HTTPS. Never put server credentials in `VITE_*` variables.

## Planned architecture

- `src/` — React + TypeScript frontend
- `server/` — Node.js + Express + TypeScript API foundation
- MongoDB Atlas — account, workout, and nutrition data store
- OpenAI API — backend-only coach, workout generation, and food-photo analysis
- Cloudinary — planned user media storage
- Resend — optional password recovery email delivery
- Socket.IO — planned community chat and live updates
- Netlify — planned frontend hosting
- Render — planned API hosting

Open decisions still to resolve before related features ship: nutrition data source/licensing, AI model and usage limits, verified email sender domain, chat retention/moderation policy, reminder delivery, account/media retention, and whether the feed ships in the first public release. Keep secrets only in local environment files and hosting secret stores. Never commit real credentials.

## Hosting setup

`netlify.toml` configures the Vite build and SPA fallback. Set `VITE_API_BASE_URL` in Netlify to the deployed API origin. `render.yaml` defines the Express API service and asks for production-only values (`CLIENT_ORIGIN`, `APP_BASE_URL`, and `MONGODB_URI`) during setup. Configure `RESEND_API_KEY` and `EMAIL_FROM` only if email password recovery is enabled. Use the exact Netlify origin for both frontend URL settings. Never commit those values.
