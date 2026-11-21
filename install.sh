#!/usr/bin/env bash
set -euo pipefail

repo="${ULTRACODE_REPOSITORY:-PlutoKeating/Project.UltraCode}"
version="${ULTRACODE_VERSION:-latest}"
bin_dir="${ULTRACODE_BIN_DIR:-$HOME/.local/bin}"
work="$(mktemp -d "${TMPDIR:-/tmp}/ultracode-install.XXXXXX")"
trap 'rm -rf "$work"' EXIT

case "$(uname -s)" in
  Linux) os=linux ;;
  Darwin) os=darwin ;;
  *) echo "UltraCode supports Linux and macOS. Use Windows through WSL." >&2; exit 2 ;;
esac
case "$(uname -m)" in
  x86_64|amd64) arch=x64 ;;
  arm64|aarch64) arch=arm64 ;;
  *) echo "Unsupported architecture: $(uname -m)" >&2; exit 2 ;;
esac
if ! command -v opencode >/dev/null 2>&1; then
  echo "Install the official OpenCode V2 first: curl -fsSL https://opencode.ai/v2/install | bash" >&2
  exit 2
fi

asset="ultracode-$os-$arch"
if [[ -n "${ULTRACODE_RELEASE_BASE_URL:-}" ]]; then
  base="$ULTRACODE_RELEASE_BASE_URL"
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
if [[ "$actual" != "$expected" ]]; then
  echo "UltraCode artifact checksum verification failed." >&2
  exit 1
fi

mkdir -p "$bin_dir"
if [[ -f "$bin_dir/ultracode" ]]; then
  backup_dir="${ULTRACODE_HOME:-${XDG_DATA_HOME:-$HOME/.local/share}/ultracode}/backups"
  mkdir -p "$backup_dir"
  cp "$bin_dir/ultracode" "$backup_dir/preinstall-$(date +%s)-ultracode"
fi
install -m 0755 "$work/$asset" "$bin_dir/ultracode"
if [[ ! -e "$bin_dir/uc" || -L "$bin_dir/uc" ]]; then
  ln -sfn ultracode "$bin_dir/uc"
fi
export PATH="$bin_dir:$PATH"
"$bin_dir/ultracode" apply
printf '\nUltraCode installed. Run `uc doctor` after opening a new terminal if needed.\n'
