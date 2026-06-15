'use client';

import { useState, useEffect, useRef } from 'react';
import { appSettings } from '@/lib/settings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, Send, User, Loader2, Phone, Terminal, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

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

type DebugLog = {
  timestamp: string;
  success: boolean;
  error?: string;
  data: any;
};

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [needsInlineOnboarding, setNeedsInlineOnboarding] = useState(false);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [onboardingForm, setOnboardingForm] = useState({ name: '', phone: '' });
  // sessionId estable por visitante (basado en phone o uuid aleatorio)
  const [sessionId, setSessionId] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      text: `¡Hola! Soy ${appSettings.chatAgentName}. ¿En qué puedo ayudarte hoy? ✨`,
      sender: 'agent',
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [pendingText, setPendingText] = useState<string | null>(null);
  const [showDebug, setShowDebug] = useState(false);
  const [debugLogs, setDebugLogs] = useState<DebugLog[]>([]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const debugScrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    const saved = localStorage.getItem('alianza_user_info');
    if (saved) {
      const parsedUser = JSON.parse(saved) as UserInfo;
      setUserInfo(parsedUser);
      // sessionId estable basado en el teléfono del usuario
      setSessionId(`web_${parsedUser.phone}`);
    } else {
      // Visitante anónimo — generar sessionId persistente por sesión
      const existingSession = sessionStorage.getItem('alma_session_id');
      if (existingSession) {
        setSessionId(existingSession);
      } else {
        const newSession = `web_anon_${Date.now()}`;
        sessionStorage.setItem('alma_session_id', newSession);
        setSessionId(newSession);
      }
    }

    const handleOpenWithMsg = (e: any) => {
      setIsOpen(true);
      const msg = e.detail?.message;
      const product = e.detail?.product;

      // ✅ Guardar contexto del producto para enviarlo al agente
      if (product) {
        // Guardar en sessionStorage para que processMessage lo use
        sessionStorage.setItem('alma_product_context', product.name || '');
        const productInfoMsg = `📦 *Producto consultado:*\n\n🏷️ ${product.name}\n💰 USD ${product.price?.usd?.toLocaleString() || 'N/A'}${product.sku ? `\n🔖 SKU: ${product.sku}` : ''}${product.material ? `\n✨ Material: ${product.material}` : ''}`;
        setMessages(prev => [...prev, {
          id: 'product-' + Date.now(),
          text: productInfoMsg,
          sender: 'agent',
          timestamp: new Date(),
        }]);
      }

      const savedUserInfo = localStorage.getItem('alianza_user_info');
      if (!savedUserInfo) {
        // ✅ Guardar el mensaje pendiente y pedir datos inline en el chat
        setPendingText(msg);
        setNeedsInlineOnboarding(true);
        // Agregar mensaje del agente pidiendo datos
        setMessages(prev => [...prev, {
          id: 'ask-info-' + Date.now(),
          text: 'Para poder asesorarte mejor, necesito tu nombre y número de WhatsApp. Por favor completa los datos debajo. 👇',
          sender: 'agent',
          timestamp: new Date(),
        }]);
      } else if (msg) {
        // ✅ FIX: Pasar user info directamente para evitar stale closure
        const parsedUser = JSON.parse(savedUserInfo) as UserInfo;
        processMessage(msg, parsedUser);
      }
    };

    const handleOpenOnly = () => {
      setIsOpen(true);
      // ✅ Limpiar contexto de producto al abrir chat genérico
      sessionStorage.removeItem('alma_product_context');
      // Resetear mensajes al bienvenida para empezar limpio
      setMessages([{
        id: 'welcome',
        text: `¡Hola! Soy ${appSettings.chatAgentName}. ¿En qué puedo ayudarte hoy? ✨`,
        sender: 'agent',
        timestamp: new Date(),
      }]);
      if (!localStorage.getItem('alianza_user_info')) setShowOnboarding(true);
    };

    window.addEventListener('open-chat-with-message', handleOpenWithMsg);
    window.addEventListener('open-chat-only', handleOpenOnly);

    return () => {
      window.removeEventListener('open-chat-with-message', handleOpenWithMsg);
      window.removeEventListener('open-chat-only', handleOpenOnly);
    };
  }, []);

  // Polling para recibir respuestas de n8n cada 2.5s
  useEffect(() => {
    if (!userInfo?.phone || !isOpen) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/messages?phone=${userInfo.phone}`);
        if (!res.ok) return;

        const data = await res.json();
        if (data.messages && data.messages.length > 0) {
          data.messages.forEach((msg: any) => {
            setMessages(prev => {
              if (prev.some(m => m.id === msg.id)) return prev;
              return [...prev, {
                id: msg.id,
                text: msg.text,
                sender: 'agent',
                timestamp: new Date(msg.timestamp)
              }];
            });
          });
        }
      } catch (err) { }
    }, 2500);

    return () => clearInterval(interval);
  }, [userInfo?.phone, isOpen]);

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

  const addDebugLog = (success: boolean, data: any, error?: string) => {
    setDebugLogs(prev => [...prev, {
      timestamp: new Date().toLocaleTimeString(),
      success,
      error,
      data
    }]);
  };

  const handleOnboarding = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onboardingForm.name.trim() || onboardingForm.phone.length < 8) return;

    const data = { name: onboardingForm.name.trim(), phone: onboardingForm.phone };
    localStorage.setItem('alianza_user_info', JSON.stringify(data));
    setUserInfo(data);
    setSessionId(`web_${data.phone}`);
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
    localStorage.setItem('alianza_user_info', JSON.stringify(data));
    setUserInfo(data);
    setSessionId(`web_${data.phone}`);
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

    try {
      // ✅ Llamada a n8n Alma Agent (Flujo 1)
      const productoContexto = sessionStorage.getItem('alma_product_context') || '';
      const res = await fetch('/api/alma-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mensaje: text,
          sessionId: sessionId || `web_${user.phone}`,
          senderName: user.name,
          canal: 'web',
          productoContexto,
        }),
        signal: AbortSignal.timeout(50000),
      });

      const result = await res.json();
      setIsTyping(false);
      addDebugLog(result.success, result.debug, result.error);

      if (result.success) {
        if (result.response) {
          addMessage(result.response, 'agent');
        }
      } else {
        toast({
          variant: 'destructive',
          title: 'Error de Envío',
          description: result.error || 'Alma no pudo responder.',
        });
      }
    } catch (error: any) {
      setIsTyping(false);
      toast({
        variant: 'destructive',
        title: 'Error de conexión',
        description: error.name === 'TimeoutError' ? 'Sin respuesta (45s)' : error.message,
      });
    }

    setIsSending(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-24 right-6 w-[350px] sm:w-[450px] h-[650px] bg-background border border-primary/20 rounded-2xl shadow-2xl flex flex-col overflow-hidden z-[100] animate-in slide-in-from-bottom-5 duration-300">
      {/* Header */}
      <div className="bg-primary p-4 flex items-center justify-between text-primary-foreground shadow-md shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
            <User className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold uppercase tracking-widest">{appSettings.chatAgentName}</h3>
            <div className="flex items-center gap-1.5 text-[9px] uppercase font-bold opacity-80">
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
              Asesoría en vivo
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="hover:bg-white/10 text-white h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex flex-col flex-1 relative overflow-hidden">
        {/* Debug Console Overlay */}
        {showDebug && (
          <div className="absolute inset-0 z-50 bg-slate-950/95 text-green-400 font-mono text-[10px] p-4 flex flex-col border-b border-white/10 overflow-hidden animate-in fade-in duration-200">
            <div className="flex items-center justify-between mb-2 border-b border-green-400/20 pb-2">
              <span className="flex items-center gap-2 uppercase tracking-widest font-bold">
                <Terminal className="h-3 w-3" /> Monitor de Tráfico
              </span>
              <button onClick={() => setShowDebug(false)} className="hover:text-white"><X className="h-3 w-3" /></button>
            </div>
            <ScrollArea className="flex-1">
              <div className="space-y-4">
                {debugLogs.length === 0 ? (
                  <div className="text-green-400/40 italic">Esperando actividad...</div>
                ) : debugLogs.map((log, i) => (
                  <div key={i} className={cn("border-l-2 pl-3 py-1", log.success ? "border-green-500" : "border-red-500")}>
                    <div className="flex justify-between items-start mb-1">
                      <span className="bg-slate-800 px-1.5 rounded text-[8px]">{log.timestamp}</span>
                      <span className={log.success ? "text-green-400" : "text-red-400"}>
                        {log.success ? "SUCCESS" : "ERROR"}
                      </span>
                    </div>
                    {log.error && <div className="text-red-400 mb-1">Error: {log.error}</div>}
                    <div className="text-slate-400 text-[9px] mb-1">
                      Latencia: <span className="text-white">{log.data?.duration || 'N/A'}</span>
                    </div>
                    <details className="mt-1">
                      <summary className="cursor-pointer opacity-60">Payload</summary>
                      <pre className="bg-black/50 p-2 rounded mt-1 overflow-x-auto text-[8px] text-white/90">
                        {JSON.stringify(log.data?.payload, null, 2)}
                      </pre>
                    </details>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

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
            <ScrollArea className="flex-1 p-4 bg-secondary/5">
              <div className="space-y-4" ref={scrollRef}>
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn(
                      "max-w-[85%] p-3 rounded-2xl text-sm shadow-sm overflow-hidden",
                      msg.sender === 'user'
                        ? "ml-auto bg-primary text-primary-foreground rounded-tr-none"
                        : "mr-auto bg-card text-card-foreground border border-primary/5 rounded-tl-none"
                    )}
                  >
                    <p className="whitespace-pre-line leading-relaxed" style={{ overflowWrap: 'break-word', wordBreak: 'break-word' }}>{msg.text}</p>
                    <span className="text-[8px] opacity-40 mt-1 block text-right">
                      {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
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
                {/* ✅ Typing indicator mientras Alma procesa */}
                {isTyping && (
                  <div className="mr-auto bg-card border border-primary/5 rounded-2xl rounded-tl-none p-3 flex items-center gap-1.5 shadow-sm">
                    <span className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                )}
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
