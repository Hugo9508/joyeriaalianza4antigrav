'use client';

import { WhatsappIcon } from "./icons";

/**
 * @fileOverview Botón flotante de WhatsApp.
 * Redirige exclusivamente al chat interno de la web para mantener al cliente en el ecosistema.
 */

export function WhatsappButton() {
    const handleOpenChat = () => {
        if (typeof window !== 'undefined') {
            // Disparamos el evento para abrir el widget de chat sin mensaje predefinido
            window.dispatchEvent(new CustomEvent('open-chat-only'));
        }
    };

    // Antes: #25D366 fijo, contraste ícono/fondo 1.98:1 (falla incluso el
    // mínimo de 3:1 para gráficos). Ahora usa la tinta del sitio — el ping
    // respeta prefers-reduced-motion vía la regla global de globals.css.
    return (
        <button
            onClick={handleOpenChat}
            aria-label="Contactar Asesoría"
            className="fixed bottom-6 right-6 z-50 group flex items-center justify-center w-14 h-14 bg-foreground text-background rounded-full shadow-lg hover:-translate-y-1 hover:shadow-xl transition-all duration-300"
        >
            <span className="absolute inset-0 rounded-full bg-foreground opacity-30 group-hover:opacity-50 animate-ping"></span>
            <span className="absolute inset-0 rounded-full bg-foreground opacity-100"></span>
            <WhatsappIcon className="w-8 h-8 fill-current relative z-10" />
        </button>
    )
}
