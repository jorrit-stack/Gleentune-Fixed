import { useState, useEffect, useRef } from 'react';
import { MapPin, Search, X, Loader2 } from 'lucide-react';

interface LocationSearchProps {
  currentCity?: string;
  currentCountry: string;
  currentCountryCode?: string;
  onLocationChange: (countryCode: string, city: string, latitude: number, longitude: number) => void;
  isOpen?: boolean;
  onToggle?: (isOpen: boolean) => void;
  hideButton?: boolean;
  searchMode?: 'city' | 'country';
}

interface GeocodingResult {
  name: string;
  country: string;
  country_code: string;
  lat: number;
  lon: number;
  display_name: string;
}

export function LocationSearch({ currentCity, currentCountry, currentCountryCode, onLocationChange, isOpen: externalIsOpen, onToggle, hideButton = false, searchMode = 'city' }: LocationSearchProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen;
  const setIsOpen = (value: boolean) => {
    if (onToggle) {
      onToggle(value);
    } else {
      setInternalIsOpen(value);
    }
  };
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GeocodingResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const searchCities = async () => {
      if (searchQuery.length < 3) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&limit=10&addressdetails=1`
        );
        const data = await response.json();

        const results: GeocodingResult[] = data
          .filter((item: any) => {
            if (searchMode === 'country') {
              return item.addresstype === 'country' || (item.type === 'administrative' && item.class === 'boundary');
            } else {
              return item.address?.city || item.address?.town || item.address?.village;
            }
          })
          .map((item: any) => ({
            name: searchMode === 'country'
              ? item.address?.country || item.display_name.split(',')[0]
              : (item.address?.city || item.address?.town || item.address?.village),
            country: item.address?.country || '',
            country_code: item.address?.country_code?.toUpperCase() || '',
            lat: parseFloat(item.lat),
            lon: parseFloat(item.lon),
            display_name: item.display_name
          }));

        setSearchResults(results);
      } catch (error) {
        console.error('Failed to search cities:', error);
        setSearchResults([]);
      }
      setIsSearching(false);
    };

    const debounceTimer = setTimeout(searchCities, 500);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

  const handleCitySelect = (result: GeocodingResult) => {
    onLocationChange(result.country_code, result.name, result.lat, result.lon);
    setIsOpen(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  const displayLocation = currentCity ? `${currentCity}, ${currentCountry}` : currentCountry;

  return (
    <div className="relative w-full">
      {!hideButton && (
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="relative w-full h-12 sm:h-14 rounded-xl font-bold transition-all flex items-center justify-center bg-gradient-to-b from-orange-600 via-orange-700 to-orange-800 text-amber-100 hover:from-orange-500 hover:via-orange-600 hover:to-orange-700 border-2 border-orange-500"
          style={{
            boxShadow: '0 6px 12px rgba(0, 0, 0, 0.6), inset 0 2px 4px rgba(255, 255, 255, 0.1), inset 0 -2px 4px rgba(0, 0, 0, 0.3)'
          }}
        >
          <MapPin className="absolute left-3 sm:left-4 flex-shrink-0 text-blue-300" size={16} />
          {currentCountryCode && (
            <span className={`fi fi-${currentCountryCode.toLowerCase()} absolute left-10 sm:left-12 text-lg`}></span>
          )}
          <span className="truncate text-xs sm:text-sm pl-16 sm:pl-20 pr-6 text-blue-100">{displayLocation}</span>
          <Search
            className="absolute top-2 right-2 sm:top-2.5 sm:right-2.5 flex-shrink-0 opacity-75"
            size={14}
          />
        </button>
      )}

      {isOpen && (
        <div className="absolute top-full mt-2 left-0 sm:left-auto sm:right-0 bg-gradient-to-br from-cyan-50 to-blue-100 border-2 border-cyan-400 rounded-xl shadow-2xl z-50 w-[calc(100vw-2rem)] sm:w-80 max-w-[320px]">
          <div className="p-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-cyan-900 font-bold text-sm">Search Any City</h3>
              <button
                onClick={() => {
                  setIsOpen(false);
                  setSearchQuery('');
                  setSearchResults([]);
                }}
                className="text-cyan-700 hover:text-cyan-900 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="relative mb-2">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-cyan-600" size={14} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={searchMode === 'country' ? 'Type country name...' : 'Type city name...'}
                className="w-full bg-white text-cyan-900 pl-8 pr-3 py-1.5 rounded-lg border-2 border-cyan-400 focus:border-blue-500 outline-none text-xs placeholder-cyan-500"
                autoFocus
              />
            </div>

            <div className="max-h-48 overflow-y-auto space-y-1">
              {isSearching && (
                <div className="flex items-center justify-center py-4 text-cyan-700">
                  <Loader2 className="animate-spin mr-2" size={16} />
                  <span className="text-xs">Searching...</span>
                </div>
              )}

              {!isSearching && searchQuery.length > 0 && searchQuery.length < 3 && (
                <div className="text-cyan-700 text-xs text-center py-3">
                  Type at least 3 characters to search
                </div>
              )}

              {!isSearching && searchQuery.length >= 3 && searchResults.length === 0 && (
                <div className="text-cyan-700 text-xs text-center py-3">
                  No cities found
                </div>
              )}

              {!isSearching && searchResults.map((result, index) => (
                <button
                  key={index}
                  onClick={() => handleCitySelect(result)}
                  className="w-full text-left px-2.5 py-2 bg-white hover:bg-cyan-50 text-cyan-900 rounded border border-cyan-300 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className={`fi fi-${result.country_code.toLowerCase()} text-base`}></span>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-xs">{result.name}</div>
                      <div className="text-[10px] text-cyan-700 truncate">
                        {result.display_name}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
