import { useState, useEffect, useRef, useCallback } from 'react';
import { C } from '../data/theme';
import { AppTemplate, InstalledApp, APP_CATALOG } from '../data/catalog';

interface AppStoreProps {
  installedApps: InstalledApp[];
  onInstallRequest: (app: AppTemplate) => void;
  onClose: () => void;
}

interface ContextMenuState {
  app: AppTemplate;
  x: number;
  y: number;
}

const CATEGORIES = ['All', 'Media', 'Files', 'Network', 'Security', 'Smart Home', 'Monitoring', 'Development', 'System'];

export default function AppStore({ installedApps, onInstallRequest, onClose }: AppStoreProps) {
  void onClose;
  const [search, setSearch] = useState('');
  const [cat, setCat] = useState('All');
  const [customImage, setCustomImage] = useState('');
  const [customName, setCustomName] = useState('');
  const [activeTab, setActiveTab] = useState<'catalog' | 'custom'>('catalog');
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const filtered = APP_CATALOG.filter(a => {
    const matchesCat = cat === 'All' || a.cat === cat;
    const matchesSearch = !search || a.name.toLowerCase().includes(search.toLowerCase()) || a.desc.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const handleCustomInstall = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customImage) return;
    const parts = customImage.split('/');
    const imgId = customImage.split('/').pop()?.split(':')[0] ?? 'custom';
    const tag = customImage.includes(':') ? customImage.split(':').pop() ?? 'latest' : 'latest';
    const app: AppTemplate = {
      id: imgId.toLowerCase().replace(/[^a-z0-9]/g, '-'),
      cat: 'Custom',
      name: customName || imgId,
      icon: '📦',
      desc: `Custom container from ${customImage}`,
      version: tag,
      image: customImage,
      port: '8080',
      tags: ['custom'],
      author: parts.length > 1 ? parts[0] : 'Docker Hub',
    };
    onInstallRequest(app);
  };

  const openContextMenu = useCallback((e: React.MouseEvent, app: AppTemplate) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ app, x: e.clientX, y: e.clientY });
  }, []);

  const closeContextMenu = useCallback(() => setContextMenu(null), []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        closeContextMenu();
      }
    };
    if (contextMenu) {
      window.addEventListener('mousedown', handler);
      window.addEventListener('contextmenu', closeContextMenu as any);
    }
    return () => {
      window.removeEventListener('mousedown', handler);
      window.removeEventListener('contextmenu', closeContextMenu as any);
    };
  }, [contextMenu, closeContextMenu]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, padding: '0 20px', borderBottom: `1px solid ${C.border}`, background: C.panel2 }}>
        {(['catalog', 'custom'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '12px 20px',
              background: 'none', border: 'none',
              borderBottom: `2px solid ${activeTab === tab ? C.accent : 'transparent'}`,
              color: activeTab === tab ? C.accent : C.muted,
              cursor: 'pointer', fontWeight: activeTab === tab ? 700 : 400,
              fontSize: 13, transition: 'all 0.2s',
            }}
          >
            {tab === 'catalog' ? 'App Catalog' : 'Custom Image'}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 20, scrollbarWidth: 'thin', scrollbarColor: `${C.border} transparent` }}>

        {activeTab === 'catalog' && (
          <>
            {/* Search */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: C.muted, fontSize: 14 }}>🔍</span>
                <input
                  type="text" placeholder="Search applications..."
                  value={search} onChange={e => setSearch(e.target.value)}
                  style={{
                    width: '100%', padding: '9px 12px 9px 36px',
                    borderRadius: 8, background: C.panel3,
                    border: `1px solid ${C.border}`, color: C.text,
                    fontSize: 13, outline: 'none', boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            {/* Category pills */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 18 }}>
              {CATEGORIES.map(c => (
                <button
                  key={c}
                  onClick={() => setCat(c)}
                  style={{
                    padding: '4px 12px', borderRadius: 20,
                    border: `1px solid ${cat === c ? C.accent : C.border}`,
                    background: cat === c ? C.accentDim : 'transparent',
                    color: cat === c ? C.accent : C.muted,
                    cursor: 'pointer', fontSize: 11, fontWeight: cat === c ? 700 : 400,
                    transition: 'all 0.2s',
                  }}
                >
                  {c}
                </button>
              ))}
            </div>

            {/* App grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {filtered.map(app => {
                const installed = installedApps.some(a => a.id === app.id);
                return (
                  <div
                    key={app.id}
                    onContextMenu={e => openContextMenu(e, app)}
                    style={{
                      background: C.panel2, borderRadius: 12,
                      border: `1px solid ${C.border}`,
                      padding: 16,
                      transition: 'border-color 0.2s',
                      cursor: 'context-menu',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = C.borderHover; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = C.border; }}
                  >
                    <div style={{ display: 'flex', gap: 12, marginBottom: 10 }}>
                      <div style={{
                        width: 44, height: 44, borderRadius: 10,
                        background: `linear-gradient(135deg, ${C.panel3}, ${C.panel})`,
                        border: `1px solid ${C.border}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 22, flexShrink: 0,
                      }}>
                        {app.icon}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
                          {app.name}
                          {app.needsGpu && <span style={{ fontSize: 9, color: C.blue, background: C.blueDim, padding: '1px 5px', borderRadius: 4 }}>iGPU</span>}
                        </div>
                        <div style={{ fontSize: 11, color: C.muted, lineHeight: '1.4', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                          {app.desc}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                      <span style={{ fontSize: 10, color: C.muted, fontFamily: 'monospace', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {app.image}
                      </span>
                      <span style={{ fontSize: 9, color: C.muted, background: C.subtle, padding: '1px 6px', borderRadius: 4, flexShrink: 0 }}>
                        v{app.version}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 0 }}>
                      <div style={{ display: 'flex', gap: 4 }}>
                        {app.tags?.slice(0, 2).map(tag => (
                          <span key={tag} style={{ fontSize: 9, color: C.muted, background: C.subtle, padding: '2px 6px', borderRadius: 4 }}>{tag}</span>
                        ))}
                      </div>
                      <button
                        onClick={e => { e.stopPropagation(); if (!installed) onInstallRequest(app); }}
                        onContextMenu={e => openContextMenu(e, app)}
                        disabled={installed}
                        style={{
                          padding: '6px 14px', borderRadius: 7,
                          background: installed ? C.subtle : C.accent,
                          color: installed ? C.muted : '#000',
                          border: 'none', fontWeight: 700, fontSize: 11,
                          cursor: installed ? 'default' : 'pointer',
                          transition: 'all 0.2s',
                          boxShadow: installed ? 'none' : `0 0 10px ${C.accentGlow}`,
                        }}
                      >
                        {installed ? '✓ Installed' : 'Install'}
                      </button>
                    </div>

                    {/* Publisher row */}
                    <div style={{
                      marginTop: 10, paddingTop: 10,
                      borderTop: `1px solid ${C.border}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{
                          width: 18, height: 18, borderRadius: 4,
                          background: `linear-gradient(135deg, ${C.accent}33, ${C.blue}22)`,
                          border: `1px solid ${C.border}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 10, color: C.accent, fontWeight: 700,
                        }}>
                          {app.author ? app.author[0].toUpperCase() : '?'}
                        </div>
                        <span style={{ fontSize: 10, color: C.textSub, fontWeight: 500 }}>
                          {app.author ?? 'Unknown'}
                        </span>
                      </div>
                      {app.stars !== undefined && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                          <span style={{ fontSize: 11, color: C.yellow }}>★</span>
                          <span style={{ fontSize: 10, color: C.muted }}>
                            {app.stars >= 1000 ? `${(app.stars / 1000).toFixed(1)}k` : app.stars}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {filtered.length === 0 && (
              <div style={{ textAlign: 'center', color: C.muted, padding: '40px 20px' }}>
                No apps found for "{search}"
              </div>
            )}
          </>
        )}

        {activeTab === 'custom' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 6 }}>Deploy from Docker Hub / GHCR / Custom Registry</div>
              <div style={{ fontSize: 12, color: C.muted }}>Pull any public Docker image and configure it with the installation wizard.</div>
            </div>

            <form onSubmit={handleCustomInstall} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 11, color: C.muted, display: 'block', marginBottom: 6 }}>Image Name (Docker Hub / GHCR / Registry):</label>
                <input
                  type="text"
                  placeholder="e.g. linuxserver/plex:latest or ghcr.io/user/app:main"
                  value={customImage}
                  onChange={e => setCustomImage(e.target.value)}
                  required
                  style={{
                    width: '100%', padding: '10px 14px', borderRadius: 8,
                    background: C.panel3, border: `1px solid ${C.border}`,
                    color: C.text, fontSize: 13, fontFamily: 'monospace',
                    outline: 'none', boxSizing: 'border-box',
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: 11, color: C.muted, display: 'block', marginBottom: 6 }}>Display Name (optional):</label>
                <input
                  type="text"
                  placeholder="My Custom App"
                  value={customName}
                  onChange={e => setCustomName(e.target.value)}
                  style={{
                    width: '100%', padding: '10px 14px', borderRadius: 8,
                    background: C.panel3, border: `1px solid ${C.border}`,
                    color: C.text, fontSize: 13,
                    outline: 'none', boxSizing: 'border-box',
                  }}
                />
              </div>
              <button type="submit" style={{
                padding: '12px 24px', borderRadius: 10,
                background: `linear-gradient(135deg, ${C.accent}, ${C.teal})`,
                color: '#000', border: 'none', fontWeight: 800, fontSize: 13,
                cursor: 'pointer', boxShadow: `0 0 20px ${C.accentGlow}`,
                letterSpacing: 0.5,
              }}>
                Pull & Configure →
              </button>
            </form>

            <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 20 }}>
              <div style={{ fontSize: 11, color: C.muted, marginBottom: 12, fontWeight: 700 }}>Popular sources:</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  { name: 'Docker Hub', url: 'hub.docker.com', icon: '🐳' },
                  { name: 'GitHub Container Registry', url: 'ghcr.io', icon: '🐙' },
                  { name: 'LinuxServer.io', url: 'lscr.io/linuxserver', icon: '🐧' },
                  { name: 'Hotio.dev', url: 'ghcr.io/hotio', icon: '🔥' },
                ].map(src => (
                  <div key={src.name} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 10, background: C.panel2, borderRadius: 8, border: `1px solid ${C.border}` }}>
                    <span style={{ fontSize: 18 }}>{src.icon}</span>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600 }}>{src.name}</div>
                      <div style={{ fontSize: 10, color: C.muted, fontFamily: 'monospace' }}>{src.url}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Right-click context menu */}
      {contextMenu && (
        <AppContextMenu
          ref={menuRef}
          app={contextMenu.app}
          x={contextMenu.x}
          y={contextMenu.y}
          installed={installedApps.some(a => a.id === contextMenu.app.id)}
          onInstall={() => { onInstallRequest(contextMenu.app); closeContextMenu(); }}
          onClose={closeContextMenu}
        />
      )}
    </div>
  );
}

// ─── Right-click context menu ───────────────────────────────
import React from 'react';

interface AppContextMenuProps {
  app: AppTemplate;
  x: number;
  y: number;
  installed: boolean;
  onInstall: () => void;
  onClose: () => void;
}

const AppContextMenu = React.forwardRef<HTMLDivElement, AppContextMenuProps>(
  ({ app, x, y, installed, onInstall, onClose }, ref) => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const menuW = 280;
    const menuH = 360;
    const left = x + menuW > vw ? vw - menuW - 8 : x;
    const top  = y + menuH > vh ? vh - menuH - 8 : y;

    return (
      <div
        ref={ref}
        style={{
          position: 'fixed', left, top,
          width: menuW, zIndex: 99999,
          background: C.panel,
          border: `1px solid ${C.border}`,
          borderRadius: 14,
          boxShadow: `0 20px 60px rgba(0,0,0,0.8), 0 0 0 1px ${C.border}`,
          overflow: 'hidden',
          animation: 'ctx-in 0.12s ease',
        }}
      >
        {/* App header */}
        <div style={{
          padding: '14px 16px 12px',
          background: C.panel2,
          borderBottom: `1px solid ${C.border}`,
          display: 'flex', gap: 12, alignItems: 'center',
        }}>
          <div style={{
            width: 42, height: 42, borderRadius: 10, flexShrink: 0,
            background: `linear-gradient(135deg, ${C.panel3}, ${C.panel})`,
            border: `1px solid ${C.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
          }}>
            {app.icon}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: 13 }}>{app.name}</div>
            <div style={{ fontSize: 10, color: C.muted, fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{app.image}</div>
          </div>
        </div>

        {/* Publisher info */}
        <div style={{
          padding: '10px 16px',
          borderBottom: `1px solid ${C.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: C.accentDim,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 26, height: 26, borderRadius: 6,
              background: `linear-gradient(135deg, ${C.accent}55, ${C.teal}33)`,
              border: `1px solid ${C.accent}44`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 800, color: C.accent,
            }}>
              {app.author ? app.author[0].toUpperCase() : '?'}
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.text }}>{app.author ?? 'Unknown Publisher'}</div>
              <div style={{ fontSize: 9, color: C.muted }}>Publisher</div>
            </div>
          </div>
          {app.stars !== undefined && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 13, color: C.yellow }}>★</span>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.text }}>
                  {app.stars >= 1000 ? `${(app.stars / 1000).toFixed(1)}k` : app.stars}
                </div>
                <div style={{ fontSize: 9, color: C.muted }}>GitHub stars</div>
              </div>
            </div>
          )}
        </div>

        {/* App details */}
        <div style={{ padding: '8px 16px', borderBottom: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 11, color: C.textSub, lineHeight: '1.5', marginBottom: 8 }}>{app.desc}</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <InfoPill label="Category" value={app.cat} />
            <InfoPill label="Version" value={`v${app.version}`} />
            <InfoPill label="Port" value={`:${app.port}`} />
            {app.needsGpu && <InfoPill label="iGPU" value="Supported" color={C.blue} />}
          </div>
        </div>

        {/* Actions */}
        <div style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          <CtxAction
            icon="⚙"
            label={installed ? 'Configure & Reinstall' : 'Install with Configuration'}
            sub="Choose volume, iGPU, permissions"
            accent
            onClick={installed ? onClose : onInstall}
            disabled={false}
          />
          <CtxAction
            icon="⚡"
            label="Quick Install (Default Settings)"
            sub={`Volume 1 · Port ${app.port} · PUID 1000`}
            onClick={installed ? undefined : onInstall}
            disabled={installed}
          />
          <div style={{ height: 1, background: C.border, margin: '4px 2px' }} />
          <CtxAction icon="📋" label="Copy Image Name" sub={app.image} onClick={() => { navigator.clipboard?.writeText(app.image); onClose(); }} />
          <CtxAction icon="✕" label="Close" onClick={onClose} />
        </div>

        <style>{`@keyframes ctx-in{from{opacity:0;transform:scale(0.95) translateY(-4px)}to{opacity:1;transform:scale(1) translateY(0)}}`}</style>
      </div>
    );
  }
);

function InfoPill({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 4,
      background: C.panel3, border: `1px solid ${C.border}`,
      borderRadius: 5, padding: '2px 7px',
    }}>
      <span style={{ fontSize: 9, color: C.muted }}>{label}:</span>
      <span style={{ fontSize: 9, fontWeight: 700, color: color ?? C.textSub, fontFamily: 'monospace' }}>{value}</span>
    </div>
  );
}

function CtxAction({ icon, label, sub, onClick, accent, disabled }: {
  icon: string; label: string; sub?: string;
  onClick?: () => void; accent?: boolean; disabled?: boolean;
}) {
  const [hov, setHov] = useState(false);
  return (
    <div
      onClick={!disabled ? onClick : undefined}
      onMouseEnter={() => !disabled && setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '8px 10px', borderRadius: 8, cursor: disabled ? 'default' : 'pointer',
        background: hov ? (accent ? C.accentDim : C.panel2) : 'transparent',
        opacity: disabled ? 0.4 : 1,
        transition: 'background 0.15s',
        border: accent && hov ? `1px solid ${C.accent}44` : '1px solid transparent',
      }}
    >
      <span style={{ fontSize: 15, width: 20, textAlign: 'center', flexShrink: 0 }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: accent ? 700 : 500, color: accent ? C.accent : C.text }}>{label}</div>
        {sub && <div style={{ fontSize: 10, color: C.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sub}</div>}
      </div>
    </div>
  );
}
