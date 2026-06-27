import { useState, useEffect, useRef } from 'react';
import { C } from '../data/theme';

interface Song {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: string;
  year: number;
  genre: string;
  size: string;
  format: string;
  bitrate: string;
  cover: string;
  path: string;
}

const SONGS: Song[] = [
  { id: 's1', title: 'Midnight Drive', artist: 'Synthwave Collective', album: 'Neon Roads', duration: '4:22', year: 2023, genre: 'Synthwave', size: '18 MB', format: 'FLAC', bitrate: '1411 kbps', cover: 'https://images.pexels.com/photos/167092/pexels-photo-167092.jpeg?w=300', path: '/mnt/volume1/music/Synthwave Collective/Neon Roads' },
  { id: 's2', title: 'Aurora Borealis', artist: 'Nordic Pulse', album: 'Polar Nights', duration: '5:11', year: 2024, genre: 'Ambient', size: '22 MB', format: 'FLAC', bitrate: '1411 kbps', cover: 'https://images.pexels.com/photos/1054218/pexels-photo-1054218.jpeg?w=300', path: '/mnt/volume1/music/Nordic Pulse/Polar Nights' },
  { id: 's3', title: 'Concrete Jungle', artist: 'Urban Beats', album: 'City Lights', duration: '3:48', year: 2024, genre: 'Hip-Hop', size: '9 MB', format: 'MP3', bitrate: '320 kbps', cover: 'https://images.pexels.com/photos/378570/pexels-photo-378570.jpeg?w=300', path: '/mnt/volume1/music/Urban Beats/City Lights' },
  { id: 's4', title: 'Ocean Deep', artist: 'Tidal Wave', album: 'Blue Horizon', duration: '6:02', year: 2022, genre: 'Chillout', size: '26 MB', format: 'FLAC', bitrate: '1411 kbps', cover: 'https://images.pexels.com/photos/1001682/pexels-photo-1001682.jpeg?w=300', path: '/mnt/volume1/music/Tidal Wave/Blue Horizon' },
  { id: 's5', title: 'Binary Sunset', artist: 'Digital Dreams', album: 'Code & Soul', duration: '3:55', year: 2025, genre: 'Electronic', size: '11 MB', format: 'MP3', bitrate: '320 kbps', cover: 'https://images.pexels.com/photos/3094799/pexels-photo-3094799.jpeg?w=300', path: '/mnt/volume2/music/Digital Dreams/Code & Soul' },
  { id: 's6', title: 'Rainy Café', artist: 'Jazz Lounge', album: 'Smooth Sessions', duration: '5:30', year: 2023, genre: 'Jazz', size: '24 MB', format: 'FLAC', bitrate: '1411 kbps', cover: 'https://images.pexels.com/photos/417173/pexels-photo-417173.jpeg?w=300', path: '/mnt/volume1/music/Jazz Lounge/Smooth Sessions' },
  { id: 's7', title: 'Fire & Ice', artist: 'Elemental', album: 'Forces', duration: '4:44', year: 2024, genre: 'Rock', size: '20 MB', format: 'FLAC', bitrate: '1411 kbps', cover: 'https://images.pexels.com/photos/1262304/pexels-photo-1262304.jpeg?w=300', path: '/mnt/volume2/music/Elemental/Forces' },
  { id: 's8', title: 'Summer Haze', artist: 'Lo-Fi Lab', album: 'Chill Tape Vol.3', duration: '2:58', year: 2025, genre: 'Lo-Fi', size: '7 MB', format: 'MP3', bitrate: '320 kbps', cover: 'https://images.pexels.com/photos/1173777/pexels-photo-1173777.jpeg?w=300', path: '/mnt/volume1/music/Lo-Fi Lab/Chill Tape Vol.3' },
];

const GENRES = ['All', 'Synthwave', 'Ambient', 'Hip-Hop', 'Chillout', 'Electronic', 'Jazz', 'Rock', 'Lo-Fi'];

function durationSec(d: string) {
  const [m, s] = d.split(':').map(Number);
  return m * 60 + s;
}
function fmtTime(s: number) {
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
}

export default function MusicPlayer() {
  const [genre, setGenre] = useState('All');
  const [search, setSearch] = useState('');
  const [current, setCurrent] = useState<Song>(SONGS[0]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [sec, setSec] = useState(0);
  const [volume, setVolume] = useState(80);
  const [muted, setMuted] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState(false);
  const [tab, setTab] = useState<'songs' | 'albums' | 'artists'>('songs');
  const timerRef = useRef<number>();

  const filtered = SONGS
    .filter(s => genre === 'All' || s.genre === genre)
    .filter(s => !search || s.title.toLowerCase().includes(search.toLowerCase()) || s.artist.toLowerCase().includes(search.toLowerCase()));

  const totalSec = durationSec(current.duration);

  useEffect(() => {
    if (!isPlaying) return;
    timerRef.current = window.setInterval(() => {
      setSec(p => {
        if (p >= totalSec - 1) {
          if (repeat) return 0;
          const idx = SONGS.findIndex(s => s.id === current.id);
          const next = shuffle ? SONGS[Math.floor(Math.random() * SONGS.length)] : SONGS[(idx + 1) % SONGS.length];
          setCurrent(next);
          setSec(0);
          return 0;
        }
        return p + 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [isPlaying, current, totalSec, shuffle, repeat]);

  const play = (song: Song) => { setCurrent(song); setSec(0); setIsPlaying(true); };
  const prev = () => { const i = SONGS.findIndex(s => s.id === current.id); play(SONGS[(i - 1 + SONGS.length) % SONGS.length]); };
  const next = () => { const i = SONGS.findIndex(s => s.id === current.id); play(shuffle ? SONGS[Math.floor(Math.random() * SONGS.length)] : SONGS[(i + 1) % SONGS.length]); };

  const albums = [...new Set(SONGS.map(s => s.album))];
  const artists = [...new Set(SONGS.map(s => s.artist))];

  return (
    <div style={{ display: 'flex', height: '100%', background: C.bg }}>
      {/* Left — Now Playing */}
      <div style={{ width: 260, display: 'flex', flexDirection: 'column', borderRight: `1px solid ${C.border}`, background: C.panel2, flexShrink: 0 }}>
        {/* Album art */}
        <div style={{ padding: 20 }}>
          <div style={{ borderRadius: 16, overflow: 'hidden', boxShadow: `0 16px 50px rgba(0,0,0,0.7), 0 0 30px ${C.accent}22`, marginBottom: 16, position: 'relative' }}>
            <img src={current.cover} alt="" style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block', transition: 'opacity 0.4s' }} />
            {isPlaying && (
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,194,168,0.06)', animation: 'pulse-ring 2s ease-in-out infinite' }} />
            )}
          </div>
          <div style={{ textAlign: 'center', marginBottom: 14 }}>
            <div style={{ fontWeight: 800, fontSize: 14, color: C.text, marginBottom: 3 }}>{current.title}</div>
            <div style={{ fontSize: 11, color: C.accent }}>{current.artist}</div>
            <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>{current.album} · {current.year}</div>
          </div>

          {/* Progress bar */}
          <div style={{ marginBottom: 8 }}>
            <div
              style={{ height: 4, background: C.subtle, borderRadius: 2, cursor: 'pointer', marginBottom: 4 }}
              onClick={e => { const r = (e.currentTarget as HTMLDivElement).getBoundingClientRect(); setSec(Math.floor(((e.clientX - r.left) / r.width) * totalSec)); }}
            >
              <div style={{ width: `${(sec / totalSec) * 100}%`, height: '100%', background: `linear-gradient(90deg, ${C.accent}, ${C.teal})`, borderRadius: 2, transition: 'width 0.5s linear', boxShadow: `0 0 6px ${C.accent}88` }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: C.muted }}>
              <span>{fmtTime(sec)}</span><span>{current.duration}</span>
            </div>
          </div>

          {/* Controls */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 14 }}>
            <ToggleBtn icon="🔀" active={shuffle} onClick={() => setShuffle(v => !v)} title="Shuffle" />
            <MediaBtn icon="⏮" onClick={prev} size={28} />
            <button onClick={() => setIsPlaying(v => !v)} style={{
              width: 48, height: 48, borderRadius: '50%',
              background: `linear-gradient(135deg, ${C.accent}, ${C.teal})`,
              border: 'none', color: '#000', fontSize: 18, cursor: 'pointer',
              boxShadow: `0 0 20px ${C.accent}66`, display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'transform 0.15s',
            }}>
              {isPlaying ? '⏸' : '▶'}
            </button>
            <MediaBtn icon="⏭" onClick={next} size={28} />
            <ToggleBtn icon="🔁" active={repeat} onClick={() => setRepeat(v => !v)} title="Repeat" />
          </div>

          {/* Volume */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={() => setMuted(v => !v)} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 13 }}>
              {muted || volume === 0 ? '🔇' : volume > 50 ? '🔊' : '🔉'}
            </button>
            <input type="range" min={0} max={100} value={muted ? 0 : volume} onChange={e => { setVolume(+e.target.value); setMuted(false); }} style={{ flex: 1, accentColor: C.accent }} />
          </div>
        </div>

        {/* Format info */}
        <div style={{ padding: '10px 20px', borderTop: `1px solid ${C.border}`, marginTop: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <InfoChip label={current.format} color={current.format === 'FLAC' ? C.accent : C.blue} />
            <InfoChip label={current.bitrate} color={C.muted} />
            <InfoChip label={current.genre} color={C.purple} />
          </div>
        </div>
      </div>

      {/* Right — Library */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Tabs + search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 0, padding: '0 14px', borderBottom: `1px solid ${C.border}`, background: C.panel2, flexShrink: 0 }}>
          {(['songs', 'albums', 'artists'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: '12px 16px', background: 'none', border: 'none',
              borderBottom: `2px solid ${tab === t ? C.accent : 'transparent'}`,
              color: tab === t ? C.accent : C.muted,
              cursor: 'pointer', fontWeight: tab === t ? 700 : 400, fontSize: 12, transition: 'all 0.15s',
              textTransform: 'capitalize',
            }}>{t}</button>
          ))}
          <div style={{ flex: 1 }} />
          <input type="text" placeholder="Search music..." value={search} onChange={e => setSearch(e.target.value)} style={{ padding: '6px 10px', borderRadius: 7, background: C.panel3, border: `1px solid ${C.border}`, color: C.text, fontSize: 12, outline: 'none', width: 180 }} />
        </div>

        {/* Genre pills */}
        <div style={{ display: 'flex', gap: 6, padding: '8px 14px', borderBottom: `1px solid ${C.border}`, flexWrap: 'wrap', flexShrink: 0 }}>
          {GENRES.map(g => (
            <button key={g} onClick={() => setGenre(g)} style={{
              padding: '3px 11px', borderRadius: 20, border: `1px solid ${genre === g ? C.accent : C.border}`,
              background: genre === g ? C.accentDim : 'transparent',
              color: genre === g ? C.accent : C.muted,
              cursor: 'pointer', fontSize: 10, fontWeight: genre === g ? 700 : 400, transition: 'all 0.15s',
            }}>{g}</button>
          ))}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'thin', scrollbarColor: `${C.border} transparent` }}>
          {tab === 'songs' && (
            <div style={{ padding: '8px 14px', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {filtered.map((song, i) => (
                <SongRow key={song.id} song={song} idx={i + 1} active={current.id === song.id} playing={current.id === song.id && isPlaying} onPlay={() => play(song)} />
              ))}
            </div>
          )}
          {tab === 'albums' && (
            <div style={{ padding: 14, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
              {albums.map(album => {
                const s = SONGS.find(x => x.album === album)!;
                return (
                  <div key={album} onClick={() => play(SONGS.find(x => x.album === album)!)} style={{ cursor: 'pointer', borderRadius: 10, overflow: 'hidden', border: `1px solid ${C.border}`, background: C.panel2, transition: 'all 0.15s' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = C.accent + '44'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = C.border; }}>
                    <img src={s.cover} alt="" style={{ width: '100%', aspectRatio: '1', objectFit: 'cover' }} />
                    <div style={{ padding: '8px 10px' }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{album}</div>
                      <div style={{ fontSize: 10, color: C.muted }}>{s.artist} · {s.year}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {tab === 'artists' && (
            <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {artists.map(artist => {
                const songs = SONGS.filter(s => s.artist === artist);
                const s = songs[0];
                return (
                  <div key={artist} onClick={() => play(s)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 10, cursor: 'pointer', background: C.panel2, border: `1px solid ${C.border}`, transition: 'all 0.15s' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = C.accent + '44'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = C.border; }}>
                    <img src={s.cover} alt="" style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', border: `2px solid ${C.border}` }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{artist}</div>
                      <div style={{ fontSize: 10, color: C.muted }}>{songs.length} songs · {songs[0].genre}</div>
                    </div>
                    <div style={{ fontSize: 10, color: C.muted }}>{songs.map(s => s.album).filter((v, i, a) => a.indexOf(v) === i).length} albums</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Status bar */}
        <div style={{ padding: '6px 14px', borderTop: `1px solid ${C.border}`, background: C.panel2, display: 'flex', justifyContent: 'space-between', fontSize: 10, color: C.muted, flexShrink: 0 }}>
          <span>{filtered.length} tracks</span>
          <span>{isPlaying ? `Now playing: ${current.title}` : 'Paused'}</span>
          <span>FLAC: {SONGS.filter(s => s.format === 'FLAC').length} · MP3: {SONGS.filter(s => s.format === 'MP3').length}</span>
        </div>
      </div>

      <style>{`
        @keyframes pulse-ring { 0%,100%{opacity:0} 50%{opacity:1} }
      `}</style>
    </div>
  );
}

function SongRow({ song, idx, active, playing, onPlay }: { song: Song; idx: number; active: boolean; playing: boolean; onPlay: () => void }) {
  const [hov, setHov] = useState(false);
  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)} onClick={onPlay}
      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '7px 10px', borderRadius: 8, cursor: 'pointer', background: active ? C.accentDim : hov ? C.panel2 : 'transparent', border: `1px solid ${active ? C.accent + '33' : 'transparent'}`, transition: 'all 0.12s' }}>
      <div style={{ width: 22, textAlign: 'center', fontSize: 12, color: playing ? C.accent : C.muted, fontVariantNumeric: 'tabular-nums' }}>
        {playing ? <span style={{ animation: 'pulse 1s infinite', display: 'inline-block' }}>▶</span> : idx}
      </div>
      <img src={song.cover} alt="" style={{ width: 36, height: 36, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: active ? 700 : 500, color: active ? C.accent : C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{song.title}</div>
        <div style={{ fontSize: 10, color: C.muted }}>{song.artist}</div>
      </div>
      <span style={{ fontSize: 10, color: C.muted, minWidth: 70, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{song.album}</span>
      <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 3, background: song.format === 'FLAC' ? C.accent + '22' : C.blue + '22', color: song.format === 'FLAC' ? C.accent : C.blue, minWidth: 34, textAlign: 'center', fontWeight: 700 }}>{song.format}</span>
      <span style={{ fontSize: 10, color: C.muted, minWidth: 34, textAlign: 'right' }}>{song.duration}</span>
    </div>
  );
}

function MediaBtn({ icon, onClick, size }: { icon: string; onClick: () => void; size: number }) {
  return (
    <button onClick={onClick} style={{ width: size, height: size, borderRadius: '50%', background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 16 }}>{icon}</button>
  );
}

function ToggleBtn({ icon, active, onClick, title }: { icon: string; active: boolean; onClick: () => void; title: string }) {
  return (
    <button onClick={onClick} title={title} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, opacity: active ? 1 : 0.35, filter: active ? `drop-shadow(0 0 4px ${C.accent})` : 'none', transition: 'all 0.2s' }}>{icon}</button>
  );
}

function InfoChip({ label, color }: { label: string; color: string }) {
  return (
    <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 4, background: color + '18', border: `1px solid ${color}33`, color, fontWeight: 700 }}>{label}</span>
  );
}
