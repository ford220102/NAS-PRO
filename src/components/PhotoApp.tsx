import { useState } from 'react';
import { C } from '../data/theme';

const PHOTOS = [
  { id: 1, url: 'https://images.pexels.com/photos/417173/pexels-photo-417173.jpeg?auto=compress&cs=tinysrgb&w=400', date: '2024-11-15', loc: 'Mountains', ai: 'Nature' },
  { id: 2, url: 'https://images.pexels.com/photos/1366919/pexels-photo-1366919.jpeg?auto=compress&cs=tinysrgb&w=400', date: '2024-11-14', loc: 'Forest', ai: 'Nature' },
  { id: 3, url: 'https://images.pexels.com/photos/1448055/pexels-photo-1448055.jpeg?auto=compress&cs=tinysrgb&w=400', date: '2024-11-12', loc: 'City', ai: 'Urban' },
  { id: 4, url: 'https://images.pexels.com/photos/2559941/pexels-photo-2559941.jpeg?auto=compress&cs=tinysrgb&w=400', date: '2024-11-10', loc: 'Beach', ai: 'Ocean' },
  { id: 5, url: 'https://images.pexels.com/photos/1287145/pexels-photo-1287145.jpeg?auto=compress&cs=tinysrgb&w=400', date: '2024-11-08', loc: 'Sunset', ai: 'Landscape' },
  { id: 6, url: 'https://images.pexels.com/photos/1563356/pexels-photo-1563356.jpeg?auto=compress&cs=tinysrgb&w=400', date: '2024-11-06', loc: 'Architecture', ai: 'Urban' },
  { id: 7, url: 'https://images.pexels.com/photos/1274260/pexels-photo-1274260.jpeg?auto=compress&cs=tinysrgb&w=400', date: '2024-11-04', loc: 'Portrait', ai: 'People' },
  { id: 8, url: 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=400', date: '2024-11-02', loc: 'Food', ai: 'Food' },
  { id: 9, url: 'https://images.pexels.com/photos/2662116/pexels-photo-2662116.jpeg?auto=compress&cs=tinysrgb&w=400', date: '2024-10-28', loc: 'Waterfall', ai: 'Nature' },
  { id: 10, url: 'https://images.pexels.com/photos/1237119/pexels-photo-1237119.jpeg?auto=compress&cs=tinysrgb&w=400', date: '2024-10-25', loc: 'Dog', ai: 'Animals' },
  { id: 11, url: 'https://images.pexels.com/photos/572897/pexels-photo-572897.jpeg?auto=compress&cs=tinysrgb&w=400', date: '2024-10-22', loc: 'Night Sky', ai: 'Nature' },
  { id: 12, url: 'https://images.pexels.com/photos/1108701/pexels-photo-1108701.jpeg?auto=compress&cs=tinysrgb&w=400', date: '2024-10-18', loc: 'Abstract', ai: 'Art' },
];

const ALBUMS = [
  { name: 'Family', count: 342, cover: PHOTOS[6].url },
  { name: 'Vacation 2024', count: 189, cover: PHOTOS[0].url },
  { name: 'Nature', count: 412, cover: PHOTOS[1].url },
  { name: 'City Walks', count: 156, cover: PHOTOS[2].url },
];

const AI_CATEGORIES = ['All', 'Nature', 'Urban', 'People', 'Animals', 'Ocean', 'Landscape', 'Food', 'Art'];

export default function PhotoApp() {
  const [tab, setTab] = useState<'timeline' | 'albums' | 'ai'>('timeline');
  const [aiFilter, setAiFilter] = useState('All');
  const [selected, setSelected] = useState<number | null>(null);

  const filtered = tab === 'ai' && aiFilter !== 'All'
    ? PHOTOS.filter(p => p.ai === aiFilter)
    : PHOTOS;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: C.panel }}>
      {/* Toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 0,
        borderBottom: `1px solid ${C.border}`, background: C.panel2,
        padding: '0 20px',
      }}>
        {([
          { id: 'timeline', label: '🗓 Timeline' },
          { id: 'albums', label: '📂 Albums' },
          { id: 'ai', label: '🤖 AI Categories' },
        ] as const).map(t => (
          <button
            key={t.id} onClick={() => setTab(t.id)}
            style={{
              padding: '12px 18px', background: 'none', border: 'none',
              borderBottom: `2px solid ${tab === t.id ? C.accent : 'transparent'}`,
              color: tab === t.id ? C.accent : C.muted,
              cursor: 'pointer', fontWeight: tab === t.id ? 700 : 400,
              fontSize: 13, transition: 'all 0.2s',
            }}
          >
            {t.label}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <div style={{ fontSize: 12, color: C.muted }}>
          {PHOTOS.length} photos · {(PHOTOS.length * 4.2).toFixed(0)} MB
        </div>
        <button style={{
          marginLeft: 12, padding: '6px 14px', borderRadius: 8,
          background: C.accent, color: '#000', border: 'none',
          fontWeight: 700, fontSize: 12, cursor: 'pointer',
        }}>
          ⬆ Upload
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 20, scrollbarWidth: 'thin', scrollbarColor: `${C.border} transparent` }}>

        {/* Timeline tab */}
        {tab === 'timeline' && (
          <div>
            <div style={{ fontSize: 12, color: C.muted, marginBottom: 14 }}>November 2024</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 6 }}>
              {filtered.map(photo => (
                <div
                  key={photo.id}
                  onClick={() => setSelected(photo.id)}
                  style={{
                    aspectRatio: '1', borderRadius: 8, overflow: 'hidden',
                    cursor: 'pointer', position: 'relative',
                    border: `2px solid ${selected === photo.id ? C.accent : 'transparent'}`,
                    transition: 'all 0.15s',
                  }}
                >
                  <img
                    src={photo.url}
                    alt={photo.loc}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                  <div style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0,
                    padding: '16px 8px 4px',
                    background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
                    fontSize: 10, color: '#fff', opacity: 0,
                    transition: 'opacity 0.2s',
                  }} className="photo-meta">
                    {photo.loc}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Albums tab */}
        {tab === 'albums' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>My Albums</div>
              <button style={{
                padding: '6px 14px', borderRadius: 8,
                background: C.accentDim, color: C.accent, border: `1px solid ${C.accent}44`,
                cursor: 'pointer', fontWeight: 600, fontSize: 12,
              }}>
                + New Album
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16 }}>
              {ALBUMS.map(album => (
                <div key={album.name} style={{
                  borderRadius: 12, overflow: 'hidden', cursor: 'pointer',
                  border: `1px solid ${C.border}`,
                  transition: 'transform 0.15s, border-color 0.15s',
                }}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = C.accent + '66'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = C.border; }}
                >
                  <div style={{ position: 'relative', aspectRatio: '4/3', overflow: 'hidden' }}>
                    <img src={album.cover} alt={album.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <div style={{
                      position: 'absolute', inset: 0,
                      background: 'linear-gradient(transparent 40%, rgba(0,0,0,0.6))',
                    }} />
                    <div style={{ position: 'absolute', bottom: 8, left: 10, right: 10 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{album.name}</div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>{album.count} photos</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI Categories */}
        {tab === 'ai' && (
          <div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
              {AI_CATEGORIES.map(cat => (
                <button
                  key={cat} onClick={() => setAiFilter(cat)}
                  style={{
                    padding: '6px 14px', borderRadius: 20,
                    border: `1px solid ${aiFilter === cat ? C.accent : C.border}`,
                    background: aiFilter === cat ? C.accentDim : 'transparent',
                    color: aiFilter === cat ? C.accent : C.muted,
                    cursor: 'pointer', fontSize: 12, fontWeight: aiFilter === cat ? 700 : 400,
                    transition: 'all 0.2s',
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 6 }}>
              {filtered.map(photo => (
                <div key={photo.id} style={{ borderRadius: 8, overflow: 'hidden', position: 'relative', aspectRatio: '1', cursor: 'pointer' }}>
                  <img src={photo.url} alt={photo.loc} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <div style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0,
                    padding: '20px 8px 6px',
                    background: 'linear-gradient(transparent, rgba(0,0,0,0.75))',
                    fontSize: 10, color: '#fff',
                  }}>
                    <span style={{ background: C.accent + 'cc', color: '#000', padding: '1px 5px', borderRadius: 3, fontWeight: 700 }}>{photo.ai}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Lightbox */}
      {selected !== null && (
        <div
          onClick={() => setSelected(null)}
          style={{
            position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.92)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50,
          }}
        >
          {(() => {
            const photo = PHOTOS.find(p => p.id === selected);
            if (!photo) return null;
            return (
              <div onClick={e => e.stopPropagation()} style={{ maxWidth: '85%', maxHeight: '85%' }}>
                <img src={photo.url.replace('w=400', 'w=900')} alt={photo.loc} style={{ maxWidth: '100%', maxHeight: '70vh', borderRadius: 12, display: 'block', objectFit: 'contain' }} />
                <div style={{ marginTop: 12, textAlign: 'center' }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{photo.loc}</div>
                  <div style={{ fontSize: 12, color: C.muted }}>{photo.date} · AI: {photo.ai}</div>
                </div>
                <button onClick={() => setSelected(null)} style={{
                  position: 'absolute', top: 20, right: 20,
                  background: C.panel, border: `1px solid ${C.border}`,
                  color: C.text, borderRadius: 8, padding: '6px 12px',
                  cursor: 'pointer', fontSize: 14,
                }}>✕ Close</button>
              </div>
            );
          })()}
        </div>
      )}

      <style>{`
        div:hover .photo-meta { opacity: 1 !important; }
      `}</style>
    </div>
  );
}
