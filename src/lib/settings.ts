/**
 * @fileOverview Configuración pública — segura para el navegador.
 * Este archivo lo importan componentes 'use client' (chat-widget, footer, page).
 *
 * REGLA: nunca agregar acá URLs de webhooks, tokens, API keys ni nada server-only.
 * Eso vive exclusivamente en settings.server.ts, protegido por el paquete
 * 'server-only' para que el build falle si algo del cliente lo importa.
 */
export const appSettings = {
  // Confirmado con el dueño del negocio (2026-08-24): el WhatsApp real de
  // la boutique es este. Antes había dos números distintos hardcodeados en
  // el código (59895435644 y este mismo, 59891264956) y una unificación
  // previa se había quedado con el equivocado — ya corregido acá, único
  // lugar del que lo toman los 4 puntos que disparan WhatsApp (footer x3,
  // ficha de producto, checkout fallido).
  whatsAppNumber: "59891264956",
  chatAgentName: "Alma",
  siteUrl: "https://joyeria.a380.com.br",
  // Dirección real de la boutique (Mercedes 1211) — antes el system prompt de
  // Alma y el copy del home decían "Carrasco", que queda a ~12km de acá.
  boutiqueAddress: "Mercedes 1211, Montevideo, Uruguay",
};
