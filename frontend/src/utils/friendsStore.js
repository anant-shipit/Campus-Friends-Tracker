// Friends are stored entirely in localStorage as a JSON array.
// Each friend: { id, name, batchCode, createdAt }

const FRIENDS_KEY = 'campus_friends';

function getAll() {
  try {
    const raw = localStorage.getItem(FRIENDS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveAll(friends) {
  localStorage.setItem(FRIENDS_KEY, JSON.stringify(friends));
}

/** Add a friend to the local list. Returns the new friend object. */
export function addFriend(name, batchCode, isRoommate = false) {
  const friends = getAll();
  const normalizedName = name.trim();

  // Check for duplicate.
  const exists = friends.some(
    (f) => f.name.toLowerCase() === normalizedName.toLowerCase() && f.batchCode === batchCode
  );
  if (exists) {
    throw new Error('This friend is already in your list');
  }

  const friend = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    name: normalizedName,
    batchCode,
    isRoommate,
    createdAt: new Date().toISOString(),
  };

  friends.push(friend);
  saveAll(friends);
  return friend;
}

/** Toggle roommate status for a friend. */
export function toggleRoommate(id, isRoommate) {
  const friends = getAll();
  const friendIndex = friends.findIndex((f) => f.id === id);
  if (friendIndex === -1) {
    throw new Error('Friend not found');
  }
  friends[friendIndex].isRoommate = isRoommate;
  saveAll(friends);
}

/** Get all friends from local storage. */
export function getFriends() {
  return getAll();
}

/** Remove a friend by ID. */
export function removeFriend(id) {
  const friends = getAll();
  const filtered = friends.filter((f) => f.id !== id);
  if (filtered.length === friends.length) {
    throw new Error('Friend not found');
  }
  saveAll(filtered);
}
