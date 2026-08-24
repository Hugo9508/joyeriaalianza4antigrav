import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { cookies } from 'next/headers';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

/**
 * @fileOverview Endpoint único para persistir leads (tabla `prospectos`).
 * Lo usan: el onboarding del chat de Alma y los 3 formularios del footer
 * (suscripción, guía de tallas, agendar cita). Antes cada uno de esos 4
 * puntos capturaba nombre/teléfono y no los mandaba a ningún lado —
 * el motivo por el que existían esos formularios era, exactamente, esto.
 *
 * NOTA: los nombres de columna (nombre/telefono/canal/notas) son los del
 * spec original de `chat_prospects` (doc 03/08). No pude confirmarlos contra
 * el `prospectos` real porque no tengo acceso de lectura a ese proyecto de
 * Supabase desde acá — si difieren, avisame los nombres reales y lo ajusto
 * en un minuto. El insert está en un try/catch con logging (no revienta el
 * flujo de UI si el nombre de columna no matchea).
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const leadSchema = z.object({
  name: z.string().trim().min(1, 'Falta el nombre').max(200),
  phone: z.string().trim().min(6, 'Teléfono inválido').max(30),
  source: z.enum(['chat_widget', 'newsletter', 'size_guide', 'appointment']),
  notes: z.string().trim().max(500).optional(),
  accepts_marketing: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = leadSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'Datos inválidos' },
      { status: 400 }
    );
  }

  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('chat_session')?.value;

    const { error } = await getSupabaseAdmin().from('prospectos').insert({
      nombre: parsed.data.name,
      telefono: parsed.data.phone,
      canal: parsed.data.source,
      notas: parsed.data.notes,
      session_id: sessionToken || null,
    });

    if (error) {
      // No se rompe la UX del visitante por esto, pero queda logueado para
      // que se note en vez de perderse en silencio (antes no se guardaba
      // nada y no había ni siquiera un log de que se había intentado).
      console.error('[LEADS_ERROR] No se pudo guardar en prospectos:', error.message);
      return NextResponse.json({ error: 'No se pudo guardar el contacto' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[LEADS_ERROR]', error.message);
    return NextResponse.json({ error: 'No se pudo guardar el contacto' }, { status: 500 });
  }
}
