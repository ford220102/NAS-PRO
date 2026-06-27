import { useState, useEffect, useRef, useCallback } from 'react';
import { C } from '../data/theme';
import { InstalledApp, HardwareInfo, DETECTED_VOLUMES, SensorData } from '../data/catalog';
import FanMonitor from './FanMonitor';
import GpuPanel from './GpuPanel';

interface DockerManagerProps {
  installedApps: InstalledApp[];
  hardware: HardwareInfo;
  sensors: SensorData;
  onClose: () => void;
  onUninstall: (id: string) => void;
  onToggleApp: (id: string) => void;
}

type MainTab = 'containers' | 'volumes' | 'hardware' | 'gpu' | 'network';
type DetailPanel = 'logs' | 'terminal' | 'inspect' | 'env' | null;

interface CtxMenu { app: InstalledApp; x: number; y: number }

// ── fake log lines ────────────────────────────────────────────
function makeLogs(name: string): string[] {
  const ts = () => new Date().toISOString().replace('T', ' ').slice(0, 19);
  return [
    `${ts()} [INFO]  Starting ${name} service...`,
    `${ts()} [INFO]  Loading configuration from /config/config.xml`,
    `${ts()} [INFO]  Database connection established`,
    `${ts()} [INFO]  Scanning media library...`,
    `${ts()} [INFO]  Found 2341 items in library`,
    `${ts()} [INFO]  Starting HTTP server on port 0.0.0.0:8096`,
    `${ts()} [INFO]  ${name} is ready`,
    `${ts()} [DEBUG] Received GET /health`,
    `${ts()} [DEBUG] Received GET /web/index.html`,
    `${ts()} [INFO]  Transcoding session started (1080p → 720p)`,
    `${ts()} [DEBUG] Buffer: 98% full`,
    `${ts()} [INFO]  Library update complete — 0 new items`,
  ];
}

const TERMINAL_PROMPTS: Record<string, string[]> = {
  default: [
    'root@container:~# ',
  ],
};
void TERMINAL_PROMPTS;

export default function DockerManager({
  installedApps, hardware, sensors, onUninstall, onToggleApp,
}: DockerManagerProps) {
  const [tab, setTab] = useState<MainTab>('containers');
  const [confirmUninstall, setConfirmUninstall] = useState<string | null>(null);
  const [activeApp, setActiveApp] = useState<InstalledApp | null>(null);
  const [detailPanel, setDetailPanel] = useState<DetailPanel>(null);
  const [ctxMenu, setCtxMenu] = useState<CtxMenu | null>(null);
  const ctxRef = useRef<HTMLDivElement>(null);

  const usedPct = (sensors.ramUsed / sensors.ramTotal) * 100;
  const cpuTempColor = sensors.cpuTemp > 70 ? C.red : sensors.cpuTemp > 55 ? C.yellow : C.accent;

  const openPanel = (app: InstalledApp, panel: DetailPanel) => {
    setActiveApp(app);
    setDetailPanel(panel);
    setCtxMenu(null);
  };

  const openCtx = useCallback((e: React.MouseEvent, app: InstalledApp) => {
    e.preventDefault();
    e.stopPropagation();
    setCtxMenu({ app, x: e.clientX, y: e.clientY });
  }, []);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ctxRef.current && !ctxRef.current.contains(e.target as Node)) setCtxMenu(null);
    };
    if (ctxMenu) window.addEventListener('mousedown', close);
    return () => window.removeEventListener('mousedown', close);
  }, [ctxMenu]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
      {/* Tab bar */}
      <div style={{ display: 'flex', borderBottom: `1px solid ${C.border}`, background: C.panel2, padding: '0 20px', flexShrink: 0 }}>
        {([
          { id: 'containers', label: 'Containers', count: installedApps.length },
          { id: 'volumes',    label: 'Volumes',    count: DETECTED_VOLUMES.length },
          { id: 'hardware',   label: 'Hardware' },
          { id: 'gpu',        label: 'GPU / iGPU' },
          { id: 'network',    label: 'Network' },
        ] as const).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: '12px 16px', background: 'none', border: 'none',
            borderBottom: `2px solid ${tab === t.id ? C.accent : 'transparent'}`,
            color: tab === t.id ? C.accent : C.muted,
            cursor: 'pointer', fontWeight: tab === t.id ? 700 : 400,
            fontSize: 12, transition: 'all 0.2s',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            {t.label}
            {'count' in t && t.count > 0 && (
              <span style={{
                background: tab === t.id ? C.accent : C.subtle,
                color: tab === t.id ? '#000' : C.muted,
                borderRadius: 10, fontSize: 10, padding: '1px 6px', fontWeight: 700,
              }}>{t.count}</span>
            )}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* ── CONTAINERS ── */}
        {tab === 'containers' && (
          <div style={{ flex: 1, overflowY: 'auto', padding: 16, scrollbarWidth: 'thin', scrollbarColor: `${C.border} transparent` }}>
            {installedApps.length === 0 ? (
              <div style={{ textAlign: 'center', color: C.muted, padding: '50px 20px', fontSize: 13 }}>
                <div style={{ fontSize: 42, marginBottom: 12 }}>🐳</div>
                <div style={{ fontWeight: 600, marginBottom: 6 }}>No containers deployed</div>
                <div style={{ fontSize: 12 }}>Open the App Center to install your first application.</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {installedApps.map(app => (
                  <ContainerCard
                    key={app.id}
                    app={app}
                    isActive={activeApp?.id === app.id}
                    onToggle={() => onToggleApp(app.id)}
                    onUninstall={() => setConfirmUninstall(app.id)}
                    onContextMenu={openCtx}
                    onOpenLogs={() => openPanel(app, 'logs')}
                    onOpenTerminal={() => openPanel(app, 'terminal')}
                    onOpenInspect={() => openPanel(app, 'inspect')}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── VOLUMES ── */}
        {tab === 'volumes' && (
          <div style={{ flex: 1, overflowY: 'auto', padding: 16, scrollbarWidth: 'thin', scrollbarColor: `${C.border} transparent` }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {DETECTED_VOLUMES.map(vol => {
                const pct = ((vol.totalGB - vol.freeGB) / vol.totalGB) * 100;
                const col = pct > 85 ? C.red : pct > 65 ? C.yellow : C.accent;
                return (
                  <div key={vol.id} style={{ background: C.panel2, borderRadius: 12, border: `1px solid ${C.border}`, padding: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                      <div style={{
                        width: 40, height: 40, borderRadius: 10, fontSize: 18,
                        background: vol.type === 'NVMe' ? `linear-gradient(135deg, ${C.blue}, ${C.accent})` : `linear-gradient(135deg, ${C.purple}, ${C.blue})`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {vol.type === 'NVMe' ? '⚡' : '💽'}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                          {vol.name}
                          <span style={{ fontSize: 10, color: C.muted, background: C.subtle, padding: '1px 6px', borderRadius: 4 }}>{vol.type}</span>
                          {vol.raid && <span style={{ fontSize: 10, color: C.blue, background: C.blueDim, padding: '1px 6px', borderRadius: 4 }}>{vol.raid}</span>}
                        </div>
                        <div style={{ fontSize: 11, color: C.muted, fontFamily: 'monospace' }}>{vol.path}</div>
                      </div>
                      <span style={{
                        fontSize: 10, padding: '2px 8px', borderRadius: 6, fontWeight: 600,
                        color: vol.health === 'Good' ? C.green : vol.health === 'Warning' ? C.yellow : C.red,
                        background: vol.health === 'Good' ? C.greenDim : vol.health === 'Warning' ? '#f59e0b15' : C.redDim,
                      }}>
                        {vol.health === 'Good' ? 'Healthy' : vol.health === 'Warning' ? 'S.M.A.R.T. Warning' : 'Critical'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: C.muted, marginBottom: 6 }}>
                      <span>{vol.free} free</span>
                      <span>{pct.toFixed(1)}% used of {vol.total}</span>
                    </div>
                    <div style={{ height: 6, background: C.subtle, borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: col, borderRadius: 3 }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── HARDWARE ── */}
        {tab === 'hardware' && (
          <div style={{ flex: 1, overflowY: 'auto', padding: 16, scrollbarWidth: 'thin', scrollbarColor: `${C.border} transparent` }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12 }}>
                <MetricCard label="CPU Temp" value={`${sensors.cpuTemp.toFixed(1)}°C`} color={cpuTempColor} sub={sensors.cpuTemp > 70 ? 'High' : sensors.cpuTemp > 55 ? 'Warm' : 'Normal'} />
                <MetricCard label="CPU Load" value={`${sensors.cpuUsage.toFixed(0)}%`} color={sensors.cpuUsage > 80 ? C.red : C.blue} sub={`${hardware.cores} cores`} />
                <MetricCard label="RAM Used" value={`${sensors.ramUsed.toFixed(1)} GB`} color={usedPct > 80 ? C.yellow : C.purple} sub={`of ${sensors.ramTotal} GB`} />
                <MetricCard label="Uptime" value={sensors.uptime} color={C.teal} sub="System" />
              </div>
              <div style={{ background: C.panel2, borderRadius: 12, border: `1px solid ${C.border}`, padding: 16 }}>
                <div style={{ fontSize: 11, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14 }}>CPU & Memory</div>
                <LiveBar label="CPU" value={sensors.cpuUsage} max={100} color={C.blue} unit="%" />
                <div style={{ height: 12 }} />
                <LiveBar label="RAM" value={sensors.ramUsed} max={sensors.ramTotal} color={C.purple} unit=" GB" />
              </div>
              <div style={{ background: C.panel2, borderRadius: 12, border: `1px solid ${C.border}`, padding: 16 }}>
                <div style={{ fontSize: 11, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14 }}>Network</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 11, color: C.green, marginBottom: 4 }}>↓ Rx</div>
                    <div style={{ fontSize: 18, fontWeight: 700 }}>{sensors.networkRx < 1024 ? `${sensors.networkRx.toFixed(0)} KB/s` : `${(sensors.networkRx / 1024).toFixed(1)} MB/s`}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: C.orange, marginBottom: 4 }}>↑ Tx</div>
                    <div style={{ fontSize: 18, fontWeight: 700 }}>{sensors.networkTx < 1024 ? `${sensors.networkTx.toFixed(0)} KB/s` : `${(sensors.networkTx / 1024).toFixed(1)} MB/s`}</div>
                  </div>
                </div>
              </div>
              <FanMonitor sensors={sensors} />
              <div style={{ background: C.panel2, borderRadius: 12, border: `1px solid ${C.border}`, padding: 16 }}>
                <div style={{ fontSize: 11, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14 }}>System Info</div>
                {[
                  { label: 'OS', value: hardware.osDetail },
                  { label: 'Environment', value: hardware.isVM ? 'Virtual Machine' : 'Bare Metal' },
                  { label: 'CPU', value: `${hardware.cpuModel} (${hardware.cores} cores)` },
                  { label: 'iGPU', value: hardware.gpuModel },
                  { label: 'Docker', value: `v${hardware.dockerVersion}` },
                  { label: 'Network', value: hardware.networkInterfaces.join(' · ') },
                ].map(r => (
                  <div key={r.label} style={{ display: 'flex', gap: 12, padding: '7px 0', borderBottom: `1px solid ${C.border}22` }}>
                    <div style={{ fontSize: 11, color: C.muted, minWidth: 90 }}>{r.label}</div>
                    <div style={{ fontSize: 12, color: C.text }}>{r.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── GPU ── */}
        {tab === 'gpu' && (
          <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <GpuPanel gpus={hardware.gpus ?? []} sensors={sensors} />
          </div>
        )}

        {/* ── NETWORK ── */}
        {tab === 'network' && (
          <div style={{ flex: 1, overflowY: 'auto', padding: 16, scrollbarWidth: 'thin', scrollbarColor: `${C.border} transparent` }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {hardware.networkInterfaces.map(iface => (
                <div key={iface} style={{ background: C.panel2, borderRadius: 12, border: `1px solid ${C.border}`, padding: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 8, fontSize: 16,
                      background: iface.startsWith('docker') ? `linear-gradient(135deg, ${C.blue}33, ${C.panel})` : `linear-gradient(135deg, ${C.accent}33, ${C.panel})`,
                      border: `1px solid ${iface.startsWith('docker') ? C.blue : C.accent}44`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {iface.startsWith('docker') ? '🐳' : '🌐'}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{iface}</div>
                      <div style={{ fontSize: 11, color: C.muted }}>
                        {iface === 'eth0' ? '192.168.1.100/24 — 1 Gbps' :
                          iface === 'eth1' ? '10.0.0.1/8 — 1 Gbps' :
                          iface === 'docker0' ? '172.17.0.1/16 — Bridge' : 'N/A'}
                      </div>
                    </div>
                    <span style={{ fontSize: 10, color: C.green, background: C.greenDim, padding: '2px 8px', borderRadius: 6, fontWeight: 600 }}>UP</span>
                  </div>
                  {installedApps.length > 0 && iface === 'docker0' && (
                    <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${C.border}` }}>
                      <div style={{ fontSize: 10, color: C.muted, marginBottom: 6 }}>Exposed ports:</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {installedApps.map(app => (
                          <span key={app.id} style={{ fontSize: 10, fontFamily: 'monospace', background: C.panel3, border: `1px solid ${C.border}`, padding: '2px 8px', borderRadius: 4, color: C.accent }}>
                            :{app.selectedPort} ({app.name})
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── DETAIL PANEL (Logs / Terminal / Inspect / Env) ── */}
      {activeApp && detailPanel && (
        <DetailOverlay
          app={activeApp}
          panel={detailPanel}
          onClose={() => { setActiveApp(null); setDetailPanel(null); }}
          onSwitch={p => setDetailPanel(p)}
        />
      )}

      {/* ── RIGHT-CLICK CONTEXT MENU ── */}
      {ctxMenu && (
        <ContainerContextMenu
          ref={ctxRef}
          app={ctxMenu.app}
          x={ctxMenu.x}
          y={ctxMenu.y}
          onClose={() => setCtxMenu(null)}
          onToggle={() => { onToggleApp(ctxMenu.app.id); setCtxMenu(null); }}
          onLogs={() => openPanel(ctxMenu.app, 'logs')}
          onTerminal={() => openPanel(ctxMenu.app, 'terminal')}
          onInspect={() => openPanel(ctxMenu.app, 'inspect')}
          onEnv={() => openPanel(ctxMenu.app, 'env')}
          onUninstall={() => { setConfirmUninstall(ctxMenu.app.id); setCtxMenu(null); }}
          onRestart={() => { onToggleApp(ctxMenu.app.id); setTimeout(() => onToggleApp(ctxMenu.app.id), 800); setCtxMenu(null); }}
        />
      )}

      {/* ── UNINSTALL CONFIRM ── */}
      {confirmUninstall && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 500 }}>
          <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 14, padding: 28, width: 320, textAlign: 'center' }}>
            <div style={{ fontSize: 28, marginBottom: 10 }}>⚠</div>
            <div style={{ fontWeight: 700, marginBottom: 8, fontSize: 15 }}>Remove Container?</div>
            <div style={{ fontSize: 12, color: C.muted, marginBottom: 22 }}>
              This will stop and remove the container.<br />Persistent data on the volume will remain.
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setConfirmUninstall(null)} style={{ flex: 1, padding: '9px', borderRadius: 8, background: C.subtle, border: 'none', color: C.muted, cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
              <button onClick={() => { onUninstall(confirmUninstall); setConfirmUninstall(null); }} style={{ flex: 1, padding: '9px', borderRadius: 8, background: C.red, border: 'none', color: '#fff', cursor: 'pointer', fontWeight: 700 }}>Remove</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// CONTAINER CARD
// ──────────────────────────────────────────────────────────────
function ContainerCard({ app, isActive, onToggle, onUninstall, onContextMenu, onOpenLogs, onOpenTerminal, onOpenInspect }: {
  app: InstalledApp;
  isActive: boolean;
  onToggle: () => void;
  onUninstall: () => void;
  onContextMenu: (e: React.MouseEvent, app: InstalledApp) => void;
  onOpenLogs: () => void;
  onOpenTerminal: () => void;
  onOpenInspect: () => void;
}) {
  const [cpu, setCpu] = useState(app.cpuUsage);
  const [mem, setMem] = useState(app.memUsageMB);

  useEffect(() => {
    if (app.status !== 'running') return;
    const id = setInterval(() => {
      setCpu(c => Math.max(0.5, Math.min(60, c + (Math.random() * 6 - 3))));
      setMem(m => Math.max(50, Math.min(600, m + (Math.random() * 20 - 10))));
    }, 2000);
    return () => clearInterval(id);
  }, [app.status]);

  return (
    <div
      onContextMenu={e => onContextMenu(e, app)}
      style={{
        background: isActive ? C.accentDim : C.panel2,
        borderRadius: 12,
        border: `1px solid ${isActive ? C.accent + '66' : C.border}`,
        padding: 14, cursor: 'context-menu',
        transition: 'all 0.15s',
      }}
    >
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <div style={{
          width: 42, height: 42, borderRadius: 10, fontSize: 22,
          background: `linear-gradient(135deg, ${C.panel3}, ${C.panel})`,
          border: `1px solid ${C.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          {app.icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
            {app.name}
            <StatusBadge status={app.status} />
            {app.gpuEnabled && <span style={{ fontSize: 9, color: C.blue, background: C.blueDim, padding: '1px 5px', borderRadius: 4 }}>iGPU</span>}
          </div>
          <div style={{ fontSize: 10, color: C.muted, fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{app.image}</div>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
          <IconBtn icon="📋" title="Logs" onClick={onOpenLogs} />
          <IconBtn icon="⌨" title="Terminal" onClick={onOpenTerminal} />
          <IconBtn icon="🔍" title="Inspect" onClick={onOpenInspect} />
          <button onClick={onToggle} style={{
            padding: '5px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
            background: app.status === 'running' ? '#f59e0b15' : C.greenDim,
            color: app.status === 'running' ? C.yellow : C.green,
            border: `1px solid ${app.status === 'running' ? C.yellow + '44' : C.green + '44'}`,
            cursor: 'pointer',
          }}>
            {app.status === 'running' ? '⏹ Stop' : '▶ Start'}
          </button>
          <button onClick={onUninstall} style={{
            padding: '5px 8px', borderRadius: 6, fontSize: 11,
            background: C.redDim, color: C.red, border: `1px solid ${C.red}44`, cursor: 'pointer',
          }}>✕</button>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8, marginBottom: 10 }}>
        <StatChip label="CPU" value={app.status === 'running' ? `${cpu.toFixed(1)}%` : '—'} color={C.blue} />
        <StatChip label="MEM" value={app.status === 'running' ? `${mem.toFixed(0)} MB` : '—'} color={C.purple} />
        <StatChip label="PORT" value={`:${app.selectedPort}`} color={C.accent} />
        <StatChip label="UPTIME" value={app.status === 'running' ? app.uptime : 'Stopped'} color={app.status === 'running' ? C.green : C.muted} />
      </div>

      {/* Volume + author row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 10, color: C.muted }}>
        <span>📁 <span style={{ fontFamily: 'monospace', color: C.textSub }}>{app.selectedVolumePath}/appdata/{app.id}</span></span>
        <span style={{ color: C.textSub }}>by <span style={{ fontWeight: 600, color: app.author ? C.accent : C.muted }}>{app.author ?? 'Unknown'}</span></span>
      </div>

      {/* PPM hint */}
      <div style={{ marginTop: 6, fontSize: 9, color: C.border, textAlign: 'right' }}>Right-click for more options</div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// RIGHT-CLICK CONTEXT MENU
// ──────────────────────────────────────────────────────────────
import React from 'react';

interface CtxProps {
  app: InstalledApp; x: number; y: number;
  onClose: () => void; onToggle: () => void;
  onLogs: () => void; onTerminal: () => void;
  onInspect: () => void; onEnv: () => void;
  onUninstall: () => void; onRestart: () => void;
}

const ContainerContextMenu = React.forwardRef<HTMLDivElement, CtxProps>(
  ({ app, x, y, onClose, onToggle, onLogs, onTerminal, onInspect, onEnv, onUninstall, onRestart }, ref) => {
  void onClose;
    const menuW = 280; const menuH = 400;
    const left = x + menuW > window.innerWidth ? window.innerWidth - menuW - 8 : x;
    const top  = y + menuH > window.innerHeight ? window.innerHeight - menuH - 8 : y;

    return (
      <div ref={ref} style={{
        position: 'fixed', left, top, width: menuW, zIndex: 99999,
        background: C.panel, border: `1px solid ${C.border}`,
        borderRadius: 14, overflow: 'hidden',
        boxShadow: `0 24px 64px rgba(0,0,0,0.85)`,
        animation: 'ctx-in 0.12s ease',
      }}>
        {/* Container header */}
        <div style={{ padding: '13px 14px 11px', background: C.panel2, borderBottom: `1px solid ${C.border}`, display: 'flex', gap: 10, alignItems: 'center' }}>
          <span style={{ fontSize: 22 }}>{app.icon}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
              {app.name}
              <StatusBadge status={app.status} />
            </div>
            <div style={{ fontSize: 9, color: C.muted, fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{app.image}</div>
          </div>
        </div>

        {/* Publisher */}
        <div style={{ padding: '8px 14px', background: C.accentDim, borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 22, height: 22, borderRadius: 5, background: `linear-gradient(135deg, ${C.accent}55, ${C.teal}33)`,
            border: `1px solid ${C.accent}44`, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 800, color: C.accent,
          }}>
            {app.author ? app.author[0].toUpperCase() : '?'}
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.text }}>{app.author ?? 'Unknown'}</div>
            <div style={{ fontSize: 9, color: C.muted }}>Publisher · Port :{app.selectedPort}</div>
          </div>
          {app.stars !== undefined && (
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 3 }}>
              <span style={{ color: C.yellow, fontSize: 12 }}>★</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: C.text }}>{app.stars >= 1000 ? `${(app.stars / 1000).toFixed(1)}k` : app.stars}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div style={{ padding: '6px 8px' }}>
          <CtxItem icon="📋" label="View Logs" sub="Live container output" onClick={onLogs} />
          <CtxItem icon="⌨" label="Open Terminal" sub={`bash inside ${app.name}`} onClick={onTerminal} />
          <CtxItem icon="🔍" label="Inspect Container" sub="JSON config, mounts, network" onClick={onInspect} />
          <CtxItem icon="🌍" label="Environment Variables" sub="View / edit env vars" onClick={onEnv} />
          <div style={{ height: 1, background: C.border, margin: '4px 2px' }} />
          <CtxItem
            icon={app.status === 'running' ? '⏹' : '▶'}
            label={app.status === 'running' ? 'Stop Container' : 'Start Container'}
            onClick={onToggle}
            color={app.status === 'running' ? C.yellow : C.green}
          />
          <CtxItem icon="🔄" label="Restart Container" onClick={onRestart} color={C.blue} />
          <div style={{ height: 1, background: C.border, margin: '4px 2px' }} />
          <CtxItem icon="🗑" label="Remove Container" sub="Stop and delete (data kept)" onClick={onUninstall} color={C.red} />
        </div>

        <style>{`@keyframes ctx-in{from{opacity:0;transform:scale(0.95) translateY(-4px)}to{opacity:1;transform:scale(1) translateY(0)}}`}</style>
      </div>
    );
  }
);

// ──────────────────────────────────────────────────────────────
// DETAIL OVERLAY — Logs / Terminal / Inspect / Env
// ──────────────────────────────────────────────────────────────
function DetailOverlay({ app, panel, onClose, onSwitch }: {
  app: InstalledApp;
  panel: DetailPanel;
  onClose: () => void;
  onSwitch: (p: DetailPanel) => void;
}) {
  return (
    <div style={{
      position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.75)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 200,
    }}>
      <div style={{
        width: '92%', height: '88%',
        background: C.panel, border: `1px solid ${C.border}`,
        borderRadius: 16, display: 'flex', flexDirection: 'column',
        overflow: 'hidden', boxShadow: `0 24px 80px rgba(0,0,0,0.9)`,
      }}>
        {/* Panel title bar */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 16px', background: C.panel2,
          borderBottom: `1px solid ${C.border}`, flexShrink: 0,
        }}>
          <span style={{ fontSize: 18 }}>{app.icon}</span>
          <span style={{ fontWeight: 700, fontSize: 13 }}>{app.name}</span>
          <StatusBadge status={app.status} />
          <div style={{ flex: 1 }} />
          {/* Panel switcher tabs */}
          {(['logs', 'terminal', 'inspect', 'env'] as const).map(p => (
            <button key={p} onClick={() => onSwitch(p)} style={{
              padding: '4px 12px', borderRadius: 7, border: 'none',
              background: panel === p ? C.accent : C.subtle,
              color: panel === p ? '#000' : C.muted,
              cursor: 'pointer', fontWeight: panel === p ? 700 : 500,
              fontSize: 11, transition: 'all 0.15s',
            }}>
              {p === 'logs' ? '📋 Logs' : p === 'terminal' ? '⌨ Terminal' : p === 'inspect' ? '🔍 Inspect' : '🌍 Env'}
            </button>
          ))}
          <button onClick={onClose} style={{
            marginLeft: 8, padding: '4px 10px', borderRadius: 7,
            background: C.redDim, color: C.red, border: `1px solid ${C.red}44`,
            cursor: 'pointer', fontSize: 12, fontWeight: 700,
          }}>✕</button>
        </div>

        {/* Panel content */}
        <div style={{ flex: 1, overflow: 'hidden' }}>
          {panel === 'logs'     && <LogsPanel app={app} />}
          {panel === 'terminal' && <TerminalPanel app={app} />}
          {panel === 'inspect'  && <InspectPanel app={app} />}
          {panel === 'env'      && <EnvPanel app={app} />}
        </div>
      </div>
    </div>
  );
}

// ── LOGS ─────────────────────────────────────────────────────
function LogsPanel({ app }: { app: InstalledApp }) {
  const [lines, setLines] = useState<string[]>(() => makeLogs(app.name));
  const [paused, setPaused] = useState(false);
  const [filter, setFilter] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (paused || app.status !== 'running') return;
    const logPhrases = [
      `[DEBUG] Received request from 192.168.1.${Math.floor(Math.random() * 254) + 1}`,
      `[INFO]  Transcoding: ${Math.floor(Math.random() * 10) + 1} active session(s)`,
      `[DEBUG] Cache hit ratio: ${(Math.random() * 30 + 70).toFixed(1)}%`,
      `[INFO]  Scheduled task: library scan running`,
      `[WARN]  High memory usage: ${Math.floor(Math.random() * 200 + 300)} MB`,
      `[DEBUG] WebSocket client connected`,
      `[INFO]  SSL handshake completed`,
    ];
    const id = setInterval(() => {
      const ts = new Date().toISOString().replace('T', ' ').slice(0, 19);
      setLines(l => [...l.slice(-300), `${ts} ${logPhrases[Math.floor(Math.random() * logPhrases.length)]}`]);
    }, 1800);
    return () => clearInterval(id);
  }, [paused, app.status]);

  useEffect(() => {
    if (!paused) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [lines, paused]);

  const filtered = filter ? lines.filter(l => l.toLowerCase().includes(filter.toLowerCase())) : lines;

  const lineColor = (l: string) =>
    l.includes('[ERROR]') ? C.red :
    l.includes('[WARN]')  ? C.yellow :
    l.includes('[INFO]')  ? C.accent :
    C.muted;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#050810' }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 8, padding: '8px 12px', borderBottom: `1px solid ${C.border}`, background: C.panel2, flexShrink: 0 }}>
        <input
          type="text" placeholder="Filter logs..." value={filter}
          onChange={e => setFilter(e.target.value)}
          style={{ flex: 1, padding: '5px 10px', borderRadius: 6, background: '#0a1018', border: `1px solid ${C.border}`, color: C.text, fontSize: 11, outline: 'none', fontFamily: 'monospace' }}
        />
        <LogBtn label={paused ? '▶ Resume' : '⏸ Pause'} onClick={() => setPaused(v => !v)} active={paused} />
        <LogBtn label="🗑 Clear" onClick={() => setLines([])} />
        <LogBtn label="⬇ Export" onClick={() => {
          const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = `${app.id}-logs.txt`;
          a.click();
        }} />
      </div>

      {/* Log output */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 14px', fontFamily: 'monospace', fontSize: 11, lineHeight: '1.7', scrollbarWidth: 'thin', scrollbarColor: `${C.border} transparent` }}>
        {filtered.map((line, i) => (
          <div key={i} style={{ color: lineColor(line), display: 'flex', gap: 8 }}>
            <span style={{ color: C.border, userSelect: 'none', flexShrink: 0, minWidth: 28, textAlign: 'right' }}>{i + 1}</span>
            <span style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{line}</span>
          </div>
        ))}
        {app.status !== 'running' && (
          <div style={{ color: C.red, marginTop: 8 }}>— Container is stopped. Start it to see live logs.</div>
        )}
        <div ref={bottomRef} />
      </div>

      <div style={{ padding: '4px 14px', background: C.panel2, borderTop: `1px solid ${C.border}`, fontSize: 10, color: C.muted, flexShrink: 0 }}>
        {filtered.length} lines {filter && `(filtered from ${lines.length})`} · {paused ? 'Paused' : 'Live'}
        {app.status === 'running' && !paused && <span style={{ color: C.green, marginLeft: 8 }}>● streaming</span>}
      </div>
    </div>
  );
}

// ── TERMINAL ──────────────────────────────────────────────────
function TerminalPanel({ app }: { app: InstalledApp }) {
  const [history, setHistory] = useState<{ cmd?: string; out: string; isErr?: boolean }[]>([
    { out: `UGOS Pro — Container Terminal` },
    { out: `Connected to: ${app.name} (${app.image})` },
    { out: `Type 'help' for available commands.\n` },
  ]);
  const [input, setInput] = useState('');
  const [cmdHistory, setCmdHistory] = useState<string[]>([]);
  const [histIdx, setHistIdx] = useState(-1);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const COMMANDS: Record<string, () => string> = {
    help:       () => `Available: ps, top, df, env, cat /etc/os-release, ls /config, netstat, whoami, date, uname -a, clear`,
    ps:         () => `PID   PPID  CMD\n  1      0  /init\n 12      1  ${app.name.toLowerCase()}\n 34      1  /usr/bin/jellyfin`,
    top:        () => `top - ${new Date().toLocaleTimeString()}\nTasks: 14 total, 2 running\n%Cpu:  ${(Math.random()*30+5).toFixed(1)} us, 1.2 sy\nMiB Mem: ${app.memUsageMB.toFixed(0)} used`,
    df:         () => `Filesystem      Size  Used Avail Use%\n/dev/sda1       2.0T  580G  1.42T  29% /\n/config        100G   12G   88G  12% /config`,
    env:        () => `PUID=${app.puid}\nPGID=${app.pgid}\nTZ=Europe/Warsaw\nCONFIG_DIR=/config\nDATA_DIR=/data\nUMASK=002`,
    whoami:     () => `root`,
    date:       () => new Date().toString(),
    'uname -a': () => `Linux container 6.9.12-ugos-pro #1 SMP x86_64 GNU/Linux`,
    'cat /etc/os-release': () => `NAME="Ubuntu"\nVERSION="22.04 LTS"\nID=ubuntu`,
    'ls /config': () => `config.xml  logs/  data/  metadata/  plugins/  transcodes/`,
    netstat:    () => `Proto  Local              Foreign            State\ntcp    0.0.0.0:${app.selectedPort}      0.0.0.0:*         LISTEN`,
    clear:      () => '__clear__',
  };

  const run = () => {
    const cmd = input.trim();
    if (!cmd) return;
    setCmdHistory(h => [cmd, ...h].slice(0, 50));
    setHistIdx(-1);
    setInput('');

    const fn = COMMANDS[cmd] ?? (() => `bash: ${cmd}: command not found`);
    const out = fn();
    if (out === '__clear__') {
      setHistory([]);
      return;
    }
    setHistory(h => [...h, { cmd, out, isErr: out.includes('not found') }]);
  };

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [history]);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { run(); return; }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const idx = Math.min(histIdx + 1, cmdHistory.length - 1);
      setHistIdx(idx);
      setInput(cmdHistory[idx] ?? '');
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const idx = Math.max(histIdx - 1, -1);
      setHistIdx(idx);
      setInput(idx === -1 ? '' : cmdHistory[idx]);
    }
  };

  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#020508', cursor: 'text' }}
      onClick={() => inputRef.current?.focus()}
    >
      {app.status !== 'running' && (
        <div style={{ padding: '8px 14px', background: C.redDim, borderBottom: `1px solid ${C.red}44`, fontSize: 11, color: C.red }}>
          ⚠ Container is stopped — terminal is in read-only mode
        </div>
      )}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', fontFamily: '"JetBrains Mono", "Fira Code", monospace', fontSize: 12, lineHeight: '1.6', scrollbarWidth: 'thin', scrollbarColor: `${C.border} transparent` }}>
        {history.map((entry, i) => (
          <div key={i}>
            {entry.cmd !== undefined && (
              <div style={{ color: C.accent, marginTop: i > 0 ? 6 : 0 }}>
                <span style={{ color: C.green }}>root@{app.id}</span>
                <span style={{ color: C.muted }}>:</span>
                <span style={{ color: C.blue }}>~</span>
                <span style={{ color: C.muted }}># </span>
                <span style={{ color: '#e2e8f0' }}>{entry.cmd}</span>
              </div>
            )}
            <div style={{ color: entry.isErr ? C.red : '#94a3b8', whiteSpace: 'pre-wrap', marginLeft: entry.cmd !== undefined ? 0 : 0 }}>
              {entry.out}
            </div>
          </div>
        ))}
        {/* Prompt */}
        <div style={{ display: 'flex', alignItems: 'center', marginTop: 6 }}>
          <span style={{ color: C.green, fontFamily: 'monospace', fontSize: 12 }}>root@{app.id}</span>
          <span style={{ color: C.muted, fontFamily: 'monospace', fontSize: 12 }}>:</span>
          <span style={{ color: C.blue, fontFamily: 'monospace', fontSize: 12 }}>~</span>
          <span style={{ color: C.muted, fontFamily: 'monospace', fontSize: 12 }}># </span>
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={onKey}
            disabled={app.status !== 'running'}
            autoFocus
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              color: '#e2e8f0', fontFamily: '"JetBrains Mono", "Fira Code", monospace', fontSize: 12,
              caretColor: C.accent,
            }}
          />
        </div>
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

// ── INSPECT ───────────────────────────────────────────────────
function InspectPanel({ app }: { app: InstalledApp }) {
  const inspect = {
    Id: `sha256:${Array.from({length: 12}, () => Math.floor(Math.random()*16).toString(16)).join('')}...`,
    Name: `/${app.id}`,
    Image: app.image,
    Status: app.status,
    Created: app.installedAt,
    RestartPolicy: 'unless-stopped',
    Ports: { [`${app.selectedPort}/tcp`]: [{ HostIp: '0.0.0.0', HostPort: app.selectedPort }] },
    Mounts: [
      { Type: 'bind', Source: `${app.selectedVolumePath}/appdata/${app.id}`, Destination: '/config', Mode: 'rw' },
      { Type: 'bind', Source: `${app.selectedVolumePath}/media`, Destination: '/data', Mode: 'rw' },
    ],
    NetworkSettings: {
      IPAddress: `172.17.0.${Math.floor(Math.random() * 254) + 2}`,
      Gateway: '172.17.0.1',
      MacAddress: Array.from({length: 6}, () => Math.floor(Math.random()*256).toString(16).padStart(2,'0')).join(':'),
    },
    Config: {
      Hostname: app.id,
      Env: [`PUID=${app.puid}`, `PGID=${app.pgid}`, 'TZ=Europe/Warsaw'],
      Cmd: ['/init'],
      WorkingDir: '/',
      User: '',
    },
  };

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: 16, scrollbarWidth: 'thin', scrollbarColor: `${C.border} transparent`, background: '#050810' }}>
      <pre style={{
        fontFamily: '"JetBrains Mono", monospace', fontSize: 11,
        color: '#94a3b8', whiteSpace: 'pre-wrap', margin: 0, lineHeight: '1.7',
      }}>
        {syntaxHighlightJSON(inspect)}
      </pre>
    </div>
  );
}

function syntaxHighlightJSON(obj: unknown): string {
  return JSON.stringify(obj, null, 2)
    .replace(/"([^"]+)":/g, '\x1b[36m"$1"\x1b[0m:')
    .replace(/: "([^"]+)"/g, ': \x1b[32m"$1"\x1b[0m')
    .replace(/: (\d+)/g, ': \x1b[33m$1\x1b[0m')
    .replace(/: (true|false|null)/g, ': \x1b[35m$1\x1b[0m');
}

// ── ENV VARS ──────────────────────────────────────────────────
function EnvPanel({ app }: { app: InstalledApp }) {
  const [vars, setVars] = useState([
    { key: 'PUID', value: app.puid, editable: true },
    { key: 'PGID', value: app.pgid, editable: true },
    { key: 'TZ', value: 'Europe/Warsaw', editable: true },
    { key: 'UMASK', value: '002', editable: true },
    { key: 'DOCKER_MODS', value: '', editable: true },
    { key: 'CONFIG_DIR', value: '/config', editable: false },
    { key: 'DATA_DIR', value: '/data', editable: false },
    { key: 'LOG_LEVEL', value: 'INFO', editable: true },
    { key: 'HTTP_PORT', value: app.selectedPort, editable: false },
  ]);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState('');

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: 16, scrollbarWidth: 'thin', scrollbarColor: `${C.border} transparent` }}>
      <div style={{ marginBottom: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 13, fontWeight: 700 }}>Environment Variables</div>
        <div style={{ fontSize: 11, color: C.muted }}>Changes apply on next container restart</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {vars.map(v => (
          <div key={v.key} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            background: C.panel2, borderRadius: 8, padding: '10px 14px',
            border: `1px solid ${C.border}`,
          }}>
            <span style={{ fontFamily: 'monospace', fontSize: 12, color: C.accent, minWidth: 140, fontWeight: 700 }}>{v.key}</span>
            <span style={{ color: C.muted, fontSize: 12 }}>=</span>
            {editing === v.key ? (
              <input
                autoFocus value={draft} onChange={e => setDraft(e.target.value)}
                onBlur={() => { setVars(vs => vs.map(x => x.key === v.key ? { ...x, value: draft } : x)); setEditing(null); }}
                onKeyDown={e => { if (e.key === 'Enter') { setVars(vs => vs.map(x => x.key === v.key ? { ...x, value: draft } : x)); setEditing(null); } if (e.key === 'Escape') setEditing(null); }}
                style={{ flex: 1, background: '#0a1018', border: `1px solid ${C.accent}`, borderRadius: 5, padding: '3px 8px', color: C.text, fontFamily: 'monospace', fontSize: 12, outline: 'none' }}
              />
            ) : (
              <span style={{ flex: 1, fontFamily: 'monospace', fontSize: 12, color: v.value ? C.text : C.border }}>
                {v.value || '(empty)'}
              </span>
            )}
            {v.editable && editing !== v.key && (
              <button onClick={() => { setEditing(v.key); setDraft(v.value); }} style={{ padding: '3px 8px', borderRadius: 5, background: C.subtle, border: `1px solid ${C.border}`, color: C.muted, cursor: 'pointer', fontSize: 11 }}>Edit</button>
            )}
            {!v.editable && <span style={{ fontSize: 9, color: C.border, background: C.subtle, padding: '1px 5px', borderRadius: 3 }}>readonly</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Small helpers ─────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  return (
    <span style={{
      fontSize: 9, padding: '2px 7px', borderRadius: 5, fontWeight: 700,
      background: status === 'running' ? C.greenDim : status === 'error' ? C.redDim : C.subtle,
      color: status === 'running' ? C.green : status === 'error' ? C.red : C.muted,
      display: 'inline-flex', alignItems: 'center', gap: 3,
    }}>
      <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'currentColor', display: 'inline-block', animation: status === 'running' ? 'pulse 2s infinite' : 'none' }} />
      {status}
    </span>
  );
}

function IconBtn({ icon, title, onClick }: { icon: string; title: string; onClick: () => void }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick} title={title}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        width: 30, height: 30, borderRadius: 7, border: `1px solid ${hov ? C.accent + '66' : C.border}`,
        background: hov ? C.accentDim : 'transparent', cursor: 'pointer', fontSize: 14,
        transition: 'all 0.15s',
      }}
    >
      {icon}
    </button>
  );
}

function CtxItem({ icon, label, sub, onClick, color }: { icon: string; label: string; sub?: string; onClick: () => void; color?: string }) {
  const [hov, setHov] = useState(false);
  return (
    <div onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 8px', borderRadius: 8, cursor: 'pointer', background: hov ? C.panel2 : 'transparent', transition: 'background 0.12s' }}>
      <span style={{ fontSize: 15, width: 20, textAlign: 'center', flexShrink: 0 }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: color ?? C.text }}>{label}</div>
        {sub && <div style={{ fontSize: 10, color: C.muted }}>{sub}</div>}
      </div>
    </div>
  );
}

function StatChip({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ background: C.panel3, borderRadius: 6, padding: '5px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: 9, color: C.muted, fontWeight: 700, letterSpacing: 0.5 }}>{label}</span>
      <span style={{ fontSize: 11, fontWeight: 700, color }}>{value}</span>
    </div>
  );
}

function MetricCard({ label, value, color, sub }: { label: string; value: string; color: string; sub: string }) {
  return (
    <div style={{ background: C.panel2, borderRadius: 10, border: `1px solid ${C.border}`, padding: '14px 16px' }}>
      <div style={{ fontSize: 10, color: C.muted, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>{sub}</div>
    </div>
  );
}

function LiveBar({ label, value, max, color, unit }: { label: string; value: number; max: number; color: string; unit: string }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 5 }}>
        <span style={{ color: C.muted }}>{label}</span>
        <span style={{ color, fontWeight: 700 }}>{value.toFixed(1)}{unit} / {max}{unit}</span>
      </div>
      <div style={{ height: 6, background: C.subtle, borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', borderRadius: 3, background: `linear-gradient(90deg, ${color}, ${color}aa)`, transition: 'width 1s ease', boxShadow: `0 0 6px ${color}66` }} />
      </div>
    </div>
  );
}

function LogBtn({ label, onClick, active }: { label: string; onClick: () => void; active?: boolean }) {
  return (
    <button onClick={onClick} style={{
      padding: '5px 10px', borderRadius: 6, border: `1px solid ${active ? C.accent + '66' : C.border}`,
      background: active ? C.accentDim : 'transparent', color: active ? C.accent : C.muted,
      cursor: 'pointer', fontSize: 11, fontWeight: active ? 700 : 400,
    }}>{label}</button>
  );
}
