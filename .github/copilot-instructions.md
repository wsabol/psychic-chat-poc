# Psychic Chat Application - AI Agent Instructions

Purpose: guide AI coding agents to be immediately productive in this psychic reading chatbot codebase.

## Quick Start (PowerShell)

```powershell
# Full stack with Docker Compose (recommended)
docker-compose up

# OR individual services (requires Redis + Postgres)
cd api; npm install; npm run dev      # API on port 3000
cd worker; npm install; npm run dev   # Worker (needs OPENAI_API_KEY)
cd client; npm install; npm start     # Client on port 3001
```

## Architecture (3-Service Queue-Based System)

**Services:**
- `api/` - Express REST API with JWT auth, routes, middleware
- `worker/` - Background AI processor (OpenAI + Python astrology calculations)
- `client/` - React SPA with hooks-based architecture

**Message Flow:**
1. User sends message → `POST /chat` (`api/routes/chat.js`)
2. Message stored in Postgres + enqueued to Redis list (`api/shared/queue.js` → `rPush("chat-jobs")`)
3. Worker polls queue (`worker/shared/queue.js` → `lPop("chat-jobs")`) every 500ms
4. Worker processes with OpenAI + context (`worker/processor.js` → `handleChatJob()`)
5. Response stored in Postgres
6. Client polls `GET /chat/history/:userId` every 2s (`client/src/hooks/useChat.js`)

**Authentication Flow:**
- JWT-based with optional 2FA (email/SMS via Twilio/Resend)
- Middleware: `authenticateToken` → `authorizeUser` → `verify2FA` (in `api/middleware/auth.js`)
- Tokens stored in localStorage, passed as `Authorization: Bearer <token>`

## Data Storage & Security

**Postgres Schema (`init.sql`):**
- `messages` - chat history with optional `content_encrypted` (pgcrypto)
- `user_personal_info` - user profiles with encrypted PII fields (`*_encrypted` columns)
- `user_astrology` - birth chart data calculated by Swiss Ephemeris

**Encryption Pattern:**
- PII encrypted at-rest using `pgp_sym_encrypt/decrypt` with `ENCRYPTION_KEY` env var
- Queries use `CASE WHEN *_encrypted IS NOT NULL THEN pgp_sym_decrypt(...) ELSE * END`
- See `api/shared/encryptionUtils.js` for helpers (not widely used yet - direct SQL in routes)

## Key Behavior Modifications

**Oracle Personality (`worker/processor.js` lines 280-380):**
- System prompt defines psychic persona blending tarot, astrology, crystals
- **Critical:** Tarot cards must include reversals (~40-60% inverted) - explicitly noted in prompt
- Context assembly: user info + astrology + recent history + current moon phase

**Astrology Integration:**
- Python script (`worker/astrology.py`) calculates birth charts via Swiss Ephemeris
- Spawned from Node.js (`spawn('/opt/venv/bin/python3', ['./astrology.py'])`)
- Requires birth date/time/location → returns sun/moon/rising signs + degrees
- Moon phase cached hourly in `worker/processor.js` (`updateMoonPhaseCache()`)

**Queue Implementation:**
- Producer: `api/shared/queue.js` → `rPush("chat-jobs", JSON.stringify({userId, message}))`
- Consumer: `worker/shared/queue.js` → `lPop("chat-jobs")` in infinite loop (`workerLoop()`)
- No acknowledgment/retry logic - messages processed once, failures logged

## Project-Specific Conventions

**Shared Code Duplication:**
- `api/shared/` and `worker/shared/` have separate `db.js`, `queue.js` - intentionally duplicated
- Changes to shared logic require updating BOTH directories

**Optimistic UI Pattern:**
- Client adds user message to `chat` state immediately (`setChat(prevChat => [...prevChat, newMsg])`)
- Server stores user message before queueing (`insertMessage(userId, 'user', message)`)
- Don't re-add user messages in history endpoint - causes duplicates

**Message Storage:**
- Plain `content` column still exists for backward compatibility
- New messages MAY be encrypted to `content_encrypted` (migration in progress)
- Always check both columns when reading (see `api/routes/chat.js` line 60)

**Custom Hooks Pattern (`client/src/hooks/`):**
- `useAuth.js` - login, 2FA, password reset state
- `useChat.js` - message history, polling, optimistic updates
- `usePersonalInfo.js` - user profile CRUD
- Parent component (`App.jsx`) orchestrates hook outputs, passes to child modals

## Development Workflows

**Adding New Routes:**
1. Create route file in `api/routes/`
2. Register in `api/index.js` with middleware chain
3. Use `authenticateToken`, `authorizeUser`, `verify2FA` as needed

**Modifying AI Behavior:**
- Edit system prompt in `worker/processor.js` (search for `oracleSystemPrompt`)
- Context injection: `personalInfoContext` + `astrologyContext` (lines 240-280)
- Tarot card extraction: `extractCardsFromResponse()` parses `**Card Name**` from OpenAI response

**Database Migrations:**
- Add SQL files to `api/migrations/` (e.g., `001-add-encryption.sql`)
- Run manually or via Docker entrypoint (`init.sql` runs on first `docker-compose up`)

**Environment Variables (Required):**
- `OPENAI_API_KEY` - worker AI processing
- `DATABASE_URL` - Postgres connection string
- `REDIS_URL` - queue backend (default: `redis://redis:6379`)
- `ENCRYPTION_KEY` - pgcrypto symmetric key
- `JWT_SECRET`, `JWT_REFRESH_SECRET` - auth tokens
- `TWILIO_*`, `RESEND_*` - 2FA delivery (optional if 2FA disabled)

## Common Pitfalls

- **Don't use `&&` in PowerShell** - use `;` to chain commands
- **Worker won't start without `OPENAI_API_KEY`** - no graceful fallback
- **Python venv path hardcoded** - `spawn('/opt/venv/bin/python3')` assumes Docker container
- **2-second polling is aggressive** - client hits `/chat/history` every 2s per user
- **Redis queue is not persistent** - restart loses queued messages
- **No duplicate message prevention** - same message can be queued multiple times if client retries

## Key Files Reference

- `api/routes/chat.js` - chat endpoints (enqueue, history, opening greeting)
- `api/middleware/auth.js` - JWT generation/verification, 2FA middleware
- `worker/processor.js` - AI orchestration, context assembly, tarot parsing
- `worker/astrology.py` - Swiss Ephemeris birth chart calculations
- `client/src/hooks/useChat.js` - polling logic, optimistic UI
- `api/shared/user.js` - message CRUD with encryption-aware queries
- `docker-compose.yml` - full stack definition with health checks

## Testing Locally

```powershell
# Set required env vars
$env:OPENAI_API_KEY = 'sk-...'
$env:ENCRYPTION_KEY = 'test-key-change-in-prod'

# Start stack
docker-compose up

# Or manually:
# 1. Start Redis + Postgres
docker run -d -p 6379:6379 redis:7
docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=postgres postgres:15

# 2. Run services
cd api; npm run dev
cd worker; npm run dev
cd client; npm start

# Access client at http://localhost:3001
```

For issues, check: worker logs (AI errors), Redis connectivity, Postgres schema (run `init.sql`), JWT secret mismatches.
