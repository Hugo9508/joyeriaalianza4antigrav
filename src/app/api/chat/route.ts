import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { serverSettings } from '@/lib/settings.server';
import { cookies } from 'next/headers';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const chatRequestSchema = z.object({
  message: z.string().trim().min(1, 'Mensaje vacío').max(2000, 'Mensaje demasiado largo'),
  history: z.array(z.object({ role: z.string(), content: z.string() })).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = chatRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Solicitud inválida' },
        { status: 400 }
      );
    }

    const { message } = parsed.data;

    if (!serverSettings.OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY no configurado');
      return NextResponse.json({ error: 'Configuración de IA faltante' }, { status: 500 });
    }

    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('chat_session')?.value;
    if (!sessionToken) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const supabaseAdmin = getSupabaseAdmin();

    // Fetch history from Supabase
    const { data: historyData, error: historyError } = await supabaseAdmin
      .from('chat_messages')
      .select('role, content')
      .eq('session_id', sessionToken)
      .order('created_at', { ascending: true })
      .limit(10);

    if (historyError) throw historyError;

    // Save user message
    await supabaseAdmin.from('chat_messages').insert({
      session_id: sessionToken,
      role: 'user',
      content: message,
    });

    const systemPrompt = `Eres "Alma", la conserje digital de Joyería Alianzas, una boutique de alta joyería en Uruguay.
Tu tono es extremadamente sofisticado, elegante, cálido y profesional. Utilizas un lenguaje refinado pero accesible.
Experticia: Posees un conocimiento profundo sobre alianzas matrimoniales, metales preciosos (como Oro 18k, Platino, Oro Rosa) y gemas preciosas.
Misión: Asesorar a los clientes con una atención personalizada de nivel boutique. Debes guiarlos en la elección de la pieza perfecta que simbolice su unión.
Personalidad: Eres persuasiva pero sutil, siempre priorizando la elegancia y la satisfacción del cliente.

Directrices clave:
1. Si te preguntan por precios, usa siempre USD (Dólares Americanos).
2. Menciona la calidad y el acabado artesanal de las piezas.
3. Invita a los clientes a visitar la boutique en Carrasco si necesitan una experiencia presencial.
4. Si el cliente parece indeciso, ofrece explicar las diferencias entre los materiales o estilos (clásico, moderno, minimalista).
5. Responde siempre en español.`;

    const chatMessages = [
      { role: 'system', content: systemPrompt },
      ...(historyData || []).map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: message },
    ];

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${serverSettings.OPENAI_API_KEY}`,
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
    await supabaseAdmin.from('chat_messages').insert({
      session_id: sessionToken,
      role: 'assistant',
      content: reply,
    });

    return NextResponse.json({ reply });
  } catch (error: any) {
    console.error('[CHAT_ERROR]', error.message);
    return NextResponse.json({ error: 'No se pudo procesar el mensaje' }, { status: 500 });
  }
}
