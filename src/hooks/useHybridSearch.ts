import { useState, useEffect, useRef, useCallback } from 'react';
import { RadioStation } from '../types/radio';

interface UseHybridSearchProps {
  loadedStations: RadioStation[];
  searchFunction: (query: string, limit: number) => Promise<RadioStation[]>;
  minCharacters?: number;
  debounceMs?: number;
  maxResults?: number;
}

interface SearchResults {
  localResults: RadioStation[];
  remoteResults: RadioStation[];
  isSearching: boolean;
  hasRemoteResults: boolean;
  totalLocal: number;
  totalRemote: number;
}

export function useHybridSearch({
  loadedStations,
  searchFunction,
  minCharacters = 3,
  debounceMs = 500,
  maxResults = 200
}: UseHybridSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResults>({
    localResults: [],
    remoteResults: [],
    isSearching: false,
    hasRemoteResults: false,
    totalLocal: 0,
    totalRemote: 0
  });

  const debounceTimerRef = useRef<NodeJS.Timeout>();
  const abortControllerRef = useRef<AbortController>();

  // Client-side search (instant, no debounce)
  const searchLocal = useCallback((query: string): RadioStation[] => {
    if (!query || query.length < minCharacters) {
      return [];
    }

    const lowerQuery = query.toLowerCase();
    return loadedStations.filter(station =>
      station.name.toLowerCase().includes(lowerQuery) ||
      station.city?.toLowerCase().includes(lowerQuery) ||
      station.country.toLowerCase().includes(lowerQuery) ||
      station.frequency?.toString().includes(query)
    ).slice(0, maxResults);
  }, [loadedStations, minCharacters, maxResults]);

  // Server-side search (debounced)
  const searchRemote = useCallback(async (query: string) => {
    if (!query || query.length < minCharacters) {
      return [];
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    try {
      abortControllerRef.current = new AbortController();
      const results = await searchFunction(query, maxResults);

      // Filter out stations already in local results
      const localIds = new Set(searchResults.localResults.map(s => s.id));
      return results.filter(s => !localIds.has(s.id));
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return [];
      }
      console.error('Remote search error:', error);
      return [];
    }
  }, [searchFunction, minCharacters, maxResults, searchResults.localResults]);

  // Handle search query changes
  useEffect(() => {
    // Clear previous debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Instant local search
    const localResults = searchLocal(searchQuery);

    setSearchResults(prev => ({
      ...prev,
      localResults,
      totalLocal: localResults.length,
      isSearching: searchQuery.length >= minCharacters
    }));

    // If query is too short, don't search remote
    if (searchQuery.length < minCharacters) {
      setSearchResults(prev => ({
        ...prev,
        remoteResults: [],
        hasRemoteResults: false,
        totalRemote: 0,
        isSearching: false
      }));
      return;
    }

    // Debounced remote search
    debounceTimerRef.current = setTimeout(async () => {
      const remoteResults = await searchRemote(searchQuery);

      setSearchResults(prev => ({
        ...prev,
        remoteResults,
        hasRemoteResults: remoteResults.length > 0,
        totalRemote: remoteResults.length,
        isSearching: false
      }));
    }, debounceMs);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchQuery, searchLocal, searchRemote, minCharacters, debounceMs]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setSearchResults({
      localResults: [],
      remoteResults: [],
      isSearching: false,
      hasRemoteResults: false,
      totalLocal: 0,
      totalRemote: 0
    });
  }, []);

  const allResults = [...searchResults.localResults, ...searchResults.remoteResults];

  return {
    searchQuery,
    setSearchQuery,
    searchResults,
    allResults,
    clearSearch,
    isSearchActive: searchQuery.length >= minCharacters
  };
}
