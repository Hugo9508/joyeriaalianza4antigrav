'use client';

import { useState } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

const PLACEHOLDER = 'https://placehold.co/600x800?text=Joyeria';

/**
 * @fileOverview Galería de imágenes de producto (doc 11/16, ítem de interfaz
 * pendiente). Antes `products/[id]/page.tsx` mostraba una sola imagen
 * estática — en una boutique de alta joyería, no poder ver la pieza desde
 * más de un ángulo pesa en la decisión de compra. Miniaturas + zoom con el
 * mouse, todo del lado del cliente porque depende de interacción.
 */
export function ProductGallery({ images, alt }: { images: string[]; alt: string }) {
  const gallery = images.length > 0 ? images : [PLACEHOLDER];
  const [activeIndex, setActiveIndex] = useState(0);
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 });
  const [isZooming, setIsZooming] = useState(false);

  const active = gallery[activeIndex] || PLACEHOLDER;

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setZoomPos({ x: Math.min(100, Math.max(0, x)), y: Math.min(100, Math.max(0, y)) });
  };

  return (
    <div>
      {/* F6 (doc 11, "Cuatro ratios distintos para el mismo producto") — era
          aspect-[4/3] apaisado: una pieza fotografiada en vertical (la
          mayoría de anillos/alianzas) se recortaba por arriba y abajo con
          object-cover. 4/5 es el mismo ratio que ya usa /collections para
          las mismas fotos de producto. */}
      <div
        className="relative w-full aspect-[4/5] overflow-hidden rounded-lg bg-secondary cursor-zoom-in"
        onMouseEnter={() => setIsZooming(true)}
        onMouseLeave={() => setIsZooming(false)}
        onMouseMove={handleMouseMove}
      >
        <Image
          src={active}
          alt={alt}
          fill
          className={cn(
            'object-cover transition-transform duration-200 ease-out',
            isZooming ? 'scale-[2]' : 'scale-100'
          )}
          style={isZooming ? { transformOrigin: `${zoomPos.x}% ${zoomPos.y}%` } : undefined}
          priority
          unoptimized
        />
      </div>

      {gallery.length > 1 && (
        <div className="mt-4 flex gap-3 overflow-x-auto pb-1">
          {gallery.map((src, i) => (
            <button
              key={src + i}
              type="button"
              onClick={() => setActiveIndex(i)}
              aria-label={`Ver imagen ${i + 1} de ${alt}`}
              aria-current={i === activeIndex}
              className={cn(
                'relative w-16 h-16 md:w-20 md:h-20 flex-shrink-0 overflow-hidden rounded-md bg-secondary transition-all',
                i === activeIndex
                  ? 'ring-2 ring-primary ring-offset-2 ring-offset-background'
                  : 'opacity-60 hover:opacity-100'
              )}
            >
              <Image src={src} alt="" fill className="object-cover" unoptimized />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
