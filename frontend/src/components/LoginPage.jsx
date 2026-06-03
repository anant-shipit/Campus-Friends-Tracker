import { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../contexts/AuthContext';
import './LoginPage.css';

export default function LoginPage() {
  const { login, error, setError } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleGoogleSuccess = async (credentialResponse) => {
    setLoading(true);
    setError(null);
    try {
      await login(credentialResponse.credential);
    } catch (err) {
      // Error is set in the auth context.
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleError = () => {
    setError('Google sign-in failed. Please try again.');
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-card__logo">🎓</div>
        <h1 className="login-card__title">Campus Friends</h1>
        <p className="login-card__subtitle">Track your friends&apos; schedules</p>

        <div className="login-card__university">
          🏛️ Thapar Institute of Engineering & Technology
        </div>

        <div className="login-card__divider" />

        <p className="login-card__instruction">
          Sign in with your <strong>@thapar.edu</strong> Google account to get started.
        </p>

        {!import.meta.env.VITE_GOOGLE_CLIENT_ID && (
          <div className="login-card__error" style={{ background: 'rgba(245, 158, 11, 0.15)', borderColor: 'rgba(245, 158, 11, 0.4)', color: '#fcd34d' }}>
            ⚠️ Configuration Warning: Google Client ID is missing. Please set VITE_GOOGLE_CLIENT_ID in your environment variables.
          </div>
        )}

        {error && (
          <div className="login-card__error">
            ⚠️ {error}
          </div>
        )}

        {loading ? (
          <div className="login-card__loading">
            <span className="spinner spinner-sm" />
            Signing you in...
          </div>
        ) : (
          <div className="login-card__google-wrapper">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleError}
              theme="filled_blue"
              shape="pill"
              size="large"
              text="signin_with"
              width="300"
            />
          </div>
        )}

        <p className="login-card__footer">
          Only @thapar.edu email addresses are accepted
        </p>
      </div>
    </div>
  );
}
