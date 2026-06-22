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
  divider: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    margin: '20px 0',
  },
  dividerLine: {
    flex: 1,
    height: 1,
    background: 'var(--border)',
  },
  dividerText: {
    fontSize: 12,
    color: 'var(--text-muted)',
  },
  googleBtn: {
    width: '100%',
    background: 'transparent',
    color: 'var(--text-primary)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    padding: '10px',
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
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
  const [googleLoading, setGoogleLoading] = useState(false);
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

  async function handleGoogle() {
    setGoogleLoading(true);
    setError('');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (error) {
      setError(error.message);
      setGoogleLoading(false);
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

        <button
          style={{ ...s.googleBtn, opacity: googleLoading ? 0.6 : 1 }}
          onClick={handleGoogle}
          disabled={googleLoading}
        >
          <GoogleIcon />
          {googleLoading ? 'Redirecting…' : 'Continue with Google'}
        </button>

        <div style={s.divider}>
          <div style={s.dividerLine} />
          <span style={s.dividerText}>or</span>
          <div style={s.dividerLine} />
        </div>

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

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}