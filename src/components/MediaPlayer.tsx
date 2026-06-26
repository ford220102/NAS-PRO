import { useState, useRef, useEffect, useCallback } from 'react';
import { C } from '../data/theme';

// ─── Types ───────────────────────────────────────────────────────────────────

type MediaType = 'video' | 'audio';
type ViewMode  = 'grid' | 'list';
type SortKey   = 'title' | 'size' | 'added' | 'duration';

interface MediaItem {
  id: string;
  title: string;
  artist?: string;
  album?: string;
  type: MediaType;
  format: string;        // mp4, mkv, mp3, flac …
  resolution?: string;   // 4K UHD, 1080p …
  codec: string;
  duration: string;      // mm:ss or hh:mm:ss
  size: string;
  added: string;
  folder: string;
  thumbnail: string;
  bitrate?: string;
  sampleRate?: string;
}

// ─── Demo library ────────────────────────────────────────────────────────────

const LIBRARY: MediaItem[] = [
  // Video
  { id: 'v1', type: 'video', title: 'Big Buck Bunny',          format: 'mp4',  resolution: '1080p FHD', codec: 'H.264',      duration: '9:56',  size: '276 MB', added: '2024-01-12', folder: '/mnt/volume1/media/Movies',        thumbnail: 'https://images.pexels.com/photos/1173777/pexels-photo-1173777.jpeg?w=400' },
  { id: 'v2', type: 'video', title: 'Jellyfish 4K Demo',       format: 'mp4',  resolution: '4K UHD',   codec: 'H.265',      duration: '2:30',  size: '1.2 GB', added: '2024-02-05', folder: '/mnt/volume1/media/4K',            thumbnail: 'https://images.pexels.com/photos/1001682/pexels-photo-1001682.jpeg?w=400' },
  { id: 'v3', type: 'video', title: 'Cosmos — Episode 1',      format: 'mkv',  resolution: '1080p FHD', codec: 'H.265',      duration: '44:02', size: '2.1 GB', added: '2024-01-20', folder: '/mnt/volume1/media/Documentaries', thumbnail: 'https://images.pexels.com/photos/1262304/pexels-photo-1262304.jpeg?w=400' },
  { id: 'v4', type: 'video', title: 'City Nights 2160p',       format: 'mkv',  resolution: '4K HDR',   codec: 'H.265 10-bit',duration: '18:30', size: '3.4 GB', added: '2024-09-08', folder: '/mnt/volume2/media/4K',            thumbnail: 'https://images.pexels.com/photos/378570/pexels-photo-378570.jpeg?w=400' },
  { id: 'v5', type: 'video', title: 'Mountain Timelapse',      format: 'mp4',  resolution: '4K UHD',   codec: 'AV1',        duration: '12:44', size: '890 MB', added: '2024-11-15', folder: '/mnt/volume2/media/Nature',        thumbnail: 'https://images.pexels.com/photos/417173/pexels-photo-417173.jpeg?w=400' },
  { id: 'v6', type: 'video', title: 'Reel 2025 Showreel',      format: 'webm', resolution: '1080p FHD', codec: 'VP9',        duration: '4:12',  size: '380 MB', added: '2025-01-02', folder: '/mnt/volume1/media/Clips',         thumbnail: 'https://images.pexels.com/photos/3094799/pexels-photo-3094799.jpeg?w=400' },
  // Audio
  { id: 'a1', type: 'audio', title: 'Moonlight Sonata',  artist: 'Beethoven',     album: 'Classical Essentials', format: 'flac', codec: 'FLAC',   duration: '5:30',  size: '52 MB',  added: '2024-03-01', folder: '/mnt/volume1/music/Classical', thumbnail: 'https://images.pexels.com/photos/164821/pexels-photo-164821.jpeg?w=400', bitrate: 'Lossless', sampleRate: '96 kHz / 24-bit' },
  { id: 'a2', type: 'audio', title: 'Bohemian Rhapsody', artist: 'Queen',          album: 'A Night at the Opera', format: 'flac', codec: 'FLAC',   duration: '5:55',  size: '68 MB',  added: '2024-04-10', folder: '/mnt/volume1/music/Rock',     thumbnail: 'https://images.pexels.com/photos/167092/pexels-photo-167092.jpeg?w=400', bitrate: 'Lossless', sampleRate: '44.1 kHz / 24-bit' },
  { id: 'a3', type: 'audio', title: 'Kind of Blue',      artist: 'Miles Davis',    album: 'Kind of Blue',         format: 'mp3',  codec: 'MP3',    duration: '9:22',  size: '12 MB',  added: '2024-02-14', folder: '/mnt/volume1/music/Jazz',     thumbnail: 'https://images.pexels.com/photos/1537638/pexels-photo-1537638.jpeg?w=400', bitrate: '320 kbps', sampleRate: '44.1 kHz' },
  { id: 'a4', type: 'audio', title: 'Strobe',            artist: 'Deadmau5',       album: 'For Lack of a Better', format: 'flac', codec: 'FLAC',   duration: '10:37', size: '110 MB', added: '2024-05-18', folder: '/mnt/volume1/music/Electronic',thumbnail: 'https://images.pexels.com/photos/1540406/pexels-photo-1540406.jpeg?w=400', bitrate: 'Lossless', sampleRate: '48 kHz / 24-bit' },
  { id: 'a5', type: 'audio', title: 'Clair de Lune',    artist: 'Debussy',         album: 'Suite Bergamasque',    format: 'flac', codec: 'FLAC',   duration: '4:58',  size: '48 MB',  added: '2024-06-01', folder: '/mnt/volume1/music/Classical', thumbnail: 'https://images.pexels.com/photos/164693/pexels-photo-164693.jpeg?w=400', bitrate: 'Lossless', sampleRate: '96 kHz / 24-bit' },
  { id: 'a6', type: 'audio', title: 'Lose Yourself',    artist: 'Eminem',          album: '8 Mile',               format: 'mp3',  codec: 'MP3',    duration: '5:26',  size: '7 MB',   added: '2024-07-22', folder: '/mnt/volume1/music/Hip-Hop',   thumbnail: 'https://images.pexels.com/photos/1105666/pexels-photo-1105666.jpeg?w=400', bitrate: '320 kbps', sampleRate: '44.1 kHz' },
];

const CODEC_COLORS: Record<string, string> = {
  'H.264': C.blue, 'H.265': C.accent, 'H.265 10-bit': C.orange,
  'AV1': C.purple, 'VP9': C.teal,
  'FLAC': C.accent, 'MP3': C.blue, 'AAC': C.teal,
};

const VIDEO_FOLDERS  = ['All', 'Movies', '4K', 'Documentaries', 'Clips', 'Nature'];
const AUDIO_FOLDERS  = ['All', 'Classical', 'Rock', 'Jazz', 'Electronic', 'Hip-Hop'];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseDuration(s: string): number {
  const p = s.split(':').map(Number);
  return p.length === 3 ? p[0] * 3600 + p[1] * 60 + p[2] : p[0] * 60 + p[1];
}
function fmtTime(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${m}:${String(s).padStart(2, '0')}`;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function MediaPlayer() {
  const [activeTab, setActiveTab]   = useState<MediaType>('video');
  const [folder, setFolder]         = useState('All');
  const [search, setSearch]         = useState('');
  const [view, setView]             = useState<ViewMode>('grid');
  const [sortBy, setSortBy]         = useState<SortKey>('title');
  const [selected, setSelected]     = useState<MediaItem | null>(null);
  const [isPlaying, setIsPlaying]   = useState(false);
  const [progress, setProgress]     = useState(0); // 0..100
  const [volume, setVolume]         = useState(80);
  const [muted, setMuted]           = useState(false);
  const [repeat, setRepeat]         = useState(false);
  const [shuffle, setShuffle]       = useState(false);
  const [showInfo, setShowInfo]     = useState(false);
  const tickRef = useRef<number>();

  // Switch folder list when tab changes
  useEffect(() => { setFolder('All'); setSearch(''); setSelected(null); setIsPlaying(false); }, [activeTab]);

  const folders = activeTab === 'video' ? VIDEO_FOLDERS : AUDIO_FOLDERS;

  const library = LIBRARY.filter(m => m.type === activeTab);

  const filtered = library
    .filter(m => folder === 'All' || m.folder.includes(folder))
    .filter(m => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        m.title.toLowerCase().includes(q) ||
        (m.artist?.toLowerCase().includes(q) ?? false) ||
        (m.album?.toLowerCase().includes(q) ?? false) ||
        m.codec.toLowerCase().includes(q) ||
        (m.resolution?.toLowerCase().includes(q) ?? false)
      );
    })
    .sort((a, b) => {
      if (sortBy === 'title')    return a.title.localeCompare(b.title);
      if (sortBy === 'size')     return parseFloat(b.size) - parseFloat(a.size);
      if (sortBy === 'added')    return b.added.localeCompare(a.added);
      if (sortBy === 'duration') return parseDuration(b.duration) - parseDuration(a.duration);
      return 0;
    });

  // Playback ticker
  useEffect(() => {
    if (!isPlaying || !selected) return;
    const total = parseDuration(selected.duration);
    tickRef.current = window.setInterval(() => {
      setProgress(p => {
        const next = p + (100 / total) * 0.5; // tick every 500ms
        if (next >= 100) {
          setIsPlaying(false);
          if (repeat) { setTimeout(() => { setProgress(0); setIsPlaying(true); }, 200); }
          return 0;
        }
        return next;
      });
    }, 500);
    return () => clearInterval(tickRef.current);
  }, [isPlaying, selected, repeat]);

  const play = useCallback((item: MediaItem) => {
    setSelected(item); setProgress(0); setIsPlaying(true);
  }, []);

  const next = useCallback(() => {
    if (!selected) return;
    const pool = shuffle ? [...filtered].sort(() => Math.random() - 0.5) : filtered;
    const i = pool.findIndex(x => x.id === selected.id);
    play(pool[(i + 1) % pool.length]);
  }, [selected, filtered, shuffle, play]);

  const prev = useCallback(() => {
    if (!selected) return;
    const i = filtered.findIndex(x => x.id === selected.id);
    play(filtered[(i - 1 + filtered.length) % filtered.length]);
  }, [selected, filtered, play]);

  const seekTo = (pct: number) => { setProgress(Math.max(0, Math.min(100, pct))); };

  const currentSec  = selected ? Math.floor(parseDuration(selected.duration) * progress / 100) : 0;

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', height: '100%', background: C.bg, fontFamily: 'inherit' }}>

      {/* ── Sidebar ─────────────────────────────── */}
      <div style={{ width: 190, borderRight: `1px solid ${C.border}`, background: C.panel2, display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        {/* Type tabs */}
        <div style={{ display: 'flex', borderBottom: `1px solid ${C.border}` }}>
          {(['video', 'audio'] as const).map(t => (
            <button key={t} onClick={() => setActiveTab(t)} style={{
              flex: 1, padding: '12px 0', background: 'none', border: 'none',
              borderBottom: `2px solid ${activeTab === t ? C.accent : 'transparent'}`,
              color: activeTab === t ? C.accent : C.muted,
              cursor: 'pointer', fontSize: 11, fontWeight: activeTab === t ? 700 : 400,
              transition: 'all 0.15s',
            }}>
              {t === 'video' ? '🎬 Video' : '🎵 Audio'}
            </button>
          ))}
        </div>

        {/* Folder list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 8px' }}>
          <div style={{ fontSize: 9, color: C.muted, padding: '4px 10px 6px', textTransform: 'uppercase', letterSpacing: 1 }}>
            {activeTab === 'video' ? 'Folders' : 'Genres'}
          </div>
          {folders.map(f => (
            <button key={f} onClick={() => setFolder(f)} style={{
              display: 'block', width: '100%', textAlign: 'left',
              padding: '7px 10px', borderRadius: 7, border: 'none',
              background: folder === f ? C.accentDim : 'transparent',
              color: folder === f ? C.accent : C.textSub,
              cursor: 'pointer', fontSize: 11, fontWeight: folder === f ? 700 : 400,
              marginBottom: 2, transition: 'all 0.15s',
            }}>
              {f === 'All' ? (activeTab === 'video' ? '🎬 All Videos' : '🎵 All Tracks') : `📁 ${f}`}
            </button>
          ))}

          <div style={{ height: 1, background: C.border, margin: '8px 4px' }} />
          <div style={{ fontSize: 9, color: C.muted, padding: '2px 10px 6px', textTransform: 'uppercase', letterSpacing: 1 }}>Stats</div>
          {[
            ['Total', `${library.length} items`],
            ['Filtered', `${filtered.length} items`],
          ].map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 10px', fontSize: 10 }}>
              <span style={{ color: C.muted }}>{k}</span>
              <span style={{ color: C.textSub }}>{v}</span>
            </div>
          ))}
        </div>

        {/* Mini now-playing */}
        {selected && (
          <div style={{ padding: '10px 12px', borderTop: `1px solid ${C.border}`, background: C.panel3 }}>
            <div style={{ fontSize: 10, color: C.muted, marginBottom: 4 }}>NOW PLAYING</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selected.title}</div>
            {selected.artist && <div style={{ fontSize: 10, color: C.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selected.artist}</div>}
            {/* Mini progress bar */}
            <div onClick={e => { const r = e.currentTarget.getBoundingClientRect(); seekTo(((e.clientX - r.left) / r.width) * 100); }}
              style={{ marginTop: 6, height: 3, background: C.subtle, borderRadius: 2, cursor: 'pointer' }}>
              <div style={{ width: `${progress}%`, height: '100%', background: C.accent, borderRadius: 2, transition: 'width 0.5s linear' }} />
            </div>
          </div>
        )}
      </div>

      {/* ── Main area ───────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderBottom: `1px solid ${C.border}`, background: C.panel2, flexShrink: 0 }}>
          <input
            type="text"
            placeholder={`Search ${activeTab === 'video' ? 'videos' : 'tracks, artists, albums'}…`}
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ flex: 1, padding: '7px 12px', borderRadius: 7, background: C.panel3, border: `1px solid ${C.border}`, color: C.text, fontSize: 12, outline: 'none' }}
          />
          <select value={sortBy} onChange={e => setSortBy(e.target.value as SortKey)}
            style={{ padding: '7px 10px', borderRadius: 7, background: C.panel3, border: `1px solid ${C.border}`, color: C.text, fontSize: 12, outline: 'none' }}>
            <option value="title">A–Z</option>
            <option value="size">Size</option>
            <option value="added">Date</option>
            <option value="duration">Duration</option>
          </select>
          <ToolBtn icon={view === 'grid' ? '☰' : '⊞'} onClick={() => setView(v => v === 'grid' ? 'list' : 'grid')} title="Toggle view" />
        </div>

        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

          {/* Library */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 14, scrollbarWidth: 'thin', scrollbarColor: `${C.border} transparent` }}>
            {filtered.length === 0 ? (
              <div style={{ textAlign: 'center', color: C.muted, marginTop: 60, fontSize: 13 }}>
                No results for "{search}"
              </div>
            ) : view === 'grid' ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 12 }}>
                {filtered.map(item => (
                  <MediaCard key={item.id} item={item} active={selected?.id === item.id} onPlay={() => play(item)} />
                ))}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {filtered.map(item => (
                  <MediaRow key={item.id} item={item} active={selected?.id === item.id} onPlay={() => play(item)} />
                ))}
              </div>
            )}
          </div>

          {/* ── Player panel ─────────────────────── */}
          {selected && (
            <div style={{ width: 310, borderLeft: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', background: C.panel, flexShrink: 0 }}>

              {/* Artwork / thumbnail */}
              <div style={{ position: 'relative', background: '#000', aspectRatio: '16/9', overflow: 'hidden', flexShrink: 0 }}>
                <img src={selected.thumbnail} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: isPlaying ? 0.85 : 0.55, transition: 'opacity 0.3s' }} />
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <button onClick={() => setIsPlaying(v => !v)} style={{
                    width: 58, height: 58, borderRadius: '50%',
                    background: 'rgba(0,0,0,0.72)', border: `2px solid rgba(255,255,255,0.4)`,
                    color: '#fff', fontSize: 22, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    backdropFilter: 'blur(8px)', transition: 'all 0.15s',
                  }}>
                    {isPlaying ? '⏸' : '▶'}
                  </button>
                </div>
                {/* Resolution badge */}
                {selected.resolution && (
                  <div style={{ position: 'absolute', top: 7, left: 7, background: 'rgba(0,0,0,0.75)', borderRadius: 4, padding: '2px 7px', fontSize: 9, fontWeight: 800, color: '#fff', letterSpacing: 0.5 }}>
                    {selected.resolution}
                  </div>
                )}
                {isPlaying && (
                  <div style={{ position: 'absolute', bottom: 7, right: 8, background: `${C.accent}ee`, borderRadius: 4, padding: '2px 6px', fontSize: 9, fontWeight: 800, color: '#000' }}>● PLAYING</div>
                )}
              </div>

              {/* Info row */}
              <div style={{ padding: '12px 14px 6px' }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: C.text, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selected.title}</div>
                {selected.artist && <div style={{ fontSize: 11, color: C.muted, marginBottom: 1 }}>{selected.artist}</div>}
                {selected.album  && <div style={{ fontSize: 10, color: C.border, fontStyle: 'italic' }}>{selected.album}</div>}
                <div style={{ fontSize: 10, color: C.muted, marginTop: 4, display: 'flex', gap: 8 }}>
                  <span style={{ background: (CODEC_COLORS[selected.codec] ?? C.muted) + '22', color: CODEC_COLORS[selected.codec] ?? C.muted, padding: '1px 6px', borderRadius: 4, fontWeight: 700 }}>{selected.codec}</span>
                  <span>{selected.format.toUpperCase()}</span>
                  <span>{selected.size}</span>
                </div>
              </div>

              {/* Progress bar */}
              <div style={{ padding: '6px 14px 2px' }}>
                <div
                  onClick={e => { const r = e.currentTarget.getBoundingClientRect(); seekTo(((e.clientX - r.left) / r.width) * 100); }}
                  style={{ position: 'relative', height: 5, background: C.subtle, borderRadius: 3, cursor: 'pointer', marginBottom: 5 }}>
                  <div style={{ width: `${progress}%`, height: '100%', background: `linear-gradient(90deg, ${C.accent}, ${C.teal})`, borderRadius: 3, transition: 'width 0.5s linear' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: C.muted }}>
                  <span>{fmtTime(currentSec)}</span>
                  <span>{selected.duration}</span>
                </div>
              </div>

              {/* Transport controls */}
              <div style={{ padding: '8px 14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <ToolBtn icon="🔀" onClick={() => setShuffle(v => !v)} title="Shuffle" active={shuffle} />
                <ToolBtn icon="⏮" onClick={prev} title="Previous" />
                <ToolBtn icon="⏪" onClick={() => seekTo(progress - 5)} title="-5%" />
                <button onClick={() => setIsPlaying(v => !v)} style={{
                  width: 42, height: 42, borderRadius: '50%',
                  background: C.accent, border: 'none', color: '#000', fontSize: 17, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {isPlaying ? '⏸' : '▶'}
                </button>
                <ToolBtn icon="⏩" onClick={() => seekTo(progress + 5)} title="+5%" />
                <ToolBtn icon="⏭" onClick={next} title="Next" />
                <ToolBtn icon="🔁" onClick={() => setRepeat(v => !v)} title="Repeat" active={repeat} />
              </div>

              {/* Volume */}
              <div style={{ padding: '0 14px 10px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <button onClick={() => setMuted(v => !v)} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 14 }}>
                  {muted ? '🔇' : volume > 50 ? '🔊' : '🔉'}
                </button>
                <input type="range" min={0} max={100} value={muted ? 0 : volume}
                  onChange={e => { setVolume(+e.target.value); setMuted(false); }}
                  style={{ flex: 1, accentColor: C.accent }} />
                <span style={{ fontSize: 10, color: C.muted, minWidth: 26, textAlign: 'right' }}>{muted ? 0 : volume}%</span>
              </div>

              {/* Details toggle */}
              <button onClick={() => setShowInfo(v => !v)} style={{
                margin: '0 14px 6px', padding: '5px 0', background: C.panel2, border: `1px solid ${C.border}`,
                borderRadius: 7, color: C.muted, fontSize: 11, cursor: 'pointer',
              }}>
                {showInfo ? '▲ Hide details' : '▼ Show details'}
              </button>

              {showInfo && (
                <div style={{ padding: '0 14px 12px', flex: 1, overflowY: 'auto' }}>
                  {[
                    ['Path',        selected.folder],
                    ['Format',      selected.format.toUpperCase()],
                    ['Codec',       selected.codec],
                    ...(selected.resolution ? [['Resolution', selected.resolution]] : []),
                    ...(selected.bitrate    ? [['Bitrate',    selected.bitrate]]    : []),
                    ...(selected.sampleRate ? [['Sample Rate',selected.sampleRate]] : []),
                    ['Size',        selected.size],
                    ['Duration',    selected.duration],
                    ['Added',       selected.added],
                  ].map(([k, v]) => (
                    <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: `1px solid ${C.border}22`, fontSize: 10 }}>
                      <span style={{ color: C.muted }}>{k}</span>
                      <span style={{ color: C.textSub, maxWidth: 150, textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: k === 'Path' ? 'monospace' : undefined, fontSize: k === 'Path' ? 9 : 10 }}>{v}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Bottom playbar (always visible when something selected) ── */}
        {selected && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '8px 16px',
            borderTop: `1px solid ${C.border}`, background: C.panel2, flexShrink: 0,
          }}>
            <img src={selected.thumbnail} alt="" style={{ width: 36, height: 36, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selected.title}</div>
              <div style={{ fontSize: 10, color: C.muted }}>{selected.artist ?? selected.resolution ?? selected.codec}</div>
            </div>
            {/* Inline seek */}
            <div onClick={e => { const r = e.currentTarget.getBoundingClientRect(); seekTo(((e.clientX - r.left) / r.width) * 100); }}
              style={{ width: 160, height: 4, background: C.subtle, borderRadius: 2, cursor: 'pointer', flexShrink: 0 }}>
              <div style={{ width: `${progress}%`, height: '100%', background: C.accent, borderRadius: 2, transition: 'width 0.5s linear' }} />
            </div>
            <span style={{ fontSize: 10, color: C.muted, flexShrink: 0 }}>{fmtTime(currentSec)} / {selected.duration}</span>
            <button onClick={() => setIsPlaying(v => !v)} style={{ width: 32, height: 32, borderRadius: '50%', background: C.accent, border: 'none', color: '#000', fontSize: 14, cursor: 'pointer' }}>
              {isPlaying ? '⏸' : '▶'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ToolBtn({ icon, onClick, title, active }: { icon: string; onClick: () => void; title?: string; active?: boolean }) {
  return (
    <button onClick={onClick} title={title} style={{
      background: active ? C.accentDim : 'none', border: active ? `1px solid ${C.accent}44` : 'none',
      color: active ? C.accent : C.muted, cursor: 'pointer', fontSize: 14,
      padding: '4px 6px', borderRadius: 5, transition: 'all 0.12s',
    }}>{icon}</button>
  );
}

function MediaCard({ item, active, onPlay }: { item: MediaItem; active: boolean; onPlay: () => void }) {
  const [hov, setHov] = useState(false);
  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)} onClick={onPlay}
      style={{
        borderRadius: 10, overflow: 'hidden', cursor: 'pointer',
        border: `1px solid ${active ? C.accent + '66' : C.border}`,
        background: active ? C.accentDim : C.panel2,
        transform: hov ? 'translateY(-2px)' : 'none',
        boxShadow: hov ? '0 8px 20px rgba(0,0,0,0.4)' : 'none',
        transition: 'all 0.15s',
      }}>
      <div style={{ position: 'relative', aspectRatio: '16/9', overflow: 'hidden' }}>
        <img src={item.thumbnail} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', transform: hov ? 'scale(1.05)' : 'scale(1)', transition: 'transform 0.3s' }} />
        <div style={{ position: 'absolute', inset: 0, background: hov ? 'rgba(0,0,0,0.35)' : 'rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
          {hov && <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(0,0,0,0.7)', border: '2px solid rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: '#fff' }}>▶</div>}
        </div>
        <div style={{ position: 'absolute', bottom: 5, right: 6, background: 'rgba(0,0,0,0.8)', borderRadius: 3, padding: '1px 5px', fontSize: 9, color: '#fff' }}>{item.duration}</div>
        {item.resolution && <div style={{ position: 'absolute', top: 5, left: 6, background: 'rgba(0,0,0,0.75)', borderRadius: 3, padding: '1px 5px', fontSize: 8, fontWeight: 800, color: '#fff' }}>{item.resolution}</div>}
        {item.type === 'audio' && <div style={{ position: 'absolute', top: 5, right: 6, background: (CODEC_COLORS[item.codec] ?? C.muted) + 'cc', borderRadius: 3, padding: '1px 5px', fontSize: 8, fontWeight: 700, color: '#000' }}>{item.codec}</div>}
      </div>
      <div style={{ padding: '8px 10px' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</div>
        {item.artist && <div style={{ fontSize: 10, color: C.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.artist}</div>}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: C.muted, marginTop: 3 }}>
          <span>{item.resolution ?? item.bitrate ?? item.codec}</span>
          <span>{item.size}</span>
        </div>
      </div>
    </div>
  );
}

function MediaRow({ item, active, onPlay }: { item: MediaItem; active: boolean; onPlay: () => void }) {
  const [hov, setHov] = useState(false);
  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)} onClick={onPlay}
      style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '8px 10px',
        borderRadius: 8, cursor: 'pointer',
        background: active ? C.accentDim : hov ? C.panel2 : 'transparent',
        border: `1px solid ${active ? C.accent + '44' : 'transparent'}`,
        transition: 'all 0.12s',
      }}>
      <img src={item.thumbnail} alt="" style={{ width: 64, height: 36, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</div>
        <div style={{ fontSize: 10, color: C.muted }}>{item.artist ? `${item.artist} · ${item.album ?? ''}` : item.folder.split('/').pop()}</div>
      </div>
      <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, background: (CODEC_COLORS[item.codec] ?? C.muted) + '22', color: CODEC_COLORS[item.codec] ?? C.muted, fontWeight: 700, flexShrink: 0 }}>{item.codec}</span>
      {item.resolution && <span style={{ fontSize: 10, color: C.muted, minWidth: 60, textAlign: 'right', flexShrink: 0 }}>{item.resolution}</span>}
      <span style={{ fontSize: 10, color: C.muted, minWidth: 50, textAlign: 'right', flexShrink: 0 }}>{item.size}</span>
      <span style={{ fontSize: 10, color: C.muted, minWidth: 38, textAlign: 'right', flexShrink: 0 }}>{item.duration}</span>
    </div>
  );
}
