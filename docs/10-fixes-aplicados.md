---
titulo: Correcciones aplicadas sobre el código post-Lovable
fecha: 2026-08-15
estado: Escrito directamente en tu PC vía device bridge. Build verificado (npm install + tsc --noEmit + next build) en una copia de prueba antes de escribir nada.
---

# Qué se corrigió

## 1. RLS de Supabase (crítico)

Nueva migración `supabase/migrations/20260815020000_fix_chat_rls_security.sql`: revoca el acceso público (`anon`) a `chat_sessions`/`chat_messages` y borra las policies `USING (true)`. De ahora en más, ni la anon key ni ninguna consulta directa a la API de Supabase puede leer o escribir esas tablas.

Para que el chat siga funcionando, las 4 rutas que tocan esas tablas (`/api/chat`, `/api/chat-session`, `/api/messages`, `/api/webhook`) pasaron a usar un cliente nuevo server-only (`src/lib/supabase-admin.ts`) con la **service_role key**, que sí puede bypassear RLS. Ese cliente nunca se importa desde código de cliente (usa el paquete `server-only`, que rompe el build si alguien lo intenta).

**Acción tuya, antes de que esto funcione:** agregar la variable `SUPABASE_SERVICE_ROLE_KEY` (Supabase → Project Settings → API → service_role secret, **no** la anon key) al `.env.local` y a las variables de entorno donde despliegues. Y aplicar la migración nueva — vía Supabase CLI (`supabase db push`) o pegándola en el SQL Editor de Supabase. **Hacé las dos cosas juntas**: si aplicás la migración sin la key configurada, el chat se rompe hasta que la agregues.

## 2. Fuga de settings.ts (crítico)

`src/lib/settings.ts` ya no exporta URLs de webhook ni reexporta `serverSettings`. Solo tiene `whatsAppNumber`, `chatAgentName`, `siteUrl` — lo único que los componentes cliente (`chat-widget.tsx`, `footer.tsx`) necesitan. `src/lib/settings.server.ts` ahora usa el paquete `server-only` para que el build falle si algo del cliente lo importa por error. Verificado con `grep` sobre el JS compilado: ya no aparece ninguna URL de `n8n.axion380.com.br` en el bundle público.

## 3. Token de sesión fuera de sessionStorage

`/api/chat-session` ya no devuelve el token en el body — solo lo setea como cookie `httpOnly`. `chat-widget.tsx` ya no lo guarda en `sessionStorage`. La ruta es idempotente: si ya hay cookie, no crea una fila nueva en `chat_sessions`.

## 4. Código muerto peligroso — borrado en el build, pendiente en tu disco

Confirmé por grep (cero importadores) y por un build completo sin esos archivos que se pueden borrar sin romper nada:

```
src/lib/checkout.ts
src/lib/messageStore.ts
src/app/api/dify-chat/route.ts
src/app/api/send-message/route.ts
src/app/actions/chat.ts
src/app/api/chat/webhook/route.ts
src/app/api/alma-chat/route.ts
```

**No los pude borrar en tu PC** — la herramienta de shell remoto no estuvo disponible en esta sesión (el bridge de archivos solo escribe, no borra). Movelos vos a una carpeta tipo `_to_delete` o borralos directo; están confirmados sin uso.

## 5. Resto de los arreglos

- `/api/checkout`: ahora valida con zod (`buyer`, `quantity`), ya no tiene la URL del webhook hardcodeada de fallback — si falta la variable de entorno, devuelve 500 con log claro en vez de usar una URL adivinada.
- `/api/chat`: valida el mensaje con zod (1–2000 caracteres) antes de guardarlo o mandarlo a OpenAI.
- `/api/webhook`: arreglado el bug de `timingSafeEqual` que tiraba `RangeError` (y devolvía 400 en vez de 401) cuando la firma recibida tenía otra longitud.
- `middleware.ts`: rate limiting básico en memoria (`/api/chat`, `/api/chat-session`, `/api/checkout`, `/api/webhook`, `/api/virtual-tryon`) + headers `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`. Es una primera capa (no sobrevive reinicios ni múltiples instancias), pero corta abuso trivial de scripts.
- `layout.tsx`: saqué el `title="SIN ROMPER LA LOGICA..."` que había quedado pegado en el `<body>`.
- `package.json`: saqué `@dnd-kit/*`, `@mediapipe/*`, `three`, `@types/three`, `wav`, `firebase`, `date-fns`, `@hookform/resolvers`, `@genkit-ai/next` — confirmé con grep que nada los importa, y el build corrió limpio sin ellos. Agregué `server-only`.
- `.env.example`: ahora lista todas las variables reales que usa el código (antes solo tenía 2 de ~12).

## Lo que NO toqué (a propósito)

- `next.config.ts` (`ignoreBuildErrors`/`ignoreDuringBuilds`): con mis cambios, `npx tsc --noEmit` da **cero errores**, así que en teoría ya podrías poner `ignoreBuildErrors: false` sin drama. No lo cambié yo mismo porque no quise tocar la config de build sin que lo veas primero — probalo vos con `npx tsc --noEmit` antes de flipearlo, por las dudas de algo específico de tu entorno de deploy.
- `src/lib/supabase.ts` (cliente separado para un panel Kanban de `orders`/`order_items`): no tiene tabla ni migración en el repo y no lo importa nada — lo dejé como está, es un problema aparte del chat.
- Tabla `chat_prospects`: seguía sin existir, no la creé — no la usa ningún código actual, así que no era necesaria para que nada funcione.

## Cómo lo verifiqué

Copié el proyecto completo a un entorno limpio, corrí `npm install` real (748 paquetes, sin errores de import faltante — confirma que las dependencias que saqué de verdad no se usaban), `npx tsc --noEmit` (0 errores) y `npm run build` completo: compiló y generó las 19 rutas esperadas, con las 4 rutas muertas ya ausentes del output. Grep sobre el JS compilado confirmó que ninguna URL de webhook ni ninguna clave (Supabase service role, OpenAI) aparece en el bundle público.

## Pendiente de tu lado

1. **Agregar `SUPABASE_SERVICE_ROLE_KEY`** y aplicar la migración `20260815020000_fix_chat_rls_security.sql` (juntas, no una sin la otra).
2. Borrar los 7 archivos de la lista de arriba (o moverlos a `_to_delete/`).
3. Confirmar `npx tsc --noEmit` en tu máquina y, si sigue en cero, poner `ignoreBuildErrors: false` en `next.config.ts`.
