
import type { Metadata } from 'next';
import { Manrope, Playfair_Display } from 'next/font/google';
import './globals.css';
import { cn } from '@/lib/utils';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { Toaster } from '@/components/ui/toaster';
import { WhatsappButton } from '@/components/whatsapp-button';
// import { ChatWidget } from '@/components/chat-widget'; // Reemplazado por Evolution Widget
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
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/@n8n/chat/dist/style.css"
        />
        <Script
          id="n8n-chat-widget"
          type="module"
          strategy="lazyOnload"
          dangerouslySetInnerHTML={{
            __html: `
              import { createChat } from 'https://cdn.jsdelivr.net/npm/@n8n/chat/dist/chat.bundle.es.js';
              createChat({
                webhookUrl: 'https://n8n.axion380.com.br/webhook/alma-agent-2',
                mode: 'window',
                showWelcomeScreen: true,
                initialMessages: [
                  '\u00a1Hola! Soy Alma \ud83d\udc8e',
                  '\u00bfEn qu\u00e9 puedo ayudarte hoy?'
                ],
                i18n: {
                  en: {
                    title: 'Alma \u2014 Joyer\u00eda Alianzas',
                    subtitle: 'Tu asesora virtual de joyer\u00eda',
                    inputPlaceholder: 'Escribe tu mensaje...',
                    getStarted: 'Comenzar conversaci\u00f3n',
                    error: 'Hubo un error. Intenta de nuevo.',
                  }
                }
              });
            `
          }}
        />
        <WhatsappButton />
        <Toaster />
      </body>
    </html>
  );
}
