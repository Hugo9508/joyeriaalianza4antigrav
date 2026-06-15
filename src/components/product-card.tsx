import type { Product } from "@/lib/products";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { VirtualTryOn } from "@/components/virtual-try-on";
import { Tag } from "lucide-react";
import { WhatsAppProductButton } from "./whatsapp-product-button";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const placeholderImage = product.imageIds && product.imageIds.length > 0
    ? PlaceHolderImages.find(p => p.id === product.imageIds[0])
    : null;

  const displayImageUrl = (product.images && product.images.length > 0)
    ? product.images[0]
    : (placeholderImage?.imageUrl || 'https://placehold.co/600x800?text=No+Img');

  return (
    <div className="group cursor-pointer">
      <div className="relative aspect-[3/4] overflow-hidden bg-secondary mb-6 rounded-lg">
        <Link href={`/products/${product.id}`}>
          <Image
            src={displayImageUrl}
            alt={product.name}
            fill
            className="object-cover transition-transform duration-1000 ease-out group-hover:scale-105"
            unoptimized
          />
        </Link>
        <div className="absolute top-4 right-4 flex flex-col gap-2">
          {product.isBestseller && (
            <Badge variant="secondary" className="text-[10px] uppercase tracking-widest shadow-sm">
              Más Vendido
            </Badge>
          )}
          {product.isOnSale && (
            <Badge className="bg-destructive text-white border-none text-[10px] uppercase tracking-widest shadow-md">
              <Tag className="w-3 h-3 mr-1" />
              Oferta
            </Badge>
          )}
        </div>
        <div className="absolute inset-x-0 bottom-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col gap-2">
          <WhatsAppProductButton
            product={product}
            variant="secondary"
            className="w-full backdrop-blur-sm bg-white/80 hover:bg-white text-foreground"
          >
            Consultar
          </WhatsAppProductButton>
        </div>
      </div>
      <div className="text-center">
        <h3 className="font-headline text-xl text-foreground mb-1">
          <Link href={`/products/${product.id}`}>{product.name}</Link>
        </h3>
        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
          {product.material} • {product.stone}
        </p>
        <div className="flex flex-col items-center justify-center">
          {product.isOnSale && (
            <span className="text-xs text-muted-foreground line-through opacity-60">
              USD {product.regularPrice.toLocaleString()}
            </span>
          )}
          <p className="text-primary font-bold">
            USD {product.price.usd.toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
}
