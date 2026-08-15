
import type { Metadata } from 'next';
import { Manrope, Playfair_Display } from 'next/font/google';
import '@/app/globals.css';
import { cn } from '@/lib/utils';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { Toaster } from '@/components/ui/toaster';
import { WhatsappButton } from '@/components/whatsapp-button';
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
  description: 'Descubra piezas únicas que celebran la unión y el brillo eterno. Joyeria Alianzas: tradición y elegancia en el corazón de Carrasco.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="light">
      <body
        title="SIN ROMPER LA LOGICA DEL APP WEB APLICA EL ESTAPA 4"
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
        <ChatWidget />
        <WhatsappButton />
        <Toaster />
      </body>
    </html>
  );
}
