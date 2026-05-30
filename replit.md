# ChemSafe Water Monitor

A water infrastructure risk assessment tool for global agricultural contexts. Users answer a short AI-guided interview about their pipe setup; the tool calculates a contamination risk score and surfaces actionable guidance.

---

## Local Setup

### Prerequisites

- **Node.js 20+** — [nodejs.org](https://nodejs.org)
- **pnpm 9+** — `npm install -g pnpm`
- **PostgreSQL** — local install or a free cloud DB (e.g. [Neon](https://neon.tech))

### 1 — Clone and install

```bash
git clone <your-repo-url>
cd chemsafe
pnpm install --no-frozen-lockfile
```

> `--no-frozen-lockfile` is required on first local install because the lockfile was generated on Linux. pnpm will resolve the correct native binaries for your platform automatically.

### 2 — Create your `.env` file

```bash
cp .env.example .env
```

Open `.env` and fill in at minimum:

| Variable | Where to get it |
|---|---|
| `DATABASE_URL` | Your local Postgres connection string, e.g. `postgresql://postgres:password@localhost:5432/chemsafe` |
| `DEEPSEEK_API_KEY` | [platform.deepseek.com](https://platform.deepseek.com) → API Keys (free tier available) |
| `GEMINI_API_KEY` | [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey) (free tier, no billing required) |

Everything else in `.env.example` is optional — the failover AI chain skips providers whose keys are blank.

### 3 — Set up the database

```bash
pnpm run db:push
```

This runs Drizzle's schema push against your `DATABASE_URL`. Safe to run multiple times.

### 4 — Start the dev servers

```bash
pnpm run dev
```

This runs both services in parallel:

| Service | URL |
|---|---|
| API server | http://localhost:8080 |
| Web frontend | http://localhost:23522 |

The frontend proxies `/api/*` to the API server automatically via the shared reverse proxy.

> **Note for local use:** The frontend and API are wired together through Replit's path-based proxy in production. Running locally, the Vite dev server's built-in proxy config handles `/api` → `localhost:8080`. If you see 404s on `/api`, check `artifacts/chemsafe/vite.config.ts`.

---

## Run & Operate (individual commands)

```bash
pnpm --filter @workspace/api-server run dev   # API server only (port 8080)
pnpm --filter @workspace/chemsafe run dev     # Frontend only (port 23522)
pnpm run db:push                               # Push DB schema changes
pnpm run typecheck                             # Full typecheck across all packages
pnpm run build                                 # Typecheck + build everything
```

---

## Stack

- **Monorepo:** pnpm workspaces, Node.js 24, TypeScript 5.9
- **API:** Express 5, esbuild bundle
- **DB:** PostgreSQL + Drizzle ORM
- **Frontend:** React 19, Vite 7, Tailwind v4, Wouter
- **AI:** Multi-provider router — DeepSeek (interview), Gemini Flash (image analysis)

---

## Where things live

| Path | Purpose |
|---|---|
| `artifacts/api-server/src/server/` | AI router, intake agent, image analyzer, risk logic |
| `artifacts/api-server/src/routes/` | Express route handlers (`/api/agent-turn`, `/api/calculate-risk`) |
| `artifacts/chemsafe/src/pages/` | Page components (landing, interview, results, methodology) |
| `artifacts/chemsafe/src/components/chat/` | Conversational agent UI components |
| `lib/db/src/schema/` | Drizzle table definitions (source of truth for DB schema) |
| `lib/db/src/` | DB connection singleton |
| `.env.example` | All supported environment variables with descriptions |

---

## Architecture decisions

- **Two AI providers, strict separation:** DeepSeek handles all text interview turns; Gemini Flash handles image analysis only and never enters the text failover chain. This is enforced at the router level — `analyzeImageDirect()` bypasses `executeWithFailover()` entirely.
- **`[EXTRACT]` blocks are server-side only:** DeepSeek appends structured extraction JSON inside `[EXTRACT]...[/EXTRACT]` tags. The server strips all of these before returning `agentMessage` to the client — the raw tags never reach the browser.
- **Failover chain priority:** DeepSeek → OpenRouter → OpenAI → Anthropic → Kimi → Gemini (text) → HuggingFace → Mock. Each provider has a 30-second timeout.
- **Results as inline CTA:** When the interview completes, the risk model runs silently and an "Assessment complete" card appears inline in the chat. The user navigates to results on their own terms — no forced redirect.
- **Frontend types are duplicated:** `artifacts/api-server/src/types/` and `artifacts/chemsafe/src/types/` mirror each other intentionally — no shared lib, avoiding cross-artifact TypeScript complexity.

---

## Gotchas

- **`pnpm install` without `--no-frozen-lockfile` will fail on macOS/Windows** on first clone because the lockfile records linux-x64 native binary resolutions. Always use `--no-frozen-lockfile` on a fresh local setup.
- **`PORT` defaults to `8080`** in the API server dev script if not set in `.env`. The Replit workflow sets it to `8080` explicitly.
- **`DATABASE_URL` is required** — the DB client throws on startup if it's missing.
- **Turn 0 makes zero AI calls** — the onboarding message is hardcoded server-side. This is intentional and tested.
- **Run `pnpm run db:push` before first start** — the API will crash on first request if the `assessments` table doesn't exist.

---

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._
