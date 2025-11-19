import { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX, Power, Loader2, Music2, Music3, Pause, Play, MapPin, Search } from 'lucide-react';
import { RadioStation, BandType, ModeType } from '../types/radio';
import { StationDropdown } from './StationDropdown';
import { LocationSearch } from './LocationSearch';

interface VintageRadioProps {
  currentStation: RadioStation | null;
  isPlaying: boolean;
  isPoweredOn: boolean;
  volume: number;
  bass: number;
  treble: number;
  currentBand: BandType;
  tuningFrequency: number;
  frequencyData: Uint8Array;
  stations: RadioStation[];
  isBuffering: boolean;
  streamError: string | null;
  isPlayingStatic: boolean;
  userLocation: { city: string; country: string; country_code?: string; timezone?: string } | null;
  currentMode: ModeType;
  availableLanguages: string[];
  availableGenres: string[];
  selectedLanguage: string;
  selectedGenre: string;
  onPowerToggle: () => void;
  onPlayPause: () => void;
  onVolumeChange: (volume: number) => void;
  onBassChange: (bass: number) => void;
  onTrebleChange: (treble: number) => void;
  onBandChange: (band: BandType) => void;
  onTuningChange: (frequency: number) => void;
  onStationLock: () => void;
  onStationSelect: (station: RadioStation) => void;
  onLocationChange: (countryCode: string, city: string, latitude: number, longitude: number) => void;
  onModeChange: (mode: ModeType) => void;
  onLanguageChange: (language: string) => void;
  onGenreChange: (genre: string) => void;
  onLoadGenreStations?: (genre: string) => Promise<RadioStation[]>;
  genreStationsCache?: Map<string, RadioStation[]>;
  onLoadLanguageStations?: (language: string) => Promise<RadioStation[]>;
  languageStationsCache?: Map<string, RadioStation[]>;
  totalStationsCount?: number | null;
  hasMoreStations?: boolean;
  isLoadingMore?: boolean;
}

function getIdleMessage(mode: ModeType, isPoweredOn: boolean): string {
  if (!isPoweredOn) {
    return '🎧 Ready to listen? 👉Power On ⇒ 👇Select a Band ⇒ 👆Tune the needle to a frequency -or- pick a station to begin playback!';
  }

  const messages: Record<ModeType, string> = {
    'Radio': 'Tune the dial or select a station to begin playback',
    'Region': 'Find a station from your country and hit play!',
    'Language': 'Select a language to discover stations',
    'Genre': 'Pick a genre to explore stations',
    'Search': 'Search thousands of stations worldwide'
  };

  return messages[mode] || 'Select a station to begin playback';
}

const BAND_RANGES: Record<BandType, { min: number; max: number; label: string }> = {
  AM: { min: 530, max: 1700, label: 'AM (MW)' },
  FM: { min: 88, max: 108, label: 'FM' },
  SW: { min: 5900, max: 15600, label: 'SW' },
  SW1: { min: 5900, max: 6200, label: 'SW1' },
  SW2: { min: 9500, max: 9900, label: 'SW2' },
  SW3: { min: 15100, max: 15600, label: 'SW3' }
};

const VISIBLE_BANDS: BandType[] = ['AM', 'FM', 'SW', 'SW1', 'SW2', 'SW3'];

export function VintageRadio({
  currentStation,
  isPlaying,
  isPoweredOn,
  volume,
  bass,
  treble,
  currentBand,
  tuningFrequency,
  frequencyData,
  stations,
  isBuffering,
  streamError,
  isPlayingStatic,
  userLocation,
  currentMode,
  availableLanguages,
  availableGenres,
  selectedLanguage,
  selectedGenre,
  onPowerToggle,
  onPlayPause,
  onVolumeChange,
  onBassChange,
  onTrebleChange,
  onBandChange,
  onTuningChange,
  onStationLock,
  onStationSelect,
  onLocationChange,
  onModeChange,
  onLanguageChange,
  onGenreChange,
  onLoadGenreStations,
  genreStationsCache,
  onLoadLanguageStations,
  languageStationsCache,
  totalStationsCount,
  hasMoreStations,
  isLoadingMore
}: VintageRadioProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isLocationSearchOpen, setIsLocationSearchOpen] = useState(false);
  const [vuLevel, setVuLevel] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());
  const tuningRef = useRef<HTMLDivElement>(null);

  const MODES: ModeType[] = ['Radio', 'Region', 'Language', 'Genre', 'Search'];

  useEffect(() => {
    const timer = setInterval(() => {
      if (userLocation?.timezone) {
        try {
          const dateString = new Date().toLocaleString('en-US', { timeZone: userLocation.timezone });
          setCurrentTime(new Date(dateString));
        } catch (error) {
          console.error('Failed to convert to timezone:', error);
          setCurrentTime(new Date());
        }
      } else {
        setCurrentTime(new Date());
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [userLocation?.timezone]);

  useEffect(() => {
    console.log('Effect triggered:', { isPlaying, isPoweredOn, dataLength: frequencyData.length });

    if (isPlaying && isPoweredOn) {
      const average = frequencyData.reduce((sum, value) => sum + value, 0) / frequencyData.length;
      const calculatedVuLevel = (average / 255) * 100;

      console.log('VU Calc:', {
        average,
        vuLevel: calculatedVuLevel,
        firstValues: Array.from(frequencyData.slice(0, 5))
      });
      setVuLevel(calculatedVuLevel);
    } else {
      console.log('Setting VU to 0');
      setVuLevel(0);
    }
  }, [isPlaying, isPoweredOn, frequencyData]);

  const handleTuningDrag = (e: React.MouseEvent | MouseEvent) => {
    if (!tuningRef.current) return;

    const rect = tuningRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));

    const range = BAND_RANGES[currentBand];
    const frequency = range.min + percentage * (range.max - range.min);

    onTuningChange(frequency);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        handleTuningDrag(e);
      }
    };

    const handleMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
        onStationLock();
      }
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const getNeedlePosition = () => {
    const range = BAND_RANGES[currentBand];
    const percentage = (tuningFrequency - range.min) / (range.max - range.min);
    return Math.max(0, Math.min(100, percentage * 100));
  };

  const formatFrequency = (freq: number) => {
    if (currentBand === 'FM') {
      return freq.toFixed(1);
    }
    return Math.round(freq).toString();
  };

  const generateFrequencyMarkers = () => {
    const range = BAND_RANGES[currentBand];
    const markers: { position: number; label: string; isMajor: boolean }[] = [];

    if (currentBand === 'FM') {
      for (let freq = 88; freq <= 108; freq += 0.2) {
        const isMajor = Math.abs(Math.round(freq) - freq) < 0.01;
        const position = ((freq - range.min) / (range.max - range.min)) * 100;
        markers.push({
          position,
          label: isMajor ? Math.round(freq).toString() : '',
          isMajor
        });
      }
    } else if (currentBand === 'AM') {
      for (let freq = 530; freq <= 1700; freq += 10) {
        const isMajor = freq % 100 === 0;
        const position = ((freq - range.min) / (range.max - range.min)) * 100;
        markers.push({
          position,
          label: isMajor ? freq.toString() : '',
          isMajor
        });
      }
    } else {
      const step = (range.max - range.min) / 50;
      for (let freq = range.min; freq <= range.max; freq += step) {
        const isMajor = Math.round(freq) % 100 === 0;
        const position = ((freq - range.min) / (range.max - range.min)) * 100;
        markers.push({
          position,
          label: isMajor ? Math.round(freq).toString() : '',
          isMajor
        });
      }
    }

    return markers;
  };

  const getVuColor = (level: number) => {
    if (level > 75) return 'bg-cyan-400';
    if (level > 50) return 'bg-cyan-500';
    return 'bg-cyan-600';
  };

const formatDateTime = (date: Date) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[date.getMonth()];
    const day = date.getDate();
    const year = date.getFullYear();

    let hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';

    hours = hours % 12;
    hours = hours ? hours : 12;

    return {
      date: `${month} ${day}, ${year}`,
      time: `${hours}:${minutes}:${seconds} ${ampm}`
    };
  };

  return (
    <div className="relative w-full max-w-5xl mx-auto perspective-1000">
      <div
        className="bg-gradient-to-b from-amber-900 via-amber-800 to-amber-950 rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 border-4 sm:border-8 border-amber-950 relative"
        style={{
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 15px 30px -10px rgba(120, 53, 15, 0.5), inset 0 2px 4px rgba(255, 255, 255, 0.1), inset 0 -2px 4px rgba(0, 0, 0, 0.3)',
          background: 'linear-gradient(145deg, #92400e 0%, #78350f 50%, #451a03 100%)',
          transform: 'rotateX(2deg)'
        }}
      >
        {userLocation && (
          <>
            <div className="absolute top-2 left-6 sm:left-8 flex items-center z-10">
              <button
                onClick={() => setIsLocationSearchOpen(true)}
                className="flex items-center gap-1.5 text-cyan-100 hover:text-white transition-colors cursor-pointer group"
                title="Change location"
                style={{
                  textShadow: '1px 1px 2px rgba(0, 0, 0, 0.8)'
                }}
              >
                <MapPin size={14} className="flex-shrink-0" />
                <span className={`fi fi-${userLocation.country_code?.toLowerCase() || 'us'} text-base`}></span>
                <span className="text-xs sm:text-sm font-semibold truncate max-w-[100px] sm:max-w-[160px]">
                  {currentMode === 'Region'
                    ? userLocation.country
                    : (userLocation.city ? `${userLocation.city}, ${userLocation.country}` : userLocation.country)
                  }
                </span>
                <div className="flex-shrink-0 w-5 h-5 rounded-full bg-amber-400/90 group-hover:bg-amber-300 flex items-center justify-center transition-all group-hover:scale-110 shadow-lg">
                  <Search size={12} className="text-amber-900" strokeWidth={2.5} />
                </div>
              </button>
            </div>
            <div className="absolute top-2 right-8 sm:right-10 flex items-center gap-1 z-10">
              <span className="text-xs sm:text-sm font-semibold text-cyan-100" style={{
                textShadow: '1px 1px 2px rgba(0, 0, 0, 0.8)'
              }}>
                {formatDateTime(currentTime).date}
              </span>
              <span className="text-xs sm:text-sm font-semibold text-cyan-200" style={{
                textShadow: '1px 1px 2px rgba(0, 0, 0, 0.8)'
              }}>
                {formatDateTime(currentTime).time}
              </span>
            </div>
          </>
        )}
        {!isPoweredOn && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 text-amber-200 text-xs sm:text-sm tracking-wide z-10" style={{
            textShadow: '1px 1px 2px rgba(0, 0, 0, 0.8)'
          }}>
            Power ON → Tune or select a station
          </div>
        )}

        <div className="absolute inset-0 rounded-3xl opacity-20 pointer-events-none" style={{
          background: 'repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(0,0,0,0.1) 2px, rgba(0,0,0,0.1) 4px)'
        }}></div>

        <div className="absolute top-4 right-4 sm:top-6 sm:right-6 w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-amber-900 to-amber-950 border-2 border-amber-800 overflow-hidden"
          style={{
            boxShadow: 'inset 0 2px 6px rgba(0, 0, 0, 0.6), 0 1px 4px rgba(0, 0, 0, 0.4)'
          }}
        >
          <div className="absolute inset-0 grid grid-cols-8 grid-rows-8 gap-0.5 p-1.5">
            {Array.from({ length: 64 }, (_, i) => {
              const row = Math.floor(i / 8);
              const col = i % 8;
              const centerX = 4;
              const centerY = 4;
              const distance = Math.sqrt(Math.pow(col - centerX, 2) + Math.pow(row - centerY, 2));
              const isInCircle = distance < 3.5;
              return isInCircle ? (
                <div
                  key={i}
                  className="rounded-full bg-black opacity-60"
                  style={{
                    boxShadow: 'inset 0 0.5px 1px rgba(0, 0, 0, 0.8)'
                  }}
                ></div>
              ) : null;
            })}
          </div>
        </div>

        <div
          className="bg-gradient-to-b from-amber-100 to-amber-200 rounded-xl sm:rounded-2xl p-3 sm:p-4 lg:p-6 mb-4 sm:mb-6 border-2 sm:border-4 border-amber-900 relative"
          style={{
            boxShadow: 'inset 0 4px 8px rgba(0, 0, 0, 0.3), inset 0 -2px 4px rgba(255, 255, 255, 0.3), 0 2px 4px rgba(0, 0, 0, 0.2)'
          }}
        >
          <div className="text-center mb-3 sm:mb-4 relative">
            <div className="absolute left-6 sm:left-10 top-1/2 -translate-y-1/2 flex items-end gap-1">
              <div className="relative" style={{ paddingTop: '12px' }}>
                <div className="flex flex-col items-center">
                  <div className="w-0.5 h-4 bg-gradient-to-t from-slate-500 to-slate-300"
                    style={{
                      boxShadow: '0 0 2px rgba(100, 116, 139, 0.5)'
                    }}
                  ></div>
                  <div className="w-1 h-5 bg-gradient-to-t from-slate-600 to-slate-400"
                    style={{
                      boxShadow: '0 0 3px rgba(100, 116, 139, 0.6)'
                    }}
                  ></div>
                  <div className="w-1.5 h-1 bg-slate-700 rounded-b-full"></div>
                </div>
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-blue-500 rounded-full z-10"
                  style={{
                    boxShadow: '0 0 4px rgba(59, 130, 246, 0.8), 0 0 8px rgba(59, 130, 246, 0.4)'
                  }}
                ></div>
                <style>{`
                  @keyframes signal-wave {
                    0% {
                      transform: translate(-50%, -50%) scale(0.5);
                      opacity: 0.8;
                    }
                    100% {
                      transform: translate(-50%, -50%) scale(2.5);
                      opacity: 0;
                    }
                  }
                `}</style>
                <div className="absolute top-0 left-1/2 w-6 h-6 border border-amber-400 rounded-full pointer-events-none"
                  style={{
                    animation: 'signal-wave 2s ease-out infinite',
                    animationDelay: '0s'
                  }}
                ></div>
                <div className="absolute top-0 left-1/2 w-6 h-6 border border-amber-400 rounded-full pointer-events-none"
                  style={{
                    animation: 'signal-wave 2s ease-out infinite',
                    animationDelay: '0.5s'
                  }}
                ></div>
                <div className="absolute top-0 left-1/2 w-6 h-6 border border-amber-500 rounded-full pointer-events-none"
                  style={{
                    animation: 'signal-wave 2s ease-out infinite',
                    animationDelay: '1s'
                  }}
                ></div>
                <div className="absolute top-0 left-1/2 w-6 h-6 border border-amber-500 rounded-full pointer-events-none"
                  style={{
                    animation: 'signal-wave 2s ease-out infinite',
                    animationDelay: '1.5s'
                  }}
                ></div>
              </div>
            </div>
            <h1
              className="text-sm sm:text-lg lg:text-2xl font-bold tracking-wide sm:tracking-widest"
              style={{
                fontFamily: 'serif',
                color: '#7d8995',
                textShadow: `
                  -1px -1px 0px rgba(255, 255, 255, 0.8),
                  1px 1px 0px rgba(0, 0, 0, 0.6),
                  2px 2px 1px rgba(0, 0, 0, 0.4),
                  -1px 1px 0px rgba(0, 0, 0, 0.3),
                  1px -1px 0px rgba(255, 255, 255, 0.5)
                `,
                filter: 'drop-shadow(2px 2px 2px rgba(0, 0, 0, 0.4))'
              }}
            >
              WORLDWIDE RADIO RECEIVER
            </h1>
            <button
              onClick={onPowerToggle}
              className="absolute right-0 top-1/2 -translate-y-1/2 h-8 sm:h-10 px-3 sm:px-4 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5 sm:gap-2 bg-gradient-to-b from-slate-700 via-slate-800 to-slate-900 text-slate-200 hover:from-slate-600 hover:via-slate-700 hover:to-slate-800 border-2 border-slate-600"
              style={{
                boxShadow: '0 4px 8px rgba(0, 0, 0, 0.6), inset 0 2px 4px rgba(255, 255, 255, 0.1), inset 0 -2px 4px rgba(0, 0, 0, 0.3)'
              }}
              title={isPoweredOn ? 'Power Off' : 'Power On'}
            >
              <div
                className={`absolute top-1.5 right-1.5 w-2 h-2 rounded-full transition-all ${
                  isPoweredOn ? 'bg-green-400' : 'bg-red-500'
                }`}
                style={{
                  boxShadow: isPoweredOn
                    ? '0 0 8px 2px rgba(34, 197, 94, 1), 0 0 16px 4px rgba(34, 197, 94, 0.6), inset 0 0 3px rgba(255, 255, 255, 0.9)'
                    : '0 0 8px 2px rgba(239, 68, 68, 1), 0 0 16px 4px rgba(239, 68, 68, 0.6), inset 0 0 3px rgba(255, 255, 255, 0.9)'
                }}
              ></div>
              <Power size={14} className="sm:w-4 sm:h-4" />
              {isPoweredOn ? 'ON' : 'OFF'}
            </button>
          </div>

          <div
            ref={tuningRef}
            className={`relative h-20 sm:h-24 lg:h-28 bg-black rounded-lg mb-3 sm:mb-4 overflow-hidden border-2 border-amber-900 ${currentMode === 'Radio' ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}
            style={{
              boxShadow: 'inset 0 4px 12px rgba(0, 0, 0, 0.9), inset 0 1px 2px rgba(255, 255, 255, 0.05)'
            }}
            onMouseDown={(e) => {
              if (currentMode === 'Radio') {
                setIsDragging(true);
                handleTuningDrag(e);
              }
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-b from-gray-900 to-black">
              <div className="absolute top-2 left-0 right-0 px-2">
                {generateFrequencyMarkers().map((marker, index) => (
                  <div
                    key={index}
                    className="absolute"
                    style={{ left: `${marker.position}%`, transform: 'translateX(-50%)' }}
                  >
                    <div
                      className={`mx-auto ${
                        marker.isMajor
                          ? 'h-4 w-0.5 bg-red-400'
                          : 'h-2 w-px bg-red-600'
                      }`}
                    ></div>
                    {marker.label && (
                      <div className="absolute top-5 left-1/2 -translate-x-1/2 text-[11px] text-red-300 font-bold whitespace-nowrap drop-shadow-lg">
                        {marker.label}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="absolute top-12 left-0 right-0 h-px bg-red-900"></div>

              <div
                className="absolute top-7 h-16 w-1 bg-gradient-to-b from-red-600 to-red-400 shadow-lg transition-all duration-150 z-10"
                style={{
                  left: `${getNeedlePosition()}%`,
                  filter: isPlaying ? 'drop-shadow(0 0 8px rgba(239, 68, 68, 0.8))' : 'none'
                }}
              >
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-3 h-3 bg-red-500 rounded-full shadow-lg"></div>
              </div>

              {isPlaying && (
                <div
                  className="absolute top-24 text-red-400 text-xs font-mono text-center transition-all duration-150"
                  style={{ left: `${getNeedlePosition()}%`, transform: 'translateX(-50%)' }}
                >
                  {formatFrequency(tuningFrequency)}
                </div>
              )}
            </div>

            <div
              className="absolute inset-0 pointer-events-none z-20 rounded-lg"
              style={{
                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.2) 0%, rgba(255, 255, 255, 0.08) 25%, rgba(255, 255, 255, 0.03) 45%, transparent 65%)',
                backdropFilter: 'blur(0.3px)',
                boxShadow: 'inset 0 2px 4px rgba(255, 255, 255, 0.25), inset 0 -2px 3px rgba(0, 0, 0, 0.4)'
              }}
            />
          </div>

          <div className="mb-3 sm:mb-4">
            <div className="flex items-center gap-2">
              <label className="text-slate-900 text-sm sm:text-base uppercase tracking-wider font-bold whitespace-nowrap" style={{
                textShadow: '0 1px 2px rgba(255, 255, 255, 0.8), 0 2px 4px rgba(0, 0, 0, 0.3)'
              }}>Mode</label>
              <div className="flex-1 flex gap-1.5 sm:gap-2">
                {MODES.map((mode) => (
                  <button
                    key={mode}
                    onClick={() => onModeChange(mode)}
                    className={`flex-1 py-1.5 rounded-md text-[10px] sm:text-xs font-bold transition-all ${
                      isPoweredOn && currentMode === mode
                        ? 'bg-gradient-to-b from-amber-500 via-orange-600 to-red-700 text-white border-2 border-amber-400'
                        : 'bg-gradient-to-b from-blue-900 via-blue-950 to-slate-950 text-blue-200 border-2 border-blue-800 hover:from-blue-800 hover:via-blue-900 hover:to-blue-950'
                    }`}
                    style={{
                      boxShadow: isPoweredOn && currentMode === mode
                        ? 'inset 0 2px 4px rgba(0, 0, 0, 0.3), 0 4px 8px rgba(251, 191, 36, 0.5), 0 0 16px rgba(245, 158, 11, 0.7)'
                        : '0 2px 4px rgba(0, 0, 0, 0.4), inset 0 1px 2px rgba(255, 255, 255, 0.15)',
                      textShadow: isPoweredOn && currentMode === mode
                        ? '0 0 5px #fbbf24, 0 1px 2px rgba(0, 0, 0, 0.8)'
                        : '0 1px 1px rgba(0, 0, 0, 0.5)',
                      filter: isPoweredOn && currentMode === mode ? 'brightness(1.15)' : 'none'
                    }}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mb-3 sm:mb-4">
            <StationDropdown
              stations={stations}
              currentStation={currentStation}
              currentBand={currentBand}
              currentMode={currentMode}
              isPoweredOn={isPoweredOn}
              availableLanguages={availableLanguages}
              availableGenres={availableGenres}
              selectedLanguage={selectedLanguage}
              selectedGenre={selectedGenre}
              onStationSelect={onStationSelect}
              onLanguageSelect={onLanguageChange}
              onGenreSelect={onGenreChange}
              onLoadGenreStations={onLoadGenreStations}
              genreStationsCache={genreStationsCache}
              onLoadLanguageStations={onLoadLanguageStations}
              languageStationsCache={languageStationsCache}
              totalStationsCount={totalStationsCount}
              hasMoreStations={hasMoreStations}
              isLoadingMore={isLoadingMore}
              userLocation={userLocation}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-3 sm:mb-4">
            <div
              className="bg-amber-900 rounded-lg p-3 border-2 border-amber-950"
              style={{
                boxShadow: 'inset 0 2px 6px rgba(0, 0, 0, 0.4), 0 1px 2px rgba(0, 0, 0, 0.2)'
              }}
            >
              <div className="text-amber-100 text-center font-mono">
                  {isBuffering ? (
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                      <div className="text-sm text-amber-400">Buffering...</div>
                    </div>
                  ) : isPlayingStatic ? (
                    <div className="text-xs text-amber-400 px-2">
                      Static on this frequency... try tuning a bit further or select a station below
                    </div>
                  ) : streamError && currentStation ? (
                    <div className="text-xs text-amber-300 px-2">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
                        <span>{streamError}</span>
                      </div>
                      {(currentStation.source_url || currentStation.homepage) && (
                        <div className="mt-2 text-[10px] text-amber-400/80">
                          Try selecting another station or visit the broadcaster's website
                        </div>
                      )}
                    </div>
                  ) : currentStation ? (
                    <div className="flex items-start gap-3">
                      {currentStation.logo_url && (
                        <img
                          src={currentStation.logo_url}
                          alt={`${currentStation.name} logo`}
                          className="w-10 h-10 rounded object-contain flex-shrink-0 bg-white"
                          style={{
                            imageRendering: 'crisp-edges'
                          }}
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold truncate">{currentStation.name}</div>
                        <div className="text-xs text-amber-300 truncate">
                          {currentStation.country} • {currentStation.codec} {currentStation.bitrate}kbps
                        </div>
                        {(currentStation.owner || currentStation.network || currentStation.source_url || currentStation.homepage) && (
                          <div className="text-[10px] text-amber-400/70 mt-1">
                            <div className="truncate">
                              {(currentStation.owner || currentStation.network) && (
                                <span>Broadcaster: {currentStation.owner || currentStation.network}</span>
                              )}
                              {(currentStation.owner || currentStation.network) && (currentStation.source_url || currentStation.homepage) && (
                                <span> | </span>
                              )}
                              {(currentStation.source_url || currentStation.homepage) && (
                                <a
                                  href={currentStation.source_url || currentStation.homepage}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 hover:text-amber-300 transition-colors underline"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <span>Visit website</span>
                                  <span>→</span>
                                </a>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                      {(isPlaying || (!isBuffering && !isPlayingStatic && !streamError)) && (
                        <button
                          onClick={onPlayPause}
                          className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-b from-amber-600 to-amber-800 hover:from-amber-500 hover:to-amber-700 flex items-center justify-center transition-all border-2 border-amber-400 group"
                          style={{
                            boxShadow: '0 4px 8px rgba(0, 0, 0, 0.6), inset 0 1px 2px rgba(255, 255, 255, 0.3)'
                          }}
                          title={isPlaying ? 'Pause' : 'Play'}
                        >
                          {isPlaying ? (
                            <Pause size={18} className="text-white drop-shadow-lg group-hover:scale-110 transition-transform" />
                          ) : (
                            <Play size={18} className="text-white drop-shadow-lg ml-0.5 group-hover:scale-110 transition-transform" />
                          )}
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="text-[10px] text-amber-400">
                      {getIdleMessage(currentMode, isPoweredOn)}
                    </div>
                  )}
                </div>

            </div>

            <div
              className="bg-gray-900 rounded-lg p-2 sm:p-3 border-2 border-amber-950"
              style={{
                boxShadow: 'inset 0 2px 6px rgba(0, 0, 0, 0.6), 0 1px 2px rgba(0, 0, 0, 0.3)'
              }}
            >
              <div className="text-center mb-1">
                <div className="text-[10px] text-cyan-400 tracking-wider">VU METER - {vuLevel.toFixed(0)}%</div>
              </div>
              <div className="h-6 bg-black rounded flex items-end gap-0.5 px-2">
                {[...Array(20)].map((_, i) => {
                  const barThreshold = (i / 20) * 100;
                  const isActive = vuLevel > barThreshold;
                  return (
                    <div
                      key={i}
                      className={`flex-1 rounded-t transition-all duration-75 ${
                        isActive ? getVuColor(barThreshold) : 'bg-gray-800'
                      }`}
                      style={{
                        height: `${30 + (i * 3.5)}%`
                      }}
                    ></div>
                  );
                })}
              </div>
            </div>
          </div>

          <div
            className="bg-gray-900 rounded-lg p-2 sm:p-3 border-2 border-amber-950"
            style={{
              boxShadow: 'inset 0 2px 6px rgba(0, 0, 0, 0.6), 0 1px 2px rgba(0, 0, 0, 0.3)'
            }}
          >
            <div className="text-center mb-1">
              <div className="text-[10px] text-blue-400 tracking-wider">SPECTRUM ANALYZER</div>
            </div>
            <div className="h-16 bg-black rounded flex items-end gap-[1px] px-1 overflow-hidden">
              {Array.from({ length: 120 }, (_, barIndex) => {
                const dataIndex = Math.floor((barIndex / 120) * frequencyData.length);
                const value = frequencyData[dataIndex] || 0;
                const heightPercent = isPlaying ? Math.min((value / 255) * 150, 100) : 0;
                const dotsPerBar = 12;
                const activeDots = Math.floor((heightPercent / 100) * dotsPerBar);

                return (
                  <div
                    key={barIndex}
                    className="flex-1 flex flex-col-reverse justify-start gap-[1px]"
                    style={{ height: '100%' }}
                  >
                    {Array.from({ length: dotsPerBar }, (_, dotIndex) => {
                      const isActive = dotIndex < activeDots;
                      const position = dotIndex / dotsPerBar;

                      let color, glow;
                      if (position < 0.2) {
                        color = '#10b981';
                        glow = '#10b981';
                      } else if (position < 0.4) {
                        color = '#fbbf24';
                        glow = '#fbbf24';
                      } else if (position < 0.6) {
                        color = '#f97316';
                        glow = '#f97316';
                      } else if (position < 0.8) {
                        color = '#ef4444';
                        glow = '#ef4444';
                      } else {
                        color = '#991b1b';
                        glow = '#991b1b';
                      }

                      return (
                        <div
                          key={dotIndex}
                          className="w-full transition-all duration-100 ease-out"
                          style={{
                            height: '2px',
                            borderRadius: '1px',
                            backgroundColor: isActive ? color : '#0a0a0a',
                            boxShadow: isActive ? `0 0 4px ${glow}, 0 0 6px ${glow}` : 'none',
                            opacity: isActive ? 1 : 0.2
                          }}
                        />
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div className="hidden lg:block lg:col-span-2">
            <div
              className="relative w-full h-full bg-gradient-to-br from-amber-900/20 to-amber-800/30 rounded-lg border-2 border-amber-700/40 p-4 flex items-center justify-center overflow-hidden"
              style={{
                boxShadow: 'inset 0 2px 8px rgba(0, 0, 0, 0.3), 0 2px 4px rgba(0, 0, 0, 0.2)',
                minHeight: '180px'
              }}
            >
              <div className="absolute inset-0 pointer-events-none">
                <div className="placeholder-bubble placeholder-bubble-1"></div>
                <div className="placeholder-bubble placeholder-bubble-2"></div>
                <div className="placeholder-bubble placeholder-bubble-3"></div>
                <div className="placeholder-bubble placeholder-bubble-4"></div>
                <div className="placeholder-bubble placeholder-bubble-5"></div>
              </div>
              <style>{`
                @keyframes placeholder-float-up {
                  0% {
                    bottom: -50px;
                    opacity: 0;
                    transform: scale(0.8);
                  }
                  10% {
                    opacity: 0.25;
                  }
                  90% {
                    opacity: 0.25;
                  }
                  100% {
                    bottom: 100%;
                    opacity: 0;
                    transform: scale(1.2);
                  }
                }
                .placeholder-bubble {
                  position: absolute;
                  border-radius: 50%;
                  animation: placeholder-float-up linear infinite;
                  pointer-events: none;
                }
                .placeholder-bubble-1 {
                  width: 45px;
                  height: 45px;
                  left: 18%;
                  animation-duration: 13s;
                  animation-delay: 0s;
                  background: radial-gradient(circle at 30% 30%, rgba(255, 150, 100, 0.5), rgba(255, 100, 80, 0.15));
                }
                .placeholder-bubble-2 {
                  width: 28px;
                  height: 28px;
                  left: 48%;
                  animation-duration: 16s;
                  animation-delay: 3s;
                  background: radial-gradient(circle at 30% 30%, rgba(100, 200, 255, 0.5), rgba(80, 180, 255, 0.15));
                }
                .placeholder-bubble-3 {
                  width: 38px;
                  height: 38px;
                  left: 72%;
                  animation-duration: 19s;
                  animation-delay: 7s;
                  background: radial-gradient(circle at 30% 30%, rgba(255, 200, 100, 0.5), rgba(255, 180, 80, 0.15));
                }
                .placeholder-bubble-4 {
                  width: 22px;
                  height: 22px;
                  left: 32%;
                  animation-duration: 15s;
                  animation-delay: 10s;
                  background: radial-gradient(circle at 30% 30%, rgba(150, 255, 150, 0.5), rgba(100, 255, 120, 0.15));
                }
                .placeholder-bubble-5 {
                  width: 32px;
                  height: 32px;
                  left: 85%;
                  animation-duration: 17s;
                  animation-delay: 2s;
                  background: radial-gradient(circle at 30% 30%, rgba(255, 150, 200, 0.5), rgba(255, 120, 180, 0.15));
                }
              `}</style>
              <div className="text-center space-y-2 relative z-10">
                <div className="text-amber-400/60 text-sm font-medium">
                  🎧 Choose a station to begin playback
                </div>
                <div className="text-amber-300/40 text-xs">
                  Channel provider content will appear here.
                </div>
              </div>
              <div
                className="absolute inset-0 rounded-lg pointer-events-none"
                style={{
                  backgroundImage: `
                    repeating-linear-gradient(
                      0deg,
                      transparent,
                      transparent 2px,
                      rgba(217, 119, 6, 0.03) 2px,
                      rgba(217, 119, 6, 0.03) 4px
                    ),
                    repeating-linear-gradient(
                      90deg,
                      transparent,
                      transparent 2px,
                      rgba(217, 119, 6, 0.03) 2px,
                      rgba(217, 119, 6, 0.03) 4px
                    )
                  `
                }}
              />
            </div>
          </div>

          <div className="space-y-2 col-span-2 sm:col-span-1">
            <label className="text-amber-300 text-xs uppercase tracking-wider block text-center">Band</label>
            <div className="flex flex-col gap-1">
              {VISIBLE_BANDS.map((band) => (
                <button
                  key={band}
                  onClick={() => currentMode === 'Radio' && onBandChange(band)}
                  disabled={currentMode !== 'Radio'}
                  className={`px-2 sm:px-3 py-1.5 sm:py-2 rounded text-xs font-bold transition-all ${
                    currentMode !== 'Radio'
                      ? 'bg-gray-600 text-gray-400 cursor-not-allowed opacity-50'
                      : currentBand === band
                      ? 'bg-red-600'
                      : 'bg-amber-700 text-amber-200 hover:bg-amber-600'
                  }`}
                  style={{
                    boxShadow: currentMode !== 'Radio'
                      ? 'none'
                      : currentBand === band
                      ? 'inset 0 2px 4px rgba(0, 0, 0, 0.3), 0 4px 8px rgba(220, 38, 38, 0.4), 0 0 20px rgba(0, 174, 255, 0.8), 0 0 40px rgba(0, 174, 255, 0.5)'
                      : '0 2px 4px rgba(0, 0, 0, 0.3), inset 0 1px 1px rgba(255, 255, 255, 0.1)',
                    color: currentMode !== 'Radio' ? undefined : (currentBand === band ? '#ffffff' : undefined),
                    textShadow: currentMode !== 'Radio'
                      ? 'none'
                      : currentBand === band
                      ? '0 0 3px #00aeff, 0 0 6px #00aeff, 0 0 10px #00aeff, 0 1px 2px rgba(0, 0, 0, 0.8)'
                      : 'none',
                    filter: currentMode !== 'Radio' ? 'none' : (currentBand === band ? 'brightness(1.2)' : 'none')
                  }}
                >
                  {BAND_RANGES[band].label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2 sm:space-y-3">
            <div className="space-y-1">
              <label className="text-amber-300 text-xs uppercase tracking-wider block text-center">Volume</label>
              <input
                type="range"
                min="0"
                max="100"
                value={volume}
                onChange={(e) => onVolumeChange(Number(e.target.value))}
                className="w-full h-2 bg-amber-700 rounded-lg appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #dc2626 0%, #dc2626 ${volume}%, #92400e ${volume}%, #92400e 100%)`
                }}
              />
              <div className="flex items-center justify-center gap-1 text-amber-400 text-xs font-mono">
                {volume === 0 ? (
                  <VolumeX size={14} />
                ) : (
                  <Volume2 size={14} />
                )}
                <span>{volume}%</span>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-amber-300 text-xs uppercase tracking-wider block text-center">Bass</label>
              <input
                type="range"
                min="-12"
                max="12"
                value={bass}
                onChange={(e) => onBassChange(Number(e.target.value))}
                className="w-full h-2 bg-amber-700 rounded-lg appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #92400e 0%, #92400e ${((bass + 12) / 24) * 100}%, #dc2626 ${((bass + 12) / 24) * 100}%, #dc2626 100%)`
                }}
              />
              <div className="flex items-center justify-center gap-1 text-amber-400 text-xs font-mono">
                <Music2 size={14} />
                <span>{bass > 0 ? '+' : ''}{bass} dB</span>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-amber-300 text-xs uppercase tracking-wider block text-center">Treble</label>
              <input
                type="range"
                min="-12"
                max="12"
                value={treble}
                onChange={(e) => onTrebleChange(Number(e.target.value))}
                className="w-full h-2 bg-amber-700 rounded-lg appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #92400e 0%, #92400e ${((treble + 12) / 24) * 100}%, #dc2626 ${((treble + 12) / 24) * 100}%, #dc2626 100%)`
                }}
              />
              <div className="flex items-center justify-center gap-1 text-amber-400 text-xs font-mono">
                <Music3 size={14} />
                <span>{treble > 0 ? '+' : ''}{treble} dB</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center col-span-2 sm:col-span-1 lg:col-span-1">
            <div
              className="relative w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 rounded-md p-3 border-2 border-gray-700"
              style={{
                boxShadow: 'inset 0 2px 8px rgba(0, 0, 0, 0.6), 0 2px 4px rgba(0, 0, 0, 0.4)'
              }}
            >
              <div className="relative w-full h-full flex items-center justify-center rounded">
                <div className="relative w-20 h-20 sm:w-24 sm:h-24 lg:w-28 lg:h-28">
                  <div className="absolute inset-0 rounded-full bg-gray-900 border-2 border-gray-800 flex items-center justify-center" style={{ boxShadow: 'inset 0 4px 12px rgba(0, 0, 0, 0.9)' }}>
                    <div
                      className="absolute inset-3 rounded-full transition-all duration-50"
                      style={{
                        background: 'radial-gradient(circle at 35% 35%, #d4b896, #c9a778 25%, #b8935e 50%, #a67d46 75%, #8b6834)',
                        transform: isPlaying && frequencyData.length > 0
                          ? `scale(${1 + (frequencyData.reduce((a, b) => a + b, 0) / frequencyData.length / 255) * 0.35})`
                          : 'scale(1)',
                        boxShadow: isPlaying && frequencyData.length > 0
                          ? `0 0 80px rgba(220, 38, 38, ${(frequencyData.reduce((a, b) => a + b, 0) / frequencyData.length / 255) * 1.8}), inset 0 8px 16px rgba(0, 0, 0, 0.4), inset 0 -8px 16px rgba(255, 255, 255, 0.1)`
                          : 'inset 0 8px 16px rgba(0, 0, 0, 0.4), inset 0 -8px 16px rgba(255, 255, 255, 0.1)'
                      }}
                    >
                      <div
                        className="absolute inset-0 rounded-full"
                        style={{
                          backgroundImage: `
                            repeating-conic-gradient(from 0deg at 50% 50%, transparent 0deg, rgba(0, 0, 0, 0.08) 2deg, transparent 4deg),
                            radial-gradient(circle at 50% 50%, transparent 30%, rgba(0, 0, 0, 0.15) 70%)
                          `
                        }}
                      />
                      <div
                        className="absolute inset-[30%] rounded-full bg-gradient-to-br from-gray-700 via-gray-800 to-gray-900 transition-all duration-50"
                        style={{
                          boxShadow: 'inset 0 3px 8px rgba(0, 0, 0, 0.8), 0 2px 4px rgba(0, 0, 0, 0.5)',
                          transform: isPlaying && frequencyData.length > 0
                            ? `scale(${1 + (frequencyData.reduce((a, b) => a + b, 0) / frequencyData.length / 255) * 0.45})`
                            : 'scale(1)'
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div
                className="absolute inset-0 rounded-md pointer-events-none transition-all duration-50"
                style={{
                  backgroundImage: `
                    repeating-linear-gradient(
                      0deg,
                      transparent,
                      transparent 1.5px,
                      rgba(60, 60, 60, 0.5) 1.5px,
                      rgba(60, 60, 60, 0.5) 3px
                    ),
                    repeating-linear-gradient(
                      90deg,
                      transparent,
                      transparent 1.5px,
                      rgba(60, 60, 60, 0.5) 1.5px,
                      rgba(60, 60, 60, 0.5) 3px
                    )
                  `,
                  boxShadow: 'inset 0 0 8px rgba(0, 0, 0, 0.3)'
                }}
              />
            </div>
          </div>
        </div>

        {/* PLAY/PAUSE BUTTON - Temporarily disabled but kept for future use */}
        {/* <button
          onClick={onPlayPause}
          disabled={!isPoweredOn || !currentStation}
          className="relative w-full h-12 sm:h-14 rounded-xl font-bold text-sm sm:text-base transition-all flex items-center justify-center gap-2 bg-gradient-to-b from-amber-700 via-amber-800 to-amber-900 text-amber-100 hover:from-amber-600 hover:via-amber-700 hover:to-amber-800 border-2 border-amber-600 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:from-amber-700 disabled:hover:via-amber-800 disabled:hover:to-amber-900"
          style={{
            boxShadow: '0 6px 12px rgba(0, 0, 0, 0.6), inset 0 2px 4px rgba(255, 255, 255, 0.1), inset 0 -2px 4px rgba(0, 0, 0, 0.3)'
          }}
        >
          {isPlaying ? <Pause size={20} /> : <Play size={20} />}
          {isPlaying ? 'PAUSE' : 'PLAY'}
        </button> */}
        {/* LOCATION SEARCH - Moved to top brown frame, kept here for reference */}
        {/* {userLocation && (
          <div className="w-full mt-2" data-location-search>
            <LocationSearch
              currentCity={userLocation.city}
              currentCountry={userLocation.country}
              onLocationChange={onLocationChange}
              isOpen={isLocationSearchOpen}
              onToggle={setIsLocationSearchOpen}
            />
          </div>
        )} */}

        <div className="grid grid-cols-3 gap-1 sm:gap-2 text-center text-[10px] sm:text-xs text-amber-500 border-t border-amber-700 pt-3 sm:pt-4">
          <div className="flex items-center justify-center gap-2">
            <div
              className={`w-2 h-2 rounded-full transition-all ${
                isPoweredOn ? 'bg-green-400' : 'bg-amber-800'
              }`}
              style={{
                boxShadow: isPoweredOn
                  ? '0 0 8px 2px rgba(34, 197, 94, 0.8), inset 0 0 2px rgba(255, 255, 255, 0.9)'
                  : 'none'
              }}
            ></div>
            <span>ANTENNA</span>
          </div>
          <div className="flex items-center justify-center gap-2">
            <div
              className={`w-2 h-2 rounded-full transition-all ${
                isPoweredOn ? 'bg-green-400' : 'bg-amber-800'
              }`}
              style={{
                boxShadow: isPoweredOn
                  ? '0 0 8px 2px rgba(34, 197, 94, 0.8), inset 0 0 2px rgba(255, 255, 255, 0.9)'
                  : 'none'
              }}
            ></div>
            <span>AFC</span>
          </div>
          <div className="flex items-center justify-center gap-2">
            <div
              className={`w-2 h-2 rounded-full transition-all ${
                !isPoweredOn
                  ? 'bg-amber-800'
                  : currentStation
                    ? 'bg-green-400'
                    : 'bg-yellow-400'
              }`}
              style={{
                boxShadow: isPoweredOn && currentStation
                  ? '0 0 8px 2px rgba(34, 197, 94, 0.8), inset 0 0 2px rgba(255, 255, 255, 0.9)'
                  : isPoweredOn && !currentStation
                    ? '0 0 8px 2px rgba(234, 179, 8, 0.8), inset 0 0 2px rgba(255, 255, 255, 0.9)'
                    : 'none'
              }}
            ></div>
            <span>SIGNAL</span>
          </div>
        </div>
      </div>

      <div
        className="hidden lg:block absolute -right-4 top-1/4 w-2 h-64 bg-gradient-to-b from-amber-800 to-amber-950 rounded-full transform rotate-12"
        style={{
          boxShadow: '0 10px 20px rgba(0, 0, 0, 0.5), inset 0 1px 2px rgba(255, 255, 255, 0.1)'
        }}
      ></div>
      <div
        className="hidden lg:block absolute -left-4 top-1/3 w-2 h-48 bg-gradient-to-b from-amber-800 to-amber-950 rounded-full transform -rotate-12"
        style={{
          boxShadow: '0 10px 20px rgba(0, 0, 0, 0.5), inset 0 1px 2px rgba(255, 255, 255, 0.1)'
        }}
      ></div>

      {userLocation && (
        <div className="fixed inset-0 pointer-events-none z-50 flex items-start justify-center pt-20">
          <div className="pointer-events-auto">
            <LocationSearch
              currentCity={userLocation.city}
              currentCountry={userLocation.country}
              currentCountryCode={userLocation.country_code}
              onLocationChange={onLocationChange}
              isOpen={isLocationSearchOpen}
              onToggle={setIsLocationSearchOpen}
              hideButton={true}
              searchMode={currentMode === 'Region' ? 'country' : 'city'}
            />
          </div>
        </div>
      )}
    </div>
  );
}
