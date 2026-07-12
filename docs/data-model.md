# Modelo de datos (previsto)

Schema orientativo para cuando se cree Supabase. Ajustar en migraciones reales tras plan aprobado.

## `profiles`

Extiende al usuario autenticado.

| Campo | Notas |
|-------|--------|
| `id` | UUID = `auth.users.id` |
| `display_name` | opcional |
| `region` | ISO country (ej. `AR`, `MX`, `ES`) |
| `platforms` | array de provider ids TMDB / enum interno |
| `nope_policy` | `restore_only` \| `session` \| `cooldown` |
| `nope_cooldown_days` | int nullable (si policy = cooldown) |
| `expo_push_token` | token Expo Push (nullable) |
| `onboarding_completed` | bool — gate del Bloque 2 |
| `created_at` / `updated_at` | |

## `title_interactions`

Interacciones del modo solitario / bóveda personal.

| Campo | Notas |
|-------|--------|
| `user_id` | FK profiles |
| `tmdb_id` | int |
| `media_type` | `movie` \| `tv` |
| `action` | `like` \| `nope` \| `seen` |
| `rating` | 1–10 nullable (`seen` puede ser unrated) |
| `created_at` / `updated_at` | |

Constraints sugeridos: único `(user_id, tmdb_id, media_type)` (una fila actual por título; updates al cambiar acción/rating).

### Feed: exclusión de nopes

Según `profiles.nope_policy`:

- `restore_only`: excluir todos los `nope` hasta restore.
- `session`: excluir nopes de la sesión/día actual (definir “sesión” en implementación: medianoche local o `app_session_id`).
- `cooldown`: excluir si `updated_at + nope_cooldown_days > now()`.

## `rooms`

| Campo | Notas |
|-------|--------|
| `id` | UUID |
| `host_id` | creador / admin |
| `catalog_owner_id` | anfitrión de catálogo (nullable hasta elegirse) |
| `invite_code` | corto, único |
| `platform_strategy` | `intersection` \| `catalog_owner` \| `union` \| `full` |
| `mood` | JSON: géneros, duración max, seed tmdb_id, etc. |
| `created_at` | |

## `room_members`

| Campo | Notas |
|-------|--------|
| `room_id` / `user_id` | PK compuesta |
| `role` | `host` \| `member` |
| `joined_at` | |

## `room_swipes`

| Campo | Notas |
|-------|--------|
| `room_id`, `user_id`, `tmdb_id`, `media_type` | |
| `vote` | `yes` \| `no` \| `seen` |
| `created_at` | |

Único por miembro+título en sala.

## `room_matches`

| Campo | Notas |
|-------|--------|
| `room_id`, `tmdb_id`, `media_type` | único |
| `matched_at` | |

**Regla MVP:** insertar match cuando todos los `room_members` actuales tienen `vote = yes` para ese título.

## RLS (obligatorio)

- `profiles`: el usuario solo su fila.
- `title_interactions`: solo propias.
- `rooms` / members / swipes / matches: solo si el usuario es miembro de la sala.

Detalle exacto de policies en migraciones; no abrir tablas al `anon` sin auth.
