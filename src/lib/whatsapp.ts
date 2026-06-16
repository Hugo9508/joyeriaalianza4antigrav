'use client';

import type { Product } from '@/lib/products';

/**
 * @fileOverview Abre WhatsApp directo con datos del producto seleccionado.
 * URL: https://api.whatsapp.com/send/?phone=59891264956&text=...
 */

export const handleWhatsAppChat = (product: Product) => {
  const siteUrl = typeof window !== 'undefined' ? window.location.origin : 'https://joyeria.a380.com.br';
  const productUrl = `${siteUrl}/products/${product.id}`;
  const skuText = product.sku ? `\n*SKU:* ${product.sku}` : '';
  const materialText = product.material ? `\n*Material:* ${product.material}` : '';
  const stoneText = product.stone ? `\n*Gema:* ${product.stone}` : '';

  const message = `¡Hola! Me interesa esta pieza 💍\n\n*Producto:* ${product.name}\n*Precio:* U$S ${product.price?.usd?.toLocaleString() || ''}${skuText}${materialText}${stoneText}\n*Ver producto:* ${productUrl}\n\n¿Podrían darme más información?`;

  if (typeof window !== 'undefined') {
    const waUrl = `https://api.whatsapp.com/send/?phone=59891264956&text=${encodeURIComponent(message)}&type=phone_number&app_absent=0`;
    window.open(waUrl, '_blank');
  }
};
