import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import './App.css';
import Dashboard from './components/Dashboard';
import AddFriend from './components/AddFriend';
import FriendDetail from './components/FriendDetail';
import CommonFreeTime from './components/CommonFreeTime';
import { ToastProvider } from './components/ToastProvider';

const ViewContext = createContext();
export const useView = () => useContext(ViewContext);

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

function getTodayIndex() {
  const d = new Date().getDay(); // 0=Sun, 1=Mon...
  if (d >= 1 && d <= 5) return d - 1;
  return 0; // default to Monday on weekends
}

function App() {
  const [view, setView] = useState('dashboard'); // 'dashboard' | 'common'
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update clock every minute
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
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
    <ToastProvider>
      <ViewContext.Provider value={{ view, setView, triggerRefresh }}>
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
              </nav>
            </div>
          </header>

          {/* Main Content */}
          <main className="app-container">
            {view === 'dashboard' && (
              <Dashboard
                refreshKey={refreshKey}
                onSelectFriend={setSelectedFriend}
                onRefresh={triggerRefresh}
              />
            )}
            {view === 'common' && <CommonFreeTime />}
          </main>

          {/* FAB */}
          {view === 'dashboard' && (
            <button
              className="fab"
              onClick={() => setShowAddFriend(true)}
              aria-label="Add friend"
              id="add-friend-fab"
            >
              <span className="fab__icon">+</span>
            </button>
          )}

          {/* Modals */}
          {showAddFriend && (
            <AddFriend
              onClose={() => setShowAddFriend(false)}
              onAdded={() => {
                setShowAddFriend(false);
                triggerRefresh();
              }}
            />
          )}

          {selectedFriend && (
            <FriendDetail
              friend={selectedFriend}
              onClose={() => setSelectedFriend(null)}
              initialDay={isWeekend ? 0 : getTodayIndex()}
            />
          )}
        </div>
      </ViewContext.Provider>
    </ToastProvider>
  );
}

export default App;
