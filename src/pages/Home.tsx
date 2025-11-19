import { useState, useEffect } from 'react';
import { VintageRadio } from '../components/VintageRadio';
import SEO from '../components/SEO';
import { useRadioPlayer } from '../hooks/useRadioPlayer';
import { useAllStationsSearch } from '../hooks/useAllStationsSearch';
import { radioService } from '../services/radioService';
import { populateRadioStations, fetchStationsByLocation, fetchStationsByCountry } from '../services/radioBrowserService';
import { importTerrestrialStations } from '../services/terrestrialRadioData';
import { RadioStation, BandType, UserLocation, ModeType } from '../types/radio';
import { Radio, Search } from 'lucide-react';
import { getTimezoneForCoordinates } from '../services/timezoneService';

const BAND_RANGES: Record<BandType, { min: number; max: number }> = {
  AM: { min: 530, max: 1700 },
  FM: { min: 88, max: 108 },
  SW: { min: 5900, max: 15600 },
  SW1: { min: 5900, max: 6200 },
  SW2: { min: 9500, max: 9900 },
  SW3: { min: 15100, max: 15600 }
};

const getCountryFlag = (countryName: string): string => {
  const countryToCode: Record<string, string> = {
    'India': 'IN',
    'United States': 'US',
    'United Kingdom': 'GB',
    'Canada': 'CA',
    'Australia': 'AU',
    'Germany': 'DE',
    'France': 'FR',
    'Spain': 'ES',
    'Italy': 'IT',
    'Japan': 'JP',
    'China': 'CN',
    'Brazil': 'BR',
    'Mexico': 'MX',
    'Russia': 'RU',
    'South Korea': 'KR',
    'Netherlands': 'NL',
    'Sweden': 'SE',
    'Norway': 'NO',
    'Denmark': 'DK',
    'Finland': 'FI',
    'Poland': 'PL',
    'Belgium': 'BE',
    'Switzerland': 'CH',
    'Austria': 'AT',
    'Portugal': 'PT',
    'Greece': 'GR',
    'Czech Republic': 'CZ',
    'Ireland': 'IE',
    'New Zealand': 'NZ',
    'Singapore': 'SG',
    'Malaysia': 'MY',
    'Thailand': 'TH',
    'Indonesia': 'ID',
    'Philippines': 'PH',
    'Vietnam': 'VN',
    'South Africa': 'ZA',
    'Argentina': 'AR',
    'Chile': 'CL',
    'Colombia': 'CO',
    'Peru': 'PE',
    'Turkey': 'TR',
    'Egypt': 'EG',
    'Saudi Arabia': 'SA',
    'United Arab Emirates': 'AE',
    'Israel': 'IL',
    'Pakistan': 'PK',
    'Bangladesh': 'BD',
    'Sri Lanka': 'LK',
    'Nepal': 'NP',
    'Myanmar': 'MM',
    'Ukraine': 'UA',
    'Romania': 'RO',
    'Hungary': 'HU'
  };

  const code = countryToCode[countryName];
  if (!code) return '';

  return String.fromCodePoint(...[...code].map(c => 127397 + c.charCodeAt(0)));
};

const getStationText = (count: number): string => {
  return count === 1 ? 'station' : 'stations';
};

export default function Home() {
  const [isPoweredOn, setIsPoweredOn] = useState(false);
  const [showInstructions, setShowInstructions] = useState(true);
  const [currentBand, setCurrentBand] = useState<BandType>('FM');
  const [tuningFrequency, setTuningFrequency] = useState(95.5);
  const [stations, setStations] = useState<RadioStation[]>([]);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [initialLocation, setInitialLocation] = useState<UserLocation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingStations, setIsLoadingStations] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [currentMode, setCurrentMode] = useState<ModeType>('Radio');
  const [stationSearchTerm, setStationSearchTerm] = useState('');
  const [availableLanguages, setAvailableLanguages] = useState<string[]>([]);
  const [availableGenres, setAvailableGenres] = useState<string[]>([]);

  // Search for 'Search' mode
  const allStationsSearch = useAllStationsSearch({
    searchFunction: async (query: string, limit: number) => {
      return await radioService.searchStations(query, undefined, limit);
    },
    minCharacters: 3,
    debounceMs: 300,
    maxResults: 25
  });
  const [selectedLanguage, setSelectedLanguage] = useState<string>('');
  const [selectedGenre, setSelectedGenre] = useState<string>('');
  const [genreStationsCache, setGenreStationsCache] = useState<Map<string, RadioStation[]>>(new Map());
  const [languageStationsCache, setLanguageStationsCache] = useState<Map<string, RadioStation[]>>(new Map());
  const [stationsOffset, setStationsOffset] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMoreStations, setHasMoreStations] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [totalStationsCount, setTotalStationsCount] = useState<number | null>(null);
  const [radioModeCurrentPage, setRadioModeCurrentPage] = useState(1);
  const RADIO_STATIONS_PER_PAGE = 9;

  const { isPlaying, volume, bass, treble, currentStation, frequencyData, isPlayingStatic, isBuffering, streamError,
    setVolume, setBass, setTreble, playStation, stopPlaying, togglePlayPause, playStaticNoise, stopStaticNoise, setPowerState } = useRadioPlayer();

  useEffect(() => {
    initializeApp();
  }, []);

  useEffect(() => {
    if (isPoweredOn) {
      setShowInstructions(false);
      // Note: Mode changes are handled by handleModeChange, not here
      // This effect only handles band changes and initial power-on
      if (currentMode === 'Radio') {
        loadStationsByBand(currentBand);
      }
    }
  }, [isPoweredOn, currentBand, userLocation]);

  useEffect(() => {
    if (!isPoweredOn) return;

    if (currentMode === 'Radio') {
      if (stations.length > 0) {
        autoTuneToStation();
      } else {
        // No stations available - play static noise
        playStaticNoise();
      }
    }
  }, [stations, isPoweredOn, currentMode]);

  const initializeApp = async () => {
    try {
      const location = await radioService.getUserLocation();
      setUserLocation(location);
      setInitialLocation(location);

      // Check if database has stations
      let allStations = await radioService.getAllStations(10);

      if (allStations.length === 0) {
        console.log('No stations found, populating database...');
        await importTerrestrialStations();
        await populateRadioStations();
      }

      // Don't load all stations - wait for user to power on
      // This prevents auto-playing random stations from other locations
      console.log(`✅ [INIT] App initialized for ${location?.city || 'Unknown'}, ${location?.country || 'Unknown'}`);
    } catch (error) {
      console.error('Error initializing app:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadStationsByBand = async (band: BandType, location?: UserLocation) => {
    const loc = location || userLocation;
    if (!loc) return;

    console.log(`Loading ${band} stations for ${loc.city} (${loc.latitude}, ${loc.longitude})`);

    let bandStations: RadioStation[] = [];
    let radiusKm = 500;

    if (band === 'FM') {
      radiusKm = 75;
      bandStations = await radioService.getStationsByProximity(band, loc.latitude, loc.longitude, radiusKm);
    } else if (band === 'AM') {
      radiusKm = 400;
      bandStations = await radioService.getStationsByProximity(band, loc.latitude, loc.longitude, radiusKm);
    } else if (band.startsWith('SW')) {
      if (loc.city) {
        bandStations = await radioService.getStationsByCityAndBand(loc.city, band);
        console.log(`Loaded ${bandStations.length} ${band} stations for ${loc.city} using realistic coverage`);
      } else {
        const allStations = await radioService.getAllStations(500);
        bandStations = allStations.filter(s => s.band_type === band);
      }
    } else {
      const allStations = await radioService.getAllStations(500);
      bandStations = allStations.filter(s => s.band_type === band);
    }

    console.log(`Loaded ${bandStations.length} stations for ${band} (radius: ${radiusKm}km)`);

    if (bandStations.length === 0 && (band === 'AM' || band.startsWith('SW'))) {
      const bandNames: Record<string, string> = {
        'AM': 'AM/MW',
        'SW': 'Shortwave',
        'SW1': 'Shortwave (5-6 MHz)',
        'SW2': 'Shortwave (9-10 MHz)',
        'SW3': 'Shortwave (15-17 MHz)'
      };
      const emptyMessage: RadioStation = {
        id: `no-${band.toLowerCase()}-stations`,
        name: `No ${bandNames[band] || band} stations available for ${loc.city || loc.country}`,
        frequency: 0,
        band_type: band,
        country: loc.country,
        country_code: loc.country_code,
        state: undefined,
        city: loc.city,
        language: 'unknown',
        stream_url: '',
        homepage: undefined,
        website_url: undefined,
        favicon: undefined,
        tags: [],
        bitrate: 0,
        codec: '',
        latitude: loc.latitude,
        longitude: loc.longitude,
        last_check_ok: false,
        created_at: new Date().toISOString()
      };
      bandStations = [emptyMessage];
    }

    // Filter out stations without valid streams or with known dead streams
    const validStations = bandStations.filter(s => {
      if (!s.stream_url) return false;
      if (s.stream_url.includes('placeholder')) return false;
      // Allow stations through - dead stream detection happens at play time
      return true;
    });

    const withStreams = validStations.length;
    console.log(`📻 [LOAD] Loaded ${bandStations.length} ${band} stations for ${loc.city} - ${withStreams} have valid streams`);
    console.log('First 5 stations:', validStations.slice(0, 5).map(s => `${s.name} (${s.frequency})`));
    setStations(validStations);
  };

  const handlePowerToggle = () => {
    if (isPoweredOn) {
      setPowerState(false);
      stopPlaying();
      stopStaticNoise();
      setIsPoweredOn(false);
      setShowInstructions(true);
    } else {
      setPowerState(true);
      setIsPoweredOn(true);
      setShowInstructions(false);
      setHasInteracted(true);
      playStaticNoise();
    }
  };

  const handleBandChange = (band: BandType) => {
    if (!isPoweredOn) return;
    stopPlaying();
    setCurrentBand(band);
    setRadioModeCurrentPage(1);
    const range = BAND_RANGES[band];
    setTuningFrequency((range.min + range.max) / 2);
  };

  const handleStationLock = () => {
    setHasInteracted(true);
    if (!isPoweredOn || stations.length === 0) return;

    const nearestStation = findNearestStation(tuningFrequency, stations);
    const threshold = currentBand === 'FM' ? 0.3 : 20;

    if (nearestStation && nearestStation.frequency &&
        Math.abs(nearestStation.frequency - tuningFrequency) < threshold) {
      stopStaticNoise();
      playStation(nearestStation);
      radioService.addListeningHistory(nearestStation.id);
    } else {
      stopPlaying();
      playStaticNoise();
    }
  };

  const findNearestStation = (frequency: number, stationList: RadioStation[]): RadioStation | null => {
    const bandStations = stationList.filter(s => s.band_type === currentBand && s.frequency);
    if (bandStations.length === 0) return stationList[0] || null;
    return bandStations.reduce((nearest, station) => {
      if (!station.frequency || !nearest.frequency) return nearest;
      const currentDiff = Math.abs(station.frequency - frequency);
      const nearestDiff = Math.abs(nearest.frequency - frequency);
      return currentDiff < nearestDiff ? station : nearest;
    }, bandStations[0]);
  };

  const autoTuneToStation = () => {
    if (stations.length === 0) return;
    const bandStations = stations.filter(s => s.band_type === currentBand && s.frequency);
    if (bandStations.length === 0) return;

    // Only auto-tune to stations that have streams
    const playableStations = bandStations.filter(s => s.stream_url && !s.stream_url.includes('placeholder'));
    console.log(`🎲 [AUTO-TUNE] ${bandStations.length} ${currentBand} stations available, ${playableStations.length} have streams`);

    if (playableStations.length === 0) {
      console.log('⚠️ [AUTO-TUNE] No stations with streams available - skipping auto-tune');
      return;
    }

    const randomStation = playableStations[Math.floor(Math.random() * Math.min(playableStations.length, 5))];
    console.log(`🎲 [AUTO-TUNE] Selected: ${randomStation.name} (${randomStation.frequency}) ID: ${randomStation.id}`);
    console.log(`🎲 [AUTO-TUNE] Current station before playStation:`, currentStation?.id);

    if (randomStation.frequency) {
      setTuningFrequency(randomStation.frequency);
      console.log(`🎲 [AUTO-TUNE] Set tuning frequency to ${randomStation.frequency}`);
      playStation(randomStation);
      console.log(`🎲 [AUTO-TUNE] Called playStation for ${randomStation.name}`);
      radioService.addListeningHistory(randomStation.id);
    }
  };

  const handleLocationChange = async (countryCode: string, city: string, latitude: number, longitude: number) => {
    const countryName = {
      'US': 'United States', 'GB': 'United Kingdom', 'DE': 'Germany', 'FR': 'France', 'IN': 'India',
      'JP': 'Japan', 'CA': 'Canada', 'AU': 'Australia', 'BR': 'Brazil', 'MX': 'Mexico',
      'ES': 'Spain', 'IT': 'Italy', 'NL': 'Netherlands', 'SE': 'Sweden', 'NO': 'Norway'
    }[countryCode] || countryCode;

    const timezone = await getTimezoneForCoordinates(latitude, longitude);
    const newLocation: UserLocation = { country: countryName, country_code: countryCode, city: city, latitude, longitude, timezone };
    console.log(`Location changed to: ${city}, ${countryName} (${countryCode}), timezone: ${timezone}`);
    setUserLocation(newLocation);

    // Reset pagination when location changes
    setStationsOffset(0);
    setCurrentPage(1);
    setHasMoreStations(false);
    setTotalStationsCount(null);
    setStations([]);

    if (currentMode === 'Radio' || currentMode === 'Region') {
      stopPlaying();
      if (currentMode === 'Radio') {
        await loadStationsByBand(currentBand, newLocation);
      } else {
        await loadStationsByMode(currentMode, false, 0, newLocation);
      }
    }
  };

  const handleModeChange = async (mode: ModeType) => {
    if (!isPoweredOn) return;

    console.log(`Mode changed from ${currentMode} to ${mode}`);

    // ALWAYS stop playing when switching modes to prevent cross-mode playback
    stopPlaying();
    stopStaticNoise();

    // Clear stations array IMMEDIATELY to prevent stale data from triggering auto-tune
    setStations([]);

    // When switching back to Radio mode, restore the initial location for a fresh start
    if (mode === 'Radio' && initialLocation) {
      console.log(`Restoring initial location: ${initialLocation.city}, ${initialLocation.country}`);
      setUserLocation(initialLocation);
    }

    setCurrentMode(mode);
    setStationsOffset(0);
    setCurrentPage(1);
    setRadioModeCurrentPage(1);
    setHasMoreStations(false);
    setTotalStationsCount(null);

    await loadStationsByMode(mode);
  };

  const loadStationsByMode = async (mode: ModeType, append = false, explicitOffset?: number, explicitLocation?: UserLocation) => {
    const locationToUse = explicitLocation || userLocation;
    if (!locationToUse) return;

    setIsLoadingStations(true);
    let modeStations: RadioStation[] = [];
    const BATCH_SIZE = 25;
    const offset = explicitOffset !== undefined ? explicitOffset : (append ? stationsOffset : 0);

    try {
    switch (mode) {
      case 'Radio':
        await loadStationsByBand(currentBand);
        return;

      case 'Region':
        const { stations: regionStations, total } = await radioService.getStationsByLocationWithCount(locationToUse.country_code, BATCH_SIZE, offset);
        modeStations = regionStations;
        console.log(`Loaded ${modeStations.length} of ${total} stations for ${locationToUse.country} (offset: ${offset})`);
        setTotalStationsCount(total);
        setHasMoreStations(offset + modeStations.length < total);
        setStationsOffset(offset + modeStations.length);
        break;

      case 'Language':
        if (availableLanguages.length === 0) {
          const languages = await radioService.getAvailableLanguages();
          console.log(`Loaded ${languages.length} languages`);
          setAvailableLanguages(languages);
        }
        // Don't load all stations upfront - lazy load when language is expanded
        modeStations = [];
        setHasMoreStations(false);
        break;

      case 'Genre':
        if (availableGenres.length === 0) {
          const genres = await radioService.getAvailableGenres();
          setAvailableGenres(genres);
        }
        // Don't load all stations upfront - lazy load when genre is expanded
        modeStations = [];
        setHasMoreStations(false);
        break;

      case 'Search':
        modeStations = await radioService.getAllStations(BATCH_SIZE, offset);
        setHasMoreStations(modeStations.length === BATCH_SIZE);
        setStationsOffset(offset + modeStations.length);
        break;
    }

    console.log(`[loadModeStations] Loaded ${modeStations.length} stations from service`);

    // Debug: Check genre distribution before filtering
    if (mode === 'Genre') {
      const genresBefore = modeStations.reduce((acc, s) => {
        if (s.genre_category) {
          acc[s.genre_category] = (acc[s.genre_category] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);
      console.log('[loadModeStations] Genre distribution BEFORE filtering:', genresBefore);
      console.log('[loadModeStations] Sample stations:', modeStations.slice(0, 3).map(s => ({
        name: s.name,
        genre_category: s.genre_category,
        stream_url: s.stream_url ? 'YES' : 'NO'
      })));
    }

    const validStations = modeStations.filter(s => {
      if (!s.stream_url) return false;
      if (s.stream_url.includes('placeholder')) return false;
      return true;
    });

    // Debug: Check genre distribution after filtering
    if (mode === 'Genre') {
      const genresAfter = validStations.reduce((acc, s) => {
        if (s.genre_category) {
          acc[s.genre_category] = (acc[s.genre_category] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);
      console.log('[loadModeStations] Genre distribution AFTER filtering:', genresAfter);
    }

    console.log(`Loaded ${validStations.length} stations for ${mode} mode`);

    if (append) {
      setStations(prev => [...prev, ...validStations]);
    } else {
      setStations(validStations);
      setStationsOffset(validStations.length);
    }
    } finally {
      setIsLoadingStations(false);
    }
  };

  const goToNextPage = async () => {
    if (isLoadingMore || !hasMoreStations) return;
    setIsLoadingMore(true);
    try {
      const nextPage = currentPage + 1;
      const newOffset = (nextPage - 1) * 25;
      setCurrentPage(nextPage);
      setStationsOffset(newOffset);
      await loadStationsByMode(currentMode, false, newOffset);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const goToPreviousPage = async () => {
    if (isLoadingMore || currentPage <= 1) return;
    setIsLoadingMore(true);
    try {
      const prevPage = currentPage - 1;
      const newOffset = (prevPage - 1) * 25;
      setCurrentPage(prevPage);
      setStationsOffset(newOffset);
      await loadStationsByMode(currentMode, false, newOffset);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const goToNextRadioPage = () => {
    setRadioModeCurrentPage(prev => prev + 1);
  };

  const goToPreviousRadioPage = () => {
    setRadioModeCurrentPage(prev => Math.max(1, prev - 1));
  };

  const handleLoadGenreStations = async (genre: string): Promise<RadioStation[]> => {
    if (genreStationsCache.has(genre)) {
      return genreStationsCache.get(genre)!;
    }

    const genreStations = await radioService.getStationsByGenre(genre, 1000);
    const newCache = new Map(genreStationsCache);
    newCache.set(genre, genreStations);
    setGenreStationsCache(newCache);

    return genreStations;
  };

  const handleLoadLanguageStations = async (language: string): Promise<RadioStation[]> => {
    if (languageStationsCache.has(language)) {
      return languageStationsCache.get(language)!;
    }

    const languageStations = await radioService.getStationsByLanguage(language);
    const validStations = languageStations.filter(s => s.stream_url && !s.stream_url.includes('placeholder'));
    const newCache = new Map(languageStationsCache);
    newCache.set(language, validStations);
    setLanguageStationsCache(newCache);

    return validStations;
  };

  return (
    <>
      <SEO
        title="Gleetune: Explore Live AM, FM & Shortwave Radio from Around the World"
        description="Listen to live AM, FM, and shortwave radio stations worldwide. Realistic coverage, verified streams, and interactive tuning powered by Gleetune."
        keywords="radio, AM radio, FM radio, shortwave radio, global radio, live radio stations, radio tuner, online radio"
        canonicalUrl="https://gleetune.com/"
      />
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-4 sm:py-8 px-3 sm:px-4">
      <div className="max-w-6xl mx-auto">
        {isLoading && (
          <div className="mb-6 sm:mb-8 flex items-center justify-start gap-2 text-amber-400 text-xs">
            <Radio className="w-4 h-4 animate-pulse" />
            <span>Loading stations...</span>
          </div>
        )}

        <VintageRadio
          currentStation={currentStation}
          isPlaying={isPlaying && isPoweredOn}
          isPoweredOn={isPoweredOn}
          volume={volume}
          bass={bass}
          treble={treble}
          currentBand={currentBand}
          tuningFrequency={tuningFrequency}
          frequencyData={frequencyData}
          stations={stations}
          isBuffering={isBuffering}
          streamError={streamError}
          isPlayingStatic={isPlayingStatic}
          userLocation={userLocation}
          currentMode={currentMode}
          availableLanguages={availableLanguages}
          availableGenres={availableGenres}
          selectedLanguage={selectedLanguage}
          selectedGenre={selectedGenre}
          onPowerToggle={handlePowerToggle}
          onPlayPause={togglePlayPause}
          onVolumeChange={setVolume}
          onBassChange={setBass}
          onTrebleChange={setTreble}
          onBandChange={handleBandChange}
          onTuningChange={setTuningFrequency}
          onStationLock={handleStationLock}
          onLocationChange={handleLocationChange}
          onModeChange={handleModeChange}
          onLanguageChange={(language) => {
            setSelectedLanguage(language);
          }}
          onGenreChange={(genre) => {
            setSelectedGenre(genre);
          }}
          onLoadGenreStations={handleLoadGenreStations}
          genreStationsCache={genreStationsCache}
          onLoadLanguageStations={handleLoadLanguageStations}
          languageStationsCache={languageStationsCache}
          totalStationsCount={totalStationsCount}
          hasMoreStations={hasMoreStations}
          isLoadingMore={isLoadingMore}
          onStationSelect={(station) => {
            console.log('🎯 [HOME] onStationSelect called with:', {
              name: station.name,
              id: station.id,
              frequency: station.frequency,
              stream_url: station.stream_url?.substring(0, 50) + '...'
            });
            setHasInteracted(true);
            if (station.frequency) {
              setTuningFrequency(station.frequency);
            }
            playStation(station);
            radioService.addListeningHistory(station.id);
          }}
        />

        {(stations.length > 0 || isLoadingStations) && currentMode !== 'Genre' && currentMode !== 'Search' && (
          <div className="mt-8 sm:mt-12 bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-xl rounded-2xl p-4 sm:p-6 lg:p-8 border border-slate-700/50 shadow-2xl">
            <div className="flex flex-col gap-4 mb-4 sm:mb-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
                <h3 className="text-lg sm:text-xl lg:text-2xl font-semibold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent flex items-center gap-2">
                  {isPoweredOn ? (
                    currentMode === 'Radio' ? `Available Stations on ${currentBand}` :
                    currentMode === 'Region' ? (
                      <>
                        Available Stations in <span className={`fi fi-${userLocation?.country_code?.toLowerCase() || 'us'}`}></span> {userLocation?.country || 'Country'}
                      </>
                    ) :
                    currentMode === 'Language' && selectedLanguage ? `Available Stations in ${selectedLanguage}` :
                    `Available Stations - ${currentMode}`
                  ) : 'Select Stations'}
                </h3>
                {currentMode !== 'Search' && (
                  <div className="px-3 sm:px-4 py-1 sm:py-1.5 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 rounded-full border border-blue-400/30">
                    <span className="text-xs sm:text-sm font-medium text-blue-300 flex items-center gap-2">
                      {isLoadingStations ? (
                        <>
                          <div className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                          Loading...
                        </>
                      ) : isPoweredOn ? (() => {
                        if (currentMode === 'Radio') {
                          const filteredStations = stations.filter(s => s.band_type === currentBand).filter(s => {
                            if (!stationSearchTerm) return true;
                            const search = stationSearchTerm.toLowerCase();
                            return s.name.toLowerCase().includes(search) || s.frequency?.toString().includes(search) || s.city?.toLowerCase().includes(search);
                          });
                          const count = filteredStations.length;
                          return count === 0 ? 'No stations nearby' : `${count} ${getStationText(count)} nearby`;
                        }

                        if (currentMode === 'Region') {
                          const filteredStations = stations.filter(s => {
                            if (!stationSearchTerm) return true;
                            const search = stationSearchTerm.toLowerCase();
                            return s.name.toLowerCase().includes(search) || s.frequency?.toString().includes(search) || s.city?.toLowerCase().includes(search);
                          });
                          const count = filteredStations.length;
                          if (count === 0) return 'No stations';
                          return hasMoreStations ? `Showing ${count}` : `${count} ${getStationText(count)}`;
                        }

                        if (currentMode === 'Language') {
                          const filteredStations = stations.filter(s => {
                            if (!stationSearchTerm) return true;
                            const search = stationSearchTerm.toLowerCase();
                            return s.name.toLowerCase().includes(search) || s.frequency?.toString().includes(search) || s.city?.toLowerCase().includes(search);
                          });
                          const count = filteredStations.length;
                          return count === 0 ? 'No stations' : `${count} ${getStationText(count)}`;
                        }

                        return '0 stations';
                      })() : null}
                    </span>
                  </div>
                )}
              </div>
              {isPoweredOn && currentMode !== 'Search' && (
                <div className="relative">
                  <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search stations by name, frequency, or city..."
                    value={stationSearchTerm}
                    onChange={(e) => {
                      setStationSearchTerm(e.target.value);
                      if (currentMode === 'Radio') {
                        setRadioModeCurrentPage(1);
                      }
                    }}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-900/60 border border-slate-600/50 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                  />
                </div>
              )}
            </div>
            {isPoweredOn && (() => {
              const filteredStations = stations
                .filter(s => currentMode === 'Radio' ? s.band_type === currentBand : true)
                .filter(s => {
                  if (!stationSearchTerm) return true;
                  const search = stationSearchTerm.toLowerCase();
                  return s.name.toLowerCase().includes(search) || s.frequency?.toString().includes(search) || s.city?.toLowerCase().includes(search);
                })
                .sort((a, b) => {
                  const hasStreamA = a.stream_url && !a.stream_url.includes('placeholder');
                  const hasStreamB = b.stream_url && !b.stream_url.includes('placeholder');
                  if (hasStreamA && !hasStreamB) return -1;
                  if (!hasStreamA && hasStreamB) return 1;
                  const freqA = a.frequency || 0;
                  const freqB = b.frequency || 0;
                  return freqA - freqB;
                });

              const startIndex = currentMode === 'Radio' ? (radioModeCurrentPage - 1) * RADIO_STATIONS_PER_PAGE : 0;
              const endIndex = currentMode === 'Radio' ? startIndex + RADIO_STATIONS_PER_PAGE : 1000;
              const paginatedStations = filteredStations.slice(startIndex, endIndex);

              return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
              {paginatedStations.map((station) => {
                  const hasStream = station.stream_url && !station.stream_url.includes('placeholder');
                  const isRestricted = station.band_type === 'SW' && station.license_tier === 'restricted';
                  const isPlayable = hasStream && !isRestricted;
                  console.log(`Station: ${station.name}, stream_url: ${station.stream_url}, hasStream: ${hasStream}, isRestricted: ${isRestricted}, isPlayable: ${isPlayable}`);
                  return (
                  <button
                    key={station.id}
                    onClick={() => {
                      console.log(`Click on ${station.name}, hasStream: ${hasStream}, isRestricted: ${isRestricted}`);

                      if (isRestricted) {
                        console.log('⛔ BLOCKED - Restricted SW station, showing message with website link');
                        if (station.frequency) {
                          setTuningFrequency(station.frequency);
                        }
                        stopPlaying();
                        playStation({
                          ...station,
                          stream_url: undefined
                        });
                        return;
                      }

                      if (!hasStream) {
                        console.log('⛔ BLOCKED - No stream, returning');
                        return;
                      }

                      if (station.frequency) {
                        setTuningFrequency(station.frequency);
                      }
                      playStation(station);
                      radioService.addListeningHistory(station.id);
                    }}
                    disabled={false}
                    className={`group text-left p-4 rounded-xl transition-all duration-300 ${
                      !hasStream
                        ? 'bg-slate-800/40 opacity-50 cursor-not-allowed'
                        : isRestricted
                        ? currentStation?.id === station.id
                          ? 'bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/50 scale-[1.02]'
                          : 'bg-slate-800/60 hover:bg-slate-700/80 text-slate-200 hover:scale-[1.02] hover:shadow-lg border border-orange-500/30'
                        : currentStation?.id === station.id
                        ? 'bg-gradient-to-br from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-500/50 scale-[1.02]'
                        : 'bg-slate-800/60 hover:bg-slate-700/80 text-slate-200 hover:scale-[1.02] hover:shadow-lg'
                    }`}
                  >
                    <div className="flex items-start gap-3 mb-2">
                      {station.logo_url ? (
                        <img
                          src={station.logo_url}
                          alt={`${station.name} logo`}
                          className="w-10 h-10 rounded-lg object-cover flex-shrink-0 bg-slate-900/50"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-gradient-to-br from-slate-700 to-slate-800 flex-shrink-0 text-xs font-bold text-slate-300">
                          {station.name.substring(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm leading-tight truncate">
                          {station.name}
                          {!hasStream && <span className="ml-2 text-[10px] text-orange-400 font-normal">(No Stream)</span>}
                          {isRestricted && <span className="ml-2 text-[10px] text-orange-400 font-normal">(Visit Website)</span>}
                        </div>
                      </div>
                      {currentStation?.id === station.id && (
                        <div className="flex-shrink-0">
                          <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                        </div>
                      )}
                    </div>
                    <div className={`text-xs font-medium flex items-center gap-2 ${
                      currentStation?.id === station.id ? 'text-blue-100' : 'text-slate-400 group-hover:text-slate-300'
                    }`}>
                      <span className="px-2 py-0.5 bg-slate-900/40 rounded-md">
                        {station.frequency ? `${station.frequency} ${currentBand}` : currentBand}
                      </span>
                      <span className="truncate">{station.country}</span>
                    </div>
                  </button>
                );
              })}
            </div>
              );
            })()}
            {isPoweredOn && currentMode === 'Radio' && (() => {
              const filteredStations = stations
                .filter(s => s.band_type === currentBand)
                .filter(s => {
                  if (!stationSearchTerm) return true;
                  const search = stationSearchTerm.toLowerCase();
                  return s.name.toLowerCase().includes(search) || s.frequency?.toString().includes(search) || s.city?.toLowerCase().includes(search);
                });
              const totalPages = Math.ceil(filteredStations.length / RADIO_STATIONS_PER_PAGE);
              return totalPages > 1 ? (
                <div className="mt-6 flex items-center justify-center gap-4">
                  <button
                    onClick={goToPreviousRadioPage}
                    disabled={radioModeCurrentPage <= 1}
                    className="px-4 py-2 bg-gradient-to-br from-slate-700 to-slate-800 hover:from-slate-600 hover:to-slate-700 disabled:from-slate-800 disabled:to-slate-900 text-white font-semibold rounded-lg shadow-lg transition-all duration-300 hover:scale-105 disabled:scale-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <span>«</span>
                    <span>Previous</span>
                  </button>

                  <div className="text-white font-medium px-4 py-2 bg-slate-800/50 rounded-lg">
                    Page {radioModeCurrentPage} of {totalPages}
                  </div>

                  <button
                    onClick={goToNextRadioPage}
                    disabled={radioModeCurrentPage >= totalPages}
                    className="px-4 py-2 bg-gradient-to-br from-slate-700 to-slate-800 hover:from-slate-600 hover:to-slate-700 disabled:from-slate-800 disabled:to-slate-900 text-white font-semibold rounded-lg shadow-lg transition-all duration-300 hover:scale-105 disabled:scale-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <span>Next</span>
                    <span>»</span>
                  </button>
                </div>
              ) : null;
            })()}
            {isPoweredOn && currentMode === 'Region' && totalStationsCount && totalStationsCount > 25 && (
              <div className="mt-6 flex items-center justify-center gap-4">
                <button
                  onClick={goToPreviousPage}
                  disabled={isLoadingMore || currentPage <= 1}
                  className="px-4 py-2 bg-gradient-to-br from-slate-700 to-slate-800 hover:from-slate-600 hover:to-slate-700 disabled:from-slate-800 disabled:to-slate-900 text-white font-semibold rounded-lg shadow-lg transition-all duration-300 hover:scale-105 disabled:scale-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <span>«</span>
                  <span>Previous</span>
                </button>

                <div className="text-white font-medium px-4 py-2 bg-slate-800/50 rounded-lg">
                  Page {currentPage} of {Math.ceil(totalStationsCount / 25)}
                </div>

                <button
                  onClick={goToNextPage}
                  disabled={isLoadingMore || !hasMoreStations}
                  className="px-4 py-2 bg-gradient-to-br from-slate-700 to-slate-800 hover:from-slate-600 hover:to-slate-700 disabled:from-slate-800 disabled:to-slate-900 text-white font-semibold rounded-lg shadow-lg transition-all duration-300 hover:scale-105 disabled:scale-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <span>Next</span>
                  <span>»</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* All Stations Search Mode - DISABLED */}
        {false && isPoweredOn && currentMode === 'Search' && (
          <div className="mt-8 sm:mt-12 bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-xl rounded-2xl p-4 sm:p-6 lg:p-8 border border-slate-700/50 shadow-2xl">
            <div className="flex flex-col gap-4 mb-6">
              <h3 className="text-lg sm:text-xl lg:text-2xl font-semibold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                Search All Stations
              </h3>
              <div>
                <div className="relative">
                  <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by name, language, genre, city, country..."
                    value={allStationsSearch.searchQuery}
                    onChange={(e) => allStationsSearch.setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-900/60 border border-slate-600/50 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                  />
                </div>
                {allStationsSearch.searchQuery.length > 0 && allStationsSearch.searchQuery.length < 3 && (
                  <div className="mt-2 text-xs text-amber-400">
                    Type at least 3 characters to search
                  </div>
                )}
                {allStationsSearch.isSearching && (
                  <div className="mt-2 flex items-center gap-2 text-xs text-blue-400">
                    <div className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                    <span>Searching...</span>
                  </div>
                )}
                {allStationsSearch.isSearchActive && !allStationsSearch.isSearching && (
                  <div className="mt-2 text-xs text-slate-400">
                    Found {allStationsSearch.totalResults} station{allStationsSearch.totalResults !== 1 ? 's' : ''}
                  </div>
                )}
              </div>
            </div>

            {allStationsSearch.isSearchActive && allStationsSearch.results.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                {allStationsSearch.results.map((station) => {
                  const hasStream = station.stream_url && !station.stream_url.includes('placeholder');
                  const isRestricted = station.band_type === 'SW' && station.license_tier === 'restricted';
                  const isPlayable = hasStream && !isRestricted;
                  return (
                    <button
                      key={station.id}
                      onClick={() => {
                        if (isRestricted) {
                          if (station.frequency) {
                            setTuningFrequency(station.frequency);
                          }
                          stopPlaying();
                          playStation({
                            ...station,
                            stream_url: undefined
                          });
                          return;
                        }

                        if (!hasStream) {
                          return;
                        }

                        if (station.frequency) {
                          setTuningFrequency(station.frequency);
                        }
                        playStation(station);
                        radioService.addListeningHistory(station.id);
                      }}
                      disabled={false}
                      className={`group text-left p-4 rounded-xl transition-all duration-300 ${
                        !hasStream
                          ? 'bg-slate-800/40 opacity-50 cursor-not-allowed'
                          : isRestricted
                          ? currentStation?.id === station.id
                            ? 'bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/50 scale-[1.02]'
                            : 'bg-slate-800/60 hover:bg-slate-700/80 text-slate-200 hover:scale-[1.02] hover:shadow-lg border border-orange-500/30'
                          : currentStation?.id === station.id
                          ? 'bg-gradient-to-br from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-500/50 scale-[1.02]'
                          : 'bg-slate-800/60 hover:bg-slate-700/80 text-slate-200 hover:scale-[1.02] hover:shadow-lg'
                      }`}
                    >
                      <div className="flex items-start gap-3 mb-2">
                        {station.logo_url ? (
                          <img
                            src={station.logo_url}
                            alt={`${station.name} logo`}
                            className="w-10 h-10 rounded-lg object-cover flex-shrink-0 bg-slate-900/50"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-gradient-to-br from-slate-700 to-slate-800 flex-shrink-0 text-xs font-bold text-slate-300">
                            {station.name.substring(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm leading-tight truncate">
                            {station.name}
                            {!hasStream && <span className="ml-2 text-[10px] text-orange-400 font-normal">(No Stream)</span>}
                            {isRestricted && <span className="ml-2 text-[10px] text-orange-400 font-normal">(Visit Website)</span>}
                          </div>
                        </div>
                        {currentStation?.id === station.id && (
                          <div className="flex-shrink-0">
                            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                          </div>
                        )}
                      </div>
                      <div className={`text-xs font-medium flex items-center gap-2 flex-wrap ${
                        currentStation?.id === station.id ? 'text-blue-100' : 'text-slate-400 group-hover:text-slate-300'
                      }`}>
                        <span className="px-2 py-0.5 bg-slate-900/40 rounded-md">
                          {station.band_type}
                        </span>
                        {station.city && (
                          <span className="truncate">{station.city}</span>
                        )}
                        <span className="truncate">{station.country}</span>
                        {station.language && (
                          <span className="px-2 py-0.5 bg-blue-500/20 rounded-md text-blue-300">
                            {station.language}
                          </span>
                        )}
                        {station.genre_category && (
                          <span className="px-2 py-0.5 bg-purple-500/20 rounded-md text-purple-300">
                            {station.genre_category}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {allStationsSearch.isSearchActive && allStationsSearch.results.length === 0 && !allStationsSearch.isSearching && (
              <div className="text-center py-12 text-slate-400">
                <Search size={48} className="mx-auto mb-4 opacity-50" />
                <p className="text-lg">No stations found</p>
                <p className="text-sm mt-2">Try different search terms</p>
              </div>
            )}

            {!allStationsSearch.isSearchActive && (
              <div className="text-center py-12 text-slate-400">
                <Search size={48} className="mx-auto mb-4 opacity-50" />
                <p className="text-lg">Search thousands of stations</p>
                <p className="text-sm mt-2">Type at least 3 characters to begin</p>
              </div>
            )}
          </div>
        )}

        <div className="mt-6 sm:mt-8 text-center text-amber-600 text-xs sm:text-sm px-4">
          <p>Tune the dial to discover stations</p>
        </div>
      </div>
      </div>
    </>
  );
}
