import React, { useState } from 'react';
import '../styles/Sidebar.css';

// ── Icons ─────────────────────────────────────────────────────────────────────

function CloudIcon({ size = 16, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
    </svg>
  );
}

function FolderIcon({ size = 14, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function ClockIcon({ size = 16, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function TrashIcon({ size = 16, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );
}

function ChevronRightIcon({ size = 11, color = 'currentColor', open = false }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`sidebar__folder-item__chevron${open ? ' sidebar__folder-item__chevron--open' : ''}`}
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

function PlusIcon({ size = 13, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function StorageIcon({ size = 14, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
    </svg>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatBytes(bytes) {
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
}

// ── FolderTree (recursive) ────────────────────────────────────────────────────

function FolderTree({ folders, parentId = null, depth = 0, currentFolderId, onFolderClick }) {
  const children = folders.filter(f => f.parent_id === parentId);
  if (children.length === 0) return null;

  return (
    <ul>
      {children.map(folder => (
        <FolderTreeItem
          key={folder.id}
          folder={folder}
          folders={folders}
          depth={depth}
          currentFolderId={currentFolderId}
          onFolderClick={onFolderClick}
        />
      ))}
    </ul>
  );
}

function FolderTreeItem({ folder, folders, depth, currentFolderId, onFolderClick }) {
  const hasChildren = folders.some(f => f.parent_id === folder.id);
  const [expanded, setExpanded] = useState(false);
  const isActive = currentFolderId === folder.id;

  return (
    <li>
      <div
        className={`sidebar__folder-item${isActive ? ' sidebar__folder-item--active' : ''}`}
        style={{ paddingLeft: 16 + depth * 14 }}
        onClick={() => {
          onFolderClick?.(folder.id);
          if (hasChildren) setExpanded(e => !e);
        }}
      >
        {hasChildren ? (
          <ChevronRightIcon
            size={11}
            color={isActive ? 'var(--brand)' : 'var(--text-muted)'}
            open={expanded}
          />
        ) : (
          <span style={{ width: 11, flexShrink: 0 }} />
        )}
        <FolderIcon size={13} color={isActive ? 'var(--brand)' : 'var(--text-muted)'} />
        <span className="sidebar__folder-item__name">{folder.name}</span>
      </div>

      {hasChildren && expanded && (
        <FolderTree
          folders={folders}
          parentId={folder.id}
          depth={depth + 1}
          currentFolderId={currentFolderId}
          onFolderClick={onFolderClick}
        />
      )}
    </li>
  );
}

// ── NavItem ───────────────────────────────────────────────────────────────────

function NavItem({ icon: Icon, label, active, onClick, badge }) {
  return (
    <div
      className={`sidebar__nav-item${active ? ' sidebar__nav-item--active' : ''}`}
      onClick={onClick}
    >
      <Icon size={16} color={active ? 'var(--brand)' : 'var(--text-muted)'} />
      <span className="sidebar__nav-item__label">{label}</span>
      {badge != null && (
        <span className="sidebar__nav-item__badge">{badge}</span>
      )}
    </div>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────────────────

export default function Sidebar({
  folders = [],
  currentFolderId = null,
  activeNav = 'drive',
  onNavChange,
  onFolderClick,
  onNewFolder,
  storage = { used_bytes: 0, storage_limit: 107374182400 },
}) {
  const usedPct = storage.storage_limit > 0
    ? Math.min(100, (storage.used_bytes / storage.storage_limit) * 100)
    : 0;

  const usedLabel = formatBytes(storage.used_bytes);
  const limitLabel = formatBytes(storage.storage_limit);

  return (
    <aside className="sidebar">

      {/* Logo */}
      <div className="sidebar__logo">
        <div className="sidebar__logo-icon">
          <CloudIcon size={17} color="#fff" />
        </div>
        <span className="sidebar__logo-text">NestCloud</span>
      </div>

      {/* Scrollable nav */}
      <div className="sidebar__nav">

        <p className="sidebar__section-label">File manager</p>

        <NavItem
          icon={CloudIcon}
          label="My Drive"
          active={activeNav === 'drive'}
          onClick={() => onNavChange?.('drive')}
        />

        {activeNav === 'drive' && folders.length > 0 && (
          <div className="sidebar__folder-tree">
            <FolderTree
              folders={folders}
              parentId={null}
              depth={0}
              currentFolderId={currentFolderId}
              onFolderClick={onFolderClick}
            />
          </div>
        )}

        <NavItem
          icon={ClockIcon}
          label="Recent"
          active={activeNav === 'recent'}
          onClick={() => onNavChange?.('recent')}
        />

        <NavItem
          icon={TrashIcon}
          label="Trash"
          active={activeNav === 'trash'}
          onClick={() => onNavChange?.('trash')}
        />

        <div className="sidebar__new-folder">
          <button className="sidebar__new-folder-btn" onClick={onNewFolder}>
            <PlusIcon size={13} />
            New folder
          </button>
        </div>

      </div>

      {/* Storage bar */}
      <div className="sidebar__storage">
        <div className="sidebar__storage-header">
          <StorageIcon size={14} color="var(--text-muted)" />
          <span className="sidebar__storage-label">Storage</span>
          <span className="sidebar__storage-pct">{Math.round(usedPct)}%</span>
        </div>

        <div className="sidebar__storage-track">
          <div
            className={`sidebar__storage-fill${usedPct > 85 ? ' sidebar__storage-fill--danger' : ''}`}
            style={{ width: `${usedPct}%` }}
          />
        </div>

        <p className="sidebar__storage-text">
          {usedLabel} of {limitLabel} used
        </p>
      </div>

    </aside>
  );
}