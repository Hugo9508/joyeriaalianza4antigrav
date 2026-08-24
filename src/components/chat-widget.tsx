'use client';

import { useState, useEffect, useRef } from 'react';
import { appSettings } from '@/lib/settings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, Send, User, Loader2, Phone, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { WhatsappIcon } from '@/components/icons';

type Message = {
  id: string;
  text: string;
  sender: 'user' | 'agent';
  timestamp: Date;
};

type UserInfo = {
  name: string;
  phone: string;
};

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [needsInlineOnboarding, setNeedsInlineOnboarding] = useState(false);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [onboardingForm, setOnboardingForm] = useState({ name: '', phone: '' });
  // Marca cuándo se (re)abrió/reseteó la charla en la UI, para que el polling
  // no pegue debajo del mensaje de bienvenida una conversación de hace una
  // semana (la cookie de sesión dura 7 días).
  const [chatOpenedAt, setChatOpenedAt] = useState<number>(() => Date.now());
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      text: `Bienvenida a Joyería Alianzas. Soy Alma, su asistente personal. ¿En qué pieza de alta joyería puedo asistirle hoy? ✨`,
      sender: 'agent',
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [pendingText, setPendingText] = useState<string | null>(null);
  // F6 (doc 12, "El handoff a humano") — Alma ahora puede derivar a un
  // asesor (tool derivar_a_asesor en /api/chat). Este flag solo prende el
  // banner; las respuestas del asesor humano ya llegan por el polling de
  // /api/messages que existía desde antes (mensajes insertados vía
  // /api/webhook), no hace falta tocar esa parte.
  const [handoffActive, setHandoffActive] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    const initSession = async () => {
      // El token de sesión vive únicamente en una cookie httpOnly (la setea el
      // servidor) — nunca en sessionStorage, para que no quede accesible a JS.
      // La ruta es idempotente: si ya hay cookie, no crea una sesión nueva.
      try {
        await fetch('/api/chat-session', { method: 'POST' });
      } catch (e) {
        console.error('Error initializing session', e);
      }
    };

    initSession();

    // Los listeners se registran ANTES de tocar localStorage. Antes, si el
    // JSON.parse de acá abajo tiraba (valor truncado por una pestaña cerrada
    // a mitad de escritura, extensión, quota llena), el useEffect abortaba
    // antes de llegar a los addEventListener — el botón de WhatsApp dejaba
    // de abrir el chat, sin error visible, para siempre en ese navegador.
    const handleOpenWithMsg = (e: any) => {
      setIsOpen(true);
      setChatOpenedAt(Date.now());
      const msg = e.detail?.message;
      const product = e.detail?.product;

      if (product) {
        const productInfoMsg = `📦 *Producto consultado:*\n\n🏷️ ${product.name}\n💰 USD ${product.price?.usd?.toLocaleString() || 'N/A'}${product.sku ? `\n🔖 SKU: ${product.sku}` : ''}${product.material ? `\n✨ Material: ${product.material}` : ''}`;
        setMessages(prev => [...prev, {
          id: 'product-' + Date.now(),
          text: productInfoMsg,
          sender: 'agent',
          timestamp: new Date(),
        }]);
      }

      let savedUserInfo: string | null = null;
      try {
        savedUserInfo = localStorage.getItem('alianza_user_info');
      } catch { /* localStorage inaccesible (modo privado, quota, etc.) */ }

      if (!savedUserInfo) {
        setPendingText(msg);
        setNeedsInlineOnboarding(true);
        setMessages(prev => [...prev, {
          id: 'ask-info-' + Date.now(),
          text: 'Para poder asesorarte mejor, necesito tu nombre y número de WhatsApp. Por favor completa los datos debajo. 👇',
          sender: 'agent',
          timestamp: new Date(),
        }]);
      } else if (msg) {
        try {
          const parsedUser = JSON.parse(savedUserInfo) as UserInfo;
          processMessage(msg, parsedUser);
        } catch {
          localStorage.removeItem('alianza_user_info');
          setPendingText(msg);
          setNeedsInlineOnboarding(true);
        }
      }
    };

    const handleOpenOnly = () => {
      setIsOpen(true);
      setChatOpenedAt(Date.now());
      setHandoffActive(false);
      // Resetear mensajes al bienvenida para empezar limpio
      setMessages([{
        id: 'welcome',
        text: `Bienvenida a Joyería Alianzas. Soy Alma, su asistente personal. ¿En qué pieza de alta joyería puedo asistirle hoy? ✨`,
        sender: 'agent',
        timestamp: new Date(),
      }]);
      let hasUser = false;
      try {
        hasUser = !!localStorage.getItem('alianza_user_info');
      } catch { /* ver nota arriba */ }
      if (!hasUser) setShowOnboarding(true);
    };

    window.addEventListener('open-chat-with-message', handleOpenWithMsg);
    window.addEventListener('open-chat-only', handleOpenOnly);

    // El parse de localStorage va después de registrar los listeners, y
    // envuelto en try/catch: si el valor guardado está corrupto, se limpia
    // y se sigue de largo en vez de abortar el resto del efecto.
    try {
      const saved = localStorage.getItem('alianza_user_info');
      if (saved) {
        const parsedUser = JSON.parse(saved) as UserInfo;
        setUserInfo(parsedUser);
      }
    } catch {
      localStorage.removeItem('alianza_user_info');
    }

    return () => {
      window.removeEventListener('open-chat-with-message', handleOpenWithMsg);
      window.removeEventListener('open-chat-only', handleOpenOnly);
    };
  }, []);

  // Polling — trae mensajes insertados por fuera del POST /api/chat (ej. un
  // handoff a humano vía /api/webhook). Antes dedupeaba por `id`, pero el id
  // que el widget pinta localmente (Math.random) nunca matchea con el UUID
  // de Postgres que vuelve del server: cada mensaje aparecía duplicado a los
  // ≤3s. Ahora dedupea por (rol, texto, ventana de tiempo) y además ignora
  // todo lo anterior a chatOpenedAt, para no pegar una charla de la semana
  // pasada debajo del mensaje de bienvenida recién reseteado.
  useEffect(() => {
    if (!userInfo || !isOpen) return;

    // Marca de agua: sólo se pide lo posterior a este timestamp. Antes cada
    // tick de 3s traía la conversación entera desde el server (ver doc 16,
    // 4.6). El filtro por (rol, texto, ventana) se mantiene igual como red
    // de seguridad ante colisiones de timestamp.
    let lastSeen = chatOpenedAt;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/messages?since=${lastSeen}`);
        if (!res.ok) return;

        const data = await res.json();
        if (data.messages && data.messages.length > 0) {
          const maxTimestamp = Math.max(...data.messages.map((m: any) => m.timestamp));
          if (maxTimestamp > lastSeen) lastSeen = maxTimestamp;

          setMessages(prev => {
            const newMessages = data.messages.filter((msg: any) => {
              if (msg.timestamp < chatOpenedAt - 5000) return false; // charla vieja, no la de ahora
              const sender = msg.role === 'assistant' ? 'agent' : 'user';
              return !prev.some(m =>
                m.text === msg.text &&
                m.sender === sender &&
                Math.abs(m.timestamp.getTime() - msg.timestamp) < 15000
              );
            });
            if (newMessages.length === 0) return prev;

            return [...prev, ...newMessages.map((msg: any) => ({
              id: msg.id,
              text: msg.text,
              sender: msg.role === 'assistant' ? 'agent' : 'user',
              timestamp: new Date(msg.timestamp)
            }))];
          });
        }
      } catch (err) {
        // Antes este catch quedaba vacío: si /api/messages empezaba a
        // devolver 500 o la sesión expiraba, el polling fallaba en
        // silencio para siempre. Ahora al menos queda en consola.
        console.error('[CHAT_POLLING_ERROR]', err);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [userInfo, isOpen, chatOpenedAt]);

  useEffect(() => {
    // ✅ Auto-scroll al último mensaje usando scrollIntoView (funciona con ScrollArea)
    setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  }, [messages, showOnboarding, needsInlineOnboarding, isOpen, isTyping]);

  const addMessage = (text: string, sender: 'user' | 'agent') => {
    setMessages(prev => [...prev, {
      id: Math.random().toString(36).substr(2, 9),
      text,
      sender,
      timestamp: new Date()
    }]);
  };

  // Manda el lead a /api/leads → tabla `prospectos`. Antes el nombre y el
  // WhatsApp que el visitante cargaba acá quedaban solo en localStorage: la
  // joyería recibía cero leads del chat, que es la razón de ser del widget.
  const saveLeadToServer = (data: UserInfo) => {
    fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: data.name, phone: data.phone, source: 'chat_widget' }),
    }).catch(() => { /* no bloquea la conversación si falla */ });
  };

  const handleOnboarding = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onboardingForm.name.trim() || onboardingForm.phone.length < 8) return;

    const data = { name: onboardingForm.name.trim(), phone: onboardingForm.phone };
    try { localStorage.setItem('alianza_user_info', JSON.stringify(data)); } catch { /* localStorage inaccesible */ }
    setUserInfo(data);
    saveLeadToServer(data);
    setShowOnboarding(false);

    if (pendingText) {
      processMessage(pendingText, data);
      setPendingText(null);
    }
  };

  const handleInlineOnboarding = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onboardingForm.name.trim() || onboardingForm.phone.length < 8) return;

    const data = { name: onboardingForm.name.trim(), phone: onboardingForm.phone };
    try { localStorage.setItem('alianza_user_info', JSON.stringify(data)); } catch { /* localStorage inaccesible */ }
    setUserInfo(data);
    saveLeadToServer(data);
    setNeedsInlineOnboarding(false);

    // ✅ Confirmar en el chat que los datos fueron guardados
    addMessage(`✅ ¡Gracias, ${data.name}! Tus datos fueron guardados. Enviando tu consulta...`, 'agent');

    if (pendingText) {
      processMessage(pendingText, data);
      setPendingText(null);
    }
  };

  const processMessage = async (text: string, forcedUser?: UserInfo) => {
    const user = forcedUser || userInfo;
    if (!text.trim() || !user) return;

    // Mostrar mensaje del usuario inmediatamente
    addMessage(text, 'user');
    setInputValue('');
    setIsSending(true);
    setIsTyping(true);

    // F6 — streaming: antes se esperaba res.json() con la respuesta
    // completa antes de mostrar nada. Ahora se lee el body como stream de
    // líneas NDJSON (una línea = un evento) y se va completando un único
    // mensaje de Alma a medida que llegan los deltas.
    const streamId = Math.random().toString(36).substr(2, 9);
    let streamedText = '';
    let started = false;

    try {
      const history = messages.map(m => ({
        role: m.sender === 'user' ? 'user' : 'assistant',
        content: m.text
      }));

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: history.slice(-6) // Últimos 3 turnos de contexto
        }),
      });

      if (!res.ok || !res.body) {
        const result = await res.json().catch(() => ({}));
        setIsTyping(false);
        toast({
          variant: 'destructive',
          title: 'Error de Envío',
          description: result.error || 'No se pudo obtener respuesta del asesor.',
        });
        setIsSending(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;
          let evt: any;
          try { evt = JSON.parse(line); } catch { continue; }

          if (evt.type === 'delta') {
            if (!started) {
              started = true;
              setIsTyping(false);
              setMessages(prev => [...prev, { id: streamId, text: '', sender: 'agent', timestamp: new Date() }]);
            }
            streamedText += evt.text;
            const snapshot = streamedText;
            setMessages(prev => prev.map(m => m.id === streamId ? { ...m, text: snapshot } : m));
          } else if (evt.type === 'error') {
            setIsTyping(false);
            toast({
              variant: 'destructive',
              title: 'Error de Envío',
              description: evt.message || 'No se pudo obtener respuesta del asesor.',
            });
          } else if (evt.type === 'handoff') {
            setHandoffActive(true);
          } else if (evt.type === 'paused') {
            // La sesión ya estaba pausada de antes (por ejemplo, la
            // derivación pasó por WhatsApp y el cliente sigue escribiendo
            // acá en el widget web — mismo sessionId, mismo cerebro). No es
            // un error: el mensaje ya se guardó del lado del servidor, sólo
            // no hay respuesta de Alma para este turno. Se reusa el mismo
            // banner de "asesor humano" en vez de uno nuevo.
            setIsTyping(false);
            setHandoffActive(true);
          }
        }
      }

      if (!started) {
        // El stream terminó sin mandar ningún delta (error temprano, ya avisado arriba)
        setIsTyping(false);
      }
    } catch (error: any) {
      setIsTyping(false);
      toast({
        variant: 'destructive',
        title: 'Error de conexión',
        description: error.message,
      });
    }

    setIsSending(false);
  };

  // Antes había un componente aparte (`WhatsappButton`, siempre montado en
  // layout.tsx) que dibujaba este mismo ícono en la misma esquina fija —
  // los dos elementos coexistían en el DOM (`fixed bottom-6 right-6` el
  // botón, `fixed bottom-24 right-6` el panel), y con el panel abierto el
  // botón quedaba tapado detrás. Se unificó acá: un solo elemento fijo en
  // esa esquina, que es el botón cuando está cerrado y el panel cuando está
  // abierto — nunca los dos a la vez. El ícono de WhatsApp se mantiene a
  // propósito (no es un link real a WhatsApp, dispara el mismo evento
  // `open-chat-only` de abajo) porque los clientes ya lo reconocen como "acá
  // te contesto", y así se quedan en el chat propio en vez de irse a la app.
  if (!isOpen) {
    return (
      <button
        onClick={() => window.dispatchEvent(new CustomEvent('open-chat-only'))}
        aria-label="Abrir chat con Alma"
        className="fixed bottom-6 right-6 z-50 group flex items-center justify-center w-14 h-14 bg-foreground text-background rounded-full shadow-lg hover:-translate-y-1 hover:shadow-xl transition-all duration-300"
      >
        <span className="absolute inset-0 rounded-full bg-foreground opacity-30 group-hover:opacity-50 animate-ping"></span>
        <span className="absolute inset-0 rounded-full bg-foreground opacity-100"></span>
        <WhatsappIcon className="w-8 h-8 fill-current relative z-10" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-24 right-6 w-[350px] sm:w-[450px] h-[650px] bg-background border border-gold/30 rounded-2xl shadow-2xl flex flex-col overflow-hidden z-[100] animate-in slide-in-from-bottom-5 duration-300">
      {/* Header — antes bg-[#d4af37] con texto blanco: contraste 1.94:1,
          falla WCAG AA por mucho. Ahora tinta con acento dorado (gold-soft
          sobre foreground = 10.4:1). */}
      <div className="bg-foreground p-4 flex items-center justify-between text-background shadow-md shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-background/10 flex items-center justify-center">
            <User className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold uppercase tracking-widest">{appSettings.chatAgentName}</h3>
            <div className="flex items-center gap-1.5 text-[9px] uppercase font-bold text-gold-soft">
              <span className="w-1.5 h-1.5 bg-sage rounded-full animate-pulse" />
              Asesoría en vivo
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="hover:bg-background/10 text-background h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex flex-col flex-1 relative overflow-hidden">
        {showOnboarding ? (
          <div className="flex-1 p-8 flex flex-col justify-center bg-secondary/10">
            <div className="text-center mb-8">
              <h4 className="text-lg font-headline">Atención Personalizada</h4>
              <p className="text-xs text-muted-foreground mt-2">Identifíquese para recibir asesoría directa.</p>
            </div>

            <form onSubmit={handleOnboarding} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase tracking-widest font-bold opacity-60">Nombre</Label>
                <Input
                  value={onboardingForm.name}
                  onChange={e => setOnboardingForm({ ...onboardingForm, name: e.target.value })}
                  placeholder="Su nombre"
                  className="h-12 bg-background border-primary/10"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase tracking-widest font-bold opacity-60">Teléfono (WhatsApp)</Label>
                <Input
                  value={onboardingForm.phone}
                  onChange={e => setOnboardingForm({ ...onboardingForm, phone: e.target.value.replace(/\D/g, '') })}
                  placeholder="59891264956"
                  className="h-12 bg-background border-primary/10"
                  required
                />
              </div>
              <Button type="submit" className="w-full h-12 text-xs font-bold uppercase tracking-widest">
                Comenzar
              </Button>
            </form>
          </div>
        ) : (
          <>
            {handoffActive && (
              <div className="flex items-center gap-2 px-4 py-2.5 bg-primary/10 border-b border-primary/20 text-[11px] text-primary shrink-0">
                <Phone className="h-3.5 w-3.5 shrink-0" />
                <span>Te estamos derivando con un asesor humano — te va a responder por acá mismo.</span>
              </div>
            )}
            <ScrollArea className="flex-1 p-4 bg-secondary/5">
              <div className="space-y-4" ref={scrollRef}>
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn(
                      "max-w-[85%] p-3 rounded-2xl text-sm shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-1 duration-300",
                      msg.sender === 'user'
                        ? "ml-auto bg-foreground text-background rounded-tr-none"
                        : "mr-auto bg-white text-foreground border border-gold/10 rounded-tl-none"
                    )}
                  >
                    <p className="whitespace-pre-line leading-relaxed" style={{ overflowWrap: 'break-word', wordBreak: 'break-word' }}>{msg.text}</p>
                    <span className={cn(
                      "text-[8px] mt-1 block text-right",
                      msg.sender === 'user' ? "text-background/70" : "text-muted-foreground"
                    )}>
                      {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}

                {isTyping && (
                  <div className="mr-auto bg-white text-foreground border border-gold/10 p-3 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-gold/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-gold/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-gold/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                )}

                {!isTyping && messages.length < 3 && !needsInlineOnboarding && (
                  <div className="flex flex-wrap gap-2 mt-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                    {[
                      "¿Cómo comprar?",
                      "Anillos de compromiso",
                      "Alianzas de oro 18k",
                      "Ubicación de la boutique"
                    ].map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => processMessage(suggestion)}
                        className="text-[10px] uppercase tracking-widest font-bold px-3 py-1.5 rounded-full border border-gold/30 text-gold-ink hover:bg-gold hover:text-white transition-colors duration-300 bg-white/50 backdrop-blur-sm"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}
                {/* ✅ Formulario inline para nombre y WhatsApp dentro del chat */}
                {needsInlineOnboarding && (
                  <div className="mr-auto w-[90%] bg-card border border-primary/10 rounded-2xl rounded-tl-none p-4 shadow-sm animate-in slide-in-from-bottom-2 duration-300">
                    <form onSubmit={handleInlineOnboarding} className="space-y-3">
                      <div className="space-y-1">
                        <Label className="text-[9px] uppercase tracking-widest font-bold opacity-60">Nombre</Label>
                        <Input
                          value={onboardingForm.name}
                          onChange={e => setOnboardingForm({ ...onboardingForm, name: e.target.value })}
                          placeholder="Su nombre"
                          className="h-9 bg-background border-primary/10 text-sm"
                          required
                          autoFocus
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[9px] uppercase tracking-widest font-bold opacity-60">WhatsApp</Label>
                        <Input
                          value={onboardingForm.phone}
                          onChange={e => setOnboardingForm({ ...onboardingForm, phone: e.target.value.replace(/\D/g, '') })}
                          placeholder="59891264956"
                          className="h-9 bg-background border-primary/10 text-sm"
                          required
                        />
                      </div>
                      <Button
                        type="submit"
                        disabled={!onboardingForm.name.trim() || onboardingForm.phone.length < 8}
                        className="w-full h-9 text-[10px] font-bold uppercase tracking-widest"
                      >
                        Confirmar y Enviar
                      </Button>
                    </form>
                  </div>
                )}
                {/* Antes había un SEGUNDO indicador de "escribiendo" acá (idéntico en
                    función, con otros estilos) que se renderizaba a la vez que el de
                    arriba — dos globos de puntitos suspensivos superpuestos mientras
                    Alma responde. Se borra, queda uno solo. */}
                {/* ✅ Ancla para auto-scroll al final */}
                <div ref={bottomRef} />
              </div>
            </ScrollArea>

            <div className="p-4 border-t border-primary/5 bg-background shrink-0">
              <form
                onSubmit={(e) => { e.preventDefault(); processMessage(inputValue); }}
                className="flex gap-2"
              >
                <Input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder={needsInlineOnboarding ? "Complete sus datos arriba..." : "Escriba su mensaje..."}
                  className="flex-1 bg-secondary/30 border-none rounded-full px-4 h-10 text-sm focus-visible:ring-1 focus-visible:ring-primary"
                  disabled={isSending || needsInlineOnboarding}
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={isSending || !inputValue.trim() || needsInlineOnboarding}
                  className="rounded-full h-10 w-10 flex-shrink-0"
                >
                  {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </form>
              {userInfo && (
                <div className="flex items-center justify-center gap-2 mt-3 opacity-40">
                  <CheckCircle className="h-2.5 w-2.5 text-green-600" />
                  <span className="text-[8px] uppercase font-bold tracking-widest">
                    WhatsApp: {userInfo.phone}
                  </span>
                  <button
                    onClick={() => { localStorage.removeItem('alianza_user_info'); setUserInfo(null); setShowOnboarding(true); }}
                    className="text-[8px] underline ml-1"
                  >
                    (Cambiar)
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
