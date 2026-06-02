import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { acceptInvite } from '../api/api';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from './ToastProvider';

export default function AcceptInvitePage() {
  const { code } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { showToast } = useToast();
  const [status, setStatus] = useState('loading'); // loading | success | error
  const [friendName, setFriendName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!isAuthenticated) {
      // Store the invite code so we can accept after login.
      localStorage.setItem('pending_invite', code);
      return;
    }

    doAccept();
  }, [isAuthenticated, code]);

  const doAccept = async () => {
    try {
      const data = await acceptInvite(code);
      setFriendName(data.friend?.name || 'your friend');
      setStatus('success');
      showToast(`You're now friends with ${data.friend?.name || 'them'}!`, 'success');
      localStorage.removeItem('pending_invite');
      setTimeout(() => navigate('/'), 2000);
    } catch (err) {
      setErrorMsg(err.message);
      setStatus('error');
      localStorage.removeItem('pending_invite');
    }
  };

  if (!isAuthenticated) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '20px',
        color: 'rgba(255,255,255,0.7)',
      }}>
        <div>
          <p style={{ fontSize: '3rem', marginBottom: '16px' }}>🔗</p>
          <h2 style={{ color: '#fff', marginBottom: '8px' }}>Friend Invite</h2>
          <p>Please sign in first to accept this invite.</p>
          <p style={{ fontSize: '0.8rem', marginTop: '12px', color: 'rgba(255,255,255,0.4)' }}>
            You&apos;ll be redirected back here after signing in.
          </p>
        </div>
      </div>
    );
  }

  if (status === 'loading') {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'rgba(255,255,255,0.7)',
      }}>
        <div style={{ textAlign: 'center' }}>
          <span className="spinner" style={{ marginBottom: '16px' }} />
          <p>Accepting invite...</p>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'rgba(255,255,255,0.7)',
      }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '3rem', marginBottom: '16px' }}>🎉</p>
          <h2 style={{ color: '#fff', marginBottom: '8px' }}>You&apos;re friends with {friendName}!</h2>
          <p>Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'rgba(255,255,255,0.7)',
      padding: '20px',
    }}>
      <div style={{ textAlign: 'center', maxWidth: '400px' }}>
        <p style={{ fontSize: '3rem', marginBottom: '16px' }}>😕</p>
        <h2 style={{ color: '#fff', marginBottom: '8px' }}>Couldn&apos;t accept invite</h2>
        <p style={{ marginBottom: '16px' }}>{errorMsg}</p>
        <button className="btn btn-primary" onClick={() => navigate('/')}>
          Go to Dashboard
        </button>
      </div>
    </div>
  );
}
