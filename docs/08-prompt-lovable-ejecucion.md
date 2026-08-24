---
titulo: Prompt para Lovable — Ejecución del plan de limpieza Joyería Alianza
fecha: 2026-08-14
uso: Copiar y pegar tal cual en Lovable, en una sola conversación, en orden. No saltear pasos.
---

# ANTES DE PEGAR EN LOVABLE — leé esto

1. **F0 no va en Lovable.** F0 son 6 arreglos dentro del workflow de **n8n** (URL de WooCommerce, auth en header, pausa web, escapado JSON, token en webhooks, prompt de Alma). Lovable no tiene acceso a n8n. Hacé F0 vos mismo o con quien administre n8n, siguiendo `02-plan-limpieza.md` sección FASE 0. Es lo más urgente — Alma está inventando precios ahora mismo.
2. **F4 (agente nativo con streaming) queda afuera de este prompt.** Está bloqueada por la decisión de hosting (Vercel vs Hostinger). Ver `07-adr-001-donde-vive-el-agente.md`. Cuando esté resuelta, pedime el prompt de F4 aparte.
3. Este prompt cubre **F1 → F2 → F3 → F5**, en ese orden, sobre el código web (`joyeriawp-main`). Es la parte que sí se ejecuta con Lovable.
4. Pegalo completo en un primer mensaje. Si Lovable se traba en un paso, decile "seguí con el paso X" citando el número.

---

# PROMPT — pegar desde acá

Estás trabajando sobre un proyecto Next.js 15.5.9 (App Router, TypeScript) de e-commerce de joyería, integrado con WooCommerce REST API, Supabase y n8n (agente de chat "Alma", que corre aparte y no se toca en esta tarea). Vas a ejecutar 4 fases de limpieza y hardening, en orden estricto, cada una verificable antes de pasar a la siguiente. No inventes funcionalidad nueva: el objetivo es cerrar vulnerabilidades y borrar código muerto, no rediseñar.

## FASE 1 — Seguridad crítica (hacer primero, es lo más grave)

**1.1 — Checkout server-side.**
Hoy `src/lib/checkout.ts` no tiene `'use server'` y se importa desde `src/components/buy-button.tsx` (componente cliente). Eso significa que el `fetch` con el precio corre en el navegador del comprador, contra un webhook de n8n sin autenticación — cualquiera puede mandar `amount: 1` por curl y recibir un link de pago real de Mercado Pago.

Hacé esto:
- Creá `src/app/api/checkout/route.ts`, server-only.
- Debe aceptar **solo** `{ productId, quantity, buyer }` en el body — nunca un precio.
- Resolvé el precio del lado del servidor llamando a la función existente que trae productos de WooCommerce (buscá `fetchWooCommerce` en `src/lib/woocommerce.ts` y reusala, no la reescribas).
- Desde esa ruta, llamá al webhook de n8n agregando un header `X-Webhook-Token` con el valor de una variable de entorno nueva `N8N_WEBHOOK_TOKEN` (agregala a `.env.example`, no la hardcodees).
- Modificá `buy-button.tsx` para que llame a `/api/checkout` en vez de importar `checkout.ts` directamente.
- Borrá `src/lib/checkout.ts`.

**1.2 — Firma en `/api/webhook`.**
Cualquiera puede hacer POST a `src/app/api/webhook/route.ts` e inyectar mensajes en el chat de un cliente atribuidos a Alma.
- En la ruta: leé el body crudo con `await req.text()`, calculá HMAC-SHA256 con una variable `N8N_WEBHOOK_SECRET` y comparalo contra el header `X-Signature` usando `crypto.timingSafeEqual` (nunca `===` para comparar firmas). Si no matchea, devolvé 401 antes de procesar nada.
- Sacá cualquier `console.log` que imprima el teléfono o el mensaje del cliente en texto plano.
- Si ves un default `senderName = 'Maya'`, corregilo a `'Alma'`.

**1.3 — Cerrar el IDOR de `/api/messages`.**
Hoy `GET /api/messages?phone=<numero>` devuelve los mensajes de cualquier teléfono sin autenticación, y al leerlos los borra (el cliente real nunca los recibe si alguien más los leyó antes).
- Generá un token de sesión opaco (`crypto.randomUUID()` o similar) al iniciar una conversación web, guardalo en una cookie `httpOnly`.
- La clave para buscar mensajes pasa a ser ese token, nunca el teléfono, en ningún endpoint.

**1.4 — Sanitizar HTML de productos.**
`src/app/products/[id]/page.tsx` usa `dangerouslySetInnerHTML` con la descripción de WooCommerce sin sanitizar, y `src/lib/mappers.ts` reinyecta un `src` capturado por regex sin escapar. Es XSS directo si alguien con acceso al catálogo de WordPress mete un `<img onerror=...>` en una descripción.
- Instalá `isomorphic-dompurify`.
- Sanitizá la descripción del lado del servidor (en el fetch/mapper, no en el render) con un allowlist de tags: `p, br, ul, li, strong, em, video, source, a`.
- Validá que cualquier `src` o `href` empiece con `https:` antes de dejarlo pasar.

**Verificación de Fase 1 antes de seguir:**
- `curl` directo al webhook de checkout con `amount: 1` en el body → debe devolver 401, no un link de pago.
- `curl` a `/api/webhook` sin header `X-Signature` → 401.
- `GET /api/messages?phone=<numero-que-no-es-tuyo>` → 401 o 403, no la lista de mensajes.

## FASE 2 — Borrado de código muerto (después de Fase 1)

**2.1 — Rutas huérfanas o legacy a eliminar:**
```
src/app/api/dify-chat/route.ts
src/app/api/send-message/route.ts
src/app/actions/chat.ts
src/app/api/chat/webhook/route.ts
```
Antes de borrar cada una, grepeá el resto del repo por su nombre de import para confirmar que no tiene consumidor activo.

**IMPORTANTE — no borres `src/app/api/alma-chat/route.ts` en esta fase.** Sí tiene un consumidor: `chat-widget.tsx` lo llama, aunque hoy `<ChatWidget />` está comentado en `layout.tsx`. Dejala viva pero agregale rate limiting (ver 5.2 más abajo). Se borra recién en la fase del agente nativo (F4, fuera de este prompt).

**2.2 — Widget `@n8n/chat` sin versión fijada.**
En `src/app/layout.tsx` hay un `<script>` que importa `@n8n/chat` desde jsDelivr sin pin de versión — una versión comprometida del paquete ejecuta código arbitrario en todo el sitio, incluida la página de pago. Fijá la versión exacta que está en uso hoy (`@n8n/chat@X.Y.Z`) directamente en la URL del script.

**2.3 — Partir `settings.ts`.**
Hoy `src/lib/settings.ts` se importa desde componentes cliente (`chat-widget.tsx`, `footer.tsx`), lo que mete las URLs de los webhooks de n8n en el bundle de JavaScript público — cualquiera las ve con "ver código fuente".
- Creá `src/lib/settings.client.ts` con solo lo que necesita el cliente: `whatsAppNumber`, `chatAgentName`, `siteUrl`.
- Creá `src/lib/settings.server.ts` con las URLs de webhook, leídas de `process.env` **sin valor hardcodeado de fallback** — si falta la variable, que tire error al arrancar, no que use un valor por defecto silencioso.
- Borrá de donde sea que estén: `difyApiKey`, `difyBaseUrl` y cualquier otro campo de Dify (ya no se usa).
- Buscá el número de WhatsApp en dos lugares distintos del código (puede haber uno en `settings.ts` y otro en un archivo `whatsapp.ts` o similar) — si hay dos números distintos, es un bug, unificalos preguntándome cuál es el correcto si no es obvio por el contexto.
- Actualizá todos los imports de `settings.ts` para que apunten a `.client` o `.server` según corresponda.

**2.4 — Dependencias sin usar.**
Corré `npx depcheck` y confirmá contra este listado antes de desinstalar:
```
npm uninstall @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities @mediapipe/camera_utils @mediapipe/hands @mediapipe/drawing_utils three @types/three wav firebase date-fns @hookform/resolvers @genkit-ai/next
```
No borres `zod` (se usa en fases posteriores) ni `tailwindcss-animate` (se usa en `tailwind.config.ts`). Si `depcheck` marca algo de esta lista como usado, avisame antes de desinstalarlo.

Borrá también `src/lib/firebase.ts` si es un stub sin lógica real.

**Verificación de Fase 2:** build de producción (`npm run build`) sin errores, y grepear el build de salida por el dominio del webhook de n8n para confirmar que ya no aparece en el JS que llega al navegador.

## FASE 3 — Base de datos y sesiones (después de Fase 2)

**3.1 — Tablas nuevas en Supabase**, con RLS activado en las tres:
```sql
chat_sessions (
  id uuid primary key default gen_random_uuid(),
  session_key text unique not null,  -- 'web:<token>' o 'wa:<telefono>'
  canal text not null,
  telefono text,
  nombre text,
  is_paused boolean default false,
  resume_at timestamptz,
  created_at timestamptz default now()
);

chat_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references chat_sessions(id),
  rol text not null,  -- 'user' | 'assistant'
  contenido text not null,
  tokens_in int,
  tokens_out int,
  created_at timestamptz default now()
);

chat_prospects (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references chat_sessions(id),
  nombre text,
  producto text,
  para_quien text,
  ocasion text,
  urgencia text,
  canal text,
  notas text,
  created_at timestamptz default now()
);
```
Agregá un índice en `chat_sessions(telefono)` — permite unificar el hilo de conversación cuando un cliente arranca en la web y después deja su WhatsApp.

Si existe una tabla `chat_handoff`, migrá sus datos a `chat_sessions` y después dejala de usar (no hace falta borrarla todavía).

**3.2 — Retirar `messageStore`.**
`src/lib/messageStore.ts` es un `Map` en memoria del proceso Node — se pierde en cada reinicio, no funciona con más de una instancia corriendo, y no tiene límite de tamaño (es alimentable sin autenticación desde `/api/webhook`, causa directa de los 503 por memoria documentados en el runbook).
- Reemplazá su uso por lecturas/escrituras a `chat_messages` en Supabase.
- Borrá `src/lib/messageStore.ts` cuando no quede ningún import.

**Verificación de Fase 3:** reiniciar el servidor a mitad de una conversación de prueba — el historial debe sobrevivir, leído desde Supabase.

## FASE 4 — Endurecimiento (puede ir en paralelo a las anteriores, hacela al final si tenés que priorizar)

**5.1 — Recuperar las barreras del build.**
`next.config.ts` tiene `typescript.ignoreBuildErrors: true` y `eslint.ignoreDuringBuilds: true`. Además `eslint` ni siquiera está en `devDependencies`, así que `npm run lint` ni corre.
- `npm i -D eslint eslint-config-next` y creá `eslint.config.mjs` extendiendo `next/core-web-vitals`.
- Agregá el script `"typecheck": "tsc --noEmit"` a `package.json`.
- Corré `npx tsc --noEmit` primero para ver cuántos errores hay antes de decidir el esfuerzo — esperá varios por uso de `any` y por los `params` de rutas dinámicas de Next 15, que ahora son `Promise` y no objetos planos.
- Una vez corregidos, poné `ignoreBuildErrors: false`. **Nunca dejes eso en `true` en un proyecto en producción.**
- Podés dejar `ignoreDuringBuilds: true` para ESLint únicamente si te bloquea el deploy mientras corregís incidencias, pero no para TypeScript.

**5.2 — Validación y límites.**
- Agregá `zod` con `safeParse` a las rutas de API que reciben body o query params (ya está instalado, hoy sin un solo uso).
- En cualquier parámetro `per_page` que se reenvíe a WooCommerce, acotalo con `z.coerce.number().int().min(1).max(100)` — hoy un `per_page=99999` se reenvía tal cual.
- Si existe `/api/virtual-tryon`, limitá el tamaño de `photoDataUri` y validá que empiece con `data:image/`.
- Agregá rate limiting básico en `src/middleware.ts` para rutas bajo `/api/*`: algo como 10 requests/min para las rutas de chat y 3 cada 5 min para virtual-tryon. Si no hay una librería de rate limit instalada, usá un enfoque simple en memoria con ventana deslizante (aceptable como primera capa; no reemplaza un rate limit real a nivel de infraestructura).

**5.3 — Cabeceras de seguridad.**
`src/middleware.ts` hoy solo maneja modo mantenimiento, no agrega ninguna cabecera de seguridad.
- Agregá un bloque `async headers()` en `next.config.ts` con al menos: `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, y un CSP básico (tiene que permitir `cdn.jsdelivr.net` mientras el widget de n8n del punto 2.2 siga en el layout).
- Si hay una respuesta 503 de mantenimiento, agregale `Retry-After` y `Cache-Control: no-store`.

**5.4 — Rendimiento de imágenes.**
`next.config.ts` tiene `images.unoptimized: true` en un sitio donde las fotos de producto son el contenido principal — sin WebP/AVIF ni resize responsive. Si el hosting soporta `sharp`, quitá ese flag. Si no lo soporta, configurá un loader de imágenes externo en vez de desactivar la optimización por completo.

**Verificación final:** `npx tsc --noEmit` sin errores, `npm run build` exitoso, y probar el flujo completo de compra de punta a punta en un ambiente de staging antes de deployar a producción.

---

Reportame al final de cada fase qué se hizo y qué quedó pendiente o requirió una decisión mía, antes de arrancar la fase siguiente.
