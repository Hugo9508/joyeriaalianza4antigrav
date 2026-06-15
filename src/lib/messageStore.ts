/**
 * @fileOverview Almacén de mensajes en memoria para el servidor.
 * Permite guardar respuestas de n8n temporalmente hasta que el cliente las reclame.
 */

type Message = {
  id: string;
  text: string;
  senderName: string;
  phoneNumber: string;
  conversation_id?: string;
  timestamp: number;
};

// Uso de variable global para persistir el store entre recargas del servidor en desarrollo
const globalStore = global as typeof global & {
  pendingMessages?: Map<string, Message[]>;
};

if (!globalStore.pendingMessages) {
  globalStore.pendingMessages = new Map<string, Message[]>();
}

export const messageStore = {
  /**
   * Agrega un mensaje al buzón de un cliente específico.
   */
  add(msg: Omit<Message, 'id' | 'timestamp'>): void {
    const store = globalStore.pendingMessages!;
    const msgs = store.get(msg.phoneNumber) || [];
    
    msgs.push({ 
      ...msg, 
      id: Math.random().toString(36).slice(2), 
      timestamp: Date.now() 
    });

    // Mantener solo los últimos 50 mensajes por cliente
    if (msgs.length > 50) msgs.shift();
    
    store.set(msg.phoneNumber, msgs);
  },

  /**
   * Recupera y elimina los mensajes del buzón del cliente.
   */
  consume(phoneNumber: string): Message[] {
    const store = globalStore.pendingMessages!;
    const msgs = store.get(phoneNumber) || [];
    store.delete(phoneNumber);
    return msgs;
  },
};
