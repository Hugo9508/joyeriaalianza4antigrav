---
titulo: Plan maestro — de "template bien vestido" a boutique premium
fecha: 2026-08-15
fuentes: 11-identidad-premium.md (auditoría visual) + 12-deuda-tecnica.md (auditoría técnica)
---

# Lo que hay que entender antes de leer la lista

Las dos auditorías, hechas por separado y sin hablarse, llegaron al mismo diagnóstico desde ángulos distintos: **el sitio se ve mejor de lo que funciona.** La composición tiene ambición real (el ritmo escalonado de la grilla, el video rotado, la máquina de estados del checkout), pero abajo hay cosas que directamente no andan: el chat duplica cada mensaje, los leads del chat no llegan a nadie, y toda la sección de reseñas del home renderiza en Times New Roman por una variable CSS que no existe.

La buena noticia es que casi todo lo grave es barato de arreglar. Las 8 cosas de mayor impacto suman menos de un día de trabajo.

---

## Bloque 1 — Las 8 cosas que arreglaría esta semana

Ordenadas por (impacto ÷ esfuerzo). Todo verificado en código, con archivo:línea.

| # | Qué | Dónde | Por qué duele | Esfuerzo |
|---|---|---|---|---|
| 1 | **El chat muestra todo duplicado** | `chat-widget.tsx:177` | El mensaje local usa `Math.random()` como id, el que vuelve del server es un UUID de Postgres. El dedupe por id nunca matchea → cada mensaje aparece dos veces a los ≤3s | S |
| 2 | **Los leads del chat mueren en el navegador** | `chat-widget.tsx` (6 usos de `userInfo`) | El nombre y WhatsApp que el cliente carga nunca se mandan al servidor. `processMessage` postea solo `{message, history}`. **La joyería recibe cero leads del chat** | S |
| 3 | **Reseñas del home en Times New Roman** | `reviews-carousel.tsx:190,206,276,318,406` | Usa `var(--font-headline)` que no está definida en ningún archivo (la real es `--font-playfair`), y pide Cormorant Garamond que no se carga. Cae al serif del sistema | S |
| 4 | **Alma ve los 10 mensajes más viejos** | `/api/chat:43-48` | `order ascending + limit(10)` → a partir del mensaje 11 el contexto queda congelado en el arranque de la charla | S |
| 5 | **El botón "Consultar" del home saca a la gente del sitio** | `page.tsx:119-132` | Busca el widget `@n8n/chat` que ya se borró. La condición nunca se cumple → siempre cae al fallback de WhatsApp, y encima con el número equivocado | S |
| 6 | **Tres dorados distintos conviviendo** | `globals.css:13`, `chat-widget.tsx` (×7), `reviews-carousel.tsx:173` | `#d4af37` vs `#d4a843` hardcodeados. El chat no es de la misma familia visual que el resto del sitio | S |
| 7 | **El foco es invisible en todos los botones dorados** | `globals.css:25` vs `:13` | `--ring` es idéntico a `--primary` → el anillo de foco se pierde sobre el botón. Navegación por teclado rota | S |
| 8 | **Dos números de WhatsApp distintos** | `settings.ts:10` (59895435644) vs `whatsapp.ts:22` + 5 lugares (59891264956) | Según por dónde entre el cliente, le escribe a un número o a otro | S |

**Todo el bloque 1 es esfuerzo S.** Es media jornada bien aprovechada.

---

## Bloque 2 — Los errores que dañan la marca

Estos no rompen nada técnicamente, pero contradicen el posicionamiento premium.

**Alma manda gente a la dirección equivocada.** El system prompt (`/api/chat`, línea 68) invita a "visitar la boutique en Carrasco". La tienda está en **Mercedes 1211**. El footer todavía tiene dos juegos de constantes de mapa, uno con cada dirección — las de Carrasco son código muerto que quedó dando vueltas.

**El precio tiene contraste 1.82:1.** Dorado sobre fondo claro, en los cuatro lugares donde aparece un precio. El mínimo accesible es 4.5:1. En una pantalla con brillo bajo o al sol, el precio de una alianza de miles de dólares es prácticamente ilegible. La auditoría encontró 13 fallos de contraste con ratios calculados (header del chat 1.94:1, badges de stock 3.00:1, botones de WhatsApp 3.30:1).

**El video de "El arte de la orfebrería" se sirve desde el CDN de Temu** (`goods-vod.kwcdn.com`). Para una marca que vende artesanía de lujo, alojar el video institucional en la infraestructura de Temu es un riesgo de percepción — y de disponibilidad, porque ese CDN puede cortar el hotlinking cuando quiera.

**Alma mezcla voseo y usted en la misma conversación.** El resto del copy del sitio mezcla los dos registros pero de forma deliberada y consistente por sección; Alma es la única que los mezcla dentro de un mismo mensaje.

**Cuatro aspect ratios distintos para la misma foto de producto** (4/3, 3/4, 4/5, 3/4) y cinco anchos de contenedor entre páginas. El lujo se comunica con repetición y ritmo; esto lee como armado por partes.

---

## Bloque 3 — Lo que está a medio construir

**El agente Alma nativo no puede buscar productos.** `/api/chat` habla directo con GPT-4o-mini pero **no tiene tool calling**. No puede consultar WooCommerce ni la tabla `productos`. O sea: sigue inventando precios exactamente igual que la versión vieja de n8n. Esto era el corazón del problema original y no está resuelto — solo se movió de lugar.

**Hay 35 líneas del widget que son inalcanzables.** Nadie dispara el evento `open-chat-with-message`, así que la tarjeta de producto dentro del chat, el onboarding inline y todo el manejo de `pendingText` nunca se ejecutan. También: `sessionId`/`setSessionId` es estado 100% muerto, `showDebug` nunca se pone en `true` (el panel de debug es inalcanzable), `alma_product_context` se escribe y nunca se lee, y hay **dos indicadores de "escribiendo..." renderizándose juntos**.

**`product-card.tsx` está definido y nunca se importa.** La grilla de colecciones tiene su propia tarjeta inline con otro criterio visual.

**`.description-content`** (`products/[id]/page.tsx:85`) no tiene ni una regla CSS en todo el proyecto. La descripción que viene de WooCommerce sale sin ningún formato.

**`src/lib/supabase.ts` es código muerto apuntando al proyecto Supabase viejo** (`lgdhnkfxberjzctgywiz`), con tipos de un panel Kanban que no existe. Hoy conviven **tres** clientes de Supabase en el código; solo el admin está vivo.

---

## Bloque 4 — Sobre los flujos de n8n (respuesta a la pregunta pendiente)

Consulté la instancia real. Sobre Joyería hay esto:

- **`JA JOYERIA`** — activo, 19 nodos, actualizado hoy. Es el que contiene el keep-alive y lo relacionado al agente.
- **`Sync WooCommerce -> Supabase (Corregido)`** — 358 nodos, **desactivado**. O sea: el sync de stock **existe pero no está corriendo**. Eso explica por qué la tabla `productos` está en el esquema pero probablemente desactualizada. Esto es importante: si querés que Alma consulte precios reales desde Supabase en vez de WooCommerce, este flujo tiene que estar prendido.
- **`Atalaya · Notificador (Telegram)`** — activo, creado hoy. Ya empezaste el sistema de monitoreo del que hablábamos.

Para el monitor de Joyería entonces: los heartbeats reales a vigilar son `JA JOYERIA` (activo) y, si lo prendés, el sync de Woo→Supabase. El resto de los ~100 workflows de la instancia son de otros clientes.

---

## Bloque 5 — El sistema de diseño

El documento `11-identidad-premium.md` trae el `globals.css` y el `tailwind.config.ts` completos y listos para pegar, más el `cva` de `button.tsx` reescrito. Los tokens propuestos están verificados contra WCAG AA: precio 17.6:1, `--gold-ink` 5.9:1, `--gold-soft` sobre tinta 10.4:1.

El principio que ordena la paleta: **el oro es metal, no texto.** Se usa en bordes, filetes, detalles y superficies — nunca para información que hay que leer. Eso solo resuelve de una los 13 fallos de contraste.

---

## Lo que está bien y no hay que tocar

Ambas auditorías coincidieron en preservar: el ritmo escalonado de la grilla (`lg:mt-16`), la microinteracción del video rotado, la pareja tipográfica Playfair + Manrope (está bien elegida, mal aplicada), el contenido de las reseñas, el concepto del ticker de metales, la máquina de estados del checkout, y el emblema del `icon.svg`.

También vale decirlo: **la limpieza de código muerto sí quedó completa** — cero `TODO`, `FIXME`, `HACK` o `LEGACY` en todo `src/`. Y `tsc --noEmit` da **cero errores**, así que poner `ignoreBuildErrors: false` es gratis hoy.

---

## Dos cosas para verificar en el servidor real (5 minutos)

No pude confirmarlas desde acá porque pueden ser artefactos del empaquetado:

1. **No existe la carpeta `public/`** en ninguna de las dos copias que tengo, pero el home referencia `/videos/*.mp4`. Si realmente falta en el server, los videos del home están rotos.
2. **No hay `.gitignore`** y sí hay un `.env.local` con la service_role key. Si eso se commiteó al repo, hay que rotar la key ya.

Bonus del build: `next/font/google` descarga las fuentes en tiempo de build. Si el server de deploy no tiene salida a Google, el build falla — y hoy no hay fallback local configurado.
