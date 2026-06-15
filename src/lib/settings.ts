/**
 * @fileOverview Configuración centralizada de la Boutique.
 * Aquí se gestionan los parámetros de conexión con el ecosistema n8n.
 */

export const appSettings = {
  // Datos de la tienda
  whatsAppNumber: "59895435644",
  chatAgentName: "Alma",

  // n8n Alma Agent (Flujo 1) — el chat web se comunica SOLO con este endpoint
  almaWebhookUrl: process.env.N8N_ALMA_WEBHOOK_URL || "https://n8n.axion380.com.br/webhook/alma-agent",

  // Legacy: webhook anterior (WhatsApp flow) — se mantiene por retrocompatibilidad
  n8nWebhookUrl: "https://n8n.axion380.com.br/webhook/jaflujodev",

  // URL de la boutique
  siteUrl: "https://joyeria.a380.com.br",

  // Mercado Pago Checkout — webhook n8n que crea la preferencia de pago
  checkoutWebhookUrl: "https://n8n.axion380.com.br/webhook/ja-checkout",
};

export const serverSettings = {
  difyApiKey:
    process.env.DIFY_API_KEY || '',
  difyBaseUrl:
    process.env.DIFY_BASE_URL || '',
  n8nEventWebhookUrl:
    process.env.N8N_EVENT_WEBHOOK_URL || '',
};