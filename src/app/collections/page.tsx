'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { getProducts, getCategories } from '@/services/productService';
import { Product, Category } from '@/lib/products';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { LayoutGrid, Eye, Package, Tag, Loader2, SlidersHorizontal } from 'lucide-react';
import { VirtualTryOn } from '@/components/virtual-try-on';
import { WhatsAppProductButton } from '@/components/whatsapp-product-button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetTrigger, SheetClose } from '@/components/ui/sheet';

function FilterContent({ categories, onSelect }: { categories: Category[]; onSelect?: () => void }) {
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
              <Link className="block text-sm text-muted-foreground hover:text-primary transition-colors py-1" href={`/collections?category=${cat.value}`} onClick={onSelect}>
                {cat.name}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function CollectionsContent() {
  const searchParams = useSearchParams();
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterOpen, setFilterOpen] = useState(false);

  const categoryFilter = searchParams.get('category');

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [prodData, catData] = await Promise.all([
          getProducts({ category: categoryFilter || undefined }),
          getCategories()
        ]);
        setAllProducts(prodData);
        setAllCategories(catData);
      } catch (error) {
        console.error("Error cargando datos de colecciones:", error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [categoryFilter]);

  // Aplicamos un segundo filtro de seguridad en el cliente por si la API 
  // devolvió más resultados de los esperados o para refinamiento instantáneo.
  const filteredProducts = useMemo(() => {
    if (!categoryFilter) return allProducts;
    return allProducts.filter(p =>
      p.categories && p.categories.includes(categoryFilter)
    );
  }, [allProducts, categoryFilter]);

  return (
    <div className="bg-background text-foreground min-h-screen pt-20">
      <div className="max-w-[1440px] mx-auto flex flex-col lg:flex-row">
        <aside className="hidden lg:block w-72 flex-shrink-0 border-r p-6">
          <div className="sticky top-24">
            <FilterContent categories={allCategories} />
          </div>
        </aside>

        <section className="flex-1 p-4 md:p-6 lg:p-10">
          <div className="mb-8 md:mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-2">
              <h2 className="text-3xl md:text-4xl font-light text-foreground tracking-tight">
                {categoryFilter ? (
                  <>Colección <span className="font-serif italic text-primary">{allCategories.find(c => c.value === categoryFilter)?.name || categoryFilter}</span></>
                ) : (
                  <>Colección <span className="font-serif italic text-primary">JA</span></>
                )}
              </h2>
            </div>
          </div>

          {/* Mobile Filter */}
          <div className="lg:hidden mb-6">
            <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 text-xs uppercase tracking-widest border-primary/30 hover:border-primary hover:text-primary">
                  <SlidersHorizontal className="h-4 w-4" />
                  Filtros
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[300px] bg-background">
                <div className="pt-8">
                  <FilterContent categories={allCategories} onSelect={() => setFilterOpen(false)} />
                </div>
              </SheetContent>
            </Sheet>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-8">
            {!loading ? (
              filteredProducts.length > 0 ? (
                filteredProducts.map((product) => (
                  <div key={product.id} className="group flex flex-col gap-4 animate-in fade-in duration-500">
                    <div className="relative aspect-[4/5] w-full overflow-hidden bg-secondary rounded-lg">
                      <Link href={`/products/${product.id}`}>
                        <Image
                          src={product.images?.[0] || 'https://placehold.co/600x800?text=No+Img'}
                          alt={product.name}
                          fill
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
                  <p>No se encontraron piezas en esta categoría.</p>
                  <Button variant="link" asChild className="mt-4">
                    <Link href="/collections">Ver toda la colección</Link>
                  </Button>
                </div>
              )
            ) : (
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="aspect-[4/5] bg-muted animate-pulse rounded-lg flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin opacity-20" />
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

export default function CollectionsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>}>
      <CollectionsContent />
    </Suspense>
  );
}
