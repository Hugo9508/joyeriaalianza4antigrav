import Link from 'next/link';
import { CheckCircle2, ArrowLeft, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  return (
    <div className="flex-grow flex items-center justify-center px-4 py-16 pt-32">
      <div className="w-full max-w-md text-center space-y-8">
        {/* Icon */}
        <div className="mx-auto w-20 h-20 rounded-full bg-green-100 flex items-center justify-center animate-in zoom-in-50 duration-500">
          <CheckCircle2 className="w-10 h-10 text-green-600" />
        </div>

        {/* Title */}
        <div className="space-y-3">
          <h1 className="font-headline text-3xl md:text-4xl text-foreground">
            ¡Pago Exitoso!
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed max-w-sm mx-auto">
            Tu compra ha sido procesada correctamente. Recibirás un email de confirmación
            con los detalles de tu pedido.
          </p>
        </div>

        {/* Info Card */}
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-left space-y-2">
          <div className="flex items-center gap-2 text-green-700">
            <Package className="w-4 h-4" />
            <span className="text-sm font-medium">Próximos pasos</span>
          </div>
          <p className="text-xs text-green-600 leading-relaxed">
            Nos pondremos en contacto contigo para coordinar la entrega de tu pieza.
            También podés escribirnos por WhatsApp para cualquier consulta.
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
