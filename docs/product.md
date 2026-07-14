# Producto — Match Cut

## Visión

Match Cut elimina la fatiga de decisión y las discusiones al elegir qué ver. Con swipes, recomendaciones basadas en calificaciones reales y salas multijugador asíncronas, los usuarios descubren y acuerdan contenido rápido.

## Navegación (bottom tabs)

1. **Explorar** — mazo solitario.
2. **Salas** — crear/entrar a salas y ver matches.
3. **La Bóveda** — Watchlist, Descartes, Diario, ajustes.

Onboarding (auth, plataformas, región, política de descartes, calibración de gusto) fuera del tab bar.

## Onboarding

- Registro rápido: Google, Apple, Email.
- Selección de plataformas de streaming que paga el usuario.
- Región/país (catálogos cambian por país).
- Preferencia de política de descartes (ver abajo).
- **Calibración de gusto:** ~15 clásicos ampliamente vistos. Gestos: derecha = me gustó, izquierda = no me gustó, arriba = no la vi. Se guarda como `seen` sin rating (calificación a mano después); like/dislike acumulan géneros preferidos/evitados en el perfil. “No la vi” no escribe. Al terminar (o tras un mínimo de respuestas) se marca `onboarding_completed`.
- Al entrar por primera vez a Explorar: tour guiado omitible (gestos, filtros, búsqueda, Bóveda).
- La Bóveda → segmento **Vistas** (antes “Diario”) para títulos marcados como vistos y calificaciones.

## Modo solitario (Explorar)

| Gesto | Acción |
|-------|--------|
| Swipe derecha | Like → Watchlist |
| Swipe izquierda | Nope → Descartes (sujeto a política) |
| Swipe arriba | “Ya la vi” → `seen` sin rating (calificación diferida) |
| Tap | Detalle: sinopsis, trailer YouTube, géneros, platforms, elenco |

El feed de Explorar pagina de forma continua (prefetch mientras quedan pocas cartas). Sin filtros de mood, el ranking personalizado combina tres capas:

1. **Candidatos:** TMDB similar/recommendations a partir de semillas (likes + vistas bien calificadas) + discover diversificado + pool de plataformas.
2. **Perfil de gusto:** pesos de géneros, décadas, keywords y elenco derivados de likes / nopes / ratings (más calibración).
3. **Embeddings (`feature-v1`):** vectores deterministas por título (caché en `title_embeddings`); similitud coseno contra el vector del usuario.

Los pesos **α** (heurística), **β** (embeddings) y **γ** (plataformas) suben/bajan solos según cuántas interacciones tenga el usuario (saturación ~40). Mood activo sigue usando el camino de filtros dedicado.

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

- **Tu gusto** — dashboard de identidad/progreso (firma, stats, afinación, carrete, resumen mensual); segmento por defecto
- **Quiero ver (Watchlist)**
- **Descartes**
- **Diario** / **Vistas** (calificadas + cola pendientes)
- **Ajustes:** idioma (ES/EN), tema (claro / oscuro / sistema), plataformas, región, política de descartes, cuenta

## Motivación para calificar — Tu gusto

Objetivo: cerrar el loop entre “ya la vi” y “esto afina mi Match Cut” sin ligas, XP ni streaks agresivos. Las calificaciones alimentan el feed personalizado; la UI debe hacer visible ese valor.

### Qué no hacemos

Ligas / divisiones competitivas, niveles públicos, leaderboards, bloquear features por rango, rachas diarias tipo Duolingo.

### Superficies

| Superficie | Rol |
|------------|-----|
| **Tu gusto** (segmento de La Bóveda) | Dashboard: firma de gusto, stats, barra de afinación, carrete, resumen mensual, CTA a calificar pendientes |
| **Vistas + sesión bulk** | Acción de vaciar la cola de `seen` sin rating |
| **Badge en Explorar** (“N sin calificar”) | Nudge diario → abre la sesión bulk (o la cola en Vistas) |
| **Salas — Match Score** (fase posterior) | Compatibilidad de gustos con confianza; incentiva calificar en solitario |
| **Resumen mensual / carrete** (fase posterior) | Celebración tipo Wrapped, no motor diario |

### Dashboard “Tu gusto” (Fase 1)

Una pantalla, lectura rápida:

1. **Firma de gusto** — top géneros (y década si hay datos) derivados de ratings; empty state hasta un mínimo de calificadas.
2. **Tres stats** — calificadas, pendientes (tap → bulk), nota media.
3. **Barra “Afiná tu radar”** — progreso hacia umbral de señales útiles (~saturación del feed ~40) y pocos pendientes; CTA “Calificar 5 ahora” / pendientes.
4. **Distribución de notas** — barra simple 1–10.
5. **Marca del mes** — una sola línea (p. ej. cuántas calificaste este mes), sin streak de días.

### Retoques de hábito (Fase 1)

- Badge Explorar tappable → sesión bulk de pendientes.
- Al terminar el bulk: feedback corto (“tu feed tiene más señales” / género dominante si aplica).

### Fases

- **Fase 1 (hecha):** dashboard Tu gusto, badge Explorar → bulk, feedback post-bulk.
- **Fase 2 (hecha):** Match Score en sala vía Edge Function `room-taste-match` (overlap de ratings + confianza + títulos sugeridos). No abre RLS de `title_interactions` a peers.
- **Fase 3 (hecha):** carrete de favoritos (9–10) y resumen mensual desbloqueable (≥15 calificaciones del mes).

### Métricas de éxito

- % de `seen` con rating en 7 días.
- Uso del CTA / bulk desde badge y desde Tu gusto.
- Dispersión sana de notas (evitar colapso en 7–8 por farming).

## Idioma y tema

- Copy de UI vía i18n (`es` + `en`), no strings hardcodeados en pantallas.
- Preferencias persistidas en el dispositivo (y más adelante sincronizables en perfil si se desea).

## Datos externos

- **TMDB:** metadata, pósters, similares, discover.
- **Watch Providers (JustWatch vía TMDB):** dónde está disponible por país. Atribución JustWatch obligatoria en UI.

## Fuera de alcance inicial

Chat en sala, sync “viendo ahora”, web completa, monetización, deep links nativos fiables a abrir Netflix/etc., detalle profundo de temporadas de series.
