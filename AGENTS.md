# Match Cut — Guía para agentes

Este archivo es la entrada obligatoria para cualquier agente que trabaje en este repositorio. Leelo completo antes de planear o implementar. Los detalles viven en [`docs/`](docs/).

## Resumen del producto

**Match Cut** ayuda a elegir qué película o serie ver sin fatiga de decisión ni discusiones interminables.

- **Explorar (modo solitario):** mazo de tarjetas (póster dominante). Swipe derecha = watchlist, izquierda = descarte, arriba = “ya la vi” (calificación diferida). Tap = detalle (sinopsis, trailer, géneros, plataformas, elenco).
- **Salas (match asíncrono):** salas persistentes para pareja/amigos. Cada quien swipea cuando puede; al coincidir hay match, push y historial.
- **La Bóveda:** Watchlist, Descartes, Diario (vistas/calificaciones) y ajustes (plataformas, región, política de descartes).

Datos de catálogo vía **TMDB**; disponibilidad por país/plataforma vía **TMDB Watch Providers** (JustWatch, con atribución obligatoria).

Nombre clave histórico: CineMatch. Marca actual: **Match Cut**.

## Documentación obligatoria

| Doc | Contenido |
|-----|-----------|
| [docs/README.md](docs/README.md) | Índice de la documentación |
| [docs/agent-workflow.md](docs/agent-workflow.md) | **Cómo deben trabajar los agentes** (plan → OK → implementar con check-ins) |
| [docs/product.md](docs/product.md) | Visión, features, flujos, decisiones de producto |
| [docs/brand.md](docs/brand.md) | Nombre, paleta, tipografía, motion |
| [docs/tech-stack.md](docs/tech-stack.md) | Stack tecnológico acordado |
| [docs/design-practices.md](docs/design-practices.md) | Buenas prácticas y patrones de diseño/código |
| [docs/security.md](docs/security.md) | Seguridad (secretos, APIs, Auth) |
| [docs/data-model.md](docs/data-model.md) | Modelo de datos previsto |
| [QUE-HACER.md](QUE-HACER.md) | **Setup manual + emulador + smoke test (guía única)** |

## Carpetas locales (gitignored)

| Carpeta | Uso |
|---------|-----|
| [`features/`](features/) | Notas temporales de features / roadmap de implementación (no se sube al remoto) |
| [`explanations/`](explanations/) | Explicaciones pedidas por el usuario (setup manual, etc.; no se sube) |

Si existen en el disco del usuario, úsalas como contexto de trabajo. No asumas que están en el clone remoto.

## Reglas rápidas (no negociables)

1. **Siempre planear primero.** Presentar el plan al usuario y preguntar si está OK antes de implementar.
2. **Durante la implementación**, confirmar con el usuario que el rumbo es correcto (check-ins), no avanzar en silencio en cambios grandes.
3. **Nada destructivo** sin autorización explícita (reset hard, force push, borrar datos, dropear tablas, etc.).
4. **No hacer `git commit` ni `git push`** salvo que el usuario lo pida explícitamente.
5. **No exponer secretos** (TMDB, Supabase, etc.) en el cliente ni en el repo. Ver `docs/security.md`.
6. Preferir cambios acotados al pedido; no refactorizar ni ampliar alcance sin acuerdo.
7. UI vía **i18n** (`es`/`en`); respetar marca y tokens de `docs/brand.md` (tema claro/oscuro).

## Estado actual del repo

Versionado: app Expo completa (bloques 0–11 en código), `docs/`, `supabase/`, `QUE-HACER.md`, `.gitignore`. Locales (ignoradas): `features/`, `explanations/`. **Lo que el usuario debe hacer a mano y cómo probar en emulador:** ver [`QUE-HACER.md`](QUE-HACER.md).
