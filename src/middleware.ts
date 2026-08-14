import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Simple in-memory rate limiting (for demo/development purposes)
// In production, use Redis or a similar store.
const ipRequestCounts = new Map<string, { count: number; lastReset: number }>();

function rateLimit(ip: string, limit: number, windowMs: number) {
  const now = Date.now();
  const userData = ipRequestCounts.get(ip) || { count: 0, lastReset: now };

  if (now - userData.lastReset > windowMs) {
    userData.count = 0;
    userData.lastReset = now;
  }

  userData.count++;
  ipRequestCounts.set(ip, userData);

  return userData.count <= limit;
}

export function middleware(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';

  // Rate Limiting
  if (request.nextUrl.pathname.startsWith('/api/')) {
    // Chat routes limit: 10 requests per minute
    if (request.nextUrl.pathname.includes('/api/chat') || request.nextUrl.pathname.includes('/api/messages')) {
      if (!rateLimit(ip, 10, 60000)) {
        return new NextResponse(JSON.stringify({ error: 'Too many requests' }), {
          status: 429,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }
    
    // Virtual Try-On limit: 3 requests per 5 minutes
    if (request.nextUrl.pathname.includes('/api/virtual-tryon')) {
      if (!rateLimit(ip, 3, 300000)) {
        return new NextResponse(JSON.stringify({ error: 'Try-on limit reached' }), {
          status: 429,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }
  }

  // Maintenance Mode
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
          'Retry-After': '3600',
          'Cache-Control': 'no-store'
        }
      }
    );
  }

  return NextResponse.next();
}

// Configuración para que el middleware excluya recursos estáticos y de sistema
export const config = {
  matcher: '/((?!_next/static|_next/image|favicon.ico|imag/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
};
