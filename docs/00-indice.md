---
titulo: Documentación técnica — Joyería Alianza
fecha: 2026-08-14
---

# Documentación técnica — Joyería Alianza

| # | Documento | Para qué |
|---|---|---|
| 01 | [Arquitectura](./01-arquitectura.md) | Estado actual (AS-IS), objetivo (TO-BE), modelo de datos Supabase, restricción de hosting |
| 02 | [**Plan de limpieza**](./02-plan-limpieza.md) | **Empezá acá.** 5 fases con checklists, criterios de aceptación y riesgos |
| 03 | [Agente Alma](./03-agente-alma.md) | Spec del agente v2: prompt completo, contrato de tools, memoria, pausa, guardrails |
| 04 | [Auditoría de seguridad](./04-auditoria-seguridad.md) | 21 hallazgos (SEC-01…SEC-21) con archivo:línea, exploit y fix |
| 05 | [Diagnóstico n8n](./05-diagnostico-n8n.md) | Bugs del workflow en producción y qué conservar de él |
| 06 | [Runbook](./06-runbook.md) | Operación, variables de entorno reales, despliegue, rotación de claves |
| 07 | [ADR-001](./07-adr-001-donde-vive-el-agente.md) | Dónde vive el agente: n8n vs. app web. Decisión y condición que la revierte |

---

## Los 3 hallazgos que importan hoy

1. **`buscar_producto` en n8n apunta a `https://TU-WORDPRESS.com`** — el placeholder del template, sin reemplazar. Alma inventó todos los datos de producto desde que está en producción. → [02](./02-plan-limpieza.md#f01--arreglar-buscar_producto-en-n8n-)

2. **`src/lib/checkout.ts` no tiene `'use server'`** y se importa desde un componente cliente. El precio viaja desde el navegador a un webhook n8n sin autenticación. Un `curl` con `amount: 1` devuelve un link de pago legítimo de Mercado Pago. → [04](./04-auditoria-seguridad.md)

3. **La pausa del handoff no funciona en web.** El filtro compara `chat_handoff.client_phone` contra un `sessionId` que en web es `web_<timestamp>`. La asesora no puede tomar el control justo cuando se cierra la venta. → [05](./05-diagnostico-n8n.md)

## La decisión pendiente

**¿El sitio se queda en Hostinger o va a Vercel?** Bloquea la Fase 4 (agente nativo). Ver [ADR-001](./07-adr-001-donde-vive-el-agente.md).
