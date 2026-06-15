import { NextRequest, NextResponse } from 'next/server';
import { serverSettings } from '@/lib/settings';

/**
 * @fileOverview API Route para chat directo con Dify.
 * Elimina n8n como intermediario — habla directamente con la API de Dify.
 * 
 * POST /api/dify-chat
 * Body: { query, conversationId?, user, senderName?, senderPhone? }
 * Returns: { success, botResponse, conversationId, metadata? }
 */

export const runtime = 'nodejs';

// Señales de compra que disparan notificación a n8n
const HANDOFF_SIGNALS = [
    'me interesa',
    'lo quiero',
    'cómo lo compro',
    'como lo compro',
    'quiero comprarlo',
    'precio exacto',
    'forma de pago',
    'formas de pago',
    'cuánto cuesta',
    'cuanto cuesta',
    'quiero pagar',
    'wa.me', // Alma envió el link de WhatsApp = handoff activo
];

/**
 * Detecta si la respuesta de Alma contiene señales de handoff.
 * Si Alma envía el link de WhatsApp, es una señal fuerte.
 */
function detectHandoff(botResponse: string): boolean {
    const lower = botResponse.toLowerCase();
    return HANDOFF_SIGNALS.some(signal => lower.includes(signal));
}

/**
 * Notifica a n8n vía webhook cuando hay un evento relevante (handoff, pedido, etc.)
 * Fire-and-forget: no bloqueamos la respuesta al usuario.
 */
async function notifyN8nEvent(payload: {
    event: string;
    senderName?: string;
    senderPhone?: string;
    conversationId?: string;
    botResponse?: string;
    userQuery?: string;
}) {
    const webhookUrl = serverSettings.n8nEventWebhookUrl;
    if (!webhookUrl) return; // No configurado, skip silencioso

    try {
        await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ...payload,
                timestamp: new Date().toISOString(),
                source: 'dify-chat-web',
            }),
            signal: AbortSignal.timeout(10000),
        });
    } catch (err) {
        // Fire-and-forget: no interrumpir el flujo del chat
        console.error('[dify-chat] Error notifying n8n:', err);
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { query, conversationId, user, senderName, senderPhone } = body;

        if (!query?.trim()) {
            return NextResponse.json(
                { success: false, error: 'Mensaje vacío.' },
                { status: 400 }
            );
        }

        if (!serverSettings.difyApiKey) {
            return NextResponse.json(
                { success: false, error: 'DIFY_API_KEY no configurada en el servidor.' },
                { status: 500 }
            );
        }

        const startTime = Date.now();

        // ── Llamada directa a Dify API ──────────────────────────────
        const difyPayload: Record<string, any> = {
            inputs: {},
            query: query.trim(),
            user: user || `web-anonymous-${Date.now()}`,
            response_mode: 'blocking',
        };

        // Solo enviar conversation_id si existe (primera vez va vacío)
        if (conversationId) {
            difyPayload.conversation_id = conversationId;
        }

        const difyResponse = await fetch(
            `${serverSettings.difyBaseUrl}/chat-messages`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${serverSettings.difyApiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(difyPayload),
                signal: AbortSignal.timeout(40000),
            }
        );

        const duration = Date.now() - startTime;

        if (!difyResponse.ok) {
            const errorText = await difyResponse.text();
            console.error(`[dify-chat] Dify API error ${difyResponse.status}:`, errorText);
            return NextResponse.json({
                success: false,
                error: `Error de Dify (${difyResponse.status}): ${difyResponse.statusText}`,
                debug: { duration: `${duration}ms`, status: difyResponse.status, raw: errorText },
            });
        }

        const difyData = await difyResponse.json();

        const botResponse = difyData.answer || '';
        const newConversationId = difyData.conversation_id || '';

        // ── Detección de handoff → notificación a n8n (fire-and-forget) ──
        if (botResponse && detectHandoff(botResponse)) {
            // No await — fire-and-forget para no bloquear la respuesta al usuario
            notifyN8nEvent({
                event: 'handoff_detected',
                senderName,
                senderPhone,
                conversationId: newConversationId,
                botResponse,
                userQuery: query,
            });
        }

        return NextResponse.json({
            success: true,
            botResponse,
            conversationId: newConversationId,
            debug: {
                duration: `${duration}ms`,
                status: difyResponse.status,
                messageId: difyData.message_id,
                tokens: difyData.metadata?.usage?.total_tokens,
            },
        });

    } catch (error: any) {
        console.error('[dify-chat] Unhandled error:', error);

        if (error.name === 'TimeoutError') {
            return NextResponse.json(
                { success: false, error: 'Sin respuesta de Dify (40s)' },
                { status: 504 }
            );
        }
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
