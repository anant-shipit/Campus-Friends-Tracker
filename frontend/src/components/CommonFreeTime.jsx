import { useState, useMemo } from 'react';
import { getFriends } from '../utils/friendsStore';
import { findCommonFreeSlots, formatTime, getTodayIndex } from '../utils/timeUtils';
import './CommonFreeTime.css';

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

export default function CommonFreeTime({ timetable }) {
  const friends = getFriends();
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [day, setDay] = useState(getTodayIndex());
  const [showResults, setShowResults] = useState(false);

  const toggleFriend = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setShowResults(false);
  };

  const selectedNames = useMemo(() => {
    return friends
      .filter((f) => selectedIds.has(f.id))
      .map((f) => f.name);
  }, [friends, selectedIds]);

  const freeSlots = useMemo(() => {
    if (!showResults || selectedIds.size < 2) return null;
    const batchCodes = friends
      .filter((f) => selectedIds.has(f.id))
      .map((f) => f.batchCode);
    return findCommonFreeSlots(timetable, batchCodes, day);
  }, [showResults, selectedIds, friends, timetable, day]);

  const handleFind = () => {
    setShowResults(true);
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
            onClick={() => { setDay(i); setShowResults(false); }}
          >
            {name}
          </button>
        ))}
      </div>

      {/* Friend selection */}
      {friends.length === 0 ? (
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
            disabled={selectedIds.size < 2}
            onClick={handleFind}
          >
            📅 Find Free Slots ({selectedIds.size} selected)
          </button>
        </>
      )}

      {/* Results */}
      {freeSlots !== null && (
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
                  <span className="common-free__slot-duration">
                    {(() => {
                      if (!slot.startTime || !slot.endTime) return '50 min';
                      const start = new Date(`1970-01-01T${slot.startTime}Z`);
                      const end = new Date(`1970-01-01T${slot.endTime}Z`);
                      if (isNaN(start) || isNaN(end)) return '50 min';
                      const diffMins = Math.round((end - start) / 60000);
                      return `${diffMins} min`;
                    })()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
