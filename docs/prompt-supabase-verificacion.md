# Prompt para el agente con acceso a Supabase — Joyería Alianzas

Contexto para pegar tal cual en una sesión que tenga conexión real (MCP o CLI) al proyecto Supabase de Joyería Alianzas, **ref `jqzdtbxsehjyyyxukyaj`** (esta sesión tenía herramientas de Supabase disponibles, pero conectadas a una cuenta distinta con otros proyectos — ninguno es este — así que nada de lo de abajo se ejecutó, solo se dejó listo).

**Actualizado 2026-08-24** — desde la versión anterior de este prompt se activó `/api/agent` y el mecanismo de pausa por handoff (ver `17-fixes-f1-f5-aplicados.md`, Addendums 4 y 5). Dos cosas cambiaron de ubicación/alcance en el código y se ajustaron abajo: la tool `derivar_a_asesor` ahora vive en `src/lib/agent/core.ts` (antes estaba inline en `/api/chat/route.ts`), y se agregó un ítem nuevo sobre el índice de `chat_sessions.metadata` para búsqueda por WhatsApp — de prioridad baja, porque ese canal quedó pausado por decisión del dueño (no se va a usar WhatsApp por ahora).

---

## Prompt

```
Trabajás sobre el proyecto Supabase de Joyería Alianzas, ref jqzdtbxsehjyyyxukyaj
(organización: la del dueño de la boutique). Antes de escribir nada, hacé un
paso de VERIFICACIÓN de solo lectura y reportá lo que encontrás — varias
partes del código de la app (Next.js) se escribieron adivinando nombres de
tabla/columna porque nadie tenía acceso de escritura al proyecto real. Recién
después de confirmar, aplicá los cambios de la sección 2.

## 1. Verificación (solo lectura, reportar antes de tocar nada)

1a. Listá las tablas del schema public con columnas (list_tables verbose, o
    \d+ si es CLI/psql). Confirmá cuáles de estas existen tal cual y con qué
    columnas: `chat_messages`, `chat_sessions`, `productos`, `chat_handoff`,
    `handoff`, `sync_log`, `clients`, `transactions`, `prospectos`.

1b. Específicamente para `chat_handoff` (o `handoff`, la que exista — puede
    que existan las dos, en cuyo caso decime cuál tiene un consumidor
    intencional): ¿tiene columnas compatibles con `session_id` (texto),
    `motivo` (texto) y `estado` (texto)? El código nuevo
    (`src/lib/agent/core.ts`, función `runTool`, caso `derivar_a_asesor` —
    antes vivía inline en `src/app/api/chat/route.ts`, se movió ahí cuando se
    unificó el cerebro de Alma para web y WhatsApp, ver ADR-001) hace:
      INSERT INTO chat_handoff (session_id, motivo, estado)
      VALUES ($1, $2, 'pendiente');
    Si la tabla real tiene otros nombres de columna (o es `handoff` en vez de
    `chat_handoff`), decime el nombre/columnas correctos para que el código
    se ajuste — no hace falta que vos edites el código, solo confirmame el
    schema real.

1c. Para `prospectos`: la app hace inserts desde tres lugares (`/api/leads`,
    el modal "Agendar Cita" del footer vía una función que arma el pedido, y
    la tool `agendar_cita` de Alma, ahora en `src/lib/agent/core.ts`) con
    estas columnas: `nombre`, `telefono`, `email` (solo desde /api/leads),
    `barrio` (solo desde /api/leads), `canal`, `notas`, `session_id`.
    Confirmá que existan y con esos nombres exactos (o decime la traducción
    correcta).

1d. Confirmá si existe ya un índice en `chat_messages(session_id, created_at)`
    o equivalente — la app pagina el historial de chat por session_id
    ordenando por created_at en cada mensaje nuevo (ver `runAgentTurn()` en
    `src/lib/agent/core.ts`, `/api/messages`), y sin índice compuesto eso es
    table scan a medida que crece la tabla.

1e. RLS: confirmá que `chat_messages`, `chat_sessions`, `chat_handoff`/
    `handoff` y `prospectos` tienen RLS activado con políticas que SOLO
    permiten acceso vía `service_role` (la app usa `SUPABASE_SERVICE_ROLE_KEY`
    del lado del servidor, nunca la anon key, para escribir en estas tablas —
    confirmá que la anon key efectivamente no puede leer/escribir ninguna).
    Corré get_advisors (tipo security) y reportá cualquier tabla pública sin
    RLS o con políticas demasiado abiertas.

1f. Confirmá que la variable de entorno `SUPABASE_SERVICE_ROLE_KEY` que usa
    el hosting de producción (Vercel, ya confirmado cargada en esta ronda —
    ver `18-checklist-variables-vercel.md`) es la del proyecto
    jqzdtbxsehjyyyxukyaj y no la de un proyecto viejo — el repo tenía un
    cliente muerto (`src/lib/supabase.ts`, ya sin importadores) apuntando a
    un proyecto distinto (`lgdhnkfxberjzctgywiz`) como fallback hardcodeado;
    confirmá que ninguna variable de entorno en producción siga apuntando
    ahí.

1g. (Prioridad baja — el canal de WhatsApp quedó pausado por decisión del
    dueño, no se va a usar por ahora; verificar esto solo si en algún
    momento se retoma esa idea.) `chat_sessions.metadata` es una columna
    jsonb con schema confirmado (no es una tabla adivinada como las de
    arriba). Sobre ella se construyeron dos usos nuevos: (i) el mecanismo de
    pausa por handoff humano, que guarda `{paused: true, paused_at: ...}`
    dentro de `metadata` — no necesita índice, se busca siempre por `id`; y
    (ii) `resolveWhatsappSession()` en `src/app/api/agent/route.ts`, que
    busca sesiones por `metadata->>whatsapp_id` para resolver el contacto
    real de WhatsApp a un `chat_sessions.id` interno. Para (ii): confirmá si
    existe (o valdría la pena crear) un índice único sobre esa expresión
    (`CREATE UNIQUE INDEX ... ON chat_sessions ((metadata->>'whatsapp_id'))`)
    — sin él, dos mensajes casi simultáneos del mismo contacto nuevo podrían
    crear dos filas de sesión en vez de reusar una. Como ese endpoint todavía
    no lo llama nada (WhatsApp pausado), esto no es urgente.

## 2. Cambios a aplicar (solo después de 1a-1g, y solo lo que aplique)

2a. Si 1d confirma que falta el índice, aplicá esta migración:

    CREATE INDEX IF NOT EXISTS idx_chat_messages_session_created
      ON public.chat_messages (session_id, created_at);

2b. Si 1b confirma que `chat_handoff` no existe con esas columnas (por
    ejemplo, la tabla real es `handoff`, o le faltan columnas), generá la
    migración que corresponda — CREATE TABLE si no existe ninguna variante
    utilizable, o ALTER TABLE si existe pero le faltan columnas. Priorizá no
    duplicar `handoff`/`chat_handoff` si las dos existen y ninguna tiene uso
    real: quedate con una sola y decime cuál para actualizar el código.

2c. Si 1e encuentra tablas sin RLS o con políticas abiertas de más, proponé
    (no apliques sin avisar primero, esto puede romper accesos que n8n usa
    hoy) las políticas que restrinjan a service_role.

2d. Solo si en 1g decidís que vale la pena (o si te confirman que se va a
    retomar WhatsApp pronto): aplicá el índice único sobre
    `metadata->>'whatsapp_id'` en `chat_sessions`.

## 3. Fuera de alcance de este prompt (no lo resuelvas, solo repórtalo si lo ves)

- Si hay una tabla de "clients" o "transactions" con datos reales de
  clientes, NO los expongas en tu respuesta ni los cites textualmente —
  solo confirmá estructura (nombres de columna), no contenido.
- Decisión de negocio (no técnica): si `chat_handoff`/`handoff` no tiene
  ningún consumidor hoy fuera de n8n, preguntale al dueño de la boutique si
  quiere que además se dispare una notificación en tiempo real (WhatsApp,
  email, Slack) cuando entra un handoff nuevo, en vez de que se entere solo
  cuando entra a mirar la tabla. Si la respuesta es sí, hace falta una URL de
  webhook de n8n nueva (`N8N_HANDOFF_WEBHOOK_URL` o similar) — la app ya
  tiene el patrón armado en `/api/checkout` para llamar un webhook de n8n,
  solo faltaría la URL y replicar el patrón en el handler de la tool.
```

---

## Por qué esto quedó como prompt y no aplicado

Esta sesión tenía herramientas de Supabase disponibles (MCP), pero conectadas a una cuenta con otros proyectos — ninguno con el ref `jqzdtbxsehjyyyxukyaj` del proyecto real de la joyería. No se tocó ninguno de esos proyectos ajenos. Para ejecutar lo de arriba hace falta una sesión conectada a la cuenta/proyecto correcto.
