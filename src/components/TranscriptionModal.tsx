import { Transcription } from '../types';
import TranscriptionDisplay from './TranscriptionDisplay';
import { X, Calendar, Clock, Mic, FileAudio, FileVideo } from 'lucide-react';
import { formatDuration } from '../utils/storage';

interface Props {
  transcription: Transcription;
  onClose: () => void;
  onDelete: (id: string) => void;
}

const MODE_ICONS = {
  record: <Mic className="w-4 h-4" />,
  audio: <FileAudio className="w-4 h-4" />,
  video: <FileVideo className="w-4 h-4" />,
};

export default function TranscriptionModal({ transcription, onClose, onDelete }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-gray-700/50 flex-shrink-0">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold text-white truncate">{transcription.title}</h2>
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                <Calendar className="w-3.5 h-3.5" />
                {new Date(transcription.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric', month: 'short', day: 'numeric',
                  hour: '2-digit', minute: '2-digit'
                })}
              </div>
              {transcription.duration && (
                <div className="flex items-center gap-1.5 text-xs text-gray-400">
                  <Clock className="w-3.5 h-3.5" />
                  {formatDuration(transcription.duration)}
                </div>
              )}
              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                {MODE_ICONS[transcription.inputMode]}
                {transcription.inputMode === 'record' ? 'Recorded' : transcription.inputMode === 'audio' ? 'Audio Upload' : 'Video Upload'}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="ml-4 w-8 h-8 rounded-lg bg-gray-800 hover:bg-gray-700 flex items-center justify-center text-gray-400 hover:text-white transition-colors flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          <TranscriptionDisplay transcription={transcription} />
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-4 border-t border-gray-700/50 flex-shrink-0">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-gray-700 text-gray-400 hover:text-white hover:border-gray-600 text-sm font-medium transition-all"
          >
            Close
          </button>
          <button
            onClick={() => { onDelete(transcription.id); onClose(); }}
            className="py-2.5 px-5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 hover:text-red-300 text-sm font-medium transition-all"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
