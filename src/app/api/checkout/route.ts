import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { fetchWooCommerce } from '@/lib/woocommerce';
import { mapWooCommerceProduct } from '@/lib/mappers';
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

    // Antes tomaba sale_price sin mirar si la oferta seguía vigente (fechas
    // de WooCommerce). La vidriera del sitio sí valida eso con
    // isSaleActive() — el checkout no, así que una oferta vencida o
    // programada a futuro cobraba de menos. Ahora usa el mismo mapper que
    // usa la ficha de producto, para que haya un solo lugar donde se decide
    // el precio.
    const price = mapWooCommerceProduct(product).price.usd;
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

    // Antes este fetch no tenía timeout — a diferencia de /api/virtual-tryon,
    // que sí lo tiene (AbortSignal.timeout(90000)). Si el webhook de n8n se
    // cuelga o la conexión se estanca, esta request quedaba esperando sin
    // límite, en el mismo proceso Node que RUNBOOK.md ya documenta que se
    // cae por memoria en el hosting actual — un checkout colgado es exactamente
    // el tipo de cosa que termina de tumbarlo.
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Token': webhookToken,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(20000),
    });

    if (!response.ok) {
      // Antes: errorData.errorMsg se devolvía tal cual al navegador — un
      // mensaje de error que arma n8n, sin control de qué texto interno
      // puede llegar a incluir. Se loguea server-side y al cliente va un
      // mensaje genérico, mismo criterio que ya se aplicaba en
      // /api/virtual-tryon y en el catch de abajo.
      const errorData = await response.json().catch(() => ({}));
      console.error('[CHECKOUT_WEBHOOK_ERROR]', response.status, errorData?.errorMsg || '(sin detalle)');
      return NextResponse.json({ error: 'No se pudo procesar la compra en este momento.' }, { status: 502 });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    if (error.name === 'TimeoutError') {
      console.error('[CHECKOUT_ERROR] Timeout esperando al webhook de n8n');
      return NextResponse.json({ error: 'El pago está tardando más de lo esperado. Intentá de nuevo en un momento.' }, { status: 504 });
    }
    console.error('[CHECKOUT_ERROR]', error.message);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
