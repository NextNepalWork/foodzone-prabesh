import React, { useState } from 'react';
import { getApiUrl } from '../../config/api';
import useHaptics from '../hooks/useHaptics';

const LoginScreen = ({ onAuthed }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const haptics = useHaptics();

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password || loading) return;
    setLoading(true);
    setError('');
    try {
      const isAdmin = username === 'admin';
      const endpoint = isAdmin ? '/api/admin/auth' : '/api/staff/auth';
      const resp = await fetch(`${getApiUrl()}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await resp.json();
      if (resp.ok && data.success) {
        localStorage.setItem('adminToken', data.token);
        localStorage.setItem('adminAuthenticated', 'true');
        if (data.user && data.user.role && data.user.role !== 'admin') {
          const role = data.user.role.toLowerCase();
          if (role === 'chef' || role === 'waiter') { window.location.href = '/staff'; return; }
          if (role === 'cashier') { window.location.href = '/reception'; return; }
        }
        haptics.success();
        onAuthed && onAuthed(data);
      } else {
        haptics.warn();
        setError(data.message || 'Login failed');
      }
    } catch (err) {
      haptics.warn();
      setError('Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'absolute', inset: 0, paddingTop: 'var(--sa-top)', paddingBottom: 'var(--sa-bottom)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{
            width: 72, height: 72, margin: '0 auto 16px',
            borderRadius: 18,
            background: 'linear-gradient(135deg, var(--m-brand), var(--m-brand-2))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 36, boxShadow: '0 10px 30px rgba(225, 29, 72, 0.3)'
          }}>🍽️</div>
          <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.4px' }}>Food Zone</div>
          <div style={{ fontSize: 14, color: 'var(--m-text-2)', marginTop: 4 }}>Admin Console</div>
        </div>

        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            className="m-input"
            type="text"
            placeholder="Username"
            autoComplete="username"
            autoCapitalize="none"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <div style={{ position: 'relative' }}>
            <input
              className="m-input"
              type={showPw ? 'text' : 'password'}
              placeholder="Password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ paddingRight: 50 }}
            />
            <button
              type="button"
              onClick={() => setShowPw(v => !v)}
              style={{
                position: 'absolute', right: 8, top: 8, bottom: 8,
                width: 36, border: 'none', background: 'transparent',
                color: 'var(--m-text-2)', fontSize: 18, cursor: 'pointer'
              }}
              aria-label="Show password"
            >
              {showPw ? '🙈' : '👁️'}
            </button>
          </div>

          {error && (
            <div style={{ background: '#fee2e2', color: '#991b1b', padding: '10px 14px', borderRadius: 10, fontSize: 13, fontWeight: 500 }}>
              {error}
            </div>
          )}

          <button className="m-btn-primary" type="submit" disabled={loading} style={{ marginTop: 10 }}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: 'var(--m-text-2)' }}>
          Foodzone.com.np · v1.0
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
