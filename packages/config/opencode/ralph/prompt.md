# UltraCode Ralph Iteration {{iteration}} / {{max_iterations}}

## Goal

{{prompt}}

## Current Tasks

{{tasks}}

## Steering Context

{{context}}

## Mandatory Protocol

1. Read the repository instructions, current Git state, `.ralph/PROGRESS.md`, and `.ralph/HANDOFF.md` before acting. Read `.opencode/ultracode/FEATURE_LIST.json` and `.opencode/ultracode/SPRINT_CONTRACT.md` when present.
2. Work on exactly one currently selected top-level task. Do not batch independent tasks and do not change their acceptance criteria.
3. Establish the existing baseline before editing. If the current project is already broken, record the evidence and repair or isolate that issue before adding scope.
4. Follow the project's existing test discipline. For new behavior, use a genuine failing test before implementation when the repository supports it. Never delete, skip, or weaken checks to force completion.
5. Implement the smallest coherent change, then run the project's real verification command and the task's acceptance scenarios. For user-facing work, exercise the real interface and request an independent reviewer or visual-evaluator when available.
6. Update `.ralph/PROGRESS.md` with work completed and commands actually run. Update `.ralph/HANDOFF.md` with current evidence, failures, unverified items, and the exact next action. Do not record an unexecuted check as passed.
7. A task may be marked complete only when every hard criterion has evidence. If verification fails, leave the task unfinished and record the failure so the next fresh iteration can continue.
8. Create exactly one local Git commit after verification, including the implementation and updated task/progress/handoff artifacts plus QA_REPORT.md when requested. Keep screenshots and automatic browser output in the ignored `.opencode/ultracode/qa/` directory. Do not commit when blocked without a meaningful change. Never add agent co-author trailers or push.

## Exit Signals

- If this task is complete and other tasks remain, finish with `<promise>{{task_promise}}</promise>`.
- If every task and every acceptance criterion is verified, finish with `<promise>{{completion_promise}}</promise>`.
- If human input or an external decision is required, record the reason in `.ralph/HANDOFF.md` and finish with `<promise>BLOCKED</promise>`.
- Otherwise finish without a completion promise so Ralph starts a fresh iteration.
