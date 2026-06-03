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

export default function FriendCard({ friend, onTap, onDelete, onToggleRoommate, style }) {
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

  const handleToggleRoommate = (e) => {
    e.stopPropagation();
    if (onToggleRoommate) {
      onToggleRoommate(friend.id, !friend.isRoommate);
    }
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
          <h2 className="friend-card__name">{friend.name}</h2>
          <span className="friend-card__batch">{friend.batchCode}</span>
        </div>
        <div className="friend-card__actions" style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            className={`btn btn-icon ${friend.isRoommate ? 'btn-primary' : 'btn-ghost'}`}
            onClick={handleToggleRoommate}
            title={friend.isRoommate ? "Remove Roommate" : "Add as Roommate"}
            aria-label={friend.isRoommate ? "Remove roommate" : "Add as roommate"}
            style={{ fontSize: '1.2rem', padding: '4px' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
          </button>
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
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>
          ) : (
            <button
              className="friend-card__delete-btn"
              onClick={handleDelete}
              aria-label="Delete friend"
              title="Remove friend"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          )}
        </div>
      </div>

      <div className="friend-card__body">
        {isFree ? (
          <p className="friend-card__status-text friend-card__status-text--free">
            <span className="friend-card__status-icon" style={{display: 'inline-flex', alignItems: 'center'}}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{color: 'var(--color-free)'}}><polyline points="20 6 9 17 4 12"></polyline></svg>
            </span>
            {friend.nextClass
              ? `Free until ${formatTime(friend.nextClass.startsAt)}`
              : 'Free for the rest of the day'}
          </p>
        ) : (
          <p className="friend-card__status-text friend-card__status-text--busy">
            <span className="friend-card__status-icon" style={{display: 'inline-flex', alignItems: 'center'}}>
              {classType === 'lab' ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 2v7.31"></path><path d="M14 9.3V1.99"></path><path d="M8.5 2h7"></path><path d="M14 9.3a6.5 6.5 0 1 1-4 0"></path><line x1="5.52" y1="16" x2="18.48" y2="16"></line></svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
              )}
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
