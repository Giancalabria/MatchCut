# Buenas prácticas y patrones de diseño

## Principios generales

- **Simplicidad primero:** resolver el flujo del usuario con el menor número de pantallas y estados.
- **Una responsabilidad por módulo/pantalla.**
- **Reutilizar UI** cuando solo cambia la query (ej. Watchlist vs Descartes → un `TitleCollection`).
- **Copy de UI** siempre vía i18n (`t('...')`) con locales `es` y `en`. Fallback: español.
- Código e identificadores en inglés (`watchlist`, `nope_policy`, etc.).

## Estructura de carpetas prevista (cuando exista la app)

```
app/                 # Expo Router (rutas)
features/            # Dominio: deck, rooms, vault, ratings, tmdb
theme/               # tokens, typography
supabase/            # migrations, functions
docs/                # esta documentación
```

Evitar “utils dump”: helpers junto al feature que los usa; subir a shared solo si hay 2+ consumidores claros.

## UI / UX

- Respetar tokens y tipografía de [`brand.md`](brand.md).
- El póster del mazo debe dominar (~80% del alto útil); controles secundarios no compiten.
- Detalle de título: expandir/flip; trailer solo en detalle (no en el mazo) por performance.
- Empty states claros (Watchlist vacía, sin matches, sin pendientes de nota).
- Filtros de Bóveda: plataforma y duración son de primer nivel.
- Atribución **JustWatch** visible donde se listen providers.
- No promocionar piratería; “Catálogo completo” = flatrate + rent + buy.

### Gestos del mazo

| Gesto | Feedback visual |
|-------|-----------------|
| Derecha | Borde/overlay `--accent` |
| Izquierda | `--nope` |
| Arriba | `--seen` |

Animaciones con Reanimated; mantener 60fps en dispositivos medios (prefetch de imágenes, limitar videos en stack).

## Patrones de datos

- **Source of truth** de interacciones: Postgres (`title_interactions`), no solo estado local.
- Política de nopes aplicada en **servidor/query del feed**, no solo ocultando en UI.
- Prefetch del mazo (p.ej. 20–40); reponer al quedar pocas cartas.
- IDs de contenido: `tmdb_id` + `media_type` (`movie` | `tv`).

## Patrones de código React Native

- Componentes de presentación tontos + hooks/features con lógica.
- Evitar `useMemo` / `useCallback` por defecto salvo costo medido o convención del repo.
- Tipar respuestas de API en el borde (proxy TMDB → tipos internos de dominio).
- No filtrar errores en silencio; empty/error states explícitos.

## Salas

- Tratar host y anfitrión de catálogo como roles distintos.
- Match MVP: consenso total (todos like). No implementar “mayoría” sin pedido.
- Swipes de sala separados de interacciones solitarias (tablas distintas).

## Testing (cuando corresponda)

- Priorizar lógica de match, política de descartes y filtros de feed.
- No bloquear el MVP por cobertura total; añadir tests al tocar reglas de negocio críticas.

## Anti-patrones

- Claves TMDB en el cliente.
- Duplicar listas Watchlist/Descartes con dos UIs distintas.
- Pedir calificación obligatoria en cada “ya la vi”.
- Scope creep (chat, social graph, etc.) sin acuerdo.
- Commits/pushes no pedidos (ver [`agent-workflow.md`](agent-workflow.md)).
