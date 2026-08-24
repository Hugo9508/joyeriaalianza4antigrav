---
titulo: Correcciones aplicadas — Fases 1 a 5 del plan de ejecución (doc 16)
fecha: 2026-08-17
estado: Escrito directamente en C:\Users\it\Documents\Playground\JA SITE\joyeriawp-main vía device bridge. Cada fase se verificó con npx tsc --noEmit + npm run build (sandbox aislado, sin salida a fonts.googleapis.com — se usa un layout.tsx sin fuentes sólo para el build de prueba y se restaura el real antes de escribir al dispositivo) antes de escribir un solo archivo al proyecto real.
fuente: 16-plan-ejecucion.md
---

# Qué se aplicó

Mismo método que en la ronda de seguridad (docs 09-10): sandbox aislado, `tsc --noEmit` limpio, `npm run build` exitoso, recién ahí se escribe al dispositivo real vía device bridge. Fase por fase, sin saltar verificación.

## Fase 0 — Verificación previa
`public/videos` existe, `.gitignore` excluye `.env.local` correctamente. Verificado contra el dispositivo real, no asumido.

## Fase 1 — El embudo roto
- **Leads del chat ahora se guardan.** Nuevo endpoint `POST /api/leads` (zod-validado) que inserta en `prospectos`. Antes el nombre/WhatsApp del onboarding del chat quedaban sólo en `localStorage` del visitante — cero leads llegaban a la joyería.
- **Dedupe de mensajes en el chat** reescrito: antes comparaba ids (locales `Math.random()` vs. UUIDs del server, nunca coincidían) y duplicaba cada mensaje en pantalla. Ahora dedupea por (rol, texto, ventana de 15s) e ignora todo lo anterior a la apertura del chat.
- **Historial de Alma** corregido: pedía los 10 mensajes más viejos (`ascending: true, limit(10)`) en vez de los 10 más recientes — a partir del mensaje 11 Alma perdía el contexto de la charla actual. Ahora trae los últimos 10 en orden cronológico correcto.
- **Botón "Consultar"** del home ya no busca el widget viejo de `@n8n/chat` (borrado hace dos rondas) — abre el chat propio vía `CustomEvent`.
- **Dirección real**: Alma y el copy del home decían "Carrasco"; la boutique está en Mercedes 1211, Montevideo. Corregido en `settings.ts`, el system prompt de Alma y el hero del home.
- **`localStorage` corrupto** ya no rompe el chat permanentemente: lecturas envueltas en try/catch con limpieza automática si el JSON es inválido.
- Número de WhatsApp centralizado en `appSettings.whatsAppNumber` (antes hardcodeado, con un número distinto al oficial en un lugar del código — **queda pendiente que confirmes cuál es el correcto**, ver sección "Pendientes").

## Fase 2 — Vías de falla silenciosa
- `redirect_url` del checkout validado antes de redirigir (antes podía mandar a `/undefined`).
- Precio de oferta ahora respeta la ventana de fechas (`isSaleActive`) en vez de confiar ciegamente en `sale_price`.
- `/api/virtual-tryon` reescrito con zod (tamaño de imagen, formato, tipo de joya — corregido un mismatch real: el frontend manda `'earrings'` plural, el schema viejo hubiera rechazado todo).
- Errores de inserción en Supabase ahora se loguean (antes fallaban en silencio).
- Catches vacíos rellenados con manejo real o comentario explícito.
- `next.config.ts`: `typescript.ignoreBuildErrors` pasó de `true` a `false`. `eslint.ignoreDuringBuilds` queda en `true` a propósito — hay 32 errores/16 warnings preexistentes (mayormente `no-explicit-any`) que no se tocaron por estar fuera del alcance de esta ronda; ver "Pendientes".
- Se agregó `eslint.config.mjs` + `eslint`/`eslint-config-next@15.5.9` a `package.json` (antes ESLint no estaba instalado).

## Fase 3 — Sistema de diseño
Tokens de color nuevos en `globals.css`/`tailwind.config.ts` calibrados contra WCAG AA (antes 13 fallas de contraste documentadas en el doc 11, incluyendo el precio en dorado sobre claro a 1.82:1). `button.tsx` reescrito con las variantes del doc 11. Barrido de color aplicado en: precio de producto y colecciones, header y burbujas del chat, botón de WhatsApp flotante, badges de stock, footer (botones verdes → tinta del sitio), `--gold` corregido en `reviews-carousel.tsx` (usaba `var(--gold, #d4a843)` crudo — el nuevo token es HSL y necesita `hsl(var(--gold))`). Se sacó el segundo indicador de "escribiendo..." duplicado del chat.

**Quedó afuera a propósito** (no son bugs, son cambios visuales más grandes que necesitan revisión página por página, no sólo grep): `header.tsx`, `ticker-tape.tsx`, accesibilidad completa del carrusel de reseñas, migración de los modales del footer a `<Dialog>`, `contact/page.tsx`, galería de imágenes de producto.

## Fase 4 — Consistencia y limpieza
- Panel de debug muerto completo borrado de `chat-widget.tsx` (nunca se activaba — el único botón que tocaba el estado lo cerraba, no lo abría).
- `GET /api/messages` acepta `?since=<epoch ms>`; el polling del widget (cada 3s mientras el chat está abierto) ya no trae la conversación entera en cada tick.
- `product-card.tsx` (0 importadores, duplicado con la tarjeta inline de `collections/page.tsx`), `ui/chart.tsx` y `ui/calendar.tsx` (sin uso) borrados junto con sus dependencias `recharts`/`react-day-picker` en `package.json`.

**Quedó afuera** — necesita asset o acceso que este entorno no tiene:
- **4.1 Ratios y contenedores unificados** — 4 aspect ratios distintos y 5 anchos de contenedor entre páginas. No se tocó: es un cambio visual transversal a 5 páginas sin herramienta de QA visual disponible acá: alto riesgo de romper layout sin poder verlo.
- **4.3 Video institucional** sigue sirviéndose desde `goods-vod.kwcdn.com` (CDN de Temu) — el sandbox no tiene salida de red a ese dominio para descargarlo y autohospedarlo en `/videos/`.
- **4.4 Fuentes autohospedadas** — mismo problema: sin salida a `fonts.gstatic.com` desde el sandbox para bajar los `.woff2`.
- **4.6 Índice SQL** en `chat_messages(session_id, created_at)` — no se aplicó, no hay acceso de escritura al proyecto Supabase real desde acá. Sentencia lista más abajo, en "Pendientes de tu lado".

## Fase 5 — Alma con tool calling real
`/api/chat` ahora define dos tools de OpenAI (`buscar_productos`, `ver_producto`) que llaman a WooCommerce real (`fetchWooCommerce`, sin reescribir la integración) antes de que Alma hable de precio, material o stock. Loop de hasta 4 vueltas de tool-calling. El system prompt ahora instruye explícitamente: si la herramienta no encuentra el dato, decirlo — nunca inventar un número. También se corrigió la mezcla de voseo/usted dentro de un mismo mensaje.

---

# Pendientes de tu lado

Esto no lo puedo hacer desde acá (sin `device_bash` esta sesión, y sin acceso de escritura al Supabase real del proyecto):

1. **Borrar manualmente** (0 importadores confirmado por grep): `src/lib/supabase.ts`, `src/integrations/supabase/client.ts`, `src/lib/firebase.ts`, `src/components/product-card.tsx`, `src/ai/dev.ts`, `src/ai/flows/virtual-try-on.ts`.
2. **Correr el índice SQL de 4.6** contra el proyecto Supabase real: `CREATE INDEX IF NOT EXISTS idx_chat_messages_session_created ON public.chat_messages (session_id, created_at);`
3. **Confirmar**: RLS + `SUPABASE_SERVICE_ROLE_KEY` aplicados en producción (doc 09); nombre real de las columnas de `prospectos` (el insert de `/api/leads` se armó a ciegas, sin acceso de lectura al schema real); cuál de los dos números de WhatsApp encontrados en el código es el correcto.
4. **`npm install`** local para sincronizar `eslint`/`eslint-config-next`, ahora en `package.json`.
5. **Fase 6** (backlog) y **4.1** (unificación de ratios/contenedores) quedan sin priorizar — no bloquean nada.

---

# Addendum — mejoras de interfaz y agente post-F5

Después de cerrar F1-F5, se encaró una segunda tanda con dos ejes elegidos por vos: interfaz (`header.tsx`/`ticker-tape.tsx` primero, después galería de producto y modales del footer) y agente (streaming primero, después la tool de agendar cita y rate limiting). Mismo método de verificación que el resto del documento.

## Interfaz

- **`header.tsx`**: se sacaron los botones de Buscar/Favoritos (sin `onClick` ni `href`, UI muerta — no hay buscador ni wishlist implementados); `shadow-sm` → `border-b border-border/60` (filete en vez de sombra de template); se sacó el `group-hover:hidden` del degradé del hero que hacía saltar el fondo al pasar el mouse; se sacó el estado `mounted` que no se usaba en ningún lado.
- **`icon.svg`** (favicon): el dorado `#c9a84c` y el azul marino `#1a2255` no existían en ningún otro lugar del sistema de color — ahora usa `--gold` (`#B08D57`) y `--foreground` (`#14120D`) reales.
- **`ticker-tape.tsx`**: el widget de TradingView pintaba su propio fondo azul `#131722`, ajeno a la marca. Ahora `isTransparent: true` en la config del widget + `bg-foreground` en el wrapper, así se ve la tinta del sitio detrás de los precios.
- **Galería de imágenes de producto** (`products/[id]/page.tsx`): antes una sola imagen estática. Nuevo componente `src/components/product-gallery.tsx` — miniaturas seleccionables (accesibles: `<button>` con `aria-label`/`aria-current`, no `<div>` con `onClick`) + zoom que sigue el cursor sobre la imagen principal.
- **Modales del footer** (mapa, guía de tallas, agendar cita): eran `<div>` fijos con `onClick` para cerrar — sin foco atrapado, sin cierre con ESC, sin `aria-*`. Migrados a `<Dialog>` de Radix (mismo primitivo que ya usaba el menú móvil vía `Sheet`), con `DialogTitle`/`DialogDescription` compartidos en un componente `DialogHeaderRow`. El bloqueo de scroll del `<body>` que antes se hacía a mano con un `useEffect` ahora lo maneja Radix automáticamente.

Quedó afuera (no elegido en esta tanda): unificación de ratios/contenedores (4.1), `contact/page.tsx`, accesibilidad completa de `reviews-carousel.tsx`. **Los tres se resolvieron después — ver "Corrección" al principio del Addendum 2 (4.1 parcial) y ahí mismo `contact/page.tsx` y `reviews-carousel.tsx`.**

## Agente (Alma)

- **Streaming**: `/api/chat` pasó de esperar la respuesta completa de OpenAI a transmitirla en vivo — protocolo NDJSON (una línea = un evento `delta`/`error`/`done`) sobre un `ReadableStream`. El loop de tool-calling de F5 sigue igual por dentro; sólo la vuelta final que produce texto visible se reenvía delta por delta. `chat-widget.tsx` arma un mensaje vacío en el primer delta y lo completa en vivo.

  **⚠️ Riesgo real, no verificado desde acá:** `07-adr-001-donde-vive-el-agente.md` (línea ~201) ya advertía sobre esto antes de que existiera este endpoint: *"SSE necesita que el proxy inverso no bufferee... si Hostinger bufferea, degrada exactamente al comportamiento que se quería eliminar"*. Esta implementación no es SSE clásico (es un `ReadableStream` de texto plano/NDJSON), pero el riesgo de buffering por el proxy inverso es el mismo. Si el sitio sigue en Hostinger shared, hay que confirmar en producción que el streaming efectivamente llega en vivo al navegador y no se buferea entero antes de salir — si se buferea, la función sigue andando bien (no rompe nada), pero no se nota ninguna mejora de percepción de velocidad.

- **`agendar_cita`** — tercera tool de Alma. El modelo la llama sólo después de pedirle nombre y WhatsApp al cliente (instrucción explícita en el prompt: no inventa ni confirma fecha/hora, sólo registra la solicitud). Inserta en `prospectos` con `canal: 'appointment'`, mismo formato que el modal del footer — mismo caveat de nombres de columna sin confirmar que el resto de los inserts a esa tabla.
- **Rate limiting** en `/api/chat`: antes no había techo. Limitador en memoria del proceso (20 mensajes/60s por sesión, 60/60s por IP) — se eligió en memoria y no Supabase/Redis porque el hosting actual es un único proceso Node persistente (no serverless), pero con poda periódica del mapa cada 5 minutos: `RUNBOOK.md` ya documenta que ese mismo proceso se cae por falta de memoria, así que no tenía sentido agregar un estado que crece sin límite.

Quedó afuera (no elegido en esta tanda): nada — se hicieron las dos mejoras de agente que se habían propuesto.

---

# Addendum 2 — backlog de doc 12 (deuda técnica), ronda "todo lo que sea codeo"

Tercera tanda: en vez de elegir ejes, la instrucción fue encarar todo lo que quedaba en el inventario de `12-deuda-tecnica.md` que fuera resoluble con código (sin assets externos ni acceso de escritura a Supabase). Mismo método de verificación (tsc por archivo, build completo con font-strip al final).

## Corrección: seis cambios de esta misma tanda que se habían entregado sin documentar

Antes de seguir, una autocorrección. Los seis ítems de abajo se codearon, se verificaron (`tsc` + build completo) y se entregaron al dispositivo real **en esta misma tanda**, pero al escribir este Addendum la primera vez se documentó solo lo que vino después del resumen de contexto — esto quedó afuera por error, no por decisión. Quedan registrados acá:

- **`src/app/contact/page.tsx`** — el Fase 3 y el Addendum 1 lo habían dejado afuera a propósito ("cambio visual más grande, necesita revisión página por página"); en esta tanda sí se tocó. Se centralizó el número de WhatsApp en `appSettings.whatsAppNumber` (había una **segunda** instancia hardcodeada de `59891264956` en este archivo — tres apariciones — que había sobrevivido a la limpieza original de doc 16, que solo había encontrado una en otro archivo; mismo caveat que la de línea 22: falta confirmar cuál de los dos números es el oficial). También: `text-green-500`/`text-pink-500` → `sage`/`primary` (tokens del sistema, no colores sueltos) para los botones de WhatsApp/Instagram, y se sacó `opacity-0 group-hover:opacity-100` de tres CTA — eso hacía que esos botones fueran invisibles hasta el hover, que en mobile no existe: el botón estaba ahí pero no se veía nunca.
- **`src/lib/products.ts` / `src/lib/mappers.ts`** — `Product['price']['uyu']` devolvía el mismo número que `usd`, como si fuera una conversión real (doc 16, backlog: "mentira silenciosa"). No hay fuente de tipo de cambio en este repo, así que inventar la conversión hubiera sido peor que no tenerla. Se cambió el tipo a `number | null` y el mapper ahora pone `null` explícito — TypeScript obliga a cualquier consumidor futuro a manejar el caso "no hay conversión real" en vez de confiar en un número fabricado. Hoy nada en la UI renderiza `price.uyu`, así que el cambio no tiene efecto visual — es una prevención, no un fix de algo roto en pantalla.
- **`src/app/checkout/success/page.tsx`** — antes decía "¡Pago Exitoso!" sin condición: cualquiera que escribiera esa URL a mano veía la confirmación, sin mirar `searchParams`. No hay token de Mercado Pago en este repo (el checkout pasa por un webhook de n8n, ver `src/app/api/checkout/route.ts`), así que no se puede validar el pago contra la API de MP desde acá — pero MP sí agrega `collection_status`/`status` y `payment_id`/`collection_id` como query params al redirigir de vuelta. La página ahora lee esos params (`searchParams` es `Promise` en Next 15, se `await`ea) y solo muestra "¡Pago Exitoso!" si `status === 'approved' && paymentId` está presente; si no, muestra una pantalla distinta ("No pudimos confirmar el pago") con un CTA a WhatsApp. Recorte de color de paso: la rama de éxito pasó de `green-*` a los tokens `sage` del sistema.
- **`src/app/privacidad/page.tsx`** y **`src/app/terminos/page.tsx`** (nuevas) — los dos links del footer que apuntaban a `href="#"` (doc 16, F6: "Dos páginas legales"). Para un sitio que junta nombre, teléfono, email y una foto de la cara (probador virtual con IA), y que cobra con Mercado Pago, esos dos `#` no eran cosméticos. Son **borradores**, con advertencia explícita en un comentario al tope de cada archivo: la de Privacidad está redactada contra lo que el código efectivamente hace (qué junta cada formulario, qué terceros procesan cada dato — Mercado Pago, OpenAI, el proveedor de generación de imágenes del probador virtual, Supabase) y cita la Ley N.º 18.331 de Uruguay; la de Términos deja explícitamente marcados "a completar por la boutique" los puntos de cambios/devoluciones, garantía y envíos, porque esa es política comercial que no está en el código y no es algo que se pueda inventar. **Ninguna de las dos es asesoramiento legal** — hace falta que un abogado en Uruguay las revise contra la URCDP antes de publicarlas, y que confirmes los datos de contacto del responsable del tratamiento y el plazo de retención de datos (sección 4 de la de privacidad).
- **`src/components/layout/footer.tsx`** — los dos `href="#"` de arriba ahora apuntan a `/privacidad` y `/terminos`.
- **`src/middleware.ts`** — dos cambios en el mismo archivo, ninguno documentado hasta ahora:
  - **Content-Security-Policy** (doc 16 F6, backlog): el sitio no mandaba ningún header CSP. Se armó inventariando por grep todos los orígenes externos que el navegador carga directo (no los que pasan por `/api/*`, esos no necesitan entrar en la CSP): TradingView (`ticker-tape.tsx`), el CDN de video `goods-vod.kwcdn.com` (hero, hasta que 4.3 lo autohospede), Google Maps (iframe del footer/contacto), `i.imgur.com` (fotos de reseñas) y Unsplash/picsum/placehold.co (placeholders). Doce directivas (`default-src 'self'` como base, `object-src 'none'`, `frame-ancestors 'self'`, etc.), con un comentario en el propio archivo marcando que **no se pudo probar contra un navegador real**: el sandbox no tiene salida de red a `tradingview.com` ni `google.com`, así que si algo rompe con la consola marcando "Refused to ... Content Security Policy directive", es acá — específicamente sospechar del comodín `https://*.tradingview.com`.
  - **Rate limiting por ruta**, además del que ya existía dentro de `/api/chat`: un mapa `RATE_LIMITS` en el propio middleware cubre `/api/chat` (20/60s), `/api/chat-session` (10/60s), `/api/checkout` (8/60s), `/api/webhook` (60/60s) y `/api/virtual-tryon` (5/60s) — mismo patrón en memoria con poda periódica que el resto del sitio, por el mismo motivo (proceso Node único, no serverless).
- **`src/components/reviews-carousel.tsx`** — el Addendum 1 (línea 78 de este mismo documento) lo había dejado afuera como "accesibilidad completa pendiente"; en esta tanda sí se hizo. Los puntos de navegación del carrusel eran `<div onClick>` sin foco de teclado ni lectura de estado por screen reader — pasaron a `<button type="button" aria-label aria-current>`. De paso, un bug de color que la Fase 3 no había agarrado del todo: Fase 3 corrigió `--gold` donde aparecía como `var(--gold, #d4a843)`, pero este archivo tenía **11 apariciones separadas** de `rgba(212,168,67,X)` — el mismo dorado incorrecto, codificado en otra sintaxis que ese `sed` no capturaba. Se reemplazaron las 11 por `hsl(var(--gold) / X)`. También 3 apariciones de `color: #6b7280` (gris suelto, no token) → `hsl(var(--background) / 55%)`. El token `--white` de este mismo archivo **no se tocó** — a diferencia de `--gold`, es un token real y a propósito, con su propio comentario en `globals.css` ("usada por reviews-carousel.tsx"), no un bug.
- **`src/components/virtual-try-on.tsx`** — doc 12 (sección "medio construir"): *"La viva (n8n) no valida tamaño ni tipo, no pide consentimiento para mandar una foto de la cara a un tercero, y clasifica cualquier cosa que no sea aro/anillo como collar — una pulsera se prueba como collar."* Dos fixes separados en el mismo componente:
  - **Consentimiento**: antes el flujo arrancaba la cámara automáticamente al abrir el modal. Ahora el primer paso es explícito (`step: 'consent'`) — el visitante tiene que aceptar antes de que se le pida la cámara, porque lo que se manda de acá es una foto de su cara a un servicio de IA de un tercero.
  - **Pulseras**: en vez de agregar a ciegas un valor `'bracelet'` a la clasificación (arriesgando romper el webhook de n8n con una categoría que no sabe interpretar — la clasificación real de imagen pasa por ese webhook, opaco desde acá, no por código de este repo), se optó por lo más seguro: `isBracelet()` detecta el caso y el modal muestra un paso `'unsupported'` en vez de dejar que se pruebe (mal) como collar. Es una degradación explícita — "esto todavía no anda para pulseras" — en vez de una que probablemente iba a fallar en silencio del otro lado del webhook.

## 🔵-24 — `/collections` pasó a Server Component, con paginación y SEO

Era el ítem más grande del backlog, y el que el propio doc 12 dejaba último a propósito. `src/app/collections/page.tsx` se reescribió entero:

- **Server Component real**: `fetchWooCommerce`/`fetchWooCommerceMeta` se llaman directo desde el servidor (mismo patrón que ya usaba `products/[id]/page.tsx`), no `fetch('/api/products')` en un `useEffect`. El HTML que recibe Google (o el preview de WhatsApp al compartir un link a una categoría) ahora tiene los productos reales, no seis rectángulos de skeleton.
- **`generateMetadata`** nuevo — título/descripción dinámicos según categoría o búsqueda, `alternates.canonical`, Open Graph básico.
- **Paginación real**: `fetchWooCommerceMeta` (nuevo en `src/lib/woocommerce.ts`) expone `X-WP-Total`/`X-WP-TotalPages`, headers que WooCommerce siempre mandó y que `fetchWooCommerce()` descartaba. 24 productos por página con controles anterior/siguiente — antes el máximo absoluto visible en todo el sitio eran los 20 productos de la primera página, sin forma de ver el resto.
- **Búsqueda conectada**: `?search=` ya existía en `/api/products` y en `productService.ts` — nada en la UI lo disparaba. Ahora hay un `<form method="GET">` (funciona sin JS) en el sidebar desktop y en el filtro mobile.
- El único fragmento que sigue siendo `'use client'` es `src/components/collections-mobile-filter.tsx` (nuevo) — únicamente el abrir/cerrar del `Sheet` de filtros en mobile necesita estado de cliente; todo lo demás (filtros, tarjetas de producto, paginación) son links/forms server-rendered.
- `src/app/collections/loading.tsx` (nuevo) reemplaza el skeleton que antes dibujaba el propio componente cliente.

**No se pudo verificar en vivo** (mismo caveat que la CSP de arriba): el sandbox no tiene salida de red al WooCommerce real, así que la paginación y el conteo de `X-WP-Total` están verificados por lectura de código y por cómo WooCommerce REST documenta esos headers, no por una llamada real.

## Búsqueda en el header

`src/components/layout/header.tsx` — el ícono de Buscar se había sacado en la ronda anterior por ser UI muerta (doc 16: "la búsqueda ya está soportada por la API", esfuerzo S). Ahora hay un ícono que despliega un input inline en desktop (`router.push` a `/collections?search=`) y un formulario GET dentro del menú mobile.

## Handoff a humano — `derivar_a_asesor`

Doc 12: *"la infraestructura para que un humano intervenga en el chat está construida y no tiene interruptor"* — existían `/api/webhook` (recibe mensajes firmados HMAC y los inserta como `assistant`) y el polling de `chat-widget.tsx` que ya los mostraba, pero nada disparaba el handoff.

- Nueva tool de Alma en `src/app/api/chat/route.ts`: `derivar_a_asesor(motivo)`. El prompt le instruye usarla cuando el cliente pide explícitamente hablar con una persona, o cuando el pedido excede lo que las otras tools resuelven.
- Inserta en la tabla `chat_handoff` (`session_id`, `motivo`, `estado: 'pendiente'`). **Sin confirmar contra el schema real** — ver el prompt de Supabase al final de esta ronda: el doc 12 encontró dos tablas candidatas (`handoff` y `chat_handoff`) sin un solo consumidor en esta app, y no hay forma de saber cuál es la correcta ni sus columnas sin acceso de escritura al proyecto.
- El stream de `/api/chat` manda un evento NDJSON `{type:'handoff'}` apenas la tool se ejecuta con éxito (no espera a que Alma termine de redactar su despedida). `chat-widget.tsx` lo escucha y prende un banner persistente ("Te estamos derivando con un asesor humano...") arriba de la conversación. Las respuestas del humano/n8n siguen llegando por el polling que ya existía — no se tocó esa parte.
- No se disparó ninguna notificación saliente nueva (ej. un webhook de n8n avisando "hay un handoff pendiente"): no existe una URL de webhook configurada para esto en `settings.server.ts` (sólo está la de checkout), e inventar una que apunte a un endpoint que no existe fallaría en silencio. Si n8n necesita enterarse en tiempo real (no sólo por polling de la tabla), hace falta esa URL — queda en el prompt de Supabase/n8n al final.

## `/recommendations` — se borró, con Genkit entero

Doc 12 daba dos opciones: borrar (S) o conectarla al catálogo real con rate limiting (L). Se borró: `src/app/recommendations/`, `src/ai/` completo (los dos flows de Genkit — el de recomendaciones y una segunda implementación muerta de probador virtual que nadie ejecutaba, la viva es la de `/api/virtual-tryon` vía n8n), y las dependencias `genkit`/`@genkit-ai/google-genai`/`dotenv` de `package.json` (las tres sin otro importador en el repo). Razones: la ruta no estaba enlazada desde ningún lado (sólo accesible escribiendo la URL a mano), el middleware no la cubría (Server Action sin rate limit = llamadas a Gemini sin techo para quien conociera la URL), y las recomendaciones no estaban conectadas al catálogo — inventaba joyas igual que Alma inventaba precios antes de F5. Conectarla de verdad hubiera duplicado el trabajo que ya hace `buscar_productos` en Alma, para una feature que nadie visitaba.

## 4.1 — Ratios y contenedores, parcial

El Addendum 1 lo había dejado afuera por "alto riesgo de romper layout sin poder verlo". Se resolvió la parte que sí se pudo verificar por lectura de código sin ese riesgo:

- **Contenedores**: resultó que `max-w-screen-xl` (breakpoint `xl` de Tailwind, 1280px por defecto — no hay override en `tailwind.config.ts`) y `max-w-[1280px]` ya eran el mismo ancho numérico. El único valor realmente distinto era `max-w-[1440px]` en `collections/page.tsx`, que la reescritura de 🔵-24 ya dejó en `max-w-[1280px]`. No quedan anchos de contenedor distintos entre páginas.
- **Ratio de imagen de producto**: `product-gallery.tsx` usaba `aspect-[4/3]` apaisado — una pieza fotografiada en vertical (la mayoría de anillos/alianzas) se recortaba arriba y abajo con `object-cover`. Se cambió a `aspect-[4/5]`, el mismo que ya usa `/collections` para las mismas fotos.
- **No se tocó**: el ratio `aspect-[3/4]` de los videos de "Piezas Destacadas" en el home (`page.tsx:97`). El audit de doc 11 los contaba junto con las fotos de producto, pero son videos promocionales de un componente distinto (no la misma foto de producto en 4 lugares — `product-card.tsx`, uno de los 4 puntos que citaba ese audit, ya no existe, lo borró el Addendum 1). Cambiarles el ratio a ciegas arriesga recortar la composición del video sin poder verlo — se dejó así por el mismo motivo que 4.1 había quedado afuera del todo la vez anterior.

## Addendum 3 — hardening de los tres endpoints que dependen de n8n

Se preguntó explícitamente por el estado de la dependencia de n8n y si el sitio ya era "autónomo". Investigación completa en el chat de esa ronda; acá el resumen para que quede escrito: **no se eliminó, y no correspondía intentarlo.** El propio `07-adr-001-donde-vive-el-agente.md` de este repo evaluó sacar n8n del todo (su "Opción B") y la rechazó a propósito — se perdería el canal de WhatsApp y las integraciones periféricas (CRM, Sheets, Mercado Pago) que ya funcionan ahí. La decisión adoptada (Opción C) es híbrida a propósito: el razonamiento de Alma vive en Next.js (eso ya pasó, F5), pero el transporte de WhatsApp y los efectos asíncronos —pagos, generación de imagen del probador virtual— se quedan en n8n. Tres endpoints de este repo siguen dependiendo de un webhook de n8n externo, **intactos, ninguno tocado en esta ronda ni en las anteriores**: `/api/checkout`, `/api/virtual-tryon`, `/api/webhook`.

Encima quedó una pregunta abierta y sin verificar desde acá: el ADR original proponía un endpoint unificado `/api/agent` al que tanto el widget web como un puente de n8n para WhatsApp (con header `X-Agent-Token`) le pegarían, para que los dos canales compartan **un solo cerebro**. Ese `/api/agent` no existe en el código — grep de `X-Agent-Token`/`/api/agent` en todo `src/` da cero resultados. Lo que sí existe es `/api/chat`, que es el cerebro nativo pero solo para el canal web. Si WhatsApp sigue hablando con el workflow de n8n original (el que corría el agente entero, según describe el propio ADR en su "Contexto"), hay dos cerebros con dos prompts que mantener sincronizados a mano — exactamente el riesgo que el ADR advertía evitar. **No se puede confirmar desde este entorno**: no hay acceso a la instancia de n8n ni al canal de WhatsApp real. Construir `/api/agent` a ciegas, sin saber si WhatsApp ya usa otra cosa o qué tools/prompt tiene el workflow vivo hoy, es la clase de cambio que puede romper el canal que más vende — queda deliberadamente sin tocar hasta que se confirme el estado real de ese lado.

Lo que sí se hizo, dentro de lo que es puramente código y no requiere esa confirmación — dos hardenings concretos en los endpoints que sí siguen dependiendo de n8n:

- **`src/app/api/checkout/route.ts`**: el `fetch` al webhook de n8n no tenía timeout — a diferencia de `/api/virtual-tryon`, que ya usaba `AbortSignal.timeout(90000)`. Si el webhook se cuelga, la request quedaba esperando sin límite en el mismo proceso Node que `RUNBOOK.md` ya documenta que se cae por memoria; un checkout colgado es justo el tipo de cosa que termina de tumbarlo. Se agregó `AbortSignal.timeout(20000)` con manejo explícito de `TimeoutError` (504, mensaje "el pago está tardando más de lo esperado"). De paso: cuando el webhook devolvía error, `errorData.errorMsg` se reenviaba tal cual al navegador — un texto armado por n8n, sin control de qué puede llegar a incluir. Ahora se loguea server-side y al cliente va un mensaje genérico (502), mismo criterio que ya usaba `/api/virtual-tryon` para no filtrar detalles internos. Verificado que `buy-button.tsx` solo mira `response.ok` y `errData.error`, nunca el código de estado exacto — el cambio no rompe nada del lado cliente.
- **`src/app/api/webhook/route.ts`**: era el único POST del sitio sin validación `zod` — `text`/`sessionId` salían de `JSON.parse(rawBody)` crudo, con un `if (!text || !sessionId)` que deja pasar cualquier valor truthy (un objeto, un array, un número), no solo strings. La firma HMAC certifica que el llamador es quien dice ser; no valida que el body tenga la forma correcta. Se agregó un schema (`text`: string 1-4000 chars, `sessionId`: string 1-200 chars), mismo patrón que ya usan `/api/chat`, `/api/checkout` y `/api/virtual-tryon`.

Los dos cambios se verificaron con `tsc --noEmit` y un build completo (ciclo de font-strip habitual) antes de entregarse.

## Addendum 4 — `/api/agent` (ADR-001, Opción C): un cerebro, dos transportes

Instrucción explícita de esta ronda: activar el agente como foco principal, dejarlo **totalmente independiente de n8n** en su razonamiento, y que "la gente conviva directamente dentro del aplicativo" — es decir, construir la pieza que el Addendum 3 había dejado señalada como pregunta abierta y sin tocar: el endpoint unificado `/api/agent` que el propio `07-adr-001-donde-vive-el-agente.md` proponía para que WhatsApp deje de correr su propio agente adentro de n8n y en cambio le pegue a este mismo cerebro. Se construyó. Pagos y las otras integraciones que dependen de n8n (`/api/checkout`, `/api/virtual-tryon`) **no se tocaron** — quedan como estaban, tal cual se pidió.

- **`src/lib/agent/core.ts`** (nuevo) — el system prompt, las 4 tools (`buscar_productos`, `ver_producto`, `derivar_a_asesor`, `agendar_cita`) y el loop completo de streaming + tool-calling contra OpenAI, que antes vivían enteros adentro de `src/app/api/chat/route.ts`, se movieron acá como `runAgentTurn()`. Es la única copia del razonamiento de Alma — exactamente lo que el ADR marcaba como riesgo a evitar ("dos agentes que divergen, con dos prompts que hay que mantener sincronizados a mano").
- **`src/app/api/chat/route.ts`** (canal web, existente) — se dejó reducido a transporte: cookie de sesión, rate limit, y reenvío en vivo de los eventos de `runAgentTurn()` como NDJSON al navegador. Mismo comportamiento externo que antes — verificado comparando la secuencia de eventos NDJSON contra la versión previa; el único cambio de fondo es que ahora `controller.close()` se llama desde un solo lugar en vez de cuatro puntos de salida distintos repetidos en el código viejo.
- **`src/app/api/agent/route.ts`** (nuevo, canal WhatsApp) — pensado para que n8n deje de razonar y pase a ser un "puente tonto": recibe el mensaje entrante de WhatsApp, le pega a esta ruta, manda la respuesta de vuelta. Server-to-server, sin cookie: se autentica con un header `X-Agent-Token` comparado con `timingSafeEqual` (mismo patrón anti-timing-attack que ya usaba `/api/webhook`). Resuelve el id interno de `chat_sessions` a partir del identificador estable de WhatsApp (buscando o creando una fila con `metadata.whatsapp_id`), y llama a `runAgentTurn()` sin streaming (WhatsApp no tiene concepto de texto llegando de a poco — se espera el turno completo y se devuelve un JSON con la respuesta final).
- **`src/lib/settings.server.ts`** — nueva variable `N8N_AGENT_TOKEN`, el secreto compartido que `/api/agent` exige en el header. Hay que generarla y configurarla — ver el checklist de variables de entorno para Vercel, entregado aparte.
- **`src/middleware.ts`** — se agregó `/api/agent` al mapa de rate limiting con un techo alto a propósito (300/60s) y un comentario explicando por qué: ese límite en el middleware es por IP, y **todos** los contactos de WhatsApp le van a pegar desde la misma IP del servidor de n8n — un límite ajustado por IP ahí terminaría limitando a todos los clientes de WhatsApp combinados como si fueran uno solo. El límite real, por contacto individual, vive adentro de la propia ruta (`sessionId`, no IP).
- **Mecanismo de pausa por handoff humano** (bug real, encontrado mientras se construía esto, no pedido explícitamente pero necesario para que la unificación no empeore lo que ya había): con un solo cerebro atendiendo dos canales, si `derivar_a_asesor` deriva la conversación a un humano pero nada avisa que Alma ya no debe seguir respondiendo, el próximo mensaje del cliente —por cualquiera de los dos canales, dado que ahora comparten sesión interna— le vuelve a generar una respuesta de Alma por encima del asesor humano. Se agregó `isSessionPaused()`/`pauseSession()` en `core.ts`, guardando la pausa en `chat_sessions.metadata` (la única pieza de este mecanismo con schema confirmado — no depende de adivinar si la tabla correcta es `chat_handoff` o `handoff`, esa incertidumbre ya estaba documentada en el Addendum sobre handoff). `derivar_a_asesor` pausa la sesión apenas registra la derivación con éxito; `runAgentTurn()` chequea la pausa después de guardar el mensaje del cliente (el humano tiene que poder ver lo que escribió) pero antes de llamar a OpenAI — si está pausada, no genera respuesta y devuelve `{paused: true}` en vez de `{reply}`. `/api/chat` reenvía esto al navegador como evento NDJSON `{type:'paused'}`, que `chat-widget.tsx` ya sabe manejar reusando el mismo banner de "te estamos derivando con un asesor humano" que existía para el evento `handoff`. `/api/agent` lo traduce a `{reply: null, paused: true}` con status 200 (no es un error — el mensaje del cliente sí se guardó — para que el lado de n8n sepa que tiene que quedarse en silencio ese turno, no reintentar).
  - **Limitación real, no descuido**: no existe ninguna consola para levantar la pausa. Se activa sola y se queda activa hasta que alguien la desactive a mano en Supabase (`update chat_sessions set metadata = jsonb_set(metadata, '{paused}', 'false') where id = '<uuid>'`). No se implementó un vencimiento automático porque "¿cuánto tarda razonablemente un asesor en contestar?" es una decisión de negocio, no algo para inventar desde acá.

**Sin probar en vivo, mismo caveat de siempre**: se verificó con `tsc --noEmit` y un build completo, pero este entorno no tiene salida de red hacia una instancia real de n8n ni escritura al Supabase real. Dos puntos concretos quedan sin confirmar y se detallan en el prompt de Supabase/n8n al final de esta ronda: (1) la búsqueda de sesión por `metadata->>whatsapp_id` es una convención nueva — sin un índice único sobre esa expresión, dos mensajes casi simultáneos del mismo contacto nuevo podrían crear dos filas de sesión en vez de reusar una; (2) el propio workflow de n8n para WhatsApp todavía no está reconfigurado para llamar a esta ruta — mientras eso no pase, `/api/agent` existe en el código pero no lo llama nadie. Ver el documento de contrato para n8n, entregado aparte, con exactamente qué cambiar en el workflow.

## No tocado en esta ronda

- **4.3 video institucional / 4.4 fuentes autohospedadas** — mismo problema de siempre: sin salida de red desde el sandbox a `kwcdn.com`/`fonts.gstatic.com`.
- **Resumen/compactación de historial de chat** más allá de los últimos 10 mensajes — no estaba en el inventario de doc 12, se había ofrecido como opción en la ronda del Addendum 1 y no se eligió.
- **Panel Kanban de pedidos** (doc 12, "decidir: se construye o se borra") — se dejó sin decidir; construirlo es esfuerzo L y borrar los tipos de `src/lib/supabase.ts` ya estaba en la lista de borrado manual del Addendum 1.
- **Captación de prospectos de los 4 formularios** — de los cuatro, tres ya persisten (`agendar_cita` y el modal del footer → `prospectos`; onboarding del chat → `/api/leads`); el que sigue sin persistir es la suscripción del footer, que abre WhatsApp directo. No estaba desglosado como ítem propio en el inventario que se armó para esta ronda.

## Addendum 5 — decisión: sin canal de WhatsApp por ahora, solo Alma en el sitio web

El mismo día que se entregó el Addendum 4, aclaraste que no vas a usar salida de WhatsApp — solo el agente Alma funcionando, y por eso no hace falta conectar con n8n para WhatsApp. Esto simplifica el panorama, y vale la pena dejarlo escrito con precisión porque cambia qué es "hacer falta" de acá en adelante:

- **El chat web (`/api/chat`) ya era, y sigue siendo, 100% independiente de n8n para razonar.** Esto no es algo que haya que activar ahora — es así desde que se movió el cerebro a `src/lib/agent/core.ts` (Addendum 4): `runAgentTurn()` habla directo con la API de OpenAI, nunca le pega a n8n. Con las variables de entorno de siempre (OpenAI, Supabase, WooCommerce) cargadas en Vercel, Alma en el sitio web funciona sin que n8n esté siquiera despierto.
- **`/api/agent`** (el puente pensado específicamente para WhatsApp) **queda en el código, construido y con build/tsc verificados, pero sin usar** — decisión explícita, no un olvido. Nadie le pega a esa ruta porque no hay ningún workflow de n8n apuntándole, y no lo va a haber mientras no se retome la idea de sumar WhatsApp. No genera ningún riesgo dejarlo así: sin `N8N_AGENT_TOKEN` configurado, la ruta devuelve 500 en vez de responder — no queda abierta.
- **`N8N_AGENT_TOKEN`** (checklist de Vercel, sección 3) pasa de "cargar ahora" a **opcional, solo si en algún momento se activa WhatsApp**.
- **El documento de contrato para reconfigurar el workflow de n8n** (`19-contrato-n8n-api-agent.md`) queda en pausa — se marcó explícitamente arriba del archivo. No hay ninguna acción sobre n8n pendiente de tu lado por este motivo.
- **Lo que no cambia**: `/api/checkout` y `/api/virtual-tryon` siguen dependiendo de sus webhooks de n8n para pagos (Mercado Pago) y generación de imagen del probador virtual — eso es una integración distinta, no tiene que ver con "salida de WhatsApp" ni con el agente, y sigue como estaba (ver Addendum 3).
- El mecanismo de pausa por handoff humano (`derivar_a_asesor` → `chat_sessions.metadata.paused`) **sigue siendo útil solo para el canal web** ahora: si Alma deriva a un asesor, el chat web deja de responder en esa sesión hasta que se levante la pausa a mano en Supabase. No se le puede sacar porque no tiene ningún costo dejarlo — simplemente ya no hay un segundo canal (WhatsApp) que se beneficiaría de compartir esa misma pausa.

En síntesis: para que Alma funcione en el sitio web de forma autónoma, no falta nada de n8n — solo las variables de entorno de siempre en Vercel.

## Addendum 6 — auditoría real de Vercel: faltaban `OPENAI_API_KEY` y `SUPABASE_SERVICE_ROLE_KEY`

El checklist del Addendum 5 se había armado a partir de `.env.local`, un archivo local que resultó estar desactualizado respecto a lo que ya había en Vercel (por ejemplo, ahí decía `WOOCOMMERCE_URL`; en Vercel ya estaba bien como `WOO_BASE_URL` — ese hallazgo del checklist original quedó obsoleto). Pediste la lista real de variables cargadas en Vercel y se cruzó contra el código:

- **Faltaban dos variables críticas, sin las cuales Alma no respondía nada**: `OPENAI_API_KEY` (sin ella, `/api/chat` devuelve 500 apenas alguien escribe) y `SUPABASE_SERVICE_ROLE_KEY` (sin ella, nada que necesite guardar/leer de Supabase funciona — historial, `agendar_cita`, `derivar_a_asesor`). Ya las cargaste, confirmando que `SUPABASE_SERVICE_ROLE_KEY` es la clave secreta/`service_role` (correcto — la pública/`anon` no sirve para esto, salta las RLS que la pública respeta).
- **Dos variables sin uso en el código actual, restos de una versión anterior del sitio**: `N8N_EVENT_WEBHOOK_URL` (flujo de Dify, ya eliminado) y `N8N_ALMA_WEBHOOK_URL` (endpoint viejo `/api/alma-chat`, también eliminado). No hacen daño quedándose, no son código de esta ronda.
- **Cuatro variables que siguen faltando** si en producción se usan pagos o el probador virtual (`N8N_CHECKOUT_WEBHOOK_URL`, `N8N_TRYON_WEBHOOK_URL`, `N8N_WEBHOOK_TOKEN`, `N8N_WEBHOOK_SECRET`) — sin ellas esos dos flujos van a fallar si alguien los prueba.

`18-checklist-variables-vercel.md` se reescribió entero para reflejar este estado real en vez del inferido de `.env.local` — es la versión que vale a partir de ahora.

## Addendum 7 — prompt de verificación contra Supabase, actualizado

Preguntaste si queda algo por mejorar antes de hacer push. Todo lo de código está verificado (`tsc`/build limpios, sin bugs conocidos); lo único que queda genuinamente sin confirmar es lo que depende de leer el Supabase real, cosa que esta sesión no puede hacer. Existía ya un `prompt-supabase-verificacion.md` de una ronda anterior — se actualizó en vez de crear uno nuevo, con dos ajustes que quedaron desalineados por el trabajo de esta ronda:

- La referencia a la tool `derivar_a_asesor` apuntaba a `src/app/api/chat/route.ts`, donde vivía antes de la unificación del cerebro (Addendum 4) — corregida a `src/lib/agent/core.ts`.
- Ítem nuevo (1g/2d), de prioridad explícitamente baja porque el canal de WhatsApp está pausado: si en algún momento se retoma, `resolveWhatsappSession()` busca por `chat_sessions.metadata->>whatsapp_id` sin índice único confirmado — dos mensajes casi simultáneos de un contacto nuevo podrían crear dos sesiones en vez de una.

El resto del prompt (existencia real de `chat_handoff`/`handoff`, columnas de `prospectos`, índice de `chat_messages`, RLS, que `SUPABASE_SERVICE_ROLE_KEY` en producción apunte al proyecto correcto) queda igual que antes — sigue siendo lo único pendiente de esta ronda que depende de acceso real a Supabase, no de más código.

## Addendum 8 — se sacó el widget viejo de `@n8n/chat` de producción (confirmado en vivo) y se unificó el botón flotante

Mandaste una captura del sitio en producción (`www.joyeriaalianzas.com.uy`) mostrando el widget viejo de n8n (`@n8n/chat`, cargado desde jsDelivr) con "Error: Failed to receive response", y después la consola confirmando la causa exacta: ese widget le pega directo desde el navegador a `https://n8n.axion380.com.br/webhook/alma-agent-2`, y ese webhook no manda `Access-Control-Allow-Origin` — CORS lo bloquea.

Se verificó por grep en todo `src/` que ese widget **ya no existe en el código de esta ronda** — se había sacado en una ronda anterior a esta (el propio `src/app/page.tsx` tiene un comentario que documenta el reemplazo). Conclusión: lo que mostraba la captura es la versión de producción **de antes de cualquier deploy de todo este trabajo** (esta ronda y las anteriores) — nunca se hizo push. No hacía falta ni correspondía tocar la configuración de CORS de ese webhook: es el camino que ya se abandonó, arreglarlo hubiera sido esfuerzo tirado.

Al revisar esto encontraste un problema real y sí de esta ronda: el ícono flotante de WhatsApp (`src/components/whatsapp-button.tsx`, montado en `layout.tsx`) y el panel del chat (`ChatWidget`) son dos elementos `fixed` en la misma esquina (`bottom-6` uno, `bottom-24` el otro) — con el panel abierto, el ícono de WhatsApp quedaba tapado detrás. Antes de tocarlo se confirmó algo importante: ese ícono **no es un link real a WhatsApp** — ya estaba armado (de una ronda anterior) para abrir el chat interno de Alma vía el evento `open-chat-only`, a propósito, para no sacar al cliente del sitio. Y era el **único disparador del chat** fuera de los botones "Consultar" de las fichas de producto: `ChatWidget` no dibujaba ningún ícono propio cuando estaba cerrado (`if (!isOpen) return null`).

Se unificó en un solo componente: `ChatWidget` ahora dibuja su propio botón flotante (mismo ícono de WhatsApp, misma animación de ping, misma posición) cuando está cerrado, y el panel cuando está abierto — nunca los dos elementos a la vez, así que no hay nada que solapar. El botón sigue disparando el mismo evento `open-chat-only` que ya escuchaba el componente, así que ningún otro disparador (las fichas de producto, `open-chat-with-message`) se tocó. `WhatsappButton` se sacó de `layout.tsx`; el archivo `src/components/whatsapp-button.tsx` queda sin importadores — ver la lista de borrado manual, se agregó ahí.

Verificado con `tsc --noEmit` y build completo (ciclo de font-strip habitual) antes de entregarse.

---

# Pendientes de tu lado (actualizado)

Todo lo de la sección "Pendientes de tu lado" de arriba sigue en pie. Se agrega:

6. **Borrar manualmente** (además de la lista original): `src/ai/` y `src/app/recommendations/` ya no existen en el paquete de archivos entregado — si quedó una copia vieja en el servidor de un deploy anterior, no hace falta borrarla a mano (un `git pull`/deploy nuevo la va a reemplazar), pero si el deploy es por FTP/copia manual de archivos sueltos, confirmá que esas dos carpetas no sigan sirviéndose.
7. **`npm install`** de nuevo — `package.json` perdió `genkit`, `@genkit-ai/google-genai` y `dotenv`.
8. Todo lo que necesita confirmarse contra el Supabase real (`chat_handoff` vs `handoff`, columnas de `prospectos`, índice de `chat_messages`, RLS/service role en producción) se consolida en un prompt aparte para dárselo al agente con acceso a Supabase — ver mensaje de cierre de esta ronda.
9. **Variables de entorno en Vercel** — checklist completo entregado aparte (`18-checklist-variables-vercel.md`). Con las secciones 1 y 2 alcanza para que Alma funcione en el sitio web; el desajuste de nombre real que hay que corregir es `.env.local` tiene `WOOCOMMERCE_URL` pero el código lee `WOO_BASE_URL` — sin ese cambio de nombre, se rompe el catálogo entero. `N8N_AGENT_TOKEN` (sección 3) **no hace falta cargarla** — ver Addendum 5.
10. ~~Reconfigurar el workflow de WhatsApp en n8n~~ — **en pausa por decisión del 2026-08-24** (Addendum 5): no se va a usar el canal de WhatsApp por ahora, solo Alma en el sitio web. El documento de contrato (`19-contrato-n8n-api-agent.md`) queda entregado y marcado como en pausa para el día que se retome, pero no hay ninguna acción pendiente de tu lado sobre esto hoy.
11. **Hacer el push/deploy** — esto es lo más importante de esta lista: nada de todo este trabajo (esta ronda ni las anteriores) llegó a producción todavía. El Addendum 8 lo confirmó en vivo — `www.joyeriaalianzas.com.uy` sigue sirviendo el widget de chat viejo (`@n8n/chat`), no el nativo.
12. **Borrar manualmente** (se suma a la lista original): `src/components/whatsapp-button.tsx` quedó sin ningún importador después del Addendum 8 — se puede borrar sin efecto.
