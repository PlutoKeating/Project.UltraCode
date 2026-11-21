---
title: 全新上下文长跑
description: 使用 Ralph、Git worktree 和持久交接降低长会话漂移
---

# 全新上下文长跑

## 为什么同时使用子代理和 Ralph

子代理隔离一次会话中的搜索、实现或评审上下文；Ralph 在顶层任务之间启动新的 `opencode run`。两者不是同一种机制。

## 准备 worktree

```bash
git worktree add -b feature/my-long-task ../my-long-task
cd ../my-long-task
mkdir -p .ralph
cp ~/.config/opencode/ultracode/templates/PROGRESS.md .ralph/
cp ~/.config/opencode/ultracode/templates/HANDOFF.md .ralph/
```

创建 `.ralph/ralph-tasks.md`：

```markdown
# Ralph Tasks

- [ ] 实现第一个边界明确的功能并运行项目测试
- [ ] 实现第二个功能并执行真实场景验收
```

再准备经过确认的目标文件，例如 `GOAL.md`。

## 启动

```bash
~/.config/opencode/ultracode/run.sh GOAL.md 20 --no-questions
```

启动器固定 Provider 中立，不传模型。默认 `--no-commit --no-allow-all`；协议要求任务代理验证后创建一个本地提交。

无人值守时，只在确认 worktree 和权限边界后追加：

```bash
~/.config/opencode/ultracode/run.sh GOAL.md 20 --no-questions --allow-all
```

## 停止条件

- 单任务完成：`<promise>READY_FOR_NEXT_TASK</promise>`。
- 全部完成：`<promise>COMPLETE</promise>`。
- 需要人工：`<promise>BLOCKED</promise>`，原因写入 HANDOFF。

## 持久记忆

任务清单、Sprint Contract、Feature List、PROGRESS、HANDOFF 和 Git 是跨轮真源。Ralph 内部 state/history 可删除，不应作为唯一审计记录。

## 退出码

`0` 完成且干净；`1` 阻塞或失败；`2` 用法/主 worktree 拒绝；`3` 未完成或达到上限；`5` 最后仍有未提交变更。
