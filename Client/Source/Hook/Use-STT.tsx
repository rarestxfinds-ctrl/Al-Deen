import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { normalizeArabic } from '@/Utility/Quran/Normalize-Arabic';
import type { AssembledVerse } from 'Server/API/Quran';
import { useAudioLevel } from './Use-Audio-Level';

function getProxyUrl(): string {
  const envUrl = (import.meta.env.VITE_STT_PROXY_URL as string | undefined)?.trim();
  if (envUrl) return envUrl;
  const host = window.location.hostname;
  if (host.endsWith('.app.github.dev')) {
    // Codespaces: swap the port suffix on the forwarded host to the STT proxy port (8083).
    const withProxy = host.replace(/-\d+(\.app\.github\.dev)$/, '-8083$1');
    return `wss://${withProxy}`;
  }
  return 'ws://localhost:8083';
}

// Exponential backoff (ms): 1s, 2s, 4s, 8s, 15s cap.
function backoffMs(attempt: number): number {
  return Math.min(15000, 1000 * Math.pow(2, Math.max(0, attempt - 1)));
}

interface UseDeepgramProps {
  surahId: number;
  verses: AssembledVerse[] | undefined;
  visibleVerse: number;
  hifz: {
    isWordCompleted: (surahId: number, verse: number, word: number) => boolean;
    markWordCompleted: (surahId: number, verse: number, word: number) => void;
  };
  onVerseComplete?: (verseNumber: number) => void;
  /** ms of inactivity (no new STT events) before auto-stop. Default 8000. */
  silenceAutoStopMs?: number;
  /** Maximum number of reconnect attempts before giving up. Default 5. */
  maxReconnectAttempts?: number;
}

export function useDeepgram({
  surahId, verses, visibleVerse, hifz, onVerseComplete,
  silenceAutoStopMs = 8000,
  maxReconnectAttempts = 5,
}: UseDeepgramProps) {

  // ---------- STT state ----------
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'connecting' | 'connected' | 'failed' | 'reconnecting'>('idle');
  const [reconnectAttempt, setReconnectAttempt] = useState(0);

  const wsRef = useRef<WebSocket | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const shouldReconnectRef = useRef(false);
  const reconnectAttemptRef = useRef(0);
  const pausedRef = useRef(false);

  // Live audio level (volume meter + VAD-style isSilent).
  const audioLevel = useAudioLevel({ silenceThreshold: 0.02, silenceWindowMs: silenceAutoStopMs });

  // ---------- Alignment state ----------
  const allWords = useMemo(() => {
    if (!verses) return [];
    const words: { verseNumber: number; wordIndex: number; glyph: string }[] = [];
    for (const v of verses) {
      if (!v.words) continue;
      const wordArray = v.words.slice(0, -1); // remove verse marker
      for (let idx = 0; idx < wordArray.length; idx++) {
        const glyph = wordArray[idx];
        if (glyph && typeof glyph === 'string') {
          words.push({
            verseNumber: v.verseNumber,
            wordIndex: idx,
            glyph,
          });
        }
      }
    }
    return words;
  }, [verses]);

  const getStartIndex = useCallback(() => {
    let startGlobal = 0;
    for (let i = 0; i < allWords.length; i++) {
      if (allWords[i].verseNumber === visibleVerse && allWords[i].wordIndex === 0) {
        startGlobal = i;
        break;
      }
    }
    for (let i = startGlobal; i < allWords.length; i++) {
      const w = allWords[i];
      if (!hifz.isWordCompleted(surahId, w.verseNumber, w.wordIndex)) {
        return i;
      }
    }
    return allWords.length;
  }, [allWords, visibleVerse, surahId, hifz]);

  const startIdxRef = useRef(0);
  useEffect(() => {
    startIdxRef.current = getStartIndex();
  }, [getStartIndex]);

  const lastProcessedTranscriptRef = useRef<string>('');
  const recentTranscriptsRef = useRef<string[]>([]);
  const lastSpeechAtRef = useRef<number>(Date.now());
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-pause silence threshold (ms). After this period without new speech
  // events, recording stops to avoid hanging connections.
  const SILENCE_AUTO_STOP_MS = silenceAutoStopMs;
  // How far ahead in the reference text we look for a fuzzy match.
  const SKIP_AHEAD_WINDOW = 6;
  // Max Levenshtein distance allowed for a fuzzy word match (scaled to length).
  const fuzzyAllowed = (refLen: number) =>
    refLen <= 3 ? 0 : refLen <= 5 ? 1 : refLen <= 8 ? 2 : 3;

  // Tiny Levenshtein for short Arabic tokens (post-normalization).
  function lev(a: string, b: string): number {
    if (a === b) return 0;
    const m = a.length, n = b.length;
    if (m === 0 || n === 0) return Math.max(m, n);
    const dp = new Array(n + 1);
    for (let j = 0; j <= n; j++) dp[j] = j;
    for (let i = 1; i <= m; i++) {
      let prev = dp[0]; dp[0] = i;
      for (let j = 1; j <= n; j++) {
        const tmp = dp[j];
        dp[j] = a[i - 1] === b[j - 1]
          ? prev
          : 1 + Math.min(prev, dp[j], dp[j - 1]);
        prev = tmp;
      }
    }
    return dp[n];
  }

  // Deduplicate against recent transcripts (Deepgram often re-emits overlap).
  function dedupeAgainstRecent(words: string[]): string[] {
    if (words.length === 0) return words;
    for (const prev of recentTranscriptsRef.current) {
      const prevWords = prev.split(/\s+/).filter(Boolean);
      // Find the largest suffix of prev that is a prefix of words and strip it.
      const maxOverlap = Math.min(prevWords.length, words.length);
      for (let k = maxOverlap; k > 0; k--) {
        let match = true;
        for (let i = 0; i < k; i++) {
          if (prevWords[prevWords.length - k + i] !== words[i]) { match = false; break; }
        }
        if (match) return words.slice(k);
      }
    }
    return words;
  }

  const alignAndMark = useCallback((rawTranscript: string) => {
    if (rawTranscript === lastProcessedTranscriptRef.current) return;
    lastProcessedTranscriptRef.current = rawTranscript;
    lastSpeechAtRef.current = Date.now();

    if (!verses || allWords.length === 0) return;

    const normalizedTranscript = normalizeArabic(rawTranscript);
    if (normalizedTranscript.length === 0) return;

    const startIdx = startIdxRef.current;
    if (startIdx >= allWords.length) return;

    let transcriptWords = normalizedTranscript.split(/\s+/).filter(w => w.length > 0);
    transcriptWords = dedupeAgainstRecent(transcriptWords);
    if (transcriptWords.length === 0) return;

    // Track this transcript for future dedupe (keep last 4).
    recentTranscriptsRef.current.push(normalizedTranscript);
    if (recentTranscriptsRef.current.length > 4) recentTranscriptsRef.current.shift();

    const remaining = allWords.slice(startIdx);
    let refCursor = 0;
    let matched = 0;

    for (let ti = 0; ti < transcriptWords.length && refCursor < remaining.length; ti++) {
      const tWord = transcriptWords[ti];
      // Look up to SKIP_AHEAD_WINDOW ahead in ref for a fuzzy match.
      const windowEnd = Math.min(refCursor + SKIP_AHEAD_WINDOW, remaining.length);
      let bestIdx = -1;
      let bestDist = Infinity;
      for (let ri = refCursor; ri < windowEnd; ri++) {
        const refNorm = normalizeArabic(remaining[ri].glyph || '');
        if (!refNorm) continue;
        const d = lev(tWord, refNorm);
        if (d < bestDist && d <= fuzzyAllowed(refNorm.length)) {
          bestDist = d;
          bestIdx = ri;
          if (d === 0) break;
        }
      }
      if (bestIdx === -1) continue;
      // Mark every ref word from refCursor..bestIdx inclusive as completed
      // (we assume the reciter said them but ASR missed them).
      for (let ri = refCursor; ri <= bestIdx; ri++) {
        const w = remaining[ri];
        hifz.markWordCompleted(surahId, w.verseNumber, w.wordIndex);
        matched++;
        // Detect verse boundary completion: this was last word of its verse
        const isLastWordOfVerse =
          ri + 1 >= remaining.length ||
          remaining[ri + 1].verseNumber !== w.verseNumber;
        if (isLastWordOfVerse && onVerseComplete) {
          // Defer to next tick so caller can update visibleVerse / scroll safely
          const completedVerse = w.verseNumber;
          setTimeout(() => onVerseComplete(completedVerse), 0);
        }
      }
      refCursor = bestIdx + 1;
    }

    if (matched > 0) {
      startIdxRef.current += matched;
      console.log(`✅ Marked ${matched} words (fuzzy), new start index: ${startIdxRef.current}`);
    }
  }, [verses, allWords, surahId, hifz, onVerseComplete]);



  // ---------- WebSocket and recording ----------
  const cleanup = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop();
    }
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.close(1000, 'Cleanup');
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    wsRef.current = null;
    recorderRef.current = null;
    streamRef.current = null;
    shouldReconnectRef.current = false;
    setConnectionStatus('idle');
  }, []);

  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return Promise.resolve();
    }
    if (wsRef.current?.readyState === WebSocket.CONNECTING) {
      return new Promise<void>((resolve) => {
        const checkInterval = setInterval(() => {
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            clearInterval(checkInterval);
            resolve();
          }
        }, 100);
      });
    }
    const proxyUrl = getProxyUrl();
    console.log('Connecting to STT proxy:', proxyUrl);
    const ws = new WebSocket(proxyUrl);
    ws.binaryType = 'arraybuffer';
    wsRef.current = ws;
    setConnectionStatus('connecting');

    return new Promise<void>((resolve, reject) => {
      ws.onopen = () => {
        console.log('✅ WebSocket open');
        setConnectionStatus('connected');
        setError(null);
        shouldReconnectRef.current = true;
        resolve();
      };
      ws.onerror = () => {
        setConnectionStatus('failed');
          setError('WebSocket error — is the STT proxy running on port 8083?');
        reject(new Error('WebSocket connection failed'));
      };
      ws.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason);
        if (shouldReconnectRef.current && isRecording) {
          reconnectAttemptRef.current += 1;
          setReconnectAttempt(reconnectAttemptRef.current);
          if (reconnectAttemptRef.current > maxReconnectAttempts) {
            setConnectionStatus('failed');
            setError(`Lost connection after ${maxReconnectAttempts} attempts`);
            shouldReconnectRef.current = false;
            return;
          }
          const delay = backoffMs(reconnectAttemptRef.current);
          setConnectionStatus('reconnecting');
          console.log(`⏳ Reconnecting in ${delay}ms (attempt ${reconnectAttemptRef.current})`);
          reconnectTimeoutRef.current = setTimeout(() => connectWebSocket(), delay);
        } else {
          setConnectionStatus('idle');
        }
      };
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📨 Received from STT:', data);
          if (data.text?.trim()) {
            setTranscript(prev => prev ? `${prev}\n${data.text}` : data.text);
            setInterimTranscript('');
            // Perform alignment on every new transcript
            alignAndMark(data.text);
          } else if (data.error) {
            console.error('STT server error:', data.error);
            setError(data.error);
          }
        } catch (err) {
          console.error('Failed to parse message:', err);
        }
      };
    });
  }, [isRecording, alignAndMark]);

  const disconnectWebSocket = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.close(1000, 'Manual disconnect');
    }
    wsRef.current = null;
    setConnectionStatus('idle');
  }, []);

  const sendRawAudio = useCallback((data: ArrayBuffer): boolean => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(data);
      return true;
    }
    console.warn('WebSocket not open, cannot send audio');
    return false;
  }, []);

  const startRecording = useCallback(async () => {
    setError(null);
    setTranscript('');
    setIsPaused(false);
    recentTranscriptsRef.current = [];
    lastProcessedTranscriptRef.current = '';
    lastSpeechAtRef.current = Date.now();
    reconnectAttemptRef.current = 0;
    setReconnectAttempt(0);
    await connectWebSocket();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;
      audioLevel.attach(stream);

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : '';
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recorderRef.current = recorder;


      recorder.ondataavailable = (e) => {
        if (pausedRef.current) return;
        if (e.data.size > 0 && wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(e.data);
        }
      };

      recorder.start(500);
      setIsRecording(true);

      // Silence auto-stop watcher
      if (silenceTimerRef.current) clearInterval(silenceTimerRef.current);
      silenceTimerRef.current = setInterval(() => {
        if (Date.now() - lastSpeechAtRef.current > SILENCE_AUTO_STOP_MS) {
          console.log('🤫 Silence detected — auto-pausing recording');
          stopRecording();
        }
      }, 1000);
    } catch (err) {
      setConnectionStatus('failed');
      setError(err instanceof Error ? err.message : 'Failed to access microphone');
      cleanup();
    }
  }, [connectWebSocket, cleanup]);

  const stopRecording = useCallback(() => {
    shouldReconnectRef.current = false;
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (silenceTimerRef.current) {
      clearInterval(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop();
    }
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.close(1000, 'User stopped recording');
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    audioLevel.detach();
    setIsRecording(false);
    setIsPaused(false);
    pausedRef.current = false;
    setInterimTranscript('');
    setConnectionStatus('idle');
    setReconnectAttempt(0);
    reconnectAttemptRef.current = 0;
    wsRef.current = null;
    recorderRef.current = null;
    streamRef.current = null;
  }, [audioLevel]);

  const pauseRecording = useCallback(() => {
    if (!isRecording || pausedRef.current) return;
    pausedRef.current = true;
    setIsPaused(true);
    try { recorderRef.current?.pause?.(); } catch { /* noop */ }
  }, [isRecording]);

  const resumeRecording = useCallback(() => {
    if (!isRecording || !pausedRef.current) return;
    pausedRef.current = false;
    setIsPaused(false);
    lastSpeechAtRef.current = Date.now();
    try { recorderRef.current?.resume?.(); } catch { /* noop */ }
  }, [isRecording]);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
    lastProcessedTranscriptRef.current = '';
    recentTranscriptsRef.current = [];
  }, []);

  const toggleRecording = useCallback(() => {
    if (isRecording) stopRecording();
    else startRecording();
  }, [isRecording, startRecording, stopRecording]);

  useEffect(() => {
    return () => {
      shouldReconnectRef.current = false;
      cleanup();
    };
  }, [cleanup]);

  return {
    toggleRecording,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    resetTranscript,
    isRecording,
    isPaused,
    transcript,
    interimTranscript,
    error,
    connectionStatus,
    reconnectAttempt,
    audioLevel: audioLevel.level,
    audioPeak: audioLevel.peak,
    isSilent: audioLevel.isSilent,
    sendRawAudio,
    connectWebSocket,
    disconnectWebSocket,
  };
}