import 'server-only';
import { z } from 'zod';

/**
 * @fileOverview Configuración server-only. El paquete 'server-only' hace fallar
 * el build si algún componente 'use client' llega a importar este archivo.
 */

const serverSettingsSchema = z.object({
  OPENAI_API_KEY: z.string().optional(),
  N8N_WEBHOOK_TOKEN: z.string().optional(),
  N8N_CHECKOUT_WEBHOOK_URL: z.string().optional(),
  N8N_WEBHOOK_SECRET: z.string().optional(),
  // Token compartido para /api/agent — el puente de WhatsApp (n8n, ya no el
  // cerebro del agente) lo manda en el header X-Agent-Token. Es el único
  // cliente autorizado de ese canal (mismo patrón que N8N_WEBHOOK_SECRET,
  // pero de entrada en vez de HMAC sobre el body — /api/agent no necesita
  // verificar integridad del body porque el token ya certifica al llamador).
  N8N_AGENT_TOKEN: z.string().optional(),
});

export const serverSettings = serverSettingsSchema.parse({
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  N8N_WEBHOOK_TOKEN: process.env.N8N_WEBHOOK_TOKEN,
  N8N_CHECKOUT_WEBHOOK_URL: process.env.N8N_CHECKOUT_WEBHOOK_URL,
  N8N_WEBHOOK_SECRET: process.env.N8N_WEBHOOK_SECRET,
  N8N_AGENT_TOKEN: process.env.N8N_AGENT_TOKEN,
});
