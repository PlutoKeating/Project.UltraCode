---
title: Fresh-context long runs
description: Ralph, Git worktrees, and durable handoffs for long engineering tasks
---

# Fresh-context long runs

Subagents isolate work inside one session. Ralph starts a new `opencode run` between top-level iterations. These mechanisms solve different problems.

## Prepare a worktree

```bash
git worktree add -b feature/my-long-task ../my-long-task
cd ../my-long-task
mkdir -p .ralph
cp ~/.config/opencode/ultracode/templates/PROGRESS.md .ralph/
cp ~/.config/opencode/ultracode/templates/HANDOFF.md .ralph/
```

Create `.ralph/ralph-tasks.md` with bounded top-level tasks and prepare an approved `GOAL.md`.

## Run

```bash
~/.config/opencode/ultracode/run.sh GOAL.md 20 --no-questions
```

The launcher is provider-neutral and passes no model. It defaults to `--no-commit --no-allow-all`; the worker creates one local commit after verification. Add `--allow-all` only after reviewing the worktree and permission scope.

## Signals

- Task complete: `<promise>READY_FOR_NEXT_TASK</promise>`.
- All work complete: `<promise>COMPLETE</promise>`.
- Human input required: `<promise>BLOCKED</promise>` with the reason in HANDOFF.

## Durable memory

The task list, sprint contract, feature list, PROGRESS, HANDOFF, and Git are authoritative. Ralph's internal state/history can be deleted and must not be the only audit trail.

## Exit codes

`0`: complete and clean; `1`: blocked/failed; `2`: invalid invocation or primary worktree; `3`: incomplete/iteration cap; `5`: uncommitted final changes.
