import React from 'react';
import { supabase } from '../lib/supabase';

// ── Icons ─────────────────────────────────────────────────────────────────────

function CloudIcon({ size = 22, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
    </svg>
  );
}

function ClockIcon({ size = 22, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function SearchIcon({ size = 22, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function UserIcon({ size = 22, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function LogOutIcon({ size = 18, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

// ── Tabs config ───────────────────────────────────────────────────────────────

const TABS = [
  { key: 'drive',  label: 'My Drive', Icon: CloudIcon  },
  { key: 'recent', label: 'Recent',   Icon: ClockIcon  },
  { key: 'search', label: 'Search',   Icon: SearchIcon },
  { key: 'me',     label: 'Me',       Icon: UserIcon   },
];

// ── BottomTabBar ──────────────────────────────────────────────────────────────

export default function BottomTabBar({ activeTab = 'drive', onTabChange, user, meSheetOpen = false, onMeSheetOpenChange }) {
  function setMeSheetOpen(open) {
    onMeSheetOpenChange?.(open);
  }

  function handleTabClick(key) {
    if (key === 'me') {
      setMeSheetOpen(true);
      return;
    }
    onTabChange?.(key);
  }

  async function handleSignOut() {
    setMeSheetOpen(false);
    await supabase.auth.signOut();
  }

  const avatarUrl = user?.user_metadata?.avatar_url;
  const initials = (user?.email || 'U').charAt(0).toUpperCase();

  return (
    <>
      <nav style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: 64,
        display: 'flex',
        alignItems: 'stretch',
        background: 'var(--bg-card)',
        borderTop: '1px solid var(--border)',
        zIndex: 100,
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}>
        {TABS.map(({ key, label, Icon }) => {
          const active = key === 'me' ? meSheetOpen : activeTab === key;
          return (
            <button
              key={key}
              onClick={() => handleTabClick(key)}
              style={{
                flex: 1,
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                color: active ? 'var(--brand)' : 'var(--text-muted)',
                transition: 'color 0.15s',
                padding: '8px 0',
              }}
            >
              <Icon size={22} color={active ? 'var(--brand)' : 'var(--text-muted)'} />
              <span style={{
                fontSize: 10.5,
                fontWeight: active ? 600 : 400,
                fontFamily: 'var(--font-ui)',
                letterSpacing: '0.01em',
              }}>
                {label}
              </span>
              {active && (
                <span style={{
                  position: 'absolute',
                  bottom: 0,
                  width: 32,
                  height: 2.5,
                  borderRadius: 99,
                  background: 'var(--brand)',
                }} />
              )}
            </button>
          );
        })}
      </nav>

      {/* "Me" bottom sheet */}
      {meSheetOpen && (
        <>
          <div
            onClick={() => setMeSheetOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.55)',
              zIndex: 150,
            }}
          />
          <div style={{
            position: 'fixed',
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 151,
            background: 'var(--bg-card)',
            borderTop: '1px solid var(--border)',
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            padding: '20px 16px',
            paddingBottom: 'calc(20px + env(safe-area-inset-bottom))',
            boxShadow: '0 -8px 32px rgba(0,0,0,0.4)',
          }}>
            {/* Drag handle */}
            <div style={{
              width: 36,
              height: 4,
              borderRadius: 99,
              background: 'var(--border)',
              margin: '0 auto 16px',
            }} />

            {/* Profile info */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="avatar"
                  style={{
                    width: 44, height: 44, borderRadius: '50%',
                    objectFit: 'cover', border: '2px solid var(--border)',
                  }}
                />
              ) : (
                <div style={{
                  width: 44, height: 44, borderRadius: '50%',
                  background: 'var(--brand)', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontSize: 16, fontWeight: 700,
                }}>
                  {initials}
                </div>
              )}
              <div style={{ overflow: 'hidden' }}>
                <p style={{
                  margin: 0, fontSize: 14.5, fontWeight: 600,
                  color: 'var(--text-primary)', overflow: 'hidden',
                  textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {user?.user_metadata?.full_name || user?.email || 'Account'}
                </p>
                {user?.email && (
                  <p style={{
                    margin: 0, fontSize: 12.5, color: 'var(--text-muted)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {user.email}
                  </p>
                )}
              </div>
            </div>

            {/* Sign out */}
            <button
              onClick={handleSignOut}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '13px 14px',
                borderRadius: 10,
                border: '1px solid var(--border)',
                background: 'transparent',
                color: 'var(--danger)',
                fontSize: 14,
                fontWeight: 600,
                fontFamily: 'var(--font-ui)',
                cursor: 'pointer',
              }}
            >
              <LogOutIcon size={18} />
              Sign out
            </button>
          </div>
        </>
      )}
    </>
  );
}