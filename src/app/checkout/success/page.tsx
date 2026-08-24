import Link from 'next/link';
import { CheckCircle2, ArrowLeft, Package, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

// F6 (doc 16, backlog) — antes esta página decía "¡Pago Exitoso!" siempre,
// sin mirar nada: cualquiera que escribiera la URL a mano veía la
// confirmación. El checkout real vive en un webhook de n8n (no hay token
// de Mercado Pago en este repo, ver src/app/api/checkout/route.ts), así que
// no se puede validar el pago contra la API de MP desde acá — pero MP sí
// agrega `collection_status`/`status` y `payment_id` como query params al
// redirigir de vuelta, y eso alcanza para no confirmar en falso.
export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const status = first(params.status) || first(params.collection_status);
  const paymentId = first(params.payment_id) || first(params.collection_id);
  const confirmed = status === 'approved' && !!paymentId;

  if (!confirmed) {
    return (
      <div className="flex-grow flex items-center justify-center px-4 py-16 pt-32">
        <div className="w-full max-w-md text-center space-y-8">
          <div className="mx-auto w-20 h-20 rounded-full bg-warning/10 flex items-center justify-center">
            <AlertTriangle className="w-10 h-10 text-warning" />
          </div>
          <div className="space-y-3">
            <h1 className="font-headline text-3xl md:text-4xl text-foreground">
              No pudimos confirmar el pago
            </h1>
            <p className="text-muted-foreground text-sm leading-relaxed max-w-sm mx-auto">
              Si acabás de pagar, puede que la confirmación todavía esté en camino. Si tenés dudas, escribinos por WhatsApp con tu comprobante y lo revisamos al instante.
            </p>
          </div>
          <div className="flex flex-col gap-3">
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

  return (
    <div className="flex-grow flex items-center justify-center px-4 py-16 pt-32">
      <div className="w-full max-w-md text-center space-y-8">
        {/* Icon */}
        <div className="mx-auto w-20 h-20 rounded-full bg-sage/10 flex items-center justify-center animate-in zoom-in-50 duration-500">
          <CheckCircle2 className="w-10 h-10 text-sage" />
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
        <div className="p-4 bg-sage/10 border border-sage/20 rounded-lg text-left space-y-2">
          <div className="flex items-center gap-2 text-sage">
            <Package className="w-4 h-4" />
            <span className="text-sm font-medium">Próximos pasos</span>
          </div>
          <p className="text-xs text-foreground/70 leading-relaxed">
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
