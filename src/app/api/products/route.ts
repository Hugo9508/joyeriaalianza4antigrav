
import { NextRequest, NextResponse } from 'next/server';
import { fetchWooCommerce, getCategoryIdBySlug } from '@/lib/woocommerce';
import { mapWooCommerceProduct } from '@/lib/mappers';
import { z } from 'zod';

export const runtime = 'nodejs';

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(100).default(20),
  category: z.string().nullable().optional(),
  search: z.string().nullable().optional(),
  featured: z.string().nullable().optional(),
});

/**
 * Manejador principal para el listado de productos.
 * Actúa como un proxy seguro entre el frontend y WooCommerce.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  
  const parseResult = querySchema.safeParse({
    page: searchParams.get('page'),
    per_page: searchParams.get('per_page'),
    category: searchParams.get('category'),
    search: searchParams.get('search'),
    featured: searchParams.get('featured'),
  });

  if (!parseResult.success) {
    return NextResponse.json({ error: 'Parámetros inválidos', details: parseResult.error.format() }, { status: 400 });
  }

  const { page, per_page, category: categorySlug, search, featured } = parseResult.data;

  try {
    const params: any = { 
      page, 
      per_page, 
      status: 'publish',
      // Solicitamos solo los campos necesarios para aligerar la carga del servidor
      _fields: 'id,name,slug,sku,price,regular_price,sale_price,on_sale,stock_status,stock_quantity,categories,images,attributes,description,short_description,featured'
    };
    
    if (search) params.search = search;
    if (featured === 'true') params.featured = true;
    if (featured === 'false') params.featured = false;
    
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
