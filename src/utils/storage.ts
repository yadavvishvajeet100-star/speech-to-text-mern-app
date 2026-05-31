import { Transcription } from '../types';

const STORAGE_KEY = 'voicescript_transcriptions';

export const saveTranscription = (transcription: Transcription): void => {
  const existing = getTranscriptions();
  const updated = [transcription, ...existing];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
};

export const getTranscriptions = (): Transcription[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    const parsed = JSON.parse(data);
    return parsed.map((t: Transcription) => ({
      ...t,
      createdAt: new Date(t.createdAt),
    }));
  } catch {
    return [];
  }
};

export const deleteTranscription = (id: string): void => {
  const existing = getTranscriptions();
  const updated = existing.filter((t) => t.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
};

export const updateTranscription = (id: string, updates: Partial<Transcription>): void => {
  const existing = getTranscriptions();
  const updated = existing.map((t) => (t.id === id ? { ...t, ...updates } : t));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
};

export const clearAllTranscriptions = (): void => {
  localStorage.removeItem(STORAGE_KEY);
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

export const formatDuration = (seconds: number): string => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
};

export const formatTimestamp = (seconds: number): string => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
};

export const exportSRT = (subtitles: { start: number; end: number; text: string }[]): string => {
  return subtitles
    .map((sub, idx) => {
      return `${idx + 1}\n${formatTimestamp(sub.start)} --> ${formatTimestamp(sub.end)}\n${sub.text}\n`;
    })
    .join('\n');
};

export const exportVTT = (subtitles: { start: number; end: number; text: string }[]): string => {
  const formatVttTime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = Math.floor(s % 60);
    const ms = Math.floor((s % 1) * 1000);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
  };
  const cues = subtitles
    .map((sub) => `${formatVttTime(sub.start)} --> ${formatVttTime(sub.end)}\n${sub.text}`)
    .join('\n\n');
  return `WEBVTT\n\n${cues}`;
};
