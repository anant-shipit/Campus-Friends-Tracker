import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { getInviteInfo, regenerateInvite } from '../api/api';
import { useToast } from './ToastProvider';
import './InviteFriend.css';

export default function InviteFriend({ onClose }) {
  const [inviteCode, setInviteCode] = useState('');
  const [expiresAt, setExpiresAt] = useState(null);
  const [isExpired, setIsExpired] = useState(false);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const { showToast } = useToast();

  const baseUrl = window.location.origin;

  useEffect(() => {
    loadInviteInfo();
  }, []);

  const loadInviteInfo = async () => {
    try {
      const data = await getInviteInfo();
      setInviteCode(data.inviteCode);
      setExpiresAt(new Date(data.expiresAt));
      setIsExpired(data.isExpired);
    } catch (err) {
      showToast('Failed to load invite info', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerate = async () => {
    setRegenerating(true);
    try {
      const data = await regenerateInvite();
      setInviteCode(data.inviteCode);
      setExpiresAt(new Date(data.expiresAt));
      setIsExpired(false);
      showToast('New invite link generated!', 'success');
    } catch (err) {
      showToast('Failed to regenerate invite', 'error');
    } finally {
      setRegenerating(false);
    }
  };

  const inviteLink = `${baseUrl}/invite/${inviteCode}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast('Failed to copy', 'error');
    }
  };

  const formatExpiry = (date) => {
    if (!date) return '';
    const now = new Date();
    const diff = date - now;
    if (diff <= 0) return 'Expired';
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 0) return `${hours}h ${mins}m remaining`;
    return `${mins}m remaining`;
  };

  if (loading) {
    return (
      <>
        <div className="overlay-backdrop" onClick={onClose} />
        <div className="invite-modal slide-in-up">
          <div className="invite-modal__header">
            <h2>Invite Friend</h2>
            <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
          </div>
          <div className="invite-modal__body">
            <span className="spinner" />
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="overlay-backdrop" onClick={onClose} />
      <div className="invite-modal slide-in-up">
        <div className="invite-modal__header">
          <h2>Invite Friend</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>

        <div className="invite-modal__body">
          {isExpired ? (
            <>
              <div className="invite-modal__expired">
                ⏰ Your invite link has expired. Generate a new one to share with friends.
              </div>
              <button
                className="invite-modal__regenerate-btn"
                onClick={handleRegenerate}
                disabled={regenerating}
              >
                {regenerating ? 'Generating...' : '🔄 Generate New Link'}
              </button>
            </>
          ) : (
            <>
              <div className="invite-modal__qr-container">
                <QRCodeSVG
                  value={inviteLink}
                  size={180}
                  bgColor="#ffffff"
                  fgColor="#1e1e2e"
                  level="M"
                  includeMargin={false}
                />
              </div>

              <div className="invite-modal__link-box">
                <span className="invite-modal__link-text">{inviteLink}</span>
                <button
                  className={`invite-modal__copy-btn ${copied ? 'invite-modal__copy-btn--copied' : ''}`}
                  onClick={handleCopy}
                >
                  {copied ? '✓ Copied' : '📋 Copy'}
                </button>
              </div>

              <p className="invite-modal__expiry">
                ⏳ <strong>{formatExpiry(expiresAt)}</strong>
              </p>

              <button
                className="invite-modal__regenerate-btn"
                onClick={handleRegenerate}
                disabled={regenerating}
              >
                {regenerating ? 'Generating...' : '🔄 Generate New Link'}
              </button>
            </>
          )}

          <p className="invite-modal__info">
            Share this link or QR code with a friend. When they open it and sign in,
            you&apos;ll be added as friends automatically.
          </p>
        </div>
      </div>
    </>
  );
}
