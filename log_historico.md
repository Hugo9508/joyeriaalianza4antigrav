# Registro Histórico de Cambios (Changelog) - Joyería Alianza

Este documento mantiene un registro de los cambios, integraciones y mejoras realizadas en el proyecto `joyeriawp-main`.

## [2026-04-16] - Últimas Actualizaciones

### ✨ Nuevas Características e Integraciones
- **Checkout con Mercado Pago**: Integración de Checkout Pro de Mercado Pago. Se configuró un flujo para solicitar nombre, teléfono, email y barrio, antes de redirigir al checkout alojado de Mercado Pago o generar el link vía el webhook de n8n.
- **Nuevo Ícono / Favicon de la App**: Se reemplazó el icono genérico en `src/app/icon.svg` por el nuevo logo (`JA-logo-letras-grandes.svg`), con las letras "JA" en diseño circular dorado y fondo oscuro.

### 🛠️ Ajustes y Correcciones Técnicas
- **Script de Deploy a GitHub (`🚀 DEPLOY GITHUB.bat`)**: Se mejoró el script de automatización para evitar conflictos antes del push, agregando el comando `git pull --rebase origin main` y mejorando la gestión para el control de versiones en Windows.
- **Requisitos de Node.js**: Se especificó obligatoriamente `"engines": { "node": ">=20.x" }` en el `package.json` de acuerdo a sugerencias de la plataforma (Vercel) para optimizar los deploys a futuro.
- **Estandarización de Marca**: Actualización del nombre del proyecto en múltiples lugares del sitio a "Joyería Alianza".
- **Resolución de Conflictos en Deploy**: Se arreglaron diferencias de código que impedían hacer el deploy sin stashear cambios no listos.

---

## Historial de Commits Recientes
- `23dc403` - feat: nuevo ícono JA logo
- `8f3a3bb` - deploy: actualización completa (Checkout, Node version, fixes)
- `d8bbeef` - deploy script fixes
- `0e60b18` - Actualizaciones del proyecto (10 de abril, 2026)
- `ec8e4e1` - Commit inicial del frontend React Headless (7 de abril, 2026)
