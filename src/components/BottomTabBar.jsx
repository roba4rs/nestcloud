import React from 'react';

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

// ── Tabs config ───────────────────────────────────────────────────────────────

const TABS = [
  { key: 'drive',  label: 'My Drive', Icon: CloudIcon  },
  { key: 'recent', label: 'Recent',   Icon: ClockIcon  },
  { key: 'search', label: 'Search',   Icon: SearchIcon },
  { key: 'me',     label: 'Me',       Icon: UserIcon   },
];

// ── BottomTabBar ──────────────────────────────────────────────────────────────

export default function BottomTabBar({ activeTab = 'drive', onTabChange }) {
  return (
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
        const active = activeTab === key;
        return (
          <button
            key={key}
            onClick={() => onTabChange?.(key)}
            style={{
              flex: 1,
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
  );
}