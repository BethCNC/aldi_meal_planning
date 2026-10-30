# Firestore Migration Notes

This document lists the immediate migration tasks and mappings from Supabase to Firestore.

Key mapping
- `src/SupabaseProvider.tsx` -> replace with `src/FirestoreProvider.tsx` (auth + db context)
- `src/lib/supabase.ts` -> replace with `src/lib/firestore.ts` (client config for browser)
- `useSupabase()` usages -> create and use `useFirestore()` (same shape: `auth`, `db`, `user`)
- `backend/supabase/*` -> create `backend/firestore/*` clients that expose `db` and helper functions
- Scripts using `@supabase/supabase-js` -> use `firebase-admin` (server) or `@google-cloud/firestore` as appropriate

Env changes
- Frontend: replace `VITE_SUPABASE_*` with `VITE_FIREBASE_*` values (API key, project id, etc.)
- Backend: set `FIREBASE_ADMIN_SERVICE_ACCOUNT` (JSON) or `GOOGLE_APPLICATION_CREDENTIALS` to allow admin SDK init
- CI/CD and deploy scripts: remove Supabase build-args or make them optional

Files discovered (examples)
- `src/SupabaseProvider.tsx`
- `src/lib/supabase.ts` / `src/lib/supabase.js`
- `src/main.tsx` (provider mount)
- `scripts/*` many scripts reference Supabase (e.g., `generate-meal-plan.js`, `import-supabase-recipes.js`, `test-supabase-meal-gen.js`)
- `backend/supabase/*` (clients used by services and agents)
- Docs and runbooks: `GET_RUNNING.md`, `GEMINI.md`, `deploy.sh` reference Supabase envs

Recommended migration steps
1. Inventory & categorize files that use Supabase (done). Mark by group: frontend, backend, scripts, docs.
2. Scaffold Firestore client/provider (frontend) and admin client (backend) — created: `src/lib/firestore.ts`, `src/FirestoreProvider.tsx`, `backend/firestore/firestoreClient.js`.
3. Create a migration mapping per file: identify table/row patterns in Supabase and equivalent collection/doc shape in Firestore.
4. Migrate small modules first (preferences, user metadata) to validate auth + read/write patterns.
5. Update scripts to accept either Supabase or Firestore toggles during transition (use `USE_FIRESTORE=1`).
6. Run tests and manual verification, then switch remaining modules.

Notes and gotchas
- Firestore is document-based: normalize relational joins into subcollections or reference IDs.
- Server-side functions that relied on Postgres RPC (RPCs) will need JS-side logic or Cloud Functions equivalents.
- Authentication flows differ: Firebase Auth on client + admin operations on server; ensure tokens and claims map correctly.
