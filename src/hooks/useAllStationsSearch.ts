import { useState, useEffect, useRef, useCallback } from 'react';
import { RadioStation } from '../types/radio';

interface UseAllStationsSearchProps {
  searchFunction: (query: string, limit: number) => Promise<RadioStation[]>;
  minCharacters?: number;
  debounceMs?: number;
  maxResults?: number;
}

interface SearchResults {
  results: RadioStation[];
  isSearching: boolean;
  totalResults: number;
}

export function useAllStationsSearch({
  searchFunction,
  minCharacters = 3,
  debounceMs = 300,
  maxResults = 25
}: UseAllStationsSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResults>({
    results: [],
    isSearching: false,
    totalResults: 0
  });

  const debounceTimerRef = useRef<NodeJS.Timeout>();
  const abortControllerRef = useRef<AbortController>();

  // Perform database search
  const performSearch = useCallback(async (query: string) => {
    if (!query || query.length < minCharacters) {
      setSearchResults({
        results: [],
        isSearching: false,
        totalResults: 0
      });
      return;
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    setSearchResults(prev => ({ ...prev, isSearching: true }));

    try {
      abortControllerRef.current = new AbortController();
      const results = await searchFunction(query, maxResults);

      setSearchResults({
        results,
        isSearching: false,
        totalResults: results.length
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }
      console.error('Search error:', error);
      setSearchResults({
        results: [],
        isSearching: false,
        totalResults: 0
      });
    }
  }, [searchFunction, minCharacters, maxResults]);

  // Handle search query changes with debounce
  useEffect(() => {
    // Clear previous debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // If query is too short, clear results immediately
    if (searchQuery.length < minCharacters) {
      setSearchResults({
        results: [],
        isSearching: false,
        totalResults: 0
      });
      return;
    }

    // Show searching indicator immediately
    setSearchResults(prev => ({ ...prev, isSearching: true }));

    // Debounced search
    debounceTimerRef.current = setTimeout(() => {
      performSearch(searchQuery);
    }, debounceMs);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchQuery, performSearch, minCharacters, debounceMs]);

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
      results: [],
      isSearching: false,
      totalResults: 0
    });
  }, []);

  return {
    searchQuery,
    setSearchQuery,
    results: searchResults.results,
    isSearching: searchResults.isSearching,
    totalResults: searchResults.totalResults,
    clearSearch,
    isSearchActive: searchQuery.length >= minCharacters
  };
}
