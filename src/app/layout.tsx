
import type { Metadata } from 'next';
import { Manrope, Playfair_Display } from 'next/font/google';
import '@/app/globals.css';
import { cn } from '@/lib/utils';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { Toaster } from '@/components/ui/toaster';
import { ChatWidget } from '@/components/chat-widget';
import { TickerTape } from '@/components/ticker-tape';
import Script from 'next/script';

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-manrope',
});

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
});

export const metadata: Metadata = {
  title: 'Joyeria Alianzas - Alta Joyería en Montevideo',
  description: 'Descubra piezas únicas que celebran la unión y el brillo eterno. Joyeria Alianzas: tradición y elegancia en el corazón de Montevideo.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="light">
      <body
        className={cn(
          'min-h-screen bg-background font-body antialiased',
          manrope.variable,
          playfair.variable
        )}
      >
        <div className="relative flex min-h-screen flex-col">
          <Header />
          <main className="flex-grow">{children}</main>
          <TickerTape />
          <Footer />
        </div>
        <div id="modal-root"></div>
        {/* ChatWidget ahora dibuja su propio botón flotante (ícono de
            WhatsApp) cuando está cerrado — antes era un componente aparte
            (WhatsappButton) montado acá, y los dos elementos fijos en la
            misma esquina se solapaban cuando el panel estaba abierto. Ver
            el comentario en chat-widget.tsx. */}
        <ChatWidget />
        <Toaster />
      </body>
    </html>
  );
}
