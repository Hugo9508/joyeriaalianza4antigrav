'use client';

import type { Product } from '@/lib/products';
import { Button, type ButtonProps } from '@/components/ui/button';
import { handleWhatsAppChat } from '@/lib/whatsapp';

interface WhatsAppProductButtonProps extends Omit<ButtonProps, 'onClick'> {
  product: Product;
  children: React.ReactNode;
}

export function WhatsAppProductButton({ product, children, className, ...props }: WhatsAppProductButtonProps) {
  return (
    <Button 
      onClick={() => handleWhatsAppChat(product)} 
      className={className}
      {...props}
    >
      {children}
    </Button>
  );
}
