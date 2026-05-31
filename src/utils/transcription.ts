import { Subtitle } from '../types';

/**
 * Calls OpenAI Whisper API directly from the browser.
 * Returns transcription text and word-level timestamps (if available).
 */
export const transcribeWithWhisper = async (
  audioBlob: Blob,
  apiKey: string,
  language?: string
): Promise<{ text: string; subtitles: Subtitle[] }> => {
  const formData = new FormData();

  // Determine file extension based on blob type
  const mimeType = audioBlob.type || 'audio/webm';
  let ext = 'webm';
  if (mimeType.includes('mp3') || mimeType.includes('mpeg')) ext = 'mp3';
  else if (mimeType.includes('wav')) ext = 'wav';
  else if (mimeType.includes('m4a') || mimeType.includes('mp4')) ext = 'm4a';
  else if (mimeType.includes('ogg')) ext = 'ogg';

  const file = new File([audioBlob], `audio.${ext}`, { type: mimeType });

  formData.append('file', file);
  formData.append('model', 'whisper-1');
  formData.append('response_format', 'verbose_json');
  formData.append('timestamp_granularities[]', 'segment');
  if (language) formData.append('language', language);

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Whisper API error: ${response.status} – ${errText}`);
  }

  const data = await response.json();
  const fullText: string = data.text || '';
  const segments: { start: number; end: number; text: string }[] = data.segments || [];

  const subtitles: Subtitle[] = segments.map((seg, i) => ({
    id: `seg-${i}`,
    start: seg.start,
    end: seg.end,
    text: seg.text.trim(),
  }));

  // If no segments returned, create a single subtitle for the whole text
  if (subtitles.length === 0 && fullText) {
    subtitles.push({ id: 'seg-0', start: 0, end: 60, text: fullText });
  }

  return { text: fullText, subtitles };
};

/**
 * Browser's built-in Web Speech API for real-time transcription.
 * Returns a controller object to start/stop recognition.
 */
interface SpeechRecognitionResultItem {
  transcript: string;
  confidence: number;
}
interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  [index: number]: SpeechRecognitionResultItem;
}
interface SpeechRecognitionResultList {
  length: number;
  resultIndex: number;
  results: SpeechRecognitionResult[];
  [index: number]: SpeechRecognitionResult;
}
interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}
interface SpeechRecognitionErrorEventLike {
  error: string;
}
interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

export const createBrowserSpeechRecognizer = (
  onInterim: (text: string) => void,
  onFinal: (text: string) => void,
  onError: (err: string) => void
): SpeechRecognitionLike | null => {
  const win = window as unknown as Record<string, unknown>;
  const SpeechRecognitionCtor = (win['SpeechRecognition'] || win['webkitSpeechRecognition']) as
    | (new () => SpeechRecognitionLike)
    | undefined;

  if (!SpeechRecognitionCtor) {
    onError('Web Speech API not supported in this browser.');
    return null;
  }

  const recognition = new SpeechRecognitionCtor();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = 'en-US';

  recognition.onresult = (event: SpeechRecognitionEventLike) => {
    let interim = '';
    let final = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        final += transcript + ' ';
      } else {
        interim += transcript;
      }
    }
    if (interim) onInterim(interim);
    if (final) onFinal(final);
  };

  recognition.onerror = (event: SpeechRecognitionErrorEventLike) => {
    onError(event.error);
  };

  return recognition;
};

/**
 * Splits a long text into subtitle-like segments of ~7 words each,
 * spread evenly across the given duration.
 */
export const generateSubtitlesFromText = (text: string, duration: number): Subtitle[] => {
  const words = text.split(/\s+/).filter(Boolean);
  const wordsPerSegment = 8;
  const segments: Subtitle[] = [];
  const timePerWord = duration / Math.max(words.length, 1);

  for (let i = 0; i < words.length; i += wordsPerSegment) {
    const chunk = words.slice(i, i + wordsPerSegment);
    const start = i * timePerWord;
    const end = Math.min((i + wordsPerSegment) * timePerWord, duration);
    segments.push({
      id: `gen-${i}`,
      start,
      end,
      text: chunk.join(' '),
    });
  }

  return segments;
};

/**
 * Extracts audio from a video file using Web Audio API / OfflineAudioContext
 * Returns an audio Blob (WAV).
 */
export const extractAudioFromVideo = async (videoFile: File): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.src = URL.createObjectURL(videoFile);
    video.muted = true;
    video.load();

    video.onloadedmetadata = async () => {
      try {
        const audioCtx = new AudioContext();
        const arrayBuffer = await videoFile.arrayBuffer();
        const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

        const offlineCtx = new OfflineAudioContext(
          1,
          audioBuffer.sampleRate * audioBuffer.duration,
          audioBuffer.sampleRate
        );
        const source = offlineCtx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(offlineCtx.destination);
        source.start();

        const renderedBuffer = await offlineCtx.startRendering();
        const wavBlob = audioBufferToWav(renderedBuffer);
        URL.revokeObjectURL(video.src);
        resolve(wavBlob);
      } catch (err) {
        // Fallback: just pass the video file directly (Whisper can handle video)
        URL.revokeObjectURL(video.src);
        resolve(videoFile);
      }
    };

    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      reject(new Error('Failed to load video file'));
    };
  });
};

/** Convert AudioBuffer to WAV Blob */
function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numChannels = 1;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;

  const dataLength = buffer.length * numChannels * (bitDepth / 8);
  const wavBuffer = new ArrayBuffer(44 + dataLength);
  const view = new DataView(wavBuffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataLength, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * (bitDepth / 8), true);
  view.setUint16(32, numChannels * (bitDepth / 8), true);
  view.setUint16(34, bitDepth, true);
  writeString(36, 'data');
  view.setUint32(40, dataLength, true);

  const channelData = buffer.getChannelData(0);
  let offset = 44;
  for (let i = 0; i < channelData.length; i++) {
    const sample = Math.max(-1, Math.min(1, channelData[i]));
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
    offset += 2;
  }

  return new Blob([wavBuffer], { type: 'audio/wav' });
}
