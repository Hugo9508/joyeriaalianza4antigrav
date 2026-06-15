import { NextRequest, NextResponse } from 'next/server';

/**
 * @fileOverview API Route para chat con Alma via n8n.
 * Reemplaza la conexión directa con Dify.
 * El sitio SOLO habla con este endpoint, que reenvía todo a n8n Flujo 1.
 *
 * POST /api/alma-chat
 * Body: { mensaje, sessionId, senderName?, canal?, productoContexto? }
 * Returns: { success, response, paused }
 */

export const runtime = 'nodejs';

/** URL del webhook de Alma Agent en n8n (Flujo 1) */
const ALMA_WEBHOOK_URL =
  process.env.N8N_ALMA_WEBHOOK_URL ||
  'https://n8n.axion380.com.br/webhook/alma-agent';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { mensaje, sessionId, senderName, canal, productoContexto } = body;

    if (!mensaje?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Mensaje vacío.' },
        { status: 400 }
      );
    }

    const startTime = Date.now();

    // ── Llamada a n8n Flujo 1 (Alma Agent) ──────────────────────
    const n8nPayload = {
      mensaje: mensaje.trim(),
      sessionId: sessionId || `web_anon_${Date.now()}`,
      senderName: senderName || '',
      canal: canal || 'web',
      productoContexto: productoContexto || '',
    };

    const n8nResponse = await fetch(ALMA_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'AlianzaBoutique-Web/3.0',
      },
      body: JSON.stringify(n8nPayload),
      signal: AbortSignal.timeout(45000), // n8n + GPT puede tardar ~10-20s
    });

    const duration = Date.now() - startTime;

    if (!n8nResponse.ok) {
      const errorText = await n8nResponse.text();
      console.error(`[alma-chat] n8n error ${n8nResponse.status}:`, errorText);
      return NextResponse.json({
        success: false,
        error: `Error del agente (${n8nResponse.status})`,
        debug: { duration: `${duration}ms`, status: n8nResponse.status },
      });
    }

    const n8nData = await n8nResponse.json();

    // n8n Flujo 1 devuelve: { output } (AI Agent) o { response } (custom)
    const almaResponse = n8nData.response || n8nData.output || n8nData.text || '';

    return NextResponse.json({
      success: almaResponse ? true : (n8nData.success ?? false),
      response: almaResponse,
      paused: n8nData.paused ?? false,
      debug: {
        duration: `${duration}ms`,
        status: n8nResponse.status,
      },
    });

  } catch (error: any) {
    console.error('[alma-chat] Unhandled error:', error);

    if (error.name === 'TimeoutError') {
      return NextResponse.json(
        { success: false, error: 'Alma no respondió a tiempo (45s). Intentá de nuevo.' },
        { status: 504 }
      );
    }
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
