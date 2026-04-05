# Supabase Phase 3

This directory contains the starting database schema for Mission Control.

## Apply schema

1. Create a Supabase project.
2. Open the SQL editor.
3. Paste `schema.sql` and run it.

## Core tables

- `matters`
- `contacts`
- `tasks`
- `waiting_items`
- `events`
- `money_items`
- `activity_log`
- `matter_notes`

## Next implementation steps

- Supabase client config is in the app
- seeded arrays now hydrate from live queries when data exists
- matter/task mutations are wired optimistically
- apply `milestones.sql`
- apply `milestones-seed.sql` if you want the KPI layer prepopulated
- apply `rls.sql`
- create your first auth user via magic link sign-in
- apply `owner-rls.sql` after your owner account exists in Supabase Auth
- current owner email configured: `garrick@gamesqlaw.com`
