import { useState } from 'react';
import { Transcription } from '../types';
import { Copy, Download, Check, FileText, Subtitles, Clock } from 'lucide-react';
import { exportSRT, exportVTT, formatTimestamp } from '../utils/storage';

interface Props {
  transcription: Transcription;
  isLive?: boolean;
  liveText?: string;
}

export default function TranscriptionDisplay({ transcription, isLive, liveText }: Props) {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'text' | 'subtitles'>('text');

  const displayText = isLive ? liveText || '' : transcription.text;

  const copyText = async () => {
    await navigator.clipboard.writeText(displayText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadTxt = () => {
    const blob = new Blob([displayText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${transcription.title || 'transcription'}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadSRT = () => {
    const content = exportSRT(transcription.subtitles);
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${transcription.title || 'subtitles'}.srt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadVTT = () => {
    const content = exportVTT(transcription.subtitles);
    const blob = new Blob([content], { type: 'text/vtt' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${transcription.title || 'subtitles'}.vtt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const wordCount = displayText.split(/\s+/).filter(Boolean).length;
  const charCount = displayText.length;

  return (
    <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700/50">
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg overflow-hidden border border-gray-700">
            <button
              onClick={() => setActiveTab('text')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${
                activeTab === 'text' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              Text
            </button>
            {transcription.subtitles.length > 0 && (
              <button
                onClick={() => setActiveTab('subtitles')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors border-l border-gray-700 ${
                  activeTab === 'subtitles' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                <Subtitles className="w-3.5 h-3.5" />
                Subtitles
                <span className="ml-1 bg-indigo-500/30 text-indigo-300 px-1.5 py-0.5 rounded-full text-[10px]">
                  {transcription.subtitles.length}
                </span>
              </button>
            )}
          </div>
          {isLive && (
            <div className="flex items-center gap-1.5 text-xs text-green-400">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              Live
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={copyText}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white bg-gray-700/50 hover:bg-gray-700 px-3 py-1.5 rounded-lg transition-all"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied!' : 'Copy'}
          </button>

          <div className="relative group">
            <button className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white bg-gray-700/50 hover:bg-gray-700 px-3 py-1.5 rounded-lg transition-all">
              <Download className="w-3.5 h-3.5" />
              Export
            </button>
            <div className="absolute right-0 top-full mt-1 bg-gray-800 border border-gray-700 rounded-xl overflow-hidden shadow-2xl z-10 hidden group-hover:block min-w-[140px]">
              <button onClick={downloadTxt} className="w-full text-left px-3 py-2 text-xs text-gray-300 hover:bg-gray-700 hover:text-white transition-colors">
                📄 TXT File
              </button>
              {transcription.subtitles.length > 0 && (
                <>
                  <button onClick={downloadSRT} className="w-full text-left px-3 py-2 text-xs text-gray-300 hover:bg-gray-700 hover:text-white transition-colors">
                    🎬 SRT Subtitles
                  </button>
                  <button onClick={downloadVTT} className="w-full text-left px-3 py-2 text-xs text-gray-300 hover:bg-gray-700 hover:text-white transition-colors">
                    🎬 VTT Subtitles
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        {activeTab === 'text' ? (
          <>
            {displayText ? (
              <p className={`text-gray-200 leading-relaxed text-sm ${isLive ? 'min-h-[100px]' : ''}`}>
                {displayText}
                {isLive && (
                  <span className="inline-block w-0.5 h-4 bg-indigo-400 ml-1 animate-pulse align-middle" />
                )}
              </p>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-gray-600">
                <FileText className="w-8 h-8 mb-2 opacity-50" />
                <p className="text-sm">No transcription yet</p>
              </div>
            )}
          </>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1 custom-scroll">
            {transcription.subtitles.map((sub, i) => (
              <div key={sub.id} className="flex gap-4 py-2 border-b border-gray-700/40 last:border-0">
                <span className="text-xs text-gray-500 font-mono w-5 flex-shrink-0 mt-0.5">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="w-3 h-3 text-indigo-400 flex-shrink-0" />
                    <span className="text-xs text-indigo-300 font-mono">
                      {formatTimestamp(sub.start)} → {formatTimestamp(sub.end)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-200">{sub.text}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Stats */}
      {displayText && (
        <div className="flex items-center gap-4 px-5 py-3 border-t border-gray-700/40 bg-gray-800/30">
          <span className="text-xs text-gray-500">{wordCount} words</span>
          <span className="text-xs text-gray-600">•</span>
          <span className="text-xs text-gray-500">{charCount} characters</span>
          {transcription.language && (
            <>
              <span className="text-xs text-gray-600">•</span>
              <span className="text-xs text-gray-500">🌐 {transcription.language}</span>
            </>
          )}
          {transcription.subtitles.length > 0 && (
            <>
              <span className="text-xs text-gray-600">•</span>
              <span className="text-xs text-gray-500">{transcription.subtitles.length} segments</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
