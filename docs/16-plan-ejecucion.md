---
titulo: Plan de ejecución — de la auditoría al código
fecha: 2026-08-17
fuente: 13-plan-maestro.md (que consolida 11-identidad-premium.md + 12-deuda-tecnica.md)
uso: Mismo formato que 08-auditoria-post-lovable.md/PROMPT-LOVABLE.md — podés pegar la sección "PROMPT" tal cual en Lovable/Antigravity, o pedirme a mí que ejecute fase por fase con el mismo método de verificación de build que usé en la ronda de seguridad (docs 09-10).
---

# Antes de arrancar — 3 cosas que definen el orden

1. **No es un problema de diseño, es un embudo roto.** El sitio capta leads y los pierde en el camino: el chat no manda los datos a ningún lado, el botón "Consultar" saca gente del sitio, y Alma manda a la gente al barrio equivocado. Eso va primero — antes que cualquier token de color.
2. **Los quick-wins de las dos auditorías se ejecutan juntos, no en dos rondas separadas.** Muchos tocan el mismo archivo (`chat-widget.tsx` aparece en fixes visuales y funcionales). Reordené el "Orden de ejecución sugerido" del doc 11 y el "Top 10" del doc 12 en un solo cronograma sin duplicar trabajo.
3. **Fase 0 no es código — es 5 minutos de verificación en el servidor real** que ninguna auditoría pudo hacer desde acá (no tengo acceso al servidor de producción ni al repo git real). Sin esto, el resto del plan puede estar optimizando algo que ya está roto por otra causa.

Diez fases. Cada una es verificable antes de pasar a la siguiente. Esfuerzo total estimado: **F0-F4 es 2-3 días; F5 (Alma con tool calling) es el trabajo grande, 1 semana; F6 es backlog, no bloquea nada.**

---

# FASE 0 — Verificar antes de tocar código (5 min, hacela vos, no Lovable)

Estas tres cosas ninguna auditoría pudo confirmar por trabajar sobre una copia empaquetada, no el servidor real:

1. **`ls public/videos`** en el servidor real. Si no existe, las 3 tarjetas de "Piezas Destacadas" del home muestran video negro vacío — es lo primero que ve un visitante después del hero. (doc 12, hallazgo 🟠-15)
2. **`git check-ignore .env.local`** en el repo real. Si no hay `.gitignore` y `.env.local` (con la `SUPABASE_SERVICE_ROLE_KEY`) se commiteó alguna vez, hay que **rotar esa key ya** — bypassea el RLS que se cerró en la ronda anterior. (doc 12, hallazgo 🟠-16)
3. **Confirmar que ya aplicaste** la migración `20260815020000_fix_chat_rls_security.sql` y agregaste `SUPABASE_SERVICE_ROLE_KEY` al entorno de producción (pendiente del doc 09/10 — sin la key, las 4 rutas de chat tiran 500).

Si `public/` falta o el `.gitignore` no existe, resolvé eso antes de seguir. No es código de mejora, es una bomba de tiempo.

---

# PROMPT — pegar desde acá en Lovable / Antigravity

Estás trabajando sobre un proyecto Next.js 15.5.9 (App Router, TypeScript, Tailwind, shadcn/ui) de e-commerce de joyería de lujo en Montevideo. La seguridad crítica ya está resuelta (RLS cerrado, settings server-only, rate limiting). Lo que queda es: un embudo de captación de leads que no funciona, una identidad visual de "template bien vestido" en vez de boutique premium, y deuda técnica acumulada. Vas a ejecutar 6 fases en orden estricto, cada una verificable antes de pasar a la siguiente. No inventes features nuevas — el objetivo es que lo que el sitio promete, lo cumpla.

## FASE 1 — El embudo roto (hacer primero, es lo que más plata cuesta por día que pasa)

**1.1 — Los leads del chat nunca llegan al negocio.**
`src/components/chat-widget.tsx` pide nombre y WhatsApp antes de dejar escribir ("Para poder asesorarte mejor...") y ese dato se guarda solo en `localStorage` (líneas 197-199, 213-215). `processMessage` postea solo `{message, history}` — ningún endpoint recibe nombre ni teléfono. La tabla `prospectos` existe en Supabase y está vacía.
- Cuando el usuario completa el onboarding, hacé `POST` a `/api/chat-session` con `{ name, phone }` validado por zod.
- Guardalo en la tabla `prospectos` (ya existe, no crees una nueva — no uses `chat_prospects`, que no existe).
- Esto se llama tanto al completar el onboarding del chat como al enviar los 3 formularios del footer (suscripción, guía de tallas, agendar cita), que hoy abren WhatsApp y no persisten nada.

**1.2 — El chat duplica cada mensaje en pantalla.**
`chat-widget.tsx:176` genera el id local con `Math.random().toString(36)`; el id que vuelve de `/api/messages` es un UUID de Postgres (`api/messages/route.ts:26`). El dedupe compara por id y nunca matchea → cada mensaje aparece dos veces a los ≤3 segundos.
- Elegí una sola fuente de verdad: o sacás el polling y renderizás solo lo que devuelve `/api/chat`, o `/api/messages` acepta `?since=<timestamp>` y el widget dedupea por `(role, content, timestamp)` además de por id.

**1.3 — Alma se queda con los 10 mensajes MÁS VIEJOS de la conversación.**
`src/app/api/chat/route.ts:43-48`:
```ts
.order('created_at', { ascending: true })   // ← más viejo primero
.limit(10);                                  // ← corta los 10 primeros
```
A partir del mensaje 11, Alma queda congelada en el arranque de la charla y repregunta lo mismo.
- Cambiar a `.order('created_at', { ascending: false }).limit(10)` y `.reverse()` en JS. Subir el límite a 20 si es fácil.

**1.4 — El botón "Consultar" del home saca a la gente del sitio, hacia el número equivocado.**
`src/app/page.tsx:119-132` busca `#n8n-chat` / `window.n8nChat`, que ya no existen (se borraron en la ronda de Lovable). La condición nunca se cumple → siempre cae al `else` y abre `wa.me/59891264956`, que no es `appSettings.whatsAppNumber` (`59895435644`).
- Reemplazar todo el `onClick` por `window.dispatchEvent(new CustomEvent('open-chat-with-message', { detail: { message: msg } }))` — es el evento que `chat-widget.tsx:130` sí escucha.
- Centralizar el número de WhatsApp: hoy vive en `settings.ts:10` (`59895435644`) Y en `lib/whatsapp.ts:22` (`59891264956`), dos valores distintos. Uno de los dos es el correcto — confirmá cuál con el dueño del negocio y dejá un solo lugar de verdad (`appSettings.whatsAppNumber`), que todos los demás archivos lean de ahí.

**1.5 — Conectar (o borrar) el flujo "consultar este producto por chat".**
`chat-widget.tsx:79-114` escucha `open-chat-with-message`, pero nadie lo dispara hoy (el único emisor sería 1.4, recién conectado). ~35 líneas muertas: la tarjeta de producto con precio y SKU dentro del chat, el onboarding inline, `pendingText`.
- Ya con 1.4 resuelto, esto queda conectado solo. Verificá que la tarjeta de producto se vea bien al hacer clic en "Consultar" desde una colección destacada.

**1.6 — Alma manda a la gente al barrio equivocado.**
`src/app/api/chat/route.ts:68` (system prompt) dice "visitar la boutique en Carrasco". La boutique real está en **Mercedes 1211**, que es lo que dice `contact/page.tsx:42`. El home también dice "en el corazón de Carrasco" (`page.tsx:61`). El footer tiene dos juegos de constantes de mapa: `GOOGLE_MAPS_EMBED_URL`/`EMBED_PLACE_URL` (Carrasco, muertas, no se usan) y `EMBED_SEARCH_URL`/`GOOGLE_MAPS_SEARCH_URL` (Mercedes 1211, sí se usan).
- Definir la dirección real en `appSettings` (es pública) e inyectarla en el system prompt de Alma en vez de hardcodearla. Corregir el copy del home. Borrar las constantes de mapa de Carrasco.

**1.7 — `localStorage` corrupto deja el chat muerto para siempre en ese navegador.**
`chat-widget.tsx:73-77` hace `JSON.parse(saved)` sin try/catch, **antes** de registrar los listeners de eventos (línea 130+). Si el parse tira, el botón de WhatsApp deja de abrir el chat, sin error visible, permanentemente.
- Envolver el parse en try/catch con `localStorage.removeItem` en el catch. Mover el registro de los listeners **antes** del parse.

**Verificación de Fase 1:**
- Abrir el chat, completar el onboarding con nombre/teléfono de prueba → confirmar que aparece una fila en `prospectos` en Supabase.
- Mandar 3 mensajes seguidos → cada uno debe aparecer una sola vez.
- Mandar 12 mensajes en una conversación → Alma debe seguir teniendo contexto del mensaje 11 y 12, no repreguntar lo del inicio.
- Clic en "Consultar" desde el home → debe abrir el chat propio con el mensaje precargado, no WhatsApp.
- Preguntarle a Alma la dirección de la tienda → debe decir Mercedes 1211.

---

## FASE 2 — Cerrar las vías de falla silenciosa (después de Fase 1)

Son 6 fixes chicos, todos esfuerzo S, que hoy fallan sin avisar a nadie.

**2.1 — El checkout puede redirigir a `/undefined`.**
`buy-button.tsx:88-90` hace `window.location.href = result.redirect_url` sin validar que exista. Si n8n cambia el shape de la respuesta, el usuario ve "¡Redirigiendo a Mercado Pago!" y termina en un 404 — venta perdida, sin log.
- Agregar `if (!result?.redirect_url) throw new Error('El proveedor de pago no devolvió un link válido')` antes del toast de éxito.

**2.2 — El checkout puede cobrar el precio de oferta con la oferta vencida.**
`api/checkout/route.ts:39` toma `sale_price` sin mirar fechas de vigencia; `lib/mappers.ts:67-84` sí las valida (`isSaleActive`), pero el checkout no la usa. Riesgo real: cobrar de menos y no enterarse hasta conciliar.
- Exportar `isSaleActive` desde `mappers.ts` y usarla en el checkout, o mejor: llamar `mapWooCommerceProduct(product)` ahí y usar `product.price.usd` como única fuente del precio.

**2.3 — Los formularios del footer rompen el lead si hay `+` o `&` en los datos.**
`footer.tsx:50-51` (y 57-58, 66-67) interpola el mensaje de WhatsApp sin `encodeURIComponent`. Un teléfono con `+598...` o un nombre con "Ana & Luis" corta o corrompe el mensaje.
- `encodeURIComponent(message)` en los tres formularios (los otros puntos del sitio ya lo hacen bien).

**2.4 — `/api/virtual-tryon` sin límite de tamaño y filtra errores internos.**
`api/virtual-tryon/route.ts:3,9,27` — sin zod, sin límite de tamaño de `photoDataUri` (un POST de 80MB se parsea entero en memoria), y `error.message` se devuelve crudo al cliente (puede filtrar la URL interna de n8n).
- zod: `photoDataUri: z.string().max(~7_000_000)` con regex `data:image/(jpeg|png);base64,`; `enum` para `jewelryType`; mensaje de error genérico al cliente.
- Es una foto de un rostro identificable mandada a un tercero — agregar una línea de aviso de privacidad en el modal (`virtual-try-on.tsx:78-85`).

**2.5 — Inserts de chat en Supabase son fire-and-forget.**
`api/chat/route.ts:53-57` y `:100-104` no leen `{ error }` del insert (compará con la línea 50, que sí hace `if (historyError) throw`). Si el insert falla (sesión con cookie apuntando a un UUID que ya no existe, por ejemplo), Alma responde igual pero nada se guarda — para siempre en ese navegador.
- Chequear `{ error }` en ambos inserts y loguearlo. En `/api/chat-session`, si hay cookie, verificar con un `select id` que la sesión exista antes de darla por buena; si no existe, crear una nueva y resetear la cookie.

**2.6 — `catch` vacíos que esconden fallas reales.**
`chat-widget.tsx:162` (polling falla en silencio para siempre) y `services/productService.ts:22-24` (`if (!response.ok) return []` — un 502 de WooCommerce se ve igual que "no hay productos en esta categoría", nadie se entera de que Woo está caído).
- El de `productService` es el que más importa: devolver `{ products, error }` y mostrar un estado de error real en `/collections` en vez de "no se encontraron piezas".

**2.7 — `ignoreBuildErrors` sigue en `true`, y ESLint no está instalado.**
`next.config.ts:7-14`. `npx tsc --noEmit` ya da 0 errores hoy, así que poner `ignoreBuildErrors: false` es gratis. El script `"lint": "next lint"` no puede correr porque `eslint` no está en `devDependencies`.
- `ignoreBuildErrors: false` ya.
- `npm i -D eslint eslint-config-next`, correrlo una vez para ver el tamaño del problema antes de flipear `ignoreDuringBuilds`.

**Verificación de Fase 2:** `npx tsc --noEmit` y `npm run build` sin errores nuevos. Probar un checkout completo de punta a punta en staging.

---

## FASE 3 — Sistema de diseño (después de Fase 2, no antes — sobre una base funcional)

Reemplazo completo de tokens, ya escrito y listo para pegar en `11-identidad-premium.md` (secciones 3.1 `globals.css`, 3.2 `tailwind.config.ts`, 3.3 `button.tsx`). Resumen de lo que hay que hacer, en este orden:

**3.1 — `globals.css` completo.** Pegar el bloque de tokens HSL de la sección 3.1 del doc 11. Resuelve de una: `--ring` idéntico a `--primary` (foco invisible en todos los botones dorados), solo 2 escalones de gris, sin escala de sombra/radio/duración/espaciado, sin `prefers-reduced-motion`.

**3.2 — `tailwind.config.ts` completo.** Pegar el bloque de la sección 3.2 del doc 11. Agrega `fontSize`, `boxShadow`, `transitionDuration`, `aspectRatio` propios — hoy se usan overrides arbitrarios (`text-[8px]`, `text-[10px]`) por no tener escala.

**3.3 — `button.tsx` — reemplazar el `cva`.** Pegar el bloque de la sección 3.3 del doc 11. Variantes: `default` (tinta sólida, reemplaza el gradiente dorado de `buy-button.tsx:120`), `outline`, `gold` (solo para acciones de marca, nunca para precio ni texto de lectura), `link`, `payment` (`#009ee3`, única excepción cromática — es Mercado Pago).

**3.4 — Barrido de color (la regla: el oro es metal, no texto).**
- Precio: `text-primary` (dorado, contraste 1.82:1 — falla WCAG por mucho) → `.price` (tinta, `#14120D` sobre `#FAF8F4` = 17.6:1). 4 lugares: `products/[id]/page.tsx:66`, `collections/page.tsx:158`, `product-card.tsx:72`, `page.tsx:112`.
- 7 × `#d4af37` hardcodeado en `chat-widget.tsx` (líneas 283,285,387,388,402-405,420) → tokens. Header del chat con texto blanco sobre `#d4af37` es 1.94:1.
- `#080b12` en `page.tsx:187` (reviews section) → `bg-foreground`. Hoy hay dos negros distintos en el sitio.
- Badges de stock: `green-600`/`green-100` (3.00:1) y `orange-600`/`orange-100` (3.11:1) → `--sage` y `--warning` de la nueva paleta.
- Botones de WhatsApp: `green-600` sobre blanco (3.30:1) → revisar contra los nuevos tokens.
- `reviews-carousel.tsx` usa `var(--font-headline)` y `var(--gold, #d4a843)`, **ninguna de las dos existe** → toda la sección renderiza en Times New Roman del sistema. Esto ya se resuelve solo con 3.1, pero confirmalo visualmente.

**3.5 — Accesibilidad de foco y teclado.**
- `--ring` ya queda resuelto por 3.1, pero verificar visualmente que el anillo de foco se vea sobre los botones dorados.
- `<button>` crudos sin estilo de foco: `footer.tsx:178,179,185,248,306,371`, `chat-widget.tsx:313,502`, `reviews-carousel.tsx:540,541`.
- Dots del carrusel de reseñas (`reviews-carousel.tsx:531-537`) son `<div onClick>` de 8×2px, no enfocables, sin `role` ni `aria-label`. Cambiar a `<button aria-label="Ir a la reseña N" aria-current={...}>` de al menos 24×24px (WCAG 2.5.8).
- Los 3 modales artesanales del footer (líneas 228, 284, 349) no tienen focus-trap, no cierran con `Escape`, sin `role="dialog"`. Migrar a `<Dialog>` de shadcn resuelve las cuatro cosas de una sola vez.
- `layout.tsx` sin skip-link ni `<main id>` — agregar `<a href="#main" className="sr-only focus:not-sr-only">Saltar al contenido</a>`.

**3.6 — Movimiento.**
Agregar el bloque `@media (prefers-reduced-motion: reduce)` de la sección 3.1 del doc 11. Afecta: 4 `<video autoPlay loop>`, `animate-ping` permanente en el botón de WhatsApp, `animate-bounce`, `animate-pulse` en el badge de oferta, el ticker de TradingView.

**Verificación de Fase 3:** correr un contraste-checker (o la fórmula WCAG) sobre precio, badges de stock y botones de WhatsApp — los 13 fallos listados en doc 11 §5.1 deben quedar en AA. Navegar el sitio entero solo con teclado (Tab/Shift+Tab/Enter/Escape) y confirmar que el foco siempre es visible.

---

## FASE 4 — Consistencia y limpieza (después de Fase 3)

**4.1 — Ratios y contenedores unificados.** 4 aspect ratios distintos para fotos de producto (4/3, 3/4, 4/5, 3/4) y 5 anchos de contenedor entre páginas. Adoptar `4/5` como ratio único y un solo `.container-boutique` con `--section-y`/`--header-h` como CSS vars, consumidas por las 5 páginas en vez de paddings hardcodeados por página (`pt-20`, `pt-24 md:pt-32`, etc.).

**4.2 — `product-card.tsx` duplicado.** Está definido y nunca importado — `collections/page.tsx:122-172` tiene su propia tarjeta inline con otro ratio y otro layout. Elegir uno, borrar el otro, usarlo en home + colecciones + relacionados.

**4.3 — Video institucional fuera del CDN de Temu.** `page.tsx:156` sirve el video de "El arte de la orfebrería" desde `goods-vod.kwcdn.com`. Autohospedar en `/videos/` como los otros tres (una vez confirmado en F0 que `public/videos` existe o se recreó).

**4.4 — Autohostear las fuentes.** `layout.tsx:3` importa `Manrope`/`Playfair_Display` de `next/font/google`, que descarga en tiempo de build. Cualquier entorno de deploy sin salida a `fonts.googleapis.com` rompe el build entero (ya pasó una vez en el sandbox de esta auditoría). Migrar a `next/font/local` con los `.woff2` en `public/fonts/`.

**4.5 — Borrar código muerto confirmado (0 importadores por grep):**
```
src/lib/supabase.ts                      # apunta al proyecto Supabase VIEJO (lgdhnkfxberjzctgywiz), tipos de un Kanban que no existe
src/integrations/supabase/client.ts      # cliente con anon key, ya no puede leer/escribir chat_* desde el fix de RLS
src/lib/firebase.ts                      # inerte, firebase ya se sacó de package.json
src/components/product-card.tsx          # ver 4.2 — borrar el que no se elija
src/ai/dev.ts
src/ai/flows/virtual-try-on.ts           # segunda implementación del probador virtual, nunca ejecutada (la viva es vía n8n)
```
Y a nivel símbolo dentro de archivos vivos: `sessionId`/`setSessionId` (chat-widget.tsx:40, muerto), `showDebug` y el panel de debug completo (~35 líneas, chat-widget.tsx:307-342, nunca se activa), `alma_product_context` (se escribe y nunca se lee), uno de los dos indicadores de "escribiendo..." duplicados (líneas 401-407 y 463-469), `GOOGLE_MAPS_EMBED_URL`/`EMBED_PLACE_URL` en footer.tsx (Carrasco, ver 1.6).

Nota: `ui/chart.tsx` (arrastra `recharts`) y `ui/calendar.tsx` (arrastra `react-day-picker`) son los dos componentes shadcn sin uso que más pesan — sacarlos con sus dependencias. El resto de los 22 componentes `ui/` sin importador es scaffolding estándar; dejarlos es una decisión de criterio, no de riesgo.

**4.6 — Índice y purga en la tabla de mensajes.** No hay índice sobre `chat_messages(session_id, created_at)`. Cada poll (1 cada 3s por widget abierto) escanea sin índice, y `/api/messages` devuelve la conversación entera sin `?since=`.
```sql
CREATE INDEX ON public.chat_messages (session_id, created_at);
```
Agregar el parámetro `?since=` (ya contemplado en 1.2) y, a mediano plazo, un job de purga a 90 días — son datos personales acumulándose sin política de retención.

**Verificación de Fase 4:** build limpio, grep de `goods-vod.kwcdn.com` y `lgdhnkfxberjzctgywiz` sobre todo `src/` → cero resultados.

---

## FASE 5 — Alma con tool calling (el trabajo de más valor, hacerlo con calma)

`/api/chat` hoy manda un system prompt de 12 líneas a `gpt-4o-mini` sin acceso al catálogo — cuando preguntan "¿cuánto sale la alianza de oro 18k?", inventa un número plausible. El prompt incluso empuja a inventar ("Si te preguntan por precios, usa siempre USD"). **Es el mismo problema que tenía el agente viejo de n8n, movido de lugar, no resuelto.**

- Definir `tools` en el request a OpenAI: `buscar_productos` (por nombre/categoría) y `ver_producto` (por id), ambas llamando a `fetchWooCommerce` (ya existe en `lib/woocommerce.ts`, no la reescribas).
- Loop de tool calls: si el modelo pide una tool, ejecutarla, devolver el resultado, dejar que el modelo responda con datos reales.
- Instrucción explícita en el prompt: "si no encontrás el producto o no tenés el precio, decí que no lo tenés — nunca inventes un número."
- Mientras estás ahí: corregir la mezcla de voseo/usted de Alma dentro de un mismo mensaje (ej. "¿en qué pieza puedo asistirle?" + "para poder asesorarte mejor" en la misma charla) — el resto del sitio mezcla los dos registros pero de forma deliberada por sección, Alma es la única que los mezcla en el mismo mensaje.

**Verificación de Fase 5:** preguntarle a Alma el precio de 3 productos reales del catálogo → debe responder con el precio real de WooCommerce, no inventado. Preguntarle por un producto que no existe → debe decir que no lo tiene, no inventar uno.

---

## FASE 6 — Backlog (no bloquea nada, priorizar después de F0-F5)

No son urgentes pero quedan anotados para no perderlos:

- **`/collections` a Server Component con paginación** (doc 12, 🔵-24): hoy es 100% cliente, invisible para Google, y muestra máximo 20 productos sin forma de ver el resto. Esfuerzo L — el trabajo más grande de la lista, el que más mueve la aguja comercial a mediano plazo.
- **Dos páginas legales** (`footer.tsx:220-221` apuntan a `href="#"`): Política de Privacidad y Términos. Para un sitio que junta nombre, teléfono, email, fotos de la cara (probador virtual) y cobra con Mercado Pago, no es cosmético.
- **Buscador y favoritos**: íconos en el header sin `onClick` ni `href`. La API ya soporta `?search=` — el buscador es media hora. Favoritos es un feature completo, evaluar si vale la pena.
- **`Content-Security-Policy`**: falta en `middleware.ts`. Requiere inventariar los orígenes externos ya en uso (TradingView, CDN de video, imgur de reviews) antes de poder escribirla.
- **Handoff a humano**: existe `/api/webhook` (recibe mensajes HMAC-firmados) y el polling que los mostraría, pero nada dispara el escalamiento — no hay botón "hablar con una persona" ni tool que lo detone.
- **Post-compra**: `/checkout/success` dice "¡Pago Exitoso!" incondicionalmente, sin verificar nada contra Mercado Pago. Cualquiera que escriba la URL ve "pago exitoso".
- **`price.uyu` miente** (`mappers.ts:112-115`): devuelve el mismo número que `price.usd`. Hoy no se ve porque nada renderiza `.uyu`, pero el primer que lo use publica un anillo de USD 900 a "$U 900".
- **Probador virtual**: sin consentimiento explícito para mandar una foto de la cara a un tercero, y clasifica mal (una pulsera se prueba como collar).
- **`/recommendations`**: ruta huérfana (no enlazada desde ningún lado) que le pega a Gemini sin rate limit y sin conexión al catálogo real — inventa joyas igual que Alma inventaba precios. Decidir: borrarla o conectarla de verdad.

---

Reportame al final de cada fase qué se hizo, qué quedó pendiente, y qué requirió una decisión tuya (el número de WhatsApp correcto en 1.4, por ejemplo) antes de arrancar la fase siguiente. No saltees el orden — F3 sobre un embudo roto es pintar un auto que no arranca.
