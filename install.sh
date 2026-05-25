#!/usr/bin/env sh
set -eu

REPOSITORY_URL="${NEWCLOUD_REPOSITORY_URL:-https://github.com/ShadowSafin/NewCloud.git}"
INSTALL_DIR="${NEWCLOUD_INSTALL_DIR:-${HOME:?HOME is required unless NEWCLOUD_INSTALL_DIR is set}/NewCloud}"
REPOSITORY_REF="${NEWCLOUD_REPOSITORY_REF:-main}"

if [ -f "./setup.sh" ] && [ -f "./docker-compose.yml" ]; then
  exec sh ./setup.sh "$@"
fi

command -v git >/dev/null 2>&1 || {
  printf '%s\n' "[NewCloud] ERROR: Git is required to install from the repository." >&2
  exit 1
}

if [ -d "$INSTALL_DIR/.git" ] && [ -f "$INSTALL_DIR/setup.sh" ] && [ -f "$INSTALL_DIR/docker-compose.yml" ]; then
  printf '%s\n' "[NewCloud] Existing installation found in $INSTALL_DIR; launching it without changing its checked-out source."
  cd "$INSTALL_DIR"
  exec sh ./setup.sh "$@"
fi

if [ -e "$INSTALL_DIR" ]; then
  printf '%s\n' "[NewCloud] ERROR: $INSTALL_DIR exists but is not a NewCloud checkout. Choose NEWCLOUD_INSTALL_DIR." >&2
  exit 1
fi

printf '%s\n' "[NewCloud] Cloning $REPOSITORY_URL ($REPOSITORY_REF) into $INSTALL_DIR"
git clone --branch "$REPOSITORY_REF" --single-branch "$REPOSITORY_URL" "$INSTALL_DIR"
cd "$INSTALL_DIR"
exec sh ./setup.sh "$@"
