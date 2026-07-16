# Agency OS starter

A multi-tenant client management foundation for an agency reporting application.

## Included

- Next.js App Router + TypeScript
- Supabase cookie-based SSR authentication
- Protected dashboard routes
- Organisation membership model
- Client list, client creation and client detail pages
- PostgreSQL Row Level Security policies
- Placeholder client SEO dashboard ready for GSC data

## Setup

1. Create a Supabase project.
2. Copy `.env.example` to `.env.local` and add the project URL and publishable key.
3. Run `supabase/migrations/0001_foundation.sql` in the Supabase SQL editor.
4. Create your first user in Supabase Authentication.
5. Edit and run `supabase/seed.sql` with that user's UUID.
6. Install and run:

```bash
npm install
npm run dev
```

Visit `http://localhost:3000/login`.

## Next build milestone

Add Google OAuth specifically for Search Console, store encrypted connection metadata, list accessible GSC properties, assign a property to a client, and import daily aggregate metrics.

## Security notes

- Do not store Google refresh tokens in browser-accessible tables.
- Use a server-only secret or encrypted vault for provider tokens.
- Keep RLS enabled on every tenant-owned table.
- Add role-specific write policies before inviting contractors or clients.

## UI refresh

This version includes the polished login and dashboard interface, reusable UI styles, active navigation, sign-out, client summary cards, improved forms, and upgraded client profile pages.

If replacing an earlier local copy, preserve your existing `.env.local` file. No new Supabase migration is required for this UI release.

## Google Search Console setup

1. Run `supabase/migrations/0002_gsc_connections.sql` in the Supabase SQL editor.
2. Add your Google OAuth values to `.env.local`.
3. Generate a token-encryption key with `openssl rand -base64 32` and save it as `GSC_TOKEN_ENCRYPTION_KEY`.
4. Restart the Next.js server.
5. Open a client and select **Connect Search Console**.

The initial integration requests read-only Search Console access, stores the refresh token encrypted, imports the accessible property list, and lets you assign a property to a client. Performance metrics are added in the following milestone.

## GSC performance import (migration 0003)

Run `supabase/migrations/0003_gsc_performance.sql` in the Supabase SQL Editor after migrations 0001 and 0002.

Once a Search Console property is linked to a client, use **Sync GSC data** on the client page. The first sync requests 90 days of finalised daily web-search totals, ending three days before the current date. It stores daily clicks, impressions, CTR and average position and records each import in `gsc_sync_runs`.


## Query and landing-page analysis (migration 0004)

Run `supabase/migrations/0004_gsc_dimensions.sql` in the Supabase SQL Editor. The regular **Sync GSC data** action will then also import current and previous 28-day snapshots for queries and landing pages. The client page includes winners, losers, near-page-one keywords, CTR opportunities, filters, and CSV exports.

## Weekly automated GSC sync

The project includes a Vercel Cron job that calls `/api/cron/gsc-weekly` every Monday at 06:00 UTC.

Before deploying, add these server-only environment variables in Vercel:

- `SUPABASE_SERVICE_ROLE_KEY` — available in Supabase Project Settings → API. Keep it secret.
- `CRON_SECRET` — generate with `openssl rand -hex 32`.

Also add all existing Supabase, Google OAuth and encryption variables to Vercel. Update the Google OAuth redirect URI to your production callback URL and keep the localhost callback as an additional authorised redirect URI.

The cron endpoint only syncs linked properties that have not completed a sync in the previous six days. Manual syncing remains available from each client page.
