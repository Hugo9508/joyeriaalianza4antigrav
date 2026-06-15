import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Verifica si la variable de entorno está activada en Vercel
  const isMaintenanceMode = process.env.MAINTENANCE_MODE === 'true';

  if (isMaintenanceMode) {
    // Retorna una respuesta limpia o bloquea el sitio con código 503
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
        headers: { 'content-type': 'text/html' }
      }
    );
  }

  return NextResponse.next();
}

// Configuración para que el middleware excluya recursos estáticos y de sistema
export const config = {
  matcher: '/((?!_next/static|_next/image|favicon.ico|imag/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
};
