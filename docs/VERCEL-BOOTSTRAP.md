# FormShift Vercel Bootstrap

**Team:** `lew7` (`team_JgE8AWWz36uzRbeR6V6EWg9k`)
**Status:** projects not yet created

Create two isolated Vercel projects from this monorepo. Do not reuse Parallax or any helper deployment.

## Project 1 — formshift-web

- Root Directory: `apps/client`
- Framework preset: Other / no framework inference required
- Build command: `npm run export:web`
- Output directory: `dist`
- Node: use the repository-supported Node version

Environment variables:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `EXPO_PUBLIC_API_BASE_URL` = deployed `formshift-api` HTTPS origin

## Project 2 — formshift-api

- Root Directory: `apps/api`
- Vercel Functions under `api/**`

Environment variables:

- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `FORMSHIFT_AI_MODEL`
- `FORMSHIFT_ALLOWED_WEB_ORIGINS` = exact FormShift web production/preview origins allowed to call the API
- AI Gateway/provider credential required by the selected Vercel AI configuration

No Supabase service-role/secret key is required by FormShift runtime architecture.

## OAuth redirect coordination

Supabase Auth additional redirects should include:

- `https://*-lew7.vercel.app/**` for team previews
- exact production FormShift web URL
- `formshift://**` for iOS

Once `formshift-web` receives its production URL, make that exact URL the Supabase Site URL and add its exact origin to the Google OAuth Web client.

## Deployment order

1. Create/deploy `formshift-api`; capture its HTTPS origin.
2. Set `EXPO_PUBLIC_API_BASE_URL` on `formshift-web`.
3. Deploy `formshift-web`.
4. Configure Supabase URL redirects and Google OAuth origins with the resulting web URL.
5. Validate Google login, owner bootstrap, pending friend state, API health/CORS, then Organize/Build AI calls.
