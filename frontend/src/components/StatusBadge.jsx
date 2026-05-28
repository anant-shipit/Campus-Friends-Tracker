import './StatusBadge.css';

const TYPE_MAP = {
  free: { color: 'var(--color-free)', label: 'Free', cssClass: 'free' },
  Free: { color: 'var(--color-free)', label: 'Free', cssClass: 'free' },
  lecture: { color: 'var(--color-lecture)', label: 'Lecture', cssClass: 'lecture' },
  Lecture: { color: 'var(--color-lecture)', label: 'Lecture', cssClass: 'lecture' },
  L: { color: 'var(--color-lecture)', label: 'L', cssClass: 'lecture' },
  tutorial: { color: 'var(--color-tutorial)', label: 'Tutorial', cssClass: 'tutorial' },
  Tutorial: { color: 'var(--color-tutorial)', label: 'Tutorial', cssClass: 'tutorial' },
  T: { color: 'var(--color-tutorial)', label: 'T', cssClass: 'tutorial' },
  lab: { color: 'var(--color-lab)', label: 'Lab', cssClass: 'lab' },
  Lab: { color: 'var(--color-lab)', label: 'Lab', cssClass: 'lab' },
  P: { color: 'var(--color-lab)', label: 'P', cssClass: 'lab' },
};

export default function StatusBadge({ type, showLabel = false, size = 'md' }) {
  const info = TYPE_MAP[type] || TYPE_MAP.free;

  return (
    <span className={`status-badge status-badge--${info.cssClass} status-badge--${size}`}>
      <span className="status-badge__dot" />
      {showLabel && <span className="status-badge__label">{info.label}</span>}
    </span>
  );
}
