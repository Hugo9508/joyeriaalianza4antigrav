/**
 * @fileOverview Configuración pública — segura para el navegador.
 * Este archivo lo importan componentes 'use client' (chat-widget, footer, page).
 *
 * REGLA: nunca agregar acá URLs de webhooks, tokens, API keys ni nada server-only.
 * Eso vive exclusivamente en settings.server.ts, protegido por el paquete
 * 'server-only' para que el build falle si algo del cliente lo importa.
 */
export const appSettings = {
  // NOTA: existían dos números distintos en el código (59895435644 acá y
  // 59891264956 en lib/whatsapp.ts, page.tsx y el chat widget). Se unificó a
  // este, el que ya vivía en el archivo de configuración pública — confirmar
  // con el dueño del negocio que es el correcto antes de dar esto por cerrado.
  whatsAppNumber: "59895435644",
  chatAgentName: "Alma",
  siteUrl: "https://joyeria.a380.com.br",
  // Dirección real de la boutique (Mercedes 1211) — antes el system prompt de
  // Alma y el copy del home decían "Carrasco", que queda a ~12km de acá.
  boutiqueAddress: "Mercedes 1211, Montevideo, Uruguay",
};
