# 11 — Identidad Premium: auditoría de dirección de arte y plan de elevación

> Auditoría de identidad visual y experiencia de `joyeriawp-main` (Next.js 15 / App Router / Tailwind / shadcn).
> Vara de medición: oficio de casa de alta joyería (Cartier, Bvlgari, Tiffany) — no para copiar el lenguaje, sino como estándar de ejecución.
> Todo lo que sigue está verificado contra el código. Los archivos que no leí no se opinan.

**Archivos leídos para esta auditoría:**
`tailwind.config.ts`, `next.config.ts`, `src/app/globals.css`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/products/[id]/page.tsx`, `src/app/collections/page.tsx`, `src/app/contact/page.tsx`, `src/app/icon.svg`, `src/components/product-card.tsx`, `src/components/layout/header.tsx`, `src/components/layout/footer.tsx`, `src/components/chat-widget.tsx`, `src/components/buy-button.tsx`, `src/components/ticker-tape.tsx`, `src/components/reviews-carousel.tsx`, `src/components/whatsapp-button.tsx`, `src/components/whatsapp-product-button.tsx`, `src/components/ui/button.tsx`, `src/components/icons.tsx`, `src/lib/settings.ts`, `src/lib/whatsapp.ts`.

---

## 1. Diagnóstico honesto

En la escala "template genérico → boutique de lujo", el sitio está en **35/100: template bien vestido**. Hay ambición real —la composición del hero, el ritmo escalonado de la grilla de colecciones (`src/app/page.tsx:94`, `lg:mt-16` en la tarjeta del medio), el carrusel de reseñas con tarjetas y comilla tipográfica— pero el oficio se cae en los detalles que un cliente que va a gastar USD 900 registra sin poder nombrarlos. Evidencia dura: **hay tres dorados distintos conviviendo** (`--primary: 45 68% 52%` = `#d4af37` en `globals.css:13`, el mismo hardcodeado siete veces en `chat-widget.tsx:283,285,387,388,402-405,420`, y un tercero `#d4a843` en `reviews-carousel.tsx:173` vía `var(--gold, #d4a843)` donde `--gold` **nunca fue definida**); **toda la sección de reseñas del home renderiza en Times New Roman** porque `reviews-carousel.tsx:190,206,276,318,406` referencia `var(--font-headline, ...)` y esa variable no existe en ningún lado — la real es `--font-playfair` (`layout.tsx:20-22`); **el precio, el dato de mayor peso comercial de la página, está en dorado sobre fondo claro con un contraste de 1.82:1** (`products/[id]/page.tsx:66`, `collections/page.tsx:158`, `product-card.tsx:72`) — ilegible y, peor, tipográficamente barato: ninguna casa de alta joyería pone el precio en color; lo pone en tinta. A eso se le suma la paleta parasitaria: verde WhatsApp `#25D366` flotando permanente sobre cada página (`whatsapp-button.tsx:22`), `bg-green-600` en cuatro botones (`footer.tsx:133,338,405`, `contact/page.tsx:159`), `pink-500` en la tarjeta de Instagram (`contact/page.tsx:75-78`), `#009ee3` de Mercado Pago (`buy-button.tsx:248`) y un widget de TradingView en `#131722` (`ticker-tape.tsx:39`) — seis familias cromáticas ajenas a la marca en un sitio de dos colores. El sitio no se ve mal; se ve **hecho con piezas de otros**.

---

## 2. Los 5 cambios de mayor impacto visual

Ordenados por (impacto visual ÷ esfuerzo).

### #1 — Un solo oro, y sacar el oro de los precios
**Ratio: máximo.** Esfuerzo: S (2-3 h). Impacto: transforma la percepción de toda la página.

**Qué está mal hoy:**

```tsx
// src/components/chat-widget.tsx:283-285 — hex crudo, 7 apariciones
<div className="... border border-[#d4af37]/30 ...">
  <div className="bg-[#d4af37] p-4 ... text-white ...">
```

```tsx
// src/components/reviews-carousel.tsx:173 — variable inexistente, fallback a OTRO oro
color: var(--gold, #d4a843);
```

```tsx
// src/app/products/[id]/page.tsx:66 — el precio en oro sobre fondo claro
<span className="font-headline text-3xl text-primary">USD {product.price.usd.toLocaleString()}</span>
```

`#d4af37` sobre `#f8f7f6` da **1.82:1**. Sobre tarjeta blanca, **1.94:1**. El mínimo WCAG AA para texto normal es 4.5:1. No es "un poco flojo": es un precio que literalmente no se lee al sol en un celular.

**Qué hacer:**
1. Reemplazar los 7 `#d4af37` de `chat-widget.tsx` y los 12 `var(--gold, #d4a843)` de `reviews-carousel.tsx` por los tokens de la sección 3 (`--gold`, `--gold-ink`, `--gold-soft`). Definir `--gold`, `--font-headline` y `--white` de verdad en `globals.css` para que el carrusel deje de caer al fallback.
2. **El oro no es un color de texto: es un metal.** Se usa en filetes de 1px, íconos, eyebrows de 11px con tracking 0.28em, subrayados de hover y bordes de foco. Nunca en precio, nunca en párrafos, nunca como fondo de botón primario con texto blanco encima.
3. Precio → `--foreground` en Playfair, tamaño `text-2xl`, `tracking-[-0.01em]`. Sube el contraste a **17.6:1** y, paradójicamente, se ve mucho más caro.
4. Botón primario: de `bg-primary` dorado a `bg-foreground text-background` (tinta sólida). Ya lo hacen bien en `page.tsx:174` con el botón "Ir a Colecciones" — hay que propagarlo.

**Por qué eleva:** el dorado saturado sobre blanco es *la* firma del template de e-commerce. El oro escaso —solo en filetes y marcas— más tinta densa para el contenido es la firma del catálogo impreso de joyería. Es el cambio de un dígito de precio percibido.

---

### #2 — Reparar las variables CSS muertas del carrusel de reseñas
**Ratio: máximo.** Esfuerzo: S (30 min). Impacto: alto — es la última sección del home, la que cierra la visita.

**Qué está mal hoy:**

```tsx
// src/components/reviews-carousel.tsx:190
font-family: var(--font-headline, 'Cormorant Garamond', serif);
// --font-headline NO existe (globals.css no la define; layout.tsx expone --font-playfair)
// 'Cormorant Garamond' NO está cargada (layout.tsx solo carga Manrope y Playfair_Display)
// → cae a `serif` genérico = Times New Roman / Liberation Serif
```

O sea: `.reviews-title` (58px), `.score-number` (80px), la comilla decorativa de 130px y `.footer-text` — todas las piezas tipográficas grandes de esa sección — se están renderizando en Times. Y con un oro `#d4a843` que no es el de la marca. La sección más "diseñada" del sitio es la que peor se ve en producción.

**Qué hacer:** en `globals.css`, agregar dentro de `:root`:

```css
--font-headline: var(--font-playfair), 'Playfair Display', Georgia, serif;
--gold: #b08d57;
--gold-soft: #d9be84;
--white: #ffffff;
```

Y de paso mover `.score-sub`/`.author-meta` de `#6b7280` (gris azulado de Tailwind) a `#8b8378` (gris cálido de la paleta), porque hoy el gris del carrusel es frío y todo el resto del sitio es cálido — el ojo lo lee como "esto lo pegaron de otro lado".

**Por qué eleva:** costo cero, y devuelve la sección al idioma tipográfico del sitio. Hoy hay dos tipografías serif compitiendo en la misma página sin que nadie lo haya decidido.

---

### #3 — Rediseñar la ficha de producto: es donde se decide la compra
Esfuerzo: M (1-2 días). Impacto: máximo en conversión y en percepción de valor.

**Qué está mal hoy:**

```tsx
// src/app/products/[id]/page.tsx:39-48 — UNA sola imagen, en formato apaisado
<div className="relative w-full aspect-[4/3] overflow-hidden rounded-lg bg-secondary">
  <Image src={product.images[0] || 'https://placehold.co/600x800?text=Joyeria'} ... className="object-cover" />
```

Tres problemas en cuatro líneas:
- **`aspect-[4/3]` apaisado para un anillo.** La joyería es vertical o cuadrada. En 4:3 con `object-cover`, un anillo fotografiado en vertical se recorta por arriba y abajo. Además choca con los otros tres ratios del sitio: `3/4` en el home (`page.tsx:97`), `4/5` en colecciones (`collections/page.tsx:123`), `3/4` en `product-card.tsx:26`. **Cuatro ratios distintos para el mismo producto.**
- **`product.images` es un array y se consume `[0]`.** No hay galería, no hay miniaturas, no hay zoom. En una pieza de USD 900 el usuario necesita ver el perfil, el interior, el detalle de la gema.
- **El placeholder de fallback dice "Joyeria" impreso sobre gris** (y en colecciones, `collections/page.tsx:126`, dice literalmente **"No Img"**). Eso no puede llegar a producción.

Y abajo, dos CTAs full-width del mismo peso pisándose:

```tsx
// src/app/products/[id]/page.tsx:109-112
<BuyButton product={product} />               // h-14, gradiente dorado, "Comprar Ahora"
<WhatsAppProductButton ... className="w-full bg-primary ... h-14 shadow-lg shadow-primary/20">
  <span className="text-sm font-bold uppercase tracking-widest">Consultar</span>
```

Dos botones dorados, ambos `h-14`, ambos ancho completo, uno arriba del otro. No hay jerarquía: el usuario no sabe cuál es la acción principal. Y encima flotan el FAB verde de WhatsApp (`whatsapp-button.tsx`) y el chat de Alma. **Cuatro superficies de contacto compitiendo en la misma pantalla.**

**Qué hacer:**
1. Galería: `aspect-[4/5]` para la imagen principal + tira de miniaturas a la izquierda en desktop / carrusel con dots debajo en mobile. Zoom on hover en desktop (`scale-150` con `transform-origin` siguiendo el cursor), lightbox en mobile.
2. Un ratio único en todo el sitio: **4:5**. Cambiar `page.tsx:97` (`3/4` → `4/5`), `collections/page.tsx:123` ya está bien, `product-card.tsx:26` (`3/4` → `4/5`), `products/[id]` (`4/3` → `4/5`).
3. Jerarquía de CTA: **un solo botón primario** en tinta sólida (`bg-foreground text-background`, h-14) = "Comprar". "Consultar por WhatsApp" pasa a link de texto con filete inferior dorado, debajo, sin fondo. El FAB verde se rediseña (ver #5).
4. Sacar el `animate-pulse` del badge de oferta (`products/[id]/page.tsx:74`). Un badge que late es lenguaje de outlet.
5. `.description-content` (`products/[id]/page.tsx:85`) **no tiene ni una regla CSS en todo el proyecto** — verificado, no aparece en `globals.css` ni en ningún otro archivo. El HTML de WooCommerce sale sin formato. Hay que escribir esos estilos (ver sección 3).

**Por qué eleva:** la ficha es el momento de la decisión. Hoy pide un acto de fe: una foto recortada, sin poder mirar la pieza de cerca, con dos botones idénticos. Una galería con zoom y un CTA único es la diferencia entre "consulto por WhatsApp y capaz vuelvo" y "compro".

---

### #4 — Escala tipográfica y ritmo espacial: el lujo respira
Esfuerzo: M (1 día). Impacto: alto y transversal a todas las páginas.

**Qué está mal hoy — tamaños:**

```tsx
// src/app/page.tsx:54  — eyebrow del hero
className="... text-[10px] md:text-xs font-bold uppercase tracking-[0.3em] text-primary"
// src/app/page.tsx:72  — "Descubrir"
className="text-[8px] md:text-[10px] uppercase tracking-widest text-white/60"
// src/app/page.tsx:118,136 — botones de las tarjetas
className="... text-[10px] md:text-xs font-bold uppercase tracking-widest h-10"
// src/components/chat-widget.tsx:499,504 — 8px
className="text-[8px] uppercase font-bold tracking-widest"
```

Hay **texto de 8px** en producción. El piso legible es 11px, y 8px con `font-bold` + `tracking-widest` no es "discreto", es ilegible. Además el patrón `text-[10px] font-bold uppercase` está repetido literalmente en 20+ lugares sin ser un token — es el estilo por defecto del proyecto y nadie lo decidió.

**Qué está mal hoy — jerarquía:** todo compite porque todo grita. Los eyebrows son `font-bold`, los botones son `font-bold`, los labels son `font-bold`, los headings de footer son `font-bold`. Cuando todo es bold, nada es jerarquía. Y el h1 del hero:

```tsx
// src/app/page.tsx:57
className="font-headline text-4xl leading-tight text-white md:text-7xl lg:text-8xl mb-6 md:mb-8 max-w-5xl"
```

Playfair Display a 96px (`text-8xl`) con `tracking` normal se ve suelto y blando — las Didone necesitan tracking negativo a tamaño display. Falta `tracking-[-0.03em]` y `leading-[0.95]`.

**Qué está mal hoy — contenedores:** cuatro anchos máximos distintos.

| Archivo | Ancho |
|---|---|
| `layout/header.tsx:51`, `layout/footer.tsx:81`, `page.tsx:80,149` | `max-w-screen-xl` (1280) |
| `products/[id]/page.tsx:37` | `max-w-[1280px]` |
| `collections/page.tsx:81` | `max-w-[1440px]` |
| `reviews-carousel.tsx:157` | `1140px` |
| `contact/page.tsx:14,28,93` | `max-w-screen-lg` (1024) |

Y cinco padding laterales: `px-6 lg:px-8`, `px-4 md:px-6 lg:px-8`, `px-4 md:px-8`, `p-4 md:p-6 lg:p-10`, `px-6`. El contenido no se alinea entre páginas — al navegar, el logo del header y el título de la página bailan lateralmente. Es de las cosas que el ojo detecta sin poder explicar.

**Bug concreto de ritmo:** `collections/page.tsx:80` usa `pt-20` (80px) mientras el header en páginas internas mide `h-16 md:h-20` (`header.tsx:52`). En breakpoint md el header ocupa exactamente 80px → el título "Colección JA" arranca pegado al borde del header, con cero aire. En una boutique, eso es la vidriera con la mercadería tocando el vidrio.

**Qué hacer:** adoptar la escala tipográfica y de espaciado de la sección 3, con `.container-boutique` único y `--section-y` como ritmo vertical. Piso de fuente: 11px. `font-bold` reservado exclusivamente para eyebrows; el resto va 300/400/500.

**Por qué eleva:** el espacio en blanco es literalmente lo que se compra en una boutique — la pieza sola sobre terciopelo. Un grid apretado con tipografía de 10px bold comunica "catálogo mayorista".

---

### #5 — Desintoxicación cromática y de emojis
Esfuerzo: S/M (medio día). Impacto: alto — es lo que "delata".

**Qué está mal hoy — el verde:**

```tsx
// src/components/whatsapp-button.tsx:22-25 — FAB verde permanente, en TODAS las páginas
className="fixed bottom-6 right-6 z-50 ... w-14 h-14 bg-[#25D366] text-white rounded-full shadow-xl"
<span className="absolute inset-0 rounded-full bg-[#25D366] opacity-30 group-hover:opacity-50 animate-ping"></span>
```

Un círculo verde brillante de WhatsApp con `animate-ping` permanente en la esquina inferior derecha de un sitio de alta joyería. Es el equivalente visual a un cartel de neón en la vidriera de Cartier. Y encima **es engañoso**: el `onClick` (línea 14) dispara `open-chat-only`, o sea abre el chat interno de Alma, no WhatsApp. El usuario toca un ícono de WhatsApp y no va a WhatsApp.

Sumado: `bg-green-600` en `footer.tsx:133,338,405` y `contact/page.tsx:159`; `text-green-400` en `chat-widget.tsx:293` y `footer.tsx:91,142`; `pink-500` en la tarjeta de Instagram (`contact/page.tsx:75-78`); `#009ee3` de Mercado Pago (`buy-button.tsx:248`); `#131722` del ticker de TradingView (`ticker-tape.tsx:39`); `#080b12` azul-negro en la sección de reseñas (`page.tsx:187`) que no coincide con `--foreground` `#1a170f` marrón-negro. La página de contacto tiene **oro + verde + rosa** en tres tarjetas contiguas.

**Qué está mal hoy — los emojis:**

```tsx
// src/components/chat-widget.tsx:88 — el agente inyecta esto en la conversación
const productInfoMsg = `📦 *Producto consultado:*\n\n🏷️ ${product.name}\n💰 USD ${...}${product.sku ? `\n🔖 SKU: ${product.sku}` : ''}${product.material ? `\n✨ Material: ${product.material}` : ''}`;
```

```tsx
// src/components/chat-widget.tsx:44,105,220
text: `Bienvenida a Joyería Alianzas. Soy Alma... ¿En qué pieza puedo asistirle hoy? ✨`
text: 'Para poder asesorarte mejor, necesito tu nombre y número de WhatsApp... 👇'
addMessage(`✅ ¡Gracias, ${data.name}! Tus datos fueron guardados...`, 'agent')
```

```tsx
// src/components/layout/footer.tsx:333,400 — dentro del modal, como "preview" visual
📏 &quot;Hola, me gustaría recibir la Guía de Tallas...&quot;
📅 &quot;Hola, me gustaría agendar una cita...&quot;
// src/components/reviews-carousel.tsx:462
<div className="google-badge">🔍 Google Maps</div>
```

Una asistente que trata de usted ("¿en qué pieza puedo asistirle?") y termina la frase con ✨ es un choque de registro. Y 📦🏷️💰🔖 en una ficha de producto de USD 900 es lenguaje de marketplace.

**Nota de coherencia detectada de paso** (no es diseño, pero rompe la experiencia): hay **dos números de WhatsApp distintos** en el código — `appSettings.whatsAppNumber = "59895435644"` (`settings.ts:10`, usado por el footer) contra `59891264956` hardcodeado en `lib/whatsapp.ts:22`, `page.tsx:130` y `contact/page.tsx:52,62,147,156`. Además el handler de "Consultar" del home (`page.tsx:121-131`) busca un widget de n8n (`#n8n-chat`, `window.n8nChat`, evento `n8n-chat:open`) que **no existe en este codebase** — el chat real escucha `open-chat-with-message` / `open-chat-only` (`chat-widget.tsx:130-131`). O sea que ese botón siempre cae al `else` y abre WhatsApp con el número equivocado, en vez de abrir a Alma.

**Qué hacer:**
1. FAB: fondo `--foreground` (tinta), ícono de conversación genérico (no el logo de WhatsApp), sin `animate-ping`, tooltip "Asesoría personal". Si se quiere señalar WhatsApp, que sea un link real a WhatsApp con el ícono, en un lugar secundario.
2. Verde/rosa/celeste → todos a `--foreground` / `--gold` / `--sage`. Excepción legítima: el botón de Mercado Pago dentro del checkout (`buy-button.tsx:248`) puede conservar `#009ee3` — ahí el color ajeno es una señal de confianza del medio de pago, no decoración. Es la única.
3. Sección de reseñas: `bg-[#080b12]` → `bg-foreground` (`page.tsx:187`), para que el negro del sitio sea uno solo.
4. Cero emojis en superficies de producto y de UI. En el chat de Alma se pueden permitir en el texto conversacional del modelo, pero **nunca en las tarjetas de producto que inyecta el front** (`chat-widget.tsx:88`) — ahí van filete + label en 11px uppercase.
5. Ticker de TradingView: envolverlo en un contenedor con `bg-foreground` y `colorTheme: "dark"` ya está; el problema es el `#131722` azulado. Si el widget no permite tematizar el fondo, evaluar reemplazarlo por un ticker propio con los mismos datos — hoy es la única franja azul del sitio y está justo arriba del footer.

**Por qué eleva:** el lujo se comunica por sustracción. Cada color ajeno, cada emoji y cada animación que late le resta un escalón al precio percibido.

---

## 3. Sistema de diseño propuesto (copiable)

### 3.1 `src/app/globals.css` — reemplazo completo del bloque de tokens

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    /* ───────── SUPERFICIES ─────────
       Blancos cálidos, nunca #fff puro en el fondo: el papel de catálogo tiene temperatura. */
    --background:        38 30% 97%;   /* #FAF8F4  Alabastro — fondo base */
    --surface:           0 0% 100%;    /* #FFFFFF  tarjeta / panel elevado */
    --surface-sunken:    36 22% 94%;   /* #F2EFE9  fondo hundido: bloques de imagen, secciones alternas */
    --card:              0 0% 100%;
    --card-foreground:   40 24% 6%;
    --popover:           0 0% 100%;
    --popover-foreground:40 24% 6%;

    /* ───────── TINTA ─────────
       #14120D sobre #FAF8F4 = 17.6:1. Es el color del precio, del CTA primario y de los títulos. */
    --foreground:        40 24% 6%;    /* #14120D  Ónix cálido */
    --muted:             36 22% 94%;   /* #F2EFE9 */
    --muted-foreground:  30  6% 35%;   /* #5F5952  6.5:1 sobre background — AA en cualquier tamaño */
    --subtle-foreground: 33  8% 51%;   /* #8B8378  3.4:1 — SOLO para texto ≥19px o decorativo */

    /* ───────── ORO ─────────
       Tres pesos. El oro es metal: filetes, íconos, eyebrows. NUNCA texto de párrafo ni precio. */
    --gold:              33 34% 51%;   /* #B08D57  oro de marca (filetes, íconos, fondos de badge) */
    --gold-ink:          40 54% 30%;   /* #7A5C24  oro legible: 5.9:1 sobre background — links, eyebrows */
    --gold-soft:         38 53% 68%;   /* #D9BE84  oro sobre superficie oscura: 10.4:1 sobre --foreground */
    --gold-wash:         33 34% 51% / 0.08; /* veladura para fondos de badge / hover */

    /* ───────── ACENTO SECUNDARIO ─────────
       Verde salvia frío-neutro. Reemplaza a TODOS los green-500/600 de WhatsApp del sitio. */
    --sage:             155 14% 40%;   /* #587A6B */
    --sage-foreground:   38 30% 97%;

    /* ───────── PRIMARIO / SEMÁNTICOS ─────────
       primary = tinta, no oro. El CTA de una casa de joyería es negro. */
    --primary:           40 24% 6%;
    --primary-foreground:38 30% 97%;
    --secondary:         36 22% 94%;
    --secondary-foreground: 40 24% 6%;
    --accent:            33 34% 51%;   /* = gold, para compatibilidad con shadcn */
    --accent-foreground: 40 24% 6%;
    --destructive:        4 62% 42%;   /* #AC2E28  bordó, no rojo semáforo */
    --destructive-foreground: 38 30% 97%;
    --success:          155 14% 40%;
    --warning:           33 44% 44%;   /* #A2703F  ámbar terroso para "Bajo Pedido" */

    /* ───────── BORDES ───────── */
    --border:            36 16% 88%;   /* #E5E0D8  filete decorativo (1.2:1, no informativo) */
    --border-strong:     36 10% 51%;   /* #8C8477  3.5:1 — inputs, controles, todo lo interactivo */
    --input:             36 10% 51%;
    --ring:              40 54% 30%;   /* #7A5C24 — DISTINTO del primario, si no el foco es invisible */

    /* ───────── RADIOS ─────────
       Radios chicos. rounded-2xl en tarjetas de producto es lenguaje de app, no de joyería. */
    --radius-none: 0px;
    --radius-xs:   2px;   /* imágenes de producto, tarjetas */
    --radius-sm:   4px;   /* inputs, badges */
    --radius-md:   6px;   /* botones */
    --radius-lg:  10px;   /* modales, paneles */
    --radius-full: 9999px;/* solo avatares y dots */
    --radius: var(--radius-md); /* compat shadcn */

    /* ───────── SOMBRAS ─────────
       Cálidas, bajísima alpha, sin glows de color. Prohibido shadow-{color}/25. */
    --shadow-hairline: 0 0 0 1px hsl(36 16% 88%);
    --shadow-xs:  0 1px 2px hsl(40 24% 6% / 0.04);
    --shadow-sm:  0 2px 8px hsl(40 24% 6% / 0.05);
    --shadow-md:  0 8px 24px hsl(40 24% 6% / 0.07);
    --shadow-lg:  0 20px 56px hsl(40 24% 6% / 0.10);
    --shadow-modal: 0 32px 80px hsl(40 24% 6% / 0.22);

    /* ───────── MOVIMIENTO ─────────
       Un único set. Hoy conviven 200/300/500/700/1000ms + 0.2s/0.22s/0.35s/0.5s sin criterio. */
    --dur-instant: 120ms;  /* feedback de tap */
    --dur-fast:    200ms;  /* hover de color, foco */
    --dur-base:    320ms;  /* entradas, aperturas */
    --dur-slow:    600ms;  /* zoom de imagen, parallax */
    --ease-out:      cubic-bezier(0.16, 1, 0.3, 1);      /* el "expo out" — el que se siente caro */
    --ease-in-out:   cubic-bezier(0.65, 0, 0.35, 1);
    --ease-standard: cubic-bezier(0.4, 0, 0.2, 1);

    /* ───────── RITMO ─────────
       Escala de 4px con saltos de sección fluidos. */
    --space-1:  0.25rem;  --space-2:  0.5rem;   --space-3:  0.75rem;
    --space-4:  1rem;     --space-5:  1.5rem;   --space-6:  2rem;
    --space-7:  3rem;     --space-8:  4rem;     --space-9:  6rem;
    --space-10: 8rem;     --space-11: 12rem;
    --section-y:  clamp(4.5rem, 9vw, 9rem);       /* padding vertical de sección */
    --section-y-lg: clamp(6rem, 13vw, 13rem);     /* secciones "de respiro" (manifiesto, cierre) */
    --gutter:     clamp(1.25rem, 5vw, 3rem);      /* padding lateral ÚNICO del sitio */
    --container:  1280px;                          /* ancho máximo ÚNICO del sitio */

    /* ───────── TIPOGRAFÍA ───────── */
    --font-headline: var(--font-playfair), 'Playfair Display', Georgia, 'Times New Roman', serif;
    --font-body:     var(--font-manrope), 'Manrope', system-ui, -apple-system, sans-serif;
    --white: #ffffff; /* usada por reviews-carousel.tsx */
  }

  /* Dark mode: hoy es CÓDIGO MUERTO — layout.tsx:35 fuerza className="light".
     Estos valores quedan listos para cuando se active el toggle. */
  .dark {
    --background:        40 24% 6%;    /* #14120D */
    --surface:           38 20% 10%;   /* #1E1A14 */
    --surface-sunken:    40 24% 4%;
    --card:              38 20% 10%;
    --card-foreground:   38 30% 97%;
    --popover:           38 20% 10%;
    --popover-foreground:38 30% 97%;
    --foreground:        38 30% 97%;
    --muted:             38 16% 14%;
    --muted-foreground:  36 10% 68%;   /* #B4ABA0  8.1:1 sobre background oscuro */
    --subtle-foreground: 36  8% 52%;
    --gold:              38 53% 68%;   /* en oscuro sube a --gold-soft */
    --gold-ink:          38 53% 68%;
    --gold-soft:         33 34% 51%;
    --sage:             155 18% 58%;
    --primary:           38 30% 97%;
    --primary-foreground:40 24% 6%;
    --secondary:         38 16% 14%;
    --secondary-foreground: 38 30% 97%;
    --accent:            38 53% 68%;
    --accent-foreground: 40 24% 6%;
    --destructive:        4 52% 52%;
    --destructive-foreground: 38 30% 97%;
    --border:            38 14% 18%;
    --border-strong:     36 10% 38%;
    --input:             36 10% 38%;
    --ring:              38 53% 68%;
    --shadow-hairline: 0 0 0 1px hsl(38 14% 18%);
  }
}

@layer base {
  * { @apply border-border; }

  html { scroll-behavior: smooth; }

  body {
    @apply bg-background text-foreground font-body;
    font-feature-settings: 'kern' 1, 'liga' 1, 'calt' 1;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    text-rendering: optimizeLegibility;
  }

  /* Playfair es una Didone: a tamaño display necesita tracking negativo. */
  h1, h2, h3, .font-headline {
    font-family: var(--font-headline);
    font-weight: 400;
    letter-spacing: -0.02em;
  }

  /* Números de precio siempre tabulares: en una grilla, los precios se alinean. */
  .tabular { font-variant-numeric: tabular-nums; }

  ::selection { @apply bg-foreground text-background; }

  /* Foco visible y consistente en TODO lo enfocable, incluidos los <button> crudos
     de footer.tsx y reviews-carousel.tsx que hoy no tienen ninguno. */
  :where(a, button, input, textarea, select, [tabindex]):focus-visible {
    outline: 2px solid hsl(var(--ring));
    outline-offset: 2px;
    border-radius: var(--radius-xs);
  }

  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }
  }
}

@layer components {
  /* Contenedor ÚNICO. Reemplaza max-w-screen-xl / max-w-[1280px] / max-w-[1440px] /
     max-w-screen-lg / 1140px que hoy conviven en 5 archivos. */
  .container-boutique {
    width: 100%;
    max-width: var(--container);
    margin-inline: auto;
    padding-inline: var(--gutter);
  }
  .section      { padding-block: var(--section-y); }
  .section-lg   { padding-block: var(--section-y-lg); }

  /* El eyebrow: el único lugar del sitio donde va font-bold + uppercase + tracking extremo.
     Piso 11px — reemplaza los text-[10px] y text-[8px] repartidos por todo el proyecto. */
  .eyebrow {
    font-family: var(--font-body);
    font-size: 0.6875rem;      /* 11px */
    font-weight: 600;
    line-height: 1;
    letter-spacing: 0.28em;
    text-transform: uppercase;
    color: hsl(var(--gold-ink));
  }
  .eyebrow--onDark { color: hsl(var(--gold-soft)); }

  /* Filete: la microdecoración de marca. Reemplaza los border-b sueltos. */
  .rule-gold { border-block-end: 1px solid hsl(var(--gold) / 0.35); }

  /* Precio. Tinta, Playfair, tabular. NUNCA text-primary dorado. */
  .price {
    font-family: var(--font-headline);
    font-weight: 400;
    letter-spacing: -0.01em;
    font-variant-numeric: tabular-nums;
    color: hsl(var(--foreground));
  }
  .price--strike {
    font-family: var(--font-body);
    font-size: 0.8125rem;
    color: hsl(var(--muted-foreground));
    text-decoration: line-through;
    text-decoration-color: hsl(var(--muted-foreground) / 0.5);
  }

  /* Link de texto con filete — el hover "caro": el filete crece, el color no salta. */
  .link-underline {
    position: relative;
    color: hsl(var(--foreground));
    text-decoration: none;
  }
  .link-underline::after {
    content: '';
    position: absolute; left: 0; bottom: -3px;
    width: 100%; height: 1px;
    background: hsl(var(--gold));
    transform: scaleX(0);
    transform-origin: right;
    transition: transform var(--dur-base) var(--ease-out);
  }
  .link-underline:hover::after { transform: scaleX(1); transform-origin: left; }

  /* Estilos del HTML de WooCommerce. HOY .description-content NO TIENE NINGUNA REGLA
     en todo el proyecto (verificado): la descripción del producto sale sin formato. */
  .description-content {
    font-size: 0.9375rem;
    line-height: 1.75;
    color: hsl(var(--muted-foreground));
  }
  .description-content > * + *      { margin-block-start: 1em; }
  .description-content p            { max-width: 62ch; }
  .description-content strong       { color: hsl(var(--foreground)); font-weight: 600; }
  .description-content ul           { list-style: none; padding-inline-start: 0; }
  .description-content ul > li      { position: relative; padding-inline-start: 1.25rem; }
  .description-content ul > li::before {
    content: ''; position: absolute; left: 0; top: 0.7em;
    width: 6px; height: 1px; background: hsl(var(--gold));
  }
  .description-content h2,
  .description-content h3 {
    font-family: var(--font-body);
    font-size: 0.6875rem; font-weight: 600;
    letter-spacing: 0.2em; text-transform: uppercase;
    color: hsl(var(--foreground));
    margin-block-start: 2em;
  }
  .description-content img { border-radius: var(--radius-xs); }

  /* Skeleton sin spinner. Hoy collections/page.tsx:185-187 apila
     animate-pulse + <Loader2 animate-spin>: dos indicadores para una sola espera. */
  .skeleton {
    background: linear-gradient(90deg,
      hsl(var(--muted)) 0%, hsl(var(--surface-sunken)) 50%, hsl(var(--muted)) 100%);
    background-size: 200% 100%;
    animation: shimmer 1.6s var(--ease-in-out) infinite;
    border-radius: var(--radius-xs);
  }
  @keyframes shimmer { to { background-position: -200% 0; } }
}
```

### 3.2 `tailwind.config.ts` — reemplazo completo

```ts
import type { Config } from 'tailwindcss';
const { fontFamily } = require('tailwindcss/defaultTheme');

export default {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    // Container nativo desactivado: usamos .container-boutique para tener UN solo ancho.
    container: { center: true, padding: '0', screens: { '2xl': '1280px' } },
    extend: {
      fontFamily: {
        body:     ['var(--font-manrope)', ...fontFamily.sans],
        headline: ['var(--font-playfair)', ...fontFamily.serif],
      },

      // ── Escala tipográfica: [size, { lineHeight, letterSpacing, fontWeight }] ──
      // Piso absoluto: 11px. Prohibido text-[8px] / text-[9px] / text-[10px].
      fontSize: {
        'eyebrow':    ['0.6875rem', { lineHeight: '1',    letterSpacing: '0.28em',  fontWeight: '600' }], // 11px
        'caption':    ['0.75rem',   { lineHeight: '1.45', letterSpacing: '0.02em',  fontWeight: '500' }], // 12px
        'body-sm':    ['0.8125rem', { lineHeight: '1.65', letterSpacing: '0.005em', fontWeight: '400' }], // 13px
        'body':       ['0.9375rem', { lineHeight: '1.75', letterSpacing: '0',       fontWeight: '400' }], // 15px
        'body-lg':    ['1.0625rem', { lineHeight: '1.75', letterSpacing: '-0.005em',fontWeight: '300' }], // 17px
        'lead':       ['1.25rem',   { lineHeight: '1.65', letterSpacing: '-0.01em', fontWeight: '300' }], // 20px
        'price':      ['1.5rem',    { lineHeight: '1.1',  letterSpacing: '-0.01em', fontWeight: '400' }], // 24px
        'price-lg':   ['2rem',      { lineHeight: '1.05', letterSpacing: '-0.015em',fontWeight: '400' }], // 32px
        'h4':         ['1.125rem',  { lineHeight: '1.35', letterSpacing: '-0.01em', fontWeight: '500' }], // 18px
        'h3':         ['1.5rem',    { lineHeight: '1.25', letterSpacing: '-0.015em',fontWeight: '400' }], // 24px
        'h2':         ['2.25rem',   { lineHeight: '1.12', letterSpacing: '-0.02em', fontWeight: '400' }], // 36px
        'h1':         ['3rem',      { lineHeight: '1.06', letterSpacing: '-0.025em',fontWeight: '400' }], // 48px
        'display':    ['clamp(2.75rem, 6vw, 5rem)',  { lineHeight: '1.02', letterSpacing: '-0.03em',  fontWeight: '400' }],
        'display-xl': ['clamp(3.25rem, 8vw, 7.5rem)',{ lineHeight: '0.95', letterSpacing: '-0.035em', fontWeight: '400' }],
      },

      colors: {
        background:  'hsl(var(--background))',
        surface:     'hsl(var(--surface))',
        'surface-sunken': 'hsl(var(--surface-sunken))',
        foreground:  'hsl(var(--foreground))',
        border:      'hsl(var(--border))',
        'border-strong': 'hsl(var(--border-strong))',
        input:       'hsl(var(--input))',
        ring:        'hsl(var(--ring))',
        gold: {
          DEFAULT: 'hsl(var(--gold))',
          ink:     'hsl(var(--gold-ink))',
          soft:    'hsl(var(--gold-soft))',
        },
        sage: {
          DEFAULT: 'hsl(var(--sage))',
          foreground: 'hsl(var(--sage-foreground))',
        },
        primary:   { DEFAULT: 'hsl(var(--primary))',   foreground: 'hsl(var(--primary-foreground))' },
        secondary: { DEFAULT: 'hsl(var(--secondary))', foreground: 'hsl(var(--secondary-foreground))' },
        destructive:{DEFAULT: 'hsl(var(--destructive))',foreground: 'hsl(var(--destructive-foreground))' },
        muted:     { DEFAULT: 'hsl(var(--muted))',     foreground: 'hsl(var(--muted-foreground))' },
        subtle:    { foreground: 'hsl(var(--subtle-foreground))' },
        accent:    { DEFAULT: 'hsl(var(--accent))',    foreground: 'hsl(var(--accent-foreground))' },
        popover:   { DEFAULT: 'hsl(var(--popover))',   foreground: 'hsl(var(--popover-foreground))' },
        card:      { DEFAULT: 'hsl(var(--card))',      foreground: 'hsl(var(--card-foreground))' },
        success:   'hsl(var(--success))',
        warning:   'hsl(var(--warning))',
      },

      borderRadius: {
        none: 'var(--radius-none)',
        xs:   'var(--radius-xs)',
        sm:   'var(--radius-sm)',
        DEFAULT: 'var(--radius-md)',
        md:   'var(--radius-md)',
        lg:   'var(--radius-lg)',
        full: 'var(--radius-full)',
      },

      boxShadow: {
        hairline: 'var(--shadow-hairline)',
        xs: 'var(--shadow-xs)',
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
        modal: 'var(--shadow-modal)',
        none: 'none',
      },

      spacing: {
        'gutter':    'var(--gutter)',
        'section':   'var(--section-y)',
        'section-lg':'var(--section-y-lg)',
        18: '4.5rem', 22: '5.5rem', 30: '7.5rem', 38: '9.5rem',
      },
      maxWidth: { boutique: 'var(--container)', prose: '62ch' },

      transitionDuration: {
        instant: 'var(--dur-instant)',
        fast:    'var(--dur-fast)',
        base:    'var(--dur-base)',
        slow:    'var(--dur-slow)',
      },
      transitionTimingFunction: {
        out:      'var(--ease-out)',
        'in-out': 'var(--ease-in-out)',
        standard: 'var(--ease-standard)',
      },
      letterSpacing: {
        tightest: '-0.035em', tighter: '-0.025em', tight: '-0.015em',
        wide: '0.08em', wider: '0.16em', widest: '0.28em',
      },
      aspectRatio: { product: '4 / 5', hero: '3 / 2', wide: '16 / 9' },

      keyframes: {
        'accordion-down': { from: { height: '0' }, to: { height: 'var(--radix-accordion-content-height)' } },
        'accordion-up':   { from: { height: 'var(--radix-accordion-content-height)' }, to: { height: '0' } },
        'rise':   { '0%': { opacity: '0', transform: 'translateY(16px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        'veil':   { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        'shimmer':{ to: { backgroundPosition: '-200% 0' } },
      },
      animation: {
        'accordion-down': 'accordion-down var(--dur-base) var(--ease-out)',
        'accordion-up':   'accordion-up var(--dur-base) var(--ease-out)',
        'rise':    'rise var(--dur-slow) var(--ease-out) forwards',
        'veil':    'veil var(--dur-base) var(--ease-out) forwards',
        'shimmer': 'shimmer 1.6s var(--ease-in-out) infinite',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
} satisfies Config;
```

### 3.3 Variantes de botón — reemplazo del `cva` de `src/components/ui/button.tsx`

Hoy `button.tsx:8-33` tiene `transition-colors` (solo color, nada de transform), `rounded-md` fijo, `focus-visible:ring-ring` con `--ring` idéntico al primario (foco invisible), y ninguna variante para el CTA de tinta que necesita el sitio.

```ts
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-body select-none " +
  "transition-[background-color,color,border-color,box-shadow,transform] duration-fast ease-out " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 " +
  "focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-40 " +
  "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // CTA principal del sitio: tinta sólida. Reemplaza el gradiente dorado de buy-button.tsx:120.
        default:   "bg-foreground text-background rounded-md hover:bg-foreground/88 active:translate-y-px shadow-xs hover:shadow-sm",
        // Secundario: filete. El botón "caro" por excelencia.
        outline:   "border border-border-strong bg-transparent text-foreground rounded-md hover:border-foreground hover:bg-foreground/[0.03]",
        // Terciario dorado: solo para acciones de marca (agendar cita, ver catálogo).
        gold:      "border border-gold/40 bg-gold/[0.06] text-gold-ink rounded-md hover:bg-gold/[0.12] hover:border-gold",
        ghost:     "bg-transparent text-foreground rounded-md hover:bg-foreground/[0.05]",
        // Link con filete animado: reemplaza a los CTA secundarios que hoy compiten como botones.
        link:      "text-foreground underline-offset-4 decoration-gold decoration-1 hover:underline p-0 h-auto",
        destructive: "bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90",
        // Excepción legítima: medio de pago. Único color ajeno permitido en el sistema.
        payment:   "bg-[#009ee3] text-white rounded-md hover:bg-[#008fcc] shadow-xs",
      },
      size: {
        sm:   "h-10 px-4 text-caption tracking-wide uppercase",       // 40px — mínimo táctil
        default: "h-12 px-6 text-caption tracking-wider uppercase",   // 48px
        lg:   "h-14 px-10 text-caption tracking-wider uppercase",     // 56px — CTA de ficha
        icon: "h-11 w-11 rounded-full",                               // 44px — HIG de Apple
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);
```

### 3.4 Reglas de uso del oro (la regla que evita volver al problema)

| Uso | Token | ¿Permitido? |
|---|---|---|
| Filete de 1px, separadores, bordes de hover | `--gold` | Sí |
| Íconos decorativos ≥20px | `--gold` | Sí |
| Eyebrow 11px uppercase sobre fondo claro | `--gold-ink` | Sí |
| Eyebrow / texto sobre `--foreground` | `--gold-soft` | Sí |
| Link inline sobre fondo claro | `--gold-ink` | Sí |
| Fondo de badge / chip | `--gold-wash` + texto `--gold-ink` | Sí |
| **Precio** | — | **No. Va en `--foreground`.** |
| **Fondo de botón primario con texto encima** | — | **No.** |
| **Texto de párrafo o descripción** | — | **No.** |
| **Gradiente `from-primary via-yellow-500 to-primary`** | — | **No.** (`buy-button.tsx:120`) |

---

## 4. Componente por componente

| Componente | Problema (con evidencia) | Fix propuesto | Esf. |
|---|---|---|---|
| `globals.css` | Solo 2 escalones de gris; `--ring` = `--primary` (`:25` y `:13` idénticos) → foco invisible sobre botones dorados; sin escala de sombra, radio, duración ni espaciado; sin `prefers-reduced-motion` | Reemplazar por el bloque de tokens de §3.1 | **M** |
| `tailwind.config.ts` | Sin `fontSize` propio (se usa la escala default de Tailwind con overrides arbitrarios `text-[8px]`…`text-[10px]`); sin `boxShadow`, sin `transitionDuration`, sin `aspectRatio` | Reemplazar por §3.2 | **M** |
| `layout.tsx` | `:35` fuerza `className="light"` → los 26 tokens `.dark` de `globals.css` son código muerto; `<main>` sin `id` ni skip-link | Sacar el hardcode o borrar `.dark`; agregar `<a href="#main" className="sr-only focus:not-sr-only">Saltar al contenido</a>` | **S** |
| `page.tsx` — hero | `:54` eyebrow `text-[10px]`, `:72` `text-[8px]`; `:57` h1 Playfair a 96px sin tracking negativo; overlay doble (`brightness-75` + `bg-black/20`) hace incalculable el contraste del texto | `.eyebrow`; `text-display-xl`; overlay único `bg-gradient-to-t from-foreground/70 via-foreground/25 to-foreground/40` para contraste determinístico | **S** |
| `page.tsx` — colecciones destacadas | `:97` ratio `3/4` ≠ resto del sitio; `:98-105` 3 `<video autoPlay loop>` sin `poster` ni `preload="none"` → primer paint pesado; `:112` precio en `text-primary` (1.82:1); `:137` el botón dice "Comprar" pero navega a `/collections` | Ratio `4/5`; `poster` + `preload="metadata"` + `aria-hidden`; `.price`; que "Comprar" vaya al producto o cambiar el label a "Ver colección" | **M** |
| `page.tsx` — handler Consultar | `:121-131` busca `#n8n-chat` / `window.n8nChat` / evento `n8n-chat:open` que **no existen** (el chat escucha `open-chat-with-message`, `chat-widget.tsx:130`) → siempre cae al `else` y abre `wa.me/59891264956`, número distinto de `appSettings.whatsAppNumber` (`settings.ts:10` = `59895435644`) | Disparar `open-chat-with-message`; centralizar el número en `appSettings` | **S** |
| `page.tsx` — reviews section | `:187` `bg-[#080b12]` (negro azulado) ≠ `--foreground` `#1a170f` (negro cálido) → dos negros | `bg-foreground` | **S** |
| `page.tsx` — experiencia | `:156` el video se sirve desde `goods-vod.kwcdn.com` (CDN de dropshipping). Dependencia de terceros no controlada en la sección "El arte de la orfebrería" | Autohospedar en `/videos/` como los otros tres | **S** |
| `products/[id]/page.tsx` | `:39` ratio `4/3` apaisado para joyería; sin galería aunque `product.images` es array; sin zoom; `:41` placeholder con texto "Joyeria"; `:66` precio en oro; `:74` badge `animate-pulse`; `:85` clase `.description-content` **sin ninguna regla CSS en el proyecto**; `:109-112` dos CTA `h-14` full-width del mismo peso | Galería 4:5 + miniaturas + zoom; `.price`; sacar el pulse; escribir `.description-content` (§3.1); un solo CTA primario + "Consultar" como `link-underline` | **L** |
| `products/[id]/page.tsx` — badges | `:32-33` `text-green-600 bg-green-100` = **3.00:1**, `text-orange-600 bg-orange-100` = **3.11:1**, ambos con texto de 12px bold → fallan AA | `bg-sage/10 text-sage` con `--sage` a `hsl(155 14% 32%)` para "En Stock"; `bg-warning/10 text-warning` para "Bajo Pedido" | **S** |
| `collections/page.tsx` | `:80` `pt-20` (80px) contra header `h-16 md:h-20` → en md el título arranca pegado al header; `:81` `max-w-[1440px]` ≠ resto; `:91-96` heading en `font-light` Manrope con `<span className="font-serif italic">` = **serif genérico de Tailwind (Times), no Playfair**; `:126` placeholder "No Img"; `:158` precio en oro; `:185-187` skeleton con `animate-pulse` **y** `<Loader2 animate-spin>` a la vez, y solo cubre la imagen (no el texto) → CLS | `pt-[calc(var(--header-h)+var(--space-7))]`; `.container-boutique`; `font-headline` en vez de `font-serif`; placeholder neutro sin texto; `.price`; `.skeleton` con bloques de texto incluidos | **M** |
| `collections/page.tsx` — filtros | `:82` aside sin encabezado sticky visible en scroll; `:105` botón de filtro mobile `size="sm"` sin badge de filtro activo; sin ordenamiento (precio, novedad) | Chip de categoría activa dismissible; selector de orden | **M** |
| `product-card.tsx` | **Componente definido y nunca importado** (verificado en todo `src/`). Duplica —con otro ratio `3/4`, otro tratamiento de nombre `font-headline text-xl` y otro layout centrado— la tarjeta inline de `collections/page.tsx:122-172` | Elegir uno, borrar el otro, y que sea el único usado en home + colecciones + relacionados | **S** |
| `header.tsx` | `:104-111` los botones de búsqueda y favoritos **no tienen `onClick` ni `href`** → UI muerta; `:38` `shadow-sm` (tell de template) en vez de filete; logo solo texto, `icon.svg` no se usa nunca en la UI; `:49` gradiente de overlay con `group-hover:hidden` que hace saltar el fondo al pasar el mouse | Implementar buscador y wishlist, o sacarlos; `border-b border-border` en vez de `shadow-sm`; usar la marca `JA` de `icon.svg` como lockup; sacar el `group-hover:hidden` | **M** |
| `header.tsx` — altura | `h-20 md:h-24` en home-top vs `h-16 md:h-20` en scroll; ningún consumidor conoce ese número (colecciones usa `pt-20`, producto `pt-24 md:pt-32`) | Exponer `--header-h` como CSS var y que las páginas usen `pt-[var(--header-h)]` | **S** |
| `footer.tsx` | `:133,338,405` `bg-green-600` sobre blanco = **3.30:1** con texto 12px bold; `:207` copyright `text-white/30` = **2.70:1**; `:333,400` emojis 📏📅 en el cuerpo del modal; `:220-221` links de Privacidad y Términos a `href="#"`; 3 modales artesanales con `<style jsx>` propio en vez de `<Dialog>` de shadcn; `:248,306,371` botones de cierre sin `aria-label` | Verde → `bg-sage`; `text-white/30` → `text-background/55`; sacar emojis; escribir las páginas legales; migrar a `<Dialog>` (trae focus-trap, `Escape` y `aria` gratis) | **M** |
| `footer.tsx` — mapa | `:185-202` `<button>` que envuelve un `<iframe>` para abrir un modal con **el mismo iframe**. Dos cargas de Google Maps por página | Reemplazar el preview por imagen estática (Static Maps API o screenshot) y cargar el iframe solo dentro del modal | **S** |
| `chat-widget.tsx` | 7 × `#d4af37` hardcodeado (`:283,285,387,388,402-405,420`); `:285` texto blanco sobre `#d4af37` = **1.94:1**; `:88` emojis 📦🏷️💰🔖✨ inyectados en la ficha de producto del chat; `:44,105,220` emojis en mensajes del agente; `:401-407` y `:463-469` **dos indicadores de "escribiendo" duplicados** que se renderizan a la vez; `:307-342` consola de debug (`Monitor de Tráfico`, `slate-950`/`green-400`) shippeada a producción; `:280` `if (!isOpen) return null` → el widget no tiene launcher propio | Tokens; header `bg-foreground` con acento `--gold-soft`; ficha de producto sin emojis, con filete y labels 11px; borrar el indicador duplicado; sacar el debug del bundle de producción; launcher propio discreto | **M** |
| `buy-button.tsx` | `:120` `bg-gradient-to-r from-primary via-yellow-500 to-primary` + `shadow-primary/25` + `hover:-translate-y-0.5` — gradiente dorado con glow de color, el tell de template más fuerte del sitio; `:129` `rounded-2xl` en el modal ≠ radios del resto | `variant="default"` (tinta) sin gradiente ni glow; `rounded-lg`; el `#009ee3` de MP se conserva como `variant="payment"` | **S** |
| `buy-button.tsx` — checkout | `:145-149` `<img>` crudo (no `next/image`) en el resumen del producto; sin resumen de total/moneda; error solo en texto plano (`:238-241`) sin `role="alert"` | `next/image`; línea de total; `role="alert"` + foco al error | **S** |
| `ticker-tape.tsx` | `:39` `bg-[#131722]` azul de TradingView, la única franja azulada del sitio, justo encima del footer negro cálido; el widget no es tematizable desde afuera; sin control de reduced-motion (el ticker se desplaza siempre) | Envolver en `bg-foreground` con `py-2` y hairline `--gold/20`, o reemplazar por un ticker propio con los mismos símbolos y la tipografía del sitio | **M** |
| `reviews-carousel.tsx` | `:190,206,276,318,406` `var(--font-headline)` **no existe** → toda la sección en Times; `:173+` `var(--gold, #d4a843)` **no existe** → tercer dorado; `:223,234,336` grises `#6b7280` (fríos) contra la paleta cálida; `:359-365` dots de **2px de alto** como controles clicables; `:531-537` dots son `<div onClick>` sin `role`, `tabIndex` ni teclado; `:540-541` flechas `<button>` sin `aria-label` ni foco visible; drag solo mouse/touch; `:462` emoji 🔍; carrusel `CARD_WIDTH` fijo en 340px con `VISIBLE=3` → en viewports intermedios corta tarjetas | Definir las variables (§3.1); dots → `<button>` de 24×24 con área táctil y `aria-label`; flechas con `aria-label`; grises a `--muted-foreground`; ancho de tarjeta fluido con `clamp()` | **M** |
| `whatsapp-button.tsx` | `:22` `#25D366` fijo con `animate-ping` permanente; ícono de WhatsApp que **no abre WhatsApp** (`:14` dispara `open-chat-only`); contraste ícono/fondo **1.98:1**; sin `prefers-reduced-motion` | `bg-foreground text-background`, ícono de conversación, sin ping, tooltip "Asesoría personal"; si se quiere WhatsApp real, link aparte | **S** |
| `whatsapp-product-button.tsx` | Sin variante propia: cada consumidor le pasa un `className` distinto (`products/[id]:110` dorado, `collections:164` outline dorado, `product-card:53` blanco translúcido) → tres identidades para el mismo botón | Encapsular una variante única, sin `className` desde afuera | **S** |
| `lib/whatsapp.ts` | `:22` número hardcodeado `59891264956` ≠ `appSettings.whatsAppNumber` (`59895435644`); `:19` emoji 💍 en el mensaje | Leer de `appSettings`; sacar el emoji | **S** |
| `contact/page.tsx` | `:55-88` tres tarjetas con **tres acentos ajenos**: oro / `green-500` / `pink-500`; `:159` `bg-green-600`; `:45,65,85` CTAs con `opacity-0 group-hover:opacity-100` → invisibles en mobile (no hay hover) y para teclado; 4 instancias del número `59891264956` | Un solo acento (`--gold`) con íconos monocromos; CTAs siempre visibles; centralizar el número | **M** |
| `next.config.ts` | `images.unoptimized: true` + `ignoreBuildErrors: true` + `ignoreDuringBuilds: true`; `<Image unoptimized>` repetido en producto y colecciones | Fuera del alcance de esta auditoría, pero: en un catálogo de fotografía de producto, servir originales sin optimizar es el mayor costo de percepción de calidad (imágenes lentas = sitio barato) | **M** |
| `app/icon.svg` | Marca sólida y bien construida (monograma JA + par de alianzas + filete doble) pero **el azul `#1a2255` no está en ninguna parte del sistema de color del sitio**, y el oro `#c9a84c` es un cuarto dorado | Alinear el oro del favicon a `--gold` `#b08d57`; adoptar `#1a2255` como token real (`--navy`) o cambiarlo a `--foreground`. Y usar el monograma en el header | **S** |

---

## 5. Accesibilidad

Ratios calculados con la fórmula WCAG 2.1 (luminancia relativa sRGB). Todos verificables.

### 5.1 Contraste — fallos confirmados

| # | Dónde | Combinación | Ratio | Requisito | Estado |
|---|---|---|---|---|---|
| 1 | `products/[id]/page.tsx:66`, `collections/page.tsx:158`, `product-card.tsx:72`, `page.tsx:112` — **el precio** | `#d4af37` sobre `#f8f7f6` | **1.82:1** | 4.5:1 | ✗ crítico |
| 2 | `chat-widget.tsx:285` header del chat | `#ffffff` sobre `#d4af37` | **1.94:1** | 4.5:1 | ✗ crítico |
| 3 | `chat-widget.tsx:387` burbuja del usuario | `#ffffff` sobre `#d4af37` | **1.94:1** | 4.5:1 | ✗ crítico |
| 4 | `chat-widget.tsx:420` chips de sugerencia | `#d4af37` sobre `white/50` | **~1.9:1** | 4.5:1 | ✗ crítico |
| 5 | `whatsapp-button.tsx:26` ícono del FAB | `#ffffff` sobre `#25D366` | **1.98:1** | 3:1 (gráfico) | ✗ |
| 6 | `footer.tsx:207` copyright | `white/30` sobre `#1a170f` | **2.70:1** | 4.5:1 | ✗ |
| 7 | `footer.tsx:269` horario del modal | `white/40` sobre `#1a170f` | **~3.6:1** | 4.5:1 | ✗ |
| 8 | `products/[id]/page.tsx:33` badge "En Stock" | `green-600` sobre `green-100` | **3.00:1** | 4.5:1 | ✗ |
| 9 | `products/[id]/page.tsx:32` badge "Bajo Pedido" | `orange-600` sobre `orange-100` | **3.11:1** | 4.5:1 | ✗ |
| 10 | `footer.tsx:133,338,405`, `contact/page.tsx:159` botones WhatsApp | `#ffffff` sobre `green-600 #16a34a` | **3.30:1** | 4.5:1 | ✗ |
| 11 | `globals.css:18` `--muted-foreground` (usado en toda descripción y metadato) | `#737373` sobre `#f8f7f6` | **4.43:1** | 4.5:1 | ✗ por poco |
| 12 | `globals.css:23` `--border` en inputs | `#e5e5e5` sobre `#f8f7f6` | **1.18:1** | 3:1 (WCAG 1.4.11) | ✗ |
| 13 | `page.tsx:60` copy del hero | `gray-200` sobre imagen con `brightness-75` + `bg-black/20` | no determinable | 4.5:1 | ⚠ depende de la foto |

Con los tokens propuestos: precio `#14120D` sobre `#FAF8F4` = **17.6:1**; `--muted-foreground #5F5952` = **6.5:1**; `--gold-ink #7A5C24` = **5.9:1**; `--gold-soft #D9BE84` sobre `--foreground` = **10.4:1**; `--border-strong #8C8477` = **3.5:1**. Todos AA, varios AAA.

### 5.2 Foco

- **`--ring` es idéntico a `--primary`** (`globals.css:25` y `:13`, ambos `45 68% 52%`). El anillo de foco de `button.tsx:8` (`focus-visible:ring-ring`) es del mismo color que el fondo del botón primario → **contraste 1:1, foco literalmente invisible** en todos los botones dorados del sitio. Fix: `--ring: 40 54% 30%`.
- **`<button>` crudos sin ningún estilo de foco:** `footer.tsx:178,179` (Agendar Cita / Guía de Tallas), `footer.tsx:185` (mapa), `footer.tsx:248,306,371` (cierres de modal), `chat-widget.tsx:313,502`, `reviews-carousel.tsx:540,541` (flechas). Fix: la regla `:focus-visible` global de §3.1.
- **`<div onClick>` no enfocables:** `reviews-carousel.tsx:531-537` (los dots del carrusel). No se pueden operar con teclado ni las anuncia el lector de pantalla. Fix: `<button aria-label={`Ir a la reseña ${i+1}`} aria-current={i===index}>`.
- **Los 3 modales artesanales del footer** (`:228,284,349`) no tienen focus-trap, no cierran con `Escape`, no tienen `role="dialog"` ni `aria-modal`, y no devuelven el foco al disparador. Migrar a `<Dialog>` de shadcn resuelve las cuatro cosas de una.
- `layout.tsx` no tiene skip-link ni `<main id>`.

### 5.3 Targets táctiles

| Elemento | Tamaño actual | Mínimo | Estado |
|---|---|---|---|
| `reviews-carousel.tsx:359-365,534` dots | **8×2 px** (28×2 el activo) | 24×24 (WCAG 2.5.8) | ✗ grave |
| `chat-widget.tsx:502-507` "(Cambiar)" | texto de **8px**, sin padding | 24×24 | ✗ |
| `footer.tsx:220,221` links legales | texto de 10px | 24×24 | ✗ |
| `chat-widget.tsx:299` cerrar chat `h-8 w-8` | 32×32 | 44×44 (HIG) | ⚠ |
| `header.tsx:104,108` buscar/favoritos `h-9 w-9` | 36×36 | 44×44 (HIG) | ⚠ |
| Botones `h-10` con `text-[10px]` (home, colecciones) | 40 px alto | 44 (HIG) | ⚠ |

### 5.4 Movimiento y otros

- **Sin `prefers-reduced-motion` en ningún archivo.** Y hay mucho que respetar: 4 `<video autoPlay loop>` (`page.tsx:98,155`), `animate-ping` permanente (`whatsapp-button.tsx:24`), `animate-bounce` (`page.tsx:71`, `chat-widget.tsx:403-405`), `animate-pulse` en un badge de oferta (`products/[id]/page.tsx:74`), el ticker de TradingView. Fix: el bloque `@media (prefers-reduced-motion: reduce)` de §3.1 + `autoPlay` condicional a `matchMedia`.
- **Videos sin alternativa textual ni controles.** Los 4 son decorativos → `aria-hidden="true"` + `poster` + `preload="metadata"`.
- **`dangerouslySetInnerHTML`** con HTML de WooCommerce (`products/[id]/page.tsx:86`) sin sanitizar y sin estilos: puede meter headings que rompan la jerarquía del documento (h1 duplicado).
- **Alt de imágenes:** `product.name` como alt en el detalle (`:42`) es correcto; en el resumen del checkout (`buy-button.tsx:147`) también. Bien resuelto.
- **`role="img"` / `<title>` faltante en `icons.tsx` (WhatsappIcon)** — se usa como único contenido de un botón que sí tiene `aria-label` (`whatsapp-button.tsx:21`), así que no es bloqueante, pero conviene `aria-hidden="true"` en el SVG.

---

## 6. Lo que NO hay que tocar

Hay decisiones acá que están bien tomadas y que un rediseño apurado rompería. Se conservan:

1. **La estructura del hero de home** (`page.tsx:42-76`). Full-bleed, `h-[90vh] md:h-screen`, jerarquía eyebrow → título → párrafo → CTA único, indicador de scroll abajo. Es exactamente la anatomía correcta. Solo cambian tamaños, tracking y overlay — la composición se queda.

2. **El ritmo escalonado de la grilla de colecciones destacadas** (`page.tsx:94`): `index === 1 ? 'lg:mt-16' : ''`. Ese desfasaje vertical de la tarjeta del medio es un gesto editorial real, de revista, y es lo más "caro" que tiene el sitio hoy. Conservarlo y extenderlo a la grilla de `/collections`.

3. **Playfair Display + Manrope como pareja.** Es una buena combinación: Didone de alto contraste para display, grotesca geométrica de trazo abierto para lectura. No hace falta cambiar las tipografías — hace falta usarlas bien (pesos, tracking, escala). Y `next/font` con `variable` está bien implementado (`layout.tsx:14-22`).

4. **La sección "El arte de la orfebrería"** (`page.tsx:148-184`). El video rotado `-rotate-3` que se endereza en hover con `duration-1000`, la veladura `bg-primary/5 rotate-6 blur-2xl` detrás, el `scale-110 → scale-100` del video: es la microinteracción mejor resuelta del sitio y se siente cara. Preservarla tal cual (solo cambiar el origen del video y agregar la guarda de reduced-motion).

5. **El contenido del carrusel de reseñas.** Nueve reseñas reales con nombre, antigüedad, badge de Local Guide, foto y un `TOTAL_REVIEWS = 34` con link a Google. La prueba social es específica y verificable — para una boutique con ticket alto, eso vale más que cualquier efecto visual. Se arregla la tipografía y el color, no el contenido ni la estructura de las tarjetas.

6. **El `TickerTape` de metales como concepto.** Cotización en vivo de oro, plata, platino y paladio en una joyería es una idea de contenido excelente: comunica que la casa trabaja con metal real y que el precio tiene fundamento. El problema es puramente cromático (`#131722`), no conceptual. Preservar la idea.

7. **La construcción del `icon.svg`.** Monograma JA en serif con `letter-spacing: -10`, dos alianzas entrelazadas con un rombo en la intersección y filete doble en el borde. Es un buen emblema, legible a tamaño chico y con un símbolo pertinente. Solo hay que armonizar los colores y **empezar a usarlo** — hoy es solo favicon.

8. **El flujo de checkout de `buy-button.tsx`.** Máquina de estados explícita (`idle | loading | redirecting`), validación de email antes de pegarle a la API, campos deshabilitados durante el envío, guarda contra cerrar el diálogo mientras procesa (`:104`), toast de feedback y delay de 600ms para que el usuario alcance a leerlo antes del redirect. Es UX de conversión bien pensada. Solo se le cambia la piel (gradiente → tinta).

9. **La higiene de configuración de `settings.ts`.** El comentario de cabecera que prohíbe explícitamente meter webhooks, tokens y API keys en el archivo público, con el `settings.server.ts` protegido por `server-only`. No es diseño, pero es la clase de disciplina que hay que preservar cuando entren los tokens nuevos: **el sistema de color va en `globals.css`, y nada de color se hardcodea en componentes.** Esa regla es el único seguro contra volver a tener tres dorados.

10. **El copy.** "Unión Eternamente Brillante", "El arte de la orfebrería", "Legado Alianzas", "Montevideo Flagship", "cada pieza es una promesa de amor y excelencia". El registro está bien calibrado: formal sin ser acartonado, con el voseo rioplatense en los formularios ("Dejá tus datos", "Completá tus datos") y el usted en las secciones institucionales. Eso es un criterio de marca deliberado y funciona. La única inconsistencia a corregir es el chat de Alma, que mezcla usted ("¿en qué pieza puedo asistirle?", `chat-widget.tsx:44`) con voseo ("para poder asesorarte mejor", `:105`) en la misma conversación.

---

## Orden de ejecución sugerido

| Fase | Qué | Esfuerzo | Riesgo |
|---|---|---|---|
| **0** | Definir `--font-headline`, `--gold`, `--white` en `globals.css` (arregla el carrusel de reseñas, 30 min) | S | nulo |
| **1** | Tokens completos: `globals.css` + `tailwind.config.ts` (§3.1, §3.2). Sin tocar componentes todavía | M | bajo |
| **2** | Barrido de color: eliminar los 7 `#d4af37` del chat, los `green-*`, `pink-*`, `#080b12`. Precio a tinta en los 4 lugares | S | bajo |
| **3** | Escala tipográfica: eliminar todo `text-[8px]`/`[9px]`/`[10px]`, aplicar `.eyebrow`, `.price`, tracking negativo en display | M | bajo |
| **4** | Contenedor y ritmo únicos: `.container-boutique` + `--section-y` + `--header-h` en las 5 páginas | M | medio (layout) |
| **5** | Ficha de producto: galería 4:5 + zoom + CTA único + `.description-content` | L | medio |
| **6** | Accesibilidad: foco global, dots y flechas del carrusel, modales del footer a `<Dialog>`, `prefers-reduced-motion` | M | bajo |
| **7** | Botón de WhatsApp, chat widget, número unificado, emojis fuera | M | bajo |
| **8** | Header: buscador y wishlist funcionales o eliminados; monograma en el lockup | M | medio |
