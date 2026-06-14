
# 📘 RUNBOOK MAESTRO: Joyeria Alianza (Producción Hostinger)

Este documento es la guía técnica definitiva para el despliegue y la interconexión del ecosistema.

---

## 1. Chat Web con Dify (Conexión Directa)

El chat web se conecta **directamente** con la API de Dify, sin pasar por n8n:

```
Cliente (chat-widget) → POST /api/dify-chat → Dify API (/v1/chat-messages)
                                                 ↓ (si detecta handoff)
                                               n8n webhook → WhatsApp vendedor
```

### Variables de entorno requeridas (Hostinger)
| Variable | Valor |
| :--- | :--- |
| `DIFY_API_KEY` | `app-XXXXXXXXXXXX` (obtener de Dify → Apps → Access API) |
| `DIFY_BASE_URL` | `https://api.dify.ai/v1` |
| `N8N_EVENT_WEBHOOK_URL` | `https://n8n.axion380.com.br/webhook/dify-events` |

---

## 2. Configuración de n8n (Eventos y WhatsApp)

n8n ya **no** es intermediario del chat web. Ahora recibe solo **eventos** de Dify (handoff, pedido, etc.).

### A. Webhook de eventos Dify → n8n
- **Path:** `/webhook/dify-events`
- **Formato recibido:**
  ```json
  {
    "event": "handoff_detected",
    "senderName": "Nombre Cliente",
    "senderPhone": "099xxxxxx",
    "conversationId": "abc-123",
    "botResponse": "Respuesta de Alma...",
    "userQuery": "Me interesa, ¿cómo lo compro?",
    "source": "dify-chat-web"
  }
  ```

### B. De WhatsApp a la Web (Respuestas del vendedor)
- **Nodo de salida en n8n:** "HTTP Request" (POST).
- **URL de destino:** `https://joyeria.a380.com.br/api/webhook`
- **Cuerpo del mensaje (JSON):**
  ```json
  {
    "text": "Respuesta del vendedor",
    "senderName": "Alma",
    "phoneNumber": "59895435644"
  }
  ```

---

## 3. Despliegue en Hostinger

### Requisitos de Entorno
1. **Versión de Node:** Seleccione **20.x LTS** en el panel de Hostinger.
2. **Dominio:** Asegúrese de que `https://joyeria.a380.com.br` esté apuntando correctamente a la carpeta de la aplicación.

### Variables de Entorno (hPanel → Node.js App → Environment Variables)
- `WC_API_URL`: `https://joyeriabd.a380.com.br`
- `WC_CONSUMER_KEY`: `ck_...`
- `WC_CONSUMER_SECRET`: `cs_...`
- `DIFY_API_KEY`: `app-XXXXXXXXXXXX`
- `DIFY_BASE_URL`: `https://api.dify.ai/v1`
- `N8N_EVENT_WEBHOOK_URL`: `https://n8n.axion380.com.br/webhook/dify-events`

---

## 4. Verificación de Salud (Health Check)

Una vez desplegado, visite estas URLs para confirmar que el servidor responde:
1. `https://joyeria.a380.com.br/api/health` → Debe mostrar `{"status":"ok"}`.
2. `https://joyeria.a380.com.br/api/webhook` → Debe mostrar el mensaje de bienvenida del Webhook.
3. `https://joyeria.a380.com.br/api/products` → Debe mostrar el listado de joyas de WooCommerce.
4. **Chat Dify:** Abra el chat widget en el sitio y envíe un mensaje. Alma debe responder directamente.

---

## 5. Resolución de problemas comunes

- **Error 503:** El proceso de Node se detuvo. Revise los logs en Hostinger; usualmente es por falta de memoria o puerto incorrecto.
- **Error 404 en Webhook:** n8n está disparando a una URL vieja. Asegúrese de que n8n use `/api/webhook` y no `/api/chat/webhook`.
- **Chat no responde:** Verifique que `DIFY_API_KEY` y `DIFY_BASE_URL` estén configuradas en Hostinger. Sin estas variables, el endpoint `/api/dify-chat` devuelve error 500.
- **Imágenes no cargan:** Verifique que el dominio de WordPress esté autorizado en `next.config.ts`.

---
*Documentación optimizada para Joyeria Alianza - Axion380.*
