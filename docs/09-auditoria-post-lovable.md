---
titulo: Auditoría post-Lovable — qué quedó bien, qué quedó a medias, qué empeoró
fecha: 2026-08-15
estado: Código real leído en C:\Users\it\...\joyeriawp-main vía device bridge
---

# Resumen ejecutivo

Lovable ejecutó parte del prompt de F1/F2/F3/F5, pero **dejó dos fallas nuevas más graves que las originales** y no completó el borrado de código muerto. No está listo para producción.

| Fase | Estado |
|---|---|
| F1.1 Checkout server-side | 🟡 Parcial — el flujo activo está bien, pero `checkout.ts` (el inseguro) sigue en el repo sin usar |
| F1.2 Firma HMAC webhook | 🟢 Resuelto |
| F1.3 IDOR /api/messages | 🔴 **Empeoró** — ver hallazgo #1 |
| F1.4 Sanitizar HTML | 🟢 Resuelto |
| F2.1 Borrar rutas muertas | 🔴 No resuelto — nada fue borrado |
| F2.2 Widget @n8n/chat | 🟢 Resuelto (reemplazado por widget propio) |
| F2.3 Partir settings.ts | 🔴 **No resuelto** — ver hallazgo #2 |
| F3.1 Tablas Supabase + RLS | 🟡 Parcial — tablas creadas, RLS habilitado pero sin efecto real |
| F3.2 Retirar messageStore | 🟡 Parcial — reemplazado en la práctica, archivo no borrado |
| F5.1 Build errors | 🔴 No resuelto |
| F5.3 Middleware/headers | 🔴 No resuelto |

---

## Los 2 hallazgos críticos (peor que antes de tocar nada)

### 1. RLS de Supabase abierto de par en par

`supabase/migrations/20260814013207_....sql`, líneas 33 y 37:

```sql
CREATE POLICY "Allow public select messages" ON public.chat_messages FOR SELECT TO anon USING (true);
CREATE POLICY "Allow public select sessions" ON public.chat_sessions FOR SELECT TO anon USING (true);
```

`anon` es el rol de la clave pública que ya está en el bundle del navegador. `USING (true)` significa: cualquiera con esa clave puede hacer un `GET` directo a la API de Supabase y bajarse **todas las conversaciones de todos los clientes** — nombres, teléfonos, todo lo que hablaron con Alma — sin pasar por la cookie de sesión ni por ningún endpoint de Next.js. También hay `UPDATE` público sobre `chat_sessions` (línea 35).

Esto es peor que el IDOR original (que requería adivinar un teléfono uno por uno): acá es un volcado completo de la tabla.

**Fix:** sacarle a `anon` los grants de SELECT/UPDATE sobre estas tablas. Las API routes deben leer/escribir con la `service_role` key del lado servidor, nunca con la anon key desde RLS abierta.

### 2. settings.ts sigue filtrando las URLs de webhook al navegador

`src/lib/settings.ts` (el archivo pensado como "cliente") sigue exportando:

```ts
export const appSettings = {
  n8nWebhookUrl: "https://n8n.axion380.com.br/webhook/jaflujodev",
  almaWebhookUrl: "https://n8n.axion380.com.br/webhook/alma-agent",
  checkoutWebhookUrl: "https://n8n.axion380.com.br/webhook/ja-checkout",
  ...
};
export { serverSettings }; // re-exporta TODO settings.server.ts
```

Y lo importan `chat-widget.tsx`, `footer.tsx` y `page.tsx` — todos `'use client'`. Como es un objeto único, el bundler empaqueta las tres URLs de webhook en el JS público aunque el componente solo use `chatAgentName`. Se creó `settings.server.ts` pero no cumple su función porque `settings.ts` sigue siendo el punto de fuga, y no hay ningún `import 'server-only'` que lo bloquee en build.

**Fix:** sacar las URLs de `appSettings`, que vivan solo en `settings.server.ts`, y agregar el paquete `server-only` para que el build falle si algo del cliente lo importa.

---

## Lo que no se tocó

Ninguno de los 5 archivos que pedía borrar F2.1 fue eliminado: `dify-chat/route.ts`, `send-message/route.ts`, `actions/chat.ts`, `chat/webhook/route.ts` siguen vivos (dos de ellos con su propio comentario `[LEGACY]` en el código). `alma-chat/route.ts` tampoco se borró, y ya no tiene consumidor — el widget ahora habla con `/api/chat` y `/api/chat-session`, dos endpoints **nuevos que no estaban en el plan**.

Tampoco se borraron los dos archivos peligrosos que reemplazan: `src/lib/checkout.ts` (el checkout inseguro original, con precio armado en el navegador) y `src/lib/messageStore.ts` (el Map en memoria). Ninguno tiene importadores hoy, pero quedan como código muerto reactivable por error.

`next.config.ts` sigue con `ignoreBuildErrors: true` e `ignoreDuringBuilds: true`. `middleware.ts` sigue siendo solo modo mantenimiento, sin rate limit ni headers de seguridad.

---

## Lo nuevo que Lovable agregó (no estaba en el plan)

`/api/chat` — reemplaza a `alma-chat`, habla directo con OpenAI (`gpt-4o-mini`), usa la cookie de sesión, no expone la API key. Está bien encaminado pero **sin zod, sin límite de longitud de mensaje y sin rate limit** — cualquiera puede generar gasto de OpenAI sin control.

`/api/chat-session` — crea una fila en `chat_sessions` por cada `POST`, sin rate limit ni captcha (y el `INSERT` está abierto a `anon` en la migración) — vector de spam sobre la base.

El token de sesión, además de ir en cookie `httpOnly`, se devuelve también en el body JSON y el widget lo guarda en `sessionStorage` (legible por JS) sin usarlo para nada — anula parte del sentido de que sea `httpOnly`.

Detalle menor pero real: `layout.tsx` tiene `<body title="SIN ROMPER LA LOGICA DEL APP WEB APLICA EL ESTAPA 4" ...>` — un resto de instrucción interna del propio agente que quedó pegado como atributo visible en el HTML de producción.

---

## Orden de corrección recomendado

1. **Cerrar el RLS de Supabase** (hoy es la fuga más grande de datos de clientes que existe en el proyecto).
2. **Sacar las URLs de webhook de `settings.ts`** y agregar `server-only`.
3. Borrar los 7 archivos muertos: `checkout.ts`, `messageStore.ts`, `dify-chat`, `send-message`, `actions/chat.ts`, `chat/webhook`, `alma-chat`.
4. Sacar el token de sesión del body de `/api/chat-session` y de `sessionStorage`.
5. Agregar zod + límite de longitud + rate limit a `/api/chat` y `/api/chat-session`.
6. `ignoreBuildErrors: false`, resolver lo que rompa.
7. Rate limit y headers de seguridad en `middleware.ts`.
8. Crear tabla `chat_prospects` (falta), limpiar `.env.example`, sacar dependencias muertas de `package.json`, borrar el `title` de debug en `layout.tsx`.

Los puntos 1 y 2 son los únicos que yo calificaría de bloqueantes reales — el resto es limpieza necesaria pero no es una fuga de datos activa hoy.
