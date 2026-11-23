# Changelog

## v1.0.0 - 2026-11-23

首个正式版（Built with UltraCode v0.3.0）：

- **正式版 v1.0.0 与仓库架构收敛**：核心运行时包统一收敛至 `packages/`（`packages/installer`、`packages/plugin-gui`、`packages/config`），安装脚本归入 `scripts/`，设计规范与历史记录归入 `docs/`，根目录结构清晰直观。
- **联合国 6 大官方语言全面覆盖**：仓库根目录提供英（`README.md`）、中（`README_ZH.md`）、阿（`README_AR.md`）、法（`README_FR.md`）、俄（`README_RU.md`）、西（`README_ES.md`）6 语文档；生产官网 `https://ultracode.plutokeating.beer` 切换默认根路径 `/` 为国际通用英文，并完整覆盖 `/zh/`、`/ar/`（原生 RTL 右向排版）、`/fr/`、`/ru/`、`/es/` 首页与全部上手文档。
- **全套 SEO / AEO / GEO 搜索与生成式引擎优化**：补齐自引用 `canonical`、6 语言双向 `hreflang` + `x-default`、OpenGraph / Twitter 分享大图卡片、Schema.org `JSON-LD` 结构化实体图谱（`SoftwareApplication` / `WebSite` / `Organization` / `TechArticle` / `BreadcrumbList` / `FAQPage`）、放行主流 AI 检索爬虫的 `robots.txt`，以及构建期自动同步生成的 `/llms.txt` 与 `/llms-full.txt`。

## v0.3.0 - 2026-11-23

统一为单一命令 `ultracode` 的全平台、全触点版本：

- **单一命令与零前置安装**：全面统一为 `ultracode`（移除旧短命令与历史迁移包袱），完整透传所有 `opencode` 参数与子命令；`install.sh`、`install.ps1` 与 `ultracode upgrade` 自动检测并安装/更新官方 OpenCode V2，采用极简进度与就绪输出。
- **Windows 原生一等公民**：新增 `windows-x64` 与 `windows-arm64` 原生独立编译二进制、PowerShell 一键安装脚本 `install.ps1`、Windows 原生路径/无锁替换，以及跨平台 TypeScript 原生 `ultracode ralph run`。
- **OpenCode 全触点插件与桌面启动器**：`ultracode-conversation` 升级为 Server RPC（及面向 Web/Mobile 的零模型调用 `/approvals`、`/direction` 开关命令）+ TUI + OpenCode Desktop GUI（`./gui-experimental`，提供输入框上方 `UltraCode` 胶囊开关与独立 `Settings → UltraCode` 页面）一体化插件包，多端状态实时同步；新增 `ultracode desktop` 启动或下载官方桌面客户端。

## v0.2.2

主角色定名为 UltraBuild（默认执行与协调）和 UltraPlan（规划）。升级会迁移未修改的托管旧角色与对应的默认选择。

## v0.2.1

修复已有插件、MCP、权限及托管文件的身份与所有权冲突。安装验收读取宿主活动状态；升级后由新二进制执行同步。

## v0.2.0

普通对话支持模型自主安排里程碑、后台子任务和独立评审。TUI 提供独立的权限审批与方向询问开关。稳定包在一个 Linux runner 交叉编译四个平台并生成 SHA-256。

## v0.1.0 - 2026-11-22

First stable release.
