import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useStorage } from '../hooks/useStorage';
import { supabase } from '../lib/supabase';
import Sidebar from '../components/SideBar';
import TopBar from '../components/TopBar';
import BottomTabBar from '../components/BottomTabBar';

// ── Mobile hook ───────────────────────────────────────────────────────────────

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return isMobile;
}

// ── DrivePage ─────────────────────────────────────────────────────────────────

export default function DrivePage() {
  const { user } = useAuth();
  const { storage } = useStorage();
  const isMobile = useIsMobile();

  const [activeNav, setActiveNav] = useState('drive');
  const [view, setView] = useState('list');
  const [folders, setFolders] = useState([]);
  const [files, setFiles] = useState([]);
  const [currentFolderId, setCurrentFolderId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [showSearch, setShowSearch] = useState(false);

  // Fetch folders
  useEffect(() => {
    if (!user) return;
    supabase
      .from('folders')
      .select('*')
      .eq('user_id', user.id)
      .then(({ data }) => setFolders(data || []));
  }, [user]);

  // Fetch files
  useEffect(() => {
    if (!user) return;
    setLoading(true);
    let query = supabase
      .from('files')
      .select('*')
      .eq('user_id', user.id);

    if (activeNav === 'drive') {
      query = currentFolderId
        ? query.eq('folder_id', currentFolderId)
        : query.is('folder_id', null);
    }
    // recent: no folder filter, just latest 20
    if (activeNav === 'recent') {
      query = supabase
        .from('files')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);
    }

    query.order('created_at', { ascending: false }).then(({ data }) => {
      setFiles(data || []);
      setLoading(false);
    });
  }, [user, currentFolderId, activeNav]);

  // Breadcrumb
  function getBreadcrumb() {
    const trail = [];
    let id = currentFolderId;
    while (id) {
      const folder = folders.find(f => f.id === id);
      if (!folder) break;
      trail.unshift(folder);
      id = folder.parent_id;
    }
    return trail;
  }

  // Filtered
  const visibleFiles = searchQuery
    ? files.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : files;

  const visibleFolders = searchQuery
    ? folders.filter(f =>
        f.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        f.parent_id === currentFolderId
      )
    : folders.filter(f => f.parent_id === currentFolderId);

  const breadcrumb = getBreadcrumb();

  // Handle mobile tab change
  function handleTabChange(tab) {
    if (tab === 'search') {
      setShowSearch(true);
      return;
    }
    setShowSearch(false);
    setActiveNav(tab === 'me' ? activeNav : tab);
    setCurrentFolderId(null);
  }

  async function handleNewFolder() {
    const name = window.prompt('Folder name:');
    if (!name || !name.trim()) return;
    const { data, error } = await supabase.from('folders').insert({
      user_id: user.id,
      name: name.trim(),
      parent_id: currentFolderId || null,
    }).select().single();
    if (!error && data) setFolders(prev => [...prev, data]);
  }

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg-page)', overflow: 'hidden' }}>

      {/* Sidebar — desktop only */}
      {!isMobile && (
        <Sidebar
          folders={folders}
          currentFolderId={currentFolderId}
          activeNav={activeNav}
          onNavChange={(nav) => { setActiveNav(nav); setCurrentFolderId(null); }}
          onFolderClick={(id) => { setActiveNav('drive'); setCurrentFolderId(id); }}
          onNewFolder={handleNewFolder}
          storage={storage || { used_bytes: 0, storage_limit: 107374182400 }}
        />
      )}

      {/* Right side */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* TopBar */}
        <TopBar
          user={user}
          view={view}
          onViewChange={setView}
          onSearch={setSearchQuery}
        />

        {/* Main content */}
        <main style={{
          flex: 1,
          overflowY: 'auto',
          padding: '20px 24px',
          paddingBottom: isMobile ? 80 : 20,
        }}>

          {/* Mobile search bar */}
          {isMobile && showSearch && (
            <input
              autoFocus
              type="text"
              placeholder="Search files and folders…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                height: 40,
                padding: '0 14px',
                borderRadius: 8,
                border: '1px solid var(--border-focus)',
                background: 'var(--bg-input)',
                color: 'var(--text-primary)',
                fontSize: 14,
                fontFamily: 'var(--font-ui)',
                outline: 'none',
                marginBottom: 16,
                boxSizing: 'border-box',
              }}
            />
          )}

          {/* Breadcrumb — drive only */}
          {activeNav === 'drive' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 20, fontSize: 13, color: 'var(--text-muted)' }}>
              <span
                style={{ cursor: 'pointer', color: currentFolderId ? 'var(--text-secondary)' : 'var(--text-primary)', fontWeight: currentFolderId ? 400 : 600 }}
                onClick={() => setCurrentFolderId(null)}
              >
                My Drive
              </span>
              {breadcrumb.map((folder, i) => (
                <React.Fragment key={folder.id}>
                  <span style={{ color: 'var(--border)' }}>/</span>
                  <span
                    style={{
                      cursor: 'pointer',
                      color: i === breadcrumb.length - 1 ? 'var(--text-primary)' : 'var(--text-secondary)',
                      fontWeight: i === breadcrumb.length - 1 ? 600 : 400,
                    }}
                    onClick={() => setCurrentFolderId(folder.id)}
                  >
                    {folder.name}
                  </span>
                </React.Fragment>
              ))}
            </div>
          )}

          {/* Recent label */}
          {activeNav === 'recent' && (
            <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 16, marginTop: 0 }}>Recent</p>
          )}

          {/* Content */}
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 60 }}>
              <Spinner />
            </div>
          ) : visibleFolders.length === 0 && visibleFiles.length === 0 ? (
            <EmptyState activeNav={activeNav} />
          ) : (
            <>
              {/* Folders */}
              {activeNav === 'drive' && visibleFolders.length > 0 && (
                <div style={{ marginBottom: 24 }}>
                  <p style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10, marginTop: 0 }}>
                    Folders
                  </p>
                  <div style={{
                    display: view === 'grid' ? 'grid' : 'flex',
                    gridTemplateColumns: view === 'grid' ? 'repeat(auto-fill, minmax(160px, 1fr))' : undefined,
                    flexDirection: view === 'list' ? 'column' : undefined,
                    gap: view === 'grid' ? 12 : 4,
                  }}>
                    {visibleFolders.map(folder => (
                      <FolderCard
                        key={folder.id}
                        folder={folder}
                        view={view}
                        onClick={() => setCurrentFolderId(folder.id)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Files */}
              {visibleFiles.length > 0 && (
                <div>
                  <p style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10, marginTop: 0 }}>
                    Files
                  </p>

                  {view === 'list' && (
                    <div style={{ background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden' }}>
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 100px 160px 40px',
                        padding: '10px 16px',
                        borderBottom: '1px solid var(--border)',
                        fontSize: 11.5,
                        fontWeight: 600,
                        color: 'var(--text-muted)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}>
                        <span>Name</span>
                        <span>Size</span>
                        <span>Date</span>
                        <span></span>
                      </div>
                      {visibleFiles.map((file, i) => (
                        <FileRow key={file.id} file={file} last={i === visibleFiles.length - 1} />
                      ))}
                    </div>
                  )}

                  {view === 'grid' && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>
                      {visibleFiles.map(file => (
                        <FileCard key={file.id} file={file} />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* BottomTabBar — mobile only */}
      {isMobile && (
        <BottomTabBar
          activeTab={showSearch ? 'search' : activeNav}
          onTabChange={handleTabChange}
        />
      )}

    </div>
  );
}

// ── FolderCard ────────────────────────────────────────────────────────────────

function FolderCard({ folder, view, onClick }) {
  const [hovered, setHovered] = useState(false);

  if (view === 'list') {
    return (
      <div
        onClick={onClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '9px 16px',
          borderRadius: 8,
          cursor: 'pointer',
          background: hovered ? 'var(--bg-hover)' : 'transparent',
          transition: 'background 0.15s',
        }}
      >
        <FolderIcon size={17} color="var(--brand)" />
        <span style={{ fontSize: 13.5, color: 'var(--text-primary)' }}>{folder.name}</span>
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        padding: '16px 12px',
        borderRadius: 12,
        border: `1px solid ${hovered ? 'var(--brand)' : 'var(--border)'}`,
        background: 'var(--bg-card)',
        cursor: 'pointer',
        transition: 'border-color 0.15s',
      }}
    >
      <FolderIcon size={32} color="var(--brand)" />
      <span style={{ fontSize: 12.5, color: 'var(--text-primary)', textAlign: 'center', wordBreak: 'break-word' }}>{folder.name}</span>
    </div>
  );
}

// ── FileRow ───────────────────────────────────────────────────────────────────

function FileRow({ file, last }) {
  const [hovered, setHovered] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setMenuOpen(false); }}
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 100px 160px 40px',
        alignItems: 'center',
        padding: '11px 16px',
        borderBottom: last ? 'none' : '1px solid var(--border)',
        background: hovered ? 'var(--bg-hover)' : 'transparent',
        transition: 'background 0.15s',
        position: 'relative',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, overflow: 'hidden' }}>
        <FileIcon mime={file.mime_type} />
        <span style={{ fontSize: 13.5, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {file.name}
        </span>
      </div>
      <span style={{ fontSize: 12.5, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
        {formatBytes(file.size)}
      </span>
      <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
        {new Date(file.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
      </span>
      <div style={{ position: 'relative' }}>
        {hovered && (
          <button
            onClick={() => setMenuOpen(o => !o)}
            style={{
              width: 28, height: 28, borderRadius: 6, border: 'none',
              background: menuOpen ? 'var(--brand-subtle)' : 'transparent',
              color: 'var(--text-muted)', cursor: 'pointer', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            <DotsIcon />
          </button>
        )}
        {menuOpen && <FileMenu file={file} onClose={() => setMenuOpen(false)} />}
      </div>
    </div>
  );
}

// ── FileCard ──────────────────────────────────────────────────────────────────

function FileCard({ file }) {
  const [hovered, setHovered] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setMenuOpen(false); }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        padding: '16px 12px',
        borderRadius: 12,
        border: `1px solid ${hovered ? 'var(--brand)' : 'var(--border)'}`,
        background: 'var(--bg-card)',
        cursor: 'default',
        transition: 'border-color 0.15s',
        position: 'relative',
      }}
    >
      {hovered && (
        <button
          onClick={() => setMenuOpen(o => !o)}
          style={{
            position: 'absolute', top: 8, right: 8,
            width: 26, height: 26, borderRadius: 6, border: 'none',
            background: 'var(--bg-page)', color: 'var(--text-muted)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <DotsIcon />
        </button>
      )}
      {menuOpen && <FileMenu file={file} onClose={() => setMenuOpen(false)} align="left" />}
      <FileIcon mime={file.mime_type} size={32} />
      <span style={{ fontSize: 12, color: 'var(--text-primary)', textAlign: 'center', width: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {file.name}
      </span>
      <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
        {formatBytes(file.size)}
      </span>
    </div>
  );
}

// ── FileMenu ──────────────────────────────────────────────────────────────────

function FileMenu({ file, onClose, align = 'right' }) {
  return (
    <div
      style={{
        position: 'absolute',
        top: 32,
        [align]: 0,
        zIndex: 50,
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 10,
        boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        minWidth: 150,
        overflow: 'hidden',
      }}
      onClick={e => e.stopPropagation()}
    >
      <FileMenuItem label="Download" icon="⬇" onClick={() => { alert('Download coming soon'); onClose(); }} />
      <FileMenuItem label="Delete" icon="🗑" danger onClick={() => { alert('Delete coming soon'); onClose(); }} />
    </div>
  );
}

function FileMenuItem({ label, icon, danger, onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '9px 14px', cursor: 'pointer', fontSize: 13,
        color: danger ? 'var(--danger)' : 'var(--text-primary)',
        background: hovered ? 'var(--bg-hover)' : 'transparent',
        transition: 'background 0.15s',
      }}
    >
      <span>{icon}</span>
      {label}
    </div>
  );
}

// ── EmptyState ────────────────────────────────────────────────────────────────

function EmptyState({ activeNav }) {
  const messages = {
    drive:  { title: 'No files yet',      sub: 'Upload files to get started' },
    recent: { title: 'No recent files',   sub: 'Files you open will appear here' },
    trash:  { title: 'Trash is empty',    sub: 'Deleted files will appear here' },
  };
  const { title, sub } = messages[activeNav] || messages.drive;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 10 }}>
      <div style={{ width: 52, height: 52, borderRadius: 14, background: 'var(--bg-card)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <FolderIcon size={24} color="var(--text-muted)" />
      </div>
      <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>{title}</p>
      <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>{sub}</p>
    </div>
  );
}

// ── Spinner ───────────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ animation: 'spin 0.8s linear infinite' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <circle cx="12" cy="12" r="10" stroke="var(--border)" strokeWidth="2.5" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="var(--brand)" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function FolderIcon({ size = 16, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function FileIcon({ mime = '', size = 16 }) {
  let color = 'var(--text-muted)';
  if (mime.startsWith('image/')) color = '#22C55E';
  else if (mime.startsWith('video/')) color = '#F59E0B';
  else if (mime.startsWith('audio/')) color = '#8B5CF6';
  else if (mime.includes('pdf')) color = '#EF4444';
  else if (mime.includes('spreadsheet') || mime.includes('excel') || mime.includes('csv')) color = '#10B981';
  else if (mime.includes('word') || mime.includes('document')) color = '#3B82F6';

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  );
}

function DotsIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="5" cy="12" r="2" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="19" cy="12" r="2" />
    </svg>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatBytes(bytes) {
  if (!bytes) return '—';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
}