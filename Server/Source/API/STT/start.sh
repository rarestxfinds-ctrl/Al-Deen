#!/bin/bash
# Unified STT server on :8081 (single process, single port).

pkill -f asr_server.py
sleep 1

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../../.." && pwd)"

export STT_PORT="${STT_PORT:-8081}"

source "$PROJECT_ROOT/stt_env/bin/activate"

exec python "$SCRIPT_DIR/asr_server.py"