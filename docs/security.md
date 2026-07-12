# Estándares de seguridad

## Principio

**Ningún secreto de servidor debe vivir en el cliente ni en git.** La app Expo solo usa claves públicas pensadas para el cliente (p.ej. anon key de Supabase con RLS). Todo lo demás pasa por Edge Functions o configuración de servidor.

## Secretos y variables de entorno

| Secreto | Dónde | ¿En git? |
|---------|-------|----------|
| TMDB API key / token | Edge Function secrets | No |
| Supabase `service_role` | Solo servidor / CI controlado | No |
| Supabase `anon` + URL | Cliente OK si hay RLS estricto | URL/anon pueden ir en env de ejemplo **sin** service role |
| OAuth client secrets | Consolas de proveedor / Supabase | No |
| Push certs / keys | EAS / secrets | No |

- Usar `.env`, `.env.local` (o equivalentes EAS) y **gitignorarlos**.
- Commitir solo `.env.example` con nombres de variables y valores ficticios.
- Nunca pegar secretos reales en issues, PRs, docs o chats si se puede evitar; si se filtró, rotar de inmediato.

## API TMDB

- Proxy obligatorio vía Edge Function (`tmdb-proxy` o similar).
- Rate limiting y cache en el proxy cuando exista tráfico real.
- No loguear API keys en logs de función.
- Cumplir términos TMDB; **atribuir JustWatch** donde se muestren watch providers (incumplir puede revocar acceso).

## Auth y datos de usuario

- Sesiones vía Supabase Auth; no inventar JWT propios.
- **RLS** en todas las tablas con datos de usuario desde el día 1 del schema.
- Un usuario solo lee/escribe sus interacciones; miembros de sala solo ven datos de su sala.
- `service_role` nunca en la app móvil.
- Apple Sign-In obligatorio antes de publicar en iOS (requisito de plataforma si hay otros social logins).

## Base de datos

- Migraciones versionadas en `supabase/migrations`.
- No ejecutar migraciones destructivas (DROP de datos de prod) sin autorización explícita del usuario.
- Evitar datos PII innecesarios; región y platforms son preferencias, no scrapear contactos sin permiso.

## Cliente móvil

- No habilitar debug de red con secretos en builds de release.
- Validar deep links / invite codes contra el backend (no confiar solo en el cliente para unirse a salas).
- Contenido de terceros (trailers YouTube): usar embeds oficiales; no scrape.

## Git y CI

- Pre-commit / secret scanning si se agrega tooling; no commitear `credentials.json`, `GoogleService-Info.plist` con claves sensibles sin revisión.
- Agentes: no commit/push salvo pedido (ver [`agent-workflow.md`](agent-workflow.md)).

## Incidentes

Si un secreto se expone:

1. Rotar la clave en el proveedor.
2. Revocar la antigua.
3. Verificar logs de uso anómalo.
4. Actualizar secrets en Edge Functions / EAS.
5. Informar al usuario del repo.
