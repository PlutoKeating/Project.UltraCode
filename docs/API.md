# 命令与制品接口

## UltraCode CLI

| 命令 | 行为 | 真实模型调用 |
| --- | --- | --- |
| `uc apply` | 完整幂等安装 | 否 |
| `uc sync` | apply 别名；官方升级后修复 | 否 |
| `uc doctor` | 版本、文件、配置和运行时检查 | 否 |
| `uc update` | 更新 UltraCode 稳定 Release 并 sync | 否 |
| `uc up` | 官方 OpenCode 升级 + UltraCode 更新 + sync | 否 |
| `uc uninstall --yes` | 删除未修改的 UltraCode 所有状态 | 否 |
| `uc version` | 输出版本 | 否 |
| `uc ralph ...` | 执行私有 Ralph | 由用户任务决定 |
| `uc mcp` | 启动私有 Playwright MCP | 否 |

## OpenCode 角色与命令

角色安装于 `agents/ultracode/`，包括 orchestrator、planner、implementer、architect、reviewer、librarian 和 visual-evaluator。角色无模型字段，继承当前会话。

通过普通对话表达目标。TUI 命令面板的 UltraCode 项可分别切换权限审批和方向询问。

## Ralph

```bash
~/.config/opencode/ultracode/run.sh <目标文件> <最大轮数> --no-questions
```

要求 linked Git worktree 和 `.ralph/ralph-tasks.md`。默认 `--no-commit --no-allow-all`，任务代理验证后创建一个本地提交。无人值守时显式追加 `--allow-all`。

退出码：`0` 完成且干净；`1` 阻塞/失败；`2` 用法或 worktree 拒绝；`3` 上限/未完成；`5` 最终有未提交修改。

## 持久制品

- `.ralph/ralph-tasks.md`
- `.ralph/PROGRESS.md`
- `.ralph/HANDOFF.md`
- `.opencode/ultracode/FEATURE_LIST.json`
- `.opencode/ultracode/SPRINT_CONTRACT.md`
- `.opencode/ultracode/UI_RUBRIC.md`
- `.opencode/ultracode/QA_REPORT.md`

自动截图进入被忽略的 `.opencode/ultracode/qa/`。Ralph 内部 state/history 不是唯一审计记录。

## 路径与 Release

默认 CLI 在 `~/.local/bin`，数据在 `~/.local/share/ultracode`，OpenCode 配置在 `~/.config/opencode`。遵循 XDG 与 `OPENCODE_CONFIG_DIR`。

Release 资产命名：`ultracode-{linux|darwin}-{x64|arm64}`，附 `.sha256`。根 `install.sh` 同时由教程网站发布。

## 版本基线

OpenCode V2.3.x、Superpowers v7.0.2、Ralph v1.3.1 固定 commit、Playwright MCP 0.0.86。所有安装验收均不调用真实模型。
