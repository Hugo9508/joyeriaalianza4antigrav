'use client';

import { useState } from 'react';
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { MapPin, MessageCircle, Check, Ruler, CalendarDays } from "lucide-react";
import { appSettings } from "@/lib/settings";

// Antes había también GOOGLE_MAPS_EMBED_URL y EMBED_PLACE_URL apuntando a
// Calle Arocena 1592, Carrasco — dos constantes muertas (0 usos) con la
// dirección equivocada. La boutique real está en Mercedes 1211, que es la
// que efectivamente se renderiza abajo.
const GOOGLE_MAPS_SEARCH_URL = "https://www.google.com/maps/search/?api=1&query=Mercedes+1211%2C+Montevideo%2C+11100%2C+Uruguay";
const EMBED_SEARCH_URL = "https://www.google.com/maps/embed?pb=!1m14!1m8!1m3!1d13866.782026716934!2d-56.192284303020145!3d-34.90331539126892!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x959f8032e5c2380b%3A0xfcb4455742e9cd83!2sMercedes%201211%2C%2011100%20Montevideo%2C%20Departamento%20de%20Montevideo!5e0!3m2!1ses!2suy!4v1771789533418!5m2!1ses!2suy";

// Encabezado compartido por los 3 modales del footer: ícono + título + bajada.
// DialogTitle/DialogDescription son los que le dan a Radix el aria-labelledby
// / aria-describedby del diálogo — antes esto era un <h3>/<p> sueltos que un
// lector de pantalla no asociaba con el modal.
function DialogHeaderRow({ icon, title, subtitle, iconBg }: { icon: React.ReactNode; title: string; subtitle: string; iconBg?: boolean }) {
  return (
    <div className="flex items-center gap-3 px-6 py-5 border-b border-white/10">
      {iconBg ? (
        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">{icon}</div>
      ) : icon}
      <div>
        <DialogTitle className="text-sm font-bold text-white uppercase tracking-wider">{title}</DialogTitle>
        <DialogDescription className="text-[11px] text-white/50">{subtitle}</DialogDescription>
      </div>
    </div>
  );
}

export function Footer() {
  const [showMap, setShowMap] = useState(false);
  const [subName, setSubName] = useState('');
  const [subPhone, setSubPhone] = useState('');
  const [subBarrio, setSubBarrio] = useState('');
  const [subAccept, setSubAccept] = useState(false);
  const [subSent, setSubSent] = useState(false);

  // Guía de Tallas modal
  const [showTallas, setShowTallas] = useState(false);
  const [tallasName, setTallasName] = useState('');
  const [tallasPhone, setTallasPhone] = useState('');

  // Agendar Cita modal
  const [showCita, setShowCita] = useState(false);
  const [citaName, setCitaName] = useState('');
  const [citaPhone, setCitaPhone] = useState('');
  const [citaSent, setCitaSent] = useState(false);

  // Guarda el lead en Supabase (tabla `prospectos`) antes de abrir WhatsApp.
  // Antes los tres formularios de acá abajo no persistían nada — el dato
  // vivía solo en el mensaje de WhatsApp que el visitante podía cerrar sin
  // enviar. Fire-and-forget: si falla, no bloquea el flujo de WhatsApp.
  const saveLead = (source: 'newsletter' | 'size_guide' | 'appointment', name: string, phone: string, notes?: string, acceptsMarketing?: boolean) => {
    fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, phone, source, notes, accepts_marketing: acceptsMarketing }),
    }).catch(() => { /* no bloquea el flujo de WhatsApp si falla */ });
  };

  const handleSubscribe = () => {
    if (!subName.trim() || !subPhone.trim() || !subAccept) return;
    saveLead('newsletter', subName.trim(), subPhone.trim(), subBarrio.trim() ? `Barrio: ${subBarrio.trim()}` : undefined, subAccept);
    const message = `🔔 *Suscripción a Promociones*\n\n👤 Nombre: ${subName.trim()}\n📱 WhatsApp: ${subPhone.trim()}\n📍 Barrio: ${subBarrio.trim() || 'No especificado'}\n\n✅ Acepto recibir promociones y novedades de Joyería Alianzas.`;
    window.open(`https://wa.me/${appSettings.whatsAppNumber}?text=${encodeURIComponent(message)}`, '_blank');
    setSubSent(true);
  };

  const handleTallasSubmit = () => {
    if (!tallasName.trim() || !tallasPhone.trim()) return;
    saveLead('size_guide', tallasName.trim(), tallasPhone.trim());
    const message = `📏 *Solicitud de Guía de Tallas*\n\n👤 Nombre: ${tallasName.trim()}\n📱 Teléfono: ${tallasPhone.trim()}\n\nHola, me gustaría recibir la Guía de Tallas de Joyería Alianzas. ¡Gracias!`;
    window.open(`https://wa.me/${appSettings.whatsAppNumber}?text=${encodeURIComponent(message)}`, '_blank');
    setShowTallas(false);
    setTallasName('');
    setTallasPhone('');
  };

  const handleCitaSubmit = () => {
    if (!citaName.trim() || !citaPhone.trim()) return;
    saveLead('appointment', citaName.trim(), citaPhone.trim());
    const message = `📅 *Solicitud de Cita*\n\n👤 Nombre: ${citaName.trim()}\n📱 Teléfono: ${citaPhone.trim()}\n\nHola, me gustaría agendar una cita en Joyería Alianzas para conocer sus colecciones. ¡Quedo atento/a a su respuesta con fecha y hora disponible!`;
    window.open(`https://wa.me/${appSettings.whatsAppNumber}?text=${encodeURIComponent(message)}`, '_blank');
    setCitaSent(true);
  };

  const closeCitaModal = () => {
    setShowCita(false);
    setCitaSent(false);
    setCitaName('');
    setCitaPhone('');
  };

  return (
    <>
      <footer className="bg-foreground text-background pt-24 pb-12 border-t border-white/5">
        <div className="max-w-screen-xl mx-auto px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row justify-between gap-16 mb-20">
            <div className="lg:w-1/3">
              <Link className="font-headline text-3xl tracking-[0.1em] uppercase mb-8 block" href="/">
                Joyeria Alianzas
              </Link>

              {!subSent ? (
                <>
                  <div className="flex items-center gap-2 mb-4">
                    <MessageCircle className="w-4 h-4 text-green-400" />
                    <p className="text-white/80 text-sm font-medium">
                      Recibí promociones exclusivas por WhatsApp
                    </p>
                  </div>
                  <p className="text-white/50 text-xs font-light mb-6 max-w-sm">
                    Dejá tus datos y te enviaremos novedades, ofertas especiales y acceso anticipado a nuevas colecciones.
                  </p>
                  <div className="flex flex-col gap-3 max-w-xs">
                    <Input
                      className="bg-white/5 border border-white/10 text-white placeholder-white/30 rounded-lg px-3 py-2 text-sm font-light focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-0 h-10"
                      placeholder="Tu nombre"
                      value={subName}
                      onChange={(e) => setSubName(e.target.value)}
                    />
                    <Input
                      className="bg-white/5 border border-white/10 text-white placeholder-white/30 rounded-lg px-3 py-2 text-sm font-light focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-0 h-10"
                      placeholder="Tu WhatsApp (ej: 598 99 123 456)"
                      type="tel"
                      value={subPhone}
                      onChange={(e) => setSubPhone(e.target.value)}
                    />
                    <Input
                      className="bg-white/5 border border-white/10 text-white placeholder-white/30 rounded-lg px-3 py-2 text-sm font-light focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-0 h-10"
                      placeholder="Tu barrio (opcional)"
                      value={subBarrio}
                      onChange={(e) => setSubBarrio(e.target.value)}
                    />
                    <label className="flex items-start gap-2 cursor-pointer mt-1">
                      <input
                        type="checkbox"
                        checked={subAccept}
                        onChange={(e) => setSubAccept(e.target.checked)}
                        className="mt-0.5 w-4 h-4 rounded border-white/20 bg-white/5 text-primary focus:ring-primary accent-primary"
                      />
                      <span className="text-[11px] text-white/50 leading-relaxed">
                        Acepto recibir promociones y novedades de Joyería Alianzas por WhatsApp.
                      </span>
                    </label>
                    <Button
                      onClick={handleSubscribe}
                      disabled={!subName.trim() || !subPhone.trim() || !subAccept}
                      className="w-full bg-sage hover:bg-sage/90 text-white text-xs font-bold uppercase tracking-widest h-10 rounded-lg mt-1 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center gap-2"
                    >
                      <MessageCircle className="w-4 h-4" />
                      Suscribirme por WhatsApp
                    </Button>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-start gap-3 max-w-xs">
                  <div className="flex items-center gap-2 text-green-400">
                    <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                      <Check className="w-4 h-4" />
                    </div>
                    <p className="text-sm font-medium">¡Gracias, {subName}!</p>
                  </div>
                  <p className="text-white/50 text-xs font-light leading-relaxed">
                    Tu suscripción fue enviada. Te contactaremos por WhatsApp con las mejores promociones y novedades.
                  </p>
                </div>
              )}
            </div>
            <div className="lg:w-2/3 flex flex-col gap-10">
              <div className="grid grid-cols-2 gap-12 lg:gap-24">
                <div className="flex flex-col gap-6">
                  <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Boutique</h4>
                  <div className="flex flex-col gap-2">
                    <p className="text-sm font-light text-white/80">Montevideo Flagship</p>
                    <p className="text-xs text-white/50 leading-relaxed">
                      Mercedes 1211<br />Montevideo 11100
                    </p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <p className="text-sm font-light text-white/80">Horario</p>
                    <p className="text-xs text-white/50 leading-relaxed">
                      Lun - Vie: 10:00 - 18:00<br />Sáb: 10:00 - 16:00
                    </p>
                  </div>
                  <div className="flex flex-col gap-3 mt-1">
                    <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Social</h4>
                    <a className="text-sm font-light text-white/60 hover:text-white transition-colors" href="https://www.instagram.com/joyeriaalianzasuy/" target="_blank" rel="noopener noreferrer">Instagram</a>
                  </div>
                </div>
                <div className="flex flex-col gap-6">
                  <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Servicio al Cliente</h4>
                  <Link className="text-sm font-light text-white/60 hover:text-white transition-colors" href="/contact">Contáctenos</Link>
                  <button onClick={() => setShowCita(true)} className="text-sm font-light text-white/60 hover:text-white transition-colors text-left">Agendar Cita</button>
                  <button onClick={() => setShowTallas(true)} className="text-sm font-light text-white/60 hover:text-white transition-colors text-left">Guía de Tallas</button>
                </div>
              </div>
              {/* Mapa grande — ancho completo */}
              <div className="flex flex-col gap-3">
                <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Ubicación</h4>
                <button
                  onClick={() => setShowMap(true)}
                  className="group relative w-full aspect-[16/7] rounded-xl overflow-hidden border border-white/10 hover:border-primary/50 transition-all duration-300 cursor-pointer bg-black"
                >
                  <iframe
                    src={EMBED_SEARCH_URL}
                    className="absolute inset-0 w-full h-full border-0 pointer-events-none opacity-60 grayscale group-hover:opacity-100 group-hover:grayscale-0 transition-all duration-700 scale-105 group-hover:scale-100"
                    loading="lazy"
                    title="Previsualización Mapa"
                  />
                  {/* Overlay con botón */}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-transparent transition-colors duration-300">
                    <div className="flex items-center gap-1.5 bg-white/90 text-foreground px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-lg">
                      <MapPin className="w-3.5 h-3.5 text-primary" />
                      Ver Mapa Completo
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </div>
          <div className="flex flex-col md:flex-row justify-between items-center pt-8 border-t border-white/10 gap-4">
            <p className="text-[10px] text-background/55 uppercase tracking-widest">
              © 2026 Joyeria Alianzas. Todos los derechos reservados. Desarrollado por{" "}
              <a
                href="https://axion380.com.br"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-primary transition-colors underline decoration-white/10"
              >
                Axion380
              </a>
            </p>
            <div className="flex gap-6">

              <Link className="text-[10px] text-background/55 hover:text-white uppercase tracking-widest transition-colors" href="/privacidad">Política de Privacidad</Link>
              <Link className="text-[10px] text-background/55 hover:text-white uppercase tracking-widest transition-colors" href="/terminos">Términos y Condiciones</Link>
            </div>
          </div>
        </div>
      </footer>

      {/* ── Modal de Mapa Interactivo ── */}
      {/* Antes: div fijo con onClick para cerrar, sin foco atrapado, sin
          ESC, sin aria-*. Radix Dialog (ya usado en el menú móvil vía
          Sheet) da todo eso gratis. */}
      <Dialog open={showMap} onOpenChange={setShowMap}>
        <DialogContent className="w-[95vw] max-w-3xl bg-foreground text-white rounded-2xl border border-white/10 p-0 overflow-hidden [&>button]:text-white/60 [&>button]:hover:text-white">
          <DialogHeaderRow icon={<MapPin className="w-5 h-5 text-primary" />} title="Joyería Alianzas" subtitle="Mercedes 1211, Montevideo 11100" />
          {/* Mapa Interactivo — iframe con dirección exacta */}
          <div className="aspect-[16/10] w-full relative">
            <iframe
              src={EMBED_SEARCH_URL}
              className="absolute inset-0 w-full h-full border-0"
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Ubicación Joyería Alianzas"
            />
          </div>
          {/* Footer del modal */}
          <div className="flex items-center justify-between px-6 py-3 border-t border-white/10">
            <p className="text-[10px] text-background/65">Lun - Vie: 10:00 - 18:00 · Sáb: 10:00 - 16:00</p>
            <a
              href={GOOGLE_MAPS_SEARCH_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] font-bold uppercase tracking-wider text-primary hover:text-primary/80 transition-colors"
            >
              Abrir en Google Maps →
            </a>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Modal Guía de Tallas ── */}
      <Dialog open={showTallas} onOpenChange={setShowTallas}>
        <DialogContent className="w-[90vw] max-w-md bg-foreground text-white rounded-2xl border border-white/10 p-0 overflow-hidden [&>button]:text-white/60 [&>button]:hover:text-white">
          <DialogHeaderRow icon={<Ruler className="w-5 h-5 text-primary" />} title="Guía de Tallas" subtitle="Te la enviamos por WhatsApp" iconBg />
          {/* Form */}
          <div className="px-6 py-6 flex flex-col gap-4">
            <p className="text-xs text-white/50 font-light leading-relaxed">
              Completá tus datos y te enviaremos nuestra guía de tallas para que puedas elegir la medida perfecta.
            </p>
            <Input
              className="bg-white/5 border border-white/10 text-white placeholder-white/30 rounded-lg px-3 py-2 text-sm font-light focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-0 h-10"
              placeholder="Tu nombre"
              value={tallasName}
              onChange={(e) => setTallasName(e.target.value)}
            />
            <Input
              className="bg-white/5 border border-white/10 text-white placeholder-white/30 rounded-lg px-3 py-2 text-sm font-light focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-0 h-10"
              placeholder="Tu WhatsApp (ej: 598 91 264 956)"
              type="tel"
              value={tallasPhone}
              onChange={(e) => setTallasPhone(e.target.value)}
            />
            {/* Mensaje predefinido (solo visual) */}
            <div className="bg-white/5 border border-white/10 rounded-lg px-3 py-3 text-xs text-background/65 font-light leading-relaxed">
              📏 &quot;Hola, me gustaría recibir la Guía de Tallas de Joyería Alianzas. ¡Gracias!&quot;
            </div>
            <Button
              onClick={handleTallasSubmit}
              disabled={!tallasName.trim() || !tallasPhone.trim()}
              className="w-full bg-sage hover:bg-sage/90 text-white text-xs font-bold uppercase tracking-widest h-11 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center gap-2 mt-1"
            >
              <MessageCircle className="w-4 h-4" />
              Solicitar por WhatsApp
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Modal Agendar Cita ── */}
      <Dialog open={showCita} onOpenChange={(open) => { if (!open) closeCitaModal(); else setShowCita(true); }}>
        <DialogContent className="w-[90vw] max-w-md bg-foreground text-white rounded-2xl border border-white/10 p-0 overflow-hidden [&>button]:text-white/60 [&>button]:hover:text-white">
          <DialogHeaderRow icon={<CalendarDays className="w-5 h-5 text-primary" />} title="Agendar Cita" subtitle="Visitá nuestra boutique" iconBg />
          {/* Content */}
          <div className="px-6 py-6 flex flex-col gap-4">
            {!citaSent ? (
              <>
                <p className="text-xs text-white/50 font-light leading-relaxed">
                  Completá tus datos y nos pondremos en contacto para confirmar fecha y hora de tu visita.
                </p>
                <Input
                  className="bg-white/5 border border-white/10 text-white placeholder-white/30 rounded-lg px-3 py-2 text-sm font-light focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-0 h-10"
                  placeholder="Tu nombre"
                  value={citaName}
                  onChange={(e) => setCitaName(e.target.value)}
                />
                <Input
                  className="bg-white/5 border border-white/10 text-white placeholder-white/30 rounded-lg px-3 py-2 text-sm font-light focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-0 h-10"
                  placeholder="Tu WhatsApp (ej: 598 91 264 956)"
                  type="tel"
                  value={citaPhone}
                  onChange={(e) => setCitaPhone(e.target.value)}
                />
                {/* Mensaje predefinido (solo visual) */}
                <div className="bg-white/5 border border-white/10 rounded-lg px-3 py-3 text-xs text-background/65 font-light leading-relaxed">
                  📅 &quot;Hola, me gustaría agendar una cita en Joyería Alianzas para conocer sus colecciones.&quot;
                </div>
                <Button
                  onClick={handleCitaSubmit}
                  disabled={!citaName.trim() || !citaPhone.trim()}
                  className="w-full bg-sage hover:bg-sage/90 text-white text-xs font-bold uppercase tracking-widest h-11 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center gap-2 mt-1"
                >
                  <MessageCircle className="w-4 h-4" />
                  Enviar por WhatsApp
                </Button>
              </>
            ) : (
              <div className="flex flex-col items-center text-center gap-4 py-4">
                <div className="w-14 h-14 rounded-full bg-green-500/20 flex items-center justify-center">
                  <Check className="w-7 h-7 text-green-400" />
                </div>
                <div>
                  <h4 className="text-white font-headline text-lg mb-2">¡Gracias, {citaName}!</h4>
                  <p className="text-white/50 text-xs font-light leading-relaxed max-w-xs">
                    Tu solicitud fue enviada con éxito. En breve te responderemos con fecha y hora de disponibilidad para tu cita.
                  </p>
                </div>
                <Button
                  onClick={closeCitaModal}
                  variant="ghost"
                  className="text-xs text-background/65 hover:text-white uppercase tracking-widest mt-2"
                >
                  Cerrar
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
