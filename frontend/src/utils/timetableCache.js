// Timetable cache — fetches the master schedule from the backend once,
// stores it in localStorage, and serves it offline from there.

const TIMETABLE_KEY = 'campus_timetable';
const TIMETABLE_TS_KEY = 'campus_timetable_ts';
const BATCHES_KEY = 'campus_batches';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

/**
 * Fetch the master timetable from the server and cache it.
 * Returns the timetable object: { batchCode: { dayIndex: [slots] } }
 *
 * Sanity check: if the server returns significantly fewer batches than
 * what is already cached (e.g. during a seed), the update is rejected
 * and the existing cache is preserved.
 */
export async function fetchAndCacheTimetable() {
  try {
    const res = await fetch(`${API_BASE}/schedules/all`);

    // 503 = server is seeding; keep existing cache.
    if (res.status === 503) {
      console.warn('Server is seeding (503), using cache.');
      return getCachedTimetable();
    }

    if (!res.ok) throw new Error('Failed to fetch timetable');
    const data = await res.json();

    if (!data || !data.timetable) {
      console.warn('Server returned invalid timetable data, using cache.');
      return getCachedTimetable();
    }

    // ── Sanity check: reject suspiciously small responses ──
    const newBatchCount = Object.keys(data.timetable).length;
    const cachedTimetable = getCachedTimetable();
    const cachedBatchCount = Object.keys(cachedTimetable).length;

    if (newBatchCount === 0 && cachedBatchCount > 0) {
      console.warn(
        `Server returned 0 batches but cache has ${cachedBatchCount}. ` +
        'Rejecting update to protect local data.'
      );
      return cachedTimetable;
    }

    if (cachedBatchCount > 10 && newBatchCount < cachedBatchCount * 0.5) {
      console.warn(
        `Server returned ${newBatchCount} batches vs ${cachedBatchCount} cached. ` +
        'Looks like a partial response — rejecting update.'
      );
      return cachedTimetable;
    }

    localStorage.setItem(TIMETABLE_KEY, JSON.stringify(data.timetable));
    localStorage.setItem(TIMETABLE_TS_KEY, new Date().toISOString());

    if (data.batches) {
      localStorage.setItem(BATCHES_KEY, JSON.stringify(data.batches));
    }

    return data.timetable;
  } catch (err) {
    console.warn('Could not fetch timetable from server, using cache:', err.message);
    return getCachedTimetable();
  }
}

/**
 * Get the cached timetable from localStorage.
 */
export function getCachedTimetable() {
  try {
    const raw = localStorage.getItem(TIMETABLE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/**
 * Get cached batch groups for the AddFriendModal dropdown.
 */
export function getCachedBatches() {
  try {
    const raw = localStorage.getItem(BATCHES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Check if timetable has been cached.
 */
export function hasCachedTimetable() {
  return !!localStorage.getItem(TIMETABLE_KEY);
}

/**
 * Get timestamp of last timetable sync.
 */
export function getLastSyncTime() {
  return localStorage.getItem(TIMETABLE_TS_KEY) || null;
}
