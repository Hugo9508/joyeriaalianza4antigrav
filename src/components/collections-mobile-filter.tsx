'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { LayoutGrid, SlidersHorizontal } from 'lucide-react';
import type { Category } from '@/lib/products';

// F6 (doc 16 / 🔵-24) — /collections pasó a Server Component para que Google
// y el catálogo tengan HTML real (ver page.tsx). Lo único que necesita
// estado de cliente es abrir/cerrar el Sheet del filtro en mobile, así que
// eso es lo único que se separa en un componente 'use client' aparte.
export function CollectionsMobileFilter({
  categories,
  activeCategory,
  search,
}: {
  categories: Category[];
  activeCategory?: string;
  search?: string;
}) {
  const [open, setOpen] = useState(false);

  const hrefFor = (categoryValue?: string) => {
    const params = new URLSearchParams();
    if (categoryValue) params.set('category', categoryValue);
    if (search) params.set('search', search);
    const qs = params.toString();
    return qs ? `/collections?${qs}` : '/collections';
  };

  return (
    <div className="lg:hidden mb-6">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2 text-xs uppercase tracking-widest border-primary/30 hover:border-primary hover:text-primary">
            <SlidersHorizontal className="h-4 w-4" />
            Filtros
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[300px] bg-background">
          <div className="pt-8 space-y-8">
            <div className="flex items-baseline justify-between">
              <h2 className="text-lg font-medium tracking-wide uppercase">Filtros</h2>
              <Link href="/collections" className="text-xs text-primary hover:underline" onClick={() => setOpen(false)}>
                Limpiar
              </Link>
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
                      onClick={() => setOpen(false)}
                    >
                      {cat.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
