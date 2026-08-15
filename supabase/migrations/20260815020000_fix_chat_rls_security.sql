-- Fix de seguridad: la migración anterior (20260814013207) dejó chat_sessions y
-- chat_messages legibles y escribibles públicamente vía USING (true) para el rol
-- `anon` — que es el rol de la clave pública ya embebida en el navegador. Eso
-- permite a cualquiera con la anon key volcar todas las conversaciones de chat
-- de todos los clientes directamente desde la API de Supabase.
--
-- A partir de ahora, todo el acceso a estas tablas pasa por las rutas API de
-- Next.js usando la service_role key (server-only, ver src/lib/supabase-admin.ts),
-- que bypassa RLS. Se revoca por completo el acceso de `anon` y `authenticated`.

DROP POLICY IF EXISTS "Allow public select sessions" ON public.chat_sessions;
DROP POLICY IF EXISTS "Allow public insert sessions" ON public.chat_sessions;
DROP POLICY IF EXISTS "Allow public update sessions" ON public.chat_sessions;
DROP POLICY IF EXISTS "Allow public select messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Allow public insert messages" ON public.chat_messages;

REVOKE SELECT, INSERT, UPDATE, DELETE ON public.chat_sessions FROM anon;
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.chat_sessions FROM authenticated;
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.chat_messages FROM anon;
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.chat_messages FROM authenticated;

-- RLS queda ENABLE (ya lo estaba) sin ninguna policy para anon/authenticated,
-- lo que en Postgres significa acceso denegado por defecto. Solo service_role
-- (que ignora RLS) puede leer o escribir, y esa key solo se usa server-side.
