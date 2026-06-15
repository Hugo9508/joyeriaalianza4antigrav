import { NextRequest, NextResponse } from 'next/server';
import { fetchWooCommerce } from '@/lib/woocommerce';
import { mapWooCommerceProduct } from '@/lib/mappers';

export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const data = await fetchWooCommerce(`products/${id}`);
    const normalizedProduct = mapWooCommerceProduct(data);

    return NextResponse.json(normalizedProduct, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
        'X-Runtime': 'nodejs'
      }
    });
  } catch (error: any) {
    console.error(`API Product Detail Error (${id}):`, error.message);
    return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
  }
}
