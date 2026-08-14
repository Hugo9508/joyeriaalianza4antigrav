
import { NextRequest, NextResponse } from 'next/server';
import { fetchWooCommerce, getCategoryIdBySlug } from '@/lib/woocommerce';
import { mapWooCommerceProduct } from '@/lib/mappers';

export const runtime = 'nodejs';

/**
 * Manejador principal para el listado de productos.
 * Actúa como un proxy seguro entre el frontend y WooCommerce.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = searchParams.get('page') || '1';
  const per_page = searchParams.get('per_page') || '20';
  const categorySlug = searchParams.get('category');
  const search = searchParams.get('search');
  const featured = searchParams.get('featured');

  try {
    const params: any = { 
      page, 
      per_page, 
      status: 'publish',
      // Solicitamos solo los campos necesarios para aligerar la carga del servidor
      _fields: 'id,name,slug,sku,price,regular_price,sale_price,on_sale,stock_status,stock_quantity,categories,images,attributes,description,short_description,featured'
    };
    
    if (search) params.search = search;
    if (featured) params.featured = featured;
    
    // Resolución de categoría si se provee slug
    if (categorySlug) {
      const categoryId = await getCategoryIdBySlug(categorySlug);
      if (categoryId) {
        params.category = categoryId;
      } else {
        // Si el slug no existe, devolvemos un array vacío para evitar errores 404
        return NextResponse.json([], {
           headers: { 'X-Cache': 'EMPTY-CAT' }
        });
      }
    }

    const data = await fetchWooCommerce('products', params);
    
    if (!Array.isArray(data)) {
        console.error("WooCommerce devolvió un formato inválido:", data);
        return NextResponse.json({ 
          error: "Respuesta de catálogo inválida",
          hint: "Verifique que la URL de la API sea correcta."
        }, { status: 502 });
    }

    const products = data.map(mapWooCommerceProduct);

    return NextResponse.json(products, {
      headers: { 
        'Cache-Control': 'no-store',
        'X-Cache': 'BFF-LIVE'
      }
    });
  } catch (error: any) {
    console.error('API Products Critical Failure:', error.message);
    
    return NextResponse.json({ 
      error: "Error de comunicación con el catálogo.",
      detail: error.message 
    }, { status: 502 });
  }
}
