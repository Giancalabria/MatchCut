# Marca e identidad visual

## Nombre

**Match Cut** — en cine, un *match cut* une dos planos por continuidad. Metáfora del producto: varias personas “cortan” a la misma película/serie.

- Carpeta / repo: `MatchCut`
- Bundle id tentativo: `app.matchcut`
- Nombre histórico interno: CineMatch (no usar en UI)

Finalistas descartados (referencia): Quemos, Two-Shot, DeUna.

## Dirección visual

Sala de proyección **oscura** (negro-cine + acento teal de “corte/splice”). Dark es el default de marca; light es preferencia opcional en Ajustes.

Evitar:

- Temas púrpura / indigo por defecto
- Cream + terracota + serif genérico
- Layout tipo periódico (broadsheet)
- Glow excesivo, pills `rounded-full` en exceso, sombras multicapa

## Tokens de color

Default de marca: **dark**. Centralizar en `theme/tokens.ts`. No hardcodear hex sueltos en pantallas.

### Dark (primario)

| Token | Hex | Uso |
|-------|-----|-----|
| `--bg` | `#0B1117` | Fondo |
| `--bg-glow` | `#0C2420` | Atmósfera / gradiente |
| `--surface` | `#15202B` | Cards, sheets, inputs |
| `--ink` | `#F0F4F8` | Texto principal |
| `--ink-muted` | `#9AA8B8` | Texto secundario |
| `--accent` | `#00A896` | Like, highlights, gestos |
| `--accent-deep` | `#2DD4BF` | Highlight (no fill CTA con blanco) |
| `--cta` | `#008F82` | Fill de botón primario (AA con onAccent) |
| `--on-accent` | `#FFFFFF` | Texto sobre CTA |
| `--accent-soft` | `#143530` | Chip/filtro activo sin texto blanco |
| `--danger-soft` | `#3A1F1C` | Badge / fondo error suave |
| `--warning-soft` | `#3A2E14` | Badge / “sin calificar” |
| `--nope` | `#E4574C` | Swipe izquierda / descartes |
| `--seen` | `#E8A317` | Swipe arriba / “ya la vi” |
| `--match` | `#FF4B78` | Momento de match (acento puntual) |
| `--line` | `#3A4A5C` | Separadores / bordes |

### Light (secundario)

| Token | Hex | Uso |
|-------|-----|-----|
| `--bg` | `#D8E0E8` | Fondo |
| `--bg-glow` | `#C5E8E0` | Atmósfera / gradiente |
| `--surface` | `#FFFFFF` | Cards, sheets |
| `--ink` | `#0E151B` | Texto principal |
| `--ink-muted` | `#4A5A68` | Texto secundario |
| `--accent` | `#00A896` | Like, highlights |
| `--accent-deep` / `--cta` | `#007F73` | Fill CTA (AA) |
| `--on-accent` | `#FFFFFF` | Texto sobre CTA |
| `--accent-soft` | `#D0EDE8` | Chip activo |
| `--danger-soft` | `#F8D9D6` | Badge error |
| `--warning-soft` | `#F8E8C4` | Badge warning |
| `--nope` / `--seen` / `--match` | iguales al dark | |
| `--line` | `#9AABBA` | Separadores |

### Reglas de contraste

- Botón primario: `cta` + `onAccent` (nunca `#00A896` + blanco).
- Chips activos: `accentSoft` + `accentDeep`/`ink`, o fill `cta` + `onAccent`.
- No usar `accent` / `nope` / `seen` como color de body text sobre `bg`; preferir `ink` + indicador, o soft + `ink`.
- Tab activa: tint `cta`.

## Tipografía

- **Display:** Syne — marca y títulos fuertes.
- **UI/Body:** DM Sans — nunca Inter / Roboto / system como tipografía de marca.
- Escala de roles en `theme/typography.ts`: display 28, title 22, section 17, body 16, caption 13, label 12.

## Iconografía

Set unificado vía Ionicons (`AppIcon` / `IconButton`). Outline inactivo, filled activo en tabs. Hit target ≥ 40×40; radio de icon button ~12 (evitar `rounded-full` en exceso).

## Motion (mínimo de marca)

1. Spring en cartas del mazo al swipe.
2. Stamp overlay (LIKE / NOPE / VISTA) + flash de borde según gesto (`accent` / `nope` / `seen`).
3. Match: transición tipo “corte” (flash breve → póster full-bleed → tipografía).

## UX de composición (pantallas marketing / vacías)

- Una composición clara por viewport; no dashboard genérico.
- Una job por sección.
- Cards solo cuando aportan interacción real.
- Imagery real de cine/pósteres cuando haya contenido; no solo gradientes decorativos como idea visual principal.
