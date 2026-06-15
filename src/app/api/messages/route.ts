import { NextRequest, NextResponse } from 'next/server';
import { messageStore } from '@/lib/messageStore';

/**
 * @fileOverview Endpoint de consulta de mensajes (Polling).
 * El cliente web llama a esta ruta periódicamente para ver si hay respuestas.
 */

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const phone = searchParams.get('phone');

  if (!phone) {
    return NextResponse.json({ error: 'Parámetro phone requerido' }, { status: 400 });
  }

  // Obtenemos los mensajes y los eliminamos del buzón del servidor
  const messages = messageStore.consume(phone);

  return NextResponse.json({ 
    messages, 
    count: messages.length 
  });
}
