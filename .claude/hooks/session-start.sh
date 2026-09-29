#!/bin/bash
# Arranque de sesión (Claude Code en la web): instala la CLI de agent-browser que usa la skill .claude/skills/agent-browser.
# Idempotente y sin fallar la sesión si no hay red.
set -uo pipefail
[ "${CLAUDE_CODE_REMOTE:-}" = "true" ] || exit 0
command -v agent-browser >/dev/null 2>&1 || npm i -g agent-browser >/dev/null 2>&1 || echo "session-start: no se pudo instalar agent-browser" >&2
# Usar el Chromium del entorno en lugar de descargar otro
for c in /opt/pw-browsers/chromium /usr/bin/chromium /usr/bin/chromium-browser; do
  if [ -x "$c" ]; then
    [ -n "${CLAUDE_ENV_FILE:-}" ] && echo "export AGENT_BROWSER_EXECUTABLE_PATH=$c" >> "$CLAUDE_ENV_FILE"
    break
  fi
done
exit 0
