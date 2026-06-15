'use client';

import type { Product } from '@/lib/products';

/**
 * @fileOverview Lógica para gestionar la intención de chat.
 * Abre el widget oficial de n8n con el mensaje precargado;
 * cae a wa.me directo como fallback.
 */

export const handleWhatsAppChat = (product: Product) => {
  const siteUrl = typeof window !== 'undefined' ? window.location.origin : 'https://joyeria.a380.com.br';
  const productUrl = `${siteUrl}/products/${product.id}`;
  const skuText = product.sku ? `\n*SKU:* ${product.sku}` : '';

  const message = `¡Hola! Me interesa esta pieza:\n\n*Producto:* ${product.name}\n*Precio:* U$S ${product.price?.usd?.toLocaleString() || ''}${skuText}\n*Enlace:* ${productUrl}\n\n¿Podrían darme más información?`;

  if (typeof window !== 'undefined') {
    // Si el widget de n8n está presente en la UI
    const chatWindow = document.querySelector('#n8n-chat') || document.querySelector('.n8n-chat-widget');
    if (chatWindow || (window as any).n8nChat || document.querySelector('n8n-chat')) {
      // Disparar eventos nativos de n8n-chat para abrir y enviar el mensaje
      window.dispatchEvent(new CustomEvent('n8n-chat:open'));
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('n8n-chat:send', {
          detail: { message }
        }));
      }, 500);
    } else {
      // Fallback
      window.open(`https://wa.me/59891264956?text=${encodeURIComponent(message)}`, '_blank');
    }
  }
};
