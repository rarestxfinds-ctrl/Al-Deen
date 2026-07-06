#!/bin/bash
# STT stack unified on :8081 (proxy + ASR) to match the app architecture.

pkill -f asr_server.py
pkill -f quran-proxy.mjs
sleep 1

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# .../Server/Source/API/STT -> project root is 4 levels up
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../../.." && pwd)"

export ASR_PORT="${ASR_PORT:-8081}"
export STT_PROXY_PORT="${STT_PROXY_PORT:-8081}"

source "$PROJECT_ROOT/stt_env/bin/activate"

python "$SCRIPT_DIR/asr_server.py" &
ASR_PID=$!

echo "Waiting for ASR server to load model..."
sleep 10

node "$SCRIPT_DIR/quran-proxy.mjs"

kill $ASR_PID