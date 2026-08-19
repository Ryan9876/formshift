# FormShift Google Authentication Setup

**Status:** Required external configuration for the current private release
**Provider:** Google only

FormShift uses Supabase Auth for identity and a separate FormShift `account_access` gate for authorization. A successful Google login does not automatically grant product access.

## Supabase callback registered with Google

Create a Google OAuth **Web application** client and register this exact authorized redirect URI:

`https://oomtpnqprxykcjzrlfgc.supabase.co/auth/v1/callback`

Configure the Google provider in the dedicated FormShift Supabase project using the resulting web client ID and client secret.

## Supabase redirect allow list

Add these application redirects to Supabase Auth URL Configuration:

- `formshift://**` — iOS development/standalone deep link
- the exact production FormShift web URL once assigned
- `https://*-lew7.vercel.app/**` — Vercel previews for the connected `lew7` team
- the local Expo web origin used during authenticated development

The production Site URL should be the exact production FormShift web URL once assigned; do not use a broad wildcard as the production Site URL.

## Google OAuth origins

When the FormShift Vercel client URL is assigned, add its exact production origin to the Google Web OAuth client. Add the exact local web origin only for development. Google does not use the Supabase Vercel wildcard as an authorized JavaScript origin.

## iOS callback behavior

The client uses the `formshift` custom scheme already declared in `app.json`. The native OAuth handler accepts either:

- a PKCE authorization `code`, exchanged through Supabase; or
- Supabase `access_token` + `refresh_token` values returned in the OAuth redirect.

This keeps the current browser-based Google OAuth flow usable on supported iPhones without requiring Apple authentication.

## Required end-to-end verification

1. Google sign-in on the deployed web client.
2. Configured owner transitions from `pending` to `active` through `bootstrap_formshift_owner`.
3. A second Google user remains `pending` until the owner approves them.
4. The second user cannot read any project before approval.
5. Google sign-in returns to the signed iOS development client through the `formshift://` deep link.
6. Sign-out clears the Supabase session on both web and iOS.
