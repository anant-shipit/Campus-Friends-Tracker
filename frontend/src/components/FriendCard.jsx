import { useState } from 'react';
import StatusBadge from './StatusBadge';
import './FriendCard.css';

function formatTime(timeStr) {
  if (!timeStr) return '';
  // Handle "HH:MM" or "HH:MM:SS"
  const parts = timeStr.split(':');
  const h = parseInt(parts[0], 10);
  const m = parts[1];
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${m} ${ampm}`;
}

function classTypeLabel(type) {
  if (type === 'lecture') return 'L';
  if (type === 'tutorial') return 'T';
  if (type === 'lab') return 'P';
  return type;
}

export default function FriendCard({ friend, onTap, onDelete, style }) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isFree = friend.currentStatus === 'free';
  const classType = isFree
    ? 'free'
    : (friend.currentClass?.classType || 'lecture');

  const handleDelete = async (e) => {
    e.stopPropagation();
    if (!showConfirm) {
      setShowConfirm(true);
      return;
    }
    setDeleting(true);
    try {
      await onDelete(friend.id);
    } catch {
      setDeleting(false);
      setShowConfirm(false);
    }
  };

  const handleCancelDelete = (e) => {
    e.stopPropagation();
    setShowConfirm(false);
  };

  return (
    <div
      className={`friend-card glass-card friend-card--${classType} fade-in-up`}
      onClick={() => onTap(friend)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onTap(friend)}
      style={style}
    >
      <div className="friend-card__header">
        <div className="friend-card__status-dot">
          <StatusBadge type={classType} size="md" />
        </div>
        <div className="friend-card__info">
          <h3 className="friend-card__name">{friend.name}</h3>
          <span className="friend-card__batch">{friend.batchCode}</span>
        </div>
        <div className="friend-card__actions">
          {showConfirm ? (
            <div className="friend-card__confirm">
              <button
                className="btn btn-danger btn-sm"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? <span className="spinner spinner-sm" /> : 'Delete'}
              </button>
              <button
                className="btn btn-ghost btn-sm"
                onClick={handleCancelDelete}
              >
                ✕
              </button>
            </div>
          ) : (
            <button
              className="friend-card__delete-btn"
              onClick={handleDelete}
              aria-label="Delete friend"
              title="Remove friend"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      <div className="friend-card__body">
        {isFree ? (
          <p className="friend-card__status-text friend-card__status-text--free">
            <span className="friend-card__status-icon">🟢</span>
            {friend.nextClass
              ? `Free until ${formatTime(friend.nextClass.startsAt)}`
              : 'Free for the rest of the day'}
          </p>
        ) : (
          <p className="friend-card__status-text friend-card__status-text--busy">
            <span className="friend-card__status-icon">
              {classType === 'lecture' ? '📕' : classType === 'tutorial' ? '📙' : '🔬'}
            </span>
            In: {friend.currentClass?.subjectName || 'Class'}{' '}
            <span className={`chip chip-${classType}`}>
              {classTypeLabel(classType)}
            </span>
            {friend.currentClass?.room && ` • ${friend.currentClass.room}`}
          </p>
        )}

        {!isFree && friend.currentClass && (
          <p className="friend-card__ends">
            Ends at {formatTime(friend.currentClass.endsAt)}
          </p>
        )}

        {friend.nextClass && !isFree && (
          <p className="friend-card__next">
            Next: {friend.nextClass.subjectName} at{' '}
            {formatTime(friend.nextClass.startsAt)}
          </p>
        )}
      </div>
    </div>
  );
}
