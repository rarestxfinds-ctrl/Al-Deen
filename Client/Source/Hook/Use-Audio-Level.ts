// Real-time microphone level monitor (RMS, 0..1) using Web Audio AnalyserNode.
// Attach to a MediaStream and read `level` at any time. Designed for STT UI:
// drive volume meters, detect silence, and auto-mute hints.

import { useCallback, useEffect, useRef, useState } from "react";

export interface UseAudioLevelResult {
  level: number;            // 0..1
  peak: number;             // 0..1, slow-decay peak hold
  isSilent: boolean;        // level < silenceThreshold for silenceWindowMs
  attach: (stream: MediaStream | null) => void;
  detach: () => void;
}

export interface UseAudioLevelOptions {
  silenceThreshold?: number;   // 0..1, default 0.02
  silenceWindowMs?: number;    // default 1500
  smoothingTimeConstant?: number; // 0..1, default 0.8
  fftSize?: number;            // default 1024
}

export function useAudioLevel(opts: UseAudioLevelOptions = {}): UseAudioLevelResult {
  const {
    silenceThreshold = 0.02,
    silenceWindowMs = 1500,
    smoothingTimeConstant = 0.8,
    fftSize = 1024,
  } = opts;

  const [level, setLevel] = useState(0);
  const [peak, setPeak] = useState(0);
  const [isSilent, setIsSilent] = useState(true);

  const ctxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastLoudAtRef = useRef<number>(Date.now());
  const peakRef = useRef(0);

  const detach = useCallback(() => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    try { sourceRef.current?.disconnect(); } catch { /* noop */ }
    try { analyserRef.current?.disconnect(); } catch { /* noop */ }
    try { ctxRef.current?.close(); } catch { /* noop */ }
    sourceRef.current = null;
    analyserRef.current = null;
    ctxRef.current = null;
    setLevel(0);
    setPeak(0);
    setIsSilent(true);
  }, []);

  const attach = useCallback((stream: MediaStream | null) => {
    detach();
    if (!stream) return;
    const AC = (window.AudioContext || (window as any).webkitAudioContext);
    if (!AC) return;
    const ctx: AudioContext = new AC();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = fftSize;
    analyser.smoothingTimeConstant = smoothingTimeConstant;
    const src = ctx.createMediaStreamSource(stream);
    src.connect(analyser);

    ctxRef.current = ctx;
    analyserRef.current = analyser;
    sourceRef.current = src;

    const data = new Uint8Array(analyser.fftSize);

    const loop = () => {
      analyser.getByteTimeDomainData(data);
      // RMS
      let sum = 0;
      for (let i = 0; i < data.length; i++) {
        const v = (data[i] - 128) / 128;
        sum += v * v;
      }
      const rms = Math.sqrt(sum / data.length);
      const lvl = Math.min(1, rms * 2);
      setLevel(lvl);

      // Slow-decay peak
      peakRef.current = Math.max(lvl, peakRef.current * 0.96);
      setPeak(peakRef.current);

      const now = Date.now();
      if (lvl >= silenceThreshold) lastLoudAtRef.current = now;
      setIsSilent(now - lastLoudAtRef.current > silenceWindowMs);

      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
  }, [detach, fftSize, silenceThreshold, silenceWindowMs, smoothingTimeConstant]);

  useEffect(() => () => detach(), [detach]);

  return { level, peak, isSilent, attach, detach };
}
