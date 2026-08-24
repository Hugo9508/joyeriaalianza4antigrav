import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('chat_session')?.value;

  if (!sessionToken) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    // ?since=<epoch ms>: el polling del widget (cada 3s) antes traía la
    // charla completa en cada tick. Con `since` sólo trae lo nuevo — sin
    // índice sobre (session_id, created_at) esto sigue siendo un table scan
    // por sesión (ver doc 16, 4.6: falta CREATE INDEX en producción).
    const sinceParam = req.nextUrl.searchParams.get('since');
    const since = sinceParam ? Number(sinceParam) : null;

    let query = getSupabaseAdmin()
      .from('chat_messages')
      .select('*')
      .eq('session_id', sessionToken)
      .order('created_at', { ascending: true });

    if (since && !Number.isNaN(since)) {
      query = query.gt('created_at', new Date(since).toISOString());
    }

    const { data: messages, error } = await query;

    if (error) throw error;

    return NextResponse.json({
      messages: messages.map(m => ({
        id: m.id,
        text: m.content,
        senderName: m.role === 'assistant' ? 'Alma' : 'Usuario',
        role: m.role,
        timestamp: new Date(m.created_at).getTime(),
      })),
      count: messages.length,
    });
  } catch (error: any) {
    console.error('[MESSAGES_ERROR]', error.message);
    return NextResponse.json({ error: 'No se pudieron obtener los mensajes' }, { status: 500 });
  }
}
