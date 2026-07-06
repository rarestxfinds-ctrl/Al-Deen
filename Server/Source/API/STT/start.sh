#!/bin/bash
# STT stack: Python Whisper ASR on :8084, Node WS proxy on :8083.
# Main app API keeps :8081, render service uses its own port.

pkill -f asr_server.py
pkill -f quran-proxy.mjs
sleep 1

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# .../Server/Source/API/STT -> project root is 4 levels up
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../../.." && pwd)"

export ASR_PORT="${ASR_PORT:-8084}"
export STT_PROXY_PORT="${STT_PROXY_PORT:-8083}"

source "$PROJECT_ROOT/stt_env/bin/activate"

python "$SCRIPT_DIR/asr_server.py" &
ASR_PID=$!

echo "Waiting for ASR server to load model..."
sleep 10

node "$SCRIPT_DIR/quran-proxy.mjs"

kill $ASR_PID