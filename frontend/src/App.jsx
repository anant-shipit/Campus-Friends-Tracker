import { useState, useEffect, useCallback, createContext } from 'react';
import './App.css';
import Dashboard from './components/Dashboard';
import AddFriendModal from './components/AddFriendModal';
import FriendDetail from './components/FriendDetail';
import CommonFreeTime from './components/CommonFreeTime';
import PrivateSession from './components/PrivateSession';
import EmptyRoomFinder from './components/EmptyRoomFinder';
import { ToastProvider } from './components/ToastProvider';
import StarField from './components/StarField';
import { fetchAndCacheTimetable, getCachedTimetable } from './utils/timetableCache';
import { getTodayIndex } from './utils/timeUtils';

// Pixel icons
import { IconGraduation, IconFriends, IconCalendar, IconLock, IconBuilding, IconHeart } from './components/PixelIcons';

const ViewContext = createContext();

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
      <StarField />
      <div className="app">
        {/* Header */}
        <header className="app-header">
          <div className="app-header__inner app-container">
            <div className="app-header__brand">
              <span className="app-header__emoji">
                <IconGraduation size={40} />
              </span>
              <div>
                <h1 className="app-header__title">Campus Friends</h1>
                <p className="app-header__subtitle">
                  {todayName} • {timeStr}
                  {isWeekend && ' • weekend — everyone free'}
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <nav className="app-header__nav">
                <button
                  className={`app-nav-btn ${view === 'dashboard' ? 'app-nav-btn--active' : ''}`}
                  onClick={() => setView('dashboard')}
                >
                  <IconFriends size={28} className="nav-icon" style={{ display: 'block', margin: '0 auto 6px' }} />
                  Friends
                </button>
                <button
                  className={`app-nav-btn ${view === 'common' ? 'app-nav-btn--active' : ''}`}
                  onClick={() => setView('common')}
                >
                  <IconCalendar size={28} className="nav-icon" style={{ display: 'block', margin: '0 auto 6px' }} />
                  Common Free
                </button>
                <button
                  className={`app-nav-btn ${view === 'private' ? 'app-nav-btn--active' : ''}`}
                  onClick={() => setView('private')}
                >
                  <IconLock size={28} className="nav-icon" style={{ display: 'block', margin: '0 auto 6px' }} />
                  Private Session
                </button>
                <button
                  className={`app-nav-btn ${view === 'rooms' ? 'app-nav-btn--active' : ''}`}
                  onClick={() => setView('rooms')}
                >
                  <IconBuilding size={28} className="nav-icon" style={{ display: 'block', margin: '0 auto 6px' }} />
                  Find Room
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
              onAddFriend={() => {
                setAddFriendDefaultRoommate(false);
                setShowAddFriend(true);
              }}
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
          {view === 'rooms' && <EmptyRoomFinder />}
        </main>

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

        {/* Footer */}
        <footer className="app-footer">
          <p className="app-footer__text">
            Made with <IconHeart size={14} title="love" className="app-footer__heart" style={{ color: 'var(--color-lecture)', display: 'inline-block', verticalAlign: 'middle' }} /> by{' '}
            <a
              href="https://github.com/anant-shipit"
              target="_blank"
              rel="noopener noreferrer"
              className="app-footer__link"
            >
              Anant
            </a>
          </p>
        </footer>
      </div>
    </ViewContext.Provider>
  );
}

export default App;
