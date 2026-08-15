import { useState, useEffect, useRef } from 'react';
import { addFriend } from '../utils/friendsStore';
import { getCachedBatches, fetchAndCacheTimetable } from '../utils/timetableCache';
import { useToast } from './ToastProvider';
import './AddFriendModal.css';
import friendsIcon from '../assets/friends_icon.png';

// SVG Icons
const UserIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
);

const BatchIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
);

const FriendHeaderIcon = () => (
  <div style={{
    width: 56, height: 56, 
    borderRadius: 16,
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
  }}>
    <img 
      src={friendsIcon} 
      alt="Friends Icon" 
      style={{ 
        width: 32, 
        height: 32, 
        objectFit: 'contain', 
        filter: 'invert(1) brightness(1.2)' 
      }} 
    />
  </div>
);

export default function AddFriendModal({ onClose, onSuccess, defaultIsRoommate = false }) {
  const [name, setName] = useState('');
  const [batchCode, setBatchCode] = useState('');
  const [isRoommate, setIsRoommate] = useState(defaultIsRoommate);
  const [batches, setBatches] = useState([]);
  const [batchesLoading, setBatchesLoading] = useState(false);
  const [batchesError, setBatchesError] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Custom Dropdown State
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  
  const { showToast } = useToast();

  useEffect(() => {
    let isMounted = true;
    const cached = getCachedBatches();
    if (cached && cached.length > 0) {
      setBatches(cached);
    } else {
      setBatchesLoading(true);
      fetchAndCacheTimetable()
        .then(() => {
          if (isMounted) {
            setBatches(getCachedBatches());
            setBatchesLoading(false);
          }
        })
        .catch((err) => {
          console.error("Failed to fetch batches:", err);
          if (isMounted) {
            setBatchesError("Failed to load batches.");
            setBatchesLoading(false);
          }
        });
    }
    return () => { isMounted = false; };
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredBatches = batches.filter(b => 
    b.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

  const toggleRoommate = () => {
    if (!loading) setIsRoommate(!isRoommate);
  };
  
  const handleRoommateKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleRoommate();
    }
  };

  const handleDropdownKeyDown = (e) => {
    if (e.key === 'Escape') {
      setDropdownOpen(false);
    }
  };

  return (
    <div className="premium-modal-overlay" onMouseDown={onClose}>
      <div 
        className="premium-modal" 
        role="dialog" 
        aria-labelledby="modal-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        
        <div className="pm-header">
          <button className="pm-close-btn" onClick={onClose} aria-label="Close modal">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
          
          <div className="pm-illustration">
            <FriendHeaderIcon />
          </div>
          <h2 id="modal-title" className="pm-title">Add Friend</h2>
          <p className="pm-subtitle">Grow your campus network by adding classmates.</p>
        </div>

        <form className="pm-form" onSubmit={handleSubmit}>
          
          <div className="pm-input-card">
            <div className="pm-input-icon"><UserIcon /></div>
            <input
              type="text"
              className="pm-input-field"
              placeholder="Friend's Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
              autoFocus
              aria-label="Friend's Name"
            />
          </div>

          <div className="pm-input-card" ref={dropdownRef}>
            <div className="pm-input-icon"><BatchIcon /></div>
            <div className="pm-dropdown-wrapper">
              <button
                type="button"
                className={`pm-dropdown-button ${!batchCode ? 'placeholder' : ''}`}
                onClick={() => {
                  if (!loading) {
                    setDropdownOpen(!dropdownOpen);
                    if (!dropdownOpen) setSearchQuery('');
                  }
                }}
                onKeyDown={handleDropdownKeyDown}
                aria-haspopup="listbox"
                aria-expanded={dropdownOpen}
                disabled={loading}
              >
                {batchCode || "Select Academic Batch"}
                <svg className="pm-dropdown-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
              </button>
              
              <div className={`pm-dropdown-menu ${dropdownOpen ? 'open' : ''}`} role="listbox" inert={!dropdownOpen ? "true" : undefined}>
                <div className="pm-dropdown-search">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                  <input
                    type="text"
                    placeholder="Search batch (e.g. 1R13)"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => {
                      e.stopPropagation();
                      if (e.key === 'Enter') {
                        e.preventDefault();
                      }
                    }}
                  />
                </div>
                {batchesLoading ? (
                  <div className="pm-dropdown-option" style={{ opacity: 0.5 }}>Loading batches...</div>
                ) : batchesError ? (
                  <div className="pm-dropdown-option" style={{ color: 'var(--status-danger)' }}>{batchesError}</div>
                ) : batches.length === 0 ? (
                  <div className="pm-dropdown-option" style={{ opacity: 0.5 }}>No batches available.</div>
                ) : filteredBatches.length === 0 ? (
                  <div className="pm-dropdown-option" style={{ opacity: 0.5 }}>No batches found.</div>
                ) : (
                  filteredBatches.map((b) => (
                    <button
                      key={b}
                      role="option"
                      aria-selected={batchCode === b}
                      className={`pm-dropdown-option ${batchCode === b ? 'selected' : ''}`}
                      onClick={() => {
                        setBatchCode(b);
                        setDropdownOpen(false);
                        setSearchQuery('');
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setBatchCode(b);
                          setDropdownOpen(false);
                          setSearchQuery('');
                        }
                      }}
                    >
                      {b}
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>

          <div 
            className="pm-toggle-container" 
            onClick={toggleRoommate}
          >
            <div className="pm-toggle-label">
              <span className="pm-toggle-title">
                Roommate
              </span>
              <span className="pm-toggle-helper">Share accommodation</span>
            </div>
            <div 
              className={`pm-toggle-track ${isRoommate ? 'active' : ''}`}
              role="switch"
              aria-checked={isRoommate}
              tabIndex={loading ? -1 : 0}
              onKeyDown={handleRoommateKeyDown}
            >
              <div className="pm-toggle-thumb" />
            </div>
          </div>

          <div className="pm-divider" />

          <button
            type="submit"
            className="pm-cta"
            disabled={loading || !name.trim() || !batchCode}
          >
            {loading ? <div className="pm-spinner" /> : 'Add Friend'}
          </button>
        </form>
      </div>
    </div>
  );
}
