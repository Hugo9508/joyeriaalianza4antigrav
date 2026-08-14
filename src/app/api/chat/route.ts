import { NextRequest, NextResponse } from 'next/server';
import { serverSettings } from '@/lib/settings.server';
import { cookies } from 'next/headers';
import { supabase } from '@/integrations/supabase/client';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { message } = await req.json();

    if (!serverSettings.OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY no configurado');
      return NextResponse.json({ error: 'Configuración de IA faltante' }, { status: 500 });
    }

    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('chat_session')?.value;
    if (!sessionToken) {
       return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Fetch history from Supabase
    const { data: historyData, error: historyError } = await supabase
      .from('chat_messages')
      .select('role, content')
      .eq('session_id', sessionToken)
      .order('created_at', { ascending: true })
      .limit(10);

    if (historyError) throw historyError;

    // Save user message
    await supabase.from('chat_messages').insert({
      session_id: sessionToken,
      role: 'user',
      content: message
    });

    const systemPrompt = `Eres el Agente de Atención al Cliente de "Joyería Alianzas".
Tono: elegante, boutique, atento y sofisticado.
Experticia: alianzas matrimoniales, metales (Oro 18k, Platino) y gemas.
Misión: Ayudar a los clientes con dudas sobre productos, envíos nacionales y procesos de compra.
Si te preguntan por precios, usa la moneda USD.`;

    const chatMessages = [
      { role: 'system', content: systemPrompt },
      ...(historyData || []).map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: message }
    ];

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serverSettings.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: chatMessages,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Error en OpenAI');
    }

    const data = await response.json();
    const reply = data.choices[0].message.content;

    // Save assistant message
    await supabase.from('chat_messages').insert({
      session_id: sessionToken,
      role: 'assistant',
      content: reply
    });

    return NextResponse.json({ reply });
  } catch (error: any) {
    console.error('[CHAT_ERROR]', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
