import { useState, useEffect } from 'react';
import { getFriends } from '../utils/friendsStore';
import { getPrivateSessionSlots, getTodayIndex, formatTime } from '../utils/timeUtils';
import FriendCard from './FriendCard';
import './PrivateSession.css';

export default function PrivateSession({ timetable, onAddRoommate, onSelectFriend, onRefresh }) {
  const [roommates, setRoommates] = useState([]);
  const [slots, setSlots] = useState([]);
  const [dayIndex, setDayIndex] = useState(getTodayIndex());

  useEffect(() => {
    const allFriends = getFriends();
    const rms = allFriends.filter(f => f.isRoommate);
    setRoommates(rms);

    if (rms.length > 0 && timetable) {
      const batchCodes = rms.map(r => r.batchCode);
      const calculatedSlots = getPrivateSessionSlots(timetable, batchCodes, dayIndex);
      setSlots(calculatedSlots);
    } else {
      setSlots([]);
    }
  }, [timetable, dayIndex, onRefresh]); // Depend on onRefresh to re-trigger when toggle changes

  return (
    <div className="private-session fade-in-up">
      <div className="private-session__header">
        <h2>🏠 Roommates</h2>
        <p>Your room is free when all roommates are in class.</p>
        <button className="btn btn-primary btn-sm" onClick={onAddRoommate}>
          + Add Roommate
        </button>
      </div>

      <div className="private-session__roommates">
        {roommates.length === 0 ? (
          <div className="private-session__empty">
            <p>You haven't added any roommates yet.</p>
          </div>
        ) : (
          <div className="private-session__list horizontal-scroll">
            {roommates.map(friend => (
              <div key={friend.id} className="private-session__friend-chip" onClick={() => onSelectFriend(friend)}>
                <span className="name">{friend.name}</span>
                <span className="batch">{friend.batchCode}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="private-session__schedule">
        <h3>Upcoming Free Room Slots</h3>
        
        <div className="day-selector">
          {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map((day, idx) => (
            <button
              key={day}
              className={`day-btn ${dayIndex === idx ? 'day-btn--active' : ''}`}
              onClick={() => setDayIndex(idx)}
            >
              {day.slice(0, 3)}
            </button>
          ))}
        </div>

        {roommates.length === 0 ? (
          <p className="private-session__info">Add roommates to calculate free room time.</p>
        ) : slots.length === 0 ? (
          <div className="private-session__no-slots">
            <p>No intersecting classes found for today.</p>
            <p>Someone will always be in the room!</p>
          </div>
        ) : (
          <div className="private-session__slots">
            {slots.map((slot, i) => (
              <div key={i} className="private-session__slot-card glass-card fade-in-up" style={{ animationDelay: `${i * 100}ms` }}>
                <div className="time">
                  {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                </div>
                <div className="label">
                  <span className="status-dot green"></span> Everyone is in class
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
