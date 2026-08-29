const V2_CACHE_VERSION = '2.0.0-central-db';
const VERSION_KEY = 'agendamento_v2_cache_version';

export function initializeV2Cache() {
  if (typeof window === 'undefined') return;
  try {
    const previous = localStorage.getItem(VERSION_KEY);
    if (previous !== V2_CACHE_VERSION) {
      // Core records are server-owned. Drop only cached operational collections.
      ['slots', 'appointments', 'patients'].forEach((key) => {
        Object.keys(localStorage)
          .filter((k) => k.toLowerCase().includes(key))
          .forEach((k) => localStorage.removeItem(k));
      });
      localStorage.setItem(VERSION_KEY, V2_CACHE_VERSION);
    }
  } catch {
    // Cache cleanup must never prevent application startup.
  }
}
