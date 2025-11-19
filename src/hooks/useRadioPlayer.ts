import { useState, useRef, useEffect } from 'react';
import Hls from 'hls.js';
import { RadioStation } from '../types/radio';
import { enrichStationWithStream } from '../services/streamMatcher';
import { validateStreamInBackground, isShortWaveBand } from '../services/streamValidator';
import { formatLicenseMessage } from '../services/licenseChecker';

export function useRadioPlayer() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(70);
  const [bass, setBass] = useState(0);
  const [treble, setTreble] = useState(0);
  const [currentStation, setCurrentStation] = useState<RadioStation | null>(null);
  const [frequencyData, setFrequencyData] = useState<Uint8Array>(new Uint8Array(128));
  const [isPlayingStatic, setIsPlayingStatic] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [isPoweredOn, setIsPoweredOn] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const noiseNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const isStoppingRef = useRef<boolean>(false);
  const staticRestartTimeoutRef = useRef<number | null>(null);
  const hlsRef = useRef<Hls | null>(null);

  useEffect(() => {
    audioRef.current = new Audio();
    audioRef.current.volume = volume / 100;
    audioRef.current.muted = false;
    audioRef.current.crossOrigin = 'anonymous';
    console.log('Audio element initialized - volume:', audioRef.current.volume, 'muted:', audioRef.current.muted);

    const handleError = (e: Event) => {
      console.error('Audio error:', e);
      setIsPlaying(false);
      setIsBuffering(false);
      stopFrequencySimulation();

      // Only show error if we're not intentionally stopping and there's a valid source
      if (!isStoppingRef.current && audioRef.current?.src && audioRef.current.src !== '') {
        setStreamError('Stream currently unavailable');
        // Don't auto-restart static - let user manually interact
      }
    };

    const handleStalled = () => {
      console.warn('Audio stalled - network issue');
      setIsBuffering(true);
    };

    const handleWaiting = () => {
      console.warn('Audio waiting - buffering');
      setIsBuffering(true);
    };

    const handleCanPlay = () => {
      console.log('Audio can play - buffer recovered');
      setIsBuffering(false);
      setStreamError(null);
    };

    const handlePlaying = () => {
      console.log('Audio playing');
      setIsBuffering(false);
      setStreamError(null);
      startFrequencySimulation();
    };

    const handlePause = () => {
      console.log('Audio paused');
      stopFrequencySimulation();
    };

    const handleEnded = () => {
      console.log('Audio ended');
      setIsPlaying(false);
      stopFrequencySimulation();
      // Don't auto-restart static - let user manually interact
    };

    audioRef.current.addEventListener('error', handleError);
    audioRef.current.addEventListener('stalled', handleStalled);
    audioRef.current.addEventListener('waiting', handleWaiting);
    audioRef.current.addEventListener('canplay', handleCanPlay);
    audioRef.current.addEventListener('playing', handlePlaying);
    audioRef.current.addEventListener('pause', handlePause);
    audioRef.current.addEventListener('ended', handleEnded);

    return () => {
      stopFrequencySimulation();
      if (staticRestartTimeoutRef.current) {
        clearTimeout(staticRestartTimeoutRef.current);
      }
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      if (audioRef.current) {
        audioRef.current.removeEventListener('error', handleError);
        audioRef.current.removeEventListener('stalled', handleStalled);
        audioRef.current.removeEventListener('waiting', handleWaiting);
        audioRef.current.removeEventListener('canplay', handleCanPlay);
        audioRef.current.removeEventListener('playing', handlePlaying);
        audioRef.current.removeEventListener('pause', handlePause);
        audioRef.current.removeEventListener('ended', handleEnded);
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume / 100;
    }
  }, [volume]);

  const startFrequencySimulation = () => {
    if (animationFrameRef.current) return;

    const updateSimulatedData = () => {
      const dataArray = new Uint8Array(128);
      const time = Date.now() / 1000;

      const bassIntensity = Math.sin(time * 2) * 0.3 + 0.7;
      const midIntensity = Math.sin(time * 3) * 0.2 + 0.8;
      const trebleIntensity = Math.sin(time * 5) * 0.25 + 0.75;

      for (let i = 0; i < dataArray.length; i++) {
        const normalizedFreq = i / dataArray.length;
        let intensity;

        if (normalizedFreq < 0.3) {
          intensity = bassIntensity;
        } else if (normalizedFreq < 0.7) {
          intensity = midIntensity;
        } else {
          intensity = trebleIntensity;
        }

        const baseValue = Math.random() * 120 + 80;
        const rhythmPulse = Math.sin(time * 4 + i * 0.1) * 40;
        const value = baseValue * intensity + rhythmPulse;

        dataArray[i] = Math.max(0, Math.min(255, value));
      }

      setFrequencyData(dataArray);
      animationFrameRef.current = requestAnimationFrame(updateSimulatedData);
    };

    updateSimulatedData();
  };

  const stopFrequencySimulation = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    setFrequencyData(new Uint8Array(128));
  };

  const playStation = async (station: RadioStation) => {
    if (!audioRef.current) return;

    try {
      console.log('=== PLAY STATION DEBUG ===');
      console.log('Station received:', {
        name: station.name,
        id: station.id,
        frequency: station.frequency,
        stream_url: station.stream_url,
        stream_url_type: typeof station.stream_url,
        stream_url_is_null: station.stream_url === null,
        stream_url_is_undefined: station.stream_url === undefined,
        stream_url_length: station.stream_url?.length
      });

      isStoppingRef.current = false; // We're starting to play
      stopStaticNoise();

      // Clear error immediately before anything else
      setStreamError(null);

      if (currentStation?.id === station.id && isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
        return;
      }

      setIsBuffering(true);

      let enrichedStation = station;

      // Check if station has a valid stream URL
      if (!enrichedStation.stream_url || enrichedStation.stream_url.includes('placeholder')) {
        console.error('❌ BLOCKED - No valid stream URL found for station:', enrichedStation.name);
        setCurrentStation(enrichedStation);
        setIsBuffering(false);

        // For SW restricted stations, show a specific message
        if (enrichedStation.band_type === 'SW' && enrichedStation.license_tier === 'restricted') {
          setStreamError('This station is available on their official website');
        } else {
          setStreamError('No stream available for this station');
        }
        return;
      }

      console.log('✅ PLAYING - Valid stream URL found');
      audioRef.current.pause();

      // Clean up any existing HLS instance
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }

      // Set current station BEFORE attempting playback so it shows as selected even if autoplay is blocked
      setCurrentStation(enrichedStation);
      console.log('✅ SET CURRENT STATION:', enrichedStation.name, 'ID:', enrichedStation.id);

      console.log('Playing station:', enrichedStation.name, 'from', enrichedStation.stream_url);

      // Check if stream is HLS (.m3u8)
      const isHLS = enrichedStation.stream_url.includes('.m3u8');

      if (isHLS && Hls.isSupported()) {
        // Use HLS.js for HLS streams
        console.log('Using HLS.js for stream:', enrichedStation.stream_url);
        const hls = new Hls({
          debug: false,
          enableWorker: true,
          autoStartLoad: true
        });
        hlsRef.current = hls;

        hls.loadSource(enrichedStation.stream_url);
        hls.attachMedia(audioRef.current);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          console.log('HLS manifest parsed, attempting playback');
          console.log('Audio element state before play:', {
            paused: audioRef.current?.paused,
            volume: audioRef.current?.volume,
            muted: audioRef.current?.muted,
            readyState: audioRef.current?.readyState,
            networkState: audioRef.current?.networkState
          });

          const playPromise = audioRef.current?.play();
          if (playPromise) {
            playPromise
              .then(() => {
                console.log('HLS playback started successfully');
                console.log('Audio element state after play:', {
                  paused: audioRef.current?.paused,
                  volume: audioRef.current?.volume,
                  muted: audioRef.current?.muted,
                  currentTime: audioRef.current?.currentTime,
                  duration: audioRef.current?.duration
                });
                setIsPlaying(true);
                setIsBuffering(false);
                setStreamError(null);
              })
              .catch((error) => {
                console.error('HLS playback error:', error);
                setIsPlaying(false);
                setIsBuffering(false);
                if (error.name === 'NotAllowedError') {
                  setStreamError('Click the play button to start playback');
                } else {
                  setStreamError('Stream temporarily unavailable');
                }
              });
          }
        });

        hls.on(Hls.Events.ERROR, (event, data) => {
          console.error('HLS error:', data.type, data.details, 'fatal:', data.fatal);

          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                console.log('Fatal network error, trying to recover...');
                hls.startLoad();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                console.log('Fatal media error, trying to recover...');
                hls.recoverMediaError();
                break;
              default:
                console.log('Fatal error, cannot recover');
                setIsPlaying(false);
                setIsBuffering(false);
                setStreamError('Stream temporarily unavailable');
                hls.destroy();
                hlsRef.current = null;
                break;
            }
          }
        });

        return;
      } else if (isHLS && audioRef.current.canPlayType('application/vnd.apple.mpegurl')) {
        // Safari native HLS support
        console.log('Using native HLS support');
        audioRef.current.src = enrichedStation.stream_url;
      } else {
        // Regular stream
        audioRef.current.src = enrichedStation.stream_url;
      }

      const playPromise = audioRef.current.play();

      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsPlaying(true);
            setIsBuffering(false);
            setStreamError(null);
          })
          .catch((error) => {
            console.error('Playback error:', error);
            setIsPlaying(false);
            setIsBuffering(false);
            // Keep currentStation set so it shows as selected even if playback blocked
            // setCurrentStation(null);

            if (error.name === 'NotAllowedError') {
              setStreamError('Click the play button to start playback');
            } else if (isShortWaveBand(enrichedStation.band_type)) {
              setStreamError('Stream temporarily unavailable');
            } else {
              setStreamError('Stream temporarily unavailable');
            }
          });
      }

      if (isShortWaveBand(enrichedStation.band_type)) {
        console.log('Starting background validation for shortwave stream:', enrichedStation.stream_url);
        const stationId = enrichedStation.id;

        validateStreamInBackground(
          enrichedStation.stream_url,
          (result) => {
            if (currentStation?.id !== stationId) {
              console.log('Validation completed but station changed, ignoring result');
              return;
            }

            if (!result.isValid) {
              console.error('Background stream validation failed:', result.error);
              if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.src = '';
              }
              setIsPlaying(false);
              setStreamError('Stream unavailable. Visit the official website below to listen.');
            } else {
              console.log('Background validation passed:', result.contentType);
            }
          },
          7000
        );
      }
    } catch (error) {
      console.error('Failed to play station:', station.name, error);
      setIsPlaying(false);
      setIsBuffering(false);
      setStreamError('An unexpected error occurred');
    }
  };

  const playStaticNoise = async () => {
    // Clear any pending static restart
    if (staticRestartTimeoutRef.current) {
      clearTimeout(staticRestartTimeoutRef.current);
      staticRestartTimeoutRef.current = null;
    }

    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    // Resume audio context if it's suspended
    if (audioContextRef.current.state === 'suspended') {
      try {
        await audioContextRef.current.resume();
        console.log('Audio context resumed');
      } catch (error) {
        console.error('Failed to resume audio context:', error);
        return;
      }
    }

    if (!analyserRef.current) {
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 128;
    }

    // Stop any existing static noise before creating a new one
    if (noiseNodeRef.current) {
      try {
        noiseNodeRef.current.stop();
        noiseNodeRef.current.disconnect();
      } catch (e) {
        // Ignore
      }
    }

    const bufferSize = audioContextRef.current.sampleRate * 2;
    const noiseBuffer = audioContextRef.current.createBuffer(1, bufferSize, audioContextRef.current.sampleRate);
    const output = noiseBuffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    noiseNodeRef.current = audioContextRef.current.createBufferSource();
    noiseNodeRef.current.buffer = noiseBuffer;
    noiseNodeRef.current.loop = true;

    const noiseGain = audioContextRef.current.createGain();
    noiseGain.gain.value = volume / 200;

    noiseNodeRef.current.connect(noiseGain);
    noiseGain.connect(analyserRef.current);
    analyserRef.current.connect(audioContextRef.current.destination);

    noiseNodeRef.current.start();
    setIsPlayingStatic(true);
    startFrequencySimulation();
    console.log('Static noise started');
  };

  const stopStaticNoise = () => {
    // Clear any pending static restart
    if (staticRestartTimeoutRef.current) {
      clearTimeout(staticRestartTimeoutRef.current);
      staticRestartTimeoutRef.current = null;
    }

    if (noiseNodeRef.current) {
      try {
        noiseNodeRef.current.stop();
        noiseNodeRef.current.disconnect();
      } catch (e) {
        // Ignore
      }
      noiseNodeRef.current = null;
    }
    setIsPlayingStatic(false);
    stopFrequencySimulation();
  };

  const stopPlaying = () => {
    isStoppingRef.current = true;

    // Clean up HLS instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
    stopStaticNoise();
    setIsPlaying(false);
    setCurrentStation(null);
    setStreamError(null);

    // Reset the stopping flag after a short delay
    setTimeout(() => {
      isStoppingRef.current = false;
    }, 100);
  };

  const togglePlayPause = () => {
    if (!audioRef.current || !currentStation) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      stopFrequencySimulation();
    } else {
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsPlaying(true);
            setStreamError(null);
          })
          .catch((error) => {
            console.error('Resume playback error:', error);
            setStreamError('Failed to resume playback');
          });
      }
    }
  };

  const setPowerState = (powered: boolean) => {
    setIsPoweredOn(powered);
  };

  return {
    isPlaying,
    volume,
    bass,
    treble,
    currentStation,
    frequencyData,
    isPlayingStatic,
    isBuffering,
    streamError,
    setVolume,
    setBass,
    setTreble,
    playStation,
    stopPlaying,
    togglePlayPause,
    playStaticNoise,
    stopStaticNoise,
    setPowerState
  };
}
