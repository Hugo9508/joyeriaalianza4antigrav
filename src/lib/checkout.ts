/**
 * @fileOverview Servicio de Checkout con Mercado Pago.
 * Comunica el frontend con el webhook n8n que crea la preferencia de pago.
 * Solo se usa en el cliente — no contiene secretos.
 */

import { appSettings } from './settings';
import type { Product } from './products';

export interface BuyerInfo {
  firstName: string;
  lastName?: string;
  email: string;
  phone?: string;
  barrio?: string;
  document?: string;
}

export interface CheckoutResult {
  redirect_url: string;
  order_id: string;
  preference_id?: string;
  mode?: string;
}

export interface CheckoutError {
  errorMsg: string;
  statusCode?: number;
}

/**
 * Crea una preferencia de pago en Mercado Pago a través del webhook n8n.
 * Retorna la URL de redirección al checkout de MP.
 */
export async function createCheckoutPreference(
  product: Product,
  buyer: BuyerInfo
): Promise<CheckoutResult> {
  const payload = {
    first_name: buyer.firstName.trim(),
    last_name: buyer.lastName?.trim() || '',
    email: buyer.email.trim().toLowerCase(),
    phone: buyer.phone || undefined,
    barrio: buyer.barrio || undefined,
    document: buyer.document?.replace(/[^0-9]/g, '') || undefined,
    amount: product.price.usd,
    event: 'product_purchase',
    items: [
      {
        id: product.id,
        title: product.name,
        description: (product.shortDescription || product.description || '').replace(/<[^>]*>/g, '').substring(0, 256),
        quantity: 1,
        unit_price: product.price.usd,
        category: product.category || 'jewelry',
        image_url: product.images?.[0] || '',
      },
    ],
  };

  let response: Response;

  try {
    response = await fetch(appSettings.checkoutWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (networkErr) {
    throw new Error('Error de conexión. Verificá tu internet e intentá de nuevo.');
  }

  const data = await response.json().catch(() => null);

  if (!response.ok || !data) {
    const errMsg =
      data?.errorMsg ||
      data?.json?.errorMsg ||
      'Error al procesar el pago. Intentá nuevamente.';
    throw new Error(errMsg);
  }

  // El webhook n8n puede responder con la estructura directa o dentro de .json
  const result = data.redirect_url ? data : data.json || data;

  if (!result.redirect_url) {
    throw new Error('No se recibió la URL de pago. Intentá nuevamente o contactanos por WhatsApp.');
  }

  return {
    redirect_url: result.redirect_url,
    order_id: result.order_id || '',
    preference_id: result.preference_id,
    mode: result.mode,
  };
}
