import { useState, useRef, useCallback } from 'react';
import { C } from '../data/theme';

interface UploadFile {
  id: string;
  name: string;
  size: number;
  type: string;
  dest: string;
  progress: number;
  status: 'waiting' | 'uploading' | 'done' | 'error';
}

const VOLUME_PATHS = [
  '/mnt/volume1/uploads',
  '/mnt/volume1/media',
  '/mnt/volume1/music',
  '/mnt/volume1/photos',
  '/mnt/volume2/backups',
  '/mnt/volume2/media',
];

function fmtSize(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 ** 2) return `${(b / 1024).toFixed(1)} KB`;
  if (b < 1024 ** 3) return `${(b / 1024 ** 2).toFixed(1)} MB`;
  return `${(b / 1024 ** 3).toFixed(2)} GB`;
}

export default function UploadManager() {
  const [dest, setDest] = useState(VOLUME_PATHS[0]);
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const timersRef = useRef<Record<string, number>>({});

  const addFiles = useCallback((fileList: FileList | null) => {
    if (!fileList) return;
    const newFiles: UploadFile[] = Array.from(fileList).map(f => ({
      id: Math.random().toString(36).slice(2),
      name: f.name,
      size: f.size,
      type: f.type || 'application/octet-stream',
      dest,
      progress: 0,
      status: 'waiting',
    }));
    setFiles(prev => [...prev, ...newFiles]);
  }, [dest]);

  const startUpload = useCallback((id: string) => {
    setFiles(prev => prev.map(f => f.id === id ? { ...f, status: 'uploading' } : f));
    const speed = Math.random() * 1.5 + 0.5;
    timersRef.current[id] = window.setInterval(() => {
      setFiles(prev => {
        const file = prev.find(f => f.id === id);
        if (!file || file.status !== 'uploading') { clearInterval(timersRef.current[id]); return prev; }
        const newProgress = Math.min(100, file.progress + speed);
        if (newProgress >= 100) {
          clearInterval(timersRef.current[id]);
          return prev.map(f => f.id === id ? { ...f, progress: 100, status: 'done' } : f);
        }
        return prev.map(f => f.id === id ? { ...f, progress: newProgress } : f);
      });
    }, 120);
  }, []);

  const startAll = () => { files.filter(f => f.status === 'waiting').forEach(f => startUpload(f.id)); };
  const clearDone = () => { setFiles(prev => prev.filter(f => f.status !== 'done')); };
  const removeFile = (id: string) => { clearInterval(timersRef.current[id]); setFiles(prev => prev.filter(f => f.id !== id)); };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    addFiles(e.dataTransfer.files);
  }, [addFiles]);

  const totalSize = files.reduce((s, f) => s + f.size, 0);
  const doneCount = files.filter(f => f.status === 'done').length;
  const uploadingCount = files.filter(f => f.status === 'uploading').length;
  const typeIcon = (mime: string) => {
    if (mime.startsWith('video')) return '🎬';
    if (mime.startsWith('audio')) return '🎵';
    if (mime.startsWith('image')) return '🖼';
    if (mime.includes('pdf')) return '📄';
    if (mime.includes('zip') || mime.includes('tar') || mime.includes('gzip')) return '📦';
    return '📄';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Toolbar */}
      <div style={{ padding: '12px 16px', borderBottom: `1px solid ${C.border}`, background: C.panel2, display: 'flex', gap: 10, alignItems: 'center', flexShrink: 0, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
          <span style={{ fontSize: 11, color: C.muted, flexShrink: 0 }}>Destination:</span>
          <select value={dest} onChange={e => setDest(e.target.value)} style={{ flex: 1, padding: '6px 10px', borderRadius: 7, background: C.panel3, border: `1px solid ${C.border}`, color: C.text, fontSize: 12, outline: 'none', fontFamily: 'monospace' }}>
            {VOLUME_PATHS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <button onClick={() => fileInputRef.current?.click()} style={{ padding: '7px 14px', borderRadius: 8, background: C.accentDim, border: `1px solid ${C.accent}44`, color: C.accent, cursor: 'pointer', fontWeight: 600, fontSize: 12 }}>+ Add Files</button>
        <button onClick={startAll} disabled={!files.some(f => f.status === 'waiting')} style={{ padding: '7px 14px', borderRadius: 8, background: C.greenDim, border: `1px solid ${C.green}44`, color: C.green, cursor: 'pointer', fontWeight: 600, fontSize: 12, opacity: files.some(f => f.status === 'waiting') ? 1 : 0.4 }}>▶ Upload All</button>
        <button onClick={clearDone} disabled={doneCount === 0} style={{ padding: '7px 14px', borderRadius: 8, background: C.subtle, border: `1px solid ${C.border}`, color: C.muted, cursor: 'pointer', fontSize: 12, opacity: doneCount > 0 ? 1 : 0.4 }}>Clear Done</button>
        <input ref={fileInputRef} type="file" multiple style={{ display: 'none' }} onChange={e => addFiles(e.target.files)} />
      </div>

      {/* Stats bar */}
      {files.length > 0 && (
        <div style={{ padding: '6px 16px', borderBottom: `1px solid ${C.border}`, background: C.panel3, display: 'flex', gap: 20, fontSize: 11, color: C.muted, flexShrink: 0 }}>
          <span>Total: <b style={{ color: C.text }}>{files.length} files</b></span>
          <span>Size: <b style={{ color: C.text }}>{fmtSize(totalSize)}</b></span>
          <span>Done: <b style={{ color: C.green }}>{doneCount}</b></span>
          <span>Uploading: <b style={{ color: C.accent }}>{uploadingCount}</b></span>
          <span>Waiting: <b style={{ color: C.yellow }}>{files.filter(f => f.status === 'waiting').length}</b></span>
        </div>
      )}

      {/* Drop zone + file list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 16, scrollbarWidth: 'thin', scrollbarColor: `${C.border} transparent` }}>
        {/* Drop zone */}
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: `2px dashed ${dragging ? C.accent : C.border}`,
            borderRadius: 14, padding: '28px 20px', textAlign: 'center',
            cursor: 'pointer', transition: 'all 0.2s', marginBottom: files.length ? 14 : 0,
            background: dragging ? C.accentDim : 'transparent',
            transform: dragging ? 'scale(1.01)' : 'scale(1)',
          }}
        >
          <div style={{ fontSize: 36, marginBottom: 10, opacity: dragging ? 1 : 0.5 }}>📤</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: dragging ? C.accent : C.textSub, marginBottom: 4 }}>
            {dragging ? 'Drop files here' : 'Drag & drop files to upload'}
          </div>
          <div style={{ fontSize: 11, color: C.muted }}>Or click to browse — files go to {dest}</div>
        </div>

        {/* File list */}
        {files.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {files.map(f => (
              <div key={f.id} style={{
                background: f.status === 'done' ? C.greenDim : C.panel2,
                borderRadius: 10, border: `1px solid ${f.status === 'done' ? C.green + '33' : f.status === 'error' ? C.red + '33' : C.border}`,
                padding: '10px 14px', transition: 'all 0.2s',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: f.status === 'uploading' ? 8 : 0 }}>
                  <span style={{ fontSize: 18, flexShrink: 0 }}>{typeIcon(f.type)}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</div>
                    <div style={{ fontSize: 10, color: C.muted }}>{fmtSize(f.size)} · {f.dest}</div>
                  </div>
                  <StatusChip status={f.status} progress={f.progress} />
                  {f.status === 'waiting' && (
                    <button onClick={() => startUpload(f.id)} style={{ padding: '4px 10px', borderRadius: 6, background: C.accentDim, border: `1px solid ${C.accent}44`, color: C.accent, cursor: 'pointer', fontSize: 11 }}>Upload</button>
                  )}
                  <button onClick={() => removeFile(f.id)} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 14, padding: '2px 4px' }}>✕</button>
                </div>
                {f.status === 'uploading' && (
                  <div style={{ height: 4, background: C.subtle, borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ width: `${f.progress}%`, height: '100%', background: `linear-gradient(90deg, ${C.accent}, ${C.teal})`, borderRadius: 2, transition: 'width 0.1s linear', boxShadow: `0 0 6px ${C.accent}66` }} />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatusChip({ status, progress }: { status: UploadFile['status']; progress: number }) {
  const map = {
    waiting:   { color: C.yellow, label: 'Waiting' },
    uploading: { color: C.accent, label: `${Math.round(progress)}%` },
    done:      { color: C.green,  label: '✓ Done' },
    error:     { color: C.red,    label: '✕ Error' },
  };
  const { color, label } = map[status];
  return (
    <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 5, background: color + '18', color, fontWeight: 700, flexShrink: 0 }}>{label}</span>
  );
}
