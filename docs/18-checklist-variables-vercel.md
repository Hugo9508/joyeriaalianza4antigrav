---
titulo: Checklist de variables de entorno para Vercel
fecha: 2026-08-24
fuente: auditoría real de las variables que mostraste tenías cargadas en Vercel, cruzada contra grep de process.env.* en src/ — reemplaza la versión anterior de este documento, que estaba armada solo a partir de .env.local (un archivo que resultó estar desactualizado respecto a lo que ya tenías en Vercel)
---

# Estado real, después de la auditoría en el chat

Mostraste la lista de variables que tenías cargadas en Vercel y confirmaste que ya cargaste las dos que faltaban (`OPENAI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, esta última como la clave **secreta/`service_role`**, no la pública). Con eso, **Alma en el sitio web ya tiene todo lo que necesita para funcionar** — no queda ninguna variable crítica pendiente.

Este documento reemplaza al checklist anterior (que se había armado a partir de tu `.env.local` local, un archivo desactualizado — por ejemplo, ahí decía `WOOCOMMERCE_URL` cuando en Vercel ya estaba bien cargada como `WOO_BASE_URL`; ese hallazgo quedó obsoleto y esta versión ya no lo repite).

## ✅ Confirmado en Vercel, nombre correcto — nada que hacer

| Variable | Para qué |
|---|---|
| `OPENAI_API_KEY` | El cerebro de Alma (`runAgentTurn`, en `/api/chat`). Recién cargada — con esto, Alma puede generar respuestas. |
| `SUPABASE_SERVICE_ROLE_KEY` | Cliente admin de Supabase — guarda el historial de la conversación, `agendar_cita`, `derivar_a_asesor`. Recién cargada, como la clave secreta (correcto). |
| `NEXT_PUBLIC_SUPABASE_URL` | Cliente y server de Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Cliente de Supabase del lado navegador |
| `WOO_BASE_URL` | URL base de la tienda WooCommerce — catálogo, `buscar_productos`/`ver_producto` de Alma, `/collections` |
| `WOO_CONSUMER_KEY` | Autenticación contra la API REST de WooCommerce |
| `WOO_CONSUMER_SECRET` | Autenticación contra la API REST de WooCommerce |
| `MAINTENANCE_MODE` | Interruptor de mantenimiento del middleware — confirmá que no quede en `true` en producción |

**Con esto solo, Alma ya funciona en el sitio web.** Falta un redeploy en Vercel para que las dos variables recién cargadas surtan efecto — las env vars no se aplican en caliente a un deployment que ya está corriendo; si no hiciste un redeploy después de cargarlas, hacelo (o esperá al próximo deploy automático si el proyecto está conectado a git).

## 🟢 Faltan — solo si querés que pagos y probador virtual sigan funcionando por n8n

Dijiste que ibas a dejar esas dos integraciones como estaban, sin tocar. Para que efectivamente sigan funcionando en producción, hacen falta estas cuatro, que no aparecían en tu lista:

| Variable | Para qué | Si falta |
|---|---|---|
| `N8N_CHECKOUT_WEBHOOK_URL` | `/api/checkout` le pega acá para iniciar el pago con Mercado Pago vía n8n | El botón de compra falla — nadie puede pagar |
| `N8N_TRYON_WEBHOOK_URL` | `/api/virtual-tryon` le pega acá para la generación de imagen con IA | El probador virtual falla |
| `N8N_WEBHOOK_TOKEN` | Autenticación de `/api/webhook` (mensajes entrantes hacia el chat, HMAC) | Ese endpoint devuelve 401 a lo que le llegue |
| `N8N_WEBHOOK_SECRET` | Firma HMAC del mismo endpoint | Ídem — verificación de integridad del body |

Si estas cuatro páginas (compra, probador virtual, el endpoint de mensajes entrantes) no las estás usando activamente todavía, no son urgentes — pero si el checkout o el probador virtual están en producción y alguien los prueba, van a fallar sin estas.

## ⚪ Están en tu Vercel pero no las usa ningún código actual — no hace falta tocarlas

Confirmado por grep contra el código de este repo: cero referencias.

| Variable | Por qué está ahí |
|---|---|
| `N8N_EVENT_WEBHOOK_URL` | Resto de una versión anterior del sitio (el flujo de Dify, ya eliminado en una ronda de correcciones previa — ver doc 06, §8.4) |
| `N8N_ALMA_WEBHOOK_URL` | Resto del endpoint viejo `/api/alma-chat` → n8n `alma-agent` (no `alma-agent-2`), también ya eliminado |
| `NEXT_PUBLIC_GOOGLE_MAPS_KEY` | El mapa del footer/contacto usa un embed estático de Google Maps, no el SDK — nunca la lee |

No hacen daño quedándose cargadas — Vercel no las usa para nada si el código no las pide. Si en algún momento querés prolijidad, se pueden borrar del dashboard sin ningún efecto sobre el sitio; no es urgente.

## ⏸️ No hace falta — decisión de no usar WhatsApp (Addendum 5)

| Variable | Estado |
|---|---|
| `N8N_AGENT_TOKEN` | No la tenés cargada, y no hace falta: es para `/api/agent` (el puente de WhatsApp), que quedó construido pero sin usar por tu decisión del 2026-08-24. Si más adelante retomás WhatsApp, ver `19-contrato-n8n-api-agent.md`. |

## Resumen accionable

1. **Ya hecho** — `OPENAI_API_KEY` y `SUPABASE_SERVICE_ROLE_KEY` cargadas. Confirmá que hiciste (o vas a hacer) un redeploy para que tomen efecto.
2. **Solo si usás pagos/probador virtual en producción** — cargar las 4 variables de la sección verde (`N8N_CHECKOUT_WEBHOOK_URL`, `N8N_TRYON_WEBHOOK_URL`, `N8N_WEBHOOK_TOKEN`, `N8N_WEBHOOK_SECRET`).
3. Nada más es urgente. Las variables "huérfanas" y `N8N_AGENT_TOKEN` quedan documentadas por prolijidad, no por acción pendiente.
