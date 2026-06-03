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
    fetchAndCacheTimetable().then((tt) => {
      if (tt) setTimetable(tt);
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
              <span className="app-header__emoji">🎓</span>
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
                  👥 Friends
                </button>
                <button
                  className={`app-nav-btn ${view === 'common' ? 'app-nav-btn--active' : ''}`}
                  onClick={() => setView('common')}
                >
                  📅 Common Free
                </button>
                <button
                  className={`app-nav-btn ${view === 'private' ? 'app-nav-btn--active' : ''}`}
                  onClick={() => setView('private')}
                >
                  🏠 Private Session
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
              timetable={timetable} 
              onAddRoommate={() => {
                setAddFriendDefaultRoommate(true);
                setShowAddFriend(true);
              }}
              onSelectFriend={setSelectedFriend}
              onRefresh={triggerRefresh}
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
