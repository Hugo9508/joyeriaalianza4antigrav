'use client';

import { useState, type FormEvent } from 'react';
import type { Product } from '@/lib/products';
import { createCheckoutPreference } from '@/lib/checkout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
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
      const result = await createCheckoutPreference(product, {
        firstName: firstName.trim(),
        lastName: lastName.trim() || undefined,
        email: email.trim(),
        phone: phone.trim(),
        barrio: barrio.trim() || undefined,
      });

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
      <Button
        id="buy-now-button"
        onClick={() => setOpen(true)}
        disabled={isDisabled}
        className="w-full h-14 bg-gradient-to-r from-primary via-yellow-500 to-primary hover:from-primary/90 hover:via-yellow-400 hover:to-primary/90 text-primary-foreground shadow-lg shadow-primary/25 transition-all duration-300 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 group"
      >
        <CreditCard className="w-5 h-5 mr-2 transition-transform group-hover:scale-110" />
        <span className="text-sm font-bold uppercase tracking-widest">
          {isDisabled ? 'Agotado' : 'Comprar Ahora'}
        </span>
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-headline text-2xl flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary" />
              Checkout
            </DialogTitle>
            <DialogDescription>
              Completá tus datos para proceder al pago seguro con Mercado Pago.
            </DialogDescription>
          </DialogHeader>

          {/* Product Summary */}
          <div className="flex items-center gap-4 p-3 bg-muted/40 rounded-lg border">
            {product.images?.[0] && (
              <div className="w-16 h-16 rounded-md overflow-hidden bg-secondary flex-shrink-0">
                <img
                  src={product.images[0]}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{product.name}</p>
              <p className="text-xs text-muted-foreground">{product.category}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="font-headline text-lg text-primary font-bold">
                USD {product.price.usd.toLocaleString()}
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
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
              <div className="space-y-2">
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

            <div className="space-y-2">
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

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
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
              <div className="space-y-2">
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

            <DialogFooter className="flex-col gap-3 sm:flex-col">
              <Button
                id="checkout-submit-button"
                type="submit"
                disabled={state !== 'idle'}
                className="w-full h-12 bg-[#009ee3] hover:bg-[#007eb5] text-white font-bold shadow-md transition-all duration-200 hover:shadow-lg"
              >
                {state === 'loading' && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                {state === 'redirecting' && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                {state === 'idle' && (
                  <Lock className="w-4 h-4 mr-2" />
                )}
                <span>
                  {state === 'idle' && 'Pagar con Mercado Pago'}
                  {state === 'loading' && 'Procesando...'}
                  {state === 'redirecting' && 'Redirigiendo...'}
                </span>
              </Button>

              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Pago 100% seguro con Mercado Pago</span>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
