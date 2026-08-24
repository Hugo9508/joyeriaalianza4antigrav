"use client";

import { cn } from "@/lib/utils";
import { Gem, Menu, Search, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const navLinks = [
  { href: "/", label: "Inicio" },
  { href: "/collections", label: "Colecciones" },
  { href: "/contact", label: "Contacto" },
];

export function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const pathname = usePathname();
  const router = useRouter();

  const isHome = pathname === '/';

  useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus();
  }, [searchOpen]);

  // F6 (doc 16, backlog: "Búsqueda y favoritos... la búsqueda ya está
  // soportada por la API") — /api/products?search= siempre existió, nada en
  // la UI lo disparaba. /collections ahora es Server Component y ya sabe
  // leer ?search= (ver collections/page.tsx), así que el header solo
  // necesita mandar para allá.
  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchValue.trim();
    router.push(q ? `/collections?search=${encodeURIComponent(q)}` : '/collections');
    setSearchOpen(false);
    setSearchValue("");
  };

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Antes: shadow-sm (tell de template genérico). Un filete fino es lo que
  // usa una casa de joyería para separar el header del contenido, no una
  // sombra difusa.
  const headerClasses = cn(
    "fixed top-0 w-full z-50 transition-all duration-300 group",
    isHome && !isScrolled
      ? "text-white bg-transparent"
      : "text-foreground bg-background/90 backdrop-blur-sm border-b border-border/60"
  );
  
  const logoClasses = cn(
    "font-headline tracking-[0.2em] uppercase font-light transition-all duration-300 text-center",
    isHome && !isScrolled ? "text-xl md:text-3xl" : "text-base md:text-xl"
  );

  return (
    <header className={headerClasses}>
      {/* Antes: group-hover:hidden hacía desaparecer el degradé al pasar el
          mouse por CUALQUIER parte del header, así que el fondo saltaba
          visiblemente sin que el usuario tocara nada relacionado con esto. */}
      {isHome && !isScrolled && (
         <div className="absolute inset-0 bg-gradient-to-b from-black/50 to-transparent pointer-events-none transition-opacity duration-300"></div>
      )}
      <div className="max-w-screen-xl mx-auto px-4 md:px-6 lg:px-8 relative z-10">
        <div className={cn("flex items-center justify-between", isHome && !isScrolled ? "h-20 md:h-24" : "h-16 md:h-20")}>
          <nav className="hidden lg:flex items-center gap-10 flex-1">
            <Link href="/collections" className="text-xs font-semibold tracking-[0.15em] uppercase hover:text-primary transition-colors">
                Colecciones
            </Link>
          </nav>
          
          <div className="lg:hidden flex-1">
            <Sheet>
                <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className="-ml-2 hover:text-primary">
                        <Menu className="h-5 w-5" />
                        <span className="sr-only">Abrir menú</span>
                    </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[300px] bg-background">
                    <div className="flex flex-col h-full pt-4">
                        <Link href="/" className="flex items-center gap-2 mb-10">
                            <Gem className="text-primary h-6 w-6" />
                            <span className="font-headline text-2xl tracking-widest uppercase">Joyeria Alianzas</span>
                        </Link>
                        <form action="/collections" method="GET" className="relative mb-8">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <input
                                type="search"
                                name="search"
                                placeholder="Buscar piezas..."
                                className="w-full h-10 pl-9 pr-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                            />
                        </form>
                        <nav className="flex flex-col gap-8">
                            {navLinks.map(link => (
                                <SheetClose asChild key={link.href}>
                                    <Link href={link.href} className="text-sm font-bold tracking-[0.2em] uppercase hover:text-primary transition-colors border-b border-muted pb-4">
                                        {link.label}
                                    </Link>
                                </SheetClose>
                            ))}
                        </nav>
                        <div className="mt-auto pb-10">
                            <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-4">Montevideo, Uruguay</p>
                        </div>
                    </div>
                </SheetContent>
            </Sheet>
          </div>

          <div className="flex-shrink-0 flex items-center justify-center absolute left-1/2 transform -translate-x-1/2">
            <Link href="/" className="flex flex-col items-center group/logo transition-all duration-300">
                <span className={logoClasses}>
                    Joyeria Alianzas
                </span>
            </Link>
          </div>

          {/* Antes había botones de Buscar/Favoritos acá: sin onClick ni
              href, UI muerta que prometía una función que no existe. No hay
              wishlist en el sitio, pero la búsqueda sí — ver submitSearch. */}
          <div className="flex items-center justify-end flex-1 gap-4">
            {searchOpen ? (
              <form onSubmit={submitSearch} className="hidden lg:flex items-center">
                <input
                  ref={searchInputRef}
                  type="search"
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  onBlur={() => { if (!searchValue) setSearchOpen(false); }}
                  onKeyDown={(e) => { if (e.key === 'Escape') { setSearchOpen(false); setSearchValue(""); } }}
                  placeholder="Buscar piezas..."
                  className={cn(
                    "w-48 h-9 px-3 text-sm rounded-md border bg-transparent focus:outline-none focus:ring-1 focus:ring-primary/40 transition-colors",
                    isHome && !isScrolled ? "border-white/40 placeholder:text-white/50 text-white" : "border-input placeholder:text-muted-foreground"
                  )}
                />
                <Button type="button" variant="ghost" size="icon" className="h-9 w-9 hover:text-primary" onClick={() => { setSearchOpen(false); setSearchValue(""); }}>
                  <X className="h-4 w-4" />
                  <span className="sr-only">Cerrar búsqueda</span>
                </Button>
              </form>
            ) : (
              <Button variant="ghost" size="icon" className="hidden lg:inline-flex hover:text-primary" onClick={() => setSearchOpen(true)}>
                <Search className="h-5 w-5" />
                <span className="sr-only">Buscar</span>
              </Button>
            )}
            <nav className="hidden lg:flex items-center gap-10">
                <Link href="/contact" className="text-xs font-semibold tracking-[0.15em] uppercase hover:text-primary transition-colors">
                    Contacto
                </Link>
            </nav>
          </div>
        </div>
      </div>
    </header>
  );
}
