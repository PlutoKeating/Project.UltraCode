<div align="center">

<a href="https://ultracode.plutokeating.beer/zh/">
  <img src="./docs/assets/zh/hero-banner.svg" alt="UltraCode v1.2.0 — 说清目标，稳妥交付" width="100%" />
</a>

<br />

[![正式版](https://img.shields.io/badge/%E6%AD%A3%E5%BC%8F%E7%89%88-v1.2.0-ffffff?style=flat-square&labelColor=0a0a0a)](https://github.com/PlutoKeating/Project.UltraCode/releases/latest)
[![官方网站](https://img.shields.io/badge/%E5%AE%98%E6%96%B9%E7%BD%91%E7%AB%99-ultracode.plutokeating.beer-bae6fd?style=flat-square&labelColor=0a0a0a)](https://ultracode.plutokeating.beer/zh/)
[![支持平台](https://img.shields.io/badge/%E6%94%AF%E6%8C%81%E5%B9%B3%E5%8F%B0-macOS%20%7C%20Linux%20%7C%20Windows-d4d4d4?style=flat-square&labelColor=0a0a0a)](https://ultracode.plutokeating.beer/zh/docs/getting-started/)
[![辅助构建](https://img.shields.io/badge/%E8%BE%85%E5%8A%A9%E6%9E%84%E5%BB%BA-UltraCode%20v1.0.0-e5a03d?style=flat-square&labelColor=0a0a0a)](https://github.com/PlutoKeating/Project.UltraCode/releases/tag/v1.0.0)
[![持续集成](https://img.shields.io/github/actions/workflow/status/PlutoKeating/Project.UltraCode/ci.yml?branch=main&style=flat-square&label=%E6%8C%81%E7%BB%AD%E9%9B%86%E6%88%90&labelColor=0a0a0a)](https://github.com/PlutoKeating/Project.UltraCode/actions/workflows/ci.yml)

[English](README.md) · **简体中文** · [العربية](README_AR.md) · [Français](README_FR.md) · [Русский](README_RU.md) · [Español](README_ES.md)

[官方网站](https://ultracode.plutokeating.beer/zh/) • [1 分钟上手指南](https://ultracode.plutokeating.beer/zh/docs/getting-started/) • [系统架构](docs/ARCHITECTURE.md) • [命令参考](docs/API.md)

</div>

**UltraCode（`v1.2.0`）** 是面向官方 **OpenCode V2** 的模型与服务商中立增强层，聚焦 **Goal Engineering（目标工程）**——让你用自然语言说清受众、核心行为与验收标准，把前置调研确认、多角色分工实现、独立代码复核与真实浏览器页面检查串联为稳定闭环，原生支持 **macOS、Linux 与 Windows**，打通 **终端（TUI）、桌面端（Desktop）、网页端（Web）与手机端（Mobile）**。

> [!NOTE]
> **自举开发与构建说明**：UltraCode `v1.2.0` 正式版（涵盖 OpenCode `v2.4+` 全面对齐、持久化里程碑续跑与上游看护金丝雀体系）均使用 **UltraCode `v1.0.0`** 辅助开发与构建完成。

## 核心概览

<div align="center">
  <img src="./docs/assets/zh/workflow-comparison.svg" alt="普通 AI 对话与 UltraCode 工作流对比" width="100%" />
</div>

### 核心特性

- **单一命令与零前置安装**：唯一命令 `ultracode` 与官方 `opencode` 参数和子命令完全互通；安装脚本与 `ultracode upgrade` 会自动检测并安装或更新官方 OpenCode V2（`v2.3.2+`，已验证兼容 `v2.4+`）。
- **全端实时同步体验**：内嵌 `ultracode-conversation` 多触点插件包，打通 Server RPC、TUI 命令面板、OpenCode Desktop（输入框上方 `UltraCode` 胶囊支持双开关与会话目标一键暂停/继续/清除，及 `Settings → UltraCode` 设置页）及网页/手机端（`/goal`、`/review`、`/setup-models`、`/approvals` 与 `/direction`）。
- **双主角色与五位后台专家**：可逆收起重叠原生模式，按 `Shift+Tab` 直接在默认总控 `UltraBuild` 与只读规划 `UltraPlan` 之间切换，后台自动调度 `librarian`、`architect`、`implementer`、`reviewer` 与 `visual-evaluator`（支持通过 `ultracode setup-models` 或 `/setup-models` 一键配置多档角色模型偏好）。
- **证据门禁目标引擎与断点恢复**：统一 `/goal` 与会话里程碑引擎，结合工作区确定性证据校验、上下文压缩目标锚定与停滞熔断保护，中断或重启后安全暂停并可随时恢复；同时内置支持 `--worktree` 与 `--init` 的跨平台 `ultracode ralph run`。
- **纯增量且随时可逆**：不修改官方 OpenCode 二进制程序，不读取或上传任何 API 密钥，完整保留原有 JSONC 注释、快捷键与自定义技能，支持一键干净卸载。

<div align="center">
  <img src="./docs/assets/zh/roles-topology.svg" alt="UltraBuild 与 UltraPlan 双主角色及 5 位后台专家" width="100%" />
</div>

## 快速开始

### 1. 一条命令安装

**macOS / Linux**：

```bash
curl -fsSL https://ultracode.plutokeating.beer/install.sh | bash
```

**Windows（PowerShell）**：

```powershell
irm https://ultracode.plutokeating.beer/install.ps1 | iex
```

> [!TIP]
> 无需预先安装 Node.js、Bun 或 OpenCode。若当前环境尚未安装官方 OpenCode V2，安装脚本会自动通过官方渠道完成安装。

### 2. 选择任意入口启动

```bash
ultracode           # 在当前目录启动终端界面
ultracode desktop   # 打开官方桌面客户端（未安装时自动下载官方安装包）
ultracode pair      # 生成配对链接与二维码，接入浏览器或手机端
```

- **切换主角色**：默认进入 `UltraBuild`；按 `Shift+Tab` 切换至纯只读规划角色 `UltraPlan`。
- **实时切换双开关**：通过 OpenCode Desktop 输入框上方 **UltraCode** 胶囊、`Settings → UltraCode`、TUI 命令面板，或在网页/手机端输入 `/approvals`、`/direction`，实时切换 **命令审批**（默认 `auto`）与 **方向确认**（默认 `manual`）。

## 常用命令参考

| 命令 | 说明 |
| --- | --- |
| `ultracode [args...]` | 启动终端界面，原样透传所有官方 `opencode` 参数、路径与子命令 |
| `ultracode desktop` | 启动已安装的官方 OpenCode Desktop，或下载当前平台官方安装包 |
| `ultracode pair [--remote]` | 输出浏览器与手机端配对链接及二维码 |
| `ultracode setup-models` | 按已配置模型池一键绑定或重置分角色推荐模型 |
| `ultracode upgrade` | 一键更新官方 OpenCode V2 与 UltraCode 并自动同步配置 |
| `ultracode sync` | 幂等同步配置、多触点插件、角色与受管运行时 |
| `ultracode doctor` | 零模型调用快速检查版本、插件、角色与 MCP 状态 |
| `ultracode ralph run <goal>` | 在专用关联 Git 工作树中运行跨会话隔离的 Ralph 循环（支持 `--worktree`、`--init`） |
| `ultracode uninstall --yes` | 干净移除 UltraCode 受管文件与二进制（保留个人配置与备份） |

## 项目目录架构

```text
Project.UltraCode/
├── packages/
│   ├── installer/      # 统一 ultracode CLI、JSONC 无损合并器与 6 平台交叉构建脚本
│   ├── plugin-gui/     # OpenCode Desktop 桌面端插件源码（顶部快捷胶囊与独立设置页）
│   └── config/         # 内嵌 OpenCode 角色、Server/TUI/RPC 多端同步插件与 Ralph 模板
├── scripts/            # 零前置安装脚本（install.sh、install.ps1）与 6 语矢量/分享图生成器
├── website/            # Astro + Starlight 6 国语言官网与文档站点（ultracode.plutokeating.beer）
└── docs/               # 架构设计、命令接口、快速开始、Cloudflare 部署指南与 6 语 SVG 资产
```

## 本地开发与验证

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
> 所有自动化测试均在隔离临时目录与本地桩程序上执行，绝不调用真实大模型或读取用户凭据。

## 更多文档

- **多语言官方网站与教程**（[English](https://ultracode.plutokeating.beer) · [简体中文](https://ultracode.plutokeating.beer/zh/) · [العربية](https://ultracode.plutokeating.beer/ar/) · [Français](https://ultracode.plutokeating.beer/fr/) · [Русский](https://ultracode.plutokeating.beer/ru/) · [Español](https://ultracode.plutokeating.beer/es/)）
- [架构文档](docs/ARCHITECTURE.md) · [命令接口](docs/API.md) · [快速开始](docs/QUICK_START.md) · [Cloudflare 部署](docs/CLOUDFLARE.md)
- 面向 AI Agent 的标准检索索引：[`llms.txt`](https://ultracode.plutokeating.beer/llms.txt) · [`llms-full.txt`](https://ultracode.plutokeating.beer/llms-full.txt)
