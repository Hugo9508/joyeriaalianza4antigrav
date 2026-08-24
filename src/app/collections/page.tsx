import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { fetchWooCommerce, fetchWooCommerceMeta, getCategoryIdBySlug } from '@/lib/woocommerce';
import { mapWooCommerceProduct } from '@/lib/mappers';
import { Product, Category } from '@/lib/products';
import { Button } from '@/components/ui/button';
import { LayoutGrid, Eye, Package, Tag, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { VirtualTryOn } from '@/components/virtual-try-on';
import { WhatsAppProductButton } from '@/components/whatsapp-product-button';
import { Badge } from '@/components/ui/badge';
import { CollectionsMobileFilter } from '@/components/collections-mobile-filter';
import { appSettings } from '@/lib/settings';

export const revalidate = 0; // el catálogo cambia desde wp-admin; fetchWooCommerce ya cachea 2min server-side

const PER_PAGE = 24;

type SearchParamsShape = { category?: string; search?: string; page?: string };

// F6 (doc 16 / 🔵-24) — "El catálogo es invisible para Google y no tiene
// paginación". Antes /collections era 100% 'use client': el HTML que recibía
// un buscador (o el preview de WhatsApp/Instagram al compartir un link) eran
// seis rectángulos de skeleton, cero texto de producto. generateMetadata acá
// abajo es justamente lo que esa versión no podía tener.
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<SearchParamsShape>;
}): Promise<Metadata> {
  const { category, search } = await searchParams;
  const title = search
    ? `"${search}" — Colecciones | Joyería Alianzas`
    : category
    ? `Colección ${category} | Joyería Alianzas`
    : 'Colecciones | Joyería Alianzas';
  const description = 'Alta joyería en Montevideo, Uruguay — anillos, alianzas, aros y collares. Piezas certificadas, envío asegurado nacional.';
  return {
    title,
    description,
    alternates: { canonical: `${appSettings.siteUrl}/collections${category ? `?category=${category}` : ''}` },
    openGraph: { title, description, url: `${appSettings.siteUrl}/collections`, siteName: 'Joyería Alianzas' },
  };
}

async function getCategories(): Promise<Category[]> {
  try {
    const data = await fetchWooCommerce('products/categories', { per_page: '100', hide_empty: 'true' });
    if (!Array.isArray(data)) return [];
    return data.map((cat: any) => ({ name: cat.name, value: cat.slug, id: cat.id }));
  } catch (e) {
    console.error('Error cargando categorías:', e);
    return [];
  }
}

async function getProducts(params: { categorySlug?: string; search?: string; page: number }) {
  const wooParams: Record<string, string> = {
    page: String(params.page),
    per_page: String(PER_PAGE),
    status: 'publish',
    _fields: 'id,name,slug,sku,price,regular_price,sale_price,on_sale,stock_status,stock_quantity,categories,images,attributes,description,short_description,featured',
  };
  if (params.search) wooParams.search = params.search;

  if (params.categorySlug) {
    const categoryId = await getCategoryIdBySlug(params.categorySlug);
    if (!categoryId) {
      return { products: [] as Product[], total: 0, totalPages: 1, error: null as string | null };
    }
    wooParams.category = categoryId;
  }

  try {
    const { data, total, totalPages } = await fetchWooCommerceMeta('products', wooParams);
    if (!Array.isArray(data)) {
      console.error('WooCommerce devolvió un formato inválido en /collections:', data);
      return { products: [] as Product[], total: 0, totalPages: 1, error: 'No se pudo cargar el catálogo. Intentá de nuevo en unos minutos.' };
    }
    return { products: data.map(mapWooCommerceProduct) as Product[], total, totalPages, error: null as string | null };
  } catch (e: any) {
    console.error('Error cargando productos en /collections:', e.message);
    return { products: [] as Product[], total: 0, totalPages: 1, error: 'No se pudo cargar el catálogo. Intentá de nuevo en unos minutos.' };
  }
}

function FilterSidebar({ categories, activeCategory, search }: { categories: Category[]; activeCategory?: string; search?: string }) {
  const hrefFor = (categoryValue?: string) => {
    const params = new URLSearchParams();
    if (categoryValue) params.set('category', categoryValue);
    if (search) params.set('search', search);
    const qs = params.toString();
    return qs ? `/collections?${qs}` : '/collections';
  };

  return (
    <div className="space-y-8">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-medium tracking-wide uppercase">Filtros</h2>
        <Link href="/collections" className="text-xs text-primary hover:underline">Limpiar</Link>
      </div>
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-primary">
          <LayoutGrid className="h-5 w-5" />
          <h3 className="text-sm font-semibold uppercase tracking-wider">Categorías</h3>
        </div>
        <ul className="space-y-2 pl-2">
          {categories.map((cat) => (
            <li key={cat.value}>
              <Link
                className={`block text-sm py-1 transition-colors ${activeCategory === cat.value ? 'text-primary font-semibold' : 'text-muted-foreground hover:text-primary'}`}
                href={hrefFor(cat.value)}
              >
                {cat.name}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Pagination({ page, totalPages, category, search }: { page: number; totalPages: number; category?: string; search?: string }) {
  if (totalPages <= 1) return null;

  const hrefFor = (p: number) => {
    const params = new URLSearchParams();
    if (category) params.set('category', category);
    if (search) params.set('search', search);
    params.set('page', String(p));
    return `/collections?${params.toString()}`;
  };

  return (
    <nav className="flex items-center justify-center gap-2 mt-12" aria-label="Paginación de colecciones">
      <Link href={hrefFor(Math.max(1, page - 1))} aria-disabled={page <= 1} className={page <= 1 ? 'pointer-events-none opacity-30' : ''}>
        <Button variant="outline" size="icon" className="h-9 w-9" disabled={page <= 1}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </Link>
      <span className="text-xs text-muted-foreground uppercase tracking-widest px-3">
        Página {page} de {totalPages}
      </span>
      <Link href={hrefFor(Math.min(totalPages, page + 1))} aria-disabled={page >= totalPages} className={page >= totalPages ? 'pointer-events-none opacity-30' : ''}>
        <Button variant="outline" size="icon" className="h-9 w-9" disabled={page >= totalPages}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </Link>
    </nav>
  );
}

export default async function CollectionsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParamsShape>;
}) {
  const { category, search, page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const [{ products, total, totalPages, error }, categories] = await Promise.all([
    getProducts({ categorySlug: category, search, page }),
    getCategories(),
  ]);

  const activeCategoryName = category ? categories.find((c) => c.value === category)?.name || category : null;

  return (
    <div className="bg-background text-foreground min-h-screen pt-20">
      <div className="max-w-[1280px] mx-auto flex flex-col lg:flex-row">
        <aside className="hidden lg:block w-72 flex-shrink-0 border-r p-6">
          <div className="sticky top-24 space-y-8">
            <form action="/collections" method="GET" className="relative">
              {category && <input type="hidden" name="category" value={category} />}
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="search"
                name="search"
                defaultValue={search || ''}
                placeholder="Buscar piezas..."
                className="w-full h-10 pl-9 pr-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </form>
            <FilterSidebar categories={categories} activeCategory={category} search={search} />
          </div>
        </aside>

        <section className="flex-1 p-4 md:p-6 lg:p-10">
          <div className="mb-6 md:hidden">
            <form action="/collections" method="GET" className="relative">
              {category && <input type="hidden" name="category" value={category} />}
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="search"
                name="search"
                defaultValue={search || ''}
                placeholder="Buscar piezas..."
                className="w-full h-10 pl-9 pr-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </form>
          </div>

          <div className="mb-8 md:mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-2">
              <h1 className="text-3xl md:text-4xl font-light text-foreground tracking-tight">
                {search ? (
                  <>Resultados para <span className="font-headline italic text-primary">&quot;{search}&quot;</span></>
                ) : activeCategoryName ? (
                  <>Colección <span className="font-headline italic text-primary">{activeCategoryName}</span></>
                ) : (
                  <>Colección <span className="font-headline italic text-primary">JA</span></>
                )}
              </h1>
              {!error && (
                <p className="text-xs text-muted-foreground uppercase tracking-widest">
                  {total} {total === 1 ? 'pieza' : 'piezas'}
                </p>
              )}
            </div>
          </div>

          <CollectionsMobileFilter categories={categories} activeCategory={category} search={search} />

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-8">
            {error ? (
              <div className="col-span-full flex flex-col items-center justify-center py-20 text-muted-foreground">
                <Package className="h-16 w-16 opacity-10 mb-4" />
                <p>{error}</p>
              </div>
            ) : products.length > 0 ? (
              products.map((product) => (
                <div key={product.id} className="group flex flex-col gap-4">
                  <div className="relative aspect-[4/5] w-full overflow-hidden bg-secondary rounded-lg">
                    <Link href={`/products/${product.id}`}>
                      <Image
                        src={product.images?.[0] || 'https://placehold.co/600x800?text=No+Img'}
                        alt={product.name}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
                        className="object-cover transition-transform duration-700 group-hover:scale-105"
                        unoptimized
                      />
                    </Link>
                    {product.isOnSale && (
                      <Badge className="absolute top-4 left-4 bg-destructive text-white border-none text-[10px] uppercase tracking-widest shadow-md">
                        <Tag className="w-3 h-3 mr-1" />
                        Oferta
                      </Badge>
                    )}
                    <div className="absolute top-3 right-3 z-10 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                      <VirtualTryOn product={product}>
                        <Button size="icon" className="h-10 w-10 bg-white/90 rounded-full shadow-lg text-foreground">
                          <Eye className="h-5 w-5" />
                        </Button>
                      </VirtualTryOn>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 px-1">
                    <div className="flex justify-between items-start">
                      <h3 className="text-sm md:text-base font-medium text-foreground">
                        <Link href={`/products/${product.id}`}>{product.name}</Link>
                      </h3>
                      <div className="flex flex-col items-end">
                        {product.isOnSale && (
                          <span className="text-[10px] text-muted-foreground line-through">
                            USD {product.regularPrice.toLocaleString()}
                          </span>
                        )}
                        <span className="text-xs md:text-sm font-semibold text-primary">
                          USD {product.price.usd.toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <WhatsAppProductButton product={product} className="flex-1 bg-transparent border border-primary text-primary hover:bg-primary hover:text-white text-[10px] md:text-xs font-bold uppercase tracking-widest h-10">
                        Consultar
                      </WhatsAppProductButton>
                      <Button asChild className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground text-[10px] md:text-xs font-bold uppercase tracking-widest h-10">
                        <Link href={`/products/${product.id}`}>Comprar</Link>
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full flex flex-col items-center justify-center py-20 text-muted-foreground">
                <Package className="h-16 w-16 opacity-10 mb-4" />
                <p>{search ? `No se encontraron piezas para "${search}".` : 'No se encontraron piezas en esta categoría.'}</p>
                <Button variant="link" asChild className="mt-4">
                  <Link href="/collections">Ver toda la colección</Link>
                </Button>
              </div>
            )}
          </div>

          {!error && <Pagination page={page} totalPages={totalPages} category={category} search={search} />}
        </section>
      </div>
    </div>
  );
}
