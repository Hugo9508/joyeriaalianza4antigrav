import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const cookieStore = await cookies();
    const existing = cookieStore.get('chat_session')?.value;
    const supabaseAdmin = getSupabaseAdmin();

    // Ya hay una sesión activa en la cookie httpOnly — pero antes esto se
    // daba por bueno sin chequear que la fila siga existiendo. Si se purgó
    // (o el visitante vuelve con una cookie de 7 días vieja apuntando a un
    // id que ya no está), los inserts de /api/chat fallaban la FK en
    // silencio y la conversación nunca se guardaba. Ahora se verifica.
    if (existing) {
      const { data: row } = await supabaseAdmin
        .from('chat_sessions')
        .select('id')
        .eq('id', existing)
        .maybeSingle();

      if (row) {
        return NextResponse.json({ success: true });
      }
      // La sesión de la cookie ya no existe: se cae al alta de una nueva.
    }

    const { data: session, error } = await supabaseAdmin
      .from('chat_sessions')
      .insert({})
      .select('id')
      .single();

    if (error) throw error;

    cookieStore.set('chat_session', session.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 1 semana
    });

    // El token NUNCA va en el body: solo vive en la cookie httpOnly,
    // así JS del navegador (y un eventual XSS) no puede leerlo.
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[SESSION_ERROR]', error.message);
    return NextResponse.json({ error: 'No se pudo iniciar la sesión de chat' }, { status: 500 });
  }
}
