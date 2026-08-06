# Marca e identidad visual

## Nombre

**Match Cut** — en cine, un *match cut* une dos planos por continuidad. Metáfora del producto: varias personas “cortan” a la misma película/serie.

- Carpeta / repo: `MatchCut`
- Bundle id tentativo: `app.matchcut`
- Nombre histórico interno: CineMatch (no usar en UI)

Finalistas descartados (referencia): Quemos, Two-Shot, DeUna.

## Dirección visual

Sala de proyección **oscura** (charcoal cálido + ámbar tungsteno de “lámpara / corte”). Dark es el default de marca; light es preferencia opcional en Ajustes.

Paleta definitiva: **A1 Hot amber** (familia Tungsten).

Evitar:

- Temas púrpura / indigo por defecto
- Cream + terracota + serif genérico
- Layout tipo periódico (broadsheet)
- Glow excesivo, pills `rounded-full` en exceso, sombras multicapa
- Teal / “wellness SaaS” como acento de marca

## Tokens de color

Default de marca: **dark**. Centralizar en `theme/tokens.ts`. No hardcodear hex sueltos en pantallas.

### Dark (primario)

| Token | Hex | Uso |
|-------|-----|-----|
| `--bg` | `#0A0806` | Fondo |
| `--bg-glow` | `#2A1808` | Atmósfera / gradiente |
| `--surface` | `#1C140E` | Cards, sheets, inputs |
| `--ink` | `#FFF6EB` | Texto principal |
| `--ink-muted` | `#B7A793` | Texto secundario |
| `--accent` | `#FFB020` | Like, highlights, gestos |
| `--accent-deep` | `#FFC933` | Highlight de texto (no fill CTA) |
| `--cta` | `#E8940A` | Fill de botón primario |
| `--on-accent` | `#1A0E00` | Texto sobre CTA (oscuro: contraste AA sobre ámbar) |
| `--accent-soft` | `#3A240A` | Chip/filtro activo |
| `--danger-soft` | `#3A1F1C` | Badge / fondo error suave |
| `--warning-soft` | `#3A2A10` | Badge / “sin calificar” |
| `--nope` | `#E4574C` | Swipe izquierda / descartes |
| `--seen` | `#FFB300` | Swipe arriba / “ya la vi” |
| `--match` | `#FF4B78` | Momento de match (acento puntual) |
| `--line` | `#4A3A2A` | Separadores / bordes |

### Light (secundario)

| Token | Hex | Uso |
|-------|-----|-----|
| `--bg` | `#F0E8DC` | Fondo |
| `--bg-glow` | `#FFE7B8` | Atmósfera / gradiente |
| `--surface` | `#FFFCF7` | Cards, sheets |
| `--ink` | `#1A1208` | Texto principal |
| `--ink-muted` | `#6A5A48` | Texto secundario |
| `--accent` | `#E8940A` | Like, highlights |
| `--accent-deep` / `--cta` | `#C97800` | Highlight / fill CTA (AA) |
| `--on-accent` | `#FFFFFF` | Texto sobre CTA |
| `--accent-soft` | `#FFE2A8` | Chip activo |
| `--danger-soft` | `#F8D9D6` | Badge error |
| `--warning-soft` | `#FFE8B8` | Badge warning |
| `--nope` / `--seen` / `--match` | iguales al dark | |
| `--line` | `#D2C0A4` | Separadores |

Overlays (`scrim`, `stampLike`, `stampNope`, `stampSeen`, `posterScrim`, `onPoster`, `onPosterMuted`) también viven en `theme/tokens.ts` — no rgba sueltos en pantallas.

### Reglas de contraste

- Botón primario: `cta` + `onAccent` (en dark, `onAccent` es ink oscuro; no blanco sobre ámbar claro).
- Chips activos: `accentSoft` + borde `cta` + texto `ink` (no fill sólido de CTA).
- Segment controls (Vault): track `surface` + segmento activo `cta` / `onAccent`.
- No usar `accent` / `nope` / `seen` como color de body text sobre `bg`; preferir `ink` + indicador, o soft + `ink`.
- Tab activa: tint `cta`.

## Spacing y radios

Centralizar en `theme/spacing.ts` y `theme/radii.ts`.

- Padding de pantalla: `layout.screenPaddingX` (24); compacto en explore/deck: `screenPaddingXCompact` (20).
- Gaps: `inlineGap` 8, `stackGap` 12, `sectionGap` 16.
- Radios: `sm` 8, `md` 12 (botones/chips/inputs), `lg` 16 (cards), `xl` 20, `deck` 28 (cartas del mazo). Evitar `full` (999) salvo avatares y barras de progreso.

## Tipografía

- **Display:** Syne — marca y títulos fuertes.
- **UI/Body:** DM Sans — nunca Inter / Roboto / system como tipografía de marca.
- Escala en `theme/typography.ts`: hero 34, display 28, title 22, section 17, body 16, caption 13, label 12.
- UI vía `AppText` — no `fontSize` sueltos fuera de theme.

## Iconografía

Set unificado vía Ionicons (`AppIcon` / `IconButton`). Outline inactivo, filled activo en tabs. Hit target ≥ 40×40; radio de icon button = `radii.md` (evitar `rounded-full` en exceso).

## Motion (mínimo de marca)

1. Spring en cartas del mazo al swipe.
2. Stamp overlay (LIKE / NOPE / VISTA) + flash de borde según gesto (`accent` / `nope` / `seen`).
3. Match: transición tipo “corte” (flash breve → póster full-bleed → tipografía).

## UX de composición (pantallas marketing / vacías)

- Una composición clara por viewport; no dashboard genérico.
- Una job por sección.
- Cards solo cuando aportan interacción real.
- Imagery real de cine/pósteres cuando haya contenido; no solo gradientes decorativos como idea visual principal.
