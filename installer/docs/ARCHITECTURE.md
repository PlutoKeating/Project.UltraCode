# Installer 架构

CLI 是小接口；`paths`、`install`、`config`、`runtime`、`release` 和 `opencode` 模块封装实现。

- `config.ts`：使用 `jsonc-parser` 保留注释，递归补键、数组追加去重、冲突保留、精确删除。
- `install.ts`：备份、原子写入、文件清单、本地修改保护、apply/doctor/uninstall。
- `runtime.ts`：通过独立二进制的 Bun 子进程能力管理固定 Ralph/Playwright；源码归档 SHA-256。
- `release.ts`：GitHub 稳定 Release、平台资产、SHA-256、自更新与官方 OpenCode 升级。
- `opencode.ts`：只调用版本和升级，不读取 Provider、不调用模型。
- `assets.ts`：把公开 Provider 中立角色、命令和模板嵌入独立二进制。

测试 seam 是公开 apply/uninstall 和 JSONC 接口；外部进程通过 `ULTRACODE_OPENCODE_BIN` 注入伪 Adapter。
