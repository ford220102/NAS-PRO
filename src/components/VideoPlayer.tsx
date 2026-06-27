import { useState, useRef, useEffect, useCallback } from 'react';
import { C } from '../data/theme';

interface Track {
  id: string;
  title: string;
  folder: string;
  duration: string;
  size: string;
  type: 'mp4' | 'mkv' | 'avi' | 'webm';
  resolution: string;
  codec: string;
  added: string;
  thumbnail: string;
}

const DEMO_VIDEOS: Track[] = [
  { id: 'v1', title: 'Big Buck Bunny', folder: '/mnt/volume1/media/Movies', duration: '9:56', size: '276 MB', type: 'mp4', resolution: '1080p', codec: 'H.264', added: '2024-01-12', thumbnail: 'https://images.pexels.com/photos/1173777/pexels-photo-1173777.jpeg?w=400' },
  { id: 'v2', title: 'Jellyfish 4K Demo', folder: '/mnt/volume1/media/4K', duration: '2:30', size: '1.2 GB', type: 'mp4', resolution: '4K UHD', codec: 'H.265', added: '2024-02-05', thumbnail: 'https://images.pexels.com/photos/1001682/pexels-photo-1001682.jpeg?w=400' },
  { id: 'v3', title: 'Cosmos — Episode 1', folder: '/mnt/volume1/media/Documentaries', duration: '44:02', size: '2.1 GB', type: 'mkv', resolution: '1080p', codec: 'H.265', added: '2024-01-20', thumbnail: 'https://images.pexels.com/photos/1262304/pexels-photo-1262304.jpeg?w=400' },
  { id: 'v4', title: 'Reel 2025 Showreel', folder: '/mnt/volume1/media/Clips', duration: '4:12', size: '380 MB', type: 'webm', resolution: '1080p', codec: 'VP9', added: '2025-01-02', thumbnail: 'https://images.pexels.com/photos/3094799/pexels-photo-3094799.jpeg?w=400' },
  { id: 'v5', title: 'Mountain Timelapse', folder: '/mnt/volume2/media/Nature', duration: '12:44', size: '890 MB', type: 'mp4', resolution: '4K UHD', codec: 'AV1', added: '2024-11-15', thumbnail: 'https://images.pexels.com/photos/417173/pexels-photo-417173.jpeg?w=400' },
  { id: 'v6', title: 'City Nights 2160p', folder: '/mnt/volume2/media/4K', duration: '18:30', size: '3.4 GB', type: 'mkv', resolution: '4K HDR', codec: 'H.265 10-bit', added: '2024-09-08', thumbnail: 'https://images.pexels.com/photos/378570/pexels-photo-378570.jpeg?w=400' },
];

const FOLDERS = ['All Videos', 'Movies', '4K', 'Documentaries', 'Clips', 'Nature'];
const CODEC_COLORS: Record<string, string> = { 'H.264': C.blue, 'H.265': C.accent, 'AV1': C.purple, 'VP9': C.teal, 'H.265 10-bit': C.orange };

export default function VideoPlayer() {
  const [folder, setFolder] = useState('All Videos');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Track | null>(null);
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'title' | 'size' | 'added'>('title');
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(80);
  const [muted, setMuted] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  void fullscreen; void setFullscreen;
  const progressRef = useRef<number>();

  const filtered = DEMO_VIDEOS
    .filter(v => folder === 'All Videos' || v.folder.includes(folder))
    .filter(v => !search || v.title.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => sortBy === 'title' ? a.title.localeCompare(b.title) : sortBy === 'size' ? parseFloat(b.size) - parseFloat(a.size) : b.added.localeCompare(a.added));

  const play = useCallback((track: Track) => {
    setSelected(track);
    setIsPlaying(true);
    setProgress(0);
  }, []);

  useEffect(() => {
    if (!isPlaying) return;
    progressRef.current = window.setInterval(() => {
      setProgress(p => {
        if (p >= 100) { setIsPlaying(false); return 0; }
        return p + 0.08;
      });
    }, 150);
    return () => clearInterval(progressRef.current);
  }, [isPlaying, selected]);

  const togglePlay = () => setIsPlaying(v => !v);

  const fmt = (pct: number, dur: string) => {
    const parts = dur.split(':').map(Number);
    const total = parts.length === 3 ? parts[0] * 3600 + parts[1] * 60 + parts[2] : parts[0] * 60 + parts[1];
    const cur = Math.floor(total * pct / 100);
    const h = Math.floor(cur / 3600);
    const m = Math.floor((cur % 3600) / 60);
    const s = cur % 60;
    return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div style={{ display: 'flex', height: '100%', background: C.bg }}>
      {/* Sidebar */}
      <div style={{ width: 180, borderRight: `1px solid ${C.border}`, background: C.panel2, display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: '14px 14px 10px', borderBottom: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: C.text, marginBottom: 2 }}>Video</div>
          <div style={{ fontSize: 10, color: C.muted }}>{DEMO_VIDEOS.length} files</div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 8px' }}>
          {FOLDERS.map(f => (
            <button key={f} onClick={() => setFolder(f)} style={{
              display: 'block', width: '100%', textAlign: 'left',
              padding: '7px 10px', borderRadius: 7, border: 'none',
              background: folder === f ? C.accentDim : 'transparent',
              color: folder === f ? C.accent : C.textSub,
              cursor: 'pointer', fontSize: 12, fontWeight: folder === f ? 700 : 400,
              marginBottom: 2, transition: 'all 0.15s',
            }}>
              {f === 'All Videos' ? '🎬 ' : '📁 '}{f}
            </button>
          ))}
          <div style={{ height: 1, background: C.border, margin: '8px 0' }} />
          <div style={{ fontSize: 9, color: C.border, padding: '2px 10px', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Volumes</div>
          {['/mnt/volume1/media', '/mnt/volume2/media'].map(v => (
            <div key={v} style={{ padding: '5px 10px', fontSize: 10, color: C.muted, fontFamily: 'monospace' }}>{v.split('/').pop()}</div>
          ))}
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderBottom: `1px solid ${C.border}`, background: C.panel2, flexShrink: 0 }}>
          <input type="text" placeholder="Search videos..." value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1, padding: '7px 12px', borderRadius: 7, background: C.panel3, border: `1px solid ${C.border}`, color: C.text, fontSize: 12, outline: 'none' }} />
          <select value={sortBy} onChange={e => setSortBy(e.target.value as 'title' | 'size' | 'added')} style={{ padding: '7px 10px', borderRadius: 7, background: C.panel3, border: `1px solid ${C.border}`, color: C.text, fontSize: 12, outline: 'none' }}>
            <option value="title">Name</option>
            <option value="size">Size</option>
            <option value="added">Date</option>
          </select>
          <button onClick={() => setView(v => v === 'grid' ? 'list' : 'grid')} style={{ padding: '7px 10px', borderRadius: 7, background: C.panel3, border: `1px solid ${C.border}`, color: C.muted, cursor: 'pointer', fontSize: 13 }}>
            {view === 'grid' ? '☰' : '⊞'}
          </button>
        </div>

        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* Video grid/list */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 14, scrollbarWidth: 'thin', scrollbarColor: `${C.border} transparent` }}>
            {view === 'grid' ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
                {filtered.map(v => (
                  <VideoCard key={v.id} v={v} selected={selected?.id === v.id} onPlay={() => play(v)} />
                ))}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {filtered.map(v => (
                  <VideoRow key={v.id} v={v} selected={selected?.id === v.id} onPlay={() => play(v)} />
                ))}
              </div>
            )}
          </div>

          {/* Player panel */}
          {selected && (
            <div style={{ width: 300, borderLeft: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', background: C.panel, flexShrink: 0 }}>
              {/* Screen */}
              <div style={{ position: 'relative', background: '#000', aspectRatio: '16/9', overflow: 'hidden', flexShrink: 0 }}>
                <img src={selected.thumbnail} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: isPlaying ? 0.85 : 0.5 }} />
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <button onClick={togglePlay} style={{
                    width: 54, height: 54, borderRadius: '50%',
                    background: 'rgba(0,0,0,0.7)', border: `2px solid rgba(255,255,255,0.4)`,
                    color: '#fff', fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    backdropFilter: 'blur(8px)', transition: 'all 0.15s',
                  }}>
                    {isPlaying ? '⏸' : '▶'}
                  </button>
                </div>
                {isPlaying && (
                  <div style={{ position: 'absolute', bottom: 8, right: 8, background: 'rgba(0,194,168,0.9)', borderRadius: 4, padding: '2px 6px', fontSize: 9, fontWeight: 700, color: '#000' }}>LIVE</div>
                )}
              </div>

              {/* Progress */}
              <div style={{ padding: '12px 14px 8px' }}>
                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4, color: C.text }}>{selected.title}</div>
                <div style={{ fontSize: 10, color: C.muted, marginBottom: 10 }}>{selected.resolution} · {selected.codec} · {selected.size}</div>
                <div style={{ position: 'relative', height: 4, background: C.subtle, borderRadius: 2, marginBottom: 6, cursor: 'pointer' }}
                  onClick={e => { const r = (e.currentTarget as HTMLDivElement).getBoundingClientRect(); setProgress(((e.clientX - r.left) / r.width) * 100); }}>
                  <div style={{ width: `${progress}%`, height: '100%', background: `linear-gradient(90deg, ${C.accent}, ${C.teal})`, borderRadius: 2, transition: 'width 0.15s linear' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: C.muted }}>
                  <span>{fmt(progress, selected.duration)}</span>
                  <span>{selected.duration}</span>
                </div>
              </div>

              {/* Controls */}
              <div style={{ padding: '0 14px 10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                <CtrlBtn icon="⏮" onClick={() => { const i = filtered.findIndex(x => x.id === selected.id); play(filtered[(i - 1 + filtered.length) % filtered.length]); }} />
                <CtrlBtn icon="⏪" onClick={() => setProgress(p => Math.max(0, p - 5))} />
                <button onClick={togglePlay} style={{ width: 40, height: 40, borderRadius: '50%', background: C.accent, border: 'none', color: '#000', fontSize: 16, cursor: 'pointer' }}>
                  {isPlaying ? '⏸' : '▶'}
                </button>
                <CtrlBtn icon="⏩" onClick={() => setProgress(p => Math.min(100, p + 5))} />
                <CtrlBtn icon="⏭" onClick={() => { const i = filtered.findIndex(x => x.id === selected.id); play(filtered[(i + 1) % filtered.length]); }} />
              </div>

              {/* Volume */}
              <div style={{ padding: '0 14px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <button onClick={() => setMuted(v => !v)} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 13 }}>{muted ? '🔇' : volume > 50 ? '🔊' : '🔉'}</button>
                <input type="range" min={0} max={100} value={muted ? 0 : volume} onChange={e => { setVolume(+e.target.value); setMuted(false); }}
                  style={{ flex: 1, accentColor: C.accent }} />
                <span style={{ fontSize: 10, color: C.muted, minWidth: 24 }}>{muted ? 0 : volume}</span>
              </div>

              {/* Info */}
              <div style={{ padding: '10px 14px', borderTop: `1px solid ${C.border}`, flex: 1, overflowY: 'auto' }}>
                <div style={{ fontSize: 10, color: C.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>File Info</div>
                {[
                  ['Path', selected.folder],
                  ['Format', selected.type.toUpperCase()],
                  ['Codec', selected.codec],
                  ['Resolution', selected.resolution],
                  ['Size', selected.size],
                  ['Added', selected.added],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: `1px solid ${C.border}22`, fontSize: 10 }}>
                    <span style={{ color: C.muted }}>{k}</span>
                    <span style={{ color: C.textSub, fontFamily: k === 'Path' ? 'monospace' : undefined, fontSize: k === 'Path' ? 9 : 10, maxWidth: 140, textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function VideoCard({ v, selected, onPlay }: { v: Track; selected: boolean; onPlay: () => void }) {
  const [hov, setHov] = useState(false);
  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      onClick={onPlay}
      style={{
        borderRadius: 10, overflow: 'hidden', cursor: 'pointer',
        border: `1px solid ${selected ? C.accent + '66' : C.border}`,
        background: selected ? C.accentDim : C.panel2,
        transform: hov ? 'translateY(-2px)' : 'none',
        transition: 'all 0.15s',
        boxShadow: hov ? '0 8px 20px rgba(0,0,0,0.4)' : 'none',
      }}>
      <div style={{ position: 'relative', aspectRatio: '16/9', overflow: 'hidden' }}>
        <img src={v.thumbnail} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s', transform: hov ? 'scale(1.05)' : 'scale(1)' }} />
        <div style={{ position: 'absolute', inset: 0, background: hov ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.15)', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {hov && <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(0,0,0,0.7)', border: '2px solid rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: '#fff' }}>▶</div>}
        </div>
        <div style={{ position: 'absolute', bottom: 5, right: 6, background: 'rgba(0,0,0,0.8)', borderRadius: 3, padding: '1px 5px', fontSize: 9, color: '#fff' }}>{v.duration}</div>
        <div style={{ position: 'absolute', top: 5, left: 6, background: CODEC_COLORS[v.codec] + 'cc', borderRadius: 3, padding: '1px 5px', fontSize: 8, fontWeight: 700, color: '#000' }}>{v.codec}</div>
      </div>
      <div style={{ padding: '8px 10px' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: C.text, marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.title}</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: C.muted }}>
          <span>{v.resolution}</span><span>{v.size}</span>
        </div>
      </div>
    </div>
  );
}

function VideoRow({ v, selected, onPlay }: { v: Track; selected: boolean; onPlay: () => void }) {
  const [hov, setHov] = useState(false);
  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)} onClick={onPlay}
      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 10px', borderRadius: 8, cursor: 'pointer', background: selected ? C.accentDim : hov ? C.panel2 : 'transparent', border: `1px solid ${selected ? C.accent + '44' : 'transparent'}`, transition: 'all 0.12s' }}>
      <img src={v.thumbnail} alt="" style={{ width: 64, height: 36, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.title}</div>
        <div style={{ fontSize: 10, color: C.muted, fontFamily: 'monospace' }}>{v.folder}</div>
      </div>
      <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, background: CODEC_COLORS[v.codec] + '22', color: CODEC_COLORS[v.codec], fontWeight: 700, flexShrink: 0 }}>{v.codec}</span>
      <span style={{ fontSize: 10, color: C.muted, minWidth: 50, textAlign: 'right', flexShrink: 0 }}>{v.resolution}</span>
      <span style={{ fontSize: 10, color: C.muted, minWidth: 50, textAlign: 'right', flexShrink: 0 }}>{v.size}</span>
      <span style={{ fontSize: 10, color: C.muted, minWidth: 35, textAlign: 'right', flexShrink: 0 }}>{v.duration}</span>
    </div>
  );
}

function CtrlBtn({ icon, onClick }: { icon: string; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 14, padding: '4px', borderRadius: 5 }}>{icon}</button>
  );
}
