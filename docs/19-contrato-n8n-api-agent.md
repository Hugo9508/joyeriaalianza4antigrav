---
titulo: Contrato para reconfigurar el workflow de WhatsApp en n8n
fecha: 2026-08-24
fuente: src/app/api/agent/route.ts, 07-adr-001-donde-vive-el-agente.md
estado: "En pausa (2026-08-24, mismo día) — se decidió no usar el canal de WhatsApp por ahora, solo Alma en el sitio web. Este documento queda tal cual para cuando se retome; no hay ninguna acción pendiente sobre n8n mientras tanto."
---

> ⚠️ **En pausa.** El mismo día que se construyó `/api/agent`, se definió no usar el canal de WhatsApp por ahora — solo Alma en el sitio web. Nada de lo que sigue hace falta hacerlo hoy: `/api/agent` queda en el código, construido y probado, pero sin usar y sin ningún workflow de n8n apuntándole. Este documento se deja completo para cuando (si) se retome la idea de sumar WhatsApp.

# Qué cambia y por qué

Hasta ahora, el workflow de WhatsApp en n8n corre el agente entero adentro (razona, decide qué responder). Con `/api/agent` ya construido en el sitio (ver `17-fixes-f1-f5-aplicados.md`, Addendum 4), la idea es invertir eso: n8n deja de razonar y pasa a ser un **puente tonto** — recibe el mensaje de WhatsApp, se lo manda a esta ruta, y devuelve por WhatsApp lo que la ruta le conteste. El razonamiento (prompt, tools, memoria de la conversación) queda en un solo lugar: el mismo que ya usa el chat web.

**Esto no se puede hacer desde este entorno** — no hay acceso a la instancia de n8n real. Este documento es el contrato exacto para que quien tenga acceso (vos, o el agente al que le pases esto) haga el cambio en el workflow.

**No se pudo probar en vivo.** Todo lo de abajo está verificado por lectura de código (`tsc`/build), no por una llamada real desde n8n. Antes de cortar el agente viejo del workflow, probá el request de ejemplo de abajo con `curl` o Postman contra la URL real y confirmá que responde como se espera.

# 1. La URL

```
POST https://<tu-dominio-de-producción>/api/agent
```

(Reemplazá `<tu-dominio-de-producción>` por el dominio real donde está desplegado el sitio — no lo tengo desde acá.)

# 2. Autenticación

Header obligatorio:

```
X-Agent-Token: <el mismo valor de N8N_AGENT_TOKEN que cargaste en Vercel>
```

Sin este header (o con un valor que no coincida), la ruta devuelve `401 {"error": "No autorizado"}`. El token se compara con `timingSafeEqual` — no es sensible a mayúsculas/minúsculas del lado de la comparación, pero tiene que ser exactamente el mismo string, sin espacios de más.

# 3. El request

```json
POST /api/agent
Content-Type: application/json
X-Agent-Token: <token>

{
  "message": "texto del mensaje que mandó el cliente por WhatsApp",
  "sessionId": "59891234567",
  "canal": "whatsapp"
}
```

- **`message`** (obligatorio, string, 1 a 2000 caracteres): el texto del mensaje del cliente, tal cual llegó por WhatsApp.
- **`sessionId`** (obligatorio, string, 1 a 64 caracteres): el identificador **estable** del contacto de WhatsApp — típicamente el número en formato E.164 sin el `+` (como lo entrega la API de WhatsApp Business). **No es un UUID de Supabase** — la ruta resuelve internamente a qué `chat_sessions.id` corresponde, buscando o creando la fila la primera vez que ve ese contacto. Lo importante es que sea siempre el mismo valor para el mismo contacto en cada mensaje — si cambia, ese contacto pierde su historial de conversación.
- **`canal`** (opcional): por ahora solo acepta `"whatsapp"`. Si no se manda, asume ese valor igual — no hace falta incluirlo, pero no está de más ser explícito.

Si el body no cumple el schema (falta `message`/`sessionId`, o exceden el largo máximo), la ruta devuelve `400` con un mensaje de error específico.

# 4. La respuesta

## Caso normal — hay respuesta de Alma

```json
200 OK
{ "reply": "texto de la respuesta para mandar por WhatsApp" }
```

El nodo de n8n que manda el mensaje de WhatsApp debe leer `reply` y mandarlo tal cual.

## Caso pausado — un asesor humano ya tomó la conversación

```json
200 OK
{ "reply": null, "paused": true }
```

Esto pasa cuando en algún momento de esta conversación (por WhatsApp o por el chat web — comparten la misma sesión interna) Alma usó la herramienta `derivar_a_asesor`. A partir de ahí, la sesión queda marcada como pausada hasta que alguien la levante a mano en Supabase — ver el Addendum 4 para el detalle de esa limitación.

**Importante**: `paused: true` viene con status **200**, no un error. El mensaje del cliente ya se guardó del lado del servidor (el humano que sigue la conversación lo va a ver), simplemente no hay una respuesta de Alma para este turno. El workflow de n8n tiene que interpretar esto como "no mandar nada por WhatsApp este turno" — **no reintentar, no tratarlo como falla.**

## Casos de error

| Status | Cuándo | Qué hacer del lado de n8n |
|---|---|---|
| `400` | El body no cumple el schema | Bug en cómo n8n arma el request — revisar el nodo que lo construye |
| `401` | Falta el header o el token no coincide | Revisar que `X-Agent-Token` esté bien cargado en las credenciales/variables del workflow |
| `429` | Ese `sessionId` mandó más de 30 mensajes en 60 segundos | Backoff — esperar y reintentar más tarde, no en loop inmediato |
| `500` | Falta `OPENAI_API_KEY` o `N8N_AGENT_TOKEN` del lado del servidor, o no se pudo inicializar la sesión en Supabase | No es recuperable reintentando de inmediato — es un problema de configuración del sitio, no del mensaje puntual |
| `502` | El modelo de OpenAI no pudo generar respuesta (agotó los reintentos internos de tool-calling, o la API de OpenAI falló) | Se puede reintentar una vez; si persiste, es un problema del lado de OpenAI o del prompt |

# 5. Qué cambiar en el workflow existente

1. **Sacar** los nodos que hoy arman el prompt/tools y le pegan directo a OpenAI (o al modelo que estén usando) para razonar la respuesta — eso ahora lo hace `/api/agent`.
2. **Agregar** un nodo HTTP Request apuntando a `POST /api/agent` con el body y header de arriba, usando el número de WhatsApp del contacto como `sessionId`.
3. **Mantener** todo lo que ya funciona alrededor: la recepción del mensaje entrante de WhatsApp, y el nodo que manda la respuesta de vuelta — solo cambia de dónde sale el texto a mandar (antes: del razonamiento interno del workflow; ahora: del campo `reply` de la respuesta de `/api/agent`).
4. **Agregar una rama condicional** después del HTTP Request: si `paused === true`, no ejecutar el nodo de "mandar mensaje de WhatsApp" — terminar el flujo en silencio para ese mensaje.
5. **No tocar** los flujos de pago (Mercado Pago) ni de generación de imagen del probador virtual — esos siguen exactamente como están, corriendo adentro de n8n, sin relación con este cambio (ver ADR-001, Opción C: es a propósito, no un olvido).

# 6. Lo que no se pudo verificar desde acá

- Que el `sessionId` que arma el workflow real de WhatsApp sea efectivamente estable entre mensajes del mismo contacto (depende de cómo esté armado el nodo que recibe el webhook de WhatsApp Business — no se pudo inspeccionar ese workflow desde este entorno).
- El comportamiento de `resolveWhatsappSession()` (adentro de `/api/agent`) bajo mensajes casi simultáneos del mismo contacto nuevo: la búsqueda usa `chat_sessions.metadata->>whatsapp_id`, una convención sin índice único confirmado — dos mensajes que lleguen dentro de la misma fracción de segundo desde un contacto que nunca escribió antes podrían, en teoría, crear dos filas de sesión en vez de reusar una. Baja probabilidad (el primer mensaje de un contacto nuevo no suele venir duplicado), pero vale la pena confirmarlo antes de dar por cerrado este punto — queda para el prompt de verificación contra el Supabase real.
- El tiempo de respuesta real de `/api/agent` bajo carga — no tiene timeout propio del lado del servidor (a diferencia de `/api/checkout`, que sí tiene uno de 20s hacia n8n); si el nodo HTTP Request de n8n tiene un timeout corto configurado, confirmá que sea generoso (30-60s) para dar tiempo al loop de tool-calling con OpenAI en casos donde Alma necesita consultar el catálogo antes de responder.
