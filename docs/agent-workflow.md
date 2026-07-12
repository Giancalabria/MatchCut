# Flujo de trabajo para agentes

Estas reglas aplican a **todos** los agentes (chat, cloud, automations) que toquen este repo.

## 1. Antes de tocar código

1. Leer [`AGENTS.md`](../AGENTS.md) y los docs de `docs/` relevantes.
2. Entender el pedido del usuario y el alcance.
3. **Elaborar un plan** concreto (pasos, archivos a tocar, riesgos).
4. **Presentar el plan al usuario** y preguntar explícitamente si está OK.
5. **No implementar** hasta que el usuario confirme el plan (o una variante acordada).

Si el pedido es solo lectura/consulta, no hace falta plan de implementación: responder y listo.

## 2. Durante la implementación

- Avanzar por pasos del plan aprobado.
- **Preguntar / confirmar** con el usuario cuando:
  - termines un bloque significativo del plan,
  - surja una decisión de diseño o trade-off no cubierta,
  - el alcance amenace con crecer,
  - algo falle o contradiga el plan.
- No asumir “sigue con todo el roadmap” si solo pidieron un paso.
- Mantener diffs acotados; sin refactors oportunistas.

## 3. Git

- **Prohibido** `git commit` salvo pedido explícito del usuario.
- **Prohibido** `git push` (y cualquier publicación a remoto) salvo pedido explícito.
- No alterar `git config`.
- No usar flags interactivos (`-i`).
- No saltar hooks (`--no-verify`) salvo pedido explícito.

## 4. Operaciones destructivas o irreversibles

Requieren **autorización explícita** del usuario antes de ejecutarlas. Ejemplos:

- `git reset --hard`, `git push --force`, rebase destructivo
- Borrar archivos/carpetas importantes o historial
- `DROP` / migraciones destructivas en base de datos
- Revocar claves, borrar proyectos cloud, wipe de datos de usuarios
- Publicar builds a stores

Si hay duda de si algo es destructivo: **preguntar**.

## 5. Secretos y entorno

Seguir [`security.md`](security.md). Nunca pegar API keys en chat de forma innecesaria ni commitear `.env` con secretos.

## 6. Comunicación

- Directa y concisa.
- En planes: pasos accionables, no alternativas abiertas sin default.
- Si hace falta una decisión del usuario, hacer **1–2 preguntas críticas**, no un cuestionario.

## 7. Workspace

- Trabajo de proyecto dentro de `C:\Users\shinf\Software\MatchCut` (raíz del repo).
- No crear documentación markdown no pedida fuera de lo acordado; los docs de producto viven en `docs/`.

## Checklist mental antes de cada acción grande

```
¿Hay plan aprobado para esto?
¿Es destructivo? → ¿autorizado?
¿Es commit/push? → ¿el usuario lo pidió?
¿Expone secretos?
¿Respeta brand / product / security docs?
```
