#!/usr/bin/env python3
import os
os.environ["HF_HUB_OFFLINE"] = "1"

import asyncio
import json
import websockets
import torch
from transformers import WhisperProcessor, WhisperForConditionalGeneration
import subprocess
import tempfile
import re

MODEL_ID = "tarteel-ai/whisper-base-ar-quran"
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
SAMPLE_RATE = 16000

print(f"🚀 Loading model '{MODEL_ID}' on {DEVICE}...")
processor = WhisperProcessor.from_pretrained(MODEL_ID, local_files_only=True)
model = WhisperForConditionalGeneration.from_pretrained(MODEL_ID, local_files_only=True)
model.to(DEVICE)
print("✅ Model and processor ready")

def clean_transcript(text: str) -> str:
    return re.sub(r'<[^>]+>', '', text).strip()

async def transcribe_audio(audio_bytes, websocket, is_final=False):
    if len(audio_bytes) < 20000:          # need at least ~1.25 seconds of audio
        return
    with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as tmp:
        tmp.write(audio_bytes)
        tmp_path = tmp.name
    try:
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as wav_tmp:
            wav_path = wav_tmp.name
        # Run ffmpeg; ignore errors (might be incomplete container)
        result = subprocess.run(
            ["ffmpeg", "-i", tmp_path, "-ar", str(SAMPLE_RATE), "-ac", "1", "-y", wav_path],
            check=False,
            capture_output=True,
            text=True
        )
        if result.returncode != 0:
            print(f"⚠️ ffmpeg error (retry later): {result.stderr[:200]}")
            return
        import soundfile as sf
        audio_array, sr = sf.read(wav_path, dtype='float32')
        if len(audio_array) == 0:
            return
        print(f"🎙️ Transcribing {len(audio_array)/sr:.2f}s segment (final={is_final})")
        input_features = processor(audio_array, sampling_rate=sr, return_tensors="pt").input_features.to(DEVICE)
        with torch.no_grad():
            predicted_ids = model.generate(input_features)
        transcript = processor.batch_decode(predicted_ids, skip_special_tokens=True)[0]
        cleaned = clean_transcript(transcript)
        print(f"📝 Transcript: '{cleaned}'")
        try:
            await websocket.send(json.dumps({"text": cleaned, "is_final": is_final}))
        except websockets.exceptions.ConnectionClosed:
            pass
    except Exception as e:
        print(f"❌ Transcribe error: {e}")
    finally:
        os.unlink(tmp_path)
        if os.path.exists(wav_path):
            os.unlink(wav_path)

async def transcribe_handler(websocket):
    audio_buffer = bytearray()
    last_transcribe_time = asyncio.get_event_loop().time()
    interval = 2.0

    try:
        async for message in websocket:
            print(f"📨 Received {len(message)} bytes from proxy")
            audio_buffer.extend(message)
            now = asyncio.get_event_loop().time()

            # Transcribe if enough audio accumulated OR interval passed
            if len(audio_buffer) > 30000 or (now - last_transcribe_time >= interval):
                last_transcribe_time = now
                await transcribe_audio(bytes(audio_buffer), websocket, is_final=False)
                # Do NOT clear buffer – keep accumulating for final transcript
                # If you want to clear after each transcription, uncomment:
                # audio_buffer = bytearray()
    except websockets.exceptions.ConnectionClosed:
        print("🔌 Client disconnected")
        if audio_buffer:
            await transcribe_audio(bytes(audio_buffer), websocket, is_final=True)
async def main():
    async with websockets.serve(transcribe_handler, "0.0.0.0", 8082):
        print("✅ ASR server listening on ws://0.0.0.0:8082")
        await asyncio.Future()

if __name__ == "__main__":
    asyncio.run(main())