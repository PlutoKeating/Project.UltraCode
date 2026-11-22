#!/usr/bin/env bash
set -euo pipefail

repo="${ULTRACODE_REPOSITORY:-PlutoKeating/Project.UltraCode}"
version="${ULTRACODE_VERSION:-latest}"
bin_dir="${ULTRACODE_BIN_DIR:-$HOME/.local/bin}"
work="$(mktemp -d "${TMPDIR:-/tmp}/ultracode-install.XXXXXX")"
log_file="${TMPDIR:-/tmp}/ultracode-install-$$.log"
spinner_pid=""

stop_spinner() {
  if [[ -n "$spinner_pid" ]]; then
    kill "$spinner_pid" 2>/dev/null || true
    wait "$spinner_pid" 2>/dev/null || true
    spinner_pid=""
  fi
  if [[ -t 1 && -t 2 && -z "${NO_COLOR:-}" ]]; then
    printf '\r\033[2K' >&2
  fi
}

cleanup() {
  stop_spinner
  rm -rf "$work"
}
trap cleanup EXIT INT TERM

case "$(uname -s)" in
  Linux) os=linux ;;
  Darwin) os=darwin ;;
  *)
    printf 'Unsupported OS: %s. On Windows run: irm https://ultracode.plutokeating.beer/install.ps1 | iex\n' "$(uname -s)" >&2
    exit 2
    ;;
esac

case "$(uname -m)" in
  x86_64|amd64) arch=x64 ;;
  arm64|aarch64) arch=arm64 ;;
  *)
    printf 'Unsupported architecture: %s\n' "$(uname -m)" >&2
    exit 2
    ;;
esac

run_step() {
  local label="$1"
  shift
  if [[ -t 1 && -t 2 && -z "${NO_COLOR:-}" ]]; then
    (
      frames=('⠋' '⠙' '⠹' '⠸' '⠼' '⠴' '⠦' '⠧' '⠇' '⠏')
      i=0
      while true; do
        printf '\r\033[2K%s %s' "${frames[$((i % 10))]}" "$label" >&2
        i=$((i + 1))
        sleep 0.1
      done
    ) &
    spinner_pid="$!"
  else
    printf '%s\n' "$label" >&2
  fi

  if "$@" >>"$log_file" 2>&1; then
    stop_spinner
  else
    stop_spinner
    printf 'UltraCode: %s failed. Log: %s\n' "$label" "$log_file" >&2
    exit 1
  fi
}

resolve_opencode() {
  if [[ -n "${ULTRACODE_OPENCODE_BIN:-}" && -x "${ULTRACODE_OPENCODE_BIN}" ]]; then
    printf '%s\n' "$ULTRACODE_OPENCODE_BIN"
    return 0
  fi
  if command -v opencode >/dev/null 2>&1; then
    command -v opencode
    return 0
  fi
  local candidate
  for candidate in "$HOME/.opencode/bin/opencode" "$HOME/.local/bin/opencode" "/opt/homebrew/bin/opencode" "/usr/local/bin/opencode"; do
    if [[ -x "$candidate" ]]; then
      printf '%s\n' "$candidate"
      return 0
    fi
  done
  return 1
}

check_opencode_version() {
  local bin="$1"
  local out ver major minor patch
  out="$("$bin" --version 2>/dev/null || true)"
  ver="$(printf '%s\n' "$out" | grep -Eo 'v?[0-9]+\.[0-9]+\.[0-9]+' | head -n 1 || true)"
  ver="${ver#v}"
  if [[ -z "$ver" ]]; then
    return 1
  fi
  IFS='.' read -r major minor patch <<<"$ver"
  if [[ "$major" -eq 2 ]] && { [[ "$minor" -gt 3 ]] || { [[ "$minor" -eq 3 ]] && [[ "$patch" -ge 2 ]]; }; }; then
    return 0
  fi
  return 1
}

install_opencode_step() {
  local cmd="${ULTRACODE_OPENCODE_INSTALL_CMD:-curl -fsSL https://opencode.ai/v2/install | bash}"
  env -u VERSION bash -c "$cmd"
  local found
  found="$(resolve_opencode)" || return 1
  check_opencode_version "$found"
}

upgrade_opencode_step() {
  local bin="$1"
  "$bin" upgrade || true
  local found
  found="$(resolve_opencode || printf '%s\n' "$bin")"
  check_opencode_version "$found"
}

install_ultracode_step() {
  local asset="ultracode-$os-$arch"
  local base expected actual backup_dir
  if [[ -n "${ULTRACODE_RELEASE_BASE_URL:-}" ]]; then
    base="${ULTRACODE_RELEASE_BASE_URL%/}"
  elif [[ "$version" == latest ]]; then
    base="https://github.com/$repo/releases/latest/download"
  else
    base="https://github.com/$repo/releases/download/$version"
  fi

  curl -fsSL "$base/$asset" -o "$work/$asset"
  curl -fsSL "$base/$asset.sha256" -o "$work/$asset.sha256"
  expected="$(awk '{print $1}' "$work/$asset.sha256")"
  if command -v sha256sum >/dev/null 2>&1; then
    actual="$(sha256sum "$work/$asset" | awk '{print $1}')"
  else
    actual="$(shasum -a 256 "$work/$asset" | awk '{print $1}')"
  fi
  if [[ -z "$expected" || "$actual" != "$expected" ]]; then
    printf 'Checksum mismatch: expected %s, got %s\n' "$expected" "$actual"
    return 1
  fi

  mkdir -p "$bin_dir"
  if [[ -f "$bin_dir/ultracode" ]]; then
    backup_dir="${ULTRACODE_HOME:-${XDG_DATA_HOME:-$HOME/.local/share}/ultracode}/backups"
    mkdir -p "$backup_dir"
    cp "$bin_dir/ultracode" "$backup_dir/preinstall-$(date +%s)-ultracode"
  fi
  install -m 0755 "$work/$asset" "$bin_dir/ultracode"
}

setup_ultracode_step() {
  "$bin_dir/ultracode" apply
  "$bin_dir/ultracode" doctor
}

ensure_shell_path() {
  local profile=""
  case "${SHELL:-}" in
    */zsh) profile="$HOME/.zshrc" ;;
    */bash)
      if [[ -f "$HOME/.bashrc" || "$(uname -s)" != "Darwin" ]]; then
        profile="$HOME/.bashrc"
      else
        profile="$HOME/.bash_profile"
      fi
      ;;
    *) profile="$HOME/.profile" ;;
  esac

  if [[ -f "$profile" ]] && { grep -Fq "# ultracode" "$profile" 2>/dev/null || grep -Eq "(^|[:\"'=])${bin_dir}([:\"'/]|$)" "$profile" 2>/dev/null; }; then
    return 0
  fi
  mkdir -p "$(dirname "$profile")"
  touch "$profile"
  {
    printf '\n# ultracode\n'
    printf 'export PATH="%s:$PATH"\n' "$bin_dir"
  } >>"$profile"
}

in_invoking_path=0
case ":${PATH:-}:" in
  *":$bin_dir:"*) in_invoking_path=1 ;;
esac

if opencode_bin="$(resolve_opencode)"; then
  run_step "Updating OpenCode" upgrade_opencode_step "$opencode_bin"
else
  run_step "Installing OpenCode" install_opencode_step
fi

opencode_bin="$(resolve_opencode)"
export ULTRACODE_OPENCODE_BIN="$opencode_bin"
export PATH="$(dirname "$opencode_bin"):$bin_dir:${PATH:-}"

run_step "Installing UltraCode" install_ultracode_step

if [[ "$in_invoking_path" -eq 0 ]]; then
  ensure_shell_path
fi

run_step "Setting up" setup_ultracode_step

rm -f "$log_file"
installed_version="$("$bin_dir/ultracode" version)"
installed_version="${installed_version#v}"

printf '\nUltraCode %s\n\n✓ Ready\n\n  ultracode\n  ultracode desktop\n  ultracode pair\n' "$installed_version"
if [[ "$in_invoking_path" -eq 0 ]]; then
  printf '\nRestart your terminal to use ultracode\n'
fi
