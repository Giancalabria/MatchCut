# Match Cut — Todo lo que tenés que hacer vos (+ cómo probar)

Esta es la **única guía operativa** para setup manual y prueba local. El código de los bloques 0–11 ya está en el repo; sin estos pasos la app corre en “modo local” limitado (sin auth real ni catálogo TMDB).

---

## 0. Checklist rápido

1. [ ] Node.js 20.19+ / 22.13+ / 24.3+ (hoy tenés 24.0.0: conviene subir un patch)
2. [ ] Cuenta [Supabase](https://supabase.com)
3. [ ] Cuenta [TMDB](https://www.themoviedb.org/settings/api) (API Read Access Token)
4. [ ] (Opcional) Google Cloud OAuth + Apple Developer
5. [ ] (Opcional) Expo / EAS para push y builds
6. [ ] Android Studio (emulador Android) y/o Xcode (solo macOS para iOS)

---

## 1. Variables locales (`.env`)

En la raíz del repo (`C:\Users\shinf\Software\MatchCut`):

1. Copiá `.env.example` → `.env`
2. Completá solo claves **públicas** del cliente:

```env
EXPO_PUBLIC_SUPABASE_URL=https://XXXX.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ....
```

**Nunca** pongas en `.env` / `EXPO_PUBLIC_*`:
- `service_role` de Supabase
- token/API key de TMDB
- tokens de Expo Push server

Esos van como **Secrets** de Edge Functions / EAS.

---

## 2. Supabase — proyecto y base de datos

1. Creá un proyecto en Supabase (región cercana).
2. Settings → API: copiá **Project URL** y **anon public** al `.env`.
3. Aplicá las migraciones (en orden):

**Opción A — SQL Editor** (más simple al inicio):

- Abrí SQL Editor
- Pegá y ejecutá `supabase/migrations/20260712000000_profiles.sql`
- Pegá y ejecutá `supabase/migrations/20260712000001_interactions_rooms_push.sql`

**Opción B — CLI**:

```powershell
npm i -g supabase
supabase login
cd C:\Users\shinf\Software\MatchCut
supabase link --project-ref TU_PROJECT_REF
supabase db push
```

4. Authentication → Providers:
   - **Email**: ON. Para probar rápido: desactivar “Confirm email”.
   - **Google** / **Apple**: cuando quieras (ver sección 5).

5. Authentication → URL Configuration — agregá:
   - `matchcut://`
   - URLs de Expo Go que uses, p.ej. `exp://127.0.0.1:8081` o la que muestre `npx expo start`

---

## 3. TMDB + Edge Function `tmdb-proxy`

1. En TMDB → Settings → API: pedí **API Read Access Token** (Bearer).
2. En Supabase → Edge Functions → Secrets:

```text
TMDB_ACCESS_TOKEN=tu_token_bearer_de_tmdb
```

(Si el código espera otro nombre, usá exactamente `TMDB_ACCESS_TOKEN`.)

3. Deploy de la function:

```powershell
cd C:\Users\shinf\Software\MatchCut
supabase functions deploy tmdb-proxy
```

4. (Opcional push) Deploy también:

```powershell
supabase functions deploy notify-match
```

Secret adicional para push server-side:

```text
EXPO_ACCESS_TOKEN=tu_token_de_expo
```

Sin `tmdb-proxy` desplegado + secret, Explorar puede quedar vacío o en fallback de desarrollo.

---

## 4. Instalar dependencias y arrancar

```powershell
cd C:\Users\shinf\Software\MatchCut
npm install
npx expo start
```

En la terminal de Expo:
- `a` → Android emulator
- `i` → iOS simulator (macOS)
- Escaneá QR con **Expo Go** en un teléfono físico

---

## 5. Probar en emulador local

### Android (Windows — tu caso)

1. Instalá [Android Studio](https://developer.android.com/studio).
2. SDK Manager: Android SDK + Platform Tools.
3. Device Manager: creá un AVD (ej. Pixel 6, API 34).
4. Arrancá el emulador.
5. En el proyecto:

```powershell
cd C:\Users\shinf\Software\MatchCut
npx expo start --android
```

Si Expo no encuentra el emulador: abrilo antes desde Android Studio y repetí el comando.

### iOS

Solo en Mac con Xcode + Simulator:

```powershell
npx expo start --ios
```

### Teléfono físico (más fácil a veces)

1. Instalá **Expo Go** (Play Store / App Store).
2. `npx expo start` y escaneá el QR (misma Wi‑Fi).
3. Para auth OAuth, la redirect `exp://...` debe estar en Supabase URL allow-list.

---

## 6. Smoke test (qué probar en la app)

Con `.env` + migraciones + `tmdb-proxy`:

1. **Registro / login** (email).
2. **Onboarding**: región → plataformas → política de descartes.
3. **Explorar**: swipes (derecha like, izquierda nope, arriba vista); tap → detalle/trailer.
4. **La Bóveda**: Watchlist / Descartes / Diario; calificar pendientes; cambiar idioma/tema.
5. **Salas**: crear sala, copiar código, unirse desde otra cuenta/emulador, swipes hasta match.
6. **Push** (opcional): aceptar permisos; match debería poder notificar si `notify-match` + token Expo están listos.

Sin Supabase: la app entra en modo local (UI + ajustes idioma/tema), pero no hay catálogo/auth reales.

---

## 7. OAuth Google / Apple (opcional hasta release)

### Google

1. Google Cloud Console → OAuth client.
2. Pegá Client ID/Secret en Supabase → Auth → Google.
3. Redirect URIs las que indique Supabase.
4. Probá “Continuar con Google” en login.

### Apple

1. Apple Developer Program.
2. Configurá Sign in with Apple según docs de Supabase.
3. Obligatorio antes de App Store si ofrecés otros social logins.

---

## 8. Push y builds de tienda (más adelante)

```powershell
npm i -g eas-cli
eas login
eas init
eas build --platform android
# eas build --platform ios   # requiere Mac/Apple Developer
```

Push en dispositivos reales suele necesitar credenciales FCM/APNs vía EAS. En emulador Android a menudo alcanza para desarrollo con Expo notifications; iOS simulator es más limitado.

---

## 9. GitHub (cuando quieras versionar)

```powershell
cd C:\Users\shinf\Software\MatchCut
git remote add origin https://github.com/TU_USUARIO/MatchCut.git
git add .
git status   # confirmá que NO entran .env, /features, /explanations
# Pedile al agente el commit, o:
git commit -m "feat: Match Cut app foundation through rooms and vault"
git push -u origin main
```

`/features` y `/explanations` están en `.gitignore` a propósito.

---

## 10. Mapa de lo ya implementado en código

| Bloque | Contenido |
|--------|-----------|
| 0 | Expo, tema, i18n ES/EN |
| 1 | Auth email + OAuth cableado, profiles |
| 2 | Onboarding región/platforms/descartes |
| 3 | Edge `tmdb-proxy`, client TMDB, JustWatch attribution |
| 4 | `title_interactions`, políticas de nope, feed |
| 5 | Swipe deck + detalle/trailer |
| 6 | Bóveda Watchlist/Descartes/Diario |
| 7–8 | Salas, votos, matches, historial |
| 9 | Registro push token + function `notify-match` |
| 10 | Ranking simple en feed |
| 11 | Checklist de release = este archivo + hardening básico en proxy (cache TTL) |

Gaps conocidos (no bloquean el MVP de prueba):

- Push de match: function lista; puede faltar webhook/trigger automático al insertar `room_matches` (se puede invocar manualmente o agregar trigger después).
- Nombres de miembros en salas: se muestran ids cortos hasta enriquecer con `display_name`.
- Deep links nativos a abrir Netflix/etc.: fuera de alcance.

---

## 11. Comandos útiles

```powershell
cd C:\Users\shinf\Software\MatchCut
npm install
npx tsc --noEmit
npx expo start
npx expo start --android
supabase db push
supabase functions deploy tmdb-proxy
supabase functions deploy notify-match
```

---

## 12. Si algo falla

| Síntoma | Qué revisar |
|---------|-------------|
| Entra sin login | Falta `.env` válido → modo local |
| Login OK pero Explorar vacío | `tmdb-proxy` no deployada / secret `TMDB_ACCESS_TOKEN` |
| Error RLS / permission denied | Migraciones no aplicadas o sesión inválida |
| OAuth no vuelve a la app | Redirect URLs en Supabase |
| Emulador no abre | AVD corriendo + `adb devices` |
| Push no llega | permisos, `expo_push_token` en profiles, `notify-match`, `EXPO_ACCESS_TOKEN` |

---

Cualquier duda operativa: partí de este archivo. La documentación de producto/agentes sigue en `AGENTS.md` y `docs/`.
