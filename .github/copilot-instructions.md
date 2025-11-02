Al# Psychic Chat Application - AI Agent Instructions

# .github/copilot-instructions.md — Psychic Chat (concise)

Purpose: give AI coding agents exactly the project knowledge they need to be immediately productive.

Quick run (PowerShell examples):

```powershell
# API
cd api; npm install; npm run dev    # uses nodemon (see api/package.json)

# Worker (needs OPENAI_API_KEY)
$env:OPENAI_API_KEY = 'your-key'; cd ..\worker; npm install; npm run dev

# Client
cd client; npm install; npm start  # react-scripts start (set REACT_APP_API_URL if not localhost)
```

Architecture highlights (what to know):
- Three services: `api/` (Express REST), `worker/` (background AI processor), `client/` (React).
- Message path: client -> `api/routes/chat.js` -> `api/shared/queue.js` (Redis list) -> `worker/processor.js` -> `worker/shared/db.js` (Postgres) -> client polls `GET /chat/history/:userId` in `client/src/App.jsx` every 2s.

Where to change behavior quickly:
- Conversation starter / persona: `worker/processor.js` (system prompt and guardrails).
- Queue implementation: `api/shared/queue.js` (enqueue) and `worker/shared/queue.js` (lPop).
- DB connection: `*/shared/db.js` (uses env var `DATABASE_URL`).
- API routes: `api/routes/chat.js` (POST `/chat`, GET `/chat/opening/:userId`, GET `/chat/history/:userId`).

Conventions & patterns to follow (project-specific):
- Messages are stored as rows with `{id, role, content}` and queried with SQL inside route/worker code. See `api/routes/chat.js` and `worker/processor.js` for usage.
- Optimistic UI: the client app appends a user message locally before worker response; do not delete or duplicate messages in `GET /chat/history` handlers.
- Shared code is duplicated between `api/shared/` and `worker/shared/` (intentional). If you change shared logic, update both places.

Dev notes and constraints:
- Worker requires `OPENAI_API_KEY` to call OpenAI; model used in the code is `gpt-4o-mini` (see `worker/processor.js`).
- Queue uses Redis at `process.env.REDIS_URL` or `redis://redis:6379` by default.
- Postgres connection uses `process.env.DATABASE_URL`.

Key files (quick jump targets):
- `api/routes/chat.js` — HTTP endpoints and queueing
- `worker/processor.js` — AI prompt, context assembly, guardrails
- `api/shared/queue.js`, `worker/shared/queue.js` — enqueue / dequeue
- `*/shared/db.js` — Postgres Pool instantiation
- `client/src/App.jsx` — polling and optimistic update behavior

If something isn't discoverable here, ask for the missing artifact (DB schema or deployment secrets). After edits, run the local dev commands above to validate.

-- End of concise instructions (20–50 lines)
