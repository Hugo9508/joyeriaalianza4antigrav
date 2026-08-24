import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { timingSafeEqual } from 'crypto';
import { serverSettings } from '@/lib/settings.server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { runAgentTurn } from '@/lib/agent/core';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Puente de canal para el mismo cerebro que usa /api/chat (ver
 * src/lib/agent/core.ts). Pensado para que n8n quede como "puente tonto"
 * de WhatsApp — recibe el mensaje entrante, le pega a esta ruta, manda la
 * respuesta de vuelta por WhatsApp — en vez de correr el razonamiento
 * adentro del workflow (07-adr-001-donde-vive-el-agente.md, Opción C).
 *
 * Server-to-server: no hay cookie, el caller se autentica con un token
 * compartido en el header X-Agent-Token. Sin streaming al cliente —
 * WhatsApp no tiene concepto de "iría llegando el texto", así que esta
 * ruta espera el turno completo y devuelve la respuesta final en un solo
 * JSON.
 *
 * ⚠️ Esta ruta se puede probar con tsc y build, pero NO se pudo probar en
 * vivo contra n8n ni contra el schema real de Supabase desde este entorno
 * (sin acceso de red a un n8n real, sin acceso de escritura al proyecto
 * Supabase real). Ver el prompt de Supabase/n8n al final de esta ronda para
 * lo que falta confirmar antes de activarla en producción.
 */

const agentRequestSchema = z.object({
  message: z.string().trim().min(1, 'Mensaje vacío').max(2000, 'Mensaje demasiado largo'),
  // El identificador estable del contacto de WhatsApp (típicamente el
  // número en formato E.164 sin "+", que es como WhatsApp Business API ya
  // lo entrega). NO es un id de chat_sessions — eso se resuelve acá adentro.
  sessionId: z.string().trim().min(1, 'Falta sessionId').max(64, 'sessionId demasiado largo'),
  canal: z.enum(['whatsapp']).optional().default('whatsapp'),
});

// Mismo patrón de ventana deslizante que /api/chat, pero en un Map separado
// y SIN límite por IP: todos los mensajes de TODOS los contactos de
// WhatsApp llegan desde la misma IP (el servidor de n8n) — limitar por IP
// acá cortaría a todos los clientes de WhatsApp como si fueran uno solo.
// Se limita únicamente por sessionId (el contacto real).
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_PER_SESSION = 30;
const rateLimitHits = new Map<string, number[]>();
let lastRateLimitCleanup = Date.now();

function checkRateLimit(key: string, max: number, now: number): boolean {
  if (now - lastRateLimitCleanup > 5 * 60_000) {
    lastRateLimitCleanup = now;
    for (const [k, hits] of rateLimitHits) {
      const recent = hits.filter(t => now - t < RATE_LIMIT_WINDOW_MS);
      if (recent.length === 0) rateLimitHits.delete(k);
      else rateLimitHits.set(k, recent);
    }
  }
  const recent = (rateLimitHits.get(key) || []).filter(t => now - t < RATE_LIMIT_WINDOW_MS);
  recent.push(now);
  rateLimitHits.set(key, recent);
  return recent.length <= max;
}

function isValidAgentToken(received: string, expected: string): boolean {
  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  // Longitudes distintas harían que timingSafeEqual tire RangeError en vez
  // de devolver false — mismo criterio que /api/webhook.
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

// El "cerebro" (runAgentTurn) guarda memoria en chat_messages, con FK a
// chat_sessions.id — un uuid generado por Supabase, no el teléfono que
// manda n8n. Acá se resuelve la sesión interna a partir del identificador
// externo estable, buscando o creando la fila.
//
// ⚠️ SIN VERIFICAR contra el schema real: `chat_sessions.metadata` existe
// (tipo generado contra el schema real, confirmado — no es un placeholder),
// pero ningún código previo lo usaba para búsqueda; la consulta por
// `metadata->>whatsapp_id` es una convención NUEVA. Sin un índice único
// sobre esa expresión, dos mensajes casi simultáneos del mismo contacto
// nuevo podrían crear dos filas de sesión en vez de reusar una — ver el
// prompt de Supabase al final de esta ronda.
async function resolveWhatsappSession(supabaseAdmin: any, whatsappId: string): Promise<string | null> {
  try {
    const { data: existing, error: lookupError } = await supabaseAdmin
      .from('chat_sessions')
      .select('id')
      .eq('metadata->>whatsapp_id', whatsappId)
      .maybeSingle();

    if (lookupError) throw lookupError;
    if (existing) return existing.id;

    const { data: created, error: insertError } = await supabaseAdmin
      .from('chat_sessions')
      .insert({ metadata: { canal: 'whatsapp', whatsapp_id: whatsappId } })
      .select('id')
      .single();

    if (insertError) throw insertError;
    return created.id;
  } catch (e: any) {
    console.error('[AGENT_SESSION_ERROR]', e.message);
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const configuredToken = serverSettings.N8N_AGENT_TOKEN;
    if (!configuredToken) {
      console.error('N8N_AGENT_TOKEN no configurado');
      return NextResponse.json({ error: 'Error de configuración del servidor' }, { status: 500 });
    }

    const receivedToken = req.headers.get('x-agent-token') || '';
    if (!receivedToken || !isValidAgentToken(receivedToken, configuredToken)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    if (!serverSettings.OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY no configurado');
      return NextResponse.json({ error: 'Configuración de IA faltante' }, { status: 500 });
    }

    const body = await req.json().catch(() => null);
    const parsed = agentRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Solicitud inválida' },
        { status: 400 }
      );
    }
    const { message, sessionId: whatsappId } = parsed.data;

    const now = Date.now();
    if (!checkRateLimit(`agent:${whatsappId}`, RATE_LIMIT_MAX_PER_SESSION, now)) {
      return NextResponse.json(
        { error: 'Demasiados mensajes seguidos, esperá un momento.' },
        { status: 429 }
      );
    }

    const supabaseAdmin = getSupabaseAdmin();
    const sessionId = await resolveWhatsappSession(supabaseAdmin, whatsappId);
    if (!sessionId) {
      return NextResponse.json({ error: 'No se pudo inicializar la sesión de conversación.' }, { status: 500 });
    }

    const result = await runAgentTurn({ message, sessionId, supabaseAdmin });

    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: 502 });
    }
    // La conversación está pausada (un asesor humano ya tomó el caso vía
    // derivar_a_asesor) — no hay reply de Alma. 200, no error: el mensaje
    // del cliente SÍ se guardó (ver runAgentTurn); el puente de n8n debe
    // simplemente no mandar nada por WhatsApp en este turno, no reintentar
    // ni tratarlo como una falla.
    if ('paused' in result) {
      return NextResponse.json({ reply: null, paused: true });
    }
    return NextResponse.json({ reply: result.reply });
  } catch (error: any) {
    console.error('[AGENT_ERROR]', error.message);
    return NextResponse.json({ error: 'No se pudo procesar el mensaje' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ status: 'online' });
}
