# Installer 架构

CLI 是小接口；`paths`、`install`、`config`、`runtime`、`release` 和 `opencode` 模块封装实现。

- `config.ts`：使用 `jsonc-parser` 保留注释，递归补键、数组追加去重、冲突保留、精确删除。
- `install.ts`：备份、原子写入、文件清单、本地修改保护、apply/doctor/uninstall。
- `runtime.ts`：通过独立二进制的 Bun 子进程能力管理固定 Ralph/Playwright；源码归档 SHA-256。
- `release.ts`：GitHub 稳定 Release、平台资产、SHA-256、自更新与官方 OpenCode 升级。
- `opencode.ts`：只调用版本和升级，不读取 Provider、不调用模型。
- `assets.ts`：把公开 Provider 中立角色、命令和模板嵌入独立二进制。

测试 seam 是公开 apply/uninstall 和 JSONC 接口；外部进程通过 `ULTRACODE_OPENCODE_BIN` 注入伪 Adapter。

普通对话插件随 CLI 嵌入并注册 server 和 TUI 入口。权限钩子只处理 ask，方向询问由提示词引导。原生 idle 钩子取出模型登记的一次性下一里程碑；新的用户输入清除旧调度。

安装器按插件身份、权限的 action/resource 和 MCP 启动配置识别冲突。等价的 Playwright MCP 可复用，视觉评审角色使用对应的工具名。配置清单记录安装器实际添加的字段和数组成员。旧版清单通过可验证的安装前备份迁移；来源无法确认时保留原值。

`uc doctor` 检查当前项目实际注册的角色、Superpowers 和 UltraCode 插件的活动状态，以及所选浏览器 MCP 的连接状态。
