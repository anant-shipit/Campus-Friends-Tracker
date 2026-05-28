import { useState, useEffect, useMemo } from 'react';
import { fetchFriends, fetchCommonFree } from '../api/api';
import './CommonFreeTime.css';

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

function formatTime(timeStr) {
  if (!timeStr) return '';
  const parts = timeStr.split(':');
  const h = parseInt(parts[0], 10);
  const m = parts[1];
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${m} ${ampm}`;
}

function getTodayIndex() {
  const d = new Date().getDay();
  if (d >= 1 && d <= 5) return d - 1;
  return 0;
}

export default function CommonFreeTime() {
  const [friends, setFriends] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [day, setDay] = useState(getTodayIndex());
  const [freeSlots, setFreeSlots] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingFriends, setLoadingFriends] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchFriends()
      .then((data) => setFriends(data.friends || []))
      .finally(() => setLoadingFriends(false));
  }, []);

  const toggleFriend = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setFreeSlots(null);
  };

  const selectedNames = useMemo(() => {
    return friends
      .filter((f) => selectedIds.has(f.id))
      .map((f) => f.name);
  }, [friends, selectedIds]);

  const handleFind = async () => {
    if (selectedIds.size < 2) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchCommonFree([...selectedIds], day);
      setFreeSlots(data.freeSlots || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="common-free">
      <div className="common-free__intro fade-in-up">
        <h2>Find Common Free Time</h2>
        <p>Select 2 or more friends to see when everyone is free.</p>
      </div>

      {/* Day selector */}
      <div className="common-free__days fade-in-up">
        {DAY_NAMES.map((name, i) => (
          <button
            key={i}
            className={`common-free__day-btn ${day === i ? 'common-free__day-btn--active' : ''}`}
            onClick={() => { setDay(i); setFreeSlots(null); }}
          >
            {name}
          </button>
        ))}
      </div>

      {/* Friend selection */}
      {loadingFriends ? (
        <div className="common-free__loading">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton skeleton-line long" style={{ height: 40, marginBottom: 8 }} />
          ))}
        </div>
      ) : friends.length === 0 ? (
        <div className="common-free__empty">
          <p>Add some friends first to use this feature.</p>
        </div>
      ) : (
        <>
          <div className="common-free__friends">
            {friends.map((f) => (
              <button
                key={f.id}
                className={`common-free__friend-btn glass-card ${
                  selectedIds.has(f.id) ? 'common-free__friend-btn--selected' : ''
                }`}
                onClick={() => toggleFriend(f.id)}
              >
                <span className="common-free__checkbox">
                  {selectedIds.has(f.id) ? '✓' : ''}
                </span>
                <span className="common-free__friend-name">{f.name}</span>
                <span className="common-free__friend-batch">{f.batchCode}</span>
              </button>
            ))}
          </div>

          {selectedIds.size > 0 && (
            <div className="common-free__selected-summary">
              Selected: {selectedNames.join(', ')}
            </div>
          )}

          <button
            className="btn btn-primary common-free__find-btn"
            disabled={selectedIds.size < 2 || loading}
            onClick={handleFind}
          >
            {loading ? (
              <><span className="spinner spinner-sm" /> Finding...</>
            ) : (
              `📅 Find Free Slots (${selectedIds.size} selected)`
            )}
          </button>
        </>
      )}

      {/* Results */}
      {error && (
        <div className="common-free__error glass-card">
          <p>⚠️ {error}</p>
        </div>
      )}

      {freeSlots !== null && !error && (
        <div className="common-free__results fade-in-up">
          <h3 className="common-free__results-title">
            {freeSlots.length > 0
              ? `${freeSlots.length} Common Free Slot${freeSlots.length > 1 ? 's' : ''}`
              : 'No Common Free Slots'}
          </h3>

          {freeSlots.length === 0 ? (
            <div className="common-free__no-slots">
              <span className="common-free__no-slots-icon">😞</span>
              <p>No overlapping free time on {DAY_NAMES[day]}. Try another day!</p>
            </div>
          ) : (
            <div className="common-free__slots">
              {freeSlots.map((slot, i) => (
                <div
                  key={slot.slotIndex}
                  className="common-free__slot glass-card"
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <div className="common-free__slot-dot" />
                  <div className="common-free__slot-time">
                    {formatTime(slot.startTime)} — {formatTime(slot.endTime)}
                  </div>
                  <span className="common-free__slot-duration">50 min</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
