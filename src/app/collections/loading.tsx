import { Loader2 } from 'lucide-react';

// /collections pasó a Server Component (F6 / 🔵-24): este loading.tsx es lo
// que Next.js muestra mientras esa página hace el fetch a WooCommerce, el
// reemplazo del skeleton que antes dibujaba el propio componente cliente
// mientras esperaba su useEffect.
export default function CollectionsLoading() {
  return (
    <div className="bg-background text-foreground min-h-screen pt-20">
      <div className="max-w-[1280px] mx-auto flex flex-col lg:flex-row">
        <aside className="hidden lg:block w-72 flex-shrink-0 border-r p-6" />
        <section className="flex-1 p-4 md:p-6 lg:p-10">
          <div className="mb-8 md:mb-10 flex items-center justify-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-8">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="aspect-[4/5] bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
