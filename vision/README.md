# HealNari API (`vision`)

The backend for the **HealNari** women's health platform — built with **NestJS**, **TypeORM**, and **MySQL**. It models patients, doctors, appointments, prescriptions, lab results, and platform admin operations, and exposes a natural-language query assistant over the schema.

> **Status: prototype backend, not wired to the React frontend yet.** The `healnari-react` app in the repo root currently runs entirely on mock/local data. This service is a separate, standalone API — see [Known gaps](#known-gaps--before-production) before relying on it for anything real.

---

## Modules

| Module | Path | Responsibility |
|---|---|---|
| Auth | `src/auth` | Email-based login/register (see gaps below) |
| Patients | `src/patients` | Onboarding, health metrics, cycle tracking, symptom reports, goals, appointments, prescriptions, lab reports, billing, family — all scoped to `me` |
| Doctors | `src/doctors` | Doctor-facing patient management, refill requests |
| Appointments | `src/appointments` | Booking, scheduling, status transitions |
| Records | `src/records` | Prescriptions and lab results |
| Admin | `src/admin` | Platform stats, system health, support tickets, refunds, user/clinic management, doctor KYC verification, CMS content |
| AI | `src/ai` | Natural-language → structured query assistant (`POST /api/chat`), backed by Gemini or OpenAI |
| Common | `src/common` | Shared response envelope, centralized error/success message constants, global exception filter |

Entities live next to their owning module (e.g. `patients/patient.entity.ts`, `records/prescription.entity.ts`) and are registered centrally in `app.module.ts`.

---

## Setup & Installation

### 1. Prerequisites
- Node.js v18+
- MySQL Server (local or remote)

### 2. Install dependencies
```bash
npm install
```

### 3. Environment configuration
Create a `.env` file in `vision/` (there is no `.env.example` checked in yet — add one if you set this up):

```ini
# Server
PORT=5000

# MySQL (consumed directly in app.module.ts)
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=healnari_db

# AI assistant — at least one is required for /api/chat to work
GEMINI_API_KEY=your_gemini_key
OPENAI_API_KEY=your_openai_key
```

`app.module.ts` currently runs TypeORM with `synchronize: true`, so tables are created/altered automatically from the entities on boot. That's convenient for local development but is not safe for a real database with production data — turn it off and use migrations before this touches anything but a throwaway dev DB.

### 4. Run the server
```bash
npm run start:dev   # watch mode
npm run start        # single run
npm run start:prod   # from compiled dist/
```

The API listens on `http://localhost:5000` (or `PORT`).

### 5. API docs
Swagger UI is served at:
👉 **http://localhost:5000/api/docs**

All endpoints are prefixed `/api/...` (e.g. `/api/patients/me/dashboard`, `/api/admin/dashboard`, `/api/chat`).

---

## The AI assistant (`/api/chat`)

`POST /api/chat` takes a natural-language question (e.g. *"How many appointments are scheduled today?"*), asks Gemini/OpenAI to translate it into a structured TypeORM query against the schema described in `ai.service.ts`, executes it, and returns a plain-language answer alongside the raw result.

This endpoint requires an `Authorization` header (admin-style, matching the convention used by `AdminController`) and only allows querying a fixed allow-list of entities/fields/relations defined in `ai.service.ts` — it does **not** hand the LLM's output straight to the database. See the comments in `ai/ai.service.ts` and `ai/chat.controller.ts` for the exact allow-list before extending it to new entities.

---

## Known gaps / before production

This is prototype-grade code. Do not treat any of the following as already solved:

- **Auth is not real auth.** `AuthService.login()` looks up a user by email and returns a token shaped like `dummy-jwt-token-for-<id>` — it never checks a password. `register()` stores a literal string in `password_hash` rather than hashing anything. There is no JWT signing/verification, no session expiry, and no password reset flow.
- **Authorization is a header substring check.** `AdminController.checkAdmin()` and similar guards only check that the `Authorization` header contains the word `admin` / a numeric user id — this is not a real bearer-token/JWT guard and must not be trusted as an access-control boundary.
- **No rate limiting, no input sanitization beyond NestJS's `ValidationPipe`,** and no audit logging on access to patient health data.
- **`synchronize: true`** will silently alter your schema on every boot — fine for a scratch dev DB, dangerous anywhere else.
- The React frontend (`healnari-react`) does not call this API at all yet — connecting it is a separate, larger effort (auth flow, data fetching, error states, loading states) not covered by this README.

Treat this service as a schema + endpoint sketch to build real auth, authorization, and frontend integration on top of — not as something to point real patient data at as-is.
