# Supabase

## Migrations

SQL files live in `migrations/`. Apply them to your project:

```bash
supabase link --project-ref <ref>
supabase db push
```

Or paste the contents of `migrations/20260712000000_profiles.sql` into the Supabase SQL Editor.

## Auth redirects

Add your Expo redirect URL in Authentication → URL Configuration, e.g.:

- `matchcut://`
- `exp://127.0.0.1:8081` (dev)

Enable Email, Google, and Apple providers as needed (see `/explanations/setup-manual.md`).
