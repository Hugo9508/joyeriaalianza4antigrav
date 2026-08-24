---
titulo: Documentación técnica — Joyería Alianza
fecha: 2026-08-14
actualizado: 2026-08-17
---

# Documentación técnica — Joyería Alianza

## Ronda 1 — Auditoría inicial y agente v2 (14-14 ago)

| # | Documento | Para qué |
|---|---|---|
| 01 | [Arquitectura](./01-arquitectura.md) | Estado actual (AS-IS), objetivo (TO-BE), modelo de datos Supabase, restricción de hosting |
| 02 | [Plan de limpieza](./02-plan-limpieza.md) | 5 fases con checklists, criterios de aceptación y riesgos (superado por [16](./16-plan-ejecucion.md)) |
| 03 | [Agente Alma](./03-agente-alma.md) | Spec del agente v2: prompt completo, contrato de tools, memoria, pausa, guardrails |
| 04 | [Auditoría de seguridad](./04-auditoria-seguridad.md) | 21 hallazgos (SEC-01…SEC-21) con archivo:línea, exploit y fix |
| 05 | [Diagnóstico n8n](./05-diagnostico-n8n.md) | Bugs del workflow en producción y qué conservar de él |
| 06 | [Runbook](./06-runbook.md) | Operación, variables de entorno reales, despliegue, rotación de claves |
| 07 | [ADR-001](./07-adr-001-donde-vive-el-agente.md) | Dónde vive el agente: n8n vs. app web. Decisión y condición que la revierte |
| 08 | [Prompt para Lovable](./08-prompt-lovable-ejecucion.md) | Prompt de ejecución F1→F2→F3→F5 pensado para pegar en Lovable/Antigravity |

## Ronda 2 — Auditoría post-Lovable y fixes de seguridad (15 ago)

| # | Documento | Para qué |
|---|---|---|
| 09 | [Auditoría post-Lovable](./09-auditoria-post-lovable.md) | Qué de la ronda 1 quedó bien, a medias o empeoró — código real leído vía device bridge |
| 10 | [Fixes aplicados (seguridad)](./10-fixes-aplicados.md) | RLS de Supabase, service_role server-only, correcciones escritas y verificadas con build |
| 11 | [Schema del monitor de salud](./11-monitor-schema.sql) | Panel multi-proyecto de agencia (no específico de este cliente) |
| 12 | [n8n Supabase keep-alive](./12-n8n-supabase-keepalive.json) | Workflow de n8n para mantener vivo el proyecto Supabase gratuito |

## Ronda 3 — Identidad premium, deuda técnica y ejecución (17 ago)

| # | Documento | Para qué |
|---|---|---|
| 13 | [Identidad Premium](./13-identidad-premium.md) | Auditoría de dirección de arte: contraste WCAG, paleta parasitaria, plan de elevación visual |
| 14 | [Deuda técnica](./14-deuda-tecnica.md) | Barrido de lógica rota: chat duplicado, leads perdidos, botones muertos, ~30 archivos sin uso |
| 15 | [**Plan maestro**](./15-plan-maestro.md) | Consolida 13+14 en una lista priorizada por impacto/esfuerzo |
| 16 | [**Plan de ejecución**](./16-plan-ejecucion.md) | **Empezá acá si vas a tocar código.** F0-F6, con verificación por fase |
| 17 | [Fixes aplicados (F1-F5)](./17-fixes-f1-f5-aplicados.md) | Qué de 16 se aplicó y verificó, qué quedó afuera y por qué, qué falta de tu lado |

---

## Estado actual (17 ago, fin de F1-F5)

El embudo roto (F1), las fallas silenciosas (F2), el sistema de diseño (F3), la limpieza de código muerto (F4) y el tool-calling real de Alma (F5) están aplicados y verificados con build en el dispositivo real. Ver [17](./17-fixes-f1-f5-aplicados.md) para el detalle completo, incluida la lista de acciones pendientes de tu lado (borrado manual de archivos muertos, índice SQL, confirmación de RLS/service_role y del número de WhatsApp correcto).

## Los 3 hallazgos que importaron en la ronda 1 (contexto histórico)

1. **`buscar_producto` en n8n apuntaba a `https://TU-WORDPRESS.com`** — el placeholder del template, sin reemplazar. Resuelto.
2. **`src/lib/checkout.ts` no tenía `'use server'`** — el precio viajaba desde el navegador sin autenticación. Resuelto (ver [10](./10-fixes-aplicados.md)); el archivo inseguro sigue en el repo sin usar, ver [17](./17-fixes-f1-f5-aplicados.md) punto 1 de pendientes.
3. **La pausa del handoff no funcionaba en web.** Ver [05](./05-diagnostico-n8n.md).

## La decisión pendiente

**¿El sitio se queda en Hostinger o va a Vercel?** Ver [ADR-001](./07-adr-001-donde-vive-el-agente.md).
