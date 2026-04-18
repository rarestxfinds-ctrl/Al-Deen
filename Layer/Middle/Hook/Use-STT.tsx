import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { normalizeArabic } from '@/Top/Utility/Quran/Normalize-Arabic';
import type { AssembledVerse } from '@/Bottom/API/Quran';

function getProxyUrl(): string {
  const host = window.location.hostname;
  if (host.endsWith('.app.github.dev')) {
    const withProxy = host.replace(/-\d+(\.app\.github\.dev)$/, '-8081$1');
    return `wss://${withProxy}`;
  }
  return 'ws://localhost:8081';
}

interface UseDeepgramProps {
  surahId: number;
  verses: AssembledVerse[] | undefined;
  visibleVerse: number;
  hifz: {
    isWordCompleted: (surahId: number, verse: number, word: number) => boolean;
    markWordCompleted: (surahId: number, verse: number, word: number) => void;
  };
}

export function useDeepgram({ surahId, verses, visibleVerse, hifz }: UseDeepgramProps) {
  // ---------- STT state ----------
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'connecting' | 'connected' | 'failed'>('idle');

  const wsRef = useRef<WebSocket | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const shouldReconnectRef = useRef(false);

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

  const alignAndMark = useCallback((rawTranscript: string) => {
    if (rawTranscript === lastProcessedTranscriptRef.current) return;
    lastProcessedTranscriptRef.current = rawTranscript;

    if (!verses || allWords.length === 0) return;

    const normalizedTranscript = normalizeArabic(rawTranscript);
    if (normalizedTranscript.length === 0) return;

    const startIdx = startIdxRef.current;
    if (startIdx >= allWords.length) return;

    const remainingWords = allWords.slice(startIdx);
    const transcriptWords = normalizedTranscript.split(/\s+/).filter(w => w.length > 0);

    let matchedCount = 0;
    for (let i = 0; i < transcriptWords.length && i < remainingWords.length; i++) {
      const refGlyph = remainingWords[i].glyph;
      if (!refGlyph) break;
      const refWordNorm = normalizeArabic(refGlyph);
      if (transcriptWords[i] === refWordNorm) {
        matchedCount++;
      } else {
        break;
      }
    }

    if (matchedCount === 0) return;

    for (let i = 0; i < matchedCount; i++) {
      const w = remainingWords[i];
      hifz.markWordCompleted(surahId, w.verseNumber, w.wordIndex);
    }

    startIdxRef.current += matchedCount;
    console.log(`✅ Marked ${matchedCount} words, new start index: ${startIdxRef.current}`);
  }, [verses, allWords, surahId, hifz]);

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
        setError('WebSocket error — is the STT proxy running on port 8081?');
        reject(new Error('WebSocket connection failed'));
      };
      ws.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason);
        setConnectionStatus('idle');
        if (shouldReconnectRef.current && isRecording) {
          setTimeout(() => connectWebSocket(), 2000);
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
    await connectWebSocket();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : '';
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0 && wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(e.data);
        }
      };

      recorder.start(500);
      setIsRecording(true);
    } catch (err) {
      setConnectionStatus('failed');
      setError(err instanceof Error ? err.message : 'Failed to access microphone');
      cleanup();
    }
  }, [connectWebSocket, cleanup]);

  const stopRecording = useCallback(() => {
    shouldReconnectRef.current = false;
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop();
    }
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.close(1000, 'User stopped recording');
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    setIsRecording(false);
    setInterimTranscript('');
    setConnectionStatus('idle');
    wsRef.current = null;
    recorderRef.current = null;
    streamRef.current = null;
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
    isRecording,
    transcript,
    interimTranscript,
    error,
    connectionStatus,
    sendRawAudio,
    connectWebSocket,
    disconnectWebSocket,
  };
}