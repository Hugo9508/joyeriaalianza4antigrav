'use server';

import { appSettings, legacyServerSettings } from '@/lib/settings';

/**
 * @fileOverview Acción de servidor para enviar mensajes a n8n (flujo sincrónico).
 * n8n espera la respuesta de Dify y la devuelve directamente en el mismo request.
 */

export async function sendMessageAction(payload: {
  text: string;
  senderName: string;
  senderPhone: string;
  conversationId?: string;
}) {
  console.warn('[LEGACY] actions/chat.ts fue llamada — revisar antes de eliminar');
  if (!payload.text.trim()) return { success: false, error: 'El mensaje está vacío.' };

  const startTime = performance.now();
  const requestBody = {
    event: "web_message",
    instance: appSettings.chatAgentName,
    data: {
      text: payload.text,
      senderName: payload.senderName,
      senderPhone: payload.senderPhone,
      storeNumber: appSettings.whatsAppNumber,
      // ✅ FIX #1: conversation_id viaja con cada mensaje para mantener contexto Dify
      conversation_id: payload.conversationId || '',
    },
    metadata: {
      platform: 'web_boutique',
      timestamp: new Date().toISOString()
    }
  };

  try {
    const response = await fetch(appSettings.n8nWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'AlianzaBoutique-Web/2.0'
      },
      body: JSON.stringify(requestBody),
      // ✅ Timeout más largo para esperar respuesta sincrónica de Dify (~5-15s)
      signal: AbortSignal.timeout(40000),
      cache: 'no-store'
    });

    const endTime = performance.now();
    const duration = Math.round(endTime - startTime);
    const responseText = await response.text();
    let responseData: any;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { raw: responseText };
    }

    const debugInfo = {
      url: appSettings.n8nWebhookUrl,
      status: response.status,
      statusText: response.statusText,
      duration: `${duration}ms`,
      payload: requestBody,
      response: responseData
    };

    if (!response.ok) {
      return {
        success: false,
        error: `Error n8n (${response.status}): ${response.statusText}`,
        debug: debugInfo
      };
    }

    // ✅ FIX #2: Extraer la respuesta del bot y conversation_id del body de n8n
    // El nuevo flujo n8n devuelve { success, response, conversation_id } directamente
    const botResponse = responseData?.response || responseData?.text || null;
    const newConversationId = responseData?.conversation_id || null;

    return {
      success: true,
      // ✅ Respuesta del bot para mostrar directamente en el chat (sin polling)
      botResponse,
      conversationId: newConversationId,
      debug: debugInfo
    };
  } catch (error: any) {
    const endTime = performance.now();
    const duration = Math.round(endTime - startTime);

    const debugInfo = {
      url: appSettings.n8nWebhookUrl,
      error: error.message,
      duration: `${duration}ms`,
      payload: requestBody
    };

    return {
      success: false,
      error: error.name === 'TimeoutError' ? 'Sin respuesta del servidor (40s)' : error.message,
      debug: debugInfo
    };
  }
}
