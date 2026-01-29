<!-- Copilot instructions for agents working on this repo -->
# Copilot instructions — Aldi Meal Planner

Purpose: Quickly orient an AI coding agent to be productive in this repository.

Quick start (commands)
- Install: `npm install`
- Start frontend: `npm run dev` (see [aldi-meal-planner-2.0/README.md](aldi-meal-planner-2.0/README.md))
- Start backend/server: `npm run dev:server`
- Common scripts: `npm run plan:generate`, `npm run grocery:list`, `npm run add:recipe`, `npm run verify:supabase`, `npm test`

Key environment variables
- `GEMINI_API_KEY` — required for AI model calls
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` — Supabase access
- `PORT` — backend server port

High-level architecture
- Frontend: [aldi-meal-planner-2.0/](aldi-meal-planner-2.0/) — React + Tailwind UI used by AI Studio build.
- Backend: `backend/` — contains AI agents, Supabase clients and route handlers.
- Server (API host): `server/` and `backend/index.js` — starts Express endpoints used by the frontend and scripts.
- Data & scripts: `scripts/` (many CLI scripts that import backend clients), `data/` (seed/exported JSON like `notion-recipes.json`).

AI-specific areas to inspect first
- Agent entrypoints: `backend/ai/agents/mealPlanningAgent.js` — orchestration of prompts, validation, and result shaping.
- Model client: `backend/ai/geminiClient.js` — where the model is instantiated and basic usage is wrapped.
- Prompt/response validation: many agents use strict JSON/Zod schemas; search for `zod` imports and `parse` calls before trusting outputs.

Data flow summary (how data moves)
- Recipes are fetched/processed by scripts in `scripts/` (e.g., `fetch-ingredients-from-notion.js`) and stored in Supabase (see `backend/supabase/` clients).
- Meal-plan generation: frontend → API (`/api/meal-plan/generate`) → `mealPlanningAgent` → Supabase clients → response (plan + analysis).

Project conventions and patterns
- Prefers small CLI scripts under `scripts/` for one-off data tasks; reuse `backend/supabase/*` clients rather than direct DB queries.
- Environment naming: frontend uses `VITE_*` for values exposed to the client; server secrets use non-VITE names.
- AI outputs are validated before saving; implement or update Zod schemas if changing response shapes.
- Use `npm run dev` (frontend) and `npm run dev:server` (backend) in separate terminals during local development.

Where to look for examples and troubleshooting
- Quick dev cheat sheet: `.cursor/rules/QUICK-REFERENCE.mdc` — contains commands, env vars, and common fixes.
- Top-level repo README: `README.md` — product intent, metrics, and roadmap.
- DB schema and docs: `docs/DATABASE_SCHEMA_SUPABASE.md` and `docs/`.

Common failure modes & quick fixes
- Missing `GEMINI_API_KEY`: ensure `.env` contains key and restart server.
- AI returns invalid format: compare the raw AI response and the Zod schema in the agent; add better parsing/fallbacks.
- Supabase connection errors: confirm `VITE_SUPABASE_URL` and keys; run `npm run verify:supabase`.

What to change in PRs (short checklist)
- Update or add Zod schema if changing agent output shape.
- Add/adjust CLI scripts in `scripts/` for data migrations rather than editing DB directly.
- Keep frontend env variables prefixed with `VITE_` when they’re consumed client-side.

If uncertain where something lives, grep for the function or filename: `grep -R "generateMealPlan\|mealPlanningAgent" -n .`

If you want me to expand this file with more examples (prompts, schema locations, or typical unit tests), say which area to expand.
