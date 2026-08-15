import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { createHmac, timingSafeEqual } from 'crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function isValidSignature(rawBody: string, signature: string, secret: string): boolean {
  const expectedSignature = createHmac('sha256', secret).update(rawBody).digest('hex');
  const expected = Buffer.from(expectedSignature);
  const received = Buffer.from(signature);

  // Longitudes distintas harían que timingSafeEqual tire RangeError en vez de
  // devolver false — se descarta antes para que siempre resuelva en 401.
  if (expected.length !== received.length) return false;

  return timingSafeEqual(received, expected);
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-signature');
    const secret = process.env.N8N_WEBHOOK_SECRET;

    if (!secret) {
      console.error('N8N_WEBHOOK_SECRET no configurado');
      return NextResponse.json({ error: 'Error de configuración' }, { status: 500 });
    }

    if (!signature || !isValidSignature(rawBody, signature, secret)) {
      return NextResponse.json({ error: 'Firma inválida' }, { status: 401 });
    }

    const body = JSON.parse(rawBody);
    const { text, sessionId } = body;

    if (!text || !sessionId) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
    }

    // Save webhook message to Supabase (service_role — bypassa RLS, uso server-only)
    const { error } = await getSupabaseAdmin().from('chat_messages').insert({
      session_id: sessionId,
      role: 'assistant',
      content: text,
    });

    if (error) throw error;

    return NextResponse.json({
      received: true,
      at: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[WEBHOOK_RECEIVE_ERROR]', error.message);
    return NextResponse.json({ error: 'Error al procesar el mensaje' }, { status: 400 });
  }
}

export async function GET() {
  return NextResponse.json({ status: 'online' });
}
