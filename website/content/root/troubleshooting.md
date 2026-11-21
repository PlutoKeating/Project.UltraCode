---
title: 故障排查
description: 按结构证据解决安装、权限、运行时和升级问题
---

# 故障排查

## OpenCode 不受支持

错误：`unsupported; install a recent V2 release`。

检查：

```bash
opencode --version
```

使用官方入口升级到最近 V2，再执行 `uc sync`。UltraCode 不会替你自动升级，除非你显式运行 `uc up`。

## `uc` 不在 PATH

直接使用：

```bash
~/.local/bin/uc doctor
```

并把 `~/.local/bin` 加入 shell PATH。安装器不会未经允许改写所有 shell 配置。

## Provider 或模型报错

UltraCode 不管理 Provider。检查你在 OpenCode 中原有的模型选择与认证；不要把这些凭据发送给 UltraCode 安装器或文档网站。

## Playwright 浏览器缺失

```bash
uc sync
```

私有运行时会重新检查固定浏览器。不要安装全局 Playwright 来掩盖问题。

## 配置冲突被保留

这是预期行为。打开提示中的路径，决定是否手动采用 UltraCode 值。用户已有 `default_agent`、MCP 或本地修改不会被静默覆盖。

## Ralph 返回 2

通常表示当前不是 linked worktree，或目标/任务文件缺失。按提示创建 worktree 与 `.ralph/ralph-tasks.md`。

## Ralph 返回 3 或 5

- `3`：任务未完成或达到轮数上限；阅读 PROGRESS 和 HANDOFF。
- `5`：最终有未提交变更；审查 diff 后提交，再决定是否继续。

## 仍然失败

执行：

```bash
uc doctor
opencode --version
```

公开报告问题时移除私有路径、项目名、令牌和凭据。不要附送真实模型会话或认证文件。
