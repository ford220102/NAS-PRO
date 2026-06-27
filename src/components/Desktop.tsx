import { useState, useRef, useEffect, useCallback } from 'react';
import { C } from '../data/theme';
import { HardwareInfo, InstalledApp, AppTemplate } from '../data/catalog';
import { useSensors } from '../data/hooks';
import AppStore from './AppStore';
import DockerManager from './DockerManager';
import WizardModal from './WizardModal';
import FileManager from './FileManager';
import PhotoApp from './PhotoApp';
import StorageManager from './StorageManager';
import ControlPanel from './ControlPanel';
import NetworkCenter from './NetworkCenter';
import SecurityCenter from './SecurityCenter';
import BackupCenter from './BackupCenter';
import GpuPanel from './GpuPanel';
import MediaPlayer from './MediaPlayer';
import VpnManager from './VpnManager';
import UploadManager from './UploadManager';
import Terminal from './Terminal';
import TaskManager from './TaskManager';
import AnimatedBackground from './AnimatedBackground';

interface DesktopProps {
  hardware: HardwareInfo;
  currentUser: { username: string; isAdmin: boolean };
  onLogout: () => void;
}

export type WindowId =
  | 'appstore' | 'docker' | 'files' | 'photos'
  | 'storage' | 'control' | 'network' | 'security'
  | 'backup' | 'gpu' | 'video' | 'music' | 'vpn' | 'upload'
  | 'terminal' | 'tasks';

interface WindowState {
  id: WindowId;
  x: number; y: number;
  w: number; h: number;
  minimized: boolean;
  zIndex: number;
}

const WIN_META: Record<WindowId, { title: string; icon: string; w: number; h: number }> = {
  appstore: { title: 'App Center',        icon: '🛍',  w: 860, h: 600 },
  docker:   { title: 'Container Manager', icon: '🐳',  w: 920, h: 640 },
  files:    { title: 'File Manager',      icon: '📂',  w: 880, h: 580 },
  photos:   { title: 'Photo Station',     icon: '📷',  w: 860, h: 600 },
  storage:  { title: 'Storage Manager',   icon: '💽',  w: 800, h: 580 },
  control:  { title: 'Control Panel',     icon: '🖥',  w: 820, h: 580 },
  network:  { title: 'Network Center',    icon: '🌐',  w: 780, h: 540 },
  security: { title: 'Security Advisor',  icon: '🔐',  w: 760, h: 560 },
  backup:   { title: 'Backup & Sync',     icon: '🔄',  w: 760, h: 540 },
  gpu:      { title: 'GPU Information',   icon: '🔵',  w: 880, h: 640 },
  video:    { title: 'Media Player',      icon: '🎬',  w: 1040, h: 660 },
  music:    { title: 'Media Player',      icon: '🎵',  w: 1040, h: 660 },
  vpn:      { title: 'VPN Manager',       icon: '🛡',  w: 780, h: 580 },
  upload:   { title: 'Upload Manager',    icon: '📤',  w: 760, h: 560 },
  terminal: { title: 'Terminal',           icon: '⌨',  w: 760, h: 500 },
  tasks:    { title: 'Task Manager',      icon: '📊',  w: 860, h: 600 },
};

const ICON_GROUPS: { label?: string; items: { id: WindowId; label: string; icon: string; g: string }[] }[] = [
  {
    items: [
      { id: 'control', label: 'Control Panel', icon: '🖥',  g: `linear-gradient(135deg, ${C.accent}, ${C.teal})` },
      { id: 'files',   label: 'File Manager',  icon: '📂',  g: `linear-gradient(135deg, #f59e0b, #f97316)` },
      { id: 'photos',  label: 'Photo Station', icon: '📷',  g: `linear-gradient(135deg, #a855f7, #6366f1)` },
      { id: 'video',   label: 'Media Player',  icon: '🎬',  g: `linear-gradient(135deg, #dc2626, #f97316)` },
      { id: 'upload',  label: 'Upload Files',  icon: '📤',  g: `linear-gradient(135deg, #0ea5e9, #3b82f6)` },
      { id: 'terminal', label: 'Terminal',       icon: '⌨',  g: `linear-gradient(135deg, #1a1a2e, #16213e)` },
      { id: 'tasks',    label: 'Task Manager',   icon: '📊',  g: `linear-gradient(135deg, #6366f1, #8b5cf6)` },
    ],
  },
  {
    items: [
      { id: 'appstore', label: 'App Center',    icon: '🛍',  g: `linear-gradient(135deg, ${C.accent}, #14b8a6)` },
      { id: 'docker',   label: 'Containers',    icon: '🐳',  g: `linear-gradient(135deg, #3b82f6, #6366f1)` },
      { id: 'storage',  label: 'Storage',       icon: '💽',  g: `linear-gradient(135deg, #3b82f6, #0ea5e9)` },
      { id: 'network',  label: 'Network',       icon: '🌐',  g: `linear-gradient(135deg, #22c55e, #14b8a6)` },
      { id: 'security', label: 'Security',      icon: '🔐',  g: `linear-gradient(135deg, #ef4444, #f97316)` },
      { id: 'vpn',      label: 'VPN',           icon: '🛡',  g: `linear-gradient(135deg, #16a34a, #15803d)` },
      { id: 'backup',   label: 'Backup & Sync', icon: '🔄',  g: `linear-gradient(135deg, #6366f1, #8b5cf6)` },
      { id: 'gpu',      label: 'GPU Info',      icon: '🔵',  g: `linear-gradient(135deg, #1d4ed8, #3b82f6)` },
    ],
  },
];

const ALL_ICONS = ICON_GROUPS.flatMap(g => g.items);

let zCounter = 100;

export default function Desktop({ hardware, currentUser, onLogout }: DesktopProps) {
  const [windows, setWindows] = useState<WindowState[]>([]);
  const [installedApps, setInstalledApps] = useState<InstalledApp[]>([]);
  const [wizardApp, setWizardApp] = useState<AppTemplate | null>(null);
  const [time, setTime] = useState(new Date());
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number } | null>(null);
  const ctxRef = useRef<HTMLDivElement>(null);
  const sensors = useSensors();
  const dragRef = useRef<{ id: WindowId; ox: number; oy: number; wx: number; wy: number } | null>(null);
  const [vw, setVw] = useState(window.innerWidth);
  const [vh, setVh] = useState(window.innerHeight);
  void vh; void setVh;

  useEffect(() => {
    const handleResize = () => { setVw(window.innerWidth); setVh(window.innerHeight); };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ctxRef.current && !ctxRef.current.contains(e.target as Node)) setCtxMenu(null);
    };
    if (ctxMenu) window.addEventListener('mousedown', close);
    return () => window.removeEventListener('mousedown', close);
  }, [ctxMenu]);

  const openWindow = useCallback((id: WindowId) => {
    setCtxMenu(null);
    setWindows(prev => {
      const existing = prev.find(w => w.id === id);
      if (existing) return prev.map(w => w.id === id ? { ...w, minimized: false, zIndex: ++zCounter } : w);
      const meta = WIN_META[id];
      const W = window.innerWidth;
      const H = window.innerHeight;
      const offset = (prev.length % 8) * 24;
      const w = Math.min(meta.w, W - 40);
      const h = Math.min(meta.h, H - 100);
      return [...prev, {
        id, w, h,
        x: Math.max(80, Math.min((W - w) / 2 + offset, W - w - 10)),
        y: Math.max(48, Math.min((H - h) / 2 + offset, H - h - 60)),
        minimized: false,
        zIndex: ++zCounter,
      }];
    });
  }, []);

  const closeWindow = useCallback((id: WindowId) => setWindows(prev => prev.filter(w => w.id !== id)), []);
  const focusWindow = useCallback((id: WindowId) => setWindows(prev => prev.map(w => w.id === id ? { ...w, zIndex: ++zCounter } : w)), []);
  const minimizeWindow = useCallback((id: WindowId) => setWindows(prev => prev.map(w => w.id === id ? { ...w, minimized: true } : w)), []);
  const maximizeWindow = useCallback((id: WindowId) => {
    setWindows(prev => prev.map(w => {
      if (w.id !== id) return w;
      const isMax = w.x === 0 && w.y === 44;
      return isMax
        ? { ...w, x: 80, y: 60, w: WIN_META[id].w, h: WIN_META[id].h }
        : { ...w, x: 0, y: 44, w: window.innerWidth, h: window.innerHeight - 44 - 70 };
    }));
  }, []);

  const startDrag = (id: WindowId, e: React.MouseEvent) => {
    const win = windows.find(w => w.id === id);
    if (!win) return;
    focusWindow(id);
    dragRef.current = { id, ox: e.clientX, oy: e.clientY, wx: win.x, wy: win.y };
    e.preventDefault();
  };

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragRef.current) return;
      setWindows(prev => prev.map(w =>
        w.id === dragRef.current!.id
          ? { ...w,
              x: Math.max(0, Math.min(window.innerWidth - w.w, dragRef.current!.wx + e.clientX - dragRef.current!.ox)),
              y: Math.max(44, Math.min(window.innerHeight - w.h - 60, dragRef.current!.wy + e.clientY - dragRef.current!.oy)) }
          : w
      ));
    };
    const onUp = () => { dragRef.current = null; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, []);

  const confirmInstall = (app: InstalledApp) => {
    setInstalledApps(prev => [...prev, app]);
    setWizardApp(null);
    openWindow('docker');
  };

  const cpuTempColor = sensors.cpuTemp > 70 ? C.red : sensors.cpuTemp > 55 ? C.yellow : C.accent;

  const onDesktopCtx = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-no-ctx]')) return;
    e.preventDefault();
    setCtxMenu({ x: e.clientX, y: e.clientY });
  }, []);

  const renderContent = (id: WindowId) => {
    switch (id) {
      case 'appstore':  return <AppStore installedApps={installedApps} onInstallRequest={setWizardApp} onClose={() => closeWindow('appstore')} />;
      case 'docker':    return <DockerManager installedApps={installedApps} hardware={hardware} sensors={sensors} onClose={() => closeWindow('docker')} onUninstall={id => setInstalledApps(p => p.filter(a => a.id !== id))} onToggleApp={id => setInstalledApps(p => p.map(a => a.id === id ? { ...a, status: a.status === 'running' ? 'stopped' : 'running' } : a))} />;
      case 'files':     return <FileManager />;
      case 'photos':    return <PhotoApp />;
      case 'storage':   return <StorageManager />;
      case 'control':   return <ControlPanel hardware={hardware} />;
      case 'network':   return <NetworkCenter />;
      case 'security':  return <SecurityCenter />;
      case 'backup':    return <BackupCenter />;
      case 'gpu':       return <GpuPanel gpus={hardware.gpus} sensors={sensors} />;
      case 'video':     return <MediaPlayer />;
      case 'music':     return <MediaPlayer />;
      case 'vpn':       return <VpnManager />;
      case 'upload':    return <UploadManager />;
      case 'terminal': return <Terminal />;
      case 'tasks':    return <TaskManager sensors={sensors} />;
      default: return null;
    }
  };

  const compact = vw < 1024;

  return (
    <div
      style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden', fontFamily: '"Inter","SF Pro Display",system-ui,sans-serif', color: C.text }}
      onContextMenu={onDesktopCtx}
    >
      <AnimatedBackground />

      {/* ── TOP BAR ── */}
      <div data-no-ctx style={{
        position: 'fixed', top: 0, left: 0, right: 0, height: 44, zIndex: 9500,
        background: 'rgba(5,7,11,0.88)', backdropFilter: 'blur(24px)',
        borderBottom: `1px solid ${C.border}`,
        display: 'flex', alignItems: 'center', padding: '0 16px', gap: 12,
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <div style={{ width: 26, height: 26, borderRadius: 7, background: `linear-gradient(135deg, ${C.accent}, ${C.teal})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: '#000', fontWeight: 900, fontSize: 9 }}>UG</span>
          </div>
          <span style={{ fontWeight: 800, fontSize: 13, letterSpacing: 0.3 }}>UGOS <span style={{ color: C.accent }}>Pro</span></span>
          {hardware.isVM && <span style={{ fontSize: 9, color: C.yellow, background: '#f59e0b18', padding: '1px 6px', borderRadius: 4 }}>VM</span>}
        </div>

        <div style={{ flex: 1 }} />

        {/* Live metrics */}
        {!compact && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 11 }}>
            <TopMetric icon="🌡" value={`${sensors.cpuTemp.toFixed(0)}°C`} color={cpuTempColor} />
            <TopMetric icon="⚡" value={`${sensors.cpuUsage.toFixed(0)}%`} color={C.blue} />
            <TopMetric icon="💾" value={`${sensors.ramUsed.toFixed(1)} GB`} color={C.purple} />
            <TopMetric icon="↓" value={`${sensors.networkRx < 1024 ? sensors.networkRx.toFixed(0) + 'KB/s' : (sensors.networkRx / 1024).toFixed(1) + 'MB/s'}`} color={C.green} />
          </div>
        )}

        <div style={{ width: 1, height: 18, background: C.border }} />

        {/* GPU quick button */}
        <button onClick={() => openWindow('gpu')} data-no-ctx title="GPU Info" style={{ display: 'flex', alignItems: 'center', gap: 5, background: `${C.blue}18`, border: `1px solid ${C.blue}33`, borderRadius: 6, padding: '3px 8px', cursor: 'pointer', color: C.blue, fontSize: 10, fontWeight: 700, flexShrink: 0 }}>
          🔵 iGPU
        </button>

        {/* VPN quick button */}
        <button onClick={() => openWindow('vpn')} data-no-ctx title="VPN" style={{ display: 'flex', alignItems: 'center', gap: 5, background: `${C.green}18`, border: `1px solid ${C.green}33`, borderRadius: 6, padding: '3px 8px', cursor: 'pointer', color: C.green, fontSize: 10, fontWeight: 700, flexShrink: 0 }}>
          🛡 VPN
        </button>

        <div style={{ width: 1, height: 18, background: C.border }} />

        {/* Status dot */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.green, boxShadow: `0 0 6px ${C.green}`, display: 'inline-block' }} />
          {!compact && <span style={{ fontSize: 11, color: C.textSub }}>Docker OK</span>}
        </div>

        <div style={{ width: 1, height: 18, background: C.border }} />
        <span style={{ fontSize: 11, color: C.textSub, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
          {time.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}
        </span>
        <div style={{ width: 1, height: 18, background: C.border }} />

        {/* User menu */}
        <div style={{ position: 'relative', flexShrink: 0 }} data-no-ctx>
          <button onClick={() => setShowUserMenu(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'none', border: 'none', cursor: 'pointer', padding: '3px 6px', borderRadius: 8, color: C.text }}>
            <div style={{ width: 24, height: 24, borderRadius: '50%', background: `linear-gradient(135deg, ${C.accent}44, ${C.teal}33)`, border: `1px solid ${C.accent}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: C.accent }}>
              {currentUser.username[0].toUpperCase()}
            </div>
            {!compact && <span style={{ fontSize: 12 }}>{currentUser.username}</span>}
          </button>
          {showUserMenu && (
            <div style={{ position: 'absolute', right: 0, top: '100%', marginTop: 6, background: C.panel, border: `1px solid ${C.border}`, borderRadius: 12, padding: 8, minWidth: 160, zIndex: 10000, boxShadow: '0 16px 40px rgba(0,0,0,0.6)' }}>
              <UMenuItem icon="👤" label="My Account" onClick={() => { setShowUserMenu(false); openWindow('control'); }} />
              <UMenuItem icon="🛡" label="VPN Manager" onClick={() => { setShowUserMenu(false); openWindow('vpn'); }} />
              <UMenuItem icon="🔐" label="Security" onClick={() => { setShowUserMenu(false); openWindow('security'); }} />
              <div style={{ height: 1, background: C.border, margin: '6px 0' }} />
              <UMenuItem icon="🚪" label="Sign Out" onClick={onLogout} color={C.red} />
            </div>
          )}
        </div>
      </div>

      {/* ── DESKTOP ICONS ── */}
      <div data-no-ctx style={{
        position: 'fixed', top: 52, left: 14, bottom: 74, zIndex: 1,
        display: 'flex', flexDirection: 'column', gap: 4,
        overflowY: 'auto', scrollbarWidth: 'none',
        paddingBottom: 10,
      }}>
        {ICON_GROUPS.map((group, gi) => (
          <div key={gi} style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: gi < ICON_GROUPS.length - 1 ? 10 : 0 }}>
            {gi > 0 && <div style={{ width: 54, height: 1, background: C.border, margin: '4px auto' }} />}
            {group.items.map(item => (
              <DesktopIcon
                key={item.id}
                icon={item.icon} label={item.label} gradient={item.g}
                active={windows.some(w => w.id === item.id && !w.minimized)}
                onClick={() => openWindow(item.id)}
              />
            ))}
          </div>
        ))}

        {installedApps.length > 0 && (
          <>
            <div style={{ width: 54, height: 1, background: C.border, margin: '4px auto' }} />
            {installedApps.map(app => (
              <DesktopIcon
                key={app.id} icon={app.icon} label={app.name}
                gradient={`linear-gradient(135deg, ${C.panel2}, ${C.panel})`}
                active={app.status === 'running'}
                borderColor={app.status === 'running' ? C.accent + '88' : undefined}
                onClick={() => openWindow('docker')}
              />
            ))}
          </>
        )}
      </div>

      {/* ── WINDOWS ── */}
      {windows.map(win => !win.minimized && (
        <div
          key={win.id}
          data-no-ctx
          onMouseDown={() => focusWindow(win.id)}
          style={{
            position: 'fixed',
            left: win.x, top: win.y,
            width: win.w, height: win.h,
            background: C.panel,
            border: `1px solid ${C.border}`,
            borderRadius: win.x === 0 && win.y === 44 ? 0 : 16,
            boxShadow: `0 32px 80px rgba(0,0,0,0.88), inset 0 1px 0 rgba(255,255,255,0.04)`,
            display: 'flex', flexDirection: 'column',
            zIndex: win.zIndex, overflow: 'hidden',
            transition: 'border-radius 0.2s',
          }}
        >
          {/* Title bar */}
          <div
            onMouseDown={e => startDrag(win.id, e)}
            onDoubleClick={() => maximizeWindow(win.id)}
            style={{
              height: 42, padding: '0 14px',
              borderBottom: `1px solid ${C.border}`,
              background: `linear-gradient(180deg, ${C.panel2}, ${C.panel})`,
              display: 'flex', alignItems: 'center', gap: 10,
              cursor: 'grab', userSelect: 'none', flexShrink: 0,
            }}
          >
            <div style={{ display: 'flex', gap: 7, marginRight: 6 }}>
              <TL color="#ff5f57" title="Close" onClick={() => closeWindow(win.id)} />
              <TL color="#ffbd2e" title="Minimize" onClick={() => minimizeWindow(win.id)} />
              <TL color="#28c840" title="Maximize" onClick={() => maximizeWindow(win.id)} />
            </div>
            <span style={{ fontSize: 14 }}>{WIN_META[win.id].icon}</span>
            <span style={{ fontWeight: 700, fontSize: 13, flex: 1 }}>{WIN_META[win.id].title}</span>
          </div>
          <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
            {renderContent(win.id)}
          </div>
        </div>
      ))}

      {/* ── DOCK ── */}
      <div data-no-ctx style={{
        position: 'fixed', bottom: 12, left: '50%', transform: 'translateX(-50%)',
        background: 'rgba(5,7,11,0.85)', backdropFilter: 'blur(24px)',
        border: `1px solid ${C.border}`, borderRadius: 20,
        padding: '7px 14px',
        display: 'flex', gap: 2, alignItems: 'center',
        boxShadow: '0 12px 50px rgba(0,0,0,0.75)',
        zIndex: 9500,
        maxWidth: 'calc(100vw - 120px)',
        overflowX: 'auto', scrollbarWidth: 'none',
      }}>
        {ALL_ICONS.map((item, i) => {
          const win = windows.find(w => w.id === item.id);
          const isOpen = !!win && !win.minimized;
          const isMin = !!win && win.minimized;
          const showSep = i === 5; // separator between media and system groups
          return (
            <span key={item.id} style={{ display: 'flex', alignItems: 'center' }}>
              {showSep && <div style={{ width: 1, height: 28, background: C.border, margin: '0 6px' }} />}
              <DockItem icon={item.icon} label={item.label} active={isOpen} minimized={isMin} onClick={() => openWindow(item.id)} />
            </span>
          );
        })}
        <div style={{ width: 1, height: 28, background: C.border, margin: '0 6px' }} />
        <div style={{ textAlign: 'center', padding: '0 4px', userSelect: 'none', flexShrink: 0 }}>
          <div style={{ fontSize: 12, fontVariantNumeric: 'tabular-nums', fontWeight: 600, color: C.textSub }}>
            {time.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}
          </div>
          <div style={{ fontSize: 9, color: C.muted }}>
            {time.toLocaleDateString('pl-PL', { day: '2-digit', month: 'short' })}
          </div>
        </div>
      </div>

      {/* ── DESKTOP RIGHT-CLICK MENU ── */}
      {ctxMenu && (
        <DeskCtxMenu
          ref={ctxRef}
          x={ctxMenu.x} y={ctxMenu.y}
          hardware={hardware}
          sensors={sensors}
          cpuTempColor={cpuTempColor}
          onOpen={openWindow}
          onClose={() => setCtxMenu(null)}
        />
      )}

      {/* Wizard */}
      {wizardApp && <WizardModal app={wizardApp} onClose={() => setWizardApp(null)} onConfirm={confirmInstall} />}

      {showUserMenu && <div style={{ position: 'fixed', inset: 0, zIndex: 9999 }} onClick={() => setShowUserMenu(false)} />}

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1}50%{opacity:0.5} }
        @keyframes ctx-in { from{opacity:0;transform:scale(0.96) translateY(-6px)} to{opacity:1;transform:scale(1) translateY(0)} }
        ::-webkit-scrollbar { width:0; height:0; }
      `}</style>
    </div>
  );
}

// ── Desktop right-click context menu ────────────────────────────
import React from 'react';
import type { SensorData } from '../data/catalog';

interface DeskCtxProps {
  x: number; y: number;
  hardware: HardwareInfo;
  sensors: SensorData;
  cpuTempColor: string;
  onOpen: (id: WindowId) => void;
  onClose: () => void;
}

const DeskCtxMenu = React.forwardRef<HTMLDivElement, DeskCtxProps>(
  ({ x, y, hardware, sensors, cpuTempColor, onOpen, onClose }, ref) => {
    const menuW = 300; const menuH = 560;
    const left = x + menuW > window.innerWidth  ? window.innerWidth  - menuW - 8 : x;
    const top  = y + menuH > window.innerHeight ? window.innerHeight - menuH - 8 : y;
    const gpu = hardware.gpus[0];
    const [viewSub, setViewSub] = useState(false);
    const [sortSub, setSortSub] = useState(false);
    const [iconSize, setIconSize] = useState<'small' | 'medium' | 'large'>('medium');
    const [autoArrange, setAutoArrange] = useState(true);
    const [showIcons, setShowIcons] = useState(true);
    const [sortBy, setSortBy] = useState<'name' | 'type' | 'date'>('name');

    const open = (id: WindowId) => { onOpen(id); onClose(); };

    return (
      <div ref={ref} style={{
        position: 'fixed', left, top, width: menuW, zIndex: 99999,
        background: C.panel, border: `1px solid ${C.border}`,
        borderRadius: 16, overflow: 'hidden',
        boxShadow: `0 32px 90px rgba(0,0,0,0.92)`,
        animation: 'ctx-in 0.14s ease',
      }}>
        {/* System header */}
        <div style={{ padding: '12px 14px', background: C.panel2, borderBottom: `1px solid ${C.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: `linear-gradient(135deg, ${C.accent}, ${C.teal})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 10, color: '#000', flexShrink: 0 }}>UG</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 13 }}>UGOS Pro</div>
              <div style={{ fontSize: 10, color: C.muted }}>{hardware.osDetail}</div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
            <SChip label="CPU" value={`${sensors.cpuUsage.toFixed(0)}%`} color={C.blue} />
            <SChip label="RAM" value={`${sensors.ramUsed.toFixed(1)} G`} color={C.purple} />
            <SChip label="Temp" value={`${sensors.cpuTemp.toFixed(0)}°C`} color={cpuTempColor} />
          </div>
        </div>

        {/* GPU row */}
        {gpu && (
          <div onClick={() => open('gpu')} style={{ padding: '9px 14px', borderBottom: `1px solid ${C.border}`, background: `${C.blue}0a`, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, transition: 'background 0.12s' }}
            onMouseEnter={e => (e.currentTarget.style.background = C.blue + '18')}
            onMouseLeave={e => (e.currentTarget.style.background = C.blue + '0a')}>
            <span style={{ fontSize: 16 }}>🔵</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.blue }}>{gpu.model}</div>
              <div style={{ fontSize: 9, color: C.muted }}>QuickSync · {gpu.euCount} EU · {gpu.currentFreqMHz.toFixed(0)} MHz · {gpu.temperature?.toFixed(0)}°C</div>
            </div>
            <span style={{ fontSize: 9, color: C.blue, background: C.blue + '18', padding: '1px 6px', borderRadius: 3, fontWeight: 600 }}>GPU →</span>
          </div>
        )}

        {/* Desktop actions (Windows-style) */}
        <div style={{ padding: '4px 8px', borderBottom: `1px solid ${C.border}` }}>
          {/* View submenu */}
          <div onMouseEnter={() => { setViewSub(true); setSortSub(false); }} onMouseLeave={() => setViewSub(false)}
            style={{ position: 'relative' }}>
            <CtxEntry icon="👁" label="Widok" sub="Rozmiar ikon, układ" onClick={() => setViewSub(v => !v)} />
            {viewSub && (
              <div style={{ position: 'absolute', left: '100%', top: -4, marginLeft: 4, width: 200, background: C.panel, border: `1px solid ${C.border}`, borderRadius: 12, padding: 6, boxShadow: '0 16px 48px rgba(0,0,0,0.8)' }}>
                <CtxEntry icon="🔍" label="Małe ikony" sub="Kompaktowy widok" onClick={() => setIconSize('small')} color={iconSize === 'small' ? C.accent : undefined} />
                <CtxEntry icon="🔲" label="Średnie ikony" sub="Domyślny rozmiar" onClick={() => setIconSize('medium')} color={iconSize === 'medium' ? C.accent : undefined} />
                <CtxEntry icon="⬜" label="Duże ikony" sub="Maksymalny rozmiar" onClick={() => setIconSize('large')} color={iconSize === 'large' ? C.accent : undefined} />
                <div style={{ height: 1, background: C.border, margin: '4px 6px' }} />
                <CtxToggle icon="⊞" label="Autorozmieszczanie" on={autoArrange} onClick={() => setAutoArrange(v => !v)} />
                <CtxToggle icon="👁" label="Pokaż ikony" on={showIcons} onClick={() => setShowIcons(v => !v)} />
              </div>
            )}
          </div>

          {/* Sort submenu */}
          <div onMouseEnter={() => { setSortSub(true); setViewSub(false); }} onMouseLeave={() => setSortSub(false)}
            style={{ position: 'relative' }}>
            <CtxEntry icon="↕" label="Sortuj według" sub="Nazwa, typ, data" onClick={() => setSortSub(v => !v)} />
            {sortSub && (
              <div style={{ position: 'absolute', left: '100%', top: -4, marginLeft: 4, width: 180, background: C.panel, border: `1px solid ${C.border}`, borderRadius: 12, padding: 6, boxShadow: '0 16px 48px rgba(0,0,0,0.8)' }}>
                <CtxEntry icon="🔤" label="Nazwa" sub="A → Z" onClick={() => setSortBy('name')} color={sortBy === 'name' ? C.accent : undefined} />
                <CtxEntry icon="📦" label="Typ" sub="Według kategorii" onClick={() => setSortBy('type')} color={sortBy === 'type' ? C.accent : undefined} />
                <CtxEntry icon="📅" label="Data modyfikacji" sub="Najnowsze pierwsze" onClick={() => setSortBy('date')} color={sortBy === 'date' ? C.accent : undefined} />
              </div>
            )}
          </div>

          <CtxEntry icon="🔄" label="Odśwież" sub="Przeładuj pulpit" onClick={() => { onClose(); }} />
          <CtxEntry icon="📋" label="Wklej" sub="Wklej ze schowka" onClick={() => { onClose(); }} color={C.muted} />
          <CtxEntry icon="📁" label="Nowy folder" sub="Utwórz na pulpicie" onClick={() => { onClose(); }} />
          <CtxEntry icon="🖥" label="Otwórz w Terminalu" sub="ssh admin@nas.local" onClick={() => { open('terminal'); }} color={C.green} />
        </div>

        {/* App shortcuts */}
        <div style={{ padding: '6px 8px' }}>
          <CtxSep label="Media" />
          <CtxEntry icon="🎬" label="Video Player"    sub="Browse & play video files"   onClick={() => open('video')} />
          <CtxEntry icon="🎵" label="Music Player"    sub="Library — FLAC, MP3"         onClick={() => open('music')} />
          <CtxEntry icon="📷" label="Photo Station"   sub="Photo gallery"               onClick={() => open('photos')} />
          <CtxEntry icon="📤" label="Upload Files"    sub="Drag & drop to NAS"          onClick={() => open('upload')} />
          <CtxSep label="System" />
          <CtxEntry icon="🐳" label="Containers"      sub="Docker management"           onClick={() => open('docker')} />
          <CtxEntry icon="🛍" label="App Center"      sub="Install applications"        onClick={() => open('appstore')} />
          <CtxEntry icon="🛡" label="VPN Manager"     sub="WireGuard / OpenVPN"         onClick={() => open('vpn')} color={C.green} />
          <CtxEntry icon="🔐" label="Security"        sub="Firewall, audit log"         onClick={() => open('security')} />
          <CtxEntry icon="🌐" label="Network"         sub="Interfaces & DNS"            onClick={() => open('network')} />
          <CtxEntry icon="💽" label="Storage Manager" sub="Volumes & SMART"             onClick={() => open('storage')} />
          <CtxEntry icon="🖥" label="Control Panel"   sub="Settings, users"             onClick={() => open('control')} />
        </div>

        <div style={{ padding: '6px 14px 8px', background: C.panel2, borderTop: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', fontSize: 9, color: C.muted }}>
          <span>Docker v{hardware.dockerVersion}</span>
          <span>{hardware.cores} cores · {hardware.ramGB} GB RAM · {sensors.uptime}</span>
        </div>
      </div>
    );
  }
);

function SChip({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ background: C.panel3, border: `1px solid ${color}22`, borderRadius: 6, padding: '4px 8px', textAlign: 'center' }}>
      <div style={{ fontSize: 9, color: C.muted }}>{label}</div>
      <div style={{ fontSize: 12, fontWeight: 800, color }}>{value}</div>
    </div>
  );
}

function CtxSep({ label }: { label: string }) {
  return <div style={{ fontSize: 9, color: C.border, padding: '4px 6px 2px', textTransform: 'uppercase', letterSpacing: 1 }}>{label}</div>;
}

function CtxEntry({ icon, label, sub, onClick, color }: { icon: string; label: string; sub: string; onClick: () => void; color?: string }) {
  const [hov, setHov] = useState(false);
  return (
    <div onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 8px', borderRadius: 8, cursor: 'pointer', background: hov ? C.panel2 : 'transparent', transition: 'background 0.1s' }}>
      <span style={{ fontSize: 14, width: 20, textAlign: 'center' }}>{icon}</span>
      <div>
        <div style={{ fontSize: 12, fontWeight: 600, color: color ?? C.text }}>{label}</div>
        <div style={{ fontSize: 9, color: C.muted }}>{sub}</div>
      </div>
    </div>
  );
}

function CtxToggle({ icon, label, on, onClick }: { icon: string; label: string; on: boolean; onClick: () => void }) {
  const [hov, setHov] = useState(false);
  return (
    <div onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 8px', borderRadius: 8, cursor: 'pointer', background: hov ? C.panel2 : 'transparent', transition: 'background 0.1s' }}>
      <span style={{ fontSize: 14, width: 20, textAlign: 'center' }}>{icon}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{label}</div>
      </div>
      <div style={{ width: 30, height: 16, borderRadius: 8, background: on ? C.accent : C.subtle, position: 'relative', transition: 'background 0.15s' }}>
        <div style={{ position: 'absolute', top: 2, left: on ? 16 : 2, width: 12, height: 12, borderRadius: '50%', background: '#fff', transition: 'left 0.15s', boxShadow: '0 1px 3px rgba(0,0,0,0.4)' }} />
      </div>
    </div>
  );
}

// ── Reusable small components ───────────────────────────────────
function TopMetric({ icon, value, color }: { icon: string; value: string; color: string }) {
  return <span style={{ color }}>{icon} {value}</span>;
}

function DesktopIcon({ icon, label, gradient, active, onClick, borderColor }: {
  icon: string; label: string; gradient: string; active?: boolean;
  onClick: () => void; borderColor?: string;
}) {
  const [hov, setHov] = useState(false);
  return (
    <div onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, cursor: 'pointer', width: 64, padding: '3px 0' }}>
      <div style={{
        width: 50, height: 50, borderRadius: 13, background: gradient,
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24,
        border: `2px solid ${borderColor ?? (active ? C.accent + '88' : 'rgba(255,255,255,0.06)')}`,
        boxShadow: hov ? `0 10px 30px rgba(0,0,0,0.6)` : active ? `0 0 18px ${C.accent}33` : '0 4px 14px rgba(0,0,0,0.5)',
        transform: hov ? 'scale(1.10) translateY(-2px)' : 'scale(1)', transition: 'all 0.18s',
      }}>{icon}</div>
      <div style={{ fontSize: 9, textAlign: 'center', color: C.text, textShadow: '0 1px 6px rgba(0,0,0,0.95)', lineHeight: 1.3, maxWidth: 64, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</div>
      {active && <div style={{ width: 4, height: 4, borderRadius: '50%', background: C.accent, boxShadow: `0 0 6px ${C.accent}` }} />}
    </div>
  );
}

function DockItem({ icon, label, active, minimized, onClick }: { icon: string; label: string; active?: boolean; minimized?: boolean; onClick: () => void }) {
  const [hov, setHov] = useState(false);
  return (
    <div onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      title={label} style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, cursor: 'pointer', flexShrink: 0 }}>
      {hov && (
        <div style={{ position: 'absolute', bottom: '100%', marginBottom: 8, whiteSpace: 'nowrap', background: C.panel2, border: `1px solid ${C.border}`, borderRadius: 7, padding: '3px 10px', fontSize: 11, color: C.text, boxShadow: '0 4px 14px rgba(0,0,0,0.5)', pointerEvents: 'none', zIndex: 1 }}>{label}</div>
      )}
      <div style={{
        width: 38, height: 38, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
        background: hov ? C.panel2 : 'transparent',
        border: `1px solid ${hov || active ? C.border : 'transparent'}`,
        transform: hov ? 'scale(1.22) translateY(-3px)' : 'scale(1)', transition: 'all 0.14s',
      }}>{icon}</div>
      <div style={{ width: active ? 4 : minimized ? 3 : 0, height: active ? 4 : minimized ? 3 : 0, borderRadius: '50%', background: active ? C.accent : C.muted, transition: 'all 0.18s' }} />
    </div>
  );
}

function TL({ color, title, onClick }: { color: string; title: string; onClick: () => void }) {
  const [hov, setHov] = useState(false);
  return (
    <div onClick={e => { e.stopPropagation(); onClick(); }} title={title}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ width: 13, height: 13, borderRadius: '50%', background: hov ? color : color + '99', cursor: 'pointer', transition: 'background 0.15s', boxShadow: hov ? `0 0 7px ${color}` : 'none' }}
    />
  );
}

function UMenuItem({ icon, label, onClick, color }: { icon: string; label: string; onClick: () => void; color?: string }) {
  const [hov, setHov] = useState(false);
  return (
    <div onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 7, cursor: 'pointer', background: hov ? C.panel2 : 'transparent', color: color ?? C.text, fontSize: 12, transition: 'background 0.12s' }}>
      <span>{icon}</span><span>{label}</span>
    </div>
  );
}
