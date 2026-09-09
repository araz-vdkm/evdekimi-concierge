/**
 * Best-effort localStorage helpers that never throw. A quota-exceeded (or
 * any other storage) error is caught and logged instead of propagating, so
 * a local cache write can never break a caller that isn't expecting it --
 * e.g. abort a login, drop an OAuth token, or undo state that was already
 * set before the failing write. Kept dependency-free (no imports) so it can
 * be safely imported from anywhere, including files that import each other.
 */
export const safeSetItem = (key: string, value: string): boolean => {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (e) {
    console.warn(`localStorage.setItem failed for "${key}" (quota exceeded?):`, e);
    return false;
  }
};

export const safeGetItem = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch (e) {
    console.warn(`localStorage.getItem failed for "${key}":`, e);
    return null;
  }
};

export const safeRemoveItem = (key: string): void => {
  try {
    localStorage.removeItem(key);
  } catch (e) {
    console.warn(`localStorage.removeItem failed for "${key}":`, e);
  }
};
