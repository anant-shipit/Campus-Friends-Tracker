import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import './App.css';
import { useAuth } from './contexts/AuthContext';
import LoginPage from './components/LoginPage';
import Dashboard from './components/Dashboard';
import InviteFriend from './components/InviteFriend';
import FriendDetail from './components/FriendDetail';
import CommonFreeTime from './components/CommonFreeTime';
import BatchReminder from './components/BatchReminder';
import AcceptInvitePage from './components/AcceptInvitePage';
import AdminDashboard from './components/AdminDashboard';
import { ToastProvider } from './components/ToastProvider';
import { acceptInvite } from './api/api';

const ViewContext = createContext();
export const useView = () => useContext(ViewContext);

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

function getTodayIndex() {
  const d = new Date().getDay(); // 0=Sun, 1=Mon...
  if (d >= 1 && d <= 5) return d - 1;
  return 0; // default to Monday on weekends
}

function App() {
  return (
    <ToastProvider>
      <Routes>
        <Route path="/invite/:code" element={<AcceptInvitePage />} />
        <Route path="/*" element={<MainApp />} />
      </Routes>
    </ToastProvider>
  );
}

function MainApp() {
  const { user, isAuthenticated, loading, logout } = useAuth();
  const navigate = useNavigate();
  const [view, setView] = useState('dashboard'); // 'dashboard' | 'common' | 'admin'
  const [showInvite, setShowInvite] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update clock every minute
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Handle pending invite after login.
  useEffect(() => {
    if (isAuthenticated) {
      const pendingInvite = localStorage.getItem('pending_invite');
      if (pendingInvite) {
        localStorage.removeItem('pending_invite');
        navigate(`/invite/${pendingInvite}`);
      }
    }
  }, [isAuthenticated, navigate]);

  const triggerRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  // Show loading spinner while checking auth.
  if (loading) {
    return (
      <div className="app" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
      }}>
        <span className="spinner" />
      </div>
    );
  }

  // Show login page if not authenticated.
  if (!isAuthenticated) {
    return <LoginPage />;
  }

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
                {user?.role === 'admin' && (
                  <button
                    className={`app-nav-btn ${view === 'admin' ? 'app-nav-btn--active' : ''}`}
                    style={{ color: view === 'admin' ? 'var(--text-primary)' : 'var(--color-tutorial)' }}
                    onClick={() => setView('admin')}
                  >
                    ⚙️ Admin
                  </button>
                )}
              </nav>
              {/* User avatar + logout */}
              <div className="user-menu">
                {user?.pictureUrl && (
                  <img
                    src={user.pictureUrl}
                    alt={user.name}
                    className="user-menu__avatar"
                    title={`${user.name}\n${user.email}`}
                  />
                )}
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={logout}
                  title="Sign out"
                  style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                >
                  ↪ Out
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="app-container">
          <BatchReminder />

          {view === 'dashboard' && (
            <Dashboard
              refreshKey={refreshKey}
              onSelectFriend={setSelectedFriend}
              onRefresh={triggerRefresh}
            />
          )}
          {view === 'common' && <CommonFreeTime />}
          {view === 'admin' && user?.role === 'admin' && <AdminDashboard />}
        </main>

        {/* FAB — Invite Friend */}
        {view === 'dashboard' && (
          <button
            className="fab"
            onClick={() => setShowInvite(true)}
            aria-label="Invite friend"
            id="invite-friend-fab"
          >
            <span className="fab__icon">+</span>
          </button>
        )}

        {/* Modals */}
        {showInvite && (
          <InviteFriend
            onClose={() => setShowInvite(false)}
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
  );
}

export default App;
