import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import './App.css';
import Dashboard from './components/Dashboard';
import AddFriendModal from './components/AddFriendModal';
import FriendDetail from './components/FriendDetail';
import CommonFreeTime from './components/CommonFreeTime';
import PrivateSession from './components/PrivateSession';
import { ToastProvider } from './components/ToastProvider';
import { fetchAndCacheTimetable, getCachedTimetable } from './utils/timetableCache';
import { getTodayIndex } from './utils/timeUtils';

const ViewContext = createContext();
export const useView = () => useContext(ViewContext);

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

function App() {
  return (
    <ToastProvider>
      <MainApp />
    </ToastProvider>
  );
}

function MainApp() {
  const [view, setView] = useState('dashboard');
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [addFriendDefaultRoommate, setAddFriendDefaultRoommate] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [timetable, setTimetable] = useState(() => getCachedTimetable());

  // Update clock every minute.
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Fetch and cache timetable on mount (will use cache if offline).
  useEffect(() => {
    fetchAndCacheTimetable()
      .then((tt) => {
        if (tt) setTimetable(tt);
      })
      .catch((err) => {
        console.error("Failed to fetch and cache timetable:", err);
      });
  }, []);

  const triggerRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  const now = currentTime;
  const dayIndex = now.getDay();
  const isWeekend = dayIndex === 0 || dayIndex === 6;
  const todayName = isWeekend
    ? 'Weekend'
    : DAY_NAMES[dayIndex - 1];

  const timeStr = now.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata',
  });

  return (
    <ViewContext.Provider value={{ view, setView, triggerRefresh, timetable }}>
      <div className="app">
        {/* Header */}
        <header className="app-header">
          <div className="app-header__inner app-container">
            <div className="app-header__brand">
              <span className="app-header__emoji">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{color: 'var(--brand-primary)'}}><path d="M22 10v6M2 10l10-5 10 5-10 5z"></path><path d="M6 12v5c3 3 9 3 12 0v-5"></path></svg>
              </span>
              <div>
                <h1 className="app-header__title">Campus Friends</h1>
                <p className="app-header__subtitle">
                  {todayName} • {timeStr}
                  {isWeekend && ' • Everyone is free! 🎉'}
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <nav className="app-header__nav">
                <button
                  className={`app-nav-btn ${view === 'dashboard' ? 'app-nav-btn--active' : ''}`}
                  onClick={() => setView('dashboard')}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '6px', verticalAlign: 'text-bottom'}}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                  Friends
                </button>
                <button
                  className={`app-nav-btn ${view === 'common' ? 'app-nav-btn--active' : ''}`}
                  onClick={() => setView('common')}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '6px', verticalAlign: 'text-bottom'}}><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                  Common Free
                </button>
                <button
                  className={`app-nav-btn ${view === 'private' ? 'app-nav-btn--active' : ''}`}
                  onClick={() => setView('private')}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '6px', verticalAlign: 'text-bottom'}}><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
                  Private Session
                </button>
              </nav>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="app-container">
          {view === 'dashboard' && (
            <Dashboard
              refreshKey={refreshKey}
              timetable={timetable}
              onSelectFriend={setSelectedFriend}
              onRefresh={triggerRefresh}
            />
          )}
          {view === 'common' && <CommonFreeTime timetable={timetable} />}
          {view === 'private' && (
            <PrivateSession 
              refreshKey={refreshKey}
              timetable={timetable} 
              onAddRoommate={() => {
                setAddFriendDefaultRoommate(true);
                setShowAddFriend(true);
              }}
              onSelectFriend={setSelectedFriend}
            />
          )}
        </main>

        {/* FAB — Add Friend */}
        {view === 'dashboard' && (
          <button
            className="fab"
            onClick={() => {
              setAddFriendDefaultRoommate(false);
              setShowAddFriend(true);
            }}
            aria-label="Add friend"
            id="add-friend-fab"
          >
            <span className="fab__icon">+</span>
          </button>
        )}

        {/* Modals */}
        {showAddFriend && (
          <AddFriendModal
            onClose={() => setShowAddFriend(false)}
            onSuccess={triggerRefresh}
            defaultIsRoommate={addFriendDefaultRoommate}
          />
        )}

        {selectedFriend && (
          <FriendDetail
            friend={selectedFriend}
            timetable={timetable}
            onClose={() => setSelectedFriend(null)}
            initialDay={isWeekend ? 0 : getTodayIndex()}
          />
        )}
      </div>
    </ViewContext.Provider>
  );
}

export default App;
