export type TranscriptionStatus = 'idle' | 'recording' | 'processing' | 'done' | 'error';

export type InputMode = 'record' | 'audio' | 'video';

export interface Subtitle {
  id: string;
  start: number; // seconds
  end: number;   // seconds
  text: string;
}

export interface Transcription {
  id: string;
  title: string;
  text: string;
  subtitles: Subtitle[];
  inputMode: InputMode;
  duration?: number;
  createdAt: Date;
  language?: string;
  fileSize?: number;
  fileName?: string;
}

export interface ApiConfig {
  provider: 'whisper' | 'deepgram' | 'google' | 'browser';
  apiKey: string;
}

export interface RecordingState {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  audioLevel: number;
}
