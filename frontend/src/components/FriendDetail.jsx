import { useState, useEffect } from 'react';
import { fetchFriendSchedule } from '../api/api';
import Timeline from './Timeline';
import './FriendDetail.css';

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

export default function FriendDetail({ friend, onClose, initialDay = 0 }) {
  const [day, setDay] = useState(initialDay);
  const [schedule, setSchedule] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetchFriendSchedule(friend.id, day)
      .then((data) => setSchedule(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [friend.id, day]);

  return (
    <>
      <div className="overlay-backdrop" onClick={onClose} />
      <div className="friend-detail slide-in-up">
        <div className="friend-detail__header">
          <div className="friend-detail__identity">
            <h2 className="friend-detail__name">{friend.name}</h2>
            <span className="friend-detail__batch">{friend.batchCode}</span>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>

        {/* Day selector */}
        <div className="friend-detail__days">
          {DAY_NAMES.map((name, i) => (
            <button
              key={i}
              className={`friend-detail__day-btn ${day === i ? 'friend-detail__day-btn--active' : ''}`}
              onClick={() => setDay(i)}
            >
              {name}
            </button>
          ))}
        </div>

        {/* Schedule */}
        <div className="friend-detail__body">
          {loading ? (
            <div className="friend-detail__loading">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="skeleton-card" style={{ padding: '12px' }}>
                  <div className="skeleton skeleton-line short" />
                  <div className="skeleton skeleton-line medium" style={{ marginTop: 6 }} />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="friend-detail__error">
              <p>⚠️ {error}</p>
            </div>
          ) : schedule ? (
            <Timeline slots={schedule.slots || []} dayName={schedule.dayName} currentDay={day} />
          ) : null}
        </div>
      </div>
    </>
  );
}
