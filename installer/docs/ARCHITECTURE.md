# Installer 架构

CLI 是小接口，核心实现分布在 `installer/src/` 下 12 个模块：

- `cli.ts`：命令行入口（`apply` / `sync` / `doctor` / `update` / `up` / `uninstall` / `mcp` / `ralph` / `version`）。
- `install.ts`：备份、原子写入、文件清单、本地修改保护、旧版斜杠命令退役清理，以及 `apply` / `doctor` / `uninstall` 主流程。
- `config.ts`：使用 `jsonc-parser` 保留注释，递归补键、数组追加去重、冲突保留、精确删除。
- `components.ts`：按插件身份、权限与 MCP 启动契约识别冲突并复用等价 Playwright MCP。
- `managed.ts`：生成 UltraCode 受管配置基线（`default_agent: "UltraBuild"`、权限、压缩、MCP 与插件列表）。
- `manifest.ts`：读写 schema v2 安装清单（记录文件哈希与受管配置所有权）。
- `runtime.ts`：通过独立二进制的 Bun 子进程能力管理固定 Ralph / Playwright 与浏览器；校验源码归档 SHA-256。
- `release.ts`：GitHub 稳定 Release、平台资产、SHA-256 校验、自更新与官方 OpenCode 升级。
- `opencode.ts`：仅调用版本查询、API 注册状态检查和官方升级，不读取 Provider 凭据、不调用模型。
- `assets.ts`：把公开 Provider 中立主/子角色、对话插件（server/tui/settings）、Ralph 启动器与模板嵌入独立二进制。
- `paths.ts`：解析 XDG、`OPENCODE_CONFIG_DIR` 与 `ULTRACODE_*` 路径。
- `fs.ts`：原子写入、SHA-256 哈希、备份与可执行权限等文件原语。

测试 seam 是公开 `apply`/`uninstall` 和 JSONC 接口；外部进程通过 `ULTRACODE_OPENCODE_BIN` 注入伪 Adapter。

普通对话插件随 CLI 嵌入并注册 server（`ultracode-conversation`）和 TUI（`ultracode-conversation-ui`）入口。权限钩子只处理 `ask`，方向询问由提示词引导。原生 `experimental.idle` 钩子取出模型登记的一次性下一里程碑；新的用户输入清除旧调度。

安装器按插件身份、权限的 `action`/`resource` 和 MCP 启动配置识别冲突。等价的 Playwright MCP 可复用，视觉评审角色使用对应的工具名。配置清单记录安装器实际添加的字段和数组成员。旧版清单通过可验证的安装前备份迁移；来源无法确认时保留原值。

`uc doctor` 检查当前项目实际注册的角色、Superpowers 和 UltraCode 插件的活动状态，以及所选浏览器 MCP 的连接状态。

主角色 `UltraBuild`（总协调与执行，默认）和 `UltraPlan`（规划）直接安装在 `agents/`，可用 `Shift+Tab` 切换；5 个后台子代理安装在 `agents/ultracode/`。
