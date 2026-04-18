import torch
import numpy as np
import time

class SilenceDetector:
    def __init__(self, sample_rate=16000, threshold=0.5, min_speech_duration=0.5, min_silence_duration=0.5, speech_pad_ms=200):
        self.sample_rate = sample_rate
        self.threshold = threshold
        self.min_speech_duration = min_speech_duration
        self.min_silence_duration = min_silence_duration
        self.speech_pad_ms = speech_pad_ms

        self.vad_model, _ = torch.hub.load(
            repo_or_dir='snakers4/silero-vad',
            model='silero_vad',
            force_reload=False,
            trust_repo=True
        )
        self.vad_model.eval()

        self.audio_buffer = bytearray()
        self.is_speech = False
        self.speech_start = 0.0
        self.speech_end = 0.0
        self.last_update = time.time()
        self.callback = None

    def _bytes_to_float(self, audio_bytes):
        int16_data = np.frombuffer(audio_bytes, dtype=np.int16)
        return int16_data.astype(np.float32) / 32768.0

    def _get_audio_duration(self, audio_bytes):
        return len(audio_bytes) / (self.sample_rate * 2)

    def _vad_prob(self, audio_bytes):
        audio_float = self._bytes_to_float(audio_bytes)
        if len(audio_float) < 512:
            return 0.0
        audio_tensor = torch.from_numpy(audio_float).unsqueeze(0)
        with torch.no_grad():
            prob = self.vad_model(audio_tensor, self.sample_rate).item()
        return prob

    def add_audio(self, chunk_bytes, callback=None):
        self.callback = callback or self.callback
        self.audio_buffer.extend(chunk_bytes)
        frame_size = int(0.03 * self.sample_rate) * 2
        while len(self.audio_buffer) >= frame_size:
            frame = self.audio_buffer[:frame_size]
            self.audio_buffer = self.audio_buffer[frame_size:]
            prob = self._vad_prob(frame)
            current_time = time.time()
            speech = prob > self.threshold

            if speech and not self.is_speech:
                self.is_speech = True
                self.speech_start = current_time
            elif not speech and self.is_speech:
                silence_duration = current_time - self.speech_end
                if silence_duration >= self.min_silence_duration:
                    self.is_speech = False
                    duration = self.speech_end - self.speech_start
                    if duration >= self.min_speech_duration and self.callback:
                        self.callback(duration)
                    self.speech_start = 0.0
                    self.speech_end = 0.0
            if self.is_speech:
                self.speech_end = current_time

    def flush(self):
        if self.is_speech:
            duration = self.speech_end - self.speech_start
            if duration >= self.min_speech_duration and self.callback:
                self.callback(duration)
            self.is_speech = False