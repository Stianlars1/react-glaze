import { readInitialState, shareableState } from './config.ts';
import type { StudioState } from './config.ts';

export const SAVED_CONFIG_KEY = 'react-glaze:playground:config:v1';
type StorageAccess = () => Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
const browserStorage: StorageAccess = () => window.localStorage;
export interface SavedConfig {
  state: StudioState | null;
  exists: boolean;
  error: string | null;
}

export function readSavedConfig(storage: StorageAccess = browserStorage): SavedConfig {
  try {
    const raw = storage().getItem(SAVED_CONFIG_KEY);
    if (raw === null) return { state: null, exists: false, error: null };
    const value = JSON.parse(raw);
    if (!value || typeof value !== 'object' || Array.isArray(value) ||
      !value.settings || typeof value.settings !== 'object' || Array.isArray(value.settings)) {
      return { state: null, exists: true, error: 'The saved configuration is invalid. Save a new one or delete it.' };
    }
    return { state: readInitialState(`?config=${encodeURIComponent(raw)}`), exists: true, error: null };
  } catch {
    return { state: null, exists: true, error: 'Could not read the saved configuration. Browser storage may be unavailable or the saved data may be invalid.' };
  }
}

export function saveConfig(state: StudioState, storage: StorageAccess = browserStorage): string | null {
  try {
    storage().setItem(SAVED_CONFIG_KEY, JSON.stringify(shareableState(state)));
    return null;
  } catch {
    return 'Could not save. Browser storage may be unavailable or full.';
  }
}

export function deleteSavedConfig(storage: StorageAccess = browserStorage): string | null {
  try {
    storage().removeItem(SAVED_CONFIG_KEY);
    return null;
  } catch {
    return 'Could not delete the saved configuration. Browser storage may be unavailable.';
  }
}

export function readPlaygroundState(search = location.search, storage: StorageAccess = browserStorage): StudioState {
  if (new URLSearchParams(search).has('config')) return readInitialState(search);
  return readSavedConfig(storage).state ?? readInitialState(search);
}
