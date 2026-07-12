# Marca e identidad visual

## Nombre

**Match Cut** — en cine, un *match cut* une dos planos por continuidad. Metáfora del producto: varias personas “cortan” a la misma película/serie.

- Carpeta / repo: `MatchCut`
- Bundle id tentativo: `app.matchcut`
- Nombre histórico interno: CineMatch (no usar en UI)

Finalistas descartados (referencia): Quemos, Two-Shot, DeUna.

## Dirección visual

Luz de sala de proyección **fría** (papel frío + acento teal de “corte/splice”).

Evitar:

- Temas púrpura / indigo por defecto
- Cream + terracota + serif genérico
- Layout tipo periódico (broadsheet)
- Glow excesivo, pills `rounded-full` en exceso, sombras multicapa
- Dark mode como default de marca (puede existir modo oscuro después; el default es claro)

## Tokens de color

| Token | Hex | Uso |
|-------|-----|-----|
| `--bg` | `#E8EEF4` | Fondo |
| `--bg-glow` | `#D5F0EB` | Atmósfera / gradiente |
| `--surface` | `#FFFFFF` | Cards de lista, sheets |
| `--ink` | `#0E151B` | Texto principal |
| `--ink-muted` | `#5B6B79` | Texto secundario |
| `--accent` | `#00A896` | Like, CTA, tab activa |
| `--accent-deep` | `#007F73` | Pressed |
| `--nope` | `#E4574C` | Swipe izquierda / descartes |
| `--seen` | `#E8A317` | Swipe arriba / “ya la vi” |
| `--match` | `#FF4B78` | Momento de match (puntual) |
| `--line` | `#C9D4DE` | Separadores |

### Tokens dark

| Token | Hex |
|-------|-----|
| `--bg` | `#0E151B` |
| `--bg-glow` | `#0F2A26` |
| `--surface` | `#1A2330` |
| `--ink` | `#F0F4F8` |
| `--ink-muted` | `#8B9AAB` |
| `--accent` | `#00A896` |
| `--accent-deep` | `#2DD4BF` |
| `--nope` / `--seen` / `--match` | iguales al light |
| `--line` | `#2A3544` |

Default de marca: **light**. Dark y “seguir sistema” son preferencias de usuario en Ajustes. Centralizar en `theme/tokens.ts`. No hardcodear hex sueltos en pantallas.

## Tipografía

- **Display:** Syne (fallback razonable: Fraunces) — marca y títulos fuertes.
- **UI/Body:** Satoshi o DM Sans — nunca Inter / Roboto / system como tipografía de marca.

## Motion (mínimo de marca)

1. Spring en cartas del mazo al swipe.
2. Flash de borde según gesto (`accent` / `nope` / `seen`).
3. Match: transición tipo “corte” a la tarjeta especial.

## UX de composición (pantallas marketing / vacías)

- Una composición clara por viewport; no dashboard genérico.
- Una job por sección.
- Cards solo cuando aportan interacción real.
- Imagery real de cine/pósteres cuando haya contenido; no solo gradientes decorativos como idea visual principal.
