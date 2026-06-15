import { Product, StockStatus } from './products';
import { WOO_BASE_URL } from './woocommerce';

/**
 * Normaliza las URLs de las imágenes para asegurar que siempre tengan el dominio del backend.
 */
function normalizeImageUrl(url: string): string {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  
  const baseUrl = WOO_BASE_URL;
  const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  
  return url.startsWith('/') ? `${cleanBaseUrl}${url}` : `${cleanBaseUrl}/${url}`;
}

/**
 * Procesa la descripción de WooCommerce para convertir shortcodes de video en HTML nativo.
 */
function processDescription(html: any): string {
  if (typeof html !== 'string') return '';

  let processed = html.replace(/\[video[^\]]*\]/g, (match) => {
    const srcMatch = match.match(/(?:src|mp4)=["']([^"']+)["']/);
    const posterMatch = match.match(/poster=["']([^"']+)["']/);
    
    if (srcMatch) {
      const src = srcMatch[1];
      const poster = posterMatch ? `poster="${posterMatch[1]}"` : '';
      return `
        <div class="my-6 aspect-video w-full overflow-hidden rounded-lg bg-black">
          <video controls ${poster} preload="metadata" playsinline class="h-full w-full object-contain">
            <source src="${src}" type="video/mp4">
            Tu navegador no soporta el tag de video.
          </video>
        </div>
      `;
    }
    return '';
  });

  processed = processed.replace(/<video/g, '<video controls preload="metadata" playsinline class="my-6 aspect-video w-full rounded-lg bg-black"');

  return processed;
}

/**
 * Determina si una oferta de WooCommerce está activa basándose en fechas.
 */
function isSaleActive(wooProduct: any): boolean {
  if (!wooProduct.on_sale) return false;
  if (!wooProduct.sale_price) return false;

  const now = new Date();
  
  if (wooProduct.date_on_sale_from_gmt) {
    const from = new Date(wooProduct.date_on_sale_from_gmt + 'Z');
    if (now < from) return false;
  }
  
  if (wooProduct.date_on_sale_to_gmt) {
    const to = new Date(wooProduct.date_on_sale_to_gmt + 'Z');
    if (now > to) return false;
  }

  return true;
}

export function mapWooCommerceProduct(wooProduct: any): Product {
  if (!wooProduct) throw new Error("Producto inválido");

  const regularPrice = parseFloat(wooProduct.regular_price || wooProduct.price || "0");
  const promoPrice = wooProduct.sale_price ? parseFloat(wooProduct.sale_price) : undefined;
  const activeSale = isSaleActive(wooProduct);
  const priceVal = activeSale && promoPrice ? promoPrice : regularPrice;
  
  let stockStatus: StockStatus = 'in_stock';
  if (wooProduct.stock_status === 'outofstock') stockStatus = 'out_of_stock';
  if (wooProduct.stock_status === 'onbackorder') stockStatus = 'on_backorder';

  const getAttr = (name: string) => {
    if (!wooProduct.attributes || !Array.isArray(wooProduct.attributes)) return '';
    return wooProduct.attributes.find((a: any) => 
      a.name.toLowerCase() === name.toLowerCase() || 
      a.slug === `pa_${name.toLowerCase()}`
    )?.options?.[0] || '';
  };

  return {
    id: wooProduct.id.toString(),
    name: wooProduct.name || 'Sin nombre',
    brand: 'Joyeria Alianzas',
    description: processDescription(wooProduct.description || ''),
    shortDescription: processDescription(wooProduct.short_description || ''),
    price: {
      usd: priceVal,
      uyu: priceVal
    },
    regularPrice: regularPrice,
    promoPrice: promoPrice,
    isOnSale: activeSale,
    stockStatus: stockStatus,
    stockQuantity: wooProduct.stock_quantity || 0,
    category: wooProduct.categories?.[0]?.name || 'General',
    categories: wooProduct.categories?.map((c: any) => c.slug) || [],
    material: getAttr('Material'),
    stone: getAttr('Piedra'),
    details: {
      metal: getAttr('Material'),
      stoneWeight: getAttr('peso-piedra') || 'N/A',
      clarity: getAttr('claridad') || 'N/A',
      size: getAttr('talla') || 'A medida'
    },
    imageIds: [],
    images: wooProduct.images?.map((img: any) => normalizeImageUrl(img.src)) || [],
    slug: wooProduct.slug || '',
    sku: wooProduct.sku || '',
    isBestseller: !!wooProduct.featured
  };
}