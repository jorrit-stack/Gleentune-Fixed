import { useState, useEffect, useRef } from 'react';
import { Radio, ChevronDown, ChevronRight, Search } from 'lucide-react';
import { RadioStation, BandType, ModeType } from '../types/radio';
import { radioService } from '../services/radioService';

interface StationDropdownProps {
  stations: RadioStation[];
  currentStation: RadioStation | null;
  currentBand: BandType;
  currentMode: ModeType;
  isPoweredOn: boolean;
  availableLanguages?: string[];
  availableGenres?: string[];
  selectedLanguage?: string;
  selectedGenre?: string;
  onStationSelect: (station: RadioStation) => void;
  onLanguageSelect?: (language: string) => void;
  onGenreSelect?: (genre: string) => void;
  onLoadGenreStations?: (genre: string) => Promise<RadioStation[]>;
  genreStationsCache?: Map<string, RadioStation[]>;
  onLoadLanguageStations?: (language: string) => Promise<RadioStation[]>;
  languageStationsCache?: Map<string, RadioStation[]>;
  totalStationsCount?: number | null;
  hasMoreStations?: boolean;
  isLoadingMore?: boolean;
  userLocation?: { city: string; country: string; country_code?: string } | null;
}

export function StationDropdown({ stations, currentStation, currentBand, currentMode, isPoweredOn, availableLanguages = [], availableGenres = [], selectedLanguage = '', selectedGenre = '', onStationSelect, onLanguageSelect, onGenreSelect, onLoadGenreStations, genreStationsCache = new Map(), onLoadLanguageStations, languageStationsCache = new Map(), totalStationsCount = null, hasMoreStations = false, isLoadingMore = false, userLocation = null }: StationDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedGenres, setExpandedGenres] = useState<Set<string>>(new Set());
  const [loadingGenres, setLoadingGenres] = useState<Set<string>>(new Set());
  const [expandedLanguages, setExpandedLanguages] = useState<Set<string>>(new Set());
  const [loadingLanguages, setLoadingLanguages] = useState<Set<string>>(new Set());
  const [languageCounts, setLanguageCounts] = useState<Map<string, number>>(new Map());
  const [genreCounts, setGenreCounts] = useState<Map<string, number>>(new Map());
  const [dbSearchResults, setDbSearchResults] = useState<RadioStation[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();

  const isLanguageMode = currentMode === 'Language';
  const isGenreMode = currentMode === 'Genre';

  // Clear search term and close dropdown when mode changes
  useEffect(() => {
    setSearchTerm('');
    setDbSearchResults([]);
    setIsSearching(false);
    setIsOpen(false);
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
  }, [currentMode]);

  const filteredLanguages = availableLanguages.filter(lang => {
    if (!searchTerm) return true;
    return lang.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const filteredGenres = availableGenres.filter(genre => {
    if (!searchTerm) return true;
    return genre.toLowerCase().includes(searchTerm.toLowerCase());
  });

  // Handle direct DB search for All mode and Region mode
  useEffect(() => {
    const shouldSearch =
      (currentMode === 'All' && searchTerm.length >= 3) ||
      (currentMode === 'Region' && searchTerm.length >= 2);

    if (shouldSearch) {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

      setIsSearching(true);
      searchTimeoutRef.current = setTimeout(async () => {
        try {
          // For Region mode, filter by country code
          const countryCode = currentMode === 'Region' ? userLocation?.country_code : undefined;
          const results = await radioService.searchStations(searchTerm, countryCode, 50);
          setDbSearchResults(results);
        } catch (error) {
          console.error('[StationDropdown] Search error:', error);
          setDbSearchResults([]);
        } finally {
          setIsSearching(false);
        }
      }, 300);
    } else {
      setDbSearchResults([]);
      setIsSearching(false);
    }

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [searchTerm, currentMode, userLocation?.country_code]);

  // Use DB search results for All mode (3+ chars) or Region mode (2+ chars)
  const useSearchResults =
    (currentMode === 'All' && searchTerm.length >= 3) ||
    (currentMode === 'Region' && searchTerm.length >= 2);

  const filteredStations = useSearchResults
    ? dbSearchResults
    : stations
      .filter(s => {
        // In Radio mode, filter by current band
        if (currentMode === 'Radio') return s.band_type === currentBand;
        // In Genre and Language modes, show all stations
        if (currentMode === 'Genre' || currentMode === 'Language') return true;
        // For other modes, show all
        return true;
      })
      .filter(s => {
        if (!searchTerm) return true;
        const search = searchTerm.toLowerCase();
        const matchesName = s.name.toLowerCase().includes(search);
        const matchesFrequency = s.frequency?.toString().includes(search);
        const matchesCountry = s.country?.toLowerCase().includes(search);
        const matchesState = s.state?.toLowerCase().includes(search);
        return matchesName || matchesFrequency || matchesCountry || matchesState;
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

  // Keep bandStations for backwards compatibility with existing code
  const bandStations = filteredStations;

  // Helper function to generate badge text based on mode
  const getBadgeText = () => {
    if (!isPoweredOn) return '0 total';

    const count = bandStations.length;

    // All mode: only show when searching
    if (currentMode === 'All') {
      if (!searchTerm || searchTerm.length < 3) return '';
      if (isSearching) return 'Searching...';
      if (count === 0) return 'No matches';
      return count === 1 ? '1 match' : `${count} matches`;
    }

    // Radio mode: "X stations nearby"
    if (currentMode === 'Radio') {
      if (count === 0) return 'No stations nearby';
      return count === 1 ? '1 station nearby' : `${count} stations nearby`;
    }

    // Region mode: "X stations" or "Showing X of Y" or "X matches in Country"
    if (currentMode === 'Region') {
      // When searching
      if (searchTerm && searchTerm.length >= 2) {
        if (isSearching) return 'Searching...';
        if (count === 0) return `No matches in ${userLocation?.country || 'region'}`;
        const matchText = count === 1 ? '1 match' : `${count} matches`;
        return `${matchText} in ${userLocation?.country || 'region'}`;
      }
      // When not searching
      if (count === 0) return 'No stations';
      // Show "Showing X of Y" if we have total count and it's greater than current count
      if (totalStationsCount && totalStationsCount > count) {
        return `Showing ${count} of ${totalStationsCount}`;
      }
      // Otherwise just show count
      return count === 1 ? '1 station' : `${count} stations`;
    }

    // Default fallback for Language/Genre modes
    if (count === 0) return 'No stations';
    return count === 1 ? '1 station' : `${count} stations`;
  };

  // Debug logging for Genre mode
  if (currentMode === 'Genre') {
    console.log('[StationDropdown] Total stations received:', stations.length);
    console.log('[StationDropdown] After band filtering:', filteredStations.length);
    console.log('[StationDropdown] Available genres:', availableGenres);
    console.log('[StationDropdown] Sample of first 3 stations:', filteredStations.slice(0, 3).map(s => ({
      name: s.name,
      genre_category: s.genre_category,
      band_type: s.band_type
    })));
  }

  const formatFrequency = (station: RadioStation) => {
    if (!station.frequency) return '';
    if (station.band_type === 'FM') {
      return `${station.frequency.toFixed(1)} MHz`;
    } else if (station.band_type === 'AM') {
      return `${Math.round(station.frequency)} kHz`;
    } else {
      return `${Math.round(station.frequency)} kHz`;
    }
  };

  return (
    <div className="relative w-full">
      <button
        onClick={() => isPoweredOn && setIsOpen(!isOpen)}
        disabled={!isPoweredOn}
        className="w-full px-4 py-3 bg-gradient-to-b from-emerald-400 to-emerald-500 border-2 border-emerald-900 rounded-lg flex items-center justify-between hover:from-emerald-500 hover:to-emerald-600 transition-all disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:from-emerald-400 disabled:hover:to-emerald-500"
        style={{
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3), inset 0 1px 2px rgba(255, 255, 255, 0.3)'
        }}
      >
        <div className="flex items-center gap-2">
          <Radio size={18} className="text-emerald-950" />
          <div className="text-left">
            {isLanguageMode ? (
              <div className="text-sm font-bold text-emerald-950">
                Browse by Language ({availableLanguages.length} languages)
              </div>
            ) : isGenreMode ? (
              <div className="text-sm font-bold text-emerald-950">
                {selectedGenre ? `${selectedGenre} (${bandStations.length} stations)` : `Browse by Genre (${availableGenres.length} genres)`}
              </div>
            ) : currentStation ? (
              <>
                <div className="text-sm font-bold text-emerald-950">
                  {formatFrequency(currentStation)}
                </div>
                <div className="text-xs text-emerald-900 truncate max-w-[120px] sm:max-w-xs">
                  {currentStation.name}
                </div>
              </>
            ) : (
              <div className="text-sm font-bold text-emerald-950">
                {getBadgeText() ? `Select Station (${getBadgeText()})` : 'Select Station'}
              </div>
            )}
          </div>
        </div>
        <ChevronDown
          size={20}
          className={`text-emerald-950 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          ></div>
          <div
            className="absolute top-full left-0 right-0 mt-2 max-h-96 bg-emerald-50 border-2 border-emerald-900 rounded-lg z-50 overflow-hidden"
            style={{
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)'
            }}
          >
            <div className="sticky top-0 bg-emerald-100 border-b-2 border-emerald-900 p-3">
              <div className="relative">
                <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-emerald-700" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={
                    isLanguageMode ? "Search languages..." :
                    isGenreMode ? "Search genres..." :
                    currentMode === 'Region' ? `Search stations in ${userLocation?.country || 'region'}...` :
                    "Search by name, frequency, or location..."
                  }
                  className="w-full pl-10 pr-4 py-2 bg-white border-2 border-emerald-700 rounded-lg text-sm text-emerald-950 placeholder-emerald-600 focus:outline-none focus:border-emerald-800 focus:ring-2 focus:ring-emerald-300"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {isSearching && (currentMode === 'All' || currentMode === 'Region') ? (
                <div className="px-4 py-8 text-center text-emerald-700">
                  <div className="text-sm">Searching {currentMode === 'Region' ? userLocation?.country || 'region' : 'database'}...</div>
                </div>
              ) : isLanguageMode ? (
                <>
                  {filteredLanguages.length === 0 ? (
                    <div className="px-4 py-8 text-center text-emerald-700">
                      {searchTerm ? `No languages found matching "${searchTerm}"` : 'No languages available'}
                    </div>
                  ) : (
                    filteredLanguages.map((language) => {
                      const isExpanded = expandedLanguages.has(language);
                      const isLoading = loadingLanguages.has(language);
                      const languageStations = languageStationsCache.get(language) || [];

                      return (
                        <div key={language} className="border-b border-emerald-200 last:border-b-0">
                          <button
                            onClick={async () => {
                              const newExpanded = new Set(expandedLanguages);
                              if (isExpanded) {
                                newExpanded.delete(language);
                              } else {
                                newExpanded.add(language);
                                if (!languageStationsCache.has(language) && onLoadLanguageStations) {
                                  setLoadingLanguages(new Set(loadingLanguages).add(language));
                                  try {
                                    const loadedStations = await onLoadLanguageStations(language);
                                    // Cache the count after loading
                                    setLanguageCounts(prev => new Map(prev).set(language, loadedStations.length));
                                  } finally {
                                    const newLoading = new Set(loadingLanguages);
                                    newLoading.delete(language);
                                    setLoadingLanguages(newLoading);
                                  }
                                }
                              }
                              setExpandedLanguages(newExpanded);
                            }}
                            className="w-full px-4 py-3 text-left transition-colors hover:bg-emerald-100 flex items-center justify-between"
                          >
                            <div className="flex items-center gap-2">
                              <ChevronRight
                                size={16}
                                className={`text-emerald-700 transition-transform ${
                                  isExpanded ? 'rotate-90' : ''
                                }`}
                              />
                              <div className="text-sm font-bold text-emerald-950">
                                {language}
                              </div>
                            </div>
                            <div className="text-xs text-emerald-700 font-medium">
                              {isLoading ? 'Loading...' :
                               languageCounts.has(language) ? `${languageCounts.get(language)} stations` :
                               languageStations.length > 0 ? `${languageStations.length} stations` :
                               '...'}
                            </div>
                          </button>

                          {isExpanded && (
                            <div className="bg-emerald-50/50">
                              {isLoading ? (
                                <div className="px-8 py-4 text-center text-emerald-700 text-xs">
                                  Loading stations...
                                </div>
                              ) : languageStations.length === 0 ? (
                                <div className="px-8 py-4 text-center text-emerald-700 text-xs">
                                  No stations available for {language}
                                </div>
                              ) : (
                                languageStations.map((station) => {
                                  const hasStream = station.stream_url && !station.stream_url.includes('placeholder');
                                  return (
                                    <button
                                      key={station.id}
                                      onClick={() => {
                                        if (hasStream) {
                                          onStationSelect(station);
                                          setIsOpen(false);
                                        }
                                      }}
                                      disabled={!hasStream}
                                      className={`w-full px-8 py-2 text-left transition-colors border-t border-emerald-200/50 first:border-t-0 ${
                                        !hasStream
                                          ? 'cursor-not-allowed opacity-60'
                                          : `hover:bg-emerald-100 ${currentStation?.id === station.id ? 'bg-emerald-200 font-bold' : ''}`
                                      }`}
                                    >
                                      <div className="flex items-center justify-between gap-2">
                                        <div className="flex-1 min-w-0">
                                          <div className="text-sm font-bold text-emerald-950 truncate">
                                            {station.name}
                                            {!hasStream && <span className="ml-2 text-[10px] text-orange-700 font-normal">(No Stream Available)</span>}
                                          </div>
                                          <div className="text-xs text-emerald-700 truncate">
                                            {station.country} {station.state ? `• ${station.state}` : ''}
                                          </div>
                                        </div>
                                        <div className="text-xs font-mono font-bold text-emerald-900 whitespace-nowrap flex-shrink-0">
                                          {formatFrequency(station)}
                                        </div>
                                      </div>
                                    </button>
                                  );
                                })
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </>
              ) : isGenreMode ? (
                <>
                  {filteredGenres.length === 0 ? (
                    <div className="px-4 py-8 text-center text-emerald-700">
                      {searchTerm ? `No genres found matching "${searchTerm}"` : 'No genres available'}
                    </div>
                  ) : (
                    filteredGenres.map((genre) => {
                      const isExpanded = expandedGenres.has(genre);
                      const isLoading = loadingGenres.has(genre);
                      const genreStations = genreStationsCache.get(genre) || [];

                      return (
                        <div key={genre} className="border-b border-emerald-200 last:border-b-0">
                          <button
                            onClick={async () => {
                              const newExpanded = new Set(expandedGenres);
                              if (isExpanded) {
                                newExpanded.delete(genre);
                              } else {
                                newExpanded.add(genre);
                                if (!genreStationsCache.has(genre) && onLoadGenreStations) {
                                  setLoadingGenres(new Set(loadingGenres).add(genre));
                                  try {
                                    const loadedStations = await onLoadGenreStations(genre);
                                    // Cache the count after loading
                                    setGenreCounts(prev => new Map(prev).set(genre, loadedStations.length));
                                  } finally {
                                    const newLoading = new Set(loadingGenres);
                                    newLoading.delete(genre);
                                    setLoadingGenres(newLoading);
                                  }
                                }
                              }
                              setExpandedGenres(newExpanded);
                            }}
                            className="w-full px-4 py-3 text-left transition-colors hover:bg-emerald-100 flex items-center justify-between"
                          >
                            <div className="flex items-center gap-2">
                              <ChevronRight
                                size={16}
                                className={`text-emerald-700 transition-transform ${
                                  isExpanded ? 'rotate-90' : ''
                                }`}
                              />
                              <div className="text-sm font-bold text-emerald-950">
                                {genre}
                              </div>
                            </div>
                            <div className="text-xs text-emerald-700 font-medium">
                              {isLoading ? 'Loading...' :
                               genreCounts.has(genre) ? `${genreCounts.get(genre)} stations` :
                               genreStations.length > 0 ? `${genreStations.length} stations` :
                               '...'}
                            </div>
                          </button>

                          {isExpanded && (
                            <div className="bg-emerald-50/50">
                              {isLoading ? (
                                <div className="px-8 py-4 text-center text-emerald-700 text-xs">
                                  Loading stations...
                                </div>
                              ) : genreStations.length === 0 ? (
                                <div className="px-8 py-4 text-center text-emerald-700 text-xs">
                                  No stations available for {genre}
                                </div>
                              ) : (
                                genreStations.map((station) => {
                                  const hasStream = station.stream_url && !station.stream_url.includes('placeholder');
                                  return (
                                    <button
                                      key={station.id}
                                      onClick={() => {
                                        if (hasStream) {
                                          onStationSelect(station);
                                          setIsOpen(false);
                                        }
                                      }}
                                      disabled={!hasStream}
                                      className={`w-full px-8 py-2 text-left transition-colors border-t border-emerald-200/50 first:border-t-0 ${
                                        !hasStream
                                          ? 'cursor-not-allowed opacity-60'
                                          : `hover:bg-emerald-100 ${currentStation?.id === station.id ? 'bg-emerald-200 font-bold' : ''}`
                                      }`}
                                    >
                                      <div className="flex items-center justify-between gap-2">
                                        <div className="flex-1 min-w-0">
                                          <div className="text-sm font-bold text-emerald-950 truncate">
                                            {station.name}
                                            {!hasStream && <span className="ml-2 text-[10px] text-orange-700 font-normal">(No Stream Available)</span>}
                                          </div>
                                          <div className="text-xs text-emerald-700 truncate">
                                            {station.country} {station.state ? `• ${station.state}` : ''}
                                          </div>
                                        </div>
                                        <div className="text-xs font-mono font-bold text-emerald-900 whitespace-nowrap flex-shrink-0">
                                          {formatFrequency(station)}
                                        </div>
                                      </div>
                                    </button>
                                  );
                                })
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </>
              ) : bandStations.length === 0 ? (
                <div className="px-4 py-8 text-center text-emerald-700">
                  {searchTerm ? (
                    currentMode === 'All' && searchTerm.length < 3 ? (
                      <div className="text-sm">Type at least 3 characters to search...</div>
                    ) : (
                      `No stations found matching "${searchTerm}"`
                    )
                  ) : (
                    `No stations available${isLanguageMode && selectedLanguage ? ` for ${selectedLanguage}` : ` for ${currentBand} band`}`
                  )}
                </div>
              ) : (
                bandStations.map((station) => {
                const isEmptyMessage = station.id?.startsWith('no-');
                const hasStream = station.stream_url && !station.stream_url.includes('placeholder');
                return (
                  <button
                    key={station.id}
                    onClick={() => {
                      if (!isEmptyMessage && hasStream) {
                        onStationSelect(station);
                        setIsOpen(false);
                      }
                    }}
                    disabled={isEmptyMessage || !hasStream}
                    className={`w-full px-4 py-2 text-left transition-colors border-b border-emerald-200 last:border-b-0 ${
                      isEmptyMessage || !hasStream
                        ? 'cursor-not-allowed opacity-60'
                        : `hover:bg-emerald-100 ${currentStation?.id === station.id ? 'bg-emerald-200 font-bold' : ''}`
                    }`}
                  >
                    {isEmptyMessage ? (
                      <div className="py-4 text-center">
                        <div className="text-sm font-bold text-emerald-900 mb-2">
                          {station.name}
                        </div>
                        <div className="text-xs text-emerald-700">
                          {station.band_type === 'AM'
                            ? 'AM/MW stations are rarely available online. Most traditional AM broadcasters do not stream on the internet.'
                            : 'No stations found in your listening area for this shortwave band at this time.'}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-bold text-emerald-950 truncate">
                            {station.name}
                            {!hasStream && <span className="ml-2 text-[10px] text-orange-700 font-normal">(No Stream Available)</span>}
                          </div>
                          <div className="text-xs text-emerald-700 truncate">
                            {station.country} {station.state ? `• ${station.state}` : ''}
                          </div>
                        </div>
                        <div className="text-xs sm:text-sm font-mono font-bold text-emerald-900 whitespace-nowrap flex-shrink-0">
                          {formatFrequency(station)}
                        </div>
                      </div>
                    )}
                  </button>
                );
              })
            )}

            </div>
          </div>
        </>
      )}
    </div>
  );
}
