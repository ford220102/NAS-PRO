import { useState } from 'react';
import { C } from '../data/theme';

interface FileManagerProps { onClose?: () => void; }

type FileItem = {
  id: string; name: string; type: 'folder' | 'file';
  size?: string; modified: string; ext?: string; path: string;
};

const MOCK_FILES: Record<string, FileItem[]> = {
  '/': [
    { id: 'home', name: 'home', type: 'folder', modified: '2024-11-12', path: '/home' },
    { id: 'media', name: 'media', type: 'folder', modified: '2024-11-15', path: '/media' },
    { id: 'backup', name: 'backup', type: 'folder', modified: '2024-10-30', path: '/backup' },
    { id: 'docker', name: 'docker', type: 'folder', modified: '2024-11-10', path: '/docker' },
    { id: 'downloads', name: 'downloads', type: 'folder', modified: '2024-11-14', path: '/downloads' },
    { id: 'system.log', name: 'system.log', type: 'file', size: '2.1 MB', modified: '2024-11-15', ext: 'log', path: '/system.log' },
  ],
  '/home': [
    { id: 'admin_h', name: 'admin', type: 'folder', modified: '2024-11-12', path: '/home/admin' },
    { id: 'user_h', name: 'user', type: 'folder', modified: '2024-11-01', path: '/home/user' },
  ],
  '/media': [
    { id: 'movies', name: 'Movies', type: 'folder', modified: '2024-11-14', path: '/media/Movies' },
    { id: 'tvshows', name: 'TV Shows', type: 'folder', modified: '2024-11-13', path: '/media/TV Shows' },
    { id: 'music', name: 'Music', type: 'folder', modified: '2024-11-10', path: '/media/Music' },
    { id: 'photos', name: 'Photos', type: 'folder', modified: '2024-11-15', path: '/media/Photos' },
  ],
  '/media/Movies': [
    { id: 'm1', name: 'Dune (2021).mkv', type: 'file', size: '28.4 GB', modified: '2024-10-01', ext: 'mkv', path: '/media/Movies/Dune (2021).mkv' },
    { id: 'm2', name: 'Oppenheimer (2023).mkv', type: 'file', size: '31.2 GB', modified: '2024-10-15', ext: 'mkv', path: '/media/Movies/Oppenheimer (2023).mkv' },
    { id: 'm3', name: 'The Batman (2022).mkv', type: 'file', size: '19.8 GB', modified: '2024-09-20', ext: 'mkv', path: '/media/Movies/The Batman (2022).mkv' },
    { id: 'm4', name: 'Interstellar (2014).mkv', type: 'file', size: '25.1 GB', modified: '2024-08-11', ext: 'mkv', path: '/media/Movies/Interstellar (2014).mkv' },
    { id: 'm5', name: 'Dune Part Two (2024).mkv', type: 'file', size: '35.7 GB', modified: '2024-11-05', ext: 'mkv', path: '/media/Movies/Dune Part Two (2024).mkv' },
  ],
  '/downloads': [
    { id: 'd1', name: 'ubuntu-24.04-desktop-amd64.iso', type: 'file', size: '4.7 GB', modified: '2024-11-10', ext: 'iso', path: '/downloads/ubuntu-24.04-desktop-amd64.iso' },
    { id: 'd2', name: 'backup_2024-11-01.tar.gz', type: 'file', size: '12.3 GB', modified: '2024-11-01', ext: 'gz', path: '/downloads/backup_2024-11-01.tar.gz' },
    { id: 'd3', name: 'project_docs.pdf', type: 'file', size: '3.4 MB', modified: '2024-11-08', ext: 'pdf', path: '/downloads/project_docs.pdf' },
  ],
};

const EXT_ICON: Record<string, string> = {
  mkv: '🎬', mp4: '🎬', avi: '🎬',
  mp3: '🎵', flac: '🎵', wav: '🎵',
  jpg: '🖼', jpeg: '🖼', png: '🖼', webp: '🖼',
  pdf: '📄', doc: '📝', docx: '📝', txt: '📄',
  zip: '📦', gz: '📦', tar: '📦', iso: '💿',
  log: '📋', conf: '⚙', sh: '⚙',
};

export default function FileManager({ onClose }: FileManagerProps) {
  void onClose;
  const [path, setPath] = useState('/');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [search, setSearch] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  const segments = path === '/' ? [] : path.split('/').filter(Boolean);
  const files = (MOCK_FILES[path] ?? []).filter(f =>
    !search || f.name.toLowerCase().includes(search.toLowerCase())
  );

  const navigate = (p: string) => { setPath(p); setSelected(new Set()); };

  const breadcrumb = [
    { label: 'Volume 1', path: '/' },
    ...segments.map((seg, i) => ({
      label: seg,
      path: '/' + segments.slice(0, i + 1).join('/'),
    })),
  ];

  return (
    <div style={{ display: 'flex', height: '100%', background: C.panel }}>
      {/* Sidebar */}
      <div style={{
        width: 180, flexShrink: 0, borderRight: `1px solid ${C.border}`,
        background: C.panel2, display: 'flex', flexDirection: 'column',
        padding: '12px 0',
      }}>
        <div style={{ padding: '0 14px', fontSize: 10, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Volumes</div>
        {[
          { icon: '⚡', label: 'Volume 1 (NVMe)', path: '/', sub: '1.42 TB free' },
          { icon: '💽', label: 'Volume 2 (RAID)', path: '/__v2', sub: '11.2 TB free' },
          { icon: '💽', label: 'Volume 3 (Backup)', path: '/__v3', sub: '3.8 TB free' },
        ].map(v => (
          <div key={v.path} onClick={() => navigate(v.path)} style={{
            padding: '8px 14px', cursor: 'pointer',
            background: path === v.path ? C.accentDim : 'transparent',
            borderLeft: `2px solid ${path === v.path ? C.accent : 'transparent'}`,
            transition: 'all 0.15s',
          }}>
            <div style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>{v.icon}</span>
              <span style={{ color: path === v.path ? C.accent : C.text, fontWeight: path === v.path ? 600 : 400 }}>{v.label}</span>
            </div>
            <div style={{ fontSize: 10, color: C.muted, marginLeft: 20 }}>{v.sub}</div>
          </div>
        ))}

        <div style={{ padding: '12px 14px 4px', fontSize: 10, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginTop: 8 }}>Quick Access</div>
        {[
          { icon: '🎬', label: 'Media', path: '/media' },
          { icon: '📥', label: 'Downloads', path: '/downloads' },
          { icon: '🔄', label: 'Backup', path: '/backup' },
          { icon: '🏠', label: 'Home', path: '/home' },
        ].map(item => (
          <div key={item.path} onClick={() => navigate(item.path)} style={{
            padding: '7px 14px', cursor: 'pointer',
            background: path === item.path ? C.accentDim : 'transparent',
            borderLeft: `2px solid ${path === item.path ? C.accent : 'transparent'}`,
          }}>
            <span style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>{item.icon}</span>
              <span style={{ color: path === item.path ? C.accent : C.textSub }}>{item.label}</span>
            </span>
          </div>
        ))}
      </div>

      {/* Main area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Toolbar */}
        <div style={{
          padding: '10px 16px', borderBottom: `1px solid ${C.border}`,
          background: C.panel2, display: 'flex', alignItems: 'center', gap: 10,
          flexShrink: 0,
        }}>
          {/* Breadcrumb */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1, minWidth: 0, overflow: 'hidden' }}>
            {breadcrumb.map((seg, i) => (
              <span key={seg.path} style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 0 }}>
                {i > 0 && <span style={{ color: C.muted, fontSize: 12 }}>/</span>}
                <span
                  onClick={() => navigate(seg.path)}
                  style={{
                    fontSize: 12, cursor: 'pointer', color: i === breadcrumb.length - 1 ? C.text : C.muted,
                    fontWeight: i === breadcrumb.length - 1 ? 600 : 400,
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}
                >
                  {seg.label}
                </span>
              </span>
            ))}
          </div>

          {/* Search */}
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: C.muted }}>🔍</span>
            <input
              type="text" placeholder="Search files..." value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ padding: '6px 10px 6px 28px', borderRadius: 7, background: '#0a1018', border: `1px solid ${C.border}`, color: C.text, fontSize: 12, outline: 'none', width: 160 }}
            />
          </div>

          <div style={{ display: 'flex', gap: 6 }}>
            <ToolBtn icon="📁" label="New Folder" onClick={() => setShowNewFolder(true)} />
            <ToolBtn icon="⬆" label="Upload" onClick={() => setShowUpload(true)} />
            <ToolBtn icon={viewMode === 'list' ? '⊞' : '≡'} label="View" onClick={() => setViewMode(v => v === 'list' ? 'grid' : 'list')} active />
          </div>
        </div>

        {/* Selection bar */}
        {selected.size > 0 && (
          <div style={{
            padding: '8px 16px', background: C.accentDim, borderBottom: `1px solid ${C.accent}44`,
            display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0,
          }}>
            <span style={{ fontSize: 12, color: C.accent }}>{selected.size} item(s) selected</span>
            <button onClick={() => setSelected(new Set())} style={{ fontSize: 11, color: C.muted, background: 'none', border: 'none', cursor: 'pointer' }}>Clear</button>
            <div style={{ flex: 1 }} />
            <ActionBtn label="Copy" /><ActionBtn label="Move" /><ActionBtn label="Delete" color={C.red} />
          </div>
        )}

        {/* File list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 16, scrollbarWidth: 'thin', scrollbarColor: `${C.border} transparent` }}>
          {viewMode === 'list' ? (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ color: C.muted, borderBottom: `1px solid ${C.border}` }}>
                  <th style={{ textAlign: 'left', padding: '6px 10px', fontWeight: 600, width: 24 }}>
                    <input type="checkbox" style={{ accentColor: C.accent }} onChange={e => setSelected(e.target.checked ? new Set(files.map(f => f.id)) : new Set())} />
                  </th>
                  <th style={{ textAlign: 'left', padding: '6px 10px', fontWeight: 600 }}>Name</th>
                  <th style={{ textAlign: 'left', padding: '6px 10px', fontWeight: 600, width: 100 }}>Size</th>
                  <th style={{ textAlign: 'left', padding: '6px 10px', fontWeight: 600, width: 120 }}>Modified</th>
                  <th style={{ width: 80 }}></th>
                </tr>
              </thead>
              <tbody>
                {files.map(file => (
                  <tr
                    key={file.id}
                    onDoubleClick={() => file.type === 'folder' && navigate(file.path)}
                    onClick={() => {
                      const next = new Set(selected);
                      next.has(file.id) ? next.delete(file.id) : next.add(file.id);
                      setSelected(next);
                    }}
                    style={{
                      background: selected.has(file.id) ? C.accentDim : 'transparent',
                      borderBottom: `1px solid ${C.border}22`,
                      cursor: file.type === 'folder' ? 'pointer' : 'default',
                      transition: 'background 0.1s',
                    }}
                  >
                    <td style={{ padding: '8px 10px' }}>
                      <input type="checkbox" checked={selected.has(file.id)} onChange={() => {}} style={{ accentColor: C.accent }} />
                    </td>
                    <td style={{ padding: '8px 10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 18 }}>
                          {file.type === 'folder' ? '📁' : (EXT_ICON[file.ext ?? ''] ?? '📄')}
                        </span>
                        <span style={{ color: file.type === 'folder' ? C.accent : C.text }}>{file.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '8px 10px', color: C.muted }}>{file.size ?? '—'}</td>
                    <td style={{ padding: '8px 10px', color: C.muted }}>{file.modified}</td>
                    <td style={{ padding: '8px 10px' }}>
                      <div style={{ display: 'flex', gap: 6, opacity: 0 }} className="row-actions">
                        <ActionBtn label="⬇" title="Download" /><ActionBtn label="✕" title="Delete" color={C.red} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 12 }}>
              {files.map(file => (
                <div
                  key={file.id}
                  onDoubleClick={() => file.type === 'folder' && navigate(file.path)}
                  onClick={() => {
                    const next = new Set(selected);
                    next.has(file.id) ? next.delete(file.id) : next.add(file.id);
                    setSelected(next);
                  }}
                  style={{
                    padding: 12, borderRadius: 10, textAlign: 'center',
                    background: selected.has(file.id) ? C.accentDim : C.panel2,
                    border: `1px solid ${selected.has(file.id) ? C.accent + '66' : C.border}`,
                    cursor: 'pointer', transition: 'all 0.15s',
                  }}
                >
                  <div style={{ fontSize: 36, marginBottom: 6 }}>
                    {file.type === 'folder' ? '📁' : (EXT_ICON[file.ext ?? ''] ?? '📄')}
                  </div>
                  <div style={{ fontSize: 11, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</div>
                  {file.size && <div style={{ fontSize: 10, color: C.muted }}>{file.size}</div>}
                </div>
              ))}
            </div>
          )}

          {files.length === 0 && (
            <div style={{ textAlign: 'center', color: C.muted, padding: '60px 0' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📂</div>
              <div>This folder is empty</div>
            </div>
          )}
        </div>

        {/* Status bar */}
        <div style={{
          padding: '6px 16px', borderTop: `1px solid ${C.border}`,
          background: C.panel2, fontSize: 11, color: C.muted,
          display: 'flex', gap: 20, flexShrink: 0,
        }}>
          <span>{files.length} items</span>
          {selected.size > 0 && <span style={{ color: C.accent }}>{selected.size} selected</span>}
          <span style={{ marginLeft: 'auto' }}>Path: <code style={{ color: C.textSub }}>{path}</code></span>
        </div>
      </div>

      {/* New folder modal */}
      {showNewFolder && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <div style={{ fontWeight: 700, marginBottom: 16 }}>New Folder</div>
            <input
              autoFocus type="text" value={newFolderName}
              onChange={e => setNewFolderName(e.target.value)}
              placeholder="Folder name"
              style={{ ...inputStyle, marginBottom: 16 }}
            />
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowNewFolder(false)} style={cancelBtnStyle}>Cancel</button>
              <button onClick={() => setShowNewFolder(false)} style={confirmBtnStyle}>Create</button>
            </div>
          </div>
        </div>
      )}

      {/* Upload modal */}
      {showUpload && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>Upload Files</div>
            <div style={{ fontSize: 12, color: C.muted, marginBottom: 16 }}>Upload to: <code>{path}</code></div>
            <div style={{
              border: `2px dashed ${C.border}`, borderRadius: 12, padding: '32px 16px',
              textAlign: 'center', color: C.muted, fontSize: 13, marginBottom: 16,
            }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>⬆</div>
              Drag & drop files here<br />or click to browse
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowUpload(false)} style={cancelBtnStyle}>Cancel</button>
              <button onClick={() => setShowUpload(false)} style={confirmBtnStyle}>Upload</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        tr:hover .row-actions { opacity: 1 !important; }
      `}</style>
    </div>
  );
}

function ToolBtn({ icon, label, onClick, active }: { icon: string; label: string; onClick: () => void; active?: boolean }) {
  return (
    <button onClick={onClick} title={label} style={{
      padding: '6px 10px', borderRadius: 7, border: `1px solid ${C.border}`,
      background: active ? C.accentDim : 'transparent',
      color: C.textSub, cursor: 'pointer', fontSize: 13, transition: 'all 0.15s',
    }}>
      {icon}
    </button>
  );
}

function ActionBtn({ label, color, title }: { label: string; color?: string; title?: string }) {
  return (
    <button title={title ?? label} style={{
      padding: '4px 10px', borderRadius: 6, border: `1px solid ${C.border}`,
      background: 'transparent', color: color ?? C.textSub, cursor: 'pointer', fontSize: 11,
    }}>
      {label}
    </button>
  );
}

const overlayStyle: React.CSSProperties = {
  position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50,
};
const modalStyle: React.CSSProperties = {
  background: C.panel, border: `1px solid ${C.border}`, borderRadius: 14,
  padding: 24, width: 360,
};
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px', borderRadius: 8,
  background: '#0a1018', border: `1px solid ${C.border}`,
  color: C.text, fontSize: 13, outline: 'none', boxSizing: 'border-box',
};
const cancelBtnStyle: React.CSSProperties = {
  flex: 1, padding: '9px', borderRadius: 8, background: C.subtle,
  border: 'none', color: C.muted, cursor: 'pointer', fontWeight: 600,
};
const confirmBtnStyle: React.CSSProperties = {
  flex: 1, padding: '9px', borderRadius: 8,
  background: C.accent, border: 'none', color: '#000',
  cursor: 'pointer', fontWeight: 700,
};
