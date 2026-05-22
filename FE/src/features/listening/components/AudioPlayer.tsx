import React, { useState, useRef, useEffect } from 'react';
import { Box, IconButton, Slider, Typography, Paper, Tooltip } from '@mui/material';
import { PlayArrow, Pause, FastForward, FastRewind, VolumeUp, VolumeOff, Speed } from '@mui/icons-material';

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

    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateProgress);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [onTimeUpdate, targetStartTime, targetEndTime]);

  useEffect(() => {
    if (audioRef.current && targetStartTime !== undefined) {
      audioRef.current.currentTime = targetStartTime;
      if (isPlaying) audioRef.current.play();
    }
  }, [targetStartTime, isPlaying]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (_: Event, newValue: number | number[]) => {
    const time = newValue as number;
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setProgress(time);
    }
  };

  const handleVolumeChange = (_: Event, newValue: number | number[]) => {
    const vol = newValue as number;
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
    if (isNaN(time)) return '0:00';
    const m = Math.floor(time / 60);
    const s = Math.floor(time % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <Paper elevation={3} sx={{ 
      p: 3, 
      borderRadius: '24px', 
      background: 'rgba(255, 255, 255, 0.8)',
      backdropFilter: 'blur(20px)',
      border: '1px solid rgba(255, 255, 255, 0.5)',
      boxShadow: '0 10px 40px rgba(0,0,0,0.08)'
    }}>
      <audio ref={audioRef} src={src} preload="metadata" />
      
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Typography variant="body2" sx={{ width: 45, color: 'text.secondary', fontWeight: 600 }}>
          {formatTime(progress)}
        </Typography>
        <Slider
          value={progress}
          max={duration}
          onChange={handleSeek}
          sx={{
            mx: 2,
            color: '#B90000',
            height: 8,
            '& .MuiSlider-thumb': {
              width: 16,
              height: 16,
              transition: '0.3s cubic-bezier(.47,1.64,.41,.8)',
              '&:before': { boxShadow: '0 2px 12px 0 rgba(0,0,0,0.4)' },
              '&:hover, &.Mui-focusVisible': { boxShadow: '0px 0px 0px 8px rgba(185, 0, 0, 0.16)' },
              '&.Mui-active': { width: 20, height: 20 }
            },
            '& .MuiSlider-rail': { opacity: 0.28 }
          }}
        />
        <Typography variant="body2" sx={{ width: 45, textAlign: 'right', color: 'text.secondary', fontWeight: 600 }}>
          {formatTime(duration)}
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', width: 120 }}>
          <IconButton size="small" onClick={toggleMute} sx={{ color: 'text.secondary' }}>
            {isMuted || volume === 0 ? <VolumeOff /> : <VolumeUp />}
          </IconButton>
          <Slider
            size="small"
            value={isMuted ? 0 : volume}
            max={1}
            step={0.01}
            onChange={handleVolumeChange}
            sx={{ ml: 1, color: 'text.secondary' }}
          />
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton onClick={() => handleSeek(null as any, Math.max(0, progress - 10))} sx={{ color: '#B90000' }}>
            <FastRewind />
          </IconButton>
          <IconButton 
            onClick={togglePlay} 
            sx={{ 
              bgcolor: '#B90000', 
              color: 'white', 
              width: 56, 
              height: 56,
              boxShadow: '0 4px 14px 0 rgba(185, 0, 0, 0.4)',
              '&:hover': { bgcolor: '#990000', transform: 'scale(1.05)' },
              transition: 'all 0.2s'
            }}
          >
            {isPlaying ? <Pause fontSize="large" /> : <PlayArrow fontSize="large" />}
          </IconButton>
          <IconButton onClick={() => handleSeek(null as any, Math.min(duration, progress + 10))} sx={{ color: '#B90000' }}>
            <FastForward />
          </IconButton>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', width: 120 }}>
          <Tooltip title={`Speed: ${playbackRate}x`}>
            <IconButton onClick={changeSpeed} sx={{ color: 'text.secondary' }}>
              <Speed fontSize="small" sx={{ mr: 0.5 }} />
              <Typography variant="caption" fontWeight="bold">{playbackRate}x</Typography>
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
    </Paper>
  );
};

export default AudioPlayer;
