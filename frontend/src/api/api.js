const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

// Get the stored JWT token.
function getToken() {
  return localStorage.getItem('auth_token');
}

// Set the JWT token.
export function setToken(token) {
  localStorage.setItem('auth_token', token);
}

// Clear the JWT token.
export function clearToken() {
  localStorage.removeItem('auth_token');
}

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const token = getToken();

  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    ...options,
  };

  const response = await fetch(url, config);

  if (response.status === 401) {
    // Token expired or invalid — clear and redirect to login.
    clearToken();
    window.dispatchEvent(new Event('auth:logout'));
    const error = new Error('Session expired. Please sign in again.');
    error.status = 401;
    throw error;
  }

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const error = new Error(errorBody.error || `API Error: ${response.status}`);
    error.status = response.status;
    throw error;
  }

  if (response.status === 204) return null;
  return response.json();
}

// === Auth ===

/** POST /api/auth/google — Exchange Google ID token for a JWT */
export function loginWithGoogle(idToken) {
  return request('/auth/google', {
    method: 'POST',
    body: JSON.stringify({ idToken }),
  });
}

/** GET /api/auth/me — Get current user profile */
export function getMe() {
  return request('/auth/me');
}

/** PUT /api/auth/batch — Set user's batch code */
export function updateBatch(batchCode) {
  return request('/auth/batch', {
    method: 'PUT',
    body: JSON.stringify({ batchCode }),
  });
}

// === Friends ===

/** GET /api/friends — returns { friends: FriendStatus[] } */
export function fetchFriends() {
  return request('/friends');
}

/** DELETE /api/friends/:id */
export function deleteFriend(id) {
  return request(`/friends/${id}`, { method: 'DELETE' });
}

/** GET /api/batches — { groups: [{ yearGroup, batches: string[] }] } */
export function fetchBatches() {
  return request('/batches');
}

/** GET /api/friends/:id/schedule?day=N */
export function fetchFriendSchedule(friendId, day) {
  const params = day !== undefined ? `?day=${day}` : '';
  return request(`/friends/${friendId}/schedule${params}`);
}

/** GET /api/friends/free-now */
export function fetchFreeFriends() {
  return request('/friends/free-now');
}

/** POST /api/friends/common-free */
export function fetchCommonFree(friendIds, day) {
  return request('/friends/common-free', {
    method: 'POST',
    body: JSON.stringify({ friendIds, day }),
  });
}

// === Invites ===

/** GET /api/friends/invite-info — Get current user's invite code */
export function getInviteInfo() {
  return request('/friends/invite-info');
}

/** POST /api/friends/invite-regenerate — Generate a new invite code */
export function regenerateInvite() {
  return request('/friends/invite-regenerate', { method: 'POST' });
}

/** POST /api/friends/invite/:code — Accept a friend invite */
export function acceptInvite(code) {
  return request(`/friends/invite/${code}`, { method: 'POST' });
}

// === Admin ===

/** GET /api/admin/stats — Get system analytics */
export function fetchAdminStats() {
  return request('/admin/stats');
}

/** GET /api/admin/users — Get all users */
export function fetchAdminUsers() {
  return request('/admin/users');
}

/** PUT /api/admin/users/:id/role — Promote/demote user */
export function updateAdminUserRole(id, role) {
  return request(`/admin/users/${id}/role`, {
    method: 'PUT',
    body: JSON.stringify({ role }),
  });
}

/** DELETE /api/admin/users/:id — Delete user entirely */
export function deleteAdminUser(id) {
  return request(`/admin/users/${id}`, { method: 'DELETE' });
}
