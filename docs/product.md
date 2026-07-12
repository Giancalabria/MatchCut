# Producto — Match Cut

## Visión

Match Cut elimina la fatiga de decisión y las discusiones al elegir qué ver. Con swipes, recomendaciones basadas en calificaciones reales y salas multijugador asíncronas, los usuarios descubren y acuerdan contenido rápido.

## Navegación (bottom tabs)

1. **Explorar** — mazo solitario.
2. **Salas** — crear/entrar a salas y ver matches.
3. **La Bóveda** — Watchlist, Descartes, Diario, ajustes.

Onboarding (auth, plataformas, región, política de descartes) fuera del tab bar.

## Onboarding

- Registro rápido: Google, Apple, Email.
- Selección de plataformas de streaming que paga el usuario.
- Región/país (catálogos cambian por país).
- Preferencia de política de descartes (ver abajo).

## Modo solitario (Explorar)

| Gesto | Acción |
|-------|--------|
| Swipe derecha | Like → Watchlist |
| Swipe izquierda | Nope → Descartes (sujeto a política) |
| Swipe arriba | “Ya la vi” → `seen_unrated` (calificación diferida) |
| Tap | Detalle: sinopsis, trailer YouTube, géneros, platforms, elenco |

### Calificación

**Default: calificación diferida (Opción 2).** El swipe arriba no pide nota al momento. Contador sutil en Explorar (“Tienes N sin calificar”). Se califica después en La Bóveda → Diario.

La Opción 1 (pantalla flash 1–10 al instante) queda como posible atajo futuro, no como flujo principal.

### Política de descartes (configurable)

| Modo | Comportamiento |
|------|----------------|
| Hasta que yo restaure | No vuelve al mazo hasta acción manual en Descartes |
| Por sesión | Oculta hasta nueva sesión / nuevo día |
| Cooldown | Vuelve tras N días (presets 7/30/90/180 + custom) |

Default recomendado: **cooldown 90 días**.

### Descartes (La Bóveda)

Misma UI que Watchlist (`TitleCollection` + query distinta). Acciones: restaurar al mazo, mover a watchlist, marcar vista. Filtros reutilizados (plataforma, duración, etc.).

## Salas (Match)

- Persistentes y asíncronas.
- Mood opcional: género, seed “parecido a X” (TMDB similar), duración.
- **Host** (admin) ≠ **Anfitrión de catálogo** (quién define el catálogo “en casa de…”).

Estrategias de plataformas:

- Intersección estricta (todos ∩)
- Catálogo del anfitrión
- Unión (∪)
- Catálogo completo (incluye rent/buy; no enmarcar como piratería)

**Match MVP:** todos los miembros actuales dieron like al mismo título → push + tarjeta “¡Tienen un Match!” + historial de matches en la sala.

## La Bóveda

- **Quiero ver (Watchlist)**
- **Descartes**
- **Diario** (calificadas + cola pendientes)
- **Ajustes:** idioma (ES/EN), tema (claro / oscuro / sistema), plataformas, región, política de descartes, cuenta

## Idioma y tema

- Copy de UI vía i18n (`es` + `en`), no strings hardcodeados en pantallas.
- Preferencias persistidas en el dispositivo (y más adelante sincronizables en perfil si se desea).

## Datos externos

- **TMDB:** metadata, pósters, similares, discover.
- **Watch Providers (JustWatch vía TMDB):** dónde está disponible por país. Atribución JustWatch obligatoria en UI.

## Fuera de alcance inicial

Chat en sala, sync “viendo ahora”, web completa, monetización, deep links nativos fiables a abrir Netflix/etc., detalle profundo de temporadas de series.
