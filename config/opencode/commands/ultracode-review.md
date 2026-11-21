---
description: Independently review current changes against scope and acceptance evidence
agent: ultracode/reviewer
subagent: true
---

Independently review the current changes and this scope: $ARGUMENTS

Inspect the actual diff, run useful checks, and return APPROVE only when every hard criterion is supported by evidence. Otherwise return REJECT with severity-ordered, actionable findings.
