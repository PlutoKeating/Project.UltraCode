---
title: Independent visual QA
description: Playwright, UI rubrics, screenshots, and honest NOT_VERIFIED results
---

# Independent visual QA

The visual evaluator is not the generator. It operates the real application through a dedicated Playwright MCP server and has no shell access.

## Rubric

Default:

```text
~/.config/opencode/ultracode/templates/UI_RUBRIC.md
```

A project can override it with `.opencode/ultracode/UI_RUBRIC.md`.

The rubric scores coherence, originality, craft, and functional usability. Failed core flows, unexecuted required checks, horizontal overflow, or unreachable primary actions force REJECT.

## Invoke

```bash
opencode run --agent ultracode/visual-evaluator \
  "Read the sprint contract and applicable UI rubric. Operate http://127.0.0.1:3000 through Playwright, save desktop/mobile screenshots, and write QA_REPORT.md."
```

Use `opencode debug agents` as the authority for role IDs in your OpenCode version.

## Evidence

Automatic browser output goes to `.opencode/ultracode/qa/`. The Ralph launcher creates ignore rules there. QA reports may be committed; screenshots and transient output remain untracked by default.

Every criterion must be `PASS`, `FAIL`, or `NOT_VERIFIED`. A required `NOT_VERIFIED` cannot be offset by high aesthetic scores.

## Browser repair

The full installer downloads the matching browser. If the cache is removed, run `uc sync`; no global Node, Bun, or Playwright installation is needed.
