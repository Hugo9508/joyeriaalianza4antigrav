# Plan de Trabajo: Fases Próximas (Persistencia y UI/UX)

Este plan detalla los pasos para completar la modernización del sistema, enfocándose en la persistencia de datos (Fase 3) y el refinamiento de la experiencia de usuario (Fase 4).

## 1. Fase 3: Persistencia de Datos (Supabase)
El objetivo es mover el almacenamiento de sesiones y mensajes de la memoria volátil a una base de datos persistente.

- **Configuración de Tablas**: Crear/Verificar tablas `chat_sessions` y `chat_messages` en Lovable Cloud.
- **Migración de Lógica**: 
    - Actualizar `src/app/api/chat-session/route.ts` para registrar sesiones en la BD.
    - Actualizar `src/app/api/messages/route.ts` y el guardado de mensajes en `src/app/api/chat/route.ts` para usar Supabase.
- **Historial de Usuario**: Permitir que el Agente "Alma" recupere el contexto histórico de sesiones anteriores.

## 2. Fase 4: UI/UX y Refinamiento del Agente
Mejorar la presentación visual y la "personalidad" del asistente.

- **Diseño del Widget**: Ajustar colores para que coincidan con la estética de lujo (Oro #d4af37, Marfil #f8f7f6).
- **Indicadores de Carga**: Añadir animaciones de "escribiendo..." en el chat.
- **Personalidad del Agente**: Refinar el system prompt en `src/app/api/chat/route.ts` para ser más sofisticado y persuasivo.
- **Acciones Rápidas**: Añadir botones de sugerencia en el chat (ej: "¿Cómo comprar?", "Ver anillos de compromiso").

## Detalles Técnicos
- Se utilizará el cliente de Supabase ya configurado en `src/lib/supabase.ts`.
- La seguridad se mantendrá mediante RLS y cookies HTTP-only para los IDs de sesión.
