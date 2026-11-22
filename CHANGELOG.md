# Changelog

## v0.2.1

修复已有插件、MCP、权限及托管文件的身份与所有权冲突。安装验收读取宿主活动状态；升级后由新二进制执行同步。


## v0.2.0

普通对话支持模型自主安排里程碑、后台子任务和独立评审。TUI 提供独立的权限审批与方向询问开关。稳定包在一个 Linux runner 交叉编译四个平台并生成 SHA-256。


## v0.1.0 - 2026-11-22

First stable release.

### Features

- Provider-neutral OpenCode roles, workflows, Ralph loops, and visual QA.
- Standalone `ultracode` / `uc` installer for Linux and macOS.
- Maximum-union JSONC configuration, backups, and precise uninstall.
- Private Ralph and Playwright runtime with no global Node/Bun requirement.
- Official OpenCode upgrade integration through `uc up` and `uc sync`.
- Bilingual Astro Starlight Stable/Next documentation.
- Native platform release builds, SHA-256 checksums, and build attestations.

### Verification

- Isolated installer, configuration, idempotency, runtime, and browser checks.
- No provider credential access or real model calls in installation tests.
- Website type checking, 59-page production build, and browser rendering checks.
