---
titulo: Deuda técnica, lógica rota y pendientes — barrido post-fixes
fecha: 2026-08-17
alcance: /home/claude/ja/build-test (estado final: fixes de 09 aplicados + archivos muertos borrados)
verificacion: npx tsc --noEmit = 0 errores. npm run build NO se pudo completar acá (ver hallazgo #15). Todo hallazgo de código fue verificado por lectura + grep.
---

# 1. Resumen ejecutivo

Lo crítico de seguridad de la ronda anterior está cerrado: RLS revocado, `settings.ts` limpio, service_role server-only, zod en las rutas que importan, rate limit básico. Lo que queda ahora no es seguridad, es **el producto no hace lo que dice que hace**.

El chat de Alma duplica cada mensaje en pantalla, pierde el hilo después del décimo mensaje, y —lo más caro— **te pide nombre y WhatsApp y no manda ese dato a ningún lado**: queda en el `localStorage` del visitante. La joyería no recibe un solo lead del chat. Encima Alma invita a visitar la boutique en Carrasco y la boutique está en Mercedes 1211. El botón "Consultar" del home sigue buscando el widget de n8n que se borró hace dos rondas, así que siempre cae al fallback de WhatsApp con un número distinto al del resto del sitio.

Debajo de eso hay ~30 archivos muertos más (un cliente Supabase apuntando al proyecto viejo, 22 componentes `ui/` sin usar con sus dependencias), el catálogo se renderiza 100% en cliente sin SEO ni paginación, y `ignoreBuildErrors: true` sigue prendido tapando que ESLint directamente **no está instalado**.

Resumen: es un sitio bonito con un embudo de captación roto de punta a punta.

---

# 2. Hallazgos por severidad

## 🔴 Rompe funcionalidad

### 🔴-1. El chat duplica todos los mensajes en pantalla

`src/components/chat-widget.tsx:140-166` + `src/app/api/messages/route.ts:18-34`

```tsx
// chat-widget.tsx:150
setMessages(prev => {
  const newMessages = data.messages.filter((msg: any) => !prev.some(m => m.id === msg.id));
  ...
```
```tsx
// chat-widget.tsx:176 — el id local
id: Math.random().toString(36).substr(2, 9),
```
```ts
// api/messages/route.ts:26 — el id del server
messages: messages.map(m => ({ id: m.id, ... }))   // uuid de Postgres
```

**Por qué importa:** `/api/messages` devuelve *toda* la conversación, incluidos los mensajes del usuario y las respuestas que `/api/chat` ya devolvió por POST. El dedupe compara por `id`, pero el mensaje que el widget pintó localmente tiene un id random de 9 chars y el mismo mensaje que vuelve del server tiene un UUID. Nunca coinciden.

Escenario real: cliente con datos cargados abre el chat, escribe "hola". Ve su "hola" y la respuesta de Alma. A los ≤3 segundos aparecen otra vez su "hola" y otra vez la respuesta de Alma, abajo. Toda la conversación se ve doble. Además, al abrir el widget, el polling baja la conversación de la semana pasada (la cookie dura 7 días) y la pega debajo del mensaje de bienvenida, aunque `handleOpenOnly` (línea 121) acaba de resetear la lista a solo la bienvenida.

**Fix:** una sola fuente de verdad. Lo más simple: sacar el polling y renderizar solo lo que devuelve `/api/chat`; o al revés, que `addMessage` no pinte nada optimista y todo venga de `/api/messages`. Si se quiere conservar el optimismo de UI, `/api/messages` debe aceptar `?since=<timestamp>` y el widget dedupear por `(role, content, timestamp)` además de por id.
**Esfuerzo:** M

### 🔴-2. Los leads del chat nunca llegan al negocio

`src/components/chat-widget.tsx:197-199` y `213-215`

```tsx
const data = { name: onboardingForm.name.trim(), phone: onboardingForm.phone };
localStorage.setItem('alianza_user_info', JSON.stringify(data));
setUserInfo(data);
// sessionId is already set via cookie/token logic
```

Grep confirmado: `userInfo` aparece 6 veces en el widget (líneas 38, 141, 166, 229, 496, 500) y **ninguna** lo manda al servidor. `processMessage` (línea 245) postea solo `{ message, history }`. Ninguna ruta API recibe nombre ni teléfono. La columna `chat_sessions.metadata` existe y está vacía siempre.

**Por qué importa:** el widget bloquea el input hasta que el visitante da nombre y WhatsApp ("Para poder asesorarte mejor, necesito tu nombre y número de WhatsApp"), y ese dato muere en el navegador del visitante. Si mañana entran 200 personas y 40 dejan el teléfono, la joyería tiene 0 teléfonos. Es el motivo por el que existe el widget y es exactamente lo que no hace.

**Fix:** `POST /api/chat-session` con `{ name, phone }` validado por zod → `chat_sessions.metadata` (o mejor, columnas `name`/`phone` + tabla `prospectos`, que ya existe en Supabase y no la usa nadie). Llamarlo también cuando el usuario completa el onboarding, no solo en el mount.
**Esfuerzo:** S

### 🔴-3. Alma se queda con los 10 mensajes MÁS VIEJOS de la conversación

`src/app/api/chat/route.ts:43-48`

```ts
const { data: historyData } = await supabaseAdmin
  .from('chat_messages')
  .select('role, content')
  .eq('session_id', sessionToken)
  .order('created_at', { ascending: true })   // ← más viejo primero
  .limit(10);                                  // ← corta los 10 primeros
```

**Por qué importa:** `order ascending + limit 10` devuelve los diez mensajes **iniciales**, no los últimos diez. A partir del mensaje 11 el contexto de Alma queda congelado en el arranque de la charla: el cliente dice "sí, quiero ese, el de oro rosa" y Alma sigue viendo solo el "hola" y las dos primeras preguntas. Se nota como un agente que "se olvida" y repregunta lo mismo. La cookie dura 7 días, así que un cliente que vuelve arrastra un contexto viejo y nunca ve el reciente.

**Fix:** `.order('created_at', { ascending: false }).limit(10)` y después `.reverse()` en JS. Idealmente subir a 20 y agregar índice (ver 🔵-30).
**Esfuerzo:** S

### 🔴-4. El botón "Consultar" del home busca un widget que ya no existe

`src/app/page.tsx:119-132`

```tsx
onClick={() => {
  const msg = `¡Hola! Me interesa la ${collection.name}...`;
  const chatWindow = document.querySelector('#n8n-chat') || document.querySelector('.n8n-chat-widget');
  if (chatWindow || (window as any).n8nChat || document.querySelector('n8n-chat')) {
    window.dispatchEvent(new CustomEvent('n8n-chat:open'));
    ...
  } else {
    window.open(`https://wa.me/59891264956?text=${encodeURIComponent(msg)}`, '_blank');
  }
}}
```

**Por qué importa:** el widget `@n8n/chat` se reemplazó en F2.2. Grep: no queda ningún `#n8n-chat`, `.n8n-chat-widget` ni `window.n8nChat` en el proyecto. **La condición nunca se cumple**: los tres botones "Consultar" del home siempre caen al `else` y sacan al visitante del sitio hacia WhatsApp. Y encima al número `59891264956`, que no es el de `appSettings.whatsAppNumber` (`59895435644`). El chat propio, que es la razón de haber construido Alma, nunca se abre desde el home.

**Fix:** reemplazar todo el `onClick` por `window.dispatchEvent(new CustomEvent('open-chat-with-message', { detail: { message: msg } }))`, que es el evento que el widget sí escucha (chat-widget.tsx:130).
**Esfuerzo:** S

### 🔴-5. Dos direcciones distintas de la boutique, y Alma da la equivocada

`src/app/api/chat/route.ts:68` vs `src/app/contact/page.tsx:32,42`

```ts
// api/chat/route.ts:68 — system prompt de Alma
3. Invita a los clientes a visitar la boutique en Carrasco si necesitan una experiencia presencial.
```
```tsx
// contact/page.tsx:42 — lo que dice la página de contacto
Mercedes 1211<br />Montevideo, Uruguay
```

El home (`page.tsx:61`) también dice "en el corazón de Carrasco". El footer tiene **dos** juegos de constantes de mapa: `GOOGLE_MAPS_EMBED_URL` (footer.tsx:10, Arocena 1592, Carrasco) y `EMBED_PLACE_URL` (footer.tsx:15, Carrasco) que **no se usan**, y `EMBED_SEARCH_URL`/`GOOGLE_MAPS_SEARCH_URL` (líneas 17 y 11, Mercedes 1211) que sí se renderizan (líneas 190, 258, 271).

**Por qué importa:** un cliente le pregunta a Alma dónde queda el local, Alma lo manda a Carrasco, el local está en el Centro. Carrasco y Mercedes 1211 están a ~12 km. Esto genera reclamos reales, no teoría.

**Fix:** definir la dirección real, ponerla en `appSettings` (es pública), e inyectarla en el system prompt en vez de hardcodearla. Borrar las constantes de mapa muertas.
**Esfuerzo:** S

### 🔴-6. Todo el flujo "consultar este producto por chat" es inalcanzable

`src/components/chat-widget.tsx:79-114`

```tsx
const handleOpenWithMsg = (e: any) => { ... }
window.addEventListener('open-chat-with-message', handleOpenWithMsg);
```

Grep en las dos copias del proyecto: **nadie hace `dispatchEvent('open-chat-with-message')`**. El único emisor posible sería el botón del home (🔴-4), que dispara el evento viejo `n8n-chat:send`.

**Por qué importa:** ~35 líneas del widget están muertas y con ellas features enteras: la tarjeta de "📦 Producto consultado" con precio y SKU, el onboarding inline dentro del chat (`needsInlineOnboarding`, `handleInlineOnboarding`), y el `pendingText`. Alguien las escribió, las testeó a mano quizás, y nunca se conectaron. El único camino de entrada al chat hoy es el botón flotante de WhatsApp (`whatsapp-button.tsx:14`) que dispara `open-chat-only`, sin contexto de producto.

**Fix:** conectar el evento desde `page.tsx` y desde `WhatsAppProductButton` (o crear un botón "Consultar por chat" en la ficha de producto). Si se decide no usarlo, borrar las 35 líneas.
**Esfuerzo:** S (conectarlo) / S (borrarlo)

---

## 🟠 Riesgo o bug latente

### 🟠-7. Un `localStorage` corrupto deja el chat muerto para siempre en ese navegador

`src/components/chat-widget.tsx:73-77` (parse) vs `:130-131` (listeners)

```tsx
const saved = localStorage.getItem('alianza_user_info');
if (saved) {
  const parsedUser = JSON.parse(saved) as UserInfo;   // ← sin try/catch
  setUserInfo(parsedUser);
}
// ... 50 líneas después:
window.addEventListener('open-chat-with-message', handleOpenWithMsg);
window.addEventListener('open-chat-only', handleOpenOnly);
```

**Por qué importa:** si la clave quedó truncada (pestaña cerrada a mitad de escritura, extensión, quota llena), `JSON.parse` tira y aborta el `useEffect` **antes** de registrar los listeners. Resultado: el botón flotante de WhatsApp deja de abrir el chat, sin error visible, de forma permanente hasta que el usuario limpie el storage. Lo mismo pasa en `handleOpenWithMsg:111`.

**Fix:** envolver ambos parse en try/catch con `localStorage.removeItem` en el catch, y mover el registro de listeners arriba del parse.
**Esfuerzo:** S

### 🟠-8. El checkout puede navegar a `undefined`

`src/components/buy-button.tsx:88-90`

```tsx
setTimeout(() => {
  window.location.href = result.redirect_url;
}, 600);
```

**Por qué importa:** `/api/checkout` devuelve tal cual lo que responda el webhook de n8n (`route.ts:80-81`). Si el flujo de n8n cambia el nombre del campo, devuelve `{ok:true}`, o Mercado Pago falla y n8n responde 200 con otro shape, el usuario ve el toast "¡Redirigiendo a Mercado Pago!" y termina en `/undefined` → 404. Venta perdida sin ningún log.

**Fix:** validar `if (!result?.redirect_url) throw new Error('El proveedor de pago no devolvió un link válido')` antes de mostrar el toast de éxito.
**Esfuerzo:** S

### 🟠-9. El checkout cobra el precio de oferta aunque la oferta esté vencida

`src/app/api/checkout/route.ts:39` vs `src/lib/mappers.ts:67-84`

```ts
// checkout: toma sale_price sin mirar fechas
const price = parseFloat(product.sale_price || product.regular_price || product.price || '0');
```
```ts
// mappers: la vidriera SÍ valida vigencia
function isSaleActive(wooProduct: any): boolean {
  if (!wooProduct.on_sale) return false;
  if (!wooProduct.sale_price) return false;
  if (wooProduct.date_on_sale_from_gmt) { ... }
```

**Por qué importa:** en WooCommerce, una oferta *programada para el futuro* o *ya vencida* deja `sale_price` cargado con `on_sale: false`. La ficha de producto muestra USD 900 (regular, correcto) y el checkout genera la preferencia de Mercado Pago por USD 700. La joyería cobra de menos y no se entera hasta conciliar.

**Fix:** exportar `isSaleActive` de `mappers.ts` y usarla en el checkout, o mejor: llamar a `mapWooCommerceProduct(product)` en la ruta de checkout y usar `product.price.usd`, así hay un solo lugar donde se decide el precio.
**Esfuerzo:** S

### 🟠-10. Los formularios del footer rompen el lead si el teléfono lleva `+` o el nombre lleva `&`

`src/components/layout/footer.tsx:50-51` (y 57-58, 66-67, mismo patrón)

```tsx
const message = `🔔 *Suscripción a Promociones*%0A%0A👤 Nombre: ${subName.trim()}%0A📱 WhatsApp: ${subPhone.trim()}...`;
window.open(`https://wa.me/${appSettings.whatsAppNumber}?text=${message}`, '_blank');
```

**Por qué importa:** el mensaje se interpola crudo en el query string sin `encodeURIComponent`. El placeholder del campo dice "598 99 123 456" pero mucha gente escribe `+598 99 123 456`: en un query string, `+` se decodifica como espacio → el teléfono llega como "598 99 123 456" sin el `+`, o peor, un `&` en el nombre ("Ana & Luis") corta el mensaje ahí y el teléfono nunca llega. Los otros tres puntos del sitio (`whatsapp.ts:20`, `page.tsx:130`, `checkout/failure/page.tsx:7`) sí usan `encodeURIComponent`; solo el footer no.

Nota aparte: estos tres formularios (suscripción, guía de tallas, agendar cita) **no persisten nada**. Abren WhatsApp y setean `subSent = true`. El checkbox "Acepto recibir promociones" (línea 122) no queda registrado en ningún lado, lo cual para una base de marketing es un problema de consentimiento, no solo técnico.

**Fix:** `encodeURIComponent(message)` con `\n` reales en vez de `%0A` literales; y postear el lead a un endpoint propio antes de abrir WhatsApp.
**Esfuerzo:** S (encoding) / M (persistencia)

### 🟠-11. `/api/virtual-tryon`: URL hardcodeada, sin límite de tamaño, y filtra el error interno

`src/app/api/virtual-tryon/route.ts:3, 9, 27`

```ts
const TRYON_WEBHOOK_URL = process.env.N8N_TRYON_WEBHOOK_URL || 'https://n8n.axion380.com.br/webhook/ja-tryon';
...
if (!photoDataUri || !jewelryType) { ... }   // única validación
...
return NextResponse.json({ success: false, error: error.message }, { status: 500 });
```

**Por qué importa:** tres cosas. (a) Es exactamente el fallback hardcodeado que se sacó de `/api/checkout` en la ronda anterior; quedó vivo acá, así que la URL del webhook sigue en el código (y en el bundle del server, no del cliente — no es fuga, pero sí acopla el repo a una infra puntual). (b) No hay zod ni límite de tamaño: los Route Handlers de Next no tienen límite de body por defecto, así que un POST con 80 MB de base64 se parsea entero en memoria del proceso Node de Hostinger. El rate limit de 5/min por IP acota, no elimina: 5 × 80 MB por minuto y por IP alcanza para tumbar un shared hosting. (c) `error.message` se devuelve al cliente — si falla el fetch, el mensaje puede incluir la URL interna de n8n.
Además, esa foto es un rostro identificable que se manda a un tercero sin ningún aviso de privacidad en el modal (`virtual-try-on.tsx:78-85`).

**Fix:** zod con `photoDataUri: z.string().max(~7_000_000)` y regex de `data:image/(jpeg|png);base64,`; `enum` para `jewelryType`; sacar el fallback de URL (500 con log si falta la env); devolver mensaje genérico. Y un renglón de aviso en el modal.
**Esfuerzo:** S

### 🟠-12. Los inserts del chat en Supabase son fire-and-forget

`src/app/api/chat/route.ts:53-57` y `:100-104`

```ts
await supabaseAdmin.from('chat_messages').insert({ session_id: sessionToken, role: 'user', content: message });
// no se lee { error }
```

Compará con la línea 50, donde sí se hace `if (historyError) throw historyError`.

**Por qué importa:** si el insert falla (FK violada, tabla llena, RLS mal aplicada tras un `db reset`), la ruta devuelve 200 con la respuesta de Alma y el mensaje nunca se guarda. El usuario ve una conversación normal; la base queda con huecos; y como el historial que ve Alma sale de esa misma tabla (línea 43), la conversación siguiente arranca sin contexto. Falla silenciosa por partida doble.
Caso concreto y probable: la cookie `chat_session` dura 7 días (`chat-session/route.ts:30`) pero nadie valida que la fila siga existiendo. Si se limpian sesiones viejas en Supabase, el visitante que vuelve tiene una cookie apuntando a un UUID inexistente → el `INSERT` viola la FK `chat_messages_session_id_fkey` → se traga el error → Alma contesta pero nada persiste, para siempre en ese navegador.

**Fix:** chequear `{ error }` de los dos inserts y loguear; y en `/api/chat-session`, si hay cookie, verificar con un `select id` que la sesión exista antes de darla por buena (si no existe, crear una nueva y resetear la cookie).
**Esfuerzo:** S

### 🟠-13. `catch` vacíos y errores que se tragan

- `src/components/chat-widget.tsx:162` → `} catch (err) { }` — si `/api/messages` empieza a devolver 500 o la sesión expira, el polling falla en silencio para siempre.
- `src/components/chat-widget.tsx:64-68` → si `/api/chat-session` falla, solo `console.error`; el usuario escribe, `/api/chat` responde 401 "No autorizado", y el toast dice "No se pudo obtener respuesta del asesor" sin pista de la causa real.
- `src/app/api/chat/route.ts:97` → `data.choices[0].message.content` sin guarda; si OpenAI devuelve `choices: []` (content filter), tira `TypeError` que cae al catch genérico → 500 "No se pudo procesar el mensaje".
- `src/services/productService.ts:22-24` → `if (!response.ok) return []`. Un 502 de WooCommerce se ve idéntico a "no hay productos en esta categoría": la página muestra "No se encontraron piezas en esta categoría" con un catálogo caído. Nadie se entera de que Woo está roto.

**Fix:** el de `productService` es el que más duele: distinguir "vacío" de "error" (devolver `{ products, error }`) y mostrar un estado de error real en `/collections`.
**Esfuerzo:** S cada uno

### 🟠-14. El build depende de tener salida a Google Fonts

`src/app/layout.tsx:3` — `import { Manrope, Playfair_Display } from 'next/font/google'`

Verificado acá: `npm run build` falla con `Failed to fetch font 'Manrope' from Google Fonts` (el proxy del sandbox bloquea `fonts.googleapis.com`). `ignoreBuildErrors` no ayuda: es un error de webpack, no de TypeScript.

**Por qué importa:** `next/font/google` descarga las fuentes **en tiempo de build**. Cualquier CI, contenedor o panel de Hostinger sin egress a `fonts.googleapis.com` (o con un corte momentáneo de Google) rompe el deploy entero, y el mensaje de error no sugiere que sea eso. Ya pasó una vez acá.

**Fix:** self-hostear las dos fuentes (`next/font/local` con los `.woff2` en `public/fonts/`). Saca la dependencia de red del build y mejora LCP.
**Esfuerzo:** S
**Nota:** no verifiqué si existe `public/` en el deploy real — ninguna de las dos copias que tengo la incluye (ver 🟠-15).

### 🟠-15. `public/` no existe en ninguna de las dos copias, y el home referencia videos locales

`src/app/page.tsx:19,26,33` → `/videos/luz-eterna.mp4`, `/videos/coleccion-aura.mp4`, `/videos/alianzas.mp4`

Ni `/home/claude/ja/build-test/public/` ni `/mnt/user-data/uploads/joyeriawp-main/public/` existen, y el `.tgz` del snapshot tampoco los trae.

**Por qué importa:** si en el servidor real tampoco están, las tres tarjetas de "Piezas Destacadas" del home muestran un `<video>` negro vacío (los videos no tienen `poster`, así que ni siquiera hay imagen de respaldo). Es lo primero que ve un visitante después del hero.

**No verificado:** puede ser simplemente que el snapshot excluyó binarios. **Chequealo en el server antes de actuar** (`ls public/videos`). Independientemente de eso, agregarles `poster` es gratis.
**Esfuerzo:** S

### 🟠-16. Sin `.gitignore` en el repo

No hay `.gitignore` en ninguna de las dos copias ni en el `.tgz`. En `build-test` hay un `.env.local` con `OPENAI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `WOO_CONSUMER_SECRET` y `N8N_WEBHOOK_SECRET` reales.

**Por qué importa:** un `git add .` distraído commitea todas las claves, incluida la service_role, que bypassea el RLS que se acaba de cerrar. Sería revertir el fix crítico #1 de la ronda anterior de la peor manera posible.

**No verificado:** puede existir en el repo real y haberse filtrado al empaquetar. **Confirmalo con `git check-ignore .env.local`.** Si no está: crearlo ya (`.env*.local`, `.next/`, `node_modules/`, `*.tsbuildinfo`).
**Esfuerzo:** S

---

## 🟡 Deuda técnica

### 🟡-17. `ignoreBuildErrors: true` sigue prendido — y ESLint ni siquiera está instalado

`next.config.ts:7-14`

```ts
typescript: { ignoreBuildErrors: true },
eslint:     { ignoreDuringBuilds: true },
```

Verificado: `npx tsc --noEmit` → **0 errores**. O sea que `ignoreBuildErrors` no está tapando nada hoy; solo garantiza que el próximo error de tipos llegue a producción sin avisar.
Peor: no hay ni `eslint` en `node_modules`, ni en `devDependencies`, ni archivo de config. El script `"lint": "next lint"` del `package.json` no puede correr. `ignoreDuringBuilds: true` está tapando que **no hay linting en absoluto**.

**Fix:** `ignoreBuildErrors: false` ya (no rompe nada). Para lint: instalar `eslint` + `eslint-config-next` y correrlo una vez para ver el tamaño del problema antes de flipear `ignoreDuringBuilds`; o sacar el script `lint` para que deje de mentir.
**Esfuerzo:** S / M

### 🟡-18. El `history` que manda el cliente se valida y se descarta

`src/components/chat-widget.tsx:240-251` vs `src/app/api/chat/route.ts:12,27`

```tsx
// cliente: arma y manda historial
const history = messages.map(m => ({ role: ..., content: m.text }));
body: JSON.stringify({ message: text, history: history.slice(-6) })
```
```ts
// server: lo tipa en el schema...
history: z.array(z.object({ role: z.string(), content: z.string() })).optional(),
// ...y después:
const { message } = parsed.data;   // history nunca se usa
```

**Por qué importa:** doble fuente de verdad confirmada — el server arma el contexto desde Supabase (línea 74) e ignora lo del cliente. No es un bug de seguridad (mejor así: el cliente no puede inyectar contexto falso), pero (a) manda payload al pedo en cada mensaje, (b) el schema le dice al próximo dev que ese campo importa, y (c) `history` se calcula desde `messages`, que dentro de `handleOpenWithMsg` es un **stale closure** (el `useEffect` de la línea 137 tiene deps `[]`, así que captura el `messages` inicial) — un bug latente que hoy no se manifiesta solo porque el dato se tira.

**Fix:** sacar `history` del schema y del body del cliente. Dejar un comentario de una línea diciendo que el contexto lo arma el server desde Supabase.
**Esfuerzo:** S

### 🟡-19. Estado y UI muertos dentro del widget

`src/components/chat-widget.tsx`

- **:40** `const [sessionId, setSessionId] = useState<string>('')` — `setSessionId` no se llama nunca (grep confirmado), `sessionId` no se lee nunca. Quedaron dos comentarios fósiles ("sessionId is already set via cookie/token logic", líneas 200 y 216) de cuando se sacó de `sessionStorage`.
- **:51** `showDebug` — no hay ningún `setShowDebug(true)` en el código; solo el `false` del botón de cerrar (línea 313). Toda la "Consola de Monitor de Tráfico" (líneas 307-342, ~35 líneas) es inalcanzable, y `addDebugLog` (línea 184) llena un array que nadie puede ver.
- **:87 y :119** `sessionStorage.setItem('alma_product_context', ...)` con el comentario "para que processMessage lo use" — `processMessage` no lee esa clave. Grep: solo aparece en el set y el remove.
- **:401-407 y :463-469** — dos bloques `{isTyping && (...)}` idénticos en función, con estilos distintos, en el mismo contenedor: mientras Alma responde se ven **dos** globos de puntitos suspensivos, uno blanco y uno gris.
- **:177** `.substr()` — deprecado.

**Fix:** borrar `sessionId`/`setSessionId`, el `alma_product_context`, y uno de los dos indicadores de typing. El panel de debug: o se le pone un trigger (doble click en el header, `?debug=1`) o se borra.
**Esfuerzo:** S

### 🟡-20. Código muerto restante (todo confirmado por grep, cero importadores)

| Archivo | Verificación | Detalle |
|---|---|---|
| `src/lib/supabase.ts` | `grep "@/lib/supabase'"` → 0 resultados | **Apunta al proyecto Supabase VIEJO**: `'https://lgdhnkfxberjzctgywiz.supabase.co'` hardcodeado como fallback (línea 3). Tipa `Order`/`OrderItem`/`KANBAN_COLUMNS` para un panel Kanban que **no existe** en este repo (no hay ruta, ni componente, ni tablas `orders`/`order_items` en las migraciones). Además tiene un `throw` a nivel de módulo (línea 7) que rompería el render de cualquier página que lo importe sin la anon key. |
| `src/integrations/supabase/client.ts` | 0 importadores (solo se menciona a sí mismo en un comentario, línea 34) | Cliente con la **anon key**, que desde el fix de RLS ya no puede leer ni escribir `chat_messages`/`chat_sessions`. Si alguien lo usa creyendo que sirve, va a debuggear un permission denied por un rato. |
| `src/lib/firebase.ts` | 0 importadores | Ya era inerte (`db = null`), y `firebase` se sacó de `package.json` en la ronda anterior. |
| `src/components/product-card.tsx` | `grep "ProductCard"` → solo su propia definición | El componente de tarjeta de producto quedó huérfano cuando `/collections` pasó a renderizar las tarjetas inline (`collections/page.tsx:122-172`). |
| `src/ai/flows/virtual-try-on.ts` + `src/ai/dev.ts` + `src/ai/genkit.ts` | `dev.ts` solo lo importa `dev.ts`, y no hay script que corra `dev.ts` | **Segunda implementación del probador virtual**, vía Genkit/Gemini, en paralelo con la que sí se usa (n8n vía `/api/virtual-tryon`). Arrastra `genkit` + `@genkit-ai/google-genai` + `dotenv`. |
| 22 componentes de `src/components/ui/` | scan de imports por path | Sin uso: `accordion, alert-dialog, alert, avatar, calendar, carousel, chart, checkbox, collapsible, dropdown-menu, form, menubar, pagination, popover, progress, radio-group, select, sidebar, slider, switch, table, tabs`. Con ellos quedan sin uso real: `recharts` (solo `ui/chart`), `react-hook-form` (solo `ui/form`), `embla-carousel-react` (solo `ui/carousel`), `react-day-picker` (solo `ui/calendar`), y ~14 paquetes `@radix-ui/*`. Más `@types/dompurify`, que no lo usa nadie (`isomorphic-dompurify` trae sus propios tipos). |
| Constantes de mapa en `footer.tsx:10,15` | no referenciadas | Con la dirección equivocada (ver 🔴-5). `NEXT_PUBLIC_GOOGLE_MAPS_KEY` (línea 14) solo alimenta la constante muerta → la env var no sirve para nada. |

**Fix:** borrar los 5 primeros archivos sin más trámite. Los `ui/` : ojo, es scaffolding de shadcn y borrarlo tiene costo si mañana se necesita — pero `ui/chart` (recharts, ~500 KB) y `ui/calendar` (react-day-picker) sí conviene sacarlos con sus deps.
**Esfuerzo:** S

### 🟡-21. Tablas de Supabase sin tipos y sin consumidor

El proyecto nuevo (`jqzdtbxsehjyyyxukyaj`) tiene 9 tablas. `src/integrations/supabase/types.ts` tipa 2 (`chat_messages`, `chat_sessions`) y grep de `.from(` en todo `src/` devuelve exactamente esas 2. Las otras 7 —`productos`, `chat_handoff`, `handoff`, `sync_log`, `clients`, `transactions`, `prospectos`— **no las toca una sola línea de esta app** (presumiblemente las escribe n8n).

Duplicaciones conceptuales que hay que resolver antes de que alguien escriba en la equivocada:
- `handoff` vs `chat_handoff` — dos tablas para lo mismo, ninguna con consumidor acá.
- `prospectos` vs `chat_prospects` — `chat_prospects` sigue sin existir (lo dice 09) y `prospectos` sí existe; el candidato natural para el fix de 🔴-2 es `prospectos`.
- `productos` vs WooCommerce — el catálogo que ve el cliente sale 100% de Woo (`woocommerce.ts`). `productos` en Supabase es otra copia del catálogo, sin ningún código que la lea ni la sincronice desde acá. Si `sync_log` sugiere que n8n la sincroniza, hay dos fuentes de verdad de precios y stock.

**Por qué importa:** hoy no rompe nada, pero es la trampa clásica: el próximo que quiera "guardar el lead" o "buscar productos" va a elegir una tabla al azar entre dos que parecen equivalentes.

**Fix:** decidir cuál de cada par sobrevive, dropear la otra, regenerar `types.ts` con `supabase gen types typescript` (que ya va a tipar las 9), y documentar en el RUNBOOK quién escribe qué (app vs n8n).
**Esfuerzo:** M
**No verificado:** no me conecté al proyecto Supabase; trabajo con la lista de tablas que me pasaste.

### 🟡-22. Links legales muertos y botones decorativos

- `src/components/layout/footer.tsx:220-221` → "Política de Privacidad" y "Términos y Condiciones" apuntan a `href="#"`. Para un sitio que recolecta nombre, teléfono, email, **fotos de la cara** del visitante y transcripciones de conversaciones, y que cobra con Mercado Pago, no tener esas dos páginas es un problema real, no cosmético.
- `src/components/layout/header.tsx:104-111` → los botones de búsqueda (lupa) y favoritos (corazón) no tienen `onClick` ni `href`. Están en el header de todas las páginas prometiendo dos features que no existen. La API ya soporta búsqueda (`/api/products?search=`), así que la lupa es media hora de trabajo; los favoritos son un feature completo.

**Fix:** escribir las dos páginas legales; y o se implementa la búsqueda o se sacan los dos íconos.
**Esfuerzo:** M

### 🟡-23. `price.uyu` es una mentira, y `.env.example` sigue incompleto

`src/lib/mappers.ts:112-115`

```ts
price: {
  usd: priceVal,
  uyu: priceVal    // ← el mismo número
},
```

El tipo `Product` (`products.ts:15-18`) promete dos monedas y devuelve el mismo valor en las dos. Hoy no se ve porque toda la UI renderiza `price.usd`, pero el primer dev que muestre `price.uyu` va a publicar un anillo de USD 900 a "$U 900" (≈ USD 22).
**Fix:** o se borra `uyu` del tipo, o se convierte de verdad con una cotización.

`.env.example`: le faltan `N8N_TRYON_WEBHOOK_URL` (usada en `virtual-tryon/route.ts:3`) y la API key de Google/Gemini que necesita `ai/genkit.ts` para que `/recommendations` funcione. También sigue trayendo un valor real por defecto para `N8N_CHECKOUT_WEBHOOK_URL`, lo cual contradice el fix de la ronda anterior de no adivinar URLs.
**Esfuerzo:** S

---

## 🔵 Mejora

### 🔵-24. El catálogo es invisible para Google y no tiene paginación

`src/app/collections/page.tsx:1` (`'use client'`) + `productService.ts:18`

La página de colecciones es un componente cliente que hace `fetch('/api/products')` en un `useEffect`. El HTML que recibe el buscador (y el preview de WhatsApp/Instagram) son seis rectángulos de skeleton. Para un e-commerce, el catálogo es *el* activo de SEO.
Además `getProducts` no manda `page` ni `per_page` desde `/collections`, así que la API usa el default `per_page: '20'` (`api/products/route.ts:15`): **el sitio muestra como máximo 20 productos** y no hay forma de ver el resto. Hay un `ui/pagination.tsx` sin usar en el repo.

**Fix:** pasar `/collections` a Server Component con `fetchWooCommerce` directo (como ya hace `products/[id]/page.tsx`) + `generateMetadata`, y dejar solo el filtro como isla cliente. Agregar paginación o scroll infinito.
**Esfuerzo:** L

### 🔵-25. Imágenes sin optimizar, cache incoherente

`next.config.ts:17` (`images.unoptimized: true`) + `unoptimized` explícito en `collections/page.tsx:130` y `products/[id]/page.tsx:46` + `<img>` crudo en `buy-button.tsx:145`. Se sirven los JPG originales de WooCommerce a un celular: en una grilla de 20 productos son varios MB.
Y los headers no cierran: `/api/products` y `/api/categories` mandan `Cache-Control: no-store`, mientras `/api/products/[id]` manda `public, s-maxage=60, stale-while-revalidate=300`. El listado, que es lo que más se pega, es el que no cachea.

**Fix:** si el hosting aguanta, sacar `unoptimized`. Como mínimo, poner `s-maxage=60, stale-while-revalidate=300` también en el listado y las categorías (el cache en memoria de `woocommerce.ts` ya asume 2 min de tolerancia, así que `no-store` en el header no está protegiendo nada).
**Esfuerzo:** S

### 🔵-26. El fallback a caché expirada no tiene techo

`src/lib/woocommerce.ts:125-128`

```ts
if (method.toUpperCase() === "GET" && cached) {
  console.warn(`Fallback a cache expirado para ${endpoint} tras error de red.`);
  return cached.data;
}
```

**Por qué importa:** está bien pensado como resiliencia, pero no tiene límite de antigüedad. Si WooCommerce se cae un viernes a la noche, el sitio sigue mostrando el catálogo del viernes indefinidamente —precios, stock, productos ya vendidos— y lo único que lo delata es un `console.warn` en los logs del server. Alguien puede comprar un producto agotado hace tres días. El `memCache` tampoco tiene tope de tamaño ni evicción.

**Fix:** un `STALE_MAX_MS` (30-60 min); pasado eso, propagar el error para que la UI muestre "catálogo temporalmente no disponible". Y un tope de entradas en el Map.
**Esfuerzo:** S

### 🔵-27. El polling del chat no escala

- No hay índice sobre `chat_messages(session_id, created_at)` en ninguna de las dos migraciones — solo el PK y la FK. Cada poll (1 cada 3 s por widget abierto) escanea.
- `/api/messages` devuelve **toda** la conversación en cada poll, sin `since`. Una charla de 50 mensajes se retransmite entera 20 veces por minuto.
- `chat_sessions.updated_at` existe y nadie la actualiza (no hay trigger ni código). `chat_messages.metadata` y `chat_sessions.metadata` siempre vacías.
- No hay política de retención: las conversaciones (que contienen datos personales) se acumulan sin borrado.

**Fix:** `CREATE INDEX ON public.chat_messages (session_id, created_at);`, parámetro `?since=`, y un job de purga a 90 días.
**Esfuerzo:** S

### 🔵-28. Rate limit en memoria, sin CSP

`src/middleware.ts:16` — el `Map` de hits no sobrevive a un reinicio ni se comparte entre instancias, lo cual ya está documentado honestamente en el comentario. Es una primera capa correcta; el siguiente paso es Upstash/Redis si el sitio crece.
Falta `Content-Security-Policy` en `withSecurityHeaders` (línea 49). El sitio inyecta un `<script>` de TradingView a mano (`ticker-tape.tsx:16-35`) y carga videos de un CDN externo (`page.tsx:156`, `goods-vod.kwcdn.com`) e imágenes de imgur (`reviews-carousel.tsx`), así que una CSP requiere trabajo de inventario — pero es el header que falta.
**Esfuerzo:** M

### 🔵-29. `/recommendations` es una ruta huérfana con LLM abierto

`src/app/recommendations/page.tsx` — no está enlazada desde el header (`navLinks`, header.tsx:11-15) ni desde el footer. Se llega solo escribiendo la URL. Llama a un flow de Genkit (`'use server'`) que le pega a Gemini: **el middleware no la cubre** (los `RATE_LIMITS` son solo paths `/api/*`, y esto es una Server Action sobre `/recommendations`), así que es una llamada a LLM sin límite para cualquiera que conozca la URL. Y las recomendaciones no están conectadas al catálogo real: el modelo inventa joyas, igual que Alma inventa precios.
**Fix:** o se borra la ruta (y con ella `genkit`), o se le pone rate limit y grounding contra WooCommerce.
**Esfuerzo:** S (borrar) / L (hacerla real)

### 🔵-30. Reseñas hardcodeadas con tiempos relativos

`src/components/reviews-carousel.tsx:15-60` — cinco reseñas fijas con `time: "8 meses atrás"`. Dentro de un año van a seguir diciendo "8 meses atrás". Las fotos apuntan a `i.imgur.com`, fuera del control del negocio.
**Fix:** guardar fechas absolutas y calcular el relativo en render; idealmente traerlas de la API de Google Business.
**Esfuerzo:** S

---

# 3. Lo que está a medio construir

**Alma sin tool calling.** `/api/chat` manda un system prompt de 12 líneas a `gpt-4o-mini` y nada más. No tiene acceso al catálogo: cuando un cliente pregunta "¿cuánto sale la alianza de oro 18k?", el modelo inventa un número plausible. El prompt incluso lo empuja a inventar ("Si te preguntan por precios, usa siempre USD"). Es exactamente el problema que tenía el agente de n8n, movido de lugar.
*Falta:* definir `tools` en el request (`buscar_productos`, `ver_producto`), un loop de tool calls que llame a `fetchWooCommerce`, y una instrucción explícita de "si no encontrás el producto, decí que no lo tenés" en el prompt. **Es el trabajo más valioso que queda.** Esfuerzo: M.

**El handoff a humano: la mitad de la cañería, sin la otra mitad.** Existe `/api/webhook` (recibe mensajes firmados con HMAC y los inserta como `assistant`) y existe el polling del widget que los mostraría. Pero *nada dispara el handoff*: Alma no tiene forma de escalar, no hay botón de "hablar con una persona", y las tablas `handoff`/`chat_handoff` de Supabase no las toca esta app. O sea: la infraestructura para que un humano intervenga en el chat está construida y no tiene interruptor.
*Falta:* una tool/intent de escalamiento que escriba en `chat_handoff` y notifique por n8n, y algún indicador en la UI ("te estamos derivando con un asesor"). Esfuerzo: M.

**Captación de prospectos.** Cuatro formularios piden datos (onboarding del chat, suscripción, guía de tallas, agendar cita) y **ninguno persiste nada**: uno guarda en localStorage y tres abren WhatsApp. La tabla `prospectos` existe en Supabase, vacía desde la app. Esfuerzo: M para los cuatro.

**Probador virtual, dos implementaciones, ninguna terminada.** La viva (n8n) no valida tamaño ni tipo, no pide consentimiento para mandar una foto de la cara a un tercero, y clasifica cualquier cosa que no sea aro/anillo como collar (`virtual-try-on.tsx:32-37`: una pulsera se prueba como collar). La muerta (Genkit) es una segunda versión del mismo feature que nadie ejecuta. Esfuerzo: M.

**Panel Kanban de pedidos.** `src/lib/supabase.ts` tiene los tipos completos (`Order`, `OrderItem`, 5 columnas, 3 orígenes) para un panel de gestión de pedidos que no existe: no hay ruta, no hay componente, no hay tablas. Alguien planificó un back-office y quedó solo el modelo de datos. Decidir: se construye o se borra. Esfuerzo: L (construirlo).

**Post-compra.** `/checkout/success` dice "¡Pago Exitoso!" incondicionalmente: declara `searchParams` (línea 8) y nunca lo lee, no verifica nada contra Mercado Pago, y no hay ninguna tabla de órdenes en este repo. Promete "Recibirás un email de confirmación" que esta app no manda (dependerá de n8n; no lo verifiqué). Cualquiera que escriba `/checkout/success` en la barra ve "pago exitoso". Esfuerzo: M.

**Búsqueda y favoritos.** Íconos en el header, cero implementación. La búsqueda ya está soportada por la API. Esfuerzo: S (búsqueda) / L (favoritos).

---

# 4. Código muerto restante

Ver la tabla de 🟡-20 — está toda verificada por grep de importadores. Resumen para borrar de una:

```
src/lib/supabase.ts                      # 0 importadores + apunta al proyecto Supabase viejo
src/integrations/supabase/client.ts      # 0 importadores (solo un comentario que se menciona a sí mismo)
src/lib/firebase.ts                      # 0 importadores, ya era inerte
src/components/product-card.tsx          # 0 referencias a "ProductCard"
src/ai/dev.ts                            # ningún script del package.json lo ejecuta
src/ai/flows/virtual-try-on.ts           # solo lo importa dev.ts
src/ai/genkit.ts + src/ai/flows/personalized-recommendations.ts   # solo si se borra /recommendations
```

Y a nivel símbolo, dentro de archivos vivos: `sessionId`/`setSessionId`, el panel `showDebug` completo, `alma_product_context`, uno de los dos indicadores de typing (chat-widget.tsx), `GOOGLE_MAPS_EMBED_URL` y `EMBED_PLACE_URL` (footer.tsx), el parámetro `searchParams` de `/checkout/success`, el `import Script` sin usar de `layout.tsx:12`, y el `import { appSettings }` sin usar de `page.tsx:9`.

Los 22 componentes `ui/` sin importadores los dejo aparte: son scaffolding de shadcn, y borrarlos es una decisión de criterio. Los que sí conviene sacar por peso son `ui/chart.tsx` (arrastra `recharts`) y `ui/calendar.tsx` (arrastra `react-day-picker`).

**Nota honesta:** no reviso si algo de esto se importa desde fuera de `src/` (scripts, tests) — no hay ni tests ni scripts en el repo, así que el riesgo es nulo.

---

# 5. Top 10 priorizado — qué haría yo con una semana

| # | Qué | Por qué primero | Esfuerzo |
|---|---|---|---|
| 1 | **Persistir el lead del chat** (🔴-2) + los tres formularios del footer (🟠-10) | Es la razón de existir del sitio. Cada día que pasa se pierden teléfonos de gente que ya levantó la mano. | S + S |
| 2 | **Arreglar los mensajes duplicados** (🔴-1) | Es lo primero que ve cualquier cliente que use el chat. Hace que el producto parezca roto, porque lo está. | M |
| 3 | **`limit(10)` invertido en el historial de Alma** (🔴-3) | Una línea. Convierte a Alma de "se olvida de todo" a "sigue la conversación". | S |
| 4 | **Unificar la dirección de la boutique** (🔴-5) y el número de WhatsApp (🔴-4) | Estás mandando clientes al barrio equivocado y a dos números distintos. Cero código, puro criterio. | S |
| 5 | **Conectar el botón "Consultar" del home al chat propio** (🔴-4) y el evento `open-chat-with-message` (🔴-6) | Desbloquea de golpe 35 líneas de features ya escritas y deja de fugar tráfico a WhatsApp. | S |
| 6 | **Tool calling en `/api/chat`** | El diferencial del proyecto. Hoy Alma inventa precios; con dos tools deja de hacerlo y empieza a vender de verdad. | M |
| 7 | **`ignoreBuildErrors: false`** (🟡-17) + validar `redirect_url` (🟠-8) + precio de oferta en checkout (🟠-9) + try/catch en `localStorage` (🟠-7) | Cuatro fixes chicos que cierran las vías de falla silenciosa. tsc ya da 0, así que flipear el flag es gratis hoy y caro después. | S |
| 8 | **Autohostear las fuentes** (🟠-14) + confirmar `public/videos` (🟠-15) y `.gitignore` (🟠-16) | Un build que depende de la red de Google es una bomba de tiempo en Hostinger. Los otros dos son verificaciones de 5 minutos con consecuencias grandes. | S |
| 9 | **Borrar el código muerto** (🟡-20) + limpiar el estado muerto del widget (🟡-19) | Media hora, y el próximo que abra el repo deja de tener que adivinar cuál de los tres clientes de Supabase es el bueno. | S |
| 10 | **`/collections` a Server Component con paginación** (🔵-24) | El catálogo hoy no existe para Google y muestra 20 productos como máximo. Es el trabajo más grande de la lista y por eso va último, pero es el que mueve la aguja comercial a mediano plazo. | L |

Fuera del top 10 pero antes de considerar esto "terminado": las dos páginas legales (🟡-22) y el `Content-Security-Policy` (🔵-28).

---

# 6. Qué NO verifiqué

Para que quede explícito:

- **No corrí `npm run build` completo.** El sandbox bloquea `fonts.googleapis.com` y el build muere ahí (eso mismo es el hallazgo 🟠-14). `npx tsc --noEmit` sí corrió: **0 errores**.
- **No me conecté a Supabase.** La lista de 9 tablas es la que me pasaste; no verifiqué columnas, índices reales ni si la migración `20260815020000_fix_chat_rls_security.sql` fue aplicada.
- **No verifiqué los flujos de n8n.** Todo lo que digo sobre qué hace n8n con los webhooks es inferencia desde el lado de esta app.
- **No verifiqué el server de producción**: si existe `public/videos/`, si existe `.gitignore` en el repo git real, ni si `SUPABASE_SERVICE_ROLE_KEY` está configurada en el entorno de deploy (sin ella, las 4 rutas del chat tiran 500 — es el pendiente #1 del doc 09).
- **No probé el sitio en un navegador.** Los bugs de UI (mensajes duplicados, doble indicador de typing, videos vacíos) están deducidos del código, no observados corriendo.
- **No auditué `src/components/ui/*`** más allá de verificar quién los importa: son componentes de shadcn sin modificar aparente.
