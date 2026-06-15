import { Product, Category } from "@/lib/products";

/**
 * Servicio de datos para el Frontend público.
 * Consume los Route Handlers internos que actúan como proxy seguro para WooCommerce.
 * Solo operaciones de LECTURA — la gestión se hace desde WordPress wp-admin.
 */

export const getProducts = async (filters: { search?: string, category?: string, featured?: boolean, page?: number, per_page?: number } = {}): Promise<Product[]> => {
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
      return []; 
    }
    
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("Error de red en getProducts:", error);
    return [];
  }
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
