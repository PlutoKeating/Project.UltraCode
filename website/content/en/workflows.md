---
title: Standard workflows
description: Planning, implementation, architecture consultation, and independent review
---

# Standard workflows

## Small tasks

Give a bounded task directly to the orchestrator. It reads local conventions, makes a minimal change, and runs existing checks without creating unnecessary subagents.

## Complex tasks

```text
Add export support to this system. Inspect first and define acceptance criteria; do not implement.
Execute the approved plan without weakening its acceptance criteria.
Review the diff, original scope, and verification evidence independently.
```

## Roles

| Role | Responsibility |
| --- | --- |
| orchestrator | Direct small tasks and maintain scope/evidence for larger work |
| planner | Plan without implementing product code |
| implementer | Deliver one bounded implementation unit |
| architect | Read-only architecture, trade-offs, and deep debugging analysis |
| reviewer | Independent correctness, regression, and evidence review |
| librarian | Official documentation and OSS research |
| visual-evaluator | Real browser interaction and visual acceptance |

## Superpowers

Request `brainstorming`, `test-driven-development`, `systematic-debugging`, or `verification-before-completion` explicitly when useful. They provide discipline rather than a second orchestrator.

## Definition of done

An unexecuted check is unverified. Tests, builds, and real scenarios carry more weight than a statement that work “looks complete.”
