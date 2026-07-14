#!/bin/sh

set -eu

if command -v node >/dev/null 2>&1; then
  exec "$@"
fi

PROJECT_ROOT=$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)
NVM_NODE_VERSION=${NVM_NODE_VERSION:-$(cat "$PROJECT_ROOT/.nvmrc" 2>/dev/null || true)}

if [ -n "${NVM_NODE_VERSION}" ]; then
  NVM_NODE_BIN="$HOME/.nvm/versions/node/$NVM_NODE_VERSION/bin"

  if [ -x "$NVM_NODE_BIN/node" ]; then
    PATH="$NVM_NODE_BIN:$PATH" exec "$@"
  fi
fi

echo "Node.js runtime not found. Install the version from .nvmrc or run 'nvm use' first." >&2
exit 1
