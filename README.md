
# 💎 Joyeria Alianza (Headless Boutique)

Proyecto de alta joyería basado en **Next.js 15** (Frontend) y **WooCommerce** (Backend).

## 🚀 Requisitos de Despliegue (Hostinger)

> [!IMPORTANT]
> **VERSIÓN DE NODE:** Debe usar exclusivamente **Node 20.x LTS**. El uso de Node 22 o superior causará fallos en el despliegue debido a incompatibilidades con el entorno de Hostinger.

### Solución al error EBADENGINE
Si ves el error `npm warn EBADENGINE`, significa que Hostinger o tu terminal están usando Node 22. 
**Para solucionarlo:**
1. Ve al hPanel de Hostinger.
2. Navega a `Sitios Web` -> `Administrar` -> `Aplicación Node.js`.
3. Busca la opción **Versión de Node.js** y selecciona **20.x**.
4. Guarda los cambios y haz clic en **Reinstalar dependencias**.

### Variables de Entorno Requeridas
Configure estas variables en el panel de Hostinger (Node.js App -> Environment Variables):

| Variable | Descripción | Valor Ejemplo |
| :--- | :--- | :--- |
| `WC_API_URL` | URL de tu WordPress | `https://joyeriabd.a380.com.br` |
| `WC_CONSUMER_KEY` | Key de WooCommerce | `ck_...` |
| `WC_CONSUMER_SECRET` | Secret de WooCommerce | `cs_...` |
| `NEXT_PUBLIC_SITE_URL` | URL de la tienda | `https://joyeria.a380.com.br` |
| `ADMIN_PASSWORD` | Clave del panel admin | `tu-clave-segura` |
| `DIFY_API_KEY` | API Key de tu app Dify (Alma) | `app-XXXXXXXXXXXX` |
| `DIFY_BASE_URL` | URL base de la API de Dify | `https://api.dify.ai/v1` |
| `N8N_EVENT_WEBHOOK_URL` | Webhook n8n para eventos Dify (handoff, CRM) | `https://n8n.axion380.com.br/webhook/dify-events` |
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase | `https://xxxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon Key de Supabase | `eyJhbGci...` |

## 📊 Dashboard de Pedidos (Kanban)

Se implementó un sistema de gestión de pedidos avanzado en `/admin/orders` con las siguientes características:

- **Board Kanban**: 5 columnas de flujo (Nuevos, En Análisis, Preparando, Listo, Completado).
- **Drag & Drop**: Movimiento de pedidos entre columnas con persistencia en Supabase.
- **Fuentes Unificadas**: Centralización de pedidos desde:
    - 🔵 **Web**: Sincronizados desde WooCommerce.
    - 🟢 **WhatsApp**: Ingresados vía n8n/API.
    - 🟣 **Manual**: Creados directamente en el dashboard.
- **Pre-Facturación**: Generación de ticket/factura adaptado a Joyería Alianza con cálculo automático de IVA (22%).
- **Edición Inline**: Gestión rápida de datos del cliente, items y notas desde el modal de detalle.

## 💬 Chat Web con IA (Alma — Dify)

El chat web del sitio se conecta **directamente** con la API de Dify (sin pasar por n8n):

```
Chat Widget → POST /api/dify-chat → Dify API (/v1/chat-messages)
                                       ↓ (si detecta handoff)
                                     n8n webhook /dify-events (notifica vendedor por WhatsApp)
```

- **Agente:** Alma (asesora de ventas de Joyería Alianza)
- **Endpoint:** `POST /api/dify-chat` — recibe `{ query, user, conversationId }`
- **Handoff automático:** cuando Alma detecta señales de compra, notifica a n8n vía webhook
- **Credenciales Dify:** las 3 variables `DIFY_*` tienen fallback codificado en Base64 dentro de `settings.ts`. Si las variables de entorno están configuradas en Hostinger, se usan esas; si no, se usan los valores embedded. Para cambiar la API key, actualizar `settings.ts` o configurar la env var.

## ✨ Mejoras UI/UX Recientes

- **Aislamiento de Contexto**: El chat directo (burbuja) resetea el historial para evitar filtraciones de productos consultados previamente ([Ver reporte](docs/agente%20ai/resolucion-leak-contexto-chat.md)).
- **Botones de Consulta Unificados**: Se cambió "Añadir a Lista de Deseos" por **"Consultar"** en todas las tarjetas de producto (Home y Colecciones), integrando el contexto automático del producto con el chat de Alma.
- **Carrusel de Reseñas Google**: Sección con 9 reseñas verificadas de Google Maps, carrusel con drag/swipe, flechas, dots y CTA a perfil de Google (`reviews-carousel.tsx`).
- **Mapa Interactivo en Footer**: Miniatura con previsualización real del embed de Google Maps que abre un modal interactivo con la ubicación exacta (Mercedes 1211).
- **Dirección Actualizada**: Dirección de la boutique actualizada a Mercedes 1211, Montevideo 11100.
- **Redes Sociales**: Link de Instagram conectado al perfil real [@joyeria.alianzas_](https://www.instagram.com/joyeria.alianzas_/).
- **Bloqueo de Scroll**: Implementación de bloqueo de scroll del body al abrir modales para mejorar la navegación en dispositivos móviles.
- **Robustez de Texto**: Soporte para URLs largas y strings sin espacios mediante `overflow-wrap` en las burbujas de mensaje.

## 📱 Flujo n8n v9.1

El workflow actualizado está en `docs/agente ai/n8n_flujo_v9_dify_directo.json`:

- **Webhook `/jaflujodev`**: WhatsApp + comandos `#pausa`/`#activar`
- **Webhook `/dify-events`**: recibe handoffs del chat web → GPT-4.1-mini resume el prospecto → Google Sheets CRM → WhatsApp al vendedor → pausa IA en Supabase
- **Integración Nativa**: Uso de nodos de Supabase oficiales con lógica de "Upsert" para mayor estabilidad.

> [!NOTE]
> n8n ya **no** es intermediario del chat web. Solo recibe eventos de handoff.

## 📄 Documentación Técnica

- [Esquema SQL Dashboard](docs/orders_schema.sql)
- [Resumen de Mejoras n8n](docs/resumen_mejoras_n8n.md)
- [Configuración del Ecosistema de Chat](docs/configuracion-chat.md)
- [Resolución: Leak de Contexto](docs/agente%20ai/resolucion-leak-contexto-chat.md)

## 🛠️ Comandos Locales
- `npm install`: Instalar dependencias.
- `npm run dev`: Iniciar modo desarrollo.
- `npm run build`: Generar versión de producción.

