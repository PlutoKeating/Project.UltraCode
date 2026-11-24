<div align="center">

<a href="https://ultracode.plutokeating.beer/es/">
  <img src="./docs/assets/es/hero-banner.svg" alt="UltraCode v1.1.1 — Define el objetivo. Entrega trabajo verificado." width="100%" />
</a>

<br />

[![Versión](https://img.shields.io/badge/Versi%C3%B3n-v1.1.1-ffffff?style=flat-square&labelColor=0a0a0a)](https://github.com/PlutoKeating/Project.UltraCode/releases/latest)
[![Sitio web](https://img.shields.io/badge/Sitio%20web-ultracode.plutokeating.beer-bae6fd?style=flat-square&labelColor=0a0a0a)](https://ultracode.plutokeating.beer/es/)
[![Plataformas](https://img.shields.io/badge/Plataformas-macOS%20%7C%20Linux%20%7C%20Windows-d4d4d4?style=flat-square&labelColor=0a0a0a)](https://ultracode.plutokeating.beer/es/docs/getting-started/)
[![Construido con](https://img.shields.io/badge/Construido%20con-UltraCode%20v1.0.0-e5a03d?style=flat-square&labelColor=0a0a0a)](https://github.com/PlutoKeating/Project.UltraCode/releases/tag/v1.0.0)
[![Integración](https://img.shields.io/github/actions/workflow/status/PlutoKeating/Project.UltraCode/ci.yml?branch=main&style=flat-square&label=Integraci%C3%B3n&labelColor=0a0a0a)](https://github.com/PlutoKeating/Project.UltraCode/actions/workflows/ci.yml)

[English](README.md) · [简体中文](README_ZH.md) · [العربية](README_AR.md) · [Français](README_FR.md) · [Русский](README_RU.md) · **Español**

[Sitio oficial](https://ultracode.plutokeating.beer/es/) • [Inicio rápido en 1 minuto](https://ultracode.plutokeating.beer/es/docs/getting-started/) • [Roles y flujo](https://ultracode.plutokeating.beer/es/docs/roles-and-workflow/) • [Referencia CLI](https://ultracode.plutokeating.beer/es/docs/controls-and-maintenance/)

</div>

**UltraCode (`v1.1.1`)** es una capa de mejora no invasiva y neutral frente a proveedores y modelos, construida sobre **OpenCode V2** oficial para **macOS, Linux y Windows** — unificada en **Terminal (TUI), aplicación de Escritorio, Web y Móvil**.

En lugar de adivinar antes de tiempo o perder el rumbo a mitad de una tarea compleja, UltraCode aclara los requisitos clave al inicio mediante tarjetas de opciones, delega la ejecución en especialistas en segundo plano, inspecciona la interfaz renderizada en un navegador Chromium real y guarda traspasos persistentes en tu repositorio.

> [!NOTE]
> **Construcción autoalojada:** UltraCode `v1.1.1` — incluida su compatibilidad verificada con OpenCode `v2.4+`, sus hitos persistentes de sesión y su sistema de vigilancia de versiones — fue desarrollado y construido con **UltraCode `v1.0.0`**.

## Descripción general

<div align="center">
  <img src="./docs/assets/es/workflow-comparison.svg" alt="Comparación entre chat de IA estándar y flujo UltraCode" width="100%" />
</div>

### Capacidades clave

- **Un solo comando, cero requisitos previos**: el único comando `ultracode` es totalmente compatible con todas las banderas y subcomandos de `opencode`. El instalador y `ultracode upgrade` detectan, instalan o actualizan automáticamente OpenCode V2 oficial (`v2.3.2+`, verificado en `v2.4+`).
- **Sincronización en vivo en cada superficie**: el paquete integrado `ultracode-conversation` sincroniza el estado en tiempo real entre Server RPC, la paleta de comandos TUI, OpenCode Desktop (cápsula rápida sobre el editor con pausa, reanudación y limpieza del objetivo en un clic y página `Settings → UltraCode`) y Web/Móvil (`/goal`, `/review`, `/setup-models`, `/approvals` y `/direction`).
- **Dos roles principales + cinco especialistas**: cambia directamente con `Shift+Tab` entre `UltraBuild` (entrega de extremo a extremo) y `UltraPlan` (planificación de solo lectura), respaldados automáticamente por `librarian`, `architect`, `implementer`, `reviewer` y `visual-evaluator` (con recomendación opcional de modelos por rol mediante `ultracode setup-models`).
- **Motor de objetivos con compuertas de evidencia**: unifica `/goal` y los hitos de sesión con verificación determinista, anclaje de objetivo tras compactación y pausa segura ante interrupciones o reinicios; incluye el ejecutor `ultracode ralph run` (`--worktree`, `--init`).
- **Estrictamente aditivo y reversible**: nunca modifica los binarios oficiales de OpenCode, nunca lee ni transmite tus claves API, conserva comentarios JSONC y skills personalizados, y se desinstala limpiamente.

<div align="center">
  <img src="./docs/assets/es/roles-topology.svg" alt="Roles principales UltraBuild y UltraPlan más 5 especialistas" width="100%" />
</div>

## Inicio rápido

### 1. Instalación en una línea

**macOS / Linux**:

```bash
curl -fsSL https://ultracode.plutokeating.beer/install.sh | bash
```

**Windows (PowerShell)**:

```powershell
irm https://ultracode.plutokeating.beer/install.ps1 | iex
```

> [!TIP]
> No necesitas instalar previamente Node.js, Bun ni OpenCode: si falta OpenCode V2 oficial, el script lo instala automáticamente desde el canal oficial.

### 2. Inicia en cualquier superficie

```bash
ultracode           # Abre la interfaz de terminal en el directorio actual
ultracode desktop   # Inicia OpenCode Desktop (o descarga el instalador oficial si falta)
ultracode pair      # Genera enlace y código QR para acceso desde navegador o móvil
```

- **Cambio de rol**: pulsa `Shift+Tab` para alternar entre `UltraBuild` (por defecto) y `UltraPlan` (solo lectura).
- **Interruptores en tiempo real**: alterna **la aprobación de comandos** (`auto` por defecto) y **las preguntas de dirección** (`manual` por defecto) desde la cápsula `UltraCode` en Desktop, `Settings → UltraCode`, la paleta TUI o `/approvals` y `/direction` en Web y Móvil.

## Referencia CLI

| Comando | Descripción |
| --- | --- |
| `ultracode [args...]` | Inicia OpenCode pasando directamente todas las banderas, rutas y subcomandos |
| `ultracode desktop` | Abre OpenCode Desktop oficial o descarga el instalador de tu plataforma |
| `ultracode pair [--remote]` | Vincula un navegador o dispositivo móvil mediante enlace y código QR |
| `ultracode setup-models` | Configura preferencias opcionales de modelos por rol |
| `ultracode upgrade` | Actualiza conjuntamente OpenCode V2 oficial y UltraCode y sincroniza ajustes |
| `ultracode sync` | Sincroniza de forma idempotente configuración, plugin, roles y runtime |
| `ultracode doctor` | Verifica versión, plugin, roles y MCP sin realizar llamadas a modelos |
| `ultracode ralph run <goal>` | Ejecuta iteraciones aisladas de Ralph en un árbol de trabajo Git vinculado |
| `ultracode uninstall --yes` | Elimina UltraCode limpiamente conservando tus configuraciones y respaldos |

## Estructura del repositorio

```text
Project.UltraCode/
├── packages/
│   ├── installer/      # CLI unificado ultracode, fusión JSONC y compilador autónomo para 6 plataformas
│   ├── plugin-gui/     # Plugin gráfico de OpenCode Desktop (cápsula rápida y página de ajustes)
│   └── config/         # Roles integrados de OpenCode, plugin Server/TUI/RPC y plantillas Ralph
├── scripts/            # Scripts de instalación (install.sh, install.ps1) y generador SVG/OG en 6 idiomas
├── website/            # Sitio oficial y documentación Astro + Starlight en 6 idiomas
└── docs/               # Arquitectura, API, inicio rápido, despliegue en Cloudflare y recursos SVG en 6 idiomas
```

## Verificación local

```bash
bun install --cwd packages/plugin-gui
bun run --cwd packages/plugin-gui check
bun run --cwd packages/plugin-gui build

bun install --cwd packages/installer
bun test --cwd packages/installer
bun run --cwd packages/installer check
bun run --cwd packages/installer build

bun install --cwd website
bun run --cwd website check
bun run --cwd website build
```

> [!IMPORTANT]
> Las pruebas automatizadas se ejecutan íntegramente sobre directorios temporales aislados y stubs locales, sin invocar modelos reales ni leer credenciales personales.

## Documentación

- **Sitio oficial y guías** ([English](https://ultracode.plutokeating.beer) · [简体中文](https://ultracode.plutokeating.beer/zh/) · [العربية](https://ultracode.plutokeating.beer/ar/) · [Français](https://ultracode.plutokeating.beer/fr/) · [Русский](https://ultracode.plutokeating.beer/ru/) · [Español](https://ultracode.plutokeating.beer/es/))
- [Inicio rápido](https://ultracode.plutokeating.beer/es/docs/getting-started/) · [Ingeniería de objetivos](https://ultracode.plutokeating.beer/es/docs/goal-engineering/) · [Roles y especialistas](https://ultracode.plutokeating.beer/es/docs/roles-and-workflow/) · [Control y CLI](https://ultracode.plutokeating.beer/es/docs/controls-and-maintenance/) · [FAQ](https://ultracode.plutokeating.beer/es/docs/faq/)
- Índice legible por agentes de IA: [`llms.txt`](https://ultracode.plutokeating.beer/llms.txt) · [`llms-full.txt`](https://ultracode.plutokeating.beer/llms-full.txt)
