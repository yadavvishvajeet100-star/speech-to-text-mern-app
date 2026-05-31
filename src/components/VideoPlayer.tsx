import { useRef, useState, useEffect } from 'react';
import { Subtitle } from '../types';
import { formatDuration } from '../utils/storage';
import { Play, Pause, Volume2, VolumeX, Maximize2, Subtitles } from 'lucide-react';

interface Props {
  file: File;
  subtitles: Subtitle[];
}

export default function VideoPlayer({ file, subtitles }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [showSubtitles, setShowSubtitles] = useState(true);
  const [videoUrl, setVideoUrl] = useState('');
  const [activeSubtitle, setActiveSubtitle] = useState<Subtitle | null>(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setVideoUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    if (!subtitles.length) return;
    const active = subtitles.find((s) => currentTime >= s.start && currentTime <= s.end) || null;
    setActiveSubtitle(active);
  }, [currentTime, subtitles]);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play();
      setIsPlaying(true);
    } else {
      v.pause();
      setIsPlaying(false);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) setCurrentTime(videoRef.current.currentTime);
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) setDuration(videoRef.current.duration);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const t = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = t;
      setCurrentTime(t);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    setVolume(v);
    if (videoRef.current) {
      videoRef.current.volume = v;
      setIsMuted(v === 0);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const enterFullscreen = () => {
    videoRef.current?.requestFullscreen?.();
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="bg-gray-900 rounded-2xl overflow-hidden border border-gray-700/50 shadow-2xl">
      {/* Video Container */}
      <div className="relative bg-black aspect-video group">
        <video
          ref={videoRef}
          src={videoUrl}
          className="w-full h-full object-contain"
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => setIsPlaying(false)}
        />

        {/* Subtitle overlay */}
        {showSubtitles && activeSubtitle && (
          <div className="absolute bottom-14 left-0 right-0 flex justify-center px-8 pointer-events-none">
            <div className="bg-black/80 text-white text-sm sm:text-base font-medium px-4 py-2 rounded-xl max-w-2xl text-center leading-relaxed backdrop-blur-sm">
              {activeSubtitle.text}
            </div>
          </div>
        )}

        {/* Click to play */}
        <div
          className="absolute inset-0 flex items-center justify-center cursor-pointer"
          onClick={togglePlay}
        >
          {!isPlaying && (
            <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white group-hover:bg-white/30 transition-all">
              <Play className="w-7 h-7 fill-current translate-x-0.5" />
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="px-4 py-3 space-y-2 bg-gray-800/80">
        {/* Progress bar */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400 font-mono tabular-nums w-10 flex-shrink-0">
            {formatDuration(currentTime)}
          </span>
          <div className="flex-1 relative group/progress">
            <input
              type="range"
              min={0}
              max={duration || 0}
              step={0.1}
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-1.5 rounded-full appearance-none bg-gray-600 accent-indigo-500 cursor-pointer"
              style={{
                background: `linear-gradient(to right, #6366f1 ${progress}%, #4b5563 ${progress}%)`,
              }}
            />
            {/* Subtitle markers */}
            {subtitles.map((sub) => (
              <div
                key={sub.id}
                className="absolute top-0 w-0.5 h-1.5 bg-indigo-400/60 rounded-full pointer-events-none"
                style={{ left: `${(sub.start / duration) * 100}%` }}
              />
            ))}
          </div>
          <span className="text-xs text-gray-400 font-mono tabular-nums w-10 flex-shrink-0 text-right">
            {formatDuration(duration)}
          </span>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={togglePlay}
            className="w-8 h-8 rounded-lg bg-indigo-600 hover:bg-indigo-500 flex items-center justify-center text-white transition-colors"
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current translate-x-0.5" />}
          </button>

          <div className="flex items-center gap-2">
            <button onClick={toggleMute} className="text-gray-400 hover:text-white transition-colors">
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              className="w-16 h-1 rounded-full appearance-none accent-indigo-500 cursor-pointer"
            />
          </div>

          <div className="flex-1" />

          {subtitles.length > 0 && (
            <button
              onClick={() => setShowSubtitles(!showSubtitles)}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-all ${
                showSubtitles
                  ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10'
                  : 'border-gray-600 text-gray-400 hover:border-gray-500'
              }`}
            >
              <Subtitles className="w-3.5 h-3.5" />
              CC
            </button>
          )}

          <button
            onClick={enterFullscreen}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
