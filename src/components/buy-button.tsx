'use client';

import { useState, type FormEvent } from 'react';
import type { Product } from '@/lib/products';
// Removed checkout import
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { CreditCard, Loader2, ShieldCheck, Lock } from 'lucide-react';

interface BuyButtonProps {
  product: Product;
}

type CheckoutState = 'idle' | 'loading' | 'redirecting';

export function BuyButton({ product }: BuyButtonProps) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<CheckoutState>('idle');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [barrio, setBarrio] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const { toast } = useToast();

  const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!firstName.trim()) {
      setErrorMsg('Ingresá tu nombre.');
      return;
    }
    if (!email.trim() || !isValidEmail(email.trim())) {
      setErrorMsg('Ingresá un email válido.');
      return;
    }
    if (!phone.trim()) {
      setErrorMsg('Ingresá tu teléfono.');
      return;
    }

    setState('loading');

    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          buyer: {
            firstName: firstName.trim(),
            lastName: lastName.trim() || undefined,
            email: email.trim(),
            phone: phone.trim(),
            barrio: barrio.trim() || undefined,
          },
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Error al procesar el pago');
      }

      const result = await response.json();

      // Antes esto asumía que result.redirect_url siempre venía bien formado
      // y redirigía sin validar. Si n8n cambiaba el shape de la respuesta o
      // Mercado Pago fallaba devolviendo 200 con otro formato, el usuario
      // veía "¡Redirigiendo!" y terminaba en /undefined → 404, venta perdida
      // sin ningún log.
      if (!result?.redirect_url || typeof result.redirect_url !== 'string') {
        throw new Error('El proveedor de pago no devolvió un link válido. Intentá de nuevo o escribinos por WhatsApp.');
      }

      setState('redirecting');

      toast({
        title: '¡Redirigiendo a Mercado Pago!',
        description: 'Serás redirigido en un momento...',
      });

      // Small delay so user sees the feedback
      setTimeout(() => {
        window.location.href = result.redirect_url;
      }, 600);
    } catch (err: any) {
      setState('idle');
      const msg = err?.message || 'Error al procesar. Intentá de nuevo.';
      setErrorMsg(msg);
      toast({
        title: 'Error en el checkout',
        description: msg,
        variant: 'destructive',
      });
    }
  };

  const handleOpenChange = (value: boolean) => {
    if (state === 'loading' || state === 'redirecting') return;
    setOpen(value);
    if (!value) {
      setErrorMsg('');
      setState('idle');
    }
  };

  const isDisabled = product.stockStatus === 'out_of_stock';

  return (
    <>
      {/* Antes: gradiente dorado con glow de color (from-primary via-yellow-500
          to-primary + shadow-primary/25) — el tell de template más fuerte del
          sitio. Ahora usa la variante default del botón (tinta sólida). */}
      <Button
        id="buy-now-button"
        size="lg"
        onClick={() => setOpen(true)}
        disabled={isDisabled}
        className="w-full group"
      >
        <CreditCard className="w-5 h-5 mr-2 transition-transform group-hover:scale-110" />
        {isDisabled ? 'Agotado' : 'Comprar Ahora'}
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="w-full max-w-md mx-auto p-0 overflow-hidden rounded-2xl">
          <div className="overflow-y-auto max-h-[90vh] p-5 sm:p-6">
            <DialogHeader className="mb-4">
              <DialogTitle className="font-headline text-2xl flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-primary" />
                Checkout
              </DialogTitle>
              <DialogDescription>
                Completá tus datos para proceder al pago seguro con Mercado Pago.
              </DialogDescription>
            </DialogHeader>

            {/* Product Summary — mobile-first: imagen grande arriba */}
            <div className="flex flex-col sm:flex-row items-start gap-3 p-3 bg-muted/40 rounded-xl border mb-5">
              {product.images?.[0] && (
                <div className="w-full sm:w-20 sm:h-20 h-40 rounded-lg overflow-hidden bg-secondary flex-shrink-0">
                  <img
                    src={product.images[0]}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold leading-snug">{product.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{product.category}</p>
                <p className="price text-xl mt-1">
                  USD {product.price.usd.toLocaleString()}
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Nombre y Apellido — apilados en mobile */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="checkout-firstname" className="text-xs uppercase tracking-wider font-medium">
                    Nombre *
                  </Label>
                  <Input
                    id="checkout-firstname"
                    placeholder="Tu nombre"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    disabled={state !== 'idle'}
                    required
                    autoFocus
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="checkout-lastname" className="text-xs uppercase tracking-wider font-medium">
                    Apellido
                  </Label>
                  <Input
                    id="checkout-lastname"
                    placeholder="Tu apellido"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    disabled={state !== 'idle'}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="checkout-email" className="text-xs uppercase tracking-wider font-medium">
                  Email *
                </Label>
                <Input
                  id="checkout-email"
                  type="email"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={state !== 'idle'}
                  required
                />
              </div>

              {/* Teléfono y Barrio — apilados en mobile */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="checkout-phone" className="text-xs uppercase tracking-wider font-medium">
                    Teléfono *
                  </Label>
                  <Input
                    id="checkout-phone"
                    type="tel"
                    placeholder="099 123 456"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    disabled={state !== 'idle'}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="checkout-barrio" className="text-xs uppercase tracking-wider font-medium">
                    Barrio
                  </Label>
                  <Input
                    id="checkout-barrio"
                    placeholder="Ej: Carrasco"
                    value={barrio}
                    onChange={(e) => setBarrio(e.target.value)}
                    disabled={state !== 'idle'}
                  />
                </div>
              </div>

              {errorMsg && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <p className="text-sm text-destructive">{errorMsg}</p>
                </div>
              )}

              <div className="flex flex-col gap-3 pt-2">
                {/* variant="payment": única excepción cromática permitida en el
                    sistema (es el color de marca de Mercado Pago, no del sitio). */}
                <Button
                  id="checkout-submit-button"
                  type="submit"
                  size="lg"
                  variant="payment"
                  disabled={state !== 'idle'}
                  className="w-full"
                >
                  {(state === 'loading' || state === 'redirecting') && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  {state === 'idle' && (
                    <Lock className="w-4 h-4 mr-2" />
                  )}
                  {state === 'idle' && 'Pagar con Mercado Pago'}
                  {state === 'loading' && 'Procesando...'}
                  {state === 'redirecting' && 'Redirigiendo...'}
                </Button>

                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Pago 100% seguro con Mercado Pago</span>
                </div>
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
