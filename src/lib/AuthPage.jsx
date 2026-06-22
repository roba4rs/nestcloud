import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

const s = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px 16px',
    background: 'var(--bg-page)',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginBottom: 40,
  },
  logoIcon: {
    width: 36,
    height: 36,
    background: 'var(--brand)',
    borderRadius: 10,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: 20,
    fontWeight: 600,
    color: 'var(--text-primary)',
    letterSpacing: '-0.3px',
  },
  card: {
    width: '100%',
    maxWidth: 400,
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    padding: '32px 24px',
  },
  heading: {
    fontSize: 18,
    fontWeight: 600,
    color: 'var(--text-primary)',
    marginBottom: 6,
  },
  sub: {
    fontSize: 13,
    color: 'var(--text-secondary)',
    marginBottom: 28,
  },
  field: {
    marginBottom: 16,
  },
  label: {
    display: 'block',
    fontSize: 11,
    fontWeight: 500,
    color: 'var(--text-secondary)',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  },
  input: {
    width: '100%',
    background: 'var(--bg-input)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    padding: '10px 12px',
    fontSize: 14,
    color: 'var(--text-primary)',
    outline: 'none',
  },
  btn: {
    width: '100%',
    background: 'var(--brand)',
    color: '#fff',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    padding: '11px',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    marginTop: 8,
  },
  toggle: {
    marginTop: 20,
    textAlign: 'center',
    fontSize: 13,
    color: 'var(--text-secondary)',
  },
  toggleBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--brand-light)',
    fontWeight: 500,
    cursor: 'pointer',
    padding: 0,
    fontSize: 13,
  },
  error: {
    background: 'var(--danger-dim)',
    border: '1px solid var(--danger)',
    borderRadius: 'var(--radius-sm)',
    padding: '10px 12px',
    fontSize: 13,
    color: 'var(--danger)',
    marginBottom: 16,
  },
  success: {
    background: 'rgba(34,197,94,0.1)',
    border: '1px solid var(--success)',
    borderRadius: 'var(--radius-sm)',
    padding: '10px 12px',
    fontSize: 13,
    color: 'var(--success)',
    marginBottom: 16,
  },
};

export default function AuthPage() {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMessage('Check your email to confirm your account.');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function switchMode() {
    setMode(mode === 'login' ? 'signup' : 'login');
    setError('');
    setMessage('');
  }

  return (
    <div style={s.page}>
      <div style={s.logo}>
        <div style={s.logoIcon}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M18 10a6 6 0 0 0-11.6-1.4A4 4 0 1 0 6 17h12a4 4 0 0 0 0-8z" fill="#fff" />
          </svg>
        </div>
        <span style={s.logoText}>NestCloud</span>
      </div>

      <div style={s.card}>
        <h1 style={s.heading}>{mode === 'login' ? 'Sign in' : 'Create account'}</h1>
        <p style={s.sub}>{mode === 'login' ? 'Welcome back.' : 'Start with 100 GB free.'}</p>

        {error && <div style={s.error}>{error}</div>}
        {message && <div style={s.success}>{message}</div>}

        <form onSubmit={handleSubmit}>
          <div style={s.field}>
            <label style={s.label}>Email</label>
            <input
              style={s.input}
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoComplete="email"
              onFocus={e => (e.target.style.borderColor = 'var(--border-focus)')}
              onBlur={e => (e.target.style.borderColor = 'var(--border)')}
            />
          </div>
          <div style={s.field}>
            <label style={s.label}>Password</label>
            <input
              style={s.input}
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              onFocus={e => (e.target.style.borderColor = 'var(--border-focus)')}
              onBlur={e => (e.target.style.borderColor = 'var(--border)')}
            />
          </div>
          <button
            type="submit"
            style={{ ...s.btn, opacity: loading ? 0.6 : 1 }}
            disabled={loading}
          >
            {loading ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <div style={s.toggle}>
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button style={s.toggleBtn} onClick={switchMode}>
            {mode === 'login' ? 'Sign up' : 'Sign in'}
          </button>
        </div>
      </div>
    </div>
  );
}