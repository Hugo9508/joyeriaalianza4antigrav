import Link from 'next/link';
import { XCircle, ArrowLeft, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { appSettings } from '@/lib/settings';

export default function CheckoutFailurePage() {
  const whatsappUrl = `https://wa.me/${appSettings.whatsAppNumber}?text=${encodeURIComponent(
    'Hola, tuve un problema con mi pago en la web. ¿Podrían ayudarme?'
  )}`;

  return (
    <div className="flex-grow flex items-center justify-center px-4 py-16 pt-32">
      <div className="w-full max-w-md text-center space-y-8">
        {/* Icon */}
        <div className="mx-auto w-20 h-20 rounded-full bg-red-100 flex items-center justify-center animate-in zoom-in-50 duration-500">
          <XCircle className="w-10 h-10 text-red-600" />
        </div>

        {/* Title */}
        <div className="space-y-3">
          <h1 className="font-headline text-3xl md:text-4xl text-foreground">
            Pago No Procesado
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed max-w-sm mx-auto">
            Hubo un problema al procesar tu pago. No se realizó ningún cargo.
            Podés intentar nuevamente o contactarnos para asistencia.
          </p>
        </div>

        {/* Help Card */}
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-left space-y-2">
          <p className="text-xs text-red-600 leading-relaxed">
            <strong>Posibles causas:</strong> fondos insuficientes, tarjeta rechazada,
            o problema temporal con el procesador de pagos. Verificá los datos
            e intentá nuevamente.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <Link href="/collections">
            <Button className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-bold uppercase tracking-widest text-xs">
              Intentar de Nuevo
            </Button>
          </Link>
          <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" className="w-full h-10">
              <MessageCircle className="w-4 h-4 mr-2" />
              Contactar por WhatsApp
            </Button>
          </a>
          <Link href="/">
            <Button variant="ghost" className="w-full h-10 text-muted-foreground">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver al Inicio
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
