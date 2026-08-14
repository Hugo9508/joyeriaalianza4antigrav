import { serverSettings } from '@/lib/settings.server';

export const appSettings = {
  whatsAppNumber: "59895435644",
  chatAgentName: "Alma",
  siteUrl: "https://joyeria.a380.com.br",
};

/** @deprecated Use serverSettings from @/lib/settings.server */
export const legacyServerSettings = {
  n8nWebhookUrl: "https://n8n.axion380.com.br/webhook/jaflujodev",
  almaWebhookUrl: "https://n8n.axion380.com.br/webhook/alma-agent",
  checkoutWebhookUrl: "https://n8n.axion380.com.br/webhook/ja-checkout",
  difyApiKey: serverSettings.DIFY_API_KEY || '',
  difyBaseUrl: serverSettings.DIFY_BASE_URL || '',
  n8nEventWebhookUrl: serverSettings.N8N_EVENT_WEBHOOK_URL || '',
};
