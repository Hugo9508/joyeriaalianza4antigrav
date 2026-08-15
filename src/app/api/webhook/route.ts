import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/integrations/supabase/client';
import { createHmac, timingSafeEqual } from 'crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-signature');
    const secret = process.env.N8N_WEBHOOK_SECRET;

    if (!secret) {
      console.error('N8N_WEBHOOK_SECRET no configurado');
      return NextResponse.json({ error: 'Error de configuración' }, { status: 500 });
    }

    if (!signature) {
      return NextResponse.json({ error: 'Falta firma' }, { status: 401 });
    }

    const expectedSignature = createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');

    if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      return NextResponse.json({ error: 'Firma inválida' }, { status: 401 });
    }

    const body = JSON.parse(rawBody);
    const { text, sessionId } = body;

    if (!text || !sessionId) {
      return NextResponse.json({ 
        error: 'Faltan campos obligatorios' 
      }, { status: 400 });
    }

    // Save webhook message to Supabase
    const { error } = await supabase.from('chat_messages').insert({
      session_id: sessionId,
      role: 'assistant',
      content: text
    });

    if (error) throw error;

    return NextResponse.json({ 
      received: true, 
      at: new Date().toISOString() 
    });
  } catch (error: any) {
    console.error('[WEBHOOK_RECEIVE_ERROR]', error.message);
    return NextResponse.json({ error: 'Error al procesar el mensaje' }, { status: 400 });
  }
}

export async function GET() {
  return NextResponse.json({ status: "online" });
}
