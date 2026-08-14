---
titulo: "Runbook de Operaciones — Joyería Alianza (producción Hostinger)"
proyecto: joyeria-alianza-headless
fecha: 2026-08-14
estado: vigente
reemplaza: "~/ja/RUNBOOK.md (obsoleto — no seguir)"
verificacion: "Toda variable de entorno de este documento fue verificada con búsqueda de process.env en ~/ja/src/. Se indica archivo:línea de lectura."
---

# Runbook de Operaciones — Joyería Alianza

Guía operativa del frontend headless. Para el detalle de seguridad, ver `04-auditoria-seguridad.md`.

---

## 1. Aviso de deprecación

> **`~/ja/RUNBOOK.md` está obsoleto. No lo sigas.** Este documento lo reemplaza en su totalidad.

El runbook viejo tiene tres errores que rompen despliegues reales:

### 1.1 Describe un flujo de chat que ya no corre

`RUNBOOK.md:8-16` documenta como arquitectura vigente:

```
Cliente (chat-widget) → POST /api/dify-chat → Dify API (/v1/chat-messages)
```

**Ninguna de las tres piezas está activa.** Verificado en el código:

- `src/components/chat-widget.tsx` **no está montado**: su import está comentado en `src/app/layout.tsx:10` (`// import { ChatWidget } from '@/components/chat-widget'; // Reemplazado por Evolution Widget`).
- Cuando estaba montado, `chat-widget.tsx:241` llamaba a `/api/alma-chat`, **no** a `/api/dify-chat`.
- `src/app/api/dify-chat/route.ts` no tiene ningún consumidor en `src/` (verificado por búsqueda). Está desplegado y muerto.

**Lo que realmente corre hoy** es el widget `@n8n/chat` cargado desde jsDelivr en `src/app/layout.tsx:54-81`, que desde el navegador del visitante llama **directo** a `https://n8n.axion380.com.br/webhook/alma-agent-2` (`layout.tsx:62`). El sitio Next.js no participa de ese flujo: no lo proxya, no lo valida y no lo puede limitar.

**Consecuencia operativa:** si seguís el diagnóstico del §5 del runbook viejo ("Chat no responde: verificá `DIFY_API_KEY`"), vas a configurar una variable que ningún flujo activo lee, y el chat va a seguir sin responder. La causa real está en n8n o en el CDN, no en la app.

### 1.2 Documenta variables de entorno que el código no lee

`RUNBOOK.md:67-69` (y `README.md:24-26`) indican configurar:

| Documentado (incorrecto) | Lo que el código realmente lee | Dónde |
|---|---|---|
| `WC_API_URL` | `WOO_BASE_URL` | `src/lib/woocommerce.ts:11` |
| `WC_CONSUMER_KEY` | `WOO_CONSUMER_KEY` | `src/lib/woocommerce.ts:12` |
| `WC_CONSUMER_SECRET` | `WOO_CONSUMER_SECRET` | `src/lib/woocommerce.ts:13` |

Verificado: la cadena `WC_API_URL` **no aparece en ningún archivo de `src/`**.

**Consecuencia operativa:** quien siga el runbook viejo carga las tres `WC_*`, el build pasa sin error, el sitio levanta perfecto y el catálogo queda **completamente vacío, sin ningún mensaje de error**. Es el fallo más caro del documento viejo y el más difícil de diagnosticar. Ver §7.2.

`README.md:27-28` agrega dos variables más que tampoco lee nadie: `NEXT_PUBLIC_SITE_URL` y `ADMIN_PASSWORD` (verificado: cero ocurrencias en `src/`).

### 1.3 Documenta un dashboard que no existe en este árbol

`README.md:35-46` describe un Kanban de pedidos en `/admin/orders` con drag & drop y persistencia en Supabase. **No existe.** `src/app/` contiene únicamente: `actions`, `api`, `checkout`, `collections`, `contact`, `globals.css`, `icon.svg`, `layout.tsx`, `page.tsx`, `products`, `recommendations`. No hay directorio `admin`. `src/lib/supabase.ts` existe pero **ningún archivo lo importa**.

Puede vivir en otro repositorio o haber sido eliminado. Mientras no se aclare, no cuentes con él como herramienta operativa y no busques `ADMIN_PASSWORD` en este proyecto.

### 1.4 Lo que del runbook viejo sigue siendo válido

- La exigencia de **Node 20.x LTS** (`RUNBOOK.md:63`, `README.md:9`). Confirmado por `package.json:6` (`"engines": { "node": ">=20.x" }`).
- La ruta de entrada de mensajes desde n8n hacia la web: `POST /api/webhook` (`RUNBOOK.md:48`). Sigue existiendo (`src/app/api/webhook/route.ts:11`) — pero **sin ninguna autenticación**, ver SEC-02.
- El aviso de que `/api/chat/webhook` es la ruta vieja (`RUNBOOK.md:89`). Confirmado: `src/app/api/chat/webhook/route.ts:7-13` devuelve 301 sin header `Location`, o sea que no redirige a nada.

---

## 2. Arquitectura de despliegue actual

```
                    ┌──────────────────────────────────────────┐
   Visitante ──────▶│  joyeria.a380.com.br                     │
                    │  Hostinger · Node.js App (hPanel)        │
                    │  Node 20.x LTS · Next.js 15.5.9          │
                    │  App Router · runtime nodejs             │
                    └───────────┬──────────────────────────────┘
                                │
              ┌─────────────────┼─────────────────────┐
              │                 │                     │
              ▼                 ▼                     ▼
   ┌────────────────────┐  ┌──────────────┐  ┌──────────────────┐
   │ joyeriabd.a380.    │  │ n8n.axion380 │  │ Supabase         │
   │ com.br             │  │ .com.br      │  │ lgdhnkfxberjzctg │
   │ WordPress +        │  │              │  │ ywiz.supabase.co │
   │ WooCommerce        │  │ webhooks:    │  │                  │
   │ REST /wc/v3        │  │ ja-checkout  │  │ orders /         │
   │ Basic Auth ck/cs   │  │ ja-tryon     │  │ order_items      │
   │ (server-only)      │  │ alma-agent-2 │  │ (sin consumidor  │
   └────────────────────┘  │ jaflujodev   │  │  en este repo)   │
                           └──────┬───────┘  └──────────────────┘
                                  │
                  ┌───────────────┴────────────────┐
                  ▼                                ▼
          Mercado Pago                     WhatsApp vendedor
          (preferencia de pago)            (notificaciones)

   ⚠️ El widget de chat NO pasa por Next.js:
      navegador ──directo──▶ n8n /webhook/alma-agent-2
      (cargado desde cdn.jsdelivr.net, layout.tsx:54-81)
```

### 2.1 Componentes

| Componente | Dónde | Rol | Notas operativas |
|---|---|---|---|
| Frontend Next.js | Hostinger, app Node.js en hPanel | Renderizado, proxy a WooCommerce, rutas de API | Node **20.x** obligatorio (`package.json:6`); Node 22 falla con `EBADENGINE` |
| WordPress + WooCommerce | `joyeriabd.a380.com.br` | Fuente de verdad del catálogo | Credenciales `ck_`/`cs_` en header `Authorization: Basic` (`woocommerce.ts:94, 100`) |
| n8n | `n8n.axion380.com.br` | Checkout Mercado Pago, agente Alma, try-on, notificaciones | **Los webhooks aceptan POST anónimos** — ver SEC-01 y SEC-13 |
| Supabase | proyecto `lgdhnkfxberjzctgywiz` | Pedidos / Kanban | Sin consumidor en este repo (`src/lib/supabase.ts` no lo importa nadie) |
| CDN jsDelivr | `cdn.jsdelivr.net` | Widget `@n8n/chat`, **sin versión fijada** | Dependencia externa en tiempo de ejecución — ver SEC-09 |

### 2.2 Rutas de API desplegadas

Estado verificado al 2026-08-14:

| Ruta | Archivo | Estado |
|---|---|---|
| `GET /api/health` | `api/health/route.ts` | Activa |
| `GET /api/products` | `api/products/route.ts` | Activa |
| `GET /api/products/[id]` | `api/products/[id]/route.ts` | Activa |
| `GET /api/categories` | `api/categories/route.ts` | Activa |
| `POST /api/virtual-tryon` | `api/virtual-tryon/route.ts` | Activa (usada por `virtual-try-on.tsx:55`) |
| `POST /api/webhook` | `api/webhook/route.ts` | Activa, **sin autenticación** |
| `GET /api/messages` | `api/messages/route.ts` | Activa, **IDOR** — solo tenía sentido con el widget nativo montado |
| `POST /api/alma-chat` | `api/alma-chat/route.ts` | Desplegada; su único consumidor (`chat-widget.tsx:241`) no está montado |
| `POST /api/dify-chat` | `api/dify-chat/route.ts` | Desplegada, **sin ningún consumidor** — legacy |
| `POST /api/send-message` | `api/send-message/route.ts` | Desplegada, autodeclarada `[LEGACY]` en `route.ts:13` |
| `POST/GET /api/chat/webhook` | `api/chat/webhook/route.ts` | Stub roto: 301 sin `Location` |

Todas declaran `export const runtime = 'nodejs'` salvo `api/chat/webhook` y `api/products/[id]` (que lo declara en línea 5).

---

## 3. Variables de entorno

**Tabla verificada.** Cada fila fue confirmada buscando `process.env` en `~/ja/src/`. Si una variable no está acá, **el código no la lee**.

### 3.1 Obligatorias

| Variable | Se lee en | Pública / Secreta | Descripción |
|---|---|---|---|
| `WOO_BASE_URL` | `src/lib/woocommerce.ts:11` | Servidor (no secreta, pero no se expone) | URL base de WordPress. Valor: `https://joyeriabd.a380.com.br`. Se normaliza en `cleanBaseUrl` (`woocommerce.ts:22-26`): admite con o sin `https://` y con o sin barra final. Se re-exporta y la usa `mappers.ts:11` para normalizar URLs de imágenes. |
| `WOO_CONSUMER_KEY` | `src/lib/woocommerce.ts:12` | **Secreta** | Consumer key de WooCommerce (`ck_...`). Va en header `Authorization: Basic` (`woocommerce.ts:94, 100`), nunca en query string. |
| `WOO_CONSUMER_SECRET` | `src/lib/woocommerce.ts:13` | **Secreta** | Consumer secret (`cs_...`). Mismo tratamiento. |

Sin las tres, `fetchWooCommerce` lanza `"Configuración de WooCommerce no encontrada..."` (`woocommerce.ts:67-69`) en **cada** request al catálogo. El sitio levanta igual, con cero productos y sin error visible. Ver §7.2.

### 3.2 Condicionalmente obligatorias

| Variable | Se lee en | Pública / Secreta | Descripción |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `src/lib/supabase.ts:4` | Pública (llega al bundle) | Anon key del proyecto. **`supabase.ts:6-8` hace `throw` si falta** — pero como hoy ningún archivo de `src/` importa `lib/supabase.ts`, el módulo no se evalúa y la ausencia no rompe nada. **Se vuelve obligatoria en cuanto algo lo importe.** |
| `NEXT_PUBLIC_SUPABASE_URL` | `src/lib/supabase.ts:3` | Pública | URL del proyecto. Tiene fallback **hardcodeado**: `https://lgdhnkfxberjzctgywiz.supabase.co`. Setearla explícitamente igual, para no depender del hardcode (SEC-14). |

### 3.3 Opcionales (con fallback en código)

| Variable | Se lee en | Pública / Secreta | Descripción |
|---|---|---|---|
| `N8N_TRYON_WEBHOOK_URL` | `src/app/api/virtual-tryon/route.ts:3` | Servidor | Webhook del probador virtual. Fallback hardcodeado: `https://n8n.axion380.com.br/webhook/ja-tryon`. |
| `NEXT_PUBLIC_GOOGLE_MAPS_KEY` | `src/components/layout/footer.tsx:14` | Pública | API key del embed de Maps del footer. Si falta, `footer.tsx:17` usa un embed de búsqueda sin key — el mapa funciona igual, degradado. |
| `MAINTENANCE_MODE` | `src/middleware.ts:6` | Servidor | Con valor exacto `"true"`, **todo el sitio devuelve 503** con la página de mantenimiento (`middleware.ts:8-35`). Cualquier otro valor, o ausente, es tráfico normal. |
| `NODE_ENV` | `src/app/api/health/route.ts:13` | — | La setea la plataforma. Se devuelve en el health check público (SEC-20, quitarlo). |

### 3.4 Legacy — eliminar del entorno

Estas variables las lee código que **no está en ningún camino activo**. Sacarlas de hPanel junto con el borrado de las rutas correspondientes (Fase 1 del plan de limpieza).

| Variable | Se lee en | Por qué es legacy |
|---|---|---|
| `DIFY_API_KEY` | `src/lib/settings.ts:26` (consumida en `api/dify-chat/route.ts:84, 111`) | El flujo Dify está muerto: `/api/dify-chat` no tiene consumidor. **Rotar antes de eliminar** — el `README.md:61` indica que estuvo hardcodeada en Base64 dentro de `settings.ts`. Ver §8.4. |
| `DIFY_BASE_URL` | `src/lib/settings.ts:28` (usada en `api/dify-chat/route.ts:107`) | Ídem. |
| `N8N_EVENT_WEBHOOK_URL` | `src/lib/settings.ts:30` (usada en `api/dify-chat/route.ts:52`) | Solo la usa la notificación de handoff de `/api/dify-chat`. Muerta con él. |
| `N8N_ALMA_WEBHOOK_URL` | `src/lib/settings.ts:12` **y** `src/app/api/alma-chat/route.ts:17` | Apunta a `/webhook/alma-agent`. El widget activo usa `alma-agent-**2**` hardcodeado en `layout.tsx:62`, que no lee esta variable. Queda huérfana mientras `<ChatWidget />` siga comentado. |

### 3.5 Documentadas pero inexistentes — NO configurar

Verificado: **cero ocurrencias en `src/`**. Configurarlas no tiene ningún efecto.

| Variable | Dónde se la documenta | Realidad |
|---|---|---|
| `WC_API_URL` | `README.md:24`, `RUNBOOK.md:67` | El código lee `WOO_BASE_URL` |
| `WC_CONSUMER_KEY` | `README.md:25`, `RUNBOOK.md:68` | El código lee `WOO_CONSUMER_KEY` |
| `WC_CONSUMER_SECRET` | `README.md:26`, `RUNBOOK.md:69` | El código lee `WOO_CONSUMER_SECRET` |
| `NEXT_PUBLIC_SITE_URL` | `README.md:27` | Nadie la lee. La URL del sitio está hardcodeada en `settings.ts:18` |
| `ADMIN_PASSWORD` | `README.md:28` | Nadie la lee. No existe panel admin en este árbol |

### 3.6 Valores hardcodeados sin variable de entorno

No son env vars, pero se comportan como configuración y hay que conocerlos:

| Valor | Ubicación | Riesgo |
|---|---|---|
| `https://n8n.axion380.com.br/webhook/ja-checkout` | `src/lib/settings.ts:21` | Viaja al bundle cliente (SEC-01, SEC-13) |
| `https://n8n.axion380.com.br/webhook/jaflujodev` | `src/lib/settings.ts:15` | Ídem |
| `https://n8n.axion380.com.br/webhook/alma-agent-2` | `src/app/layout.tsx:62` | Está en el HTML servido, llamado directo desde el navegador |
| `https://lgdhnkfxberjzctgywiz.supabase.co` | `src/lib/supabase.ts:3` | Project ref en el código |
| `59895435644` (WhatsApp tienda) | `src/lib/settings.ts:8` | Público por diseño |
| `59891264956` (WhatsApp producto) | `src/lib/whatsapp.ts:20` | **Distinto del anterior** — verificar cuál es el correcto |

---

## 4. Contenido sugerido de `.env.example`

Versionar este archivo en la raíz del repositorio. Hoy no existe.

```bash
# ─────────────────────────────────────────────────────────────
# Joyería Alianza — variables de entorno
# Copiar a .env.local (desarrollo) o cargar en hPanel (producción).
# Los nombres de este archivo son los que EL CÓDIGO LEE.
# Si viste WC_API_URL en el README viejo: está mal, es WOO_BASE_URL.
# ─────────────────────────────────────────────────────────────

# ── WooCommerce — OBLIGATORIAS ───────────────────────────────
# Sin estas tres el sitio levanta con el catálogo VACÍO y sin error visible.
# Leídas en src/lib/woocommerce.ts:11-13
WOO_BASE_URL=https://joyeriabd.a380.com.br
WOO_CONSUMER_KEY=ck_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
WOO_CONSUMER_SECRET=cs_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# ── Supabase ─────────────────────────────────────────────────
# Obligatorias SOLO si algo importa src/lib/supabase.ts (hoy no lo hace).
# supabase.ts:6-8 hace throw si falta la ANON_KEY.
# Leídas en src/lib/supabase.ts:3-4
NEXT_PUBLIC_SUPABASE_URL=https://lgdhnkfxberjzctgywiz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# ── n8n ──────────────────────────────────────────────────────
# Opcional: tiene fallback hardcodeado en el código.
# Leída en src/app/api/virtual-tryon/route.ts:3
N8N_TRYON_WEBHOOK_URL=https://n8n.axion380.com.br/webhook/ja-tryon

# ── Operación ────────────────────────────────────────────────
# "true" (exacto) => TODO el sitio devuelve 503 con página de mantenimiento.
# Leída en src/middleware.ts:6
MAINTENANCE_MODE=false

# Opcional: sin key, el mapa del footer usa el embed de búsqueda (degradado).
# Leída en src/components/layout/footer.tsx:14
NEXT_PUBLIC_GOOGLE_MAPS_KEY=

# ─────────────────────────────────────────────────────────────
# LEGACY — eliminar de hPanel junto con las rutas correspondientes.
# DIFY_API_KEY debe ROTARSE antes de borrarla (ver §8.4).
# ─────────────────────────────────────────────────────────────
# DIFY_API_KEY=            # settings.ts:26  — flujo muerto
# DIFY_BASE_URL=           # settings.ts:28  — flujo muerto
# N8N_EVENT_WEBHOOK_URL=   # settings.ts:30  — flujo muerto
# N8N_ALMA_WEBHOOK_URL=    # settings.ts:12 + api/alma-chat/route.ts:17 — huérfana

# ─────────────────────────────────────────────────────────────
# PENDIENTES tras el fix de checkout server-side (SEC-01).
# Todavía no existen en el código.
# ─────────────────────────────────────────────────────────────
# N8N_CHECKOUT_WEBHOOK_URL=https://n8n.axion380.com.br/webhook/ja-checkout
# N8N_CHECKOUT_TOKEN=      # header X-Webhook-Token; n8n rechaza si no coincide
# WEBHOOK_SHARED_SECRET=   # HMAC-SHA256 de /api/webhook (SEC-02)

# ─────────────────────────────────────────────────────────────
# NO CONFIGURAR — documentadas en el README viejo, nadie las lee:
#   WC_API_URL, WC_CONSUMER_KEY, WC_CONSUMER_SECRET,
#   NEXT_PUBLIC_SITE_URL, ADMIN_PASSWORD
# ─────────────────────────────────────────────────────────────
```

---

## 5. Procedimiento de despliegue

### 5.1 Prerrequisitos

- Acceso a hPanel de Hostinger.
- **Node 20.x LTS.** Node 22+ falla con `npm warn EBADENGINE` por `package.json:6`.
- Credenciales de WooCommerce con permisos de **lectura** (el frontend solo lee; `productService.ts:5-6` lo documenta).

### 5.2 Configuración inicial de la app en hPanel

1. hPanel → **Sitios Web** → *Administrar* → **Aplicación Node.js**.
2. **Versión de Node.js**: seleccionar **20.x**. Guardar.
3. Verificar que el dominio `joyeria.a380.com.br` apunte a la carpeta de la aplicación.
4. **Environment Variables**: cargar las de §3.1 y §3.2. Copiar los nombres **exactos** de este documento, no del `README.md`.
5. **Reinstalar dependencias** desde el panel.

### 5.3 Despliegue de una versión nueva

```bash
# 1. Traer los cambios
git pull --rebase origin main

# 2. Dependencias — usar ci, respeta el lockfile
npm ci

# 3. Build
npm run build
```

**Sobre el build:** hoy pasa incluso con errores de TypeScript, porque `next.config.ts:9` tiene `ignoreBuildErrors: true` y `next.config.ts:13` tiene `ignoreDuringBuilds: true`. **Un build verde no significa que el código compile.** No lo tomes como señal de calidad hasta que se apaguen esos flags (SEC-11). `npm run lint` (`package.json:10`) **no puede ejecutarse**: `eslint` no está instalado en el proyecto.

```bash
# 4. Arranque
npm run start   # next start
```

5. Reiniciar la aplicación desde hPanel.
6. Correr los health checks de §6 **en orden**. El paso 3 (`/api/products`) es el que detecta el error de env vars.

### 5.4 Ventana de mantenimiento

Para cambios que puedan dejar el sitio inconsistente:

1. hPanel → Environment Variables → `MAINTENANCE_MODE=true` → reiniciar.
2. Verificar: cualquier URL del sitio devuelve **503** con la página de mantenimiento.
3. Desplegar.
4. `MAINTENANCE_MODE=false` → reiniciar.
5. Health checks.

El middleware excluye estáticos e imágenes vía el matcher de `middleware.ts:42`, así que los assets siguen sirviéndose durante el mantenimiento.

### 5.5 Rollback

No hay pipeline de despliegue automatizado ni artefactos versionados. El rollback es manual:

```bash
git log --oneline -10           # identificar el commit bueno
git checkout <sha-bueno>
npm ci && npm run build && npm run start
```

Reiniciar desde hPanel y volver a correr §6. **Recordá:** cualquier reinicio vacía `messageStore` (`src/lib/messageStore.ts:16-22`) — los mensajes de chat en vuelo se pierden sin aviso (SEC-10).

---

## 6. Health checks

Correrlos en este orden después de cada despliegue. El orden importa: cada uno depende del anterior.

### 6.1 Proceso Node vivo

```bash
curl -s https://joyeria.a380.com.br/api/health
```

**Debe devolver** (`src/app/api/health/route.ts:10-14`):

```json
{"status":"ok","timestamp":"2026-08-14T...","environment":"production"}
```

| Resultado | Significado | Acción |
|---|---|---|
| `status: ok` | El proceso responde | Seguir al 6.2 |
| `environment` distinto de `production` | Deploy mal configurado: se van a exponer stack traces | Corregir `NODE_ENV` |
| 503 / timeout / connection refused | El proceso está caído | Ver §7.1 |
| HTML de mantenimiento | `MAINTENANCE_MODE=true` sigue activo | Ponerlo en `false` y reiniciar |

> Nota: este endpoint **no verifica ninguna dependencia**. Devuelve `ok` con WordPress caído, Supabase caído y n8n caído. Es un "¿está vivo Node?", nada más.

### 6.2 Catálogo — el check que más importa

```bash
curl -s "https://joyeria.a380.com.br/api/products?per_page=3" | head -c 400
```

**Debe devolver** un array JSON con productos reales (id, name, price, images).

| Resultado | Significado | Acción |
|---|---|---|
| Array con productos | Cadena Next → WooCommerce OK | Seguir al 6.3 |
| `[]` (array vacío) | **Casi siempre: env vars `WC_*` en vez de `WOO_*`** | Ver §7.2 |
| 502 con `"Error de comunicación con el catálogo."` | `fetchWooCommerce` lanzó (`products/route.ts:63-70`) | Revisar credenciales y que WordPress responda |
| 502 con `"Respuesta de catálogo inválida"` | WooCommerce devolvió algo que no es array (`products/route.ts:47-53`) | Revisar `/wp-json/wc/v3/products` a mano; suele ser un plugin rompiendo el JSON |

Verificación cruzada de la ficha individual:

```bash
curl -s https://joyeria.a380.com.br/api/products/<ID_REAL> | head -c 300
curl -s https://joyeria.a380.com.br/api/categories | head -c 300
```

### 6.3 Renderizado y precio

Abrir en un navegador: `https://joyeria.a380.com.br/products/<ID_REAL>`

Verificar:
- La imagen principal carga (viene de `joyeriabd.a380.com.br`, autorizado en `next.config.ts:18-23`).
- **El precio coincide exactamente con WooCommerce.** Comparar con wp-admin. Si no coincide, sospechar del fallback a caché expirada (`woocommerce.ts:125`, SEC-17).
- La descripción se renderiza con formato.
- El botón "Comprar Ahora" está habilitado si hay stock (`buy-button.tsx:98`).

### 6.4 Recepción de mensajes desde n8n

```bash
curl -s https://joyeria.a380.com.br/api/webhook
```

**Debe devolver** (`api/webhook/route.ts:44-50`):

```json
{"status":"online","service":"Alianza Chat Webhook","info":"Endpoint listo para recibir mensajes de n8n mediante POST."}
```

Si devuelve 404, n8n está apuntando mal. La ruta correcta es `/api/webhook`, **no** `/api/chat/webhook` (esa devuelve 301 sin `Location` y no redirige, `api/chat/webhook/route.ts:8`).

> **Advertencia de seguridad:** este endpoint acepta POST de cualquiera, sin firma. Ver SEC-02. No lo publiques en documentación externa.

### 6.5 Chat

**Este check no toca la app.** El widget llama directo a n8n desde el navegador.

1. Abrir el sitio, abrir la burbuja del chat, mandar un mensaje.
2. En DevTools → Network, verificar el POST a `https://n8n.axion380.com.br/webhook/alma-agent-2`.
3. Alma debe responder.

Si no responde, el problema está en n8n o en el CDN, **nunca** en las variables de entorno de Hostinger. Ver §7.4.

### 6.6 Checklist rápida

```bash
#!/usr/bin/env bash
B=https://joyeria.a380.com.br
echo "health:     $(curl -s -o /dev/null -w '%{http_code}' $B/api/health)"
echo "products:   $(curl -s -o /dev/null -w '%{http_code}' $B/api/products?per_page=1)"
echo "categories: $(curl -s -o /dev/null -w '%{http_code}' $B/api/categories)"
echo "webhook:    $(curl -s -o /dev/null -w '%{http_code}' $B/api/webhook)"
echo "home:       $(curl -s -o /dev/null -w '%{http_code}' $B/)"
echo "n productos: $(curl -s "$B/api/products?per_page=5" | grep -o '"id"' | wc -l)"
```

Los cinco códigos deben ser `200`, y el conteo de productos **mayor que cero**. Un `200` con cero productos es el fallo silencioso de §7.2.

---

## 7. Resolución de problemas

### 7.1 Error 503 — el proceso Node está caído

**Síntoma:** todas las URLs devuelven 503, o el sitio no responde. `/api/health` no contesta.

**Primero, descartar lo obvio:** si el 503 devuelve **HTML con "Sitio en Mantenimiento"**, no es una caída — es `MAINTENANCE_MODE=true` (`middleware.ts:6-35`). Ponerlo en `false` y reiniciar.

**Causa más frecuente: agotamiento de memoria.** El plan de Node.js compartido de Hostinger tiene un techo de RAM que este proceso alcanza con facilidad, por cuatro razones concretas del código:

1. `src/lib/woocommerce.ts:16` — `memCache` es un `Map` **sin tope de entradas**. Cada combinación distinta de parámetros crea una entrada permanente. Como `per_page` no se valida (`products/route.ts:15`, SEC-06), cualquiera puede generar entradas ilimitadas.
2. `src/lib/messageStore.ts:16-22` — otro `Map` sin TTL global. Limita a 50 mensajes por teléfono (`messageStore.ts:39`), pero no limita la cantidad de teléfonos.
3. `src/app/api/virtual-tryon/route.ts:7-8` — parsea data URIs **de tamaño ilimitado** y los retiene hasta 90 s (`route.ts:16`). Unas pocas requests concurrentes con imágenes grandes son cientos de MB de heap.
4. 13 dependencias instaladas sin usar (SEC-19), incluidas `three` y `recharts`, que engordan el build.

**Diagnóstico:**

```bash
# En hPanel → Node.js App → Logs, buscar:
#   "JavaScript heap out of memory"
#   "FATAL ERROR: Reached heap limit"
#   "FETCH_CRITICAL_FAILURE"
```

**Acciones inmediatas:**

1. Reiniciar la app desde hPanel. **Esto vacía `messageStore` y `memCache`** — se pierden los mensajes de chat en vuelo, sin aviso al cliente.
2. Si vuelve a caer en minutos, revisar los logs de acceso buscando ráfagas contra `/api/virtual-tryon`, `/api/messages` o `/api/products?per_page=`.
3. Si hay ráfagas, es abuso (SEC-05). Mitigación temporal: bloquear la IP en hPanel. Solución real: rate limiting en `middleware.ts`.

**Causa secundaria: puerto incorrecto.** Hostinger inyecta el puerto por la variable `PORT`; `next start` la respeta. Si se agregó un `-p` fijo al script de arranque, el proceso escucha donde el proxy no busca. Verificar que `package.json:11` siga siendo `"start": "next start"`, sin flags.

**Causa terciaria: versión de Node.** Si el panel se cambió a Node 22, la instalación tira `EBADENGINE` y el arranque puede fallar. hPanel → Aplicación Node.js → Versión → **20.x** → *Reinstalar dependencias*.

### 7.2 Catálogo vacío — el sitio se ve perfecto y no hay productos

**Síntoma:** el sitio carga, el diseño está bien, no hay ningún error visible, y no aparece un solo producto. `/api/products` devuelve `[]` o 502.

**Causa raíz (la abrumadoramente más común): las variables se cargaron como `WC_*` en vez de `WOO_*`.**

Es un fallo inducido por la documentación vieja. `README.md:24-26` y `RUNBOOK.md:67-69` dicen `WC_API_URL`, `WC_CONSUMER_KEY`, `WC_CONSUMER_SECRET`. El código lee `WOO_BASE_URL`, `WOO_CONSUMER_KEY`, `WOO_CONSUMER_SECRET` (`woocommerce.ts:11-13`).

**Por qué el fallo es silencioso** — la cadena completa traga el error:

1. `woocommerce.ts:67-69` lanza `"Configuración de WooCommerce no encontrada..."`.
2. `products/route.ts:63-69` lo captura y devuelve **502**.
3. `productService.ts:22-25` ve el `!response.ok`, escribe `console.warn("API de productos no disponible.")` **en la consola del navegador** y devuelve `[]`.
4. La UI renderiza una lista vacía sin distinguir "no hay productos" de "no pude conectarme".

Resultado: el operador ve un sitio funcionando y no tiene ninguna señal de que la joyería está online sin poder vender.

**Diagnóstico en 30 segundos:**

```bash
curl -i https://joyeria.a380.com.br/api/products?per_page=1
```

- **502 con `"Error de comunicación con el catálogo."`** → confirmado. Ir a hPanel → Environment Variables y verificar los nombres letra por letra.
- **200 con `[]`** → las credenciales llegan pero WooCommerce no devuelve nada. Ver más abajo.

**Solución:**

1. hPanel → Node.js App → Environment Variables.
2. Renombrar: `WC_API_URL` → **`WOO_BASE_URL`**, `WC_CONSUMER_KEY` → **`WOO_CONSUMER_KEY`**, `WC_CONSUMER_SECRET` → **`WOO_CONSUMER_SECRET`**.
3. Reiniciar la aplicación (las env vars se leen al arrancar el proceso).
4. Verificar con §6.2.

**Otras causas de catálogo vacío, en orden de probabilidad:**

| Causa | Cómo confirmarla |
|---|---|
| Credenciales revocadas o sin permisos | `curl -u "ck_xxx:cs_xxx" "https://joyeriabd.a380.com.br/wp-json/wc/v3/products?per_page=1"` → si da 401, rotar (§8.1) |
| REST API de WooCommerce deshabilitada | La misma `curl` da 404 → revisar plugins de seguridad de WordPress que bloqueen `/wp-json/` |
| Todos los productos en borrador | `products/route.ts:24` filtra por `status: 'publish'` |
| Categoría inexistente en el filtro | `products/route.ts:38-42` devuelve `[]` con header `X-Cache: EMPTY-CAT` — mirar ese header, es el indicador exacto |
| Hostinger bloquea salidas HTTPS | Probar la `curl` **desde el servidor**, no desde tu máquina |

### 7.3 Imágenes que no cargan

**Síntoma:** las tarjetas de producto muestran huecos, marcos rotos o placeholders.

**Diagnóstico por orden:**

1. **¿El dominio está autorizado?** `next.config.ts:18-38` permite solo `joyeriabd.a380.com.br`, `images.unsplash.com` y `picsum.photos`. Si WordPress empezó a servir imágenes desde un CDN o subdominio nuevo, `next/image` las rechaza. Síntoma exacto: error en consola del navegador `Invalid src prop ... hostname is not configured`. **Fix:** agregar el `remotePattern`.

   Ojo con esto: `products/[id]/page.tsx:41` usa `https://placehold.co` como fallback cuando el producto no tiene imágenes, y **ese dominio no está en `remotePatterns`**. Funciona solo porque `unoptimized: true` (`next.config.ts:17`) puentea la validación del optimizador. Si algún día se pone `unoptimized: false`, ese fallback rompe.

2. **¿La URL que se genera es correcta?** `mappers.ts:7-15` (`normalizeImageUrl`) antepone `WOO_BASE_URL` a las rutas relativas. Si `WOO_BASE_URL` está mal, vacía o con barra final rara, las URLs salen malformadas. Verificar:

   ```bash
   curl -s "https://joyeria.a380.com.br/api/products?per_page=1" | grep -o '"images":\[[^]]*\]'
   ```

   Deben ser URLs absolutas y bien formadas. Si empiezan con `/wp-content/...`, `WOO_BASE_URL` no está seteada.

3. **¿WordPress sirve el archivo?** Abrir la URL de la imagen directo en el navegador. Si da 403 o 404, el problema es del lado de WordPress (permisos de `wp-content/uploads`, hotlink protection, o un plugin de seguridad).

4. **¿Es un problema de rendimiento y no de carga?** Con `unoptimized: true` no hay WebP, ni redimensionado, ni `srcset`. En móvil con conexión lenta las imágenes tardan tanto que parecen no cargar. No es un error: es SEC-18.

5. **Videos en la descripción:** `mappers.ts:23-44` convierte shortcodes `[video]` en `<video>`. Si el video no aparece, revisar que el shortcode traiga `src=` o `mp4=` entre comillas — la regex de `mappers.ts:26` no matchea otras formas.

### 7.4 El chat no responde

**Lo primero, y contradice al runbook viejo: `DIFY_API_KEY` no tiene nada que ver.** `RUNBOOK.md:90` dice que la revises. El flujo Dify no corre: `/api/dify-chat` no tiene consumidor.

**Identificar qué chat es el que falla:**

| Chat | Camino real | Diagnóstico |
|---|---|---|
| Burbuja del widget (lo que ve el visitante) | Navegador → **directo** a `n8n /webhook/alma-agent-2` (`layout.tsx:62`) | El problema está en n8n o en el CDN. Next.js no participa |
| `<ChatWidget />` nativo | `chat-widget.tsx:241` → `/api/alma-chat` → n8n `/webhook/alma-agent` | Solo aplica si alguien descomentó `layout.tsx:10` |

**Para el widget activo (el caso normal):**

1. **DevTools → Console.** ¿Se cargó el módulo? Si hay error de red al pedir `https://cdn.jsdelivr.net/npm/@n8n/chat/dist/chat.bundle.es.js`, el problema es jsDelivr o la conectividad del cliente. La app no puede hacer nada: el script no tiene versión fijada ni copia local (SEC-09).
2. **DevTools → Network → el POST a `alma-agent-2`.**
   - **404** → el workflow de n8n está desactivado o el path cambió. Entrar a n8n y verificar que el workflow esté *Active*.
   - **500** → falla un nodo interno de n8n (credencial de OpenAI vencida, quota agotada, tool rota). El log está en n8n → *Executions*.
   - **Timeout / sin respuesta** → n8n caído, o el workflow tarda más de lo que aguanta el widget.
   - **Error de CORS** → el nodo Webhook de n8n dejó de mandar las cabeceras de CORS para `joyeria.a380.com.br`. Se arregla en n8n, en las opciones de respuesta del webhook.
3. **Verificar n8n directamente**, salteando el navegador:

   ```bash
   curl -i -X POST https://n8n.axion380.com.br/webhook/alma-agent-2 \
     -H 'Content-Type: application/json' \
     -d '{"chatInput":"hola","sessionId":"diag-runbook"}'
   ```

   Si esto responde y el widget no, el problema es de frontend (CDN, CORS, bloqueador de anuncios). Si esto tampoco responde, es n8n.

**Si el que falla es el flujo nativo (widget descomentado):**

1. `curl -i -X POST https://joyeria.a380.com.br/api/alma-chat -H 'Content-Type: application/json' -d '{"mensaje":"hola","sessionId":"diag"}'`
2. **504** → n8n no respondió en 45 s (`api/alma-chat/route.ts:51, 84-88`).
3. **`success:false` con `error: "Error del agente (5xx)"`** → n8n devolvió error; el detalle está en el log del servidor Next, no en la respuesta (`route.ts:58`).
4. Verificar que `N8N_ALMA_WEBHOOK_URL` apunte a un workflow **activo** — el fallback de `route.ts:17-18` es `/webhook/alma-agent` (sin el `-2`), que puede ser un workflow viejo.

**Caso especial — el cliente dice que la asesora no le responde, pero la asesora asegura haber escrito.** Ese es el escenario de SEC-03: el `consume()` de `/api/messages` es destructivo y cualquiera puede vaciar la bandeja de cualquier teléfono. Si además hubo un reinicio del proceso, los mensajes se perdieron en el `Map` en memoria (SEC-10). Los dos fallan en silencio absoluto y ninguno deja rastro. Si el patrón se repite, es el hallazgo, no una casualidad.

### 7.5 Otros síntomas frecuentes

| Síntoma | Causa probable | Verificación |
|---|---|---|
| Precios desactualizados respecto de WooCommerce | Fallback a caché expirada **sin tope** tras un fallo de red (`woocommerce.ts:125`) | Buscar `"Fallback a cache expirado"` en los logs. Reiniciar la app limpia la caché |
| El precio del sitio no coincide con el del checkout de Mercado Pago | El precio lo manda el navegador (SEC-01) | **Tratar como incidente de seguridad**, no como bug de datos |
| Ofertas que no aparecen | `isSaleActive` (`mappers.ts:50-67`) compara contra `date_on_sale_from_gmt` / `to_gmt` interpretándolas como UTC (`mappers.ts:57, 62`) | Verificar la zona horaria de WordPress: una oferta con fechas en hora local se activa/desactiva desfasada |
| Categoría que no filtra | El slug no existe → `[]` con header `X-Cache: EMPTY-CAT` (`products/route.ts:38-42`) | Comparar con `/api/categories`. El mapa se cachea 1 h (`woocommerce.ts:8`): un slug nuevo tarda hasta una hora en aparecer |
| Probador virtual siempre falla | n8n `/webhook/ja-tryon` caído, o timeout de 90 s (`virtual-tryon/route.ts:16`) | `curl` directo al webhook de n8n |
| Errores 404 en el webhook | n8n apuntando a la ruta vieja | Debe ser `/api/webhook`, no `/api/chat/webhook` |

---

## 8. Rotación de credenciales

Procedimiento general, aplicable a todas: **crear la nueva antes de revocar la vieja**, para no tener ventana de caída.

### 8.1 WooCommerce (`WOO_CONSUMER_KEY` / `WOO_CONSUMER_SECRET`)

**Cuándo:** rotación programada cada 6 meses; inmediata ante cualquier sospecha de exposición o salida de una persona del equipo.

1. `joyeriabd.a380.com.br/wp-admin` → **WooCommerce** → *Ajustes* → *Avanzado* → **REST API**.
2. *Añadir clave*: descripción `frontend-nextjs-2026-08`, usuario de servicio (no una cuenta personal), permisos **solo Lectura**.
3. Copiar `ck_...` y `cs_...` — se muestran **una sola vez**.
4. Verificar la clave nueva **antes** de tocar producción:
   ```bash
   curl -u "ck_nuevo:cs_nuevo" \
     "https://joyeriabd.a380.com.br/wp-json/wc/v3/products?per_page=1&status=publish"
   ```
   Debe devolver un producto. Si da 401, la clave no está bien; parar acá.
5. hPanel → Environment Variables → actualizar `WOO_CONSUMER_KEY` y `WOO_CONSUMER_SECRET`.
6. **Reiniciar la aplicación** (`woocommerce.ts:11-13` lee las variables al cargar el módulo).
7. Health check §6.2. **Con productos reales**, no solo código 200.
8. Recién ahí: wp-admin → REST API → **revocar la clave vieja**.
9. Revisar si la clave vieja se usaba en otro lado: workflows de n8n, scripts de sincronización, integraciones de terceros. Revocarla sin avisar rompe esos flujos.

**Nunca** poner `consumer_key`/`consumer_secret` en la query string. El código hace lo correcto (header `Authorization: Basic`, `woocommerce.ts:94, 100`) — mantenerlo así: en query string quedan en los logs de WordPress, en los de n8n y en cualquier proxy del camino.

### 8.2 Supabase

**Anon key (`NEXT_PUBLIC_SUPABASE_ANON_KEY`).** Es pública por diseño: viaja al bundle del navegador. Rotarla **no es una medida de seguridad**; la protección real es RLS.

1. **Antes de rotar nada, auditar RLS.** Panel de Supabase → *Authentication* → *Policies*. Confirmar que `orders` y `order_items` tengan RLS **activo** y que no exista ninguna política `USING (true)` para el rol `anon`. Como el frontend público no consulta esas tablas, lo correcto es: `anon` sin acceso, y acceso solo con `service_role` desde el servidor.
2. Si RLS está mal, arreglarlo es la prioridad — rotar la key sin arreglar RLS no cambia nada, porque la key nueva también es pública.
3. Para rotar: Supabase → *Settings* → *API* → *Reset JWT secret*. **Esto invalida todas las claves del proyecto**, incluida la `service_role` que puedan estar usando los workflows de n8n. Coordinarlo.
4. Actualizar `NEXT_PUBLIC_SUPABASE_ANON_KEY` en hPanel, rebuild (es `NEXT_PUBLIC_`, se embebe en el bundle en tiempo de build) y reiniciar.
5. Actualizar las credenciales en n8n.

**Service role key:** no la lee ningún archivo de este proyecto (verificado). Si aparece en algún workflow de n8n, tratarla como el secreto más sensible del stack: da acceso total saltándose RLS.

### 8.3 OpenAI / Google (credenciales de IA)

**Dónde viven realmente:** este proyecto **no lee ninguna API key de OpenAI** (verificado: cero ocurrencias de `OPENAI` en `src/`). Las credenciales del modelo que usa Alma están **dentro de n8n**, en las credenciales del workflow `alma-agent-2`.

El único acceso a IA del propio código es Genkit con Google AI (`src/ai/genkit.ts:4-7`), que toma la key del entorno estándar de Google (`GEMINI_API_KEY` / `GOOGLE_API_KEY` según el proveedor). Nota: `src/ai/flows/virtual-try-on.ts` y `src/ai/flows/personalized-recommendations.ts` usan Genkit, pero **el probador virtual en producción no pasa por ahí** — `virtual-try-on.tsx:55` llama a `/api/virtual-tryon`, que reenvía a n8n. El flow de Genkit está sin usar en ese camino.

**Rotación en n8n:**

1. Panel del proveedor (OpenAI → *API keys*) → crear una key nueva, con límite de gasto mensual configurado.
2. n8n → *Credentials* → editar la credencial del modelo → pegar la key nueva → *Save*.
3. n8n → abrir el workflow `alma-agent-2` → *Test workflow* con un mensaje de prueba.
4. Verificar desde el sitio (§6.5).
5. Revocar la key vieja en el panel del proveedor.
6. Revisar el uso las siguientes 24 h: si el consumo no baja a cero en la key vieja antes de revocarla, hay otro sistema usándola.

**Rotación de Gemini (si se activan los flows de Genkit):** Google AI Studio → *API keys* → crear nueva → actualizar en hPanel → reiniciar → revocar la vieja. **Antes de habilitar esos flows en producción, resolver SEC-08** (prompt injection) y SEC-05 (rate limiting): hoy el server action de recomendaciones es un endpoint público sin auth ni tope de longitud de entrada.

### 8.4 `DIFY_API_KEY` — caso urgente

**Por qué es urgente:** `README.md:61` documenta textualmente que las tres variables `DIFY_*` tuvieron *"fallback codificado en Base64 dentro de `settings.ts`"*. Base64 no es cifrado — se revierte con `base64 -d`. Si ese archivo se commiteó, la key está en el historial de git y es recuperable por cualquiera con acceso al repositorio.

**Estado actual del código:** el fallback **ya no está**. `src/lib/settings.ts:24-31` lee las tres variables con fallback a string vacío. El riesgo es histórico, no presente.

**No pude confirmar el historial:** la copia auditada de `~/ja/` no tiene directorio `.git`. **Verificar contra el repositorio real.**

**Procedimiento (asumir comprometida — es más barato que averiguarlo):**

```bash
# 1. Buscar la key en TODO el historial, no solo en HEAD
git log -p --all -- src/lib/settings.ts | grep -iE 'dify|app-[A-Za-z0-9]{20,}'

# 2. De paso, buscar credenciales de WooCommerce en el historial
git log -p --all | grep -oE '(ck_|cs_)[a-f0-9]{20,}' | sort -u

# 3. Si aparece algo en Base64, decodificarlo para confirmar qué es
echo '<cadena_base64>' | base64 -d
```

1. **Revocar la key en Dify** → *Apps* → *Access API* → revocar la actual. Revocar, no solo rotar: si está en el historial, la vieja hay que matarla.
2. **Verificar el uso reciente** en Dify: consumo de tokens y conversaciones de los últimos meses. Si hay actividad que no reconocés, la key ya se estaba usando.
3. **Decisión: no generar una key nueva.** El flujo Dify está muerto (`/api/dify-chat` sin consumidor). Lo correcto es:
   - Borrar `src/app/api/dify-chat/route.ts`.
   - Borrar las tres entradas de `serverSettings` en `settings.ts:24-31`.
   - Eliminar `DIFY_API_KEY`, `DIFY_BASE_URL` y `N8N_EVENT_WEBHOOK_URL` de hPanel.
   - Corregir `README.md:48-61`, que sigue describiendo el flujo Dify como activo.
   - Una credencial revocada y un endpoint borrado no se filtran nunca más.
4. **Si el repositorio es público**, la revocación no alcanza para el historial: evaluar `git filter-repo` para purgar el archivo. Coordinarlo — reescribe hashes y obliga a todos los clones a rehacerse.

### 8.5 Secretos pendientes de creación

Estos todavía no existen. Se crean junto con los fixes correspondientes:

| Secreto | Para qué | Hallazgo | Generar con |
|---|---|---|---|
| `N8N_CHECKOUT_TOKEN` | Header `X-Webhook-Token` que n8n valida en `ja-checkout` | SEC-01 | `openssl rand -hex 32` |
| `WEBHOOK_SHARED_SECRET` | Clave HMAC-SHA256 de `/api/webhook` | SEC-02 | `openssl rand -hex 32` |

Ambos son secretos compartidos entre Next.js y n8n: hay que cargarlos en los dos lados **en la misma ventana**. Procedimiento: activar la validación en n8n en modo permisivo (aceptar con y sin token), desplegar Next con el token, confirmar que las requests llegan firmadas, y recién entonces poner n8n en modo estricto (rechazar sin token).

---

## 9. Contactos y accesos

| Sistema | URL | Notas |
|---|---|---|
| Sitio | `https://joyeria.a380.com.br` | Producción |
| Panel de hosting | hPanel de Hostinger | Node.js App, env vars, logs, reinicio |
| WordPress / WooCommerce | `https://joyeriabd.a380.com.br/wp-admin` | Catálogo, precios, stock, claves REST |
| n8n | `https://n8n.axion380.com.br` | Workflows, credenciales de IA, executions |
| Supabase | proyecto `lgdhnkfxberjzctgywiz` | Pedidos; verificar RLS |
| WhatsApp tienda | `59895435644` | `settings.ts:8` |
| WhatsApp consultas de producto | `59891264956` | `whatsapp.ts:20` — **distinto del anterior, confirmar cuál corresponde** |

---

## 10. Deuda operativa conocida

Lo que hoy no se puede hacer, y de dónde viene:

| Limitación | Origen | Hallazgo |
|---|---|---|
| No hay rollback automatizado ni artefactos versionados | Sin pipeline de CI/CD | — |
| Un build verde no garantiza que el código compile | `next.config.ts:9, 13` | SEC-11 |
| `npm run lint` no puede ejecutarse | `eslint` no está instalado | SEC-11 |
| Cero tests: ninguna regresión se detecta antes de producción | Sin suite | SEC-11 |
| Un reinicio pierde los mensajes de chat en vuelo, sin aviso | `messageStore.ts:16-22` | SEC-10 |
| No se puede escalar a más de una instancia | Estado en memoria del proceso | SEC-10 |
| Ningún endpoint tiene límite de tasa: el sitio se puede tumbar desde una terminal | Ausencia sistémica | SEC-05 |
| El health check dice `ok` con WordPress, n8n y Supabase caídos | `api/health/route.ts:9-15` | SEC-20 |
| No hay monitoreo, alertas ni agregación de logs | — | — |

---

*Runbook verificado contra `~/ja/src/` — 2026-08-14. Reemplaza `~/ja/RUNBOOK.md`. Ver `04-auditoria-seguridad.md` para el detalle de los hallazgos SEC-nn.*
