import { MapPin, MessageCircle, Clock, Phone, Instagram } from "lucide-react";
import { appSettings } from "@/lib/settings";

const EMBED_SEARCH_URL = "https://www.google.com/maps/embed?pb=!1m14!1m8!1m3!1d13866.782026716934!2d-56.192284303020145!3d-34.90331539126892!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x959f8032e5c2380b%3A0xfcb4455742e9cd83!2sMercedes%201211%2C%2011100%20Montevideo%2C%20Departamento%20de%20Montevideo!5e0!3m2!1ses!2suy!4v1771789533418!5m2!1ses!2suy";

export default function ContactPage() {
  // Antes: "59891264956" hardcodeado acá 3 veces, un número distinto al
  // que usan footer/chat-widget/whatsapp-button (appSettings.whatsAppNumber
  // desde F1). No resuelve cuál de los dos es el correcto — eso lo tenés
  // que confirmar vos — pero ahora todo el sitio cambia con una sola
  // variable en vez de tener que buscar cada wa.me suelto.
  const waNumber = appSettings.whatsAppNumber;
  const waHref = `https://wa.me/${waNumber}?text=${encodeURIComponent('Hola! Vengo del sitio web. Me gustaría obtener más detalles.')}`;
  const waDisplay = `+${waNumber.slice(0, 3)} ${waNumber.slice(3, 5)} ${waNumber.slice(5, 8)} ${waNumber.slice(8)}`;

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        {/* Decorative background */}
        <div className="absolute inset-0 bg-gradient-to-b from-foreground/5 to-transparent pointer-events-none" />
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />
        
        <div className="relative max-w-screen-lg mx-auto px-6 text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-primary font-bold mb-4">
            Joyería Alianzas
          </p>
          <h1 className="font-headline text-5xl md:text-6xl lg:text-7xl tracking-tight mb-6">
            Contáctenos
          </h1>
          <p className="text-muted-foreground text-lg font-light max-w-lg mx-auto leading-relaxed">
            Estamos aquí para asesorarte. Visitá nuestra boutique o escribinos por WhatsApp.
          </p>
        </div>
      </section>

      {/* Contact Cards */}
      <section className="max-w-screen-lg mx-auto px-6 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Antes: primary/verde-500/rosa-500 — tres acentos que no
              coincidían entre sí ni con el resto del sitio, y el "Ver
              más →" con opacity-0 sólo aparecía con :hover, así que en
              mobile (sin hover) esos links quedaban permanentemente
              invisibles. Ahora dos acentos de marca (dorado y tinta con
              sage para WhatsApp, igual que footer/whatsapp-button) y el
              link siempre visible. */}
          {/* Ubicación */}
          <a
            href="https://www.google.com/maps/search/?api=1&query=Mercedes+1211%2C+Montevideo%2C+11100%2C+Uruguay"
            target="_blank"
            rel="noopener noreferrer"
            className="group relative flex flex-col items-center text-center p-8 rounded-2xl border border-border/50 bg-card hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-500"
          >
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-5 group-hover:bg-primary/20 group-hover:scale-110 transition-all duration-500">
              <MapPin className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-headline text-lg mb-2">Nuestra Boutique</h3>
            <p className="text-sm text-muted-foreground font-light leading-relaxed">
              Mercedes 1211<br />
              Montevideo, Uruguay
            </p>
            <span className="mt-4 text-[10px] uppercase tracking-widest text-primary font-bold">
              Ver en mapa →
            </span>
          </a>

          {/* WhatsApp */}
          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative flex flex-col items-center text-center p-8 rounded-2xl border border-border/50 bg-card hover:border-sage/30 hover:shadow-lg hover:shadow-sage/5 transition-all duration-500"
          >
            <div className="w-14 h-14 rounded-full bg-sage/10 flex items-center justify-center mb-5 group-hover:bg-sage/20 group-hover:scale-110 transition-all duration-500">
              <MessageCircle className="w-6 h-6 text-sage" />
            </div>
            <h3 className="font-headline text-lg mb-2">WhatsApp</h3>
            <p className="text-sm text-muted-foreground font-light leading-relaxed">
              {waDisplay}<br />
              Respuesta rápida
            </p>
            <span className="mt-4 text-[10px] uppercase tracking-widest text-sage font-bold">
              Escribinos →
            </span>
          </a>

          {/* Instagram */}
          <a
            href="https://www.instagram.com/joyeriaalianzasuy/"
            target="_blank"
            rel="noopener noreferrer"
            className="group relative flex flex-col items-center text-center p-8 rounded-2xl border border-border/50 bg-card hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-500"
          >
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-5 group-hover:bg-primary/20 group-hover:scale-110 transition-all duration-500">
              <Instagram className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-headline text-lg mb-2">Instagram</h3>
            <p className="text-sm text-muted-foreground font-light leading-relaxed">
              @joyeriaalianzasuy<br />
              Seguinos para novedades
            </p>
            <span className="mt-4 text-[10px] uppercase tracking-widest text-primary font-bold">
              Ver perfil →
            </span>
          </a>
        </div>
      </section>

      {/* Mapa + Horario */}
      <section className="max-w-screen-lg mx-auto px-6 pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Mapa Embed */}
          <div className="lg:col-span-2 rounded-2xl overflow-hidden border border-border/50 shadow-sm">
            <iframe
              src={EMBED_SEARCH_URL}
              className="w-full h-[400px] border-0"
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Ubicación Joyería Alianzas"
            />
          </div>

          {/* Info lateral */}
          <div className="flex flex-col justify-center gap-8 p-8 rounded-2xl border border-border/50 bg-card">
            {/* Horario */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-headline text-lg">Horario</h3>
              </div>
              <div className="space-y-2 ml-[52px]">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground font-light">Lunes - Viernes</span>
                  <span className="font-medium">10:00 - 18:00</span>
                </div>
                <div className="w-full h-px bg-border/50" />
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground font-light">Sábado</span>
                  <span className="font-medium">10:00 - 16:00</span>
                </div>
                <div className="w-full h-px bg-border/50" />
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground font-light">Domingo</span>
                  <span className="text-muted-foreground/60 font-light italic">Cerrado</span>
                </div>
              </div>
            </div>

            {/* Teléfono rápido */}
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-sage/10 flex items-center justify-center">
                  <Phone className="w-5 h-5 text-sage" />
                </div>
                <div>
                  <h3 className="font-headline text-lg">Llamanos</h3>
                  <p className="text-xs text-muted-foreground font-light">Atención personalizada</p>
                </div>
              </div>
              <a
                href={`tel:+${waNumber}`}
                className="ml-[52px] inline-block text-sm font-medium text-primary hover:text-primary/80 transition-colors"
              >
                {waDisplay}
              </a>
            </div>

            {/* CTA WhatsApp */}
            <a
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full bg-sage hover:bg-sage/90 text-white text-xs font-bold uppercase tracking-widest h-12 rounded-xl transition-all duration-300 shadow-lg shadow-sage/20 hover:shadow-sage/30"
            >
              <MessageCircle className="w-4 h-4" />
              Escribinos por WhatsApp
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
