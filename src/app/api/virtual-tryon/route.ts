import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

export const runtime = 'nodejs';

// Antes esta URL tenía un fallback hardcodeado que apuntaba a un webhook
// puntual de n8n — exactamente el patrón que se sacó de /api/checkout en la
// ronda de seguridad anterior. Si falta la env var, ahora falla con un 500
// claro en vez de pegarle a una URL fija.
const TRYON_WEBHOOK_URL = process.env.N8N_TRYON_WEBHOOK_URL;

// ~7MB en base64 ≈ 5MB de imagen real. Antes no había ningún límite: los
// Route Handlers de Next no limitan el tamaño del body por defecto, así que
// un POST de 80MB se parseaba entero en memoria del proceso Node.
const tryonSchema = z.object({
  photoDataUri: z.string()
    .max(7_000_000, 'La foto es demasiado grande.')
    .regex(/^data:image\/(jpeg|png);base64,/, 'Formato de imagen inválido.'),
  // Los valores reales que manda virtual-try-on.tsx son 'ring' | 'necklace' | 'earrings'
  // (getJewelryType() clasifica todo lo que no sea arete/anillo como 'necklace' —
  // eso incluye pulseras, ver doc 12/16 backlog, no se toca acá).
  jewelryType: z.enum(['ring', 'necklace', 'earrings']),
  jewelryStyle: z.string().trim().max(200).optional().default(''),
  productName: z.string().trim().max(200).optional().default(''),
  sessionId: z.string().trim().max(200).optional(),
});

export async function POST(req: NextRequest) {
  try {
    if (!TRYON_WEBHOOK_URL) {
      console.error('N8N_TRYON_WEBHOOK_URL no está definida');
      return NextResponse.json({ success: false, error: 'Error de configuración del servidor' }, { status: 500 });
    }

    const body = await req.json().catch(() => null);
    const parsed = tryonSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || 'Datos inválidos' },
        { status: 400 }
      );
    }
    const { photoDataUri, jewelryType, jewelryStyle, productName, sessionId } = parsed.data;

    const n8nResponse = await fetch(TRYON_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'AlianzaBoutique-Web/3.0' },
      body: JSON.stringify({ photoDataUri, jewelryType, jewelryStyle, productName, sessionId: sessionId || `tryon_${Date.now()}` }),
      signal: AbortSignal.timeout(90000),
    });
    if (!n8nResponse.ok) {
      return NextResponse.json({ success: false, error: 'El servicio de prueba virtual no está disponible ahora.' }, { status: 502 });
    }
    const data = await n8nResponse.json();
    return NextResponse.json({ success: true, generatedImageDataUri: data.generatedImageDataUri || data.imageUrl || null });
  } catch (error: any) {
    if (error.name === 'TimeoutError') {
      return NextResponse.json({ success: false, error: 'Timeout 90s — intente de nuevo.' }, { status: 504 });
    }
    // Antes devolvía error.message crudo al cliente — si el fetch fallaba,
    // ese mensaje puede incluir la URL interna del webhook de n8n.
    console.error('[TRYON_ERROR]', error.message);
    return NextResponse.json({ success: false, error: 'No se pudo procesar la prueba virtual.' }, { status: 500 });
  }
}
