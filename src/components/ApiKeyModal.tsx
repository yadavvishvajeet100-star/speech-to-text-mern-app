import { useState } from 'react';
import { Key, X, Eye, EyeOff, ExternalLink, Zap } from 'lucide-react';

interface Props {
  apiKey: string;
  provider: string;
  onSave: (key: string, provider: string) => void;
  onClose: () => void;
}

const PROVIDERS = [
  {
    id: 'whisper',
    name: 'OpenAI Whisper',
    description: 'High accuracy, supports 99+ languages',
    docsUrl: 'https://platform.openai.com/api-keys',
    placeholder: 'sk-...',
    badge: 'Recommended',
  },
  {
    id: 'browser',
    name: 'Browser (Free)',
    description: 'Uses Web Speech API – no API key needed',
    docsUrl: null,
    placeholder: 'No key required',
    badge: 'Free',
  },
];

export default function ApiKeyModal({ apiKey, provider, onSave, onClose }: Props) {
  const [localKey, setLocalKey] = useState(apiKey);
  const [localProvider, setLocalProvider] = useState(provider || 'whisper');
  const [showKey, setShowKey] = useState(false);

  const handleSave = () => {
    onSave(localKey.trim(), localProvider);
    onClose();
  };

  const selectedProvider = PROVIDERS.find((p) => p.id === localProvider);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center">
              <Key className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">API Configuration</h2>
              <p className="text-xs text-gray-400">Choose your transcription provider</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-gray-800 hover:bg-gray-700 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Provider Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">Select Provider</label>
            <div className="space-y-2">
              {PROVIDERS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setLocalProvider(p.id)}
                  className={`w-full flex items-start gap-3 p-3 rounded-xl border transition-all text-left ${
                    localProvider === p.id
                      ? 'border-indigo-500 bg-indigo-500/10'
                      : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                  }`}
                >
                  <div
                    className={`mt-0.5 w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                      localProvider === p.id ? 'border-indigo-400' : 'border-gray-600'
                    }`}
                  >
                    {localProvider === p.id && (
                      <div className="w-2 h-2 rounded-full bg-indigo-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white">{p.name}</span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          p.badge === 'Recommended'
                            ? 'bg-indigo-500/20 text-indigo-300'
                            : 'bg-green-500/20 text-green-300'
                        }`}
                      >
                        {p.badge}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{p.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* API Key Input */}
          {localProvider !== 'browser' && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-300">API Key</label>
                {selectedProvider?.docsUrl && (
                  <a
                    href={selectedProvider.docsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors"
                  >
                    Get API Key <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
              <div className="relative">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={localKey}
                  onChange={(e) => setLocalKey(e.target.value)}
                  placeholder={selectedProvider?.placeholder}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 pr-12 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors"
                />
                <button
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 transition-colors"
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="mt-2 text-xs text-gray-500">
                🔒 Your key is stored locally in your browser and never sent to our servers.
              </p>
            </div>
          )}

          {localProvider === 'browser' && (
            <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3">
              <div className="flex items-start gap-2">
                <Zap className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-green-300">
                  Browser mode uses the Web Speech API — no API key needed! Works best in Chrome/Edge.
                  Transcription happens in real-time without sending data to external servers.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-gray-700/50">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-gray-700 text-gray-400 hover:text-white hover:border-gray-600 text-sm font-medium transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={localProvider !== 'browser' && !localKey.trim()}
            className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium transition-all"
          >
            Save Configuration
          </button>
        </div>
      </div>
    </div>
  );
}
