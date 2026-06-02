import { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { fetchBatches, updateBatch } from '../api/api';
import { useToast } from './ToastProvider';
import './BatchReminder.css';

export default function BatchReminder() {
  const { user, refreshUser } = useAuth();
  const [showModal, setShowModal] = useState(false);

  // Don't show if user already has a batch.
  if (user?.batchCode) return null;

  // Check if already dismissed today.
  const dismissKey = `batch_reminder_dismissed_${new Date().toDateString()}`;
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(dismissKey) === 'true'
  );

  if (dismissed) return null;

  const handleDismiss = () => {
    localStorage.setItem(dismissKey, 'true');
    setDismissed(true);
  };

  return (
    <>
      <div className="batch-reminder">
        <span className="batch-reminder__icon">⚠️</span>
        <div className="batch-reminder__text">
          <p className="batch-reminder__title">Set your batch</p>
          <p className="batch-reminder__desc">
            Add your batch code to see schedule data and let friends track your availability.
          </p>
        </div>
        <button className="batch-reminder__btn" onClick={() => setShowModal(true)}>
          Set Batch
        </button>
      </div>

      {showModal && (
        <BatchSetupModal
          onClose={() => setShowModal(false)}
          onDone={() => {
            setShowModal(false);
            refreshUser();
          }}
        />
      )}
    </>
  );
}

function BatchSetupModal({ onClose, onDone }) {
  const [batchCode, setBatchCode] = useState('');
  const [batchGroups, setBatchGroups] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loadingBatches, setLoadingBatches] = useState(true);
  const dropdownRef = useRef(null);
  const { showToast } = useToast();

  useEffect(() => {
    fetchBatches()
      .then((data) => setBatchGroups(data.groups || []))
      .catch(() => showToast('Failed to load batches', 'error'))
      .finally(() => setLoadingBatches(false));
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filteredGroups = useMemo(() => {
    if (!batchCode.trim()) return batchGroups;
    const q = batchCode.toUpperCase();
    return batchGroups
      .map((g) => ({
        ...g,
        batches: g.batches.filter((b) => b.toUpperCase().includes(q)),
      }))
      .filter((g) => g.batches.length > 0);
  }, [batchCode, batchGroups]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!batchCode.trim() || submitting) return;

    setSubmitting(true);
    try {
      await updateBatch(batchCode.trim());
      showToast('Batch set successfully!', 'success');
      onDone();
    } catch (err) {
      showToast(err.message || 'Failed to set batch', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="batch-setup-modal">
      <div className="batch-setup-modal__backdrop" onClick={onClose} />
      <div className="batch-setup-modal__card">
        <h2 className="batch-setup-modal__title">Select Your Batch</h2>
        <p className="batch-setup-modal__desc">
          Choose your batch/section so your friends can see when you&apos;re free.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="batch-setup-modal__field" ref={dropdownRef}>
            <input
              className="input-field"
              type="text"
              placeholder="e.g. 1A11, 3CS21"
              value={batchCode}
              onChange={(e) => {
                setBatchCode(e.target.value);
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
              autoComplete="off"
            />
            {showDropdown && !loadingBatches && (
              <div className="batch-dropdown">
                {filteredGroups.length === 0 ? (
                  <div className="batch-dropdown__empty">No matching batches</div>
                ) : (
                  filteredGroups.map((group) => (
                    <div key={group.yearGroup} className="batch-dropdown__group">
                      <div className="batch-dropdown__group-label">{group.yearGroup}</div>
                      <div className="batch-dropdown__items">
                        {group.batches.slice(0, 20).map((b) => (
                          <button
                            key={b}
                            type="button"
                            className={`batch-dropdown__item ${batchCode === b ? 'batch-dropdown__item--selected' : ''}`}
                            onClick={() => {
                              setBatchCode(b);
                              setShowDropdown(false);
                            }}
                          >
                            {b}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          <div className="batch-setup-modal__actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Later
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!batchCode.trim() || submitting}
            >
              {submitting ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
