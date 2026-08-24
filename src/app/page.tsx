'use client';

import { PlaceHolderImages } from '@/lib/placeholder-images';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowDown, ArrowRight } from 'lucide-react';
import { ReviewsCarousel } from '@/components/reviews-carousel';
import { Button } from '@/components/ui/button';
import { appSettings } from '@/lib/settings';

const heroImage = PlaceHolderImages.find(p => p.id === 'hero-1');

// Colecciones destacadas con videos locales
const featuredCollections = [
  {
    id: 1,
    name: 'Colección Luz Eterna',
    price: 'USD 820',
    video: '/videos/luz-eterna.mp4',
    href: '/collections',
  },
  {
    id: 2,
    name: 'Colección Aurora',
    price: 'USD 850',
    video: '/videos/coleccion-aura.mp4',
    href: '/collections',
  },
  {
    id: 3,
    name: 'Colección Alianzas',
    price: 'USD 900',
    video: '/videos/alianzas.mp4',
    href: '/collections',
  },
];

export default function Home() {
  return (
    <div className="flex flex-col overflow-x-hidden">
      {/* Hero Section */}
      <section className="relative h-[90vh] md:h-screen w-full overflow-hidden bg-foreground">
        {heroImage && (
          <Image
            src={heroImage.imageUrl}
            alt={heroImage.description}
            fill
            className="object-cover brightness-75"
            priority
          />
        )}
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative flex h-full flex-col items-center justify-center text-center text-white p-6">
          <h2 className="mb-4 md:mb-8 text-[10px] md:text-xs font-bold uppercase tracking-[0.3em] text-primary animate-fade-in-up">
            Alta Joyería Montevideo
          </h2>
          <h1 className="font-headline text-4xl leading-tight text-white md:text-7xl lg:text-8xl mb-6 md:mb-8 max-w-5xl animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            Unión Eternamente <span className="italic font-light">Brillante</span>
          </h1>
          <p className="mb-8 md:mb-12 max-w-sm md:max-w-lg text-xs md:text-sm font-light leading-relaxed md:leading-loose tracking-wide text-gray-200 md:text-base animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
            En Joyeria Alianzas, cada pieza es una promesa de amor y excelencia. Descubra nuestra colección curada en el corazón de Montevideo.
          </p>
          <div className="flex animate-fade-in-up flex-col gap-4 md:flex-row" style={{ animationDelay: '0.6s' }}>
            <Button asChild size="lg" variant="outline" className="bg-white text-foreground hover:bg-primary hover:text-white border-none uppercase tracking-[0.2em] font-bold text-[10px] md:text-xs">
              <Link href="/collections">Explorar Catálogo</Link>
            </Button>
          </div>
        </div>

        <div className="absolute bottom-6 md:bottom-10 left-1/2 -translate-x-1/2 transform">
          <div className="flex animate-bounce flex-col items-center gap-2">
            <span className="text-[8px] md:text-[10px] uppercase tracking-widest text-white/60">Descubrir</span>
            <ArrowDown className="h-3 w-3 md:h-4 md:w-4 text-white/60" />
          </div>
        </div>
      </section>

      {/* Featured Collections Section — Videos locales */}
      <section className="py-16 md:py-32 bg-background">
        <div className="max-w-screen-xl mx-auto px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 md:mb-16 gap-4 md:gap-6">
            <div className="max-w-xl">
              <span className="block text-primary text-[10px] md:text-xs font-bold tracking-[0.2em] uppercase mb-2">
                Colección Exclusiva
              </span>
              <h2 className="font-headline text-3xl md:text-4xl text-foreground leading-tight">Piezas Destacadas</h2>
            </div>
            <Link href="/collections" className="hidden md:flex items-center gap-2 text-xs font-bold uppercase tracking-[0.15em] border-b border-foreground/20 pb-1 hover:border-primary hover:text-primary transition-all">
              Ver Catálogo Completo <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-12 md:gap-y-16">
            {featuredCollections.map((collection, index) => (
              <div key={collection.id} className={index === 1 ? 'lg:mt-16' : ''}>
                <div className="group">
                  <Link href={collection.href} className="block">
                    <div className="relative aspect-[3/4] w-full overflow-hidden bg-secondary mb-4 rounded-2xl">
                      <video
                        src={collection.video}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        autoPlay
                        muted
                        loop
                        playsInline
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-500" />
                    </div>
                  </Link>
                  <h3 className="text-sm md:text-base font-medium text-foreground tracking-wide">
                    {collection.name}
                  </h3>
                  <p className="price mt-1 text-sm">
                    {collection.price}
                  </p>
                  <div className="mt-3 flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1 border-primary text-primary hover:bg-primary hover:text-white text-[10px] md:text-xs font-bold uppercase tracking-widest h-10"
                      onClick={() => {
                        // Antes buscaba el widget viejo de @n8n/chat (#n8n-chat / window.n8nChat),
                        // que ya no existe: la condición nunca se cumplía y siempre caía a
                        // WhatsApp con un número distinto al oficial. Ahora abre el chat propio.
                        const msg = `¡Hola! Me interesa la ${collection.name}. ¿Podrían darme más información?`;
                        window.dispatchEvent(new CustomEvent('open-chat-with-message', {
                          detail: { message: msg }
                        }));
                      }}
                    >
                      Consultar
                    </Button>
                    <Button asChild className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground text-[10px] md:text-xs font-bold uppercase tracking-widest h-10">
                      <Link href={collection.href}>Comprar</Link>
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Experience Section */}
      <section className="bg-secondary py-16 md:py-32 border-t overflow-hidden">
        <div className="max-w-screen-xl mx-auto px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row items-center gap-16 md:gap-24">
            <div className="w-full lg:w-1/2 relative group/video flex justify-center">
              <div className="absolute -inset-4 bg-primary/5 rounded-[2rem] rotate-6 scale-105 blur-2xl group-hover/video:rotate-0 group-hover/video:scale-100 transition-all duration-1000"></div>

              <div className="relative aspect-[4/5] w-full max-w-[450px] overflow-hidden shadow-2xl rounded-2xl bg-black -rotate-3 hover:rotate-0 transition-transform duration-1000 ease-out border border-white/20">
                <video
                  src="https://goods-vod.kwcdn.com/goods-video/0e228c94bc3d1c6c36af1a3af452246bf4d61994.f30.mp4"
                  className="w-full h-full object-cover scale-110 group-hover/video:scale-100 transition-transform duration-1000"
                  autoPlay
                  muted
                  loop
                  playsInline
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-60"></div>
              </div>
            </div>

            <div className="w-full lg:w-1/2 text-center lg:text-left z-10">
              <span className="block text-primary text-[10px] md:text-xs font-bold tracking-[0.2em] uppercase mb-4">Legado Alianzas</span>
              <h2 className="font-headline text-3xl md:text-5xl lg:text-6xl text-foreground leading-tight mb-8">El arte de la orfebrería</h2>
              <p className="text-base md:text-xl font-light leading-relaxed mb-8 md:mb-12 text-muted-foreground max-w-xl mx-auto lg:mx-0">
                Cada pieza en Joyeria Alianzas es seleccionada por su calidad excepcional y su capacidad para contar una historia de unión. Nuestro compromiso es brindarle no solo una joya, sino un símbolo eterno.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Button asChild size="lg" className="bg-foreground text-background hover:bg-primary uppercase tracking-[0.2em] font-bold text-[10px] h-14 px-10 transition-all duration-300">
                  <Link href="/collections">Ir a Colecciones</Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="border-primary/20 text-foreground hover:bg-primary/5 uppercase tracking-[0.2em] font-bold text-[10px] h-14 px-10">
                  <Link href="/contact">Agendar Cita</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Reviews Section — antes bg-[#080b12] (negro azulado), un segundo
          negro distinto del --foreground (#14120D, negro cálido) del resto
          del sitio. */}
      <section className="bg-foreground py-16 md:py-32">
        <div className="px-6 lg:px-8">
          <ReviewsCarousel />
        </div>
      </section>
    </div>
  );
}
