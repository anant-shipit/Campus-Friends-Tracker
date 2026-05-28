import { useMemo } from 'react';
import './Timeline.css';

function formatTime(timeStr) {
  if (!timeStr) return '';
  const parts = timeStr.split(':');
  const h = parseInt(parts[0], 10);
  const m = parts[1];
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${m} ${ampm}`;
}

function classTypeLabel(type) {
  switch (type) {
    case 'lecture': return 'Lecture';
    case 'tutorial': return 'Tutorial';
    case 'lab': return 'Lab/Practical';
    case 'other': return 'Other';
    default: return 'Free';
  }
}

function classTypeShort(type) {
  switch (type) {
    case 'lecture': return 'L';
    case 'tutorial': return 'T';
    case 'lab': return 'P';
    default: return '';
  }
}

// Check if the current time falls within this slot (for today only)
function isCurrentSlot(slot) {
  const now = new Date();
  const todayDay = now.getDay(); // 0=Sun, 1=Mon...
  const slotDay = slot.dayOfWeek; // 0=Mon...4=Fri
  if (todayDay - 1 !== slotDay) return false;

  const [sh, sm] = slot.startTime.split(':').map(Number);
  const [eh, em] = slot.endTime.split(':').map(Number);
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = sh * 60 + sm;
  const endMinutes = eh * 60 + em;
  return currentMinutes >= startMinutes && currentMinutes < endMinutes;
}

export default function Timeline({ slots, dayName, currentDay }) {
  // Group consecutive free slots
  const groups = useMemo(() => {
    if (!slots || slots.length === 0) return [];

    const result = [];
    let i = 0;

    while (i < slots.length) {
      const slot = slots[i];
      if (slot.classType === 'free') {
        // Merge consecutive free slots
        const start = slot;
        let end = slot;
        while (i + 1 < slots.length && slots[i + 1].classType === 'free') {
          i++;
          end = slots[i];
        }
        result.push({
          type: 'free',
          startTime: start.startTime,
          endTime: end.endTime,
          count: end.slotIndex - start.slotIndex + 1,
          slots: [start],
          isCurrent: false,
        });
      } else {
        result.push({
          type: 'class',
          ...slot,
          isCurrent: isCurrentSlot(slot),
        });
      }
      i++;
    }
    return result;
  }, [slots]);

  if (groups.length === 0) {
    return (
      <div className="timeline__empty">
        <p>No schedule data available for {dayName}</p>
      </div>
    );
  }

  return (
    <div className="timeline">
      {groups.map((item, i) => (
        <div
          key={i}
          className={`timeline__block timeline__block--${item.type === 'free' ? 'free' : item.classType} ${
            item.isCurrent ? 'timeline__block--current' : ''
          }`}
          style={{ animationDelay: `${i * 40}ms` }}
        >
          <div className="timeline__time">
            <span>{formatTime(item.startTime)}</span>
            <span className="timeline__time-separator">—</span>
            <span>{formatTime(item.endTime)}</span>
          </div>

          {item.type === 'free' ? (
            <div className="timeline__content timeline__content--free">
              <span className="timeline__free-label">
                Free{item.count > 1 ? ` (${item.count} slots)` : ''}
              </span>
            </div>
          ) : (
            <div className="timeline__content">
              <div className="timeline__subject">
                {item.subjectName || item.rawText || 'Class'}
              </div>
              <div className="timeline__meta">
                <span className={`chip chip-${item.classType}`}>
                  {classTypeShort(item.classType) || classTypeLabel(item.classType)}
                </span>
                {item.room && <span className="timeline__room">📍 {item.room}</span>}
                {item.subjectCode && (
                  <span className="timeline__code">{item.subjectCode}</span>
                )}
              </div>
            </div>
          )}

          {item.isCurrent && <div className="timeline__now-badge">NOW</div>}
        </div>
      ))}
    </div>
  );
}
