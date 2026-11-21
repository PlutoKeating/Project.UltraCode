---
title: 命令与兼容参考
description: CLI、OpenCode 角色、Ralph 退出码和版本矩阵
---

# 命令与兼容参考

## UltraCode CLI

| 命令 | 行为 | 真实模型调用 |
| --- | --- | --- |
| `uc apply` | 完整幂等安装 | 否 |
| `uc sync` | apply 别名，适合官方升级后修复 | 否 |
| `uc doctor` | 结构检查 | 否 |
| `uc update` | 更新 UltraCode 稳定版并 sync | 否 |
| `uc up` | 官方 OpenCode 升级 + UltraCode 更新 + sync | 否 |
| `uc uninstall --yes` | 精确卸载未修改的 UltraCode 状态 | 否 |
| `uc version` | 打印版本 | 否 |
| `uc ralph ...` | 运行私有 Ralph | 由 Ralph 任务决定 |
| `uc mcp` | 启动私有 Playwright MCP | 否 |

## 版本基线

| 组件 | 基线 |
| --- | --- |
| UltraCode | 0.1.0 / Stable |
| OpenCode | V2.3.x，更新的 V2 仅结构检查 |
| Superpowers | v7.0.2 |
| Open Ralph Wiggum | v1.3.1 / 固定 commit |
| Playwright MCP | 0.0.86 |

## Ralph 退出码

| 代码 | 含义 |
| --- | --- |
| 0 | 完成且 Git 工作区干净 |
| 1 | 阻塞或执行失败 |
| 2 | 参数、目标文件或 worktree 不符合要求 |
| 3 | 达到上限或未完成 |
| 5 | 最终仍有未提交修改 |

## 环境变量

- `ULTRACODE_HOME`：覆盖数据目录。
- `ULTRACODE_BIN_DIR`：覆盖 CLI 安装目录。
- `ULTRACODE_OPENCODE_BIN`：测试用 OpenCode Adapter。
- `ULTRACODE_VERSION`：安装器固定 Release。
- `XDG_*`、`OPENCODE_CONFIG_DIR`：遵循 OpenCode/系统路径约定。

测试专用 `ULTRACODE_SKIP_RUNTIME`、`ULTRACODE_SKIP_BROWSER` 只用于隔离 CI，不应用于正常安装。
