import { useState, useEffect } from 'react';
import { addFriend } from '../utils/friendsStore';
import { getCachedBatches, fetchAndCacheTimetable } from '../utils/timetableCache';
import { useToast } from './ToastProvider';
import './AddFriendModal.css';

export default function AddFriendModal({ onClose, onSuccess, defaultIsRoommate = false }) {
  const [name, setName] = useState('');
  const [batchCode, setBatchCode] = useState('');
  const [isRoommate, setIsRoommate] = useState(defaultIsRoommate);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    // Try cached batches first, then try fetching.
    const cached = getCachedBatches();
    if (cached.length > 0) {
      setGroups(cached);
    } else {
      // Try to fetch if online.
      fetchAndCacheTimetable().then(() => {
        setGroups(getCachedBatches());
      });
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !batchCode) {
      showToast('Please provide a name and select a batch', 'error');
      return;
    }

    setLoading(true);
    try {
      addFriend(name.trim(), batchCode, isRoommate);
      showToast('Friend added successfully!', 'success');
      onSuccess();
      onClose();
    } catch (err) {
      showToast(err.message || 'Failed to add friend', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="overlay-backdrop" onClick={onClose} />
      <div className="add-friend-modal slide-in-up">
        <div className="add-friend-modal__header">
          <h2>Add Friend</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>

        <form className="add-friend-modal__body" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="friendName">Friend's Name</label>
            <input
              id="friendName"
              type="text"
              className="input"
              placeholder="e.g. Rahul"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="friendBatch">Batch Code</label>
            {groups.length === 0 ? (
              <input
                id="friendBatch"
                type="text"
                className="input"
                placeholder="e.g. COE1"
                value={batchCode}
                onChange={(e) => setBatchCode(e.target.value)}
                disabled={loading}
              />
            ) : (
              <select
                id="friendBatch"
                className="input"
                value={batchCode}
                onChange={(e) => setBatchCode(e.target.value)}
                disabled={loading}
              >
                <option value="">Select a batch...</option>
                {groups.map((g) => (
                  <optgroup key={g.yearGroup} label={g.yearGroup}>
                    {g.batches.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            )}
          </div>

          <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '12px' }}>
            <input
              id="isRoommate"
              type="checkbox"
              checked={isRoommate}
              onChange={(e) => setIsRoommate(e.target.checked)}
              disabled={loading}
              style={{ width: '20px', height: '20px', accentColor: 'var(--brand-primary)' }}
            />
            <label htmlFor="isRoommate" style={{ marginBottom: 0, cursor: 'pointer' }}>
              Add as Roommate 🏠
            </label>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '16px' }}
            disabled={loading || !name.trim() || !batchCode}
          >
            {loading ? 'Adding...' : 'Add Friend'}
          </button>
        </form>
      </div>
    </>
  );
}
