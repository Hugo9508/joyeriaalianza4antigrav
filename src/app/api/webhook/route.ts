import { NextRequest, NextResponse } from 'next/server';
import { messageStore } from '@/lib/messageStore';

/**
 * @fileOverview Endpoint Maestro de Recepción de Mensajes (n8n -> Web).
 * n8n debe enviar un POST a este endpoint para que el cliente vea la respuesta.
 */

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Log de diagnóstico en el servidor
    console.log(`[INCOMING_WHATSAPP] Phone: ${body.phoneNumber} | Msg: ${body.text}`);

    const { text, senderName, phoneNumber, conversation_id } = body;

    if (!text || !phoneNumber) {
      return NextResponse.json({ 
        error: 'Faltan campos obligatorios: text y phoneNumber' 
      }, { status: 400 });
    }

    // Guardar en el almacén de mensajes para que el chat web lo recoja vía polling
    messageStore.add({ 
      text, 
      senderName: senderName || 'Maya', 
      phoneNumber, 
      conversation_id 
    });

    return NextResponse.json({ 
      received: true, 
      at: new Date().toISOString() 
    });
  } catch (error: any) {
    console.error('[WEBHOOK_RECEIVE_ERROR]', error.message);
    return NextResponse.json({ error: 'Payload malformado' }, { status: 400 });
  }
}

export async function GET() {
  return NextResponse.json({ 
    status: "online", 
    service: "Alianza Chat Webhook",
    info: "Endpoint listo para recibir mensajes de n8n mediante POST."
  });
}
