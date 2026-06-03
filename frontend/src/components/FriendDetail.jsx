import { useState, useMemo } from 'react';
import { getDaySchedule } from '../utils/timeUtils';
import Timeline from './Timeline';
import './FriendDetail.css';

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

export default function FriendDetail({ friend, timetable, onClose, initialDay = 0 }) {
  const [day, setDay] = useState(initialDay);

  const schedule = useMemo(() => {
    const slots = getDaySchedule(timetable, friend.batchCode, day);
    return {
      batchCode: friend.batchCode,
      day,
      dayName: DAY_NAMES[day],
      slots,
    };
  }, [friend.batchCode, timetable, day]);

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
          {schedule.slots.length === 0 ? (
            <div className="friend-detail__error">
              <p>📋 No schedule data available for this batch.</p>
            </div>
          ) : (
            <Timeline slots={schedule.slots} dayName={schedule.dayName} currentDay={day} />
          )}
        </div>
      </div>
    </>
  );
}
