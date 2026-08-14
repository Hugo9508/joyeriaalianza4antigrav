import { serverSettings } from './settings.server';

export const appSettings = {
  whatsAppNumber: "59895435644",
  chatAgentName: "Alma",
  siteUrl: "https://joyeria.a380.com.br",
  // Fallback values to satisfy legacy types until fully removed
  n8nWebhookUrl: "https://n8n.axion380.com.br/webhook/jaflujodev",
  almaWebhookUrl: "https://n8n.axion380.com.br/webhook/alma-agent",
  checkoutWebhookUrl: "https://n8n.axion380.com.br/webhook/ja-checkout",
};

export const legacyServerSettings = {
  n8nWebhookUrl: appSettings.n8nWebhookUrl,
  almaWebhookUrl: appSettings.almaWebhookUrl,
  checkoutWebhookUrl: appSettings.checkoutWebhookUrl,
  difyApiKey: serverSettings.DIFY_API_KEY || '',
  difyBaseUrl: serverSettings.DIFY_BASE_URL || '',
  n8nEventWebhookUrl: serverSettings.N8N_EVENT_WEBHOOK_URL || '',
};

// Satisfy direct imports of serverSettings from this file in legacy code
export { serverSettings };
