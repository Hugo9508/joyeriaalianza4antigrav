import { serverSettings } from '@/lib/settings.server';
import { appSettings } from '@/lib/settings';
import { fetchWooCommerce, getCategoryIdBySlug } from '@/lib/woocommerce';
import { mapWooCommerceProduct } from '@/lib/mappers';

/**
 * @fileOverview El cerebro de Alma — un solo lugar, sin importar el canal.
 *
 * Antes de esto, el razonamiento (system prompt, tools, loop de tool
 * calling) vivía inline dentro de `/api/chat/route.ts`, acoplado a esa
 * request HTTP puntual (cookie de sesión, streaming NDJSON). Cuando se
 * decidió activar un segundo transporte (WhatsApp vía n8n, `/api/agent`),
 * ese acoplamiento hubiera obligado a copiar el prompt y las tools a mano —
 * exactamente el anti-patrón que `07-adr-001-donde-vive-el-agente.md`
 * advertía evitar: "dos agentes que divergen, con dos prompts que hay que
 * mantener sincronizados a mano". Este módulo es el cerebro único; `/api/chat`
 * y `/api/agent` son transportes finos alrededor de `runAgentTurn()`.
 */

export const TOOLS = [
  {
    type: 'function' as const,
    function: {
      name: 'buscar_productos',
      description: 'Busca piezas de joyería en el catálogo real de la boutique por nombre o categoría. Usar siempre antes de mencionar precios, materiales o disponibilidad de un producto.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Texto de búsqueda: nombre de la pieza, material o estilo (ej. "alianza oro 18k", "aros perla").' },
          categoria: { type: 'string', description: 'Slug de categoría, opcional (ej. "alianzas", "anillos", "collares").' },
        },
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'ver_producto',
      description: 'Trae el detalle completo (precio real, stock, material, gema) de un producto por su ID. Usar cuando ya se sabe el ID exacto, por ejemplo tras un buscar_productos previo.',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'ID numérico del producto en WooCommerce.' },
        },
        required: ['id'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'derivar_a_asesor',
      description: 'Deriva la conversación a un asesor humano de la boutique. Usar cuando el cliente pide explícitamente hablar con una persona, o cuando su pedido excede lo que vos podés resolver (una reclamación, coordinar un pago puntual, algo que ninguna herramienta cubre) después de intentar ayudarlo. No hace falta nombre/WhatsApp para esto — si ya los tenés, mejor, pero no es requisito.',
      parameters: {
        type: 'object',
        properties: {
          motivo: { type: 'string', description: 'Resumen breve de por qué se deriva, para que el asesor tenga contexto al entrar (ej. "quiere coordinar retiro de una reparación").' },
        },
        required: ['motivo'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'agendar_cita',
      description: 'Registra una solicitud de cita/visita a la boutique. Usar SÓLO cuando el cliente ya confirmó que quiere agendar una visita y dio su nombre y WhatsApp — no la llames antes de tener ambos datos. La boutique se pone en contacto después para confirmar fecha y hora exactas; esta herramienta no reserva un horario específico.',
      parameters: {
        type: 'object',
        properties: {
          nombre: { type: 'string', description: 'Nombre del cliente.' },
          telefono: { type: 'string', description: 'WhatsApp o teléfono de contacto del cliente.' },
          preferencia: { type: 'string', description: 'Día u horario preferido, si lo mencionó. Opcional.' },
        },
        required: ['nombre', 'telefono'],
      },
    },
  },
];

// Un cerebro para dos canales trae un riesgo nuevo que un solo canal no
// tenía: si Alma deriva a un asesor humano (derivar_a_asesor) pero nada le
// avisa que YA NO debe seguir respondiendo, el próximo mensaje del cliente
// —web o WhatsApp— vuelve a generar una respuesta de Alma por encima del
// humano que se supone que tomó la conversación. `chat_sessions.metadata`
// es la única pieza de este mecanismo con schema confirmado (no depende de
// adivinar `chat_handoff`), así que la pausa se guarda ahí.
//
// ⚠️ No existe (todavía) ninguna consola para levantar la pausa — se activa
// sola en cada derivar_a_asesor y se queda activa hasta que alguien la
// desactive a mano en Supabase (`update chat_sessions set metadata =
// jsonb_set(metadata, '{paused}', 'false') where id = '<uuid>'`). Es una
// limitación real, no un descuido: levantarla automáticamente después de
// un tiempo fijo es una decisión de negocio (¿cuánto tarda razonablemente
// un asesor en contestar?) que no corresponde inventar acá.
async function isSessionPaused(supabaseAdmin: any, sessionId: string): Promise<boolean> {
  try {
    const { data, error } = await supabaseAdmin
      .from('chat_sessions')
      .select('metadata')
      .eq('id', sessionId)
      .maybeSingle();
    if (error) throw error;
    return Boolean((data?.metadata as any)?.paused);
  } catch (e: any) {
    console.error('[AGENT_PAUSE_CHECK_ERROR]', e.message);
    // Ante la duda, NO pausar: un falso negativo (Alma responde cuando no
    // debería) es peor experiencia, pero un falso positivo (Alma se calla
    // para siempre por un error de red pasajero) deja al cliente sin
    // respuesta de nadie.
    return false;
  }
}

async function pauseSession(supabaseAdmin: any, sessionId: string): Promise<void> {
  try {
    const { data } = await supabaseAdmin
      .from('chat_sessions')
      .select('metadata')
      .eq('id', sessionId)
      .maybeSingle();
    const currentMetadata = (data?.metadata as Record<string, any>) || {};
    await supabaseAdmin
      .from('chat_sessions')
      .update({ metadata: { ...currentMetadata, paused: true, paused_at: new Date().toISOString() } })
      .eq('id', sessionId);
  } catch (e: any) {
    // No hacer fallar la derivación entera porque no se pudo marcar la
    // pausa — la fila en chat_handoff (si esa parte anduvo) ya avisa igual.
    console.error('[AGENT_PAUSE_SET_ERROR]', e.message);
  }
}

function summarizeProduct(p: ReturnType<typeof mapWooCommerceProduct>) {
  // Recorte deliberado: sólo lo que Alma necesita para hablar del producto,
  // no el HTML de la descripción completa ni campos internos.
  return {
    id: p.id,
    nombre: p.name,
    precio_usd: p.price.usd,
    en_oferta: p.isOnSale,
    precio_regular_usd: p.regularPrice,
    categoria: p.category,
    material: p.material || null,
    piedra: p.stone || null,
    stock: p.stockStatus,
  };
}

// ctx trae lo que las tools necesitan para persistir (supabaseAdmin) y a
// quién atribuírselo (sessionId — el id interno de chat_sessions, el mismo
// sin importar si el canal es web o WhatsApp).
async function runTool(name: string, args: any, ctx: { supabaseAdmin: any; sessionId: string }): Promise<any> {
  try {
    if (name === 'buscar_productos') {
      const params: Record<string, string> = { per_page: '6' };
      if (args?.query) params.search = String(args.query);
      if (args?.categoria) {
        const catId = await getCategoryIdBySlug(String(args.categoria));
        if (catId) params.category = catId;
      }
      const raw = await fetchWooCommerce('products', params);
      if (!Array.isArray(raw)) return { error: 'El catálogo no devolvió resultados.' };
      return { productos: raw.map((p: any) => summarizeProduct(mapWooCommerceProduct(p))) };
    }

    if (name === 'ver_producto') {
      if (!args?.id) return { error: 'Falta el id del producto.' };
      const raw = await fetchWooCommerce(`products/${args.id}`);
      return { producto: summarizeProduct(mapWooCommerceProduct(raw)) };
    }

    if (name === 'derivar_a_asesor') {
      const motivo = typeof args?.motivo === 'string' ? args.motivo.trim().slice(0, 500) : 'Sin motivo especificado';

      // NOTA (ver prompt de Supabase): doc 12 encontró DOS tablas candidatas
      // — `handoff` y `chat_handoff` — sin un consumidor confirmado. Se
      // eligió `chat_handoff`; si el nombre/columnas no coincide contra el
      // schema real, este insert va a fallar en producción.
      const { error } = await ctx.supabaseAdmin.from('chat_handoff').insert({
        session_id: ctx.sessionId || null,
        motivo,
        estado: 'pendiente',
      });

      if (error) {
        console.error('[AGENT_TOOL_ERROR] derivar_a_asesor:', error.message);
        return { error: 'No se pudo derivar automáticamente — decile al cliente que te escriba directo por WhatsApp.' };
      }

      // Pausa Alma en esta sesión — ver el comentario grande arriba de
      // isSessionPaused/pauseSession. Se hace acá, no antes del insert: si
      // el insert de chat_handoff falló, no tiene sentido pausar sin haber
      // registrado la derivación en ningún lado.
      await pauseSession(ctx.supabaseAdmin, ctx.sessionId);

      return { derivado: true, mensaje: 'Derivación registrada. Un asesor humano va a responder en esta misma conversación.' };
    }

    if (name === 'agendar_cita') {
      const nombre = typeof args?.nombre === 'string' ? args.nombre.trim() : '';
      const telefono = typeof args?.telefono === 'string' ? args.telefono.trim() : '';
      if (!nombre || !telefono) return { error: 'Faltan el nombre o el teléfono del cliente para agendar.' };

      const notas = args?.preferencia
        ? `Vía Alma. Preferencia: ${String(args.preferencia).trim().slice(0, 300)}`
        : 'Vía Alma';

      const { error } = await ctx.supabaseAdmin.from('prospectos').insert({
        nombre: nombre.slice(0, 200),
        telefono: telefono.slice(0, 30),
        canal: 'appointment',
        notas,
        session_id: ctx.sessionId || null,
      });

      if (error) {
        console.error('[AGENT_TOOL_ERROR] agendar_cita:', error.message);
        return { error: 'No se pudo registrar la cita en este momento — ofrecé que te contacten por WhatsApp en su lugar.' };
      }
      return { confirmado: true, mensaje: 'Solicitud de cita registrada. La boutique se va a poner en contacto para confirmar fecha y hora.' };
    }

    return { error: `Herramienta desconocida: ${name}` };
  } catch (e: any) {
    console.error(`[AGENT_TOOL_ERROR] ${name}:`, e.message);
    return { error: 'No se pudo consultar el catálogo en este momento.' };
  }
}

// Antes ("Vía Alma (chat)") el texto asumía canal web. Con dos transportes
// posibles ya no es un dato fijo — se saca la mención de canal del texto
// que se guarda en `notas` (arriba) en vez de mantener dos copias.
export function buildSystemPrompt(): string {
  return `Eres "Alma", la conserje digital de Joyería Alianzas, una boutique de alta joyería en Uruguay.
Tu tono es extremadamente sofisticado, elegante, cálido y profesional. Utilizas un lenguaje refinado pero accesible.
Experticia: Posees un conocimiento profundo sobre alianzas matrimoniales, metales preciosos (como Oro 18k, Platino, Oro Rosa) y gemas preciosas.
Misión: Asesorar a los clientes con una atención personalizada de nivel boutique. Debes guiarlos en la elección de la pieza perfecta que simbolice su unión.
Personalidad: Eres persuasiva pero sutil, siempre priorizando la elegancia y la satisfacción del cliente.

Directrices clave:
1. Si te preguntan por precios, materiales, stock o cualquier dato de un producto puntual, usá SIEMPRE las herramientas buscar_productos / ver_producto antes de responder — no inventes esos datos bajo ninguna circunstancia. Si la herramienta no encuentra el producto o no tiene el dato, decí honestamente que no lo tenés a mano y ofrecé buscar algo similar o derivar a la boutique.
2. Los precios que devuelven las herramientas ya están en USD (Dólares Americanos); comunicalos tal cual, sin convertir.
3. Menciona la calidad y el acabado artesanal de las piezas.
4. La boutique está en ${appSettings.boutiqueAddress}. Invitá a los clientes a visitarla si necesitan una experiencia presencial — nunca menciones otra ubicación.
5. Si el cliente parece indeciso, ofrece explicar las diferencias entre los materiales o estilos (clásico, moderno, minimalista).
6. Responde siempre en un registro consistente dentro de un mismo mensaje: no mezcles voseo ("vos", "tenés") y usted ("usted", "tiene") en la misma respuesta.
7. Responde siempre en español.
8. Si el cliente quiere agendar una visita a la boutique, pedile nombre y WhatsApp si todavía no los dio, y recién ahí usá agendar_cita. Vos no manejás la agenda real — no inventes ni confirmes un día u horario específico; decile que la boutique se va a poner en contacto para coordinar.
9. Si el cliente pide explícitamente hablar con una persona, o su pedido queda fuera de lo que resolvés con las herramientas disponibles, usá derivar_a_asesor y avisale que un asesor humano va a seguir la conversación en el mismo chat. No repitas la derivación si ya la hiciste en esta conversación.`;
}

export type AgentEvent =
  | { type: 'delta'; text: string }
  | { type: 'handoff' }
  | { type: 'paused' }
  | { type: 'error'; message: string }
  | { type: 'done' };

export type AgentTurnResult = { reply: string } | { paused: true } | { error: string };

/**
 * Corre un turno completo de Alma: carga historial, guarda el mensaje del
 * usuario, loop de tool-calling contra OpenAI (streaming interno — el
 * proveedor de OpenAI siempre se pide con stream:true para latencia baja
 * del primer token), guarda la respuesta final, devuelve el resultado.
 *
 * `onEvent` es opcional: `/api/chat` (web) lo usa para reenviar cada delta
 * en vivo al navegador vía NDJSON. `/api/agent` (WhatsApp) lo omite —
 * OpenAI igual responde en streaming internamente (más rápido a nivel
 * infra), pero el caller solo necesita el texto final para mandarlo por
 * WhatsApp, no cada fragmento.
 */
export async function runAgentTurn({
  message,
  sessionId,
  supabaseAdmin,
  onEvent,
}: {
  message: string;
  sessionId: string;
  supabaseAdmin: any;
  onEvent?: (evt: AgentEvent) => void;
}): Promise<AgentTurnResult> {
  const emit = onEvent || (() => {});

  try {
    // Últimos 10 mensajes, no los primeros diez — ver nota histórica en
    // versiones previas de /api/chat/route.ts (F5): se pide desc + limit y
    // se revierte en JS para no congelar el contexto en el arranque de la charla.
    const { data: historyDataDesc, error: historyError } = await supabaseAdmin
      .from('chat_messages')
      .select('role, content')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (historyError) throw historyError;
    const historyData = (historyDataDesc || []).slice().reverse();

    const { error: insertUserError } = await supabaseAdmin.from('chat_messages').insert({
      session_id: sessionId,
      role: 'user',
      content: message,
    });
    if (insertUserError) {
      console.error('[AGENT_INSERT_USER_ERROR]', insertUserError.message);
    }

    // Se guarda el mensaje del cliente ANTES de este chequeo a propósito —
    // el asesor humano que sigue la conversación tiene que poder ver lo que
    // el cliente escribió mientras esperaba, aunque Alma ya no le conteste.
    // Lo que se corta acá es únicamente la llamada a OpenAI.
    if (await isSessionPaused(supabaseAdmin, sessionId)) {
      emit({ type: 'paused' });
      return { paused: true };
    }

    const chatMessages: any[] = [
      { role: 'system', content: buildSystemPrompt() },
      ...(historyData || []).map((m: any) => ({ role: m.role, content: m.content })),
      { role: 'user', content: message },
    ];

    let fullReply = '';

    for (let turn = 0; turn < 4; turn++) {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${serverSettings.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: chatMessages,
          temperature: 0.7,
          tools: TOOLS,
          tool_choice: 'auto',
          stream: true,
        }),
      });

      if (!response.ok || !response.body) {
        const errText = await response.text().catch(() => '');
        console.error('[AGENT_STREAM_ERROR] OpenAI', response.status, errText.slice(0, 500));
        emit({ type: 'error', message: 'No se pudo obtener respuesta del asesor' });
        return { error: 'No se pudo obtener respuesta del asesor' };
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let sseBuffer = '';
      let turnContent = '';
      let finishReason: string | null = null;
      const toolCallsAcc: Record<number, { id?: string; name?: string; arguments: string }> = {};

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        sseBuffer += decoder.decode(value, { stream: true });
        const lines = sseBuffer.split('\n');
        sseBuffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) continue;
          const payload = trimmed.slice(5).trim();
          if (payload === '[DONE]') continue;

          let json: any;
          try { json = JSON.parse(payload); } catch { continue; }

          const delta = json.choices?.[0]?.delta;
          const fr = json.choices?.[0]?.finish_reason;
          if (fr) finishReason = fr;

          if (delta?.content) {
            turnContent += delta.content;
            fullReply += delta.content;
            emit({ type: 'delta', text: delta.content });
          }

          if (delta?.tool_calls) {
            for (const tc of delta.tool_calls) {
              const idx = tc.index ?? 0;
              if (!toolCallsAcc[idx]) toolCallsAcc[idx] = { arguments: '' };
              if (tc.id) toolCallsAcc[idx].id = tc.id;
              if (tc.function?.name) toolCallsAcc[idx].name = tc.function.name;
              if (tc.function?.arguments) toolCallsAcc[idx].arguments += tc.function.arguments;
            }
          }
        }
      }

      const toolCallsList = Object.values(toolCallsAcc);

      if (finishReason === 'tool_calls' && toolCallsList.length > 0) {
        // El modelo pidió una o más herramientas: se ejecutan todas, se
        // devuelven los resultados como mensajes `role: tool` y se vuelve a
        // pedir respuesta. Estos mensajes intermedios NO se persisten en
        // chat_messages (esa tabla sólo espera role user/assistant).
        chatMessages.push({
          role: 'assistant',
          content: turnContent || null,
          tool_calls: toolCallsList.map((tc, i) => ({
            id: tc.id || `call_${turn}_${i}`,
            type: 'function',
            function: { name: tc.name, arguments: tc.arguments },
          })),
        });
        for (const tc of toolCallsList) {
          let args: any = {};
          try { args = JSON.parse(tc.arguments || '{}'); } catch { /* argumentos inválidos, se ejecuta con {} */ }
          const result = await runTool(tc.name || '', args, { supabaseAdmin, sessionId });
          // El caller necesita enterarse de la derivación apenas pasa, no
          // recién cuando Alma termina de redactar su despedida.
          if (tc.name === 'derivar_a_asesor' && result?.derivado) {
            emit({ type: 'handoff' });
          }
          chatMessages.push({
            role: 'tool',
            tool_call_id: tc.id,
            content: JSON.stringify(result),
          });
        }
        continue; // siguiente vuelta
      }

      // Sin tool_calls: este turno es la respuesta final.
      break;
    }

    if (!fullReply) {
      console.error('[AGENT_ERROR] Se agotaron las vueltas de tool-calling sin respuesta en texto.');
      emit({ type: 'error', message: 'No se pudo obtener respuesta del asesor' });
      return { error: 'No se pudo obtener respuesta del asesor' };
    }

    const { error: insertAssistantError } = await supabaseAdmin.from('chat_messages').insert({
      session_id: sessionId,
      role: 'assistant',
      content: fullReply,
    });
    if (insertAssistantError) {
      console.error('[AGENT_INSERT_ASSISTANT_ERROR]', insertAssistantError.message);
    }

    emit({ type: 'done' });
    return { reply: fullReply };
  } catch (err: any) {
    console.error('[AGENT_TURN_ERROR]', err.message);
    emit({ type: 'error', message: 'No se pudo procesar el mensaje' });
    return { error: 'No se pudo procesar el mensaje' };
  }
}
