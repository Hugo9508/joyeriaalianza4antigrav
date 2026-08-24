import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Rate limit básico en memoria (primera capa — no sobrevive reinicios ni
// múltiples instancias, pero corta abuso trivial de scripts/curl mientras
// el sitio corre en un único proceso Node).
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMITS: Record<string, number> = {
  '/api/chat': 20,
  '/api/chat-session': 10,
  '/api/checkout': 8,
  '/api/webhook': 60,
  '/api/virtual-tryon': 5,
  // /api/agent (puente de WhatsApp vía n8n) ya limita por sessionId/contacto
  // adentro de la propia ruta — ver src/app/api/agent/route.ts. Acá, a nivel
  // IP, un techo alto a propósito: TODOS los contactos de WhatsApp le pegan
  // desde la misma IP de n8n, así que un límite ajustado por IP terminaría
  // limitando a todos los clientes de WhatsApp combinados como si fueran
  // uno. Esto es solo backstop contra un token comprometido o un loop roto.
  '/api/agent': 300,
};

const hits = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(key: string, max: number): boolean {
  const now = Date.now();
  const entry = hits.get(key);

  if (!entry || now > entry.resetAt) {
    hits.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (entry.count >= max) return false;

  entry.count++;
  return true;
}

// Poda ocasional del Map para que no crezca indefinidamente.
function pruneExpired() {
  const now = Date.now();
  for (const [key, entry] of hits) {
    if (now > entry.resetAt) hits.delete(key);
  }
}

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

// F6 (doc 16, backlog) — antes no había CSP porque hacía falta inventariar
// primero qué orígenes externos carga el sitio de verdad (grep sobre src/):
// TradingView (ticker-tape), el CDN de video de Temu (hero, hasta que 4.3
// lo autohospede), Google Maps (iframe del footer/contacto), imgur (fotos
// de reseñas) y Unsplash/picsum (placeholders). OpenAI/WooCommerce/Supabase
// NO entran acá — el navegador nunca les pega directo, siempre pasa por
// nuestras propias rutas /api/*.
//
// Update: se confirmó en producción que el widget de TradingView (el
// ticker-tape) no sirve su iframe desde *.tradingview.com sino desde
// www.tradingview-widget.com (dominio propio, no subdominio) — la consola
// tiraba "Framing 'https://www.tradingview-widget.com/' violates ... 
// frame-src". Se agregó ese origen a frame-src y connect-src. Si aparece
// otro error de CSP en consola marcando "Refused to ... because it
// violates the following Content Security Policy directive", es acá.
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://s3.tradingview.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https://placehold.co https://i.imgur.com https://images.unsplash.com https://picsum.photos https://joyeriabd.a380.com.br",
  "media-src 'self' https://goods-vod.kwcdn.com",
  "font-src 'self' data:",
  "connect-src 'self' https://*.tradingview.com https://*.tradingview-widget.com",
  "frame-src https://www.google.com https://*.tradingview.com https://*.tradingview-widget.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
].join('; ');

function withSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('Content-Security-Policy', CSP);
  return response;
}

export function middleware(request: NextRequest) {
  const isMaintenanceMode = process.env.MAINTENANCE_MODE === 'true';

  if (isMaintenanceMode) {
    return new NextResponse(
      `
      <!DOCTYPE html>
      <html lang="es">
        <head>
           <meta charset="UTF-8">
           <meta name="viewport" content="width=device-width, initial-scale=1.0">
           <title>Joyería Alianzas - En Mantenimiento</title>
        </head>
        <body style="display:flex; justify-content:center; align-items:center; height:100vh; background:#1a170f; color:#e8c547; font-family: 'Georgia', sans-serif; text-align:center; margin: 0;">
          <div style="padding: 2rem;">
            <h1 style="margin-bottom: 20px; font-size: 2.5rem;">Sitio en Mantenimiento</h1>
            <p style="font-size: 1.2rem; max-width: 600px; margin: 0 auto; line-height: 1.6; color: #ffffff;">
              Estamos trabajando para mejorar tu experiencia en Joyería Alianzas. <br/>
              Volveremos a estar en línea muy pronto.
            </p>
          </div>
        </body>
      </html>
      `,
      {
        status: 503,
        headers: {
          'content-type': 'text/html',
          'Retry-After': '600',
          'Cache-Control': 'no-store',
        },
      }
    );
  }

  const { pathname } = request.nextUrl;
  const limit = RATE_LIMITS[pathname];

  if (limit) {
    if (Math.random() < 0.02) pruneExpired();

    const ip = getClientIp(request);
    const key = `${ip}:${pathname}`;

    if (!checkRateLimit(key, limit)) {
      return withSecurityHeaders(
        new NextResponse(JSON.stringify({ error: 'Demasiadas solicitudes, intentá de nuevo en un minuto.' }), {
          status: 429,
          headers: { 'content-type': 'application/json', 'Retry-After': '60' },
        })
      );
    }
  }

  return withSecurityHeaders(NextResponse.next());
}

// Configuración para que el middleware excluya recursos estáticos y de sistema
export const config = {
  matcher: '/((?!_next/static|_next/image|favicon.ico|imag/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
};
