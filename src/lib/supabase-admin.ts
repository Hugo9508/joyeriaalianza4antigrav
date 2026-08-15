import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

/**
 * @fileOverview Cliente de Supabase server-only con la service_role key.
 * Bypassa RLS — por eso NUNCA debe importarse desde un componente 'use client'
 * ni exponerse en el bundle del navegador. El paquete 'server-only' hace fallar
 * el build si alguien lo intenta.
 *
 * Se usa en las rutas API que manejan chat_sessions/chat_messages, que ahora
 * niegan el acceso directo a `anon` (ver supabase/migrations/*_fix_chat_rls_security.sql).
 * Sin SUPABASE_SERVICE_ROLE_KEY configurada, estas rutas fallan en runtime con
 * un error claro — no rompen el build.
 */

let cachedClient: SupabaseClient<Database> | null = null;

export function getSupabaseAdmin(): SupabaseClient<Database> {
  if (cachedClient) return cachedClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      'Supabase admin no configurado: falta NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY. ' +
      'La service_role key se obtiene en Supabase → Project Settings → API (nunca es la anon key).'
    );
  }

  cachedClient = createClient<Database>(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return cachedClient;
}
