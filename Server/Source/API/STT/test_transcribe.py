#!/usr/bin/env python3
import torch
from transformers import WhisperProcessor, WhisperForConditionalGeneration
import subprocess
import soundfile as sf
import tempfile
import os
import re

MODEL_ID = "tarteel-ai/whisper-base-ar-quran"
# Update this path to your test audio file
AUDIO_PATH = "Server/Data/Quran/Qiraat/Mishary_Rashid_Alafasy/Surah/1/Ayah/1/Audio.mp3"

def clean_transcript(text: str) -> str:
    return re.sub(r'<[^>]+>', '', text).strip()

print(f"🚀 Loading model '{MODEL_ID}'...")
processor = WhisperProcessor.from_pretrained(MODEL_ID)
model = WhisperForConditionalGeneration.from_pretrained(MODEL_ID)
device = "cuda" if torch.cuda.is_available() else "cpu"
model.to(device)
print(f"✅ Model loaded on {device}")

if not os.path.exists(AUDIO_PATH):
    print(f"❌ Audio file not found: {AUDIO_PATH}")
    exit(1)

print(f"🎵 Converting {AUDIO_PATH} to WAV...")
with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
    wav_path = tmp.name

subprocess.run(
    ["ffmpeg", "-i", AUDIO_PATH, "-ar", "16000", "-ac", "1", "-y", wav_path],
    check=True,
    capture_output=True
)

audio_array, sr = sf.read(wav_path, dtype='float32')
os.unlink(wav_path)

print(f"📊 Duration: {len(audio_array)/sr:.2f}s")
print("🎙️ Processing...")
input_features = processor(audio_array, sampling_rate=sr, return_tensors="pt").input_features.to(device)

with torch.no_grad():
    predicted_ids = model.generate(input_features)

transcription = processor.batch_decode(predicted_ids, skip_special_tokens=True)[0]
cleaned = clean_transcript(transcription)
print(f"\n📝 TRANSCRIPTION:\n{cleaned}")