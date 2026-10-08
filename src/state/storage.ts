// Versioned local persistence. Browser local storage is used for synthetic
// meeting data only. It is not a secure clinical record system.

import type { AppState } from '../types';
import { createSeedState } from './seed';
import { validateState } from './validate';

export const STORAGE_KEY = 'saha-knowledge-review-studio/state';
export const STORAGE_BACKUP_KEY = 'saha-knowledge-review-studio/unreadable-backup';
export const STORAGE_APP_ID = 'saha_knowledge_review_studio';
export const STATE_VERSION = 1;

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface LoadResult {
  state: AppState;
  /** Set when saved data existed but could not be used. */
  notice: string | null;
}

/**
 * Reads saved state. Anything unreadable is copied to a backup key and the
 * seed fixtures are loaded instead, so a bad save never blocks the meeting.
 */
export function loadState(storage: StorageLike): LoadResult {
  let raw: string | null;
  try {
    raw = storage.getItem(STORAGE_KEY);
  } catch {
    return { state: createSeedState(), notice: 'Local storage is unavailable. Changes will not survive a refresh.' };
  }
  if (raw === null) return { state: createSeedState(), notice: null };

  const fallback = (why: string): LoadResult => {
    try {
      storage.setItem(STORAGE_BACKUP_KEY, raw as string);
    } catch {
      // Best effort only.
    }
    return {
      state: createSeedState(),
      notice: `Saved data could not be loaded (${why}). The demo fixtures were loaded instead; the unreadable data was kept under "${STORAGE_BACKUP_KEY}".`,
    };
  };

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return fallback('not valid JSON');
  }
  const envelope = parsed as { app?: unknown; state_version?: unknown; state?: unknown } | null;
  if (!envelope || envelope.app !== STORAGE_APP_ID) return fallback('not saved by this app');
  if (envelope.state_version !== STATE_VERSION) {
    return fallback(`state format version ${String(envelope.state_version)} is not supported by this build`);
  }
  const result = validateState(envelope.state);
  if (!result.ok) return fallback(result.errors[0]);
  return { state: result.state, notice: null };
}

export function saveState(storage: StorageLike, state: AppState, now: string): { ok: boolean; error?: string } {
  try {
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify({ app: STORAGE_APP_ID, state_version: STATE_VERSION, saved_at: now, state }),
    );
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'unknown error' };
  }
}

export function clearState(storage: StorageLike) {
  try {
    storage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to clear.
  }
}
