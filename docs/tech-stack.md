# Stack tecnológico

## Decisión

**App móvil multiplataforma con Expo (React Native) + TypeScript.**  
**Backend: Supabase** (Auth, Postgres, Realtime, Edge Functions).  
**Catálogo: TMDB** (+ Watch Providers / JustWatch vía TMDB).  
**Push: Expo Notifications.**

No usar Flutter salvo decisión explícita futura del usuario. No poner la API key de TMDB en el cliente.

## Capas

```
Expo App (UI, gestos, navegación)
    ↓
Supabase Client (Auth session, DB, Realtime)
    ↓
Edge Functions (proxy TMDB, lógica sensible)
    ↓
TMDB API → metadata + watch providers (JustWatch)
```

## Frontend

| Pieza | Elección |
|-------|----------|
| Framework | Expo (managed) + React Native |
| Lenguaje | TypeScript (strict) |
| Navegación | Expo Router |
| Gestos / animación | React Native Gesture Handler + Reanimated |
| Estado servidor | Preferir cliente Supabase + queries; librería de cache solo si hace falta |
| Forms / UI base | Componentes propios alineados a `brand.md`; evitar UI kits genéricos que impongan otra marca |
| i18n | `i18next` + `react-i18next` + `expo-localization` — locales `es` / `en`, cambiables en Ajustes |
| Tema | Tokens light/dark en `theme/tokens.ts`; preferencia `light` \| `dark` \| `system` en Ajustes |

## Backend / datos

| Pieza | Elección |
|-------|----------|
| Auth | Supabase Auth: Email, Google, Apple |
| DB | Postgres (Supabase) |
| Realtime | Supabase Realtime (salas / matches) |
| Server logic | Supabase Edge Functions (Deno) |
| Secrets | Supabase secrets / env de Edge Functions — nunca en el bundle |

## APIs externas

- **TMDB:** discover, details, similar, images, videos (trailer).
- **Watch Providers:** disponibilidad por `region`; atribución JustWatch en UI.
- Idioma UI: español primero; requests TMDB con `language` + `region` del perfil.

## Tooling previsto (cuando exista código)

- ESLint + Prettier (o el formateo estándar del template Expo)
- EAS Build / EAS Update para builds y OTA
- Variables locales en `.env` / `.env.local` (gitignored); ver `security.md`

## Lo que no entra (por ahora)

- App web completa
- Backend Nest/Django propio (Supabase cubre el MVP)
- JustWatch Partner API directa (usamos TMDB watch providers)
- Analytics complejos (añadir básico en fase de pulido)
