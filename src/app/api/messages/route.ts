import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabase } from '@/integrations/supabase/client';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('chat_session')?.value;

  if (!sessionToken) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const { data: messages, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('session_id', sessionToken)
      .order('created_at', { ascending: true });

    if (error) throw error;

    return NextResponse.json({ 
      messages: messages.map(m => ({
        id: m.id,
        text: m.content,
        senderName: m.role === 'assistant' ? 'Alma' : 'Usuario',
        role: m.role,
        timestamp: new Date(m.created_at).getTime()
      })), 
      count: messages.length 
    });
  } catch (error: any) {
    console.error('[MESSAGES_ERROR]', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
