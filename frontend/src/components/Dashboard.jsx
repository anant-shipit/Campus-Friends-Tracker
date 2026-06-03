import { useState, useEffect, useCallback } from 'react';
import { getFriends, removeFriend, toggleRoommate } from '../utils/friendsStore';
import { computeFriendStatus } from '../utils/timeUtils';
import FriendCard from './FriendCard';
import { useToast } from './ToastProvider';
import './Dashboard.css';

const FILTER_OPTIONS = ['All', 'Free Now', 'In Class'];

export default function Dashboard({ refreshKey, timetable, onSelectFriend, onRefresh }) {
  const [friends, setFriends] = useState([]);
  const [filter, setFilter] = useState('All');
  const [currentTime, setCurrentTime] = useState(new Date());
  const { showToast } = useToast();

  const loadFriends = useCallback(() => {
    const raw = getFriends();
    // Compute live status for each friend using cached timetable.
    const withStatus = raw.map((f) => computeFriendStatus(f, timetable, new Date()));
    setFriends(withStatus);
  }, [timetable]);

  useEffect(() => {
    loadFriends();
  }, [loadFriends, refreshKey]);

  // Auto-refresh every 60 seconds to update statuses.
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
      loadFriends();
    }, 60000);
    return () => clearInterval(interval);
  }, [loadFriends]);

  const handleDelete = async (id) => {
    try {
      removeFriend(id);
      showToast('Friend removed', 'success');
      onRefresh();
    } catch {
      showToast('Failed to remove friend', 'error');
    }
  };

  const handleToggleRoommate = (id, isRoommate) => {
    try {
      toggleRoommate(id, isRoommate);
      if (isRoommate) {
        showToast('Added as roommate 🏠', 'success');
      } else {
        showToast('Removed from roommates', 'info');
      }
      onRefresh();
    } catch {
      showToast('Failed to update roommate status', 'error');
    }
  };

  const filtered = friends.filter((f) => {
    if (filter === 'Free Now') return f.currentStatus === 'free';
    if (filter === 'In Class') return f.currentStatus === 'in_class';
    return true;
  });

  const freeCount = friends.filter((f) => f.currentStatus === 'free').length;
  const busyCount = friends.filter((f) => f.currentStatus === 'in_class').length;

  if (friends.length === 0) {
    return (
      <div className="dashboard">
        <div className="dashboard__empty">
          <div className="dashboard__empty-icon">👋</div>
          <h2>No friends added yet</h2>
          <p>Tap the <strong>+</strong> button to add your first friend and track their schedule.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      {/* Stats */}
      <div className="dashboard__stats">
        <div className="dashboard__stat dashboard__stat--free">
          <span className="dashboard__stat-num">{freeCount}</span>
          <span className="dashboard__stat-label">Free</span>
        </div>
        <div className="dashboard__stat dashboard__stat--busy">
          <span className="dashboard__stat-num">{busyCount}</span>
          <span className="dashboard__stat-label">In Class</span>
        </div>
        <div className="dashboard__stat dashboard__stat--total">
          <span className="dashboard__stat-num">{friends.length}</span>
          <span className="dashboard__stat-label">Total</span>
        </div>
      </div>

      {/* Filters */}
      <div className="dashboard__filters">
        {FILTER_OPTIONS.map((opt) => (
          <button
            key={opt}
            className={`dashboard__filter-btn ${filter === opt ? 'dashboard__filter-btn--active' : ''}`}
            onClick={() => setFilter(opt)}
          >
            {opt}
            {opt === 'Free Now' && freeCount > 0 && (
              <span className="dashboard__filter-count">{freeCount}</span>
            )}
            {opt === 'In Class' && busyCount > 0 && (
              <span className="dashboard__filter-count">{busyCount}</span>
            )}
          </button>
        ))}
      </div>

      {/* Friend list */}
      <div className="dashboard__list">
        {filtered.length === 0 ? (
          <div className="dashboard__no-results">
            <p>No friends match this filter</p>
          </div>
        ) : (
          filtered.map((friend, i) => (
            <FriendCard
              key={friend.id}
              friend={friend}
              onTap={onSelectFriend}
              onDelete={handleDelete}
              onToggleRoommate={handleToggleRoommate}
              style={{ animationDelay: `${i * 60}ms` }}
            />
          ))
        )}
      </div>
    </div>
  );
}
