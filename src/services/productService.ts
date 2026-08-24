import { Product, Category } from "@/lib/products";

/**
 * Servicio de datos para el Frontend público.
 * Consume los Route Handlers internos que actúan como proxy seguro para WooCommerce.
 * Solo operaciones de LECTURA — la gestión se hace desde WordPress wp-admin.
 */

export type ProductsResult = { products: Product[]; error: string | null };

// Antes esto devolvía [] tanto si la categoría estaba vacía como si
// WooCommerce respondía un 502 — /collections mostraba "No se encontraron
// piezas en esta categoría" con el catálogo caído, y nadie se enteraba de
// que Woo estaba roto. getProducts() sigue existiendo para no romper a
// quien ya la use, pero delega en getProductsWithStatus(), que sí distingue
// "vacío" de "error".
export const getProductsWithStatus = async (filters: { search?: string, category?: string, featured?: boolean, page?: number, per_page?: number } = {}): Promise<ProductsResult> => {
  const params = new URLSearchParams();
  if (filters.search) params.append('search', filters.search);
  if (filters.category) params.append('category', filters.category);
  if (filters.featured !== undefined) params.append('featured', filters.featured.toString());
  if (filters.page) params.append('page', filters.page.toString());
  if (filters.per_page) params.append('per_page', filters.per_page.toString());

  try {
    const response = await fetch(`/api/products?${params.toString()}`, {
      cache: 'no-store'
    });

    if (!response.ok) {
      console.warn("API de productos no disponible.");
      return { products: [], error: 'No se pudo cargar el catálogo. Intentá de nuevo en unos minutos.' };
    }

    const data = await response.json();
    return { products: Array.isArray(data) ? data : [], error: null };
  } catch (error) {
    console.error("Error de red en getProducts:", error);
    return { products: [], error: 'No se pudo cargar el catálogo. Intentá de nuevo en unos minutos.' };
  }
};

export const getProducts = async (filters: { search?: string, category?: string, featured?: boolean, page?: number, per_page?: number } = {}): Promise<Product[]> => {
  const { products } = await getProductsWithStatus(filters);
  return products;
};

export const getProductById = async (id: string): Promise<Product | null> => {
  try {
    const response = await fetch(`/api/products/${id}`, {
      cache: 'no-store'
    });
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error(`Error de red en getProductById (${id}):`, error);
    return null;
  }
};

export const getCategories = async (): Promise<Category[]> => {
  try {
    const response = await fetch('/api/categories', {
      cache: 'no-store'
    });
    if (!response.ok) return [];
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("Error de red en getCategories:", error);
    return [];
  }
};
