import { NextRequest, NextResponse } from 'next/server';
import { fetchWooCommerce } from '@/lib/woocommerce';

export async function POST(req: NextRequest) {
  try {
    const { productId, buyer } = await req.json();

    if (!productId || !buyer) {
      return NextResponse.json({ error: 'Faltan datos obligatorios' }, { status: 400 });
    }

    // Resolvé el precio del lado del servidor llamando a WooCommerce
    const product = await fetchWooCommerce(`products/${productId}`);
    if (!product) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
    }

    const price = parseFloat(product.sale_price || product.regular_price || product.price || "0");
    const webhookToken = process.env.N8N_WEBHOOK_TOKEN;

    if (!webhookToken) {
      console.error('N8N_WEBHOOK_TOKEN no está definido');
      return NextResponse.json({ error: 'Error de configuración del servidor' }, { status: 500 });
    }

    const payload = {
      first_name: buyer.firstName,
      last_name: buyer.lastName || '',
      email: buyer.email,
      phone: buyer.phone,
      barrio: buyer.barrio,
      amount: price,
      event: 'product_purchase',
      items: [
        {
          id: product.id,
          title: product.name,
          quantity: 1,
          unit_price: price,
        },
      ],
    };

    const response = await fetch(process.env.N8N_CHECKOUT_WEBHOOK_URL || 'https://n8n.axion380.com.br/webhook/ja-checkout', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-Webhook-Token': webhookToken
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json({ error: errorData.errorMsg || 'Error en el webhook de pago' }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('[CHECKOUT_ERROR]', error.message);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
