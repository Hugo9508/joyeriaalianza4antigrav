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
    uyu: number;
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
