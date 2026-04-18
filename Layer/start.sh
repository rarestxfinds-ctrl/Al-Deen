#!/bin/bash
# Kill any existing instances
pkill -f asr_server.py
pkill -f quran-proxy.mjs

# Wait a moment for ports to be released
sleep 1

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Activate virtual environment
source "$PROJECT_ROOT/stt_env/bin/activate"

# Start Python ASR server
python "$PROJECT_ROOT/Layer/Bottom/API/STT/asr_server.py" &
ASR_PID=$!

echo "Waiting for ASR server to load model..."
sleep 10

# Start Node proxy
node "$PROJECT_ROOT/Layer/Bottom/API/STT/quran-proxy.mjs"

# When Node exits, kill the Python server
kill $ASR_PID