import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useStorage } from '../hooks/useStorage';
import { supabase } from '../lib/supabase';
import Sidebar from '../components/SideBar';
import TopBar from '../components/TopBar';
import BottomTabBar from '../components/BottomTabBar';

const UPLOAD_CONCURRENCY = 3;

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
  const [deleteTarget, setDeleteTarget] = useState(null); // file pending delete confirmation
  const [deleting, setDeleting] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);
  const [storageOverrideBytes, setStorageOverrideBytes] = useState(null); // optimistic local decrement after delete
  const [meSheetOpen, setMeSheetOpen] = useState(false);
  const [uploadQueue, setUploadQueue] = useState([]); // [{ id, file, status: 'queued'|'uploading'|'done'|'error', progress, error }]
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [toasts, setToasts] = useState([]); // [{ id, message, type: 'success'|'error'|'info' }]
  const fileInputRef = useRef(null);

  function showToast(message, type = 'info') {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }

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
    const folderById = new Map(folders.map(f => [f.id, f]));
    const trail = [];
    let id = currentFolderId;
    while (id) {
      const folder = folderById.get(id);
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

  function handleNewFolder() {
    setNewFolderOpen(true);
  }

  async function handleCreateFolder(name) {
    const { data, error } = await supabase.from('folders').insert({
      user_id: user.id,
      name: name.trim(),
      parent_id: currentFolderId || null,
    }).select().single();
    if (error) {
      showToast('Failed to create folder', 'error');
    } else if (data) {
      setFolders(prev => [...prev, data]);
      showToast(`Folder "${name}" created`, 'success');
    }
  }

  // ── File actions ─────────────────────────────────────────────────────────

  async function getAuthHeader() {
    const { data } = await supabase.auth.getSession();
    return { Authorization: `Bearer ${data?.session?.access_token || ''}` };
  }

  async function handleDownload(file) {
    if (downloadingId) return; // ignore if a download is already in flight
    setDownloadingId(file.id);
    try {
      const headers = await getAuthHeader();
      const res = await fetch('/api/generate-download-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ fileId: file.id, r2Key: file.r2_key }),
      });
      if (!res.ok) throw new Error('Failed to generate download link');
      const { url } = await res.json();

      // Trigger the browser download via a temporary anchor
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error('Download failed:', err);
      showToast('Could not download this file. Please try again.', 'error');
    } finally {
      setDownloadingId(null);
    }
  }

  function handleDeleteRequest(file) {
    setDeleteTarget(file);
  }

  async function confirmDelete() {
    const file = deleteTarget;
    if (!file) return;
    setDeleting(true);
    try {
      const headers = await getAuthHeader();
      const res = await fetch('/api/delete-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ fileId: file.id, r2Key: file.r2_key }),
      });
      if (!res.ok) throw new Error('Delete failed');

      // Remove from local state — server already deleted the R2 object,
      // the Supabase row, and decremented user_storage.used_bytes atomically.
      setFiles(prev => prev.filter(f => f.id !== file.id));
      setStorageOverrideBytes(prev => {
        const base = prev != null ? prev : (storage?.used_bytes || 0);
        return Math.max(0, base - (file.size || 0));
      });
      setDeleteTarget(null);
      showToast(`"${file.name}" deleted`, 'success');
    } catch (err) {
      console.error('Delete failed:', err);
      showToast('Could not delete this file. Please try again.', 'error');
    } finally {
      setDeleting(false);
    }
  }

  // ── Upload ───────────────────────────────────────────────────────────────

  function openFilePicker() {
    fileInputRef.current?.click();
  }

  function handleFilesSelected(e) {
    const selected = Array.from(e.target.files || []);
    e.target.value = ''; // allow re-selecting the same file later
    if (selected.length === 0) return;

    const currentUsed = storageOverrideBytes != null ? storageOverrideBytes : (storage?.used_bytes || 0);
    const limit = storage?.storage_limit || 107374182400;
    const remaining = Math.max(0, limit - currentUsed);
    const incomingTotal = selected.reduce((sum, f) => sum + f.size, 0);

    // Frontend pre-check: catch the obvious "way too big" case before any
    // network call. The server re-checks the real, authoritative used_bytes
    // before issuing a presigned URL — this is just a fast UX shortcut.
    if (incomingTotal > remaining) {
      showToast(`Not enough space. ${formatBytes(remaining)} left, files total ${formatBytes(incomingTotal)}.`, 'error');
      return;
    }

    const newEntries = selected.map(file => ({
      id: `${file.name}-${file.size}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      file,
      status: 'queued',
      progress: 0,
      error: null,
    }));

    setUploadQueue(prev => [...prev, ...newEntries]);
    processQueue(newEntries);
  }

  // Runs up to UPLOAD_CONCURRENCY uploads at a time from the given batch.
  async function processQueue(entries) {
    let nextIndex = 0;

    async function worker() {
      while (nextIndex < entries.length) {
        const entry = entries[nextIndex];
        nextIndex += 1;
        await uploadSingleFile(entry);
      }
    }

    const workers = Array.from({ length: Math.min(UPLOAD_CONCURRENCY, entries.length) }, worker);
    await Promise.all(workers);
  }

  function updateQueueEntry(id, patch) {
    setUploadQueue(prev => prev.map(e => (e.id === id ? { ...e, ...patch } : e)));
  }

  async function uploadSingleFile(entry) {
    updateQueueEntry(entry.id, { status: 'uploading', progress: 0 });
    try {
      const headers = await getAuthHeader();

      // TODO: replace with the real call once /api/generate-upload-url exists.
      // Expected contract: POST { fileName, mimeType, size, folderId } with
      // the auth header above -> { url, r2Key } (a presigned R2 PUT URL).
      // The server should re-check storage_limit / used_bytes here too,
      // since this frontend check can't be trusted as the source of truth.
      const res = await fetch('/api/generate-upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({
          fileName: entry.file.name,
          mimeType: entry.file.type || 'application/octet-stream',
          size: entry.file.size,
          folderId: currentFolderId || null,
        }),
      });
      if (!res.ok) throw new Error('Failed to get upload URL');
      const { url, r2Key } = await res.json();

      await putFileToR2(url, entry.file, (pct) => {
        updateQueueEntry(entry.id, { progress: pct });
      });

      // Record the file in Supabase once the R2 upload succeeds.
      const { data, error } = await supabase
        .from('files')
        .insert({
          user_id: user.id,
          folder_id: currentFolderId || null,
          name: entry.file.name,
          size: entry.file.size,
          mime_type: entry.file.type || 'application/octet-stream',
          r2_key: r2Key,
        })
        .select()
        .single();
      if (error) throw error;

      // Show it immediately if we're looking at the folder it landed in.
      if (activeNav === 'drive' || activeNav === 'recent') {
        setFiles(prev => [data, ...prev]);
      }
      setStorageOverrideBytes(prev => {
        const base = prev != null ? prev : (storage?.used_bytes || 0);
        return base + entry.file.size;
      });

      updateQueueEntry(entry.id, { status: 'done', progress: 100 });
    } catch (err) {
      console.error('Upload failed:', entry.file.name, err);
      updateQueueEntry(entry.id, { status: 'error', error: err.message || 'Upload failed' });
    }
  }

  // PUTs a file to a presigned URL with progress via XHR (fetch can't report upload progress).
  function putFileToR2(url, file, onProgress) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', url);
      xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) resolve();
        else reject(new Error(`Upload failed with status ${xhr.status}`));
      };
      xhr.onerror = () => reject(new Error('Network error during upload'));
      xhr.send(file);
    });
  }

  function dismissUploadEntry(id) {
    setUploadQueue(prev => prev.filter(e => e.id !== id));
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
          storage={{
            ...(storage || { used_bytes: 0, storage_limit: 107374182400 }),
            used_bytes: storageOverrideBytes != null ? storageOverrideBytes : (storage?.used_bytes || 0),
          }}
        />
      )}

      {/* Right side */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* TopBar */}
        <TopBar
          user={user}
          onSearch={setSearchQuery}
          isMobile={isMobile}
          onOpenMeMenu={() => setMeSheetOpen(true)}
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

          {/* Trash header */}
          {activeNav === 'trash' && (
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Trash</p>
              <p style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: '4px 0 0' }}>Files deleted from NestCloud appear here</p>
            </div>
          )}

          {/* Toolbar row — breadcrumb (drive only) + view toggle + upload */}
          {(activeNav === 'drive' || activeNav === 'recent') && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: activeNav === 'drive' ? 20 : 16 }}>
              {activeNav === 'drive' ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-muted)' }}>
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
              ) : (
                <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Recent</p>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {/* View toggle — grid/list */}
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
                      onClick={() => setView(key)}
                      aria-label={`${key} view`}
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

                {/* Upload — desktop only; mobile uses the floating "+" button. Drive view only. */}
                {!isMobile && activeNav === 'drive' && (
                  <button
                    onClick={openFilePicker}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '7px 14px', borderRadius: 8, border: 'none',
                      background: 'var(--brand)', color: '#fff',
                      fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-ui)',
                      cursor: 'pointer',
                    }}
                  >
                    <UploadIcon size={15} />
                    Upload
                  </button>
                )}
              </div>
            </div>
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
                        <FileRow
                          key={file.id}
                          file={file}
                          last={i === visibleFiles.length - 1}
                          onDownload={handleDownload}
                          onDelete={handleDeleteRequest}
                          isDownloading={downloadingId === file.id}
                          isMobile={isMobile}
                        />
                      ))}
                    </div>
                  )}

                  {view === 'grid' && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>
                      {visibleFiles.map(file => (
                        <FileCard
                          key={file.id}
                          file={file}
                          onDownload={handleDownload}
                          onDelete={handleDeleteRequest}
                          isDownloading={downloadingId === file.id}
                          isMobile={isMobile}
                        />
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
          user={user}
          meSheetOpen={meSheetOpen}
          onMeSheetOpenChange={setMeSheetOpen}
        />
      )}

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <DeleteConfirmModal
          file={deleteTarget}
          deleting={deleting}
          onCancel={() => { if (!deleting) setDeleteTarget(null); }}
          onConfirm={confirmDelete}
        />
      )}

      {/* New folder modal */}
      {newFolderOpen && (
        <NewFolderModal
          onCancel={() => setNewFolderOpen(false)}
          onCreate={async (name) => {
            setNewFolderOpen(false);
            await handleCreateFolder(name);
          }}
        />
      )}

      {/* Toast notifications */}
      <ToastContainer toasts={toasts} onDismiss={(id) => setToasts(prev => prev.filter(t => t.id !== id))} isMobile={isMobile} />

      {/* Hidden file input — shared by desktop Upload button and mobile "+" button */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFilesSelected}
        style={{ display: 'none' }}
      />

      {/* Floating upload button — mobile only */}
      {isMobile && activeNav === 'drive' && (
        <button
          onClick={openFilePicker}
          aria-label="Upload files"
          style={{
            position: 'fixed',
            right: 20,
            bottom: 80, // sits above the bottom tab bar
            width: 54,
            height: 54,
            borderRadius: '50%',
            border: 'none',
            background: 'var(--brand)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 6px 20px rgba(79, 70, 229, 0.45)',
            cursor: 'pointer',
            zIndex: 110,
          }}
        >
          <PlusIconLarge size={24} />
        </button>
      )}

      {/* Upload progress panel */}
      {uploadQueue.length > 0 && (
        <UploadProgressPanel
          queue={uploadQueue}
          onDismiss={dismissUploadEntry}
          onClearDone={() => setUploadQueue(prev => prev.filter(e => e.status !== 'done'))}
          isMobile={isMobile}
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

function FileRow({ file, last, onDownload, onDelete, isDownloading, isMobile }) {
  const [hovered, setHovered] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const showButton = isMobile || hovered || menuOpen;

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
        {isDownloading ? (
          <div style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Spinner size={14} />
          </div>
        ) : showButton && (
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
        {menuOpen && (
          <FileMenu
            file={file}
            onClose={() => setMenuOpen(false)}
            onDownload={onDownload}
            onDelete={onDelete}
          />
        )}
      </div>
    </div>
  );
}

// ── FileCard ──────────────────────────────────────────────────────────────────

function FileCard({ file, onDownload, onDelete, isDownloading, isMobile }) {
  const [hovered, setHovered] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const showButton = isMobile || hovered || menuOpen;

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
      {isDownloading ? (
        <div style={{ position: 'absolute', top: 8, right: 8, width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Spinner size={14} />
        </div>
      ) : showButton && (
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
      {menuOpen && (
        <FileMenu
          file={file}
          onClose={() => setMenuOpen(false)}
          align="left"
          onDownload={onDownload}
          onDelete={onDelete}
        />
      )}
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

function FileMenu({ file, onClose, align = 'right', onDownload, onDelete }) {
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
      <FileMenuItem label="Download" icon="⬇" onClick={() => { onDownload(file); onClose(); }} />
      <FileMenuItem label="Delete" icon="🗑" danger onClick={() => { onDelete(file); onClose(); }} />
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

// ── DeleteConfirmModal ────────────────────────────────────────────────────────

function DeleteConfirmModal({ file, deleting, onCancel, onConfirm }) {
  return (
    <div
      onClick={onCancel}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 360,
          maxWidth: 'calc(100vw - 32px)',
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: 20,
          boxShadow: '0 16px 40px rgba(0,0,0,0.5)',
        }}
      >
        <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>
          Delete file?
        </p>
        <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          "{file.name}" will be permanently deleted. This can't be undone.
        </p>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
          <button
            onClick={onCancel}
            disabled={deleting}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: 'transparent',
              color: 'var(--text-primary)',
              fontSize: 13,
              fontFamily: 'var(--font-ui)',
              cursor: deleting ? 'default' : 'pointer',
              opacity: deleting ? 0.6 : 1,
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: 'none',
              background: 'var(--danger)',
              color: '#fff',
              fontSize: 13,
              fontWeight: 600,
              fontFamily: 'var(--font-ui)',
              cursor: deleting ? 'default' : 'pointer',
              opacity: deleting ? 0.7 : 1,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            {deleting && <Spinner size={13} />}
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── UploadProgressPanel ────────────────────────────────────────────────────────

function UploadProgressPanel({ queue, onDismiss, onClearDone, isMobile }) {
  const activeCount = queue.filter(e => e.status === 'uploading' || e.status === 'queued').length;
  const doneCount = queue.filter(e => e.status === 'done').length;
  const errorCount = queue.filter(e => e.status === 'error').length;

  return (
    <div style={{
      position: 'fixed',
      right: isMobile ? 12 : 20,
      left: isMobile ? 12 : 'auto',
      bottom: isMobile ? 148 : 20, // clears the floating "+" and bottom tab bar on mobile
      width: isMobile ? 'auto' : 320,
      maxHeight: 320,
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: 12,
      boxShadow: '0 12px 32px rgba(0,0,0,0.45)',
      overflow: 'hidden',
      zIndex: 95,
      display: 'flex',
      flexDirection: 'column',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 14px', borderBottom: '1px solid var(--border)',
      }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
          {activeCount > 0
            ? `Uploading ${activeCount} file${activeCount > 1 ? 's' : ''}…`
            : errorCount > 0
              ? `${doneCount} done, ${errorCount} failed`
              : `${doneCount} file${doneCount > 1 ? 's' : ''} uploaded`}
        </span>
        {activeCount === 0 && (
          <button
            onClick={onClearDone}
            style={{
              border: 'none', background: 'transparent', color: 'var(--text-muted)',
              fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-ui)',
            }}
          >
            Clear
          </button>
        )}
      </div>

      <div style={{ overflowY: 'auto', flex: 1 }}>
        {queue.map(entry => (
          <div key={entry.id} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '9px 14px', borderBottom: '1px solid var(--border)',
          }}>
            <FileIcon mime={entry.file.type} size={16} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{
                margin: 0, fontSize: 12.5, color: 'var(--text-primary)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {entry.file.name}
              </p>
              {entry.status === 'uploading' && (
                <div style={{ height: 3, background: 'var(--border)', borderRadius: 99, marginTop: 5, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', width: `${entry.progress}%`,
                    background: 'var(--brand)', transition: 'width 0.15s',
                  }} />
                </div>
              )}
              {entry.status === 'error' && (
                <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--danger)' }}>
                  {entry.error || 'Upload failed'}
                </p>
              )}
            </div>
            {entry.status === 'uploading' && (
              <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>{entry.progress}%</span>
            )}
            {entry.status === 'queued' && (
              <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>Waiting…</span>
            )}
            {entry.status === 'done' && <CheckIcon size={15} />}
            {entry.status === 'error' && (
              <>
                <AlertIcon size={15} />
                <button
                  onClick={() => onDismiss(entry.id)}
                  style={{ border: 'none', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', flexShrink: 0 }}
                >
                  <CloseIcon size={13} />
                </button>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── NewFolderModal ────────────────────────────────────────────────────────────

function NewFolderModal({ onCancel, onCreate }) {
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  async function handleSubmit() {
    const trimmed = name.trim();
    if (!trimmed) return;
    setCreating(true);
    await onCreate(trimmed);
    setCreating(false);
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') handleSubmit();
    if (e.key === 'Escape') onCancel();
  }

  return (
    <div
      onClick={onCancel}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 200,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 360,
          maxWidth: 'calc(100vw - 32px)',
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: 20,
          boxShadow: '0 16px 40px rgba(0,0,0,0.15)',
        }}
      >
        <p style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>
          New folder
        </p>
        <input
          ref={inputRef}
          type="text"
          placeholder="Folder name"
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={handleKeyDown}
          maxLength={255}
          style={{
            width: '100%',
            height: 38,
            padding: '0 12px',
            borderRadius: 8,
            border: '1px solid var(--border)',
            background: 'var(--bg-input)',
            color: 'var(--text-primary)',
            fontSize: 14,
            fontFamily: 'var(--font-ui)',
            outline: 'none',
            boxSizing: 'border-box',
            transition: 'border-color 0.15s',
          }}
          onFocus={e => e.target.style.borderColor = 'var(--border-focus)'}
          onBlur={e => e.target.style.borderColor = 'var(--border)'}
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
          <button
            onClick={onCancel}
            disabled={creating}
            style={{
              padding: '8px 16px', borderRadius: 8,
              border: '1px solid var(--border)', background: 'transparent',
              color: 'var(--text-primary)', fontSize: 13,
              fontFamily: 'var(--font-ui)', cursor: 'pointer',
              opacity: creating ? 0.5 : 1,
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={creating || !name.trim()}
            style={{
              padding: '8px 16px', borderRadius: 8, border: 'none',
              background: 'var(--brand)', color: '#fff',
              fontSize: 13, fontWeight: 600,
              fontFamily: 'var(--font-ui)', cursor: creating || !name.trim() ? 'default' : 'pointer',
              opacity: creating || !name.trim() ? 0.6 : 1,
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            {creating && <Spinner size={13} />}
            {creating ? 'Creating…' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── ToastContainer ────────────────────────────────────────────────────────────

function ToastContainer({ toasts, onDismiss, isMobile }) {
  if (toasts.length === 0) return null;

  const bgColor = { success: 'var(--success)', error: 'var(--danger)', info: 'var(--text-primary)' };
  const icons = { success: '✓', error: '✕', info: 'ℹ' };

  return (
    <div style={{
      position: 'fixed',
      bottom: isMobile ? 80 : 24,
      left: '50%',
      transform: 'translateX(-50%)',
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      zIndex: 300,
      pointerEvents: 'none',
      alignItems: 'center',
    }}>
      {toasts.map(toast => (
        <div
          key={toast.id}
          onClick={() => onDismiss(toast.id)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 16px',
            borderRadius: 10,
            background: 'var(--text-primary)',
            color: 'var(--bg-card)',
            fontSize: 13.5,
            fontFamily: 'var(--font-ui)',
            fontWeight: 500,
            boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
            pointerEvents: 'auto',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            maxWidth: 'calc(100vw - 48px)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          <span style={{
            width: 18, height: 18, borderRadius: '50%',
            background: bgColor[toast.type],
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: 10, fontWeight: 700, flexShrink: 0,
          }}>
            {icons[toast.type]}
          </span>
          {toast.message}
        </div>
      ))}
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

function Spinner({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ animation: 'spin 0.8s linear infinite' }}>
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

function UploadIcon({ size = 15, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

function PlusIconLarge({ size = 24, color = '#fff' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function CheckIcon({ size = 14, color = 'var(--success)' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function AlertIcon({ size = 14, color = 'var(--danger)' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="13" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

function CloseIcon({ size = 13, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
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