import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { serverSettings } from '@/lib/settings.server';
import { cookies } from 'next/headers';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { runAgentTurn, type AgentEvent } from '@/lib/agent/core';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// El razonamiento de Alma (system prompt, tools, loop de tool-calling) vivía
// acá adentro hasta que se activó un segundo transporte (WhatsApp vía n8n,
// ver /api/agent). Ahora vive en un solo lugar (src/lib/agent/core.ts,
// runAgentTurn) y esta ruta es un transporte fino: cookie de sesión →
// rate limit → runAgentTurn() → reenvío en vivo de sus eventos como NDJSON.
// "Un cerebro, dos transportes" (07-adr-001-donde-vive-el-agente.md).

const chatRequestSchema = z.object({
  message: z.string().trim().min(1, 'Mensaje vacío').max(2000, 'Mensaje demasiado largo'),
  history: z.array(z.object({ role: z.string(), content: z.string() })).optional(),
});

// F6 — rate limiting: antes /api/chat no tenía techo, cualquiera podía
// pegarle en loop y generar costo de OpenAI sin control. Limitador en
// memoria del proceso: alcanza porque el hosting actual (ADR-001,
// RUNBOOK.md) es un único proceso Node persistente, no funciones
// serverless efímeras — si eso cambia, esto hay que moverlo a Supabase o
// Redis. El propio RUNBOOK documenta que ese proceso ya se cae por falta
// de memoria, así que el mapa se poda periódicamente en vez de crecer para
// siempre con una entrada por sesión vista alguna vez.
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_PER_SESSION = 20;
const RATE_LIMIT_MAX_PER_IP = 60;
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

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const now = Date.now();
    const withinSessionLimit = checkRateLimit(`session:${sessionToken}`, RATE_LIMIT_MAX_PER_SESSION, now);
    const withinIpLimit = ip === 'unknown' || checkRateLimit(`ip:${ip}`, RATE_LIMIT_MAX_PER_IP, now);
    if (!withinSessionLimit || !withinIpLimit) {
      return NextResponse.json(
        { error: 'Estás escribiendo muy rápido — esperá un momento antes de mandar otro mensaje.' },
        { status: 429 }
      );
    }

    const supabaseAdmin = getSupabaseAdmin();

    // F6 — streaming: el proveedor (OpenAI) siempre se pide con stream:true
    // dentro de runAgentTurn; acá cada evento que emite se reenvía al
    // navegador apenas llega (protocolo NDJSON: una línea = un evento JSON).
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const send = (evt: AgentEvent) => {
          try {
            controller.enqueue(encoder.encode(JSON.stringify(evt) + '\n'));
          } catch { /* stream ya cerrado del lado del cliente */ }
        };

        await runAgentTurn({ message, sessionId: sessionToken, supabaseAdmin, onEvent: send });
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'application/x-ndjson; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
      },
    });
  } catch (error: any) {
    console.error('[CHAT_ERROR]', error.message);
    return NextResponse.json({ error: 'No se pudo procesar el mensaje' }, { status: 500 });
  }
}
