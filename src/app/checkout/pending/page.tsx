import Link from 'next/link';
import { Clock, ArrowLeft, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function CheckoutPendingPage() {
  return (
    <div className="flex-grow flex items-center justify-center px-4 py-16 pt-32">
      <div className="w-full max-w-md text-center space-y-8">
        {/* Icon */}
        <div className="mx-auto w-20 h-20 rounded-full bg-amber-100 flex items-center justify-center animate-in zoom-in-50 duration-500">
          <Clock className="w-10 h-10 text-amber-600" />
        </div>

        {/* Title */}
        <div className="space-y-3">
          <h1 className="font-headline text-3xl md:text-4xl text-foreground">
            Pago Pendiente
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed max-w-sm mx-auto">
            Tu pago está siendo procesado. Esto puede tomar unos minutos.
            Te notificaremos por email cuando se confirme.
          </p>
        </div>

        {/* Info Card */}
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-left space-y-2">
          <div className="flex items-center gap-2 text-amber-700">
            <Mail className="w-4 h-4" />
            <span className="text-sm font-medium">Revisá tu email</span>
          </div>
          <p className="text-xs text-amber-600 leading-relaxed">
            Recibirás una confirmación de Mercado Pago cuando el pago sea aprobado.
            Si elegiste pagar en efectivo (ej. Abitab, RedPagos), tenés tiempo limitado
            para completar el pago.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <Link href="/collections">
            <Button className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-bold uppercase tracking-widest text-xs">
              Seguir Comprando
            </Button>
          </Link>
          <Link href="/">
            <Button variant="outline" className="w-full h-10">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver al Inicio
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
