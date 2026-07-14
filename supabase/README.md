# Supabase

## Migrations

SQL files live in `migrations/`. Apply them to your project:

```bash
supabase link --project-ref <ref>
supabase db push
```

Or paste the contents of `migrations/20260712000000_profiles.sql` into the Supabase SQL Editor.

## Edge Functions

```bash
supabase functions deploy tmdb-proxy
supabase functions deploy personalized-feed
supabase functions deploy title-embed
supabase functions deploy room-taste-match
```

Secrets requeridos (Dashboard → Edge Functions → Secrets): `TMDB_ACCESS_TOKEN`.  
`SUPABASE_URL`, `SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY` los inyecta la plataforma.

`room-taste-match` no necesita TMDB: verifica membresía de sala y, con `service_role`, compara calificaciones entre miembros (sin abrir RLS de `title_interactions` al cliente).

Add your Expo redirect URL in Authentication → URL Configuration, e.g.:

- `matchcut://`
- `exp://127.0.0.1:8081` (dev)

Enable Email, Google, and Apple providers as needed (see `/explanations/setup-manual.md`).
