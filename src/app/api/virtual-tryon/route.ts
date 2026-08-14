import { NextRequest, NextResponse } from 'next/server';
export const runtime = 'nodejs';
const TRYON_WEBHOOK_URL = process.env.N8N_TRYON_WEBHOOK_URL || 'https://n8n.axion380.com.br/webhook/ja-tryon';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { photoDataUri, jewelryType, jewelryStyle, productName, sessionId } = body;
    if (!photoDataUri || !jewelryType) {
      return NextResponse.json({ success: false, error: 'Faltan campos requeridos.' }, { status: 400 });
    }
    const n8nResponse = await fetch(TRYON_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'AlianzaBoutique-Web/3.0' },
      body: JSON.stringify({ photoDataUri, jewelryType, jewelryStyle: jewelryStyle || '', productName: productName || '', sessionId: sessionId || `tryon_${Date.now()}` }),
      signal: AbortSignal.timeout(90000),
    });
    if (!n8nResponse.ok) {
      return NextResponse.json({ success: false, error: `Error del servicio (${n8nResponse.status})` }, { status: 502 });
    }
    const data = await n8nResponse.json();
    return NextResponse.json({ success: true, generatedImageDataUri: data.generatedImageDataUri || data.imageUrl || null });
  } catch (error: any) {
    if (error.name === 'TimeoutError') {
      return NextResponse.json({ success: false, error: 'Timeout 90s — intente de nuevo.' }, { status: 504 });
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
