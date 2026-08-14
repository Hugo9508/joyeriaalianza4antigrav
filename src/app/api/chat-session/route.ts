import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabase } from '@/integrations/supabase/client';

export async function POST() {
  try {
    const { data: session, error } = await supabase
      .from('chat_sessions')
      .insert({})
      .select('id')
      .single();

    if (error) throw error;

    const sessionToken = session.id;
    const cookieStore = await cookies();
    
    cookieStore.set('chat_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 60 * 60 * 24 * 7 // 1 week
    });

    return NextResponse.json({ success: true, token: sessionToken });
  } catch (error: any) {
    console.error('[SESSION_ERROR]', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
