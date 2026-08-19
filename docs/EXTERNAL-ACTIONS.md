# FormShift Remaining External Actions

These are the remaining account-level actions that cannot be executed from the currently connected tools. Everything else in this release has been prepared so these are configuration steps rather than architecture decisions.

## 1. Google Cloud — create OAuth Web client

Use the Google Cloud project you want associated with FormShift.

Create one **OAuth 2.0 Client ID → Web application** for the current browser-based Google sign-in flow.

Authorized redirect URI:

`https://oomtpnqprxykcjzrlfgc.supabase.co/auth/v1/callback`

Required scopes are only the normal identity scopes: `openid`, email, and profile. Do not add broader Google-data scopes for FormShift authentication.

Retain the generated **Client ID** and **Client Secret** for the next step.

## 2. Supabase Dashboard — enable Google provider

Dedicated project: `FormShift` / `oomtpnqprxykcjzrlfgc`

Under Authentication → Providers → Google:

- enable Google
- enter the Google Web Client ID
- enter the Google Client Secret

Under Authentication → URL Configuration add:

- `formshift://**`
- `https://*-lew7.vercel.app/**`
- the exact FormShift production web URL after Vercel assigns it
- the exact local web origin used for authenticated development, if local OAuth testing is needed

Set the Site URL to the exact FormShift production web URL after it exists.

## 3. Vercel — create two isolated projects

Team: `lew7`

Create:

- `formshift-api` with root directory `apps/api`
- `formshift-web` with root directory `apps/client`

Do not reuse `parallax`, any `parallax-*` project, or helper/probe projects.

Configure environment variables using `docs/VERCEL-BOOTSTRAP.md`.

## 4. Return deployment URLs

Once Vercel creates the two project URLs, the remaining configuration can be validated end-to-end:

- API health/CORS
- web → API base URL
- Supabase production Site URL
- Google authorized web origin
- owner Google login/bootstrap
- friend pending/approval isolation
- Organize/Build AI calls

## 5. iOS later

Apple authentication is not required.

A signed iOS development build still requires normal Apple/Xcode signing credentials because RoomPlan/LiDAR is native iOS functionality. This is independent of the authentication provider.
