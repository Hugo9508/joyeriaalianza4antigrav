import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { fetchWooCommerce } from '@/lib/woocommerce';
import { serverSettings } from '@/lib/settings.server';

const checkoutRequestSchema = z.object({
  productId: z.union([z.string(), z.number()]),
  quantity: z.coerce.number().int().min(1).max(20).default(1),
  buyer: z.object({
    firstName: z.string().trim().min(1).max(120),
    lastName: z.string().trim().max(120).optional().default(''),
    email: z.string().trim().email().max(200),
    phone: z.string().trim().max(40).optional(),
    barrio: z.string().trim().max(120).optional(),
  }),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = checkoutRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Datos inválidos' },
        { status: 400 }
      );
    }

    const { productId, quantity, buyer } = parsed.data;

    // Resolvé el precio del lado del servidor llamando a WooCommerce — nunca confiar
    // en un precio que venga del navegador.
    const product = await fetchWooCommerce(`products/${productId}`);
    if (!product) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
    }

    const price = parseFloat(product.sale_price || product.regular_price || product.price || '0');
    const webhookToken = serverSettings.N8N_WEBHOOK_TOKEN;
    const webhookUrl = serverSettings.N8N_CHECKOUT_WEBHOOK_URL;

    if (!webhookToken || !webhookUrl) {
      console.error('N8N_WEBHOOK_TOKEN o N8N_CHECKOUT_WEBHOOK_URL no están definidos');
      return NextResponse.json({ error: 'Error de configuración del servidor' }, { status: 500 });
    }

    const payload = {
      first_name: buyer.firstName,
      last_name: buyer.lastName || '',
      email: buyer.email,
      phone: buyer.phone,
      barrio: buyer.barrio,
      amount: price * quantity,
      event: 'product_purchase',
      items: [
        {
          id: product.id,
          title: product.name,
          quantity,
          unit_price: price,
        },
      ],
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Token': webhookToken,
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
