# GAMESQ Ops — Mission Control

Deployable package for the GAMESQ Mission Control app.

## Stack
- Next.js
- Supabase
- Vercel

## Local run
```bash
npm install
npm run dev
```

## Required environment variables
Create `.env.local` for local development:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

In Vercel, add the same two environment variables in project settings.

## Deployment target
- GitHub repo: `gamesq-ops`
- Vercel project/domain: `mission.gamesqlaw.com`

## Supabase SQL files included
See `supabase/` for:
- schema
- seed
- milestones
- owner-only RLS
- settings
- source tracking

## Important
Do not commit `.env.local`.
Use `supabase/owner-rls.sql` as the final security layer after any broader policy SQL is applied.
