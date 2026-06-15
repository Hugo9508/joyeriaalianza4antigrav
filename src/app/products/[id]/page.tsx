import { fetchWooCommerce } from '@/lib/woocommerce';
import { mapWooCommerceProduct } from '@/lib/mappers';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { ChevronRight, Truck, ShieldCheck, Tag } from 'lucide-react';
import { WhatsAppProductButton } from '@/components/whatsapp-product-button';
import { BuyButton } from '@/components/buy-button';

async function getProduct(id: string) {
  try {
    const data = await fetchWooCommerce(`products/${id}`);
    return mapWooCommerceProduct(data);
  } catch (e) {
    console.error(`Error cargando producto ${id}:`, e);
    return null;
  }
}

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await getProduct(id);

  if (!product) {
    notFound();
  }

  const isBackorder = product.stockStatus === 'on_backorder';
  const statusLabel = isBackorder ? 'Bajo Pedido' : 'En Stock';
  const statusColor = isBackorder
    ? 'text-orange-600 bg-orange-100 border-orange-200'
    : 'text-green-600 bg-green-100 border-green-200';

  return (
    <div className="flex-grow flex justify-center py-6 lg:py-16 px-4 md:px-8 pt-24 md:pt-32">
      <div className="w-full max-w-[1280px] grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16">
        <div className="lg:col-span-7">
          <div className="relative w-full aspect-[4/3] overflow-hidden rounded-lg bg-secondary">
            <Image
              src={product.images[0] || 'https://placehold.co/600x800?text=Joyeria'}
              alt={product.name}
              fill
              className="object-cover"
              priority
              unoptimized
            />
          </div>
        </div>
        <div className="lg:col-span-5 flex flex-col pt-4">
          <div className="flex items-center gap-2 text-[10px] font-medium text-muted-foreground mb-6 uppercase tracking-wider">
            <Link href="/collections" className="hover:text-primary">Colecciones</Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-foreground">{product.category}</span>
          </div>

          <h1 className="font-headline text-3xl md:text-5xl text-foreground font-medium mb-4">{product.name}</h1>

          <div className="flex items-center flex-wrap gap-4 mb-8">
            <div className="flex flex-col">
              {product.isOnSale && (
                <span className="text-sm text-muted-foreground line-through decoration-destructive/40">
                  USD {product.regularPrice.toLocaleString()}
                </span>
              )}
              <span className="font-headline text-3xl text-primary">USD {product.price.usd.toLocaleString()}</span>
            </div>

            <div className="flex gap-2">
              <Badge variant="outline" className={`${statusColor} uppercase tracking-widest font-bold`}>
                {statusLabel}
              </Badge>
              {product.isOnSale && (
                <Badge className="bg-destructive text-destructive-foreground uppercase tracking-widest font-bold border-none shadow-sm animate-pulse">
                  <Tag className="w-3 h-3 mr-1" />
                  Oferta
                </Badge>
              )}
            </div>
          </div>

          <div className="mb-10 prose prose-sm max-w-none text-muted-foreground">
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Descripción</h3>
            <div
              className="description-content space-y-4"
              dangerouslySetInnerHTML={{ __html: product.description }}
            />
          </div>

          {product.material && (
            <div className="mb-8 p-4 bg-muted/30 rounded-lg">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-primary mb-2">Detalles Técnicos</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">Material</p>
                  <p className="text-xs font-medium">{product.material}</p>
                </div>
                {product.stone && (
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase">Gema</p>
                    <p className="text-xs font-medium">{product.stone}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-4 mt-auto">
            <BuyButton product={product} />
            <WhatsAppProductButton product={product} size="lg" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-14 shadow-lg shadow-primary/20">
              <span className="text-sm font-bold uppercase tracking-widest">Consultar</span>
            </WhatsAppProductButton>
          </div>

          <div className="mt-12">
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-6">Garantía Alianzas</h3>
            <div className="grid grid-cols-2 gap-6">
              <div className="flex items-center gap-3">
                <ShieldCheck className="text-primary h-6 w-6" />
                <span className="text-xs font-medium text-muted-foreground">Autenticidad<br />Certificada</span>
              </div>
              <div className="flex items-center gap-3">
                <Truck className="text-primary h-6 w-6" />
                <span className="text-xs font-medium text-muted-foreground">Envío Asegurado<br />Nacional</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
