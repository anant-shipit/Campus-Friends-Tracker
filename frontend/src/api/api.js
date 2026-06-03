// Minimal API module — only used for initial timetable fetch.
// All friend data is managed in localStorage via friendsStore.js.

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

/** GET /api/schedules/all — Fetch master timetable + batch list */
export async function fetchAllSchedules() {
  const res = await fetch(`${API_BASE}/schedules/all`);
  if (!res.ok) throw new Error('Failed to fetch schedules');
  return res.json();
}
