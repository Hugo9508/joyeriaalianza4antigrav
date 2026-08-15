/**
 * @fileOverview Configuración pública — segura para el navegador.
 * Este archivo lo importan componentes 'use client' (chat-widget, footer, page).
 *
 * REGLA: nunca agregar acá URLs de webhooks, tokens, API keys ni nada server-only.
 * Eso vive exclusivamente en settings.server.ts, protegido por el paquete
 * 'server-only' para que el build falle si algo del cliente lo importa.
 */
export const appSettings = {
  whatsAppNumber: "59895435644",
  chatAgentName: "Alma",
  siteUrl: "https://joyeria.a380.com.br",
};
