#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: run.sh <goal-file> [max-iterations] [extra Ralph flags]" >&2
  exit 2
fi

goal_file="$1"
max_iterations="${2:-20}"
if [[ $# -ge 2 ]]; then
  shift 2
else
  shift
fi

root="$(git rev-parse --show-toplevel)"
git_dir="$(realpath "$(git rev-parse --git-dir)")"
common_dir="$(realpath "$(git rev-parse --git-common-dir)")"

if [[ "$git_dir" == "$common_dir" ]]; then
  echo "UltraCode Ralph requires a dedicated linked Git worktree." >&2
  exit 2
fi
if [[ ! -f "$goal_file" ]]; then
  echo "Goal file not found: $goal_file" >&2
  exit 2
fi
if [[ ! -f "$root/.ralph/ralph-tasks.md" ]]; then
  echo "Missing task list: $root/.ralph/ralph-tasks.md" >&2
  exit 2
fi
if ! [[ "$max_iterations" =~ ^[1-9][0-9]*$ ]]; then
  echo "max-iterations must be a positive integer." >&2
  exit 2
fi

mkdir -p "$root/.ralph"
if [[ ! -f "$root/.ralph/PROGRESS.md" ]]; then
  cp "$HOME/.config/opencode/ralph/templates/PROGRESS.md" "$root/.ralph/PROGRESS.md"
fi
if [[ ! -f "$root/.ralph/HANDOFF.md" ]]; then
  cp "$HOME/.config/opencode/ralph/templates/HANDOFF.md" "$root/.ralph/HANDOFF.md"
fi
if [[ ! -f "$root/.ralph/.gitignore" ]]; then
  cp "$HOME/.config/opencode/ralph/templates/gitignore" "$root/.ralph/.gitignore"
fi
mkdir -p "$root/.opencode/ultracode/qa"
if [[ ! -f "$root/.opencode/ultracode/qa/.gitignore" ]]; then
  cp "$HOME/.config/opencode/ralph/templates/qa.gitignore" "$root/.opencode/ultracode/qa/.gitignore"
fi

cd "$root"
set +e
ralph \
  --prompt-file "$goal_file" \
  --prompt-template "$HOME/.config/opencode/ralph/prompt.md" \
  --tasks \
  --max-iterations "$max_iterations" \
  --agent opencode \
  --model google-vertex/gemini-4-neon \
  --abort-promise BLOCKED \
  --no-commit \
  --no-allow-all \
  "$@"
status=$?
set -e

if [[ $status -ne 0 ]]; then
  exit "$status"
fi
if [[ -f "$root/.ralph/ralph-history.json" ]]; then
  echo "Ralph stopped before completion; inspect .ralph/PROGRESS.md and .ralph/HANDOFF.md." >&2
  exit 3
fi
if [[ -n "$(git status --porcelain)" ]]; then
  echo "Ralph completed with uncommitted changes; review and commit them before rerunning." >&2
  git status --short >&2
  exit 5
fi

