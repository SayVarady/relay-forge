# RelayForge — Session Handoff & Architecture Summary

## 📌 Project Overview
- **Project**: **RelayForge** (*Live Webhook Ingestion, Inspection & Replay Studio*)
- **Directory**: `/Users/localdev/Documents/se-upskill/relay-forge`
- **Spec Reference**: `CHALLENGES/01_RELAYFORGE.md`
- **Developer Background**: Experienced Laravel developer transitioning to Next.js 15 (App Router).
- **Working Style**: AI as tutor/mentor (guiding architectural decisions, explaining trade-offs vs Laravel, debugging without writing code blindly).

---

## 🛠️ Tech Stack & Key Architectural Decisions

| Layer | Choice | Why Chosen Over Alternatives | Laravel Equivalent |
| :--- | :--- | :--- | :--- |
| **Framework** | Next.js 15 (App Router, React 19, TypeScript) | Unified API routes + client dashboard in a single serverless repository. | Laravel + Blade/Inertia |
| **Database** | Serverless PostgreSQL ([Neon.tech](https://neon.tech)) | Native `JSONB` support for dynamic payloads + strict relational integrity for operational tables (`endpoints`, `replay_logs`). | PostgreSQL / MySQL |
| **Database Client** | Drizzle ORM (`drizzle-orm/neon-http`) | Zero-overhead, zero-binary pure TypeScript client. Neon's HTTP driver executes SQL queries over stateless HTTPS, avoiding serverless connection pool exhaustion and eliminating cold-start latency (unlike Prisma). | Eloquent / Query Builder |
| **Service Layer** | Decoupled functions in `src/services/` | Keeps Route Handlers razor-thin, decouples business logic from HTTP `NextRequest`/`NextResponse`, enabling pure unit testing. | Single-Action Classes / Services |
| **Real-Time UI** | `swr` (Stale-While-Revalidate) | 2-second client polling interval. Lightweight, zero WebSocket state overhead on serverless. | Laravel Echo / Polling |

---

## 🏗️ What Has Been Built (Completed Milestones)

### 1. Database Schema & Migration (`src/database/`)
- [x] [`src/database/schema.ts`](file:///Users/localdev/Documents/se-upskill/relay-forge/src/database/schema.ts): Defined `endpoints`, `capturedRequests`, and `replayLogs` with cascading foreign keys and `jsonb` columns.
- [x] [`src/database/index.ts`](file:///Users/localdev/Documents/se-upskill/relay-forge/src/database/index.ts): Configured `@neondatabase/serverless` HTTP client with Drizzle.
- [x] [`drizzle.config.ts`](file:///Users/localdev/Documents/se-upskill/relay-forge/drizzle.config.ts): Configured Drizzle Kit with `dotenv` reading `.env.local`. Migrations pushed to live Postgres.

### 2. Ingestion Engine (Day 1)
- [x] [`src/services/webhook.service.ts`](file:///Users/localdev/Documents/se-upskill/relay-forge/src/services/webhook.service.ts):
  - **First-Hit Auto-Provisioning**: Automatically creates an endpoint row if the slug does not exist.
  - Inserts captured payload using PostgreSQL `.returning()` for single-roundtrip performance.
- [x] [`src/app/api/catch/[slug]/route.ts`](file:///Users/localdev/Documents/se-upskill/relay-forge/src/app/api/catch/[slug]/route.ts):
  - Accepts `GET`, `POST`, `PUT`, `PATCH`, `DELETE` using a unified handler.
  - Converts Web API `Headers` and `URLSearchParams` to plain serializable objects via `Object.fromEntries()`.
  - Captures raw text for HMAC verification while safely attempting `JSON.parse` with crash fallback.
  - Extracts client IP (`x-forwarded-for` / `x-real-ip`).

### 3. Request Retrieval API (Day 1)
- [x] [`src/app/api/endpoints/[slug]/requests/route.ts`](file:///Users/localdev/Documents/se-upskill/relay-forge/src/app/api/endpoints/[slug]/requests/route.ts):
  - Queries latest 50 requests ordered by `createdAt DESC` filtered by `endpointId`.

### 4. Developer Studio Dashboard (Day 2)
- [x] [`src/app/page.tsx`](file:///Users/localdev/Documents/se-upskill/relay-forge/src/app/page.tsx):
  - Client component (`'use client'`) with SWR polling (`refreshInterval: 2000`).
  - Dark-mode 2-column layout (Left: Request feed with live pulse indicator; Right: Inspector details).
  - Dynamic HTTP verb color-coded badges (`Record<string, string>` type-safe map).
  - Formatted JSON body and headers inspector.
  - Copyable Webhook URL in top navigation.
- [x] [`src/lib/curl.ts`](file:///Users/localdev/Documents/se-upskill/relay-forge/src/lib/curl.ts):
  - `generateCurl(req, targetUrl)`: Generates sanitized terminal cURL commands, skipping proxy headers and escaping bash quotes.
  - One-click "Copy cURL" button with temporary visual feedback.

### 5. Replay Engine & Interactive UI Modal (Day 3)
- [x] [`src/services/replay.service.ts`](file:///Users/localdev/Documents/se-upskill/relay-forge/src/services/replay.service.ts):
  - Fetches captured request from database by UUID.
  - **Hop-by-hop header sanitization**: Strips `host`, `content-length`, `connection`, etc., preventing reverse-proxy rejections.
  - Attaches payload conditionally for body-bearing methods (`POST`, `PUT`, `PATCH`).
  - **Resilience**: Configured 10-second timeout via `AbortSignal.timeout(10000)`.
  - **Benchmarking**: High-resolution latency measurement using `performance.now()`.
  - **Crash-proof logging**: Catches network/DNS errors, logs with `statusCode: 0`, and persists audit records to `replayLogs`.
- [x] [`src/app/api/requests/[requestId]/replay/route.ts`](file:///Users/localdev/Documents/se-upskill/relay-forge/src/app/api/requests/[requestId]/replay/route.ts):
  - Next.js 15 async route param resolution (`await params`).
  - Validates payload and parses destination URL via `new URL()`.
  - Maps domain exceptions to standard HTTP response codes (`400`, `404`, `500`).
- [x] [`src/components/ReplayModal.tsx`](file:///Users/localdev/Documents/se-upskill/relay-forge/src/components/ReplayModal.tsx):
  - Decoupled accessible modal dialog with backdrop dismiss and `Escape` key capture.
  - Target URL input with default fallback to `https://httpbin.org/post`.
  - Execution result panel displaying HTTP status badge, execution latency (`⚡ X ms`), and formatted JSON/raw response viewer.
- [x] **Production Security Hardening**:
  - **SSRF Protection (`isSafeUrl`)**: Strictly blocks cloud metadata services (`169.254.169.254`), non-HTTP protocols, and blocks `localhost` / private RFC 1918 IPs in production environments.
  - **HTTP Security Headers (`next.config.ts`)**: Injects `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, and restrictive `Permissions-Policy`.
- [x] **Code Quality & Production Build**:
  - Replaced all loose `any` types with strict TypeScript interfaces (`CapturedRequest`, `CurlRequest`, etc.).
  - Zero ESLint warnings / errors (`npm run lint`).
  - Production build verified with Turbopack (`npm run build`).

---

## 🎯 Next Steps: Production Verification & Deploy

When continuing into deployment and final verification:

1. **Production Deployment (Vercel)**:
   - Push codebase to GitHub repository.
   - Import project into Vercel.
   - Configure production environment variable: `DATABASE_URL` pointing to Neon Postgres.
   - Verify serverless cold-start latency and database SSL connection.

2. **Real-World Webhook Provider Verification**:
   - Ingest live events using Stripe CLI (`stripe trigger payment_intent.succeeded --forward-to <production-url>/api/catch/stripe`).
   - Or configure a test GitHub repo webhook pointing to the production deployment.
   - Replay captured live events to local or staging webhooks.
