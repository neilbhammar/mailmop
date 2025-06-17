'use client'

import { useState, useEffect, useCallback } from 'react';
import { logger } from '@/lib/utils/logger';

// localStorage key for view state persistence
const VIEW_STATE_KEY = 'mailmop-view-state';

// Type definition for view state
interface ViewState {
  showUnreadOnly: boolean;
  showHasUnsubscribe: boolean;
  groupByDomain: boolean;
  // Future extensibility for additional filters
  searchTerm?: string;
  sortField?: string;
  sortDirection?: 'asc' | 'desc';
}

// Default view state
const DEFAULT_VIEW_STATE: ViewState = {
  showUnreadOnly: false,
  showHasUnsubscribe: false,
  groupByDomain: false,
};

// Valid view mode values for validation
const VALID_BOOLEAN_KEYS = ['showUnreadOnly', 'showHasUnsubscribe', 'groupByDomain'];

/**
 * Custom hook for managing view state with localStorage persistence
 * 
 * Features:
 * - Automatically saves view state changes to localStorage
 * - Restores view state on component mount
 * - Handles localStorage unavailability gracefully
 * - Validates stored values before applying them
 * - Provides error handling and fallbacks
 * 
 * Usage:
 * ```
 * const { 
 *   showUnreadOnly, 
 *   showHasUnsubscribe, 
 *   setShowUnreadOnly, 
 *   setShowHasUnsubscribe 
 * } = useViewState();
 * ```
 */
export function useViewState() {
  const [viewState, setViewState] = useState<ViewState>(DEFAULT_VIEW_STATE);
  const [isLoaded, setIsLoaded] = useState(false);

  // Helper function to check if localStorage is available
  const isLocalStorageAvailable = useCallback((): boolean => {
    try {
      const test = '__localStorage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }, []);

  // Helper function to validate stored view state
  const validateViewState = useCallback((stored: any): ViewState => {
    if (!stored || typeof stored !== 'object') {
      logger.debug('Invalid stored view state, using defaults', { component: 'useViewState' });
      return DEFAULT_VIEW_STATE;
    }

    const validated: ViewState = { ...DEFAULT_VIEW_STATE };

    // Validate boolean fields
    for (const key of VALID_BOOLEAN_KEYS) {
      if (key in stored && typeof stored[key] === 'boolean') {
        (validated as any)[key] = stored[key];
      }
    }

    // Future: Add validation for additional fields like searchTerm, sortField, etc.
    
    return validated;
  }, []);

  // Load view state from localStorage on component mount
  useEffect(() => {
    if (!isLocalStorageAvailable()) {
      logger.debug('localStorage not available, using default view state', { 
        component: 'useViewState' 
      });
      setIsLoaded(true);
      return;
    }

    try {
      const storedViewState = localStorage.getItem(VIEW_STATE_KEY);
      
      if (storedViewState) {
        const parsed = JSON.parse(storedViewState);
        const validated = validateViewState(parsed);
        
        setViewState(validated);
        
        logger.debug('Restored view state from localStorage', { 
          component: 'useViewState',
          restored: validated 
        });
      } else {
        logger.debug('No stored view state found, using defaults', { 
          component: 'useViewState' 
        });
      }
    } catch (error) {
      logger.error('Error loading view state from localStorage', { 
        component: 'useViewState', 
        error: error instanceof Error ? error.message : String(error)
      });
      // Continue with default state on error
    }
    
    setIsLoaded(true);
  }, [isLocalStorageAvailable, validateViewState]);

  // Save view state to localStorage whenever it changes
  useEffect(() => {
    // Don't save on initial load
    if (!isLoaded) return;
    
    if (!isLocalStorageAvailable()) {
      logger.debug('localStorage not available, skipping save', { 
        component: 'useViewState' 
      });
      return;
    }

    try {
      localStorage.setItem(VIEW_STATE_KEY, JSON.stringify(viewState));
      
      logger.debug('Saved view state to localStorage', { 
        component: 'useViewState',
        saved: viewState 
      });
    } catch (error) {
      logger.error('Error saving view state to localStorage', { 
        component: 'useViewState', 
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }, [viewState, isLoaded, isLocalStorageAvailable]);

  // Listen for storage events to sync across tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      // Only handle our specific key
      if (e.key !== VIEW_STATE_KEY) return;
      
      try {
        if (e.newValue) {
          const parsed = JSON.parse(e.newValue);
          const validated = validateViewState(parsed);
          setViewState(validated);
          
          logger.debug('Synced view state from another tab', { 
            component: 'useViewState',
            synced: validated 
          });
        } else {
          // Key was removed, reset to defaults
          setViewState(DEFAULT_VIEW_STATE);
          logger.debug('View state cleared in another tab, resetting to defaults', { 
            component: 'useViewState' 
          });
        }
      } catch (error) {
        logger.error('Error syncing view state from storage event', { 
          component: 'useViewState',
          error: error instanceof Error ? error.message : String(error)
        });
      }
    };

    // Only add listener if localStorage is available
    if (isLocalStorageAvailable()) {
      window.addEventListener('storage', handleStorageChange);
      
      return () => {
        window.removeEventListener('storage', handleStorageChange);
      };
    }
  }, [isLocalStorageAvailable, validateViewState]);

  // Individual setters for easy component integration
  const setShowUnreadOnly = useCallback((value: boolean) => {
    setViewState(prev => ({ ...prev, showUnreadOnly: value }));
  }, []);

  const setShowHasUnsubscribe = useCallback((value: boolean) => {
    setViewState(prev => ({ ...prev, showHasUnsubscribe: value }));
  }, []);

  // NEW: setter for groupByDomain
  const setGroupByDomain = useCallback((value: boolean) => {
    setViewState(prev => ({ ...prev, groupByDomain: value }));
  }, []);

  // Future extensibility: additional setters can be added here
  // const setSearchTerm = useCallback((value: string) => {
  //   setViewState(prev => ({ ...prev, searchTerm: value }));
  // }, []);

  // Clear function for integration with user data clearing
  const clearViewState = useCallback(() => {
    if (!isLocalStorageAvailable()) return;
    
    try {
      localStorage.removeItem(VIEW_STATE_KEY);
      setViewState(DEFAULT_VIEW_STATE);
      
      logger.debug('Cleared view state', { component: 'useViewState' });
    } catch (error) {
      logger.error('Error clearing view state', { 
        component: 'useViewState',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }, [isLocalStorageAvailable]);

  return {
    // Current state values
    showUnreadOnly: viewState.showUnreadOnly,
    showHasUnsubscribe: viewState.showHasUnsubscribe,
    groupByDomain: viewState.groupByDomain,
    
    // Setters
    setShowUnreadOnly,
    setShowHasUnsubscribe,
    setGroupByDomain,
    
    // Utility
    isLoaded, // Indicates if localStorage has been checked and state restored
    clearViewState, // For integration with user data clearing
    
    // Future extensibility
    // searchTerm: viewState.searchTerm,
    // setSearchTerm,
  };
}

/**
 * Utility function to clear view state from localStorage
 * Can be called independently for cleanup scenarios
 */
export function clearStoredViewState(): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.removeItem(VIEW_STATE_KEY);
  } catch (error) {
    console.error('Error clearing stored view state:', error);
  }
} 