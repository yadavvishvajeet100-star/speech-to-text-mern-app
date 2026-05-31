import { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, Square, Pause, Play, RotateCcw, Upload, AlertCircle } from 'lucide-react';
import WaveformVisualizer from './WaveformVisualizer';
import { formatDuration } from '../utils/storage';

interface Props {
  onAudioReady: (blob: Blob, duration: number) => void;
  isProcessing: boolean;
}

export default function AudioRecorder({ onAudioReady, isProcessing }: Props) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);
  const startTimeRef = useRef<number>(0);
  const elapsedRef = useRef<number>(0);

  const startAudioAnalysis = (stream: MediaStream) => {
    try {
      const audioCtx = new AudioContext();
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((s, v) => s + v, 0) / dataArray.length;
        setAudioLevel(avg / 128); // normalize 0-1
        animFrameRef.current = requestAnimationFrame(tick);
      };
      animFrameRef.current = requestAnimationFrame(tick);
    } catch {
      // ignore
    }
  };

  const startTimer = useCallback(() => {
    startTimeRef.current = Date.now() - elapsedRef.current * 1000;
    timerRef.current = window.setInterval(() => {
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      setDuration(elapsed);
      elapsedRef.current = elapsed;
    }, 100);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  const startRecording = async () => {
    setError(null);
    setAudioUrl(null);
    chunksRef.current = [];
    elapsedRef.current = 0;
    setDuration(0);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      setHasPermission(true);
      startAudioAnalysis(stream);

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        onAudioReady(blob, elapsedRef.current);
        stream.getTracks().forEach((t) => t.stop());
        cancelAnimationFrame(animFrameRef.current);
        setAudioLevel(0);
      };

      recorder.start(250);
      setIsRecording(true);
      setIsPaused(false);
      startTimer();
    } catch (err) {
      setHasPermission(false);
      if (err instanceof DOMException && err.name === 'NotAllowedError') {
        setError('Microphone access was denied. Please allow microphone permissions.');
      } else {
        setError('Failed to access microphone. Please check your device.');
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    stopTimer();
    setIsRecording(false);
    setIsPaused(false);
  };

  const pauseRecording = () => {
    if (!mediaRecorderRef.current) return;
    if (isPaused) {
      mediaRecorderRef.current.resume();
      startTimer();
      setIsPaused(false);
    } else {
      mediaRecorderRef.current.pause();
      stopTimer();
      setIsPaused(true);
    }
  };

  const reset = () => {
    stopTimer();
    cancelAnimationFrame(animFrameRef.current);
    if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    setIsRecording(false);
    setIsPaused(false);
    setDuration(0);
    setAudioLevel(0);
    setAudioUrl(null);
    setError(null);
    elapsedRef.current = 0;
    chunksRef.current = [];
  };

  useEffect(() => {
    return () => {
      stopTimer();
      cancelAnimationFrame(animFrameRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    };
  }, [stopTimer]);

  return (
    <div className="space-y-5">
      {/* Waveform */}
      <div className="bg-gray-800/50 rounded-2xl p-4 border border-gray-700/50">
        <WaveformVisualizer
          isActive={isRecording && !isPaused}
          audioLevel={audioLevel}
          color={isRecording ? '#f472b6' : '#818cf8'}
        />

        {/* Timer */}
        <div className="flex items-center justify-center mt-3 gap-3">
          <div
            className={`w-2 h-2 rounded-full ${
              isRecording && !isPaused ? 'bg-red-500 animate-pulse' : 'bg-gray-600'
            }`}
          />
          <span className="font-mono text-2xl font-semibold text-white tabular-nums">
            {formatDuration(duration)}
          </span>
          {isPaused && (
            <span className="text-xs text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded-full">
              PAUSED
            </span>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4">
        {!isRecording ? (
          <button
            onClick={startRecording}
            disabled={isProcessing}
            className="flex items-center gap-2 bg-red-500 hover:bg-red-400 disabled:opacity-50 disabled:cursor-not-allowed text-white px-8 py-3.5 rounded-2xl font-semibold transition-all hover:shadow-lg hover:shadow-red-500/25 active:scale-95"
          >
            <Mic className="w-5 h-5" />
            {duration > 0 ? 'Record Again' : 'Start Recording'}
          </button>
        ) : (
          <>
            <button
              onClick={pauseRecording}
              className="flex items-center gap-2 bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/30 text-yellow-400 px-5 py-3 rounded-xl font-medium transition-all active:scale-95"
            >
              {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
              {isPaused ? 'Resume' : 'Pause'}
            </button>
            <button
              onClick={stopRecording}
              className="flex items-center gap-2 bg-red-500 hover:bg-red-400 text-white px-8 py-3 rounded-xl font-semibold transition-all hover:shadow-lg hover:shadow-red-500/25 active:scale-95"
            >
              <Square className="w-4 h-4 fill-current" />
              Stop
            </button>
          </>
        )}

        {(audioUrl || duration > 0) && !isRecording && (
          <button
            onClick={reset}
            className="p-3 rounded-xl bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-400 hover:text-white transition-all"
            title="Reset"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Audio Playback */}
      {audioUrl && !isRecording && (
        <div className="bg-gray-800/50 rounded-2xl p-4 border border-gray-700/50">
          <div className="flex items-center gap-2 mb-3">
            <Upload className="w-4 h-4 text-indigo-400" />
            <span className="text-sm text-gray-300 font-medium">Recording Preview</span>
          </div>
          <audio
            controls
            src={audioUrl}
            className="w-full h-10"
            style={{ filter: 'invert(1) hue-rotate(180deg) brightness(0.9)' }}
          />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/20 rounded-xl p-3">
          <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {hasPermission === null && !isRecording && duration === 0 && (
        <p className="text-center text-xs text-gray-500">
          Click "Start Recording" to begin. Your browser will request microphone access.
        </p>
      )}
    </div>
  );
}
