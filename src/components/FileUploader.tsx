import { useRef, useState, DragEvent } from 'react';
import { Upload, FileAudio, FileVideo, X, AlertCircle } from 'lucide-react';
import { formatFileSize } from '../utils/storage';

interface Props {
  mode: 'audio' | 'video';
  onFileSelected: (file: File) => void;
  isProcessing: boolean;
  selectedFile: File | null;
  onClearFile: () => void;
}

const AUDIO_TYPES = ['audio/mp3', 'audio/mpeg', 'audio/wav', 'audio/m4a', 'audio/x-m4a', 'audio/ogg', 'audio/webm'];
const VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm', 'video/avi', 'video/mov'];

const MAX_SIZE_MB = 25;

export default function FileUploader({ mode, onFileSelected, isProcessing, selectedFile, onClearFile }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const accept = mode === 'audio' ? '.mp3,.wav,.m4a,.ogg,.webm' : '.mp4,.mov,.webm,.avi';
  const allowedTypes = mode === 'audio' ? AUDIO_TYPES : VIDEO_TYPES;

  const validate = (file: File): string | null => {
    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > MAX_SIZE_MB) return `File too large. Max size is ${MAX_SIZE_MB}MB.`;
    const ext = file.name.split('.').pop()?.toLowerCase();
    const validExts = mode === 'audio' ? ['mp3', 'wav', 'm4a', 'ogg', 'webm'] : ['mp4', 'mov', 'webm', 'avi'];
    if (!ext || (!allowedTypes.includes(file.type) && !validExts.includes(ext))) {
      return `Invalid file type. Please upload a ${mode === 'audio' ? 'audio (MP3, WAV, M4A)' : 'video (MP4, MOV, WEBM)'} file.`;
    }
    return null;
  };

  const handleFile = (file: File) => {
    const err = validate(file);
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    onFileSelected(file);
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const onDragOver = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => setIsDragging(false);

  const getFileIcon = () => {
    if (mode === 'video') return <FileVideo className="w-8 h-8" />;
    return <FileAudio className="w-8 h-8" />;
  };

  const formatType = mode === 'audio' ? 'MP3, WAV, M4A, OGG' : 'MP4, MOV, WEBM';

  return (
    <div className="space-y-4">
      {!selectedFile ? (
        <div
          onClick={() => !isProcessing && inputRef.current?.click()}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          className={`
            relative cursor-pointer border-2 border-dashed rounded-2xl p-10 text-center transition-all
            ${isDragging
              ? 'border-indigo-400 bg-indigo-500/10 scale-[1.01]'
              : 'border-gray-700 bg-gray-800/30 hover:border-gray-500 hover:bg-gray-800/50'
            }
            ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />

          <div className="flex flex-col items-center gap-3">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
              isDragging ? 'bg-indigo-500/20 text-indigo-400' : 'bg-gray-700/50 text-gray-400'
            }`}>
              {getFileIcon()}
            </div>
            <div>
              <p className="text-white font-medium mb-1">
                Drop your {mode} file here
              </p>
              <p className="text-sm text-gray-400">
                or <span className="text-indigo-400">click to browse</span>
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap justify-center">
              {formatType.split(', ').map((fmt) => (
                <span key={fmt} className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full border border-gray-700">
                  {fmt}
                </span>
              ))}
            </div>
            <p className="text-xs text-gray-600">Max file size: {MAX_SIZE_MB}MB</p>
          </div>

          {isDragging && (
            <div className="absolute inset-0 rounded-2xl bg-indigo-500/5 pointer-events-none" />
          )}
        </div>
      ) : (
        <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400 flex-shrink-0">
              {getFileIcon()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-medium truncate">{selectedFile.name}</p>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-xs text-gray-400">{formatFileSize(selectedFile.size)}</span>
                <span className="text-xs text-gray-600">•</span>
                <span className="text-xs text-gray-400 uppercase">{selectedFile.name.split('.').pop()}</span>
              </div>
            </div>
            {!isProcessing && (
              <button
                onClick={onClearFile}
                className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-400 hover:text-white transition-colors flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Progress indicator */}
          {isProcessing && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-400">Processing...</span>
                <span className="text-xs text-indigo-400">Analyzing {mode}</span>
              </div>
              <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full animate-[progress_2s_ease-in-out_infinite]" />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Re-upload button */}
      {selectedFile && !isProcessing && (
        <button
          onClick={() => { onClearFile(); setTimeout(() => inputRef.current?.click(), 100); }}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-gray-700 hover:border-gray-600 text-gray-400 hover:text-white text-sm transition-all"
        >
          <Upload className="w-4 h-4" />
          Upload Different File
        </button>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/20 rounded-xl p-3">
          <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}
    </div>
  );
}
