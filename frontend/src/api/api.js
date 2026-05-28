const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  const response = await fetch(url, config);

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const error = new Error(errorBody.error || `API Error: ${response.status}`);
    error.status = response.status;
    throw error;
  }

  if (response.status === 204) return null;
  return response.json();
}

/** GET /api/friends — returns { friends: FriendStatus[] } */
export function fetchFriends() {
  return request('/friends');
}

/** POST /api/friends — add a new friend { name, batchCode } */
export function addFriend(name, batchCode) {
  return request('/friends', {
    method: 'POST',
    body: JSON.stringify({ name, batchCode }),
  });
}

/** DELETE /api/friends/:id */
export function deleteFriend(id) {
  return request(`/friends/${id}`, { method: 'DELETE' });
}

/** GET /api/batches — { groups: [{ yearGroup, batches: string[] }] } */
export function fetchBatches() {
  return request('/batches');
}

/** GET /api/friends/:id/schedule?day=N — { batchCode, day, dayName, slots } */
export function fetchFriendSchedule(friendId, day) {
  const params = day !== undefined ? `?day=${day}` : '';
  return request(`/friends/${friendId}/schedule${params}`);
}

/** GET /api/friends/free-now — { friends: FriendStatus[] } */
export function fetchFreeFriends() {
  return request('/friends/free-now');
}

/** POST /api/friends/common-free — { day, dayName, freeSlots: TimeSlot[] } */
export function fetchCommonFree(friendIds, day) {
  return request('/friends/common-free', {
    method: 'POST',
    body: JSON.stringify({ friendIds, day }),
  });
}
