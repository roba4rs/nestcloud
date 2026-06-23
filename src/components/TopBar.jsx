import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

// ── Icons ─────────────────────────────────────────────────────────────────────

function SearchIcon({ size = 16, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function GridIcon({ size = 16, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
    </svg>
  );
}

function ListIcon({ size = 16, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  );
}

function LogOutIcon({ size = 15, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

// ── TopBar ────────────────────────────────────────────────────────────────────

export default function TopBar({ user, view = 'list', onViewChange, onSearch, isMobile = false, onOpenMeMenu }) {
  const [query, setQuery] = useState('');
  const [avatarError, setAvatarError] = useState(false);

  const avatarUrl = user?.user_metadata?.avatar_url;
  const initials = (user?.email || 'U').charAt(0).toUpperCase();

  function handleSearch(e) {
    const val = e.target.value;
    setQuery(val);
    onSearch?.(val);
  }

  return (
    <header style={{
      height: 60,
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '0 20px',
      borderBottom: '1px solid var(--border)',
      background: 'var(--bg-card)',
      flexShrink: 0,
    }}>

      {/* Search */}
      <div style={{
        flex: 1,
        maxWidth: 480,
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
      }}>
        <span style={{ position: 'absolute', left: 12, pointerEvents: 'none', display: 'flex' }}>
          <SearchIcon size={15} color="var(--text-muted)" />
        </span>
        <input
          type="text"
          placeholder="Search files and folders…"
          value={query}
          onChange={handleSearch}
          style={{
            width: '100%',
            height: 38,
            paddingLeft: 38,
            paddingRight: 14,
            borderRadius: 8,
            border: '1px solid var(--border)',
            background: 'var(--bg-input)',
            color: 'var(--text-primary)',
            fontSize: 13.5,
            fontFamily: 'var(--font-ui)',
            outline: 'none',
            transition: 'border-color 0.15s',
          }}
          onFocus={e => e.target.style.borderColor = 'var(--border-focus)'}
          onBlur={e => e.target.style.borderColor = 'var(--border)'}
        />
      </div>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* View toggle */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        background: 'var(--bg-input)',
        borderRadius: 8,
        padding: 3,
        border: '1px solid var(--border)',
      }}>
        {[
          { key: 'grid', Icon: GridIcon },
          { key: 'list', Icon: ListIcon },
        ].map(({ key, Icon }) => (
          <button
            key={key}
            onClick={() => onViewChange?.(key)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 30,
              height: 30,
              borderRadius: 6,
              border: 'none',
              cursor: 'pointer',
              background: view === key ? 'var(--brand)' : 'transparent',
              color: view === key ? '#fff' : 'var(--text-muted)',
              transition: 'background 0.15s, color 0.15s',
            }}
          >
            <Icon size={15} color={view === key ? '#fff' : 'var(--text-muted)'} />
          </button>
        ))}
      </div>

      {/* Avatar */}
      <div
        onClick={isMobile ? onOpenMeMenu : undefined}
        style={{ position: 'relative', cursor: isMobile ? 'pointer' : 'default' }}
      >
        {avatarUrl && !avatarError ? (
          <img
            src={avatarUrl}
            alt="avatar"
            onError={() => setAvatarError(true)}
            style={{
              width: 34,
              height: 34,
              borderRadius: '50%',
              objectFit: 'cover',
              border: '2px solid var(--border)',
            }}
          />
        ) : (
          <div style={{
            width: 34,
            height: 34,
            borderRadius: '50%',
            background: 'var(--brand)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: 13,
            fontWeight: 700,
            border: '2px solid var(--border)',
          }}>
            {initials}
          </div>
        )}
      </div>

      {/* Sign out — desktop only; on mobile this lives in the bottom nav's "Me" sheet */}
      {!isMobile && (
        <button
          onClick={async () => { await supabase.auth.signOut(); }}
          title="Sign out"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '7px 12px',
            borderRadius: 8,
            border: '1px solid var(--border)',
            background: 'transparent',
            color: 'var(--text-secondary)',
            fontSize: 13,
            fontFamily: 'var(--font-ui)',
            cursor: 'pointer',
            transition: 'border-color 0.15s, color 0.15s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = 'var(--danger)';
            e.currentTarget.style.color = 'var(--danger)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = 'var(--border)';
            e.currentTarget.style.color = 'var(--text-secondary)';
          }}
        >
          <LogOutIcon size={15} />
          Sign out
        </button>
      )}

    </header>
  );
}