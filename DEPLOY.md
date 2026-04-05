# Deployment Checklist

## 1. GitHub
- Create repo: `gamesq-ops`
- Push the contents of this folder to that repo

## 2. Vercel
- Import the GitHub repo
- Framework: Next.js
- Root directory: repo root
- Add environment variables:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## 3. Supabase Auth
Set:
- Site URL: `https://mission.gamesqlaw.com`
- Redirect URLs:
  - `https://mission.gamesqlaw.com`
  - `https://mission.gamesqlaw.com/`
  - your Vercel domain during setup, e.g. `https://<project>.vercel.app`

## 4. Domain
In Vercel, add custom domain:
- `mission.gamesqlaw.com`
Then create the DNS record exactly as Vercel instructs.

## 5. Production smoke test
- sign in with `garrick@gamesqlaw.com`
- open All Matters
- edit a matter and refresh
- edit milestones and refresh
- change KPI thresholds and refresh
- edit source fields and refresh
- create/edit/delete an event and confirm Today/Upcoming behavior
- create/edit/delete waiting items and money items
- verify KPI and source performance sections still render correctly
