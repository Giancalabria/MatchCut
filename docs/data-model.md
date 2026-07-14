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
| `liked_genre_ids` | int[] — géneros preferidos (calibración + uso en feed) |
| `disliked_genre_ids` | int[] — géneros evitados |
| `taste_profile` | jsonb — pesos de gusto (géneros, décadas, keywords, cast) recalculados por `personalized-feed` |
| `created_at` / `updated_at` | |

## `title_embeddings`

Caché compartida de vectores por título (modelo `feature-v1`). Lectura autenticada; escritura solo vía Edge Functions (`service_role`).

| Campo | Notas |
|-------|--------|
| `media_type`, `tmdb_id`, `model` | PK compuesta |
| `embedding` | `double precision[]` (L2-normalizado) |
| `dims` | longitud del vector |
| `meta` | jsonb opcional (genre/keyword ids usados) |
| `updated_at` | |

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

### Espejo local (cliente)

La app mantiene un espejo en **Expo SQLite** de `title_interactions` (y de `room_swipes` propios + cache de `room_matches`). La UI de Bóveda / exclusión del feed lee local; las mutaciones encolan un **outbox** y se flushean a Supabase en background. Multi-dispositivo: last-write-wins por `updated_at`.

### Calibración de gusto (onboarding)

Durante la calibración, “me gustó” / “no me gustó” se persisten como `action = seen` **sin** `rating` (el usuario califica después en Vistas). Los `genre_ids` de cada título se acumulan en `profiles.liked_genre_ids` / `disliked_genre_ids`. “No la vi” no escribe fila.

### Feed personalizado

Edge Function `personalized-feed` (con fallback local en el cliente):

- Semillas: likes, `seen` con rating ≥ 8, y `seen` sin rating si aún hay pocas semillas fuertes (cubre calibración).
- Candidatos: TMDB similar + recommendations + discover diversificado + plataformas + trending.
- Score: `α·heurística + β·similitud_embedding + γ·plataforma` con α/β/γ dinámicos según cantidad de interacciones (ver `mixWeightsFromSignals`).
- Embeddings: Edge Function `title-embed` / helper compartido; modelo `feature-v1` (géneros, década, cast, keywords) sin API de IA externa.

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

Los votes propios se escriben primero en SQLite + outbox; al sincronizar, el trigger de match corre en Postgres. La celebración en cliente puede ser diferida hasta el pull de `room_matches`.

## `room_matches`

| Campo | Notas |
|-------|--------|
| `room_id`, `tmdb_id`, `media_type` | único |
| `matched_at` | |

**Regla MVP:** insertar match cuando todos los `room_members` actuales tienen `vote = yes` para ese título.

## RLS (obligatorio)

- `profiles`: el usuario solo su fila.
- `title_interactions`: solo propias.
- Comparación entre miembros de sala: Edge Function **`room-taste-match`** (verifica membership; lee interactions/profiles peeres con `service_role` y devuelve score + confianza + sugerencias, sin ampliar SELECT al cliente).
- `rooms` / members / swipes / matches: solo si el usuario es miembro de la sala.

Detalle exacto de policies en migraciones; no abrir tablas al `anon` sin auth.
