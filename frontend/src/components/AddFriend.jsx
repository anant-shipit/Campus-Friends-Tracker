import { useState, useEffect, useRef, useMemo } from 'react';
import { addFriend, fetchBatches } from '../api/api';
import { useToast } from './ToastProvider';
import './AddFriend.css';

export default function AddFriend({ onClose, onAdded }) {
  const [name, setName] = useState('');
  const [batchCode, setBatchCode] = useState('');
  const [batchGroups, setBatchGroups] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loadingBatches, setLoadingBatches] = useState(true);
  const nameRef = useRef(null);
  const dropdownRef = useRef(null);
  const { showToast } = useToast();

  useEffect(() => {
    nameRef.current?.focus();
    fetchBatches()
      .then((data) => setBatchGroups(data.groups || []))
      .catch(() => showToast('Failed to load batches', 'error'))
      .finally(() => setLoadingBatches(false));
  }, []);

  // Close dropdown on outside click
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

  const isValid = name.trim().length >= 2 && batchCode.trim().length >= 2;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isValid || submitting) return;

    setSubmitting(true);
    try {
      await addFriend(name.trim(), batchCode.trim());
      showToast(`${name.trim()} added!`, 'success');
      onAdded();
    } catch (err) {
      showToast(err.message || 'Failed to add friend', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const selectBatch = (code) => {
    setBatchCode(code);
    setShowDropdown(false);
  };

  return (
    <>
      <div className="overlay-backdrop" onClick={onClose} />
      <div className="add-friend-modal slide-in-up">
        <div className="add-friend-modal__header">
          <h2>Add Friend</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="add-friend-modal__form">
          <div className="add-friend-modal__field">
            <label className="input-label" htmlFor="friend-name">Name</label>
            <input
              ref={nameRef}
              id="friend-name"
              className="input-field"
              type="text"
              placeholder="e.g. Rahul"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={2}
              autoComplete="off"
            />
          </div>

          <div className="add-friend-modal__field" ref={dropdownRef}>
            <label className="input-label" htmlFor="friend-batch">Batch Code</label>
            <input
              id="friend-batch"
              className="input-field"
              type="text"
              placeholder="e.g. 1A11, 3CS21"
              value={batchCode}
              onChange={(e) => {
                setBatchCode(e.target.value);
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
              required
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
                            onClick={() => selectBatch(b)}
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

          <button
            type="submit"
            className="btn btn-primary add-friend-modal__submit"
            disabled={!isValid || submitting}
          >
            {submitting ? (
              <>
                <span className="spinner spinner-sm" />
                Adding...
              </>
            ) : (
              '+ Add Friend'
            )}
          </button>
        </form>
      </div>
    </>
  );
}
