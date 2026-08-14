import { z } from 'zod';

const serverSettingsSchema = z.object({
  OPENAI_API_KEY: z.string().optional(),
  N8N_WEBHOOK_TOKEN: z.string().optional(),
  N8N_CHECKOUT_WEBHOOK_URL: z.string().optional(),
  N8N_WEBHOOK_SECRET: z.string().optional(),
  DIFY_API_KEY: z.string().optional(),
  DIFY_BASE_URL: z.string().optional(),
  N8N_EVENT_WEBHOOK_URL: z.string().optional(),
});

export const serverSettings = serverSettingsSchema.parse({
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  N8N_WEBHOOK_TOKEN: process.env.N8N_WEBHOOK_TOKEN,
  N8N_CHECKOUT_WEBHOOK_URL: process.env.N8N_CHECKOUT_WEBHOOK_URL,
  N8N_WEBHOOK_SECRET: process.env.N8N_WEBHOOK_SECRET,
  DIFY_API_KEY: process.env.DIFY_API_KEY,
  DIFY_BASE_URL: process.env.DIFY_BASE_URL,
  N8N_EVENT_WEBHOOK_URL: process.env.N8N_EVENT_WEBHOOK_URL,
});
