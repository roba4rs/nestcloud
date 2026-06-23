import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabase';

function SearchIcon({ size = 15, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
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

function ChevronDownIcon({ size = 13, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

export default function TopBar({ user, onSearch, isMobile = false, onOpenMeMenu }) {
  const [query, setQuery] = useState('');
  const [avatarError, setAvatarError] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const avatarUrl = user?.user_metadata?.avatar_url;
  const initials = (user?.email || 'U').charAt(0).toUpperCase();
  const displayName = user?.user_metadata?.full_name || user?.email || 'Account';
  const email = user?.email || '';

  function handleSearch(e) {
    const val = e.target.value;
    setQuery(val);
    onSearch?.(val);
  }

  useEffect(() => {
    function handleClick(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <header style={{
      height: 58,
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '0 20px',
      borderBottom: '1px solid var(--border)',
      background: 'var(--bg-card)',
      flexShrink: 0,
      position: 'relative',
      zIndex: 10,
    }}>

      <div style={{ flex: 1, maxWidth: 480, position: 'relative', display: 'flex', alignItems: 'center' }}>
        <span style={{ position: 'absolute', left: 11, pointerEvents: 'none', display: 'flex' }}>
          <SearchIcon size={15} color="var(--text-muted)" />
        </span>
        <input
          type="text"
          placeholder="Search files and folders..."
          value={query}
          onChange={handleSearch}
          style={{
            width: '100%',
            height: 36,
            paddingLeft: 36,
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

      <div style={{ flex: 1 }} />

      {!isMobile ? (
        <div ref={dropdownRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setDropdownOpen(o => !o)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              padding: '4px 8px 4px 4px',
              borderRadius: 99,
              border: '1px solid var(--border)',
              background: dropdownOpen ? 'var(--bg-surface-2)' : 'transparent',
              cursor: 'pointer',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => { if (!dropdownOpen) e.currentTarget.style.background = 'var(--bg-hover)'; }}
            onMouseLeave={e => { if (!dropdownOpen) e.currentTarget.style.background = 'transparent'; }}
          >
            {avatarUrl && !avatarError ? (
              <img
                src={avatarUrl}
                alt="avatar"
                onError={() => setAvatarError(true)}
                style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }}
              />
            ) : (
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                background: 'var(--brand)', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontSize: 12, fontWeight: 700, flexShrink: 0,
              }}>
                {initials}
              </div>
            )}
            <ChevronDownIcon size={13} color="var(--text-muted)" />
          </button>

          {dropdownOpen && (
            <div style={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              right: 0,
              width: 220,
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              boxShadow: '0 4px 20px rgba(0,0,0,0.10)',
              zIndex: 100,
              overflow: 'hidden',
            }}>
              <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {avatarUrl && !avatarError ? (
                    <img src={avatarUrl} alt="avatar" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{
                      width: 36, height: 36, borderRadius: '50%',
                      background: 'var(--brand)', display: 'flex',
                      alignItems: 'center', justifyContent: 'center',
                      color: '#fff', fontSize: 14, fontWeight: 700, flexShrink: 0,
                    }}>
                      {initials}
                    </div>
                  )}
                  <div style={{ minWidth: 0 }}>
                    <p style={{
                      margin: 0, fontSize: 13.5, fontWeight: 600,
                      color: 'var(--text-primary)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {displayName}
                    </p>
                    {email && (
                      <p style={{
                        margin: 0, fontSize: 11.5, color: 'var(--text-muted)',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {email}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div style={{ padding: '6px' }}>
                <button
                  onClick={async () => { setDropdownOpen(false); await supabase.auth.signOut(); }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 9,
                    padding: '8px 10px',
                    borderRadius: 8,
                    border: 'none',
                    background: 'transparent',
                    color: 'var(--danger)',
                    fontSize: 13.5,
                    fontFamily: 'var(--font-ui)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'background 0.12s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--danger-bg)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <LogOutIcon size={15} color="var(--danger)" />
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div onClick={onOpenMeMenu} style={{ cursor: 'pointer' }}>
          {avatarUrl && !avatarError ? (
            <img
              src={avatarUrl}
              alt="avatar"
              onError={() => setAvatarError(true)}
              style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--border)', display: 'block' }}
            />
          ) : (
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: 'var(--brand)', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: 13, fontWeight: 700,
              border: '2px solid var(--border)',
            }}>
              {initials}
            </div>
          )}
        </div>
      )}

    </header>
  );
}