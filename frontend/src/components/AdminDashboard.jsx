import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { fetchAdminStats, fetchAdminUsers, updateAdminUserRole, deleteAdminUser } from '../api/api';
import './AdminDashboard.css';

export default function AdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [statsData, usersData] = await Promise.all([
        fetchAdminStats(),
        fetchAdminUsers()
      ]);
      setStats(statsData);
      setUsers(usersData.users);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleToggle = async (targetUserId, currentRole) => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    try {
      await updateAdminUserRole(targetUserId, newRole);
      setUsers(users.map(u => u.id === targetUserId ? { ...u, role: newRole } : u));
    } catch (err) {
      alert(`Failed to update role: ${err.message}`);
    }
  };

  const handleDeleteUser = async (targetUserId, userName) => {
    if (!window.confirm(`Are you absolutely sure you want to delete ${userName}? This will remove all their data and friendships.`)) {
      return;
    }
    try {
      await deleteAdminUser(targetUserId);
      setUsers(users.filter(u => u.id !== targetUserId));
      // Refresh stats to reflect deletion
      const newStats = await fetchAdminStats();
      setStats(newStats);
    } catch (err) {
      alert(`Failed to delete user: ${err.message}`);
    }
  };

  if (loading) {
    return <div className="spinner" style={{ margin: '40px auto' }}></div>;
  }

  if (error) {
    return <div className="glass-card" style={{ padding: '20px', color: 'var(--color-lecture)' }}>{error}</div>;
  }

  // Calculate max batch count for proportional bars
  const maxBatchCount = stats?.batchDistribution?.length 
    ? Math.max(...stats.batchDistribution.map(b => b.count)) 
    : 1;

  return (
    <div className="admin-dashboard">
      <div className="admin-header">
        <h2>Admin Controls</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
          Manage users, view system analytics, and assign roles.
        </p>
      </div>

      <div className="admin-stats">
        <div className="glass-card stat-card">
          <span className="stat-value">{stats?.totalUsers || 0}</span>
          <span className="stat-label">Total Users</span>
        </div>
        <div className="glass-card stat-card">
          <span className="stat-value">{stats?.totalFriendships || 0}</span>
          <span className="stat-label">Active Friendships</span>
        </div>
        <div className="glass-card stat-card">
          <span className="stat-value">{users.filter(u => u.role === 'admin').length}</span>
          <span className="stat-label">Admins</span>
        </div>
      </div>

      <div className="glass-card admin-section" style={{ padding: 'var(--space-xl)' }}>
        <h3>Batch Distribution</h3>
        <div className="batch-chart">
          {stats?.batchDistribution?.map((item, idx) => (
            <div key={idx} className="batch-bar-container">
              <span className="batch-label">{item.batch}</span>
              <div className="batch-bar-bg">
                <div 
                  className="batch-bar-fill" 
                  style={{ width: `${(item.count / maxBatchCount) * 100}%` }}
                ></div>
              </div>
              <span className="batch-count">{item.count}</span>
            </div>
          ))}
          {!stats?.batchDistribution?.length && <p style={{color: 'var(--text-tertiary)'}}>No batch data yet.</p>}
        </div>
      </div>

      <div className="glass-card admin-section" style={{ padding: 'var(--space-xl)' }}>
        <h3>Registered Users</h3>
        <div className="users-table-container">
          <table className="users-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Batch</th>
                <th>Joined</th>
                <th>Admin Role</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div className="user-cell">
                      <img src={u.pictureUrl || 'https://via.placeholder.com/32'} alt="avatar" className="user-avatar" />
                      <div className="user-info">
                        <span className="user-name">{u.name} {u.id === user?.id && '(You)'}</span>
                        <span className="user-email">{u.email}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    {u.batchCode ? <span className="chip chip-free">{u.batchCode}</span> : <span className="chip" style={{background: 'rgba(255,255,255,0.1)'}}>None</span>}
                  </td>
                  <td style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                  <td>
                    <label className="toggle-switch">
                      <input 
                        type="checkbox" 
                        checked={u.role === 'admin'}
                        onChange={() => handleRoleToggle(u.id, u.role)}
                        disabled={u.id === user?.id} // Don't let users demote themselves easily
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </td>
                  <td>
                    <button 
                      className="btn btn-danger btn-sm"
                      onClick={() => handleDeleteUser(u.id, u.name)}
                      disabled={u.id === user?.id}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
