export type StockStatus = 'in_stock' | 'out_of_stock' | 'on_backorder';

export type Category = {
  name: string;
  value: string;
  id?: number;
};

export interface Product {
  id: string;
  name: string;
  brand: string;
  description: string;
  shortDescription?: string;
  price: {
    usd: number;
    // Antes devolvía el mismo número que `usd` (doc 16, backlog) — una
    // mentira silenciosa: nada lo usa hoy, pero el primer lugar que lo
    // renderizara iba a mostrar un anillo de USD 900 como "$U 900". No hay
    // una fuente de tipo de cambio integrada en este repo, así que en vez
    // de inventar una conversión, queda en null — TypeScript obliga a
    // cualquier consumidor futuro a manejar el caso "no hay conversión
    // real" en vez de confiar en un número fabricado.
    uyu: number | null;
  };
  regularPrice: number;
  promoPrice?: number;
  isOnSale: boolean;
  stockStatus: StockStatus;
  stockQuantity: number;
  category: string;
  categories: string[];
  material: string;
  stone: string;
  details: {
    metal: string;
    stoneWeight: string;
    clarity: string;
    size: string;
  };
  imageIds: string[];
  images: string[];
  slug: string;
  sku?: string;
  isBestseller?: boolean;
}
