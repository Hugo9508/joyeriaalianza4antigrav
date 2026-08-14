import { NextRequest, NextResponse } from 'next/server';
import { messageStore } from '@/lib/messageStore';
import { cookies } from 'next/headers';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('chat_session')?.value;

  if (!sessionToken) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const messages = messageStore.consume(sessionToken);

  return NextResponse.json({ 
    messages, 
    count: messages.length 
  });
}
