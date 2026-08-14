import { NextRequest, NextResponse } from 'next/server';
import { appSettings, legacyServerSettings } from '@/lib/settings';

/**
 * @fileOverview API Route para enviar mensajes a n8n.
 * Reemplaza el Server Action para evitar hash-mismatch entre deploys.
 * Cliente llama POST /api/send-message con { text, senderName, senderPhone, conversationId }
 */

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
    console.warn('[LEGACY] /api/send-message fue llamada — revisar antes de eliminar');
    try {
        const body = await req.json();
        const { text, senderName, senderPhone, conversationId } = body;

        if (!text?.trim()) {
            return NextResponse.json({ success: false, error: 'Mensaje vacío.' }, { status: 400 });
        }

        const startTime = Date.now();

        const requestBody = {
            event: 'web_message',
            instance: appSettings.chatAgentName,
            data: {
                text,
                senderName,
                senderPhone,
                storeNumber: appSettings.whatsAppNumber,
                conversation_id: conversationId || '',
            },
            metadata: {
                platform: 'web_boutique',
                timestamp: new Date().toISOString(),
            },
        };

        const n8nResponse = await fetch(legacyServerSettings.n8nWebhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                'User-Agent': 'JoyeriaAlianza-Web/2.0',
            },
            body: JSON.stringify(requestBody),
            signal: AbortSignal.timeout(40000),
            cache: 'no-store',
        });

        const duration = Date.now() - startTime;
        const responseText = await n8nResponse.text();
        let responseData: any;
        try {
            responseData = JSON.parse(responseText);
        } catch {
            responseData = { raw: responseText };
        }

        if (!n8nResponse.ok) {
            return NextResponse.json({
                success: false,
                error: `Error n8n (${n8nResponse.status}): ${n8nResponse.statusText}`,
                debug: { duration: `${duration}ms`, response: responseData },
            });
        }

        const botResponse = responseData?.response || responseData?.text || responseData?.data?.text || null;

        // ✅ Detectar si n8n redirigió a un error capturado (ej. Gemini Quota 429)
        // El mensaje "Lo siento, no pude procesar tu mensaje" suele ser el fallback de n8n
        const isErrorString = typeof botResponse === 'string' && botResponse.includes('no pude procesar');

        if (isErrorString || (!botResponse && !responseData?.conversation_id)) {
            return NextResponse.json({
                success: false,
                error: isErrorString ? botResponse : 'Respuesta vacía de la IA.',
                debug: { duration: `${duration}ms`, status: n8nResponse.status, raw: responseData },
            });
        }

        return NextResponse.json({
            success: true,
            botResponse: botResponse,
            conversationId: responseData?.conversation_id || responseData?.data?.conversation_id || null,
            debug: { duration: `${duration}ms`, status: n8nResponse.status },
        });

    } catch (error: any) {
        if (error.name === 'TimeoutError') {
            return NextResponse.json({ success: false, error: 'Sin respuesta del servidor (40s)' }, { status: 504 });
        }
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
