import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Mic, FileAudio, FileVideo, Settings, History, Zap,
  ChevronRight, Loader2, CheckCircle2, AlertCircle, Sparkles,
  X, Languages
} from 'lucide-react';
import AudioRecorder from './components/AudioRecorder';
import FileUploader from './components/FileUploader';
import VideoPlayer from './components/VideoPlayer';
import TranscriptionDisplay from './components/TranscriptionDisplay';
import HistoryPanel from './components/HistoryPanel';
import ApiKeyModal from './components/ApiKeyModal';
import TranscriptionModal from './components/TranscriptionModal';
import LiveSubtitleOverlay from './components/LiveSubtitleOverlay';
import { Transcription, InputMode } from './types';
import {
  saveTranscription,
  getTranscriptions,
  deleteTranscription,
  clearAllTranscriptions,
} from './utils/storage';
import { transcribeWithWhisper, generateSubtitlesFromText, createBrowserSpeechRecognizer, extractAudioFromVideo } from './utils/transcription';
import { v4 as uuidv4 } from 'uuid';

type AppStatus = 'idle' | 'processing' | 'done' | 'error';

const TABS: { id: InputMode; label: string; icon: React.ReactNode }[] = [
  { id: 'record', label: 'Record', icon: <Mic className="w-4 h-4" /> },
  { id: 'audio', label: 'Audio Upload', icon: <FileAudio className="w-4 h-4" /> },
  { id: 'video', label: 'Video Upload', icon: <FileVideo className="w-4 h-4" /> },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<InputMode>('record');
  const [status, setStatus] = useState<AppStatus>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [showApiModal, setShowApiModal] = useState(false);
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('vs_api_key') || '');
  const [apiProvider, setApiProvider] = useState(() => localStorage.getItem('vs_provider') || 'browser');
  const [transcriptions, setTranscriptions] = useState<Transcription[]>([]);
  const [currentTranscription, setCurrentTranscription] = useState<Transcription | null>(null);
  const [selectedAudioFile, setSelectedAudioFile] = useState<File | null>(null);
  const [selectedVideoFile, setSelectedVideoFile] = useState<File | null>(null);
  const [selectedTranscription, setSelectedTranscription] = useState<Transcription | null>(null);

  // Live recording state
  const [isRecordingActive, setIsRecordingActive] = useState(false);
  const [liveText, setLiveText] = useState('');
  const [liveInterim, setLiveInterim] = useState('');
  const recognizerRef = useRef<{ start: () => void; stop: () => void; abort: () => void } | null>(null);
  const liveTextRef = useRef('');

  const [pendingAudioBlob, setPendingAudioBlob] = useState<{ blob: Blob; duration: number } | null>(null);

  useEffect(() => {
    setTranscriptions(getTranscriptions());
  }, []);

  const handleApiSave = (key: string, provider: string) => {
    setApiKey(key);
    setApiProvider(provider);
    localStorage.setItem('vs_api_key', key);
    localStorage.setItem('vs_provider', provider);
  };

  const transcribeBlob = useCallback(
    async (blob: Blob, duration: number, mode: InputMode, fileName?: string, fileSize?: number) => {
      setStatus('processing');
      setErrorMsg('');
      try {
        let text = '';
        let subtitles: Transcription['subtitles'] = [];

        if (apiProvider === 'whisper' && apiKey) {
          const result = await transcribeWithWhisper(blob, apiKey);
          text = result.text;
          subtitles = result.subtitles;
        } else if (apiProvider === 'browser') {
          // For uploads, generate subtitles from the live text that was already collected or empty
          text = liveTextRef.current || '(Browser mode works best with live recording. Switch to Whisper for file uploads.)';
          subtitles = generateSubtitlesFromText(text, duration);
        } else {
          throw new Error('Please configure an API key in Settings.');
        }

        const newTranscription: Transcription = {
          id: uuidv4(),
          title: fileName
            ? fileName.replace(/\.[^/.]+$/, '')
            : `Recording ${new Date().toLocaleTimeString()}`,
          text,
          subtitles,
          inputMode: mode,
          duration,
          createdAt: new Date(),
          fileName,
          fileSize,
        };

        saveTranscription(newTranscription);
        setTranscriptions(getTranscriptions());
        setCurrentTranscription(newTranscription);
        setStatus('done');
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        setErrorMsg(msg);
        setStatus('error');
      }
    },
    [apiKey, apiProvider]
  );

  // Handle audio ready from recorder
  const handleAudioReady = useCallback(
    (blob: Blob, duration: number) => {
      setPendingAudioBlob({ blob, duration });
      setIsRecordingActive(false);
      // Stop live recognition
      if (recognizerRef.current) {
        recognizerRef.current.stop();
        recognizerRef.current = null;
      }
    },
    []
  );

  const handleTranscribeRecording = useCallback(async () => {
    if (!pendingAudioBlob) return;
    if (apiProvider === 'browser') {
      // Use the already-collected live text
      const text = liveTextRef.current.trim();
      const subtitles = generateSubtitlesFromText(text, pendingAudioBlob.duration);
      const newT: Transcription = {
        id: uuidv4(),
        title: `Recording ${new Date().toLocaleTimeString()}`,
        text,
        subtitles,
        inputMode: 'record',
        duration: pendingAudioBlob.duration,
        createdAt: new Date(),
      };
      saveTranscription(newT);
      setTranscriptions(getTranscriptions());
      setCurrentTranscription(newT);
      setStatus('done');
      setLiveText('');
      setLiveInterim('');
      liveTextRef.current = '';
    } else {
      await transcribeBlob(pendingAudioBlob.blob, pendingAudioBlob.duration, 'record');
    }
    setPendingAudioBlob(null);
  }, [pendingAudioBlob, apiProvider, transcribeBlob]);

  // Start live browser recognition when recording starts
  const startLiveRecognition = useCallback(() => {
    setIsRecordingActive(true);
    if (apiProvider !== 'browser') return;
    setLiveText('');
    setLiveInterim('');
    liveTextRef.current = '';

    const rec = createBrowserSpeechRecognizer(
      (interim) => setLiveInterim(interim),
      (final) => {
        liveTextRef.current += final;
        setLiveText(liveTextRef.current);
        setLiveInterim('');
      },
      (err) => console.warn('Speech recognition error:', err)
    );
    if (rec) {
      recognizerRef.current = rec;
      try {
        rec.start();
      } catch { /* already started */ }
    }
  }, [apiProvider]);

  const handleAudioFileTranscribe = useCallback(async () => {
    if (!selectedAudioFile) return;
    await transcribeBlob(
      selectedAudioFile,
      0,
      'audio',
      selectedAudioFile.name,
      selectedAudioFile.size
    );
  }, [selectedAudioFile, transcribeBlob]);

  const handleVideoFileTranscribe = useCallback(async () => {
    if (!selectedVideoFile) return;
    setStatus('processing');
    setErrorMsg('');
    try {
      let audioBlob: Blob;
      if (apiProvider === 'whisper' && apiKey) {
        // Pass the video file directly to Whisper (it supports video)
        audioBlob = selectedVideoFile;
      } else {
        audioBlob = await extractAudioFromVideo(selectedVideoFile);
      }

      let text = '';
      let subtitles: Transcription['subtitles'] = [];

      if (apiProvider === 'whisper' && apiKey) {
        const result = await transcribeWithWhisper(audioBlob, apiKey);
        text = result.text;
        subtitles = result.subtitles;
      } else {
        text = '(Browser mode does not support video file transcription. Please use OpenAI Whisper API.)';
        subtitles = [];
      }

      const newT: Transcription = {
        id: uuidv4(),
        title: selectedVideoFile.name.replace(/\.[^/.]+$/, ''),
        text,
        subtitles,
        inputMode: 'video',
        duration: undefined,
        createdAt: new Date(),
        fileName: selectedVideoFile.name,
        fileSize: selectedVideoFile.size,
      };

      saveTranscription(newT);
      setTranscriptions(getTranscriptions());
      setCurrentTranscription(newT);
      setStatus('done');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setErrorMsg(msg);
      setStatus('error');
    }
  }, [selectedVideoFile, apiProvider, apiKey]);

  const handleDelete = (id: string) => {
    deleteTranscription(id);
    setTranscriptions(getTranscriptions());
    if (currentTranscription?.id === id) setCurrentTranscription(null);
  };

  const handleDeleteAll = () => {
    clearAllTranscriptions();
    setTranscriptions([]);
    setCurrentTranscription(null);
  };

  const resetSession = () => {
    setStatus('idle');
    setCurrentTranscription(null);
    setErrorMsg('');
    setPendingAudioBlob(null);
    setSelectedAudioFile(null);
    setSelectedVideoFile(null);
    setLiveText('');
    setLiveInterim('');
    liveTextRef.current = '';
  };

  const isProcessing = status === 'processing';
  const isDone = status === 'done';
  const isError = status === 'error';

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-800/60 bg-gray-900/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white leading-none">VoiceScript AI</h1>
              <p className="text-[11px] text-gray-400 leading-none mt-0.5">Speech-to-Text & Subtitles</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Provider badge */}
            <button
              onClick={() => setShowApiModal(true)}
              className="hidden sm:flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-gray-800 border border-gray-700 hover:border-gray-600 text-gray-300 hover:text-white transition-all"
            >
              <div className={`w-1.5 h-1.5 rounded-full ${apiProvider === 'whisper' && apiKey ? 'bg-green-400' : apiProvider === 'browser' ? 'bg-blue-400' : 'bg-yellow-400 animate-pulse'}`} />
              {apiProvider === 'whisper' && apiKey ? 'Whisper API' : apiProvider === 'browser' ? 'Browser STT' : 'Setup API'}
            </button>

            <button
              onClick={() => setShowApiModal(true)}
              className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-400 hover:text-white transition-all"
              title="Settings"
            >
              <Settings className="w-4 h-4" />
            </button>

            <button
              onClick={() => setShowHistory(!showHistory)}
              className={`flex items-center gap-1.5 p-2 rounded-lg border text-sm transition-all ${
                showHistory
                  ? 'bg-indigo-600 border-indigo-500 text-white'
                  : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white hover:border-gray-600'
              }`}
              title="History"
            >
              <History className="w-4 h-4" />
              {transcriptions.length > 0 && (
                <span className={`text-xs font-medium ${showHistory ? 'text-white' : 'text-gray-400'}`}>
                  {transcriptions.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex max-w-7xl mx-auto w-full">
        {/* Main content */}
        <main className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 p-4 sm:p-6 space-y-6 max-w-3xl mx-auto w-full">
            {/* Hero */}
            <div className="text-center pt-4">
              <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 px-4 py-1.5 rounded-full text-xs text-indigo-400 mb-4">
                <Zap className="w-3.5 h-3.5" />
                AI-Powered Speech Recognition
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-2">
                Turn Speech into{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
                  Text Instantly
                </span>
              </h2>
              <p className="text-gray-400 text-sm sm:text-base max-w-lg mx-auto">
                Record audio, upload files, or process videos. Generate transcriptions and subtitles with AI precision.
              </p>
            </div>

            {/* Input Mode Tabs */}
            <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-1.5 flex gap-1">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => { setActiveTab(tab.id); resetSession(); }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-medium transition-all ${
                    activeTab === tab.id
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                  }`}
                >
                  {tab.icon}
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Input Area */}
            <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-5 sm:p-6">
              {activeTab === 'record' && (
                <div className="space-y-4">
                  <AudioRecorder
                    onAudioReady={handleAudioReady}
                    isProcessing={isProcessing}
                  />

                  {/* Live text during browser mode */}
                  {apiProvider === 'browser' && (liveText || liveInterim) && (
                    <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                        <span className="text-xs text-green-400 font-medium">Live Transcription</span>
                      </div>
                      <p className="text-sm text-gray-200 leading-relaxed">
                        {liveText}
                        <span className="text-gray-500 italic">{liveInterim}</span>
                        <span className="inline-block w-0.5 h-4 bg-indigo-400 ml-1 animate-pulse align-middle" />
                      </p>
                    </div>
                  )}

                  {/* Transcribe button */}
                  {pendingAudioBlob && (
                    <button
                      onClick={handleTranscribeRecording}
                      disabled={isProcessing}
                      className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 text-white font-semibold transition-all hover:shadow-lg hover:shadow-indigo-500/25 active:scale-[0.98]"
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Transcribing...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-5 h-5" />
                          Generate Transcription
                          <ChevronRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  )}

                  {/* Live start hint */}
                  {apiProvider === 'browser' && !pendingAudioBlob && (
                    <button
                      onClick={startLiveRecognition}
                      className="w-full text-xs text-center text-indigo-400 hover:text-indigo-300 py-1 transition-colors"
                    >
                      ✨ Click to also enable live browser transcription while recording
                    </button>
                  )}
                </div>
              )}

              {activeTab === 'audio' && (
                <div className="space-y-4">
                  <FileUploader
                    mode="audio"
                    onFileSelected={setSelectedAudioFile}
                    isProcessing={isProcessing}
                    selectedFile={selectedAudioFile}
                    onClearFile={() => { setSelectedAudioFile(null); resetSession(); }}
                  />
                  {selectedAudioFile && !isProcessing && status !== 'done' && (
                    <button
                      onClick={handleAudioFileTranscribe}
                      className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold transition-all hover:shadow-lg hover:shadow-indigo-500/25 active:scale-[0.98]"
                    >
                      <Sparkles className="w-5 h-5" />
                      Transcribe Audio
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}

              {activeTab === 'video' && (
                <div className="space-y-4">
                  <FileUploader
                    mode="video"
                    onFileSelected={setSelectedVideoFile}
                    isProcessing={isProcessing}
                    selectedFile={selectedVideoFile}
                    onClearFile={() => { setSelectedVideoFile(null); resetSession(); }}
                  />
                  {selectedVideoFile && !isProcessing && status !== 'done' && (
                    <button
                      onClick={handleVideoFileTranscribe}
                      className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold transition-all hover:shadow-lg hover:shadow-indigo-500/25 active:scale-[0.98]"
                    >
                      <Sparkles className="w-5 h-5" />
                      Generate Subtitles
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Processing State */}
            {isProcessing && (
              <div className="bg-gray-900/50 border border-indigo-500/20 rounded-2xl p-6 flex flex-col items-center gap-4">
                <div className="relative">
                  <div className="w-16 h-16 rounded-full border-2 border-indigo-500/30 flex items-center justify-center">
                    <Loader2 className="w-7 h-7 text-indigo-400 animate-spin" />
                  </div>
                  <div className="absolute inset-0 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
                </div>
                <div className="text-center">
                  <p className="text-white font-medium">Processing your {activeTab === 'video' ? 'video' : 'audio'}...</p>
                  <p className="text-sm text-gray-400 mt-1">
                    {apiProvider === 'whisper' ? 'Sending to OpenAI Whisper API' : 'Analyzing with browser engine'}
                  </p>
                </div>
                {/* Animated progress */}
                <div className="w-full max-w-xs h-1 bg-gray-800 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 rounded-full animate-[shimmer_1.5s_ease-in-out_infinite] bg-[length:200%_100%]" />
                </div>
              </div>
            )}

            {/* Error State */}
            {isError && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-5">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-red-400 mb-1">Transcription Failed</p>
                    <p className="text-xs text-red-300/80">{errorMsg}</p>
                    <div className="flex gap-3 mt-3">
                      <button
                        onClick={resetSession}
                        className="text-xs text-red-300 hover:text-white px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 transition-all"
                      >
                        Try Again
                      </button>
                      <button
                        onClick={() => setShowApiModal(true)}
                        className="text-xs text-gray-400 hover:text-white px-3 py-1.5 rounded-lg bg-gray-800 border border-gray-700 hover:border-gray-600 transition-all"
                      >
                        Check API Settings
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Result */}
            {isDone && currentTranscription && (
              <div className="space-y-4">
                {/* Success header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-400" />
                    <span className="text-white font-medium">Transcription Complete</span>
                  </div>
                  <button
                    onClick={resetSession}
                    className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white px-3 py-1.5 rounded-lg bg-gray-800 border border-gray-700 hover:border-gray-600 transition-all"
                  >
                    <X className="w-3.5 h-3.5" />
                    New Session
                  </button>
                </div>

                {/* Transcription */}
                <TranscriptionDisplay transcription={currentTranscription} />

                {/* Video player with subtitles */}
                {activeTab === 'video' && selectedVideoFile && currentTranscription.subtitles.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Languages className="w-4 h-4 text-indigo-400" />
                      <span className="text-sm font-medium text-white">Video with Live Subtitles</span>
                    </div>
                    <VideoPlayer
                      file={selectedVideoFile}
                      subtitles={currentTranscription.subtitles}
                    />
                  </div>
                )}
              </div>
            )}

            {/* API Setup Prompt */}
            {!apiKey && apiProvider !== 'browser' && status === 'idle' && (
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-5">
                <div className="flex items-start gap-3">
                  <Zap className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-yellow-400 mb-1">Configure API Key</p>
                    <p className="text-xs text-yellow-300/70 mb-3">
                      Add your OpenAI Whisper API key for high-accuracy transcription, or use the free browser-based option.
                    </p>
                    <button
                      onClick={() => setShowApiModal(true)}
                      className="text-xs text-yellow-400 hover:text-yellow-300 px-3 py-1.5 rounded-lg bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/20 transition-all"
                    >
                      Open Settings →
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>

        {/* History Sidebar */}
        {showHistory && (
          <aside className="w-80 border-l border-gray-800 bg-gray-900/50 flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-800">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-indigo-400" />
                <h3 className="text-sm font-semibold text-white">Transcription History</h3>
              </div>
              <button
                onClick={() => setShowHistory(false)}
                className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden p-4">
              <HistoryPanel
                transcriptions={transcriptions}
                onDelete={handleDelete}
                onSelect={(t) => setSelectedTranscription(t)}
                onDeleteAll={handleDeleteAll}
              />
            </div>
          </aside>
        )}
      </div>

      {/* Modals */}
      {showApiModal && (
        <ApiKeyModal
          apiKey={apiKey}
          provider={apiProvider}
          onSave={handleApiSave}
          onClose={() => setShowApiModal(false)}
        />
      )}

      {selectedTranscription && (
        <TranscriptionModal
          transcription={selectedTranscription}
          onClose={() => setSelectedTranscription(null)}
          onDelete={(id) => { handleDelete(id); setSelectedTranscription(null); }}
        />
      )}

      {/* Live Subtitle Overlay – shown during recording with browser STT */}
      <LiveSubtitleOverlay
        text={liveText}
        interim={liveInterim}
        isVisible={isRecordingActive && apiProvider === 'browser'}
      />

      {/* Footer */}
      <footer className="border-t border-gray-800/60 py-4 px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <p className="text-xs text-gray-600">
            VoiceScript AI · Powered by OpenAI Whisper & Web Speech API
          </p>
          <div className="flex items-center gap-4">
            <span className="text-xs text-gray-600">React + Vite + TailwindCSS</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
