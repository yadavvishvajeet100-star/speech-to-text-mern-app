import { useState } from 'react';
import { Transcription } from '../types';
import { formatDuration } from '../utils/storage';
import {
  Trash2, Search, FileAudio, FileVideo, Mic, ChevronRight,
  Clock, SortDesc, Subtitles, X
} from 'lucide-react';

interface Props {
  transcriptions: Transcription[];
  onDelete: (id: string) => void;
  onSelect: (t: Transcription) => void;
  onDeleteAll: () => void;
}

const MODE_ICONS = {
  record: <Mic className="w-3.5 h-3.5" />,
  audio: <FileAudio className="w-3.5 h-3.5" />,
  video: <FileVideo className="w-3.5 h-3.5" />,
};

const MODE_COLORS = {
  record: 'text-red-400 bg-red-400/10 border-red-400/20',
  audio: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
  video: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
};

export default function HistoryPanel({ transcriptions, onDelete, onSelect, onDeleteAll }: Props) {
  const [search, setSearch] = useState('');
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const filtered = transcriptions.filter(
    (t) =>
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.text.toLowerCase().includes(search.toLowerCase())
  );

  const formatRelativeTime = (date: Date) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Date(date).toLocaleDateString();
  };

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search transcriptions..."
          className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <SortDesc className="w-4 h-4 text-gray-500" />
          <span className="text-xs text-gray-500">
            {filtered.length} of {transcriptions.length} records
          </span>
        </div>
        {transcriptions.length > 0 && !confirmDeleteAll && (
          <button
            onClick={() => setConfirmDeleteAll(true)}
            className="text-xs text-red-400 hover:text-red-300 transition-colors flex items-center gap-1"
          >
            <Trash2 className="w-3 h-3" />
            Clear all
          </button>
        )}
        {confirmDeleteAll && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-red-400">Sure?</span>
            <button
              onClick={() => { onDeleteAll(); setConfirmDeleteAll(false); }}
              className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-lg hover:bg-red-400 transition-colors"
            >
              Yes
            </button>
            <button
              onClick={() => setConfirmDeleteAll(false)}
              className="text-xs text-gray-400 hover:text-white transition-colors"
            >
              No
            </button>
          </div>
        )}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-600">
            <Clock className="w-10 h-10 mb-3 opacity-40" />
            {search ? (
              <p className="text-sm text-center">No results for "{search}"</p>
            ) : (
              <>
                <p className="text-sm font-medium mb-1">No transcriptions yet</p>
                <p className="text-xs text-center max-w-[200px]">
                  Record audio, upload a file, or process a video to get started.
                </p>
              </>
            )}
          </div>
        ) : (
          filtered.map((t) => (
            <div
              key={t.id}
              className="group relative bg-gray-800/50 hover:bg-gray-800 border border-gray-700/50 hover:border-gray-600 rounded-xl overflow-hidden transition-all cursor-pointer"
              onClick={() => onSelect(t)}
            >
              <div className="p-3">
                {/* Top row */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium flex-shrink-0 ${
                        MODE_COLORS[t.inputMode]
                      }`}
                    >
                      {MODE_ICONS[t.inputMode]}
                      {t.inputMode}
                    </span>
                    {t.subtitles.length > 0 && (
                      <span className="flex items-center gap-1 text-xs text-indigo-400 bg-indigo-400/10 border border-indigo-400/20 px-2 py-0.5 rounded-full flex-shrink-0">
                        <Subtitles className="w-3 h-3" />
                        {t.subtitles.length}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <span className="text-xs text-gray-500">{formatRelativeTime(t.createdAt)}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-gray-600 group-hover:text-gray-400 transition-colors" />
                  </div>
                </div>

                {/* Title */}
                <p className="text-sm font-medium text-white mb-1 truncate">{t.title}</p>

                {/* Preview */}
                <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">{t.text || 'No transcription text'}</p>

                {/* Meta */}
                <div className="flex items-center gap-3 mt-2">
                  {t.duration && (
                    <span className="text-xs text-gray-600 flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" />
                      {formatDuration(t.duration)}
                    </span>
                  )}
                  {t.fileName && (
                    <span className="text-xs text-gray-600 truncate max-w-[120px]">{t.fileName}</span>
                  )}
                </div>
              </div>

              {/* Delete button */}
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                {confirmDeleteId === t.id ? (
                  <div className="flex items-center gap-1 bg-gray-900 border border-gray-700 rounded-lg p-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); onDelete(t.id); setConfirmDeleteId(null); }}
                      className="text-[10px] bg-red-500 text-white px-1.5 py-0.5 rounded transition-colors hover:bg-red-400"
                    >
                      Delete
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(null); }}
                      className="text-[10px] text-gray-400 px-1 transition-colors hover:text-white"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(t.id); }}
                    className="p-1.5 rounded-lg bg-gray-900/80 text-gray-500 hover:text-red-400 hover:bg-red-400/10 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
