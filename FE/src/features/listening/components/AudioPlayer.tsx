import React, { useState, useRef, useEffect } from "react";
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Gauge } from "lucide-react";

interface AudioPlayerProps {
  src: string;
  onTimeUpdate?: (time: number) => void;
  targetStartTime?: number;
  targetEndTime?: number;
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({ src, onTimeUpdate, targetStartTime, targetEndTime }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const rates = [0.75, 1, 1.25, 1.5];

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateProgress = () => {
      setProgress(audio.currentTime);
      if (onTimeUpdate) onTimeUpdate(audio.currentTime);

      // Handle A-B repeat for dictation segments
      if (targetEndTime && audio.currentTime >= targetEndTime) {
        audio.pause();
        setIsPlaying(false);
        audio.currentTime = targetStartTime || 0;
      }
    };

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      if (targetStartTime) {
        audio.currentTime = targetStartTime;
      }
    };

    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener("timeupdate", updateProgress);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("timeupdate", updateProgress);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [onTimeUpdate, targetStartTime, targetEndTime]);

  useEffect(() => {
    if (audioRef.current && targetStartTime !== undefined) {
      audioRef.current.currentTime = targetStartTime;
      if (isPlaying) {
        void audioRef.current.play();
      }
    }
  }, [targetStartTime, isPlaying]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      void audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setProgress(time);
    }
  };

  const handleVolumeChange = (vol: number) => {
    setVolume(vol);
    if (audioRef.current) {
      audioRef.current.volume = vol;
      setIsMuted(vol === 0);
    }
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    audioRef.current.volume = newMuted ? 0 : volume;
  };

  const changeSpeed = () => {
    if (!audioRef.current) return;
    const nextRateIdx = (rates.indexOf(playbackRate) + 1) % rates.length;
    const nextRate = rates[nextRateIdx];
    setPlaybackRate(nextRate);
    audioRef.current.playbackRate = nextRate;
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const m = Math.floor(time / 60);
    const s = Math.floor(time % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="p-5 rounded-3xl bg-white border border-slate-150/70 shadow-[0_4px_20px_rgb(0,0,0,0.06)] backdrop-blur-md">
      <audio ref={audioRef} src={src} preload="metadata" />

      {/* Progress Slider Row */}
      <div className="flex items-center gap-3 mb-4">
        <span className="text-[10px] font-bold text-slate-400 w-10 text-left">{formatTime(progress)}</span>
        <input
          type="range"
          min={0}
          max={duration || 100}
          value={progress}
          onChange={(e) => handleSeek(Number(e.target.value))}
          className="flex-1 h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600 focus:outline-none"
        />
        <span className="text-[10px] font-bold text-slate-400 w-10 text-right">{formatTime(duration)}</span>
      </div>

      {/* Controls Container */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Volume Controls */}
        <div className="flex items-center gap-2 w-full sm:w-32 justify-start">
          <button
            onClick={toggleMute}
            className="p-1.5 hover:bg-slate-50 rounded-xl transition text-slate-500 hover:text-slate-700 active:scale-95"
            title={isMuted ? "Bật âm" : "Tắt âm"}
          >
            {isMuted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={isMuted ? 0 : volume}
            onChange={(e) => handleVolumeChange(Number(e.target.value))}
            className="w-20 h-1 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-slate-500"
          />
        </div>

        {/* Playback Buttons */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => handleSeek(Math.max(0, progress - 10))}
            className="p-2 text-slate-500 hover:text-blue-600 transition active:scale-90 hover:bg-slate-55 rounded-xl"
            title="Lùi 10s"
          >
            <SkipBack size={18} />
          </button>

          <button
            onClick={togglePlay}
            className="w-12 h-12 flex items-center justify-center bg-blue-600 hover:bg-blue-750 text-white rounded-full transition-all duration-200 active:scale-95 shadow-md shadow-blue-500/20"
            title={isPlaying ? "Tạm dừng" : "Phát"}
          >
            {isPlaying ? <Pause size={20} className="fill-white text-white" /> : <Play size={20} className="fill-white text-white translate-x-0.5" />}
          </button>

          <button
            onClick={() => handleSeek(Math.min(duration, progress + 10))}
            className="p-2 text-slate-500 hover:text-blue-600 transition active:scale-90 hover:bg-slate-55 rounded-xl"
            title="Tới 10s"
          >
            <SkipForward size={18} />
          </button>
        </div>

        {/* Speed Adjustment */}
        <div className="flex items-center gap-1.5 w-full sm:w-32 justify-end">
          <button
            onClick={changeSpeed}
            className="flex items-center gap-1 px-3 py-1.5 hover:bg-slate-50 border border-slate-200 rounded-xl transition text-slate-655 font-extrabold text-xs active:scale-95 shadow-sm"
            title="Tốc độ phát"
          >
            <Gauge size={14} className="text-slate-400" />
            <span>{playbackRate}x</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AudioPlayer;
