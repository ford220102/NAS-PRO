import { useState, useEffect, useRef } from 'react';
import { C } from '../data/theme';

type VpnStatus = 'connected' | 'disconnected' | 'connecting' | 'error';

interface VpnServer {
  id: string;
  name: string;
  country: string;
  flag: string;
  ip: string;
  port: number;
  protocol: 'WireGuard' | 'OpenVPN' | 'IKEv2';
  ping: number;
  load: number;
  status: VpnStatus;
}

interface VpnTunnel {
  id: string;
  name: string;
  type: 'WireGuard' | 'OpenVPN' | 'IPsec' | 'L2TP';
  enabled: boolean;
  server: string;
  localIp: string;
  remoteIp: string;
  rxBytes: number;
  txBytes: number;
  uptime: string;
  connected: boolean;
  killSwitch: boolean;
  splitTunnel: boolean;
  dns: string;
  lastHandshake: string;
  publicKey: string;
}

const SERVERS: VpnServer[] = [
  { id: 's1', name: 'Frankfurt DE',  country: 'Germany',     flag: '🇩🇪', ip: '194.33.8.10',   port: 51820, protocol: 'WireGuard', ping: 8,  load: 24, status: 'connected' },
  { id: 's2', name: 'Amsterdam NL',  country: 'Netherlands', flag: '🇳🇱', ip: '45.153.220.5',  port: 51820, protocol: 'WireGuard', ping: 12, load: 38, status: 'disconnected' },
  { id: 's3', name: 'Warsaw PL',     country: 'Poland',      flag: '🇵🇱', ip: '89.117.44.20',  port: 1194,  protocol: 'OpenVPN',   ping: 4,  load: 61, status: 'disconnected' },
  { id: 's4', name: 'London UK',     country: 'United Kingdom', flag: '🇬🇧', ip: '185.220.101.3', port: 51820, protocol: 'WireGuard', ping: 22, load: 47, status: 'disconnected' },
  { id: 's5', name: 'Zurich CH',     country: 'Switzerland', flag: '🇨🇭', ip: '45.83.220.100', port: 51820, protocol: 'WireGuard', ping: 14, load: 18, status: 'disconnected' },
  { id: 's6', name: 'New York US',   country: 'United States', flag: '🇺🇸', ip: '198.54.130.4', port: 51820, protocol: 'WireGuard', ping: 88, load: 52, status: 'disconnected' },
];

const INIT_TUNNELS: VpnTunnel[] = [
  { id: 't1', name: 'HomeVPN (WG)', type: 'WireGuard', enabled: true,  server: '194.33.8.10:51820', localIp: '10.8.0.2/32', remoteIp: '10.8.0.1', rxBytes: 148234560, txBytes: 34520000, uptime: '3d 14h', connected: true,  killSwitch: true,  splitTunnel: false, dns: '1.1.1.1, 1.0.0.1', lastHandshake: '32s ago', publicKey: 'wg-pub-abc123def456...' },
  { id: 't2', name: 'OfficeVPN (OV)',  type: 'OpenVPN', enabled: false, server: '89.117.44.20:1194', localIp: '10.10.0.5/24', remoteIp: '10.10.0.1', rxBytes: 0, txBytes: 0, uptime: '—', connected: false, killSwitch: false, splitTunnel: true,  dns: '8.8.8.8',         lastHandshake: 'never',   publicKey: '' },
];

function fmtBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  if (b < 1024 * 1024 * 1024) return `${(b / 1024 / 1024).toFixed(1)} MB`;
  return `${(b / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

export default function VpnManager() {
  const [tab, setTab] = useState<'dashboard' | 'tunnels' | 'servers' | 'logs' | 'settings'>('dashboard');
  const [tunnels, setTunnels] = useState<VpnTunnel[]>(INIT_TUNNELS);
  const [servers, setServers] = useState<VpnServer[]>(SERVERS);
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [logLines, setLogLines] = useState<string[]>([
    '2025-06-24 08:12:01 [INFO]  WireGuard interface wg0 initialized',
    '2025-06-24 08:12:02 [INFO]  Handshake with peer 194.33.8.10 — OK (8ms)',
    '2025-06-24 08:12:02 [INFO]  Tunnel HomeVPN connected — 10.8.0.2',
    '2025-06-24 08:14:15 [DEBUG] Keepalive sent to 194.33.8.10:51820',
    '2025-06-24 08:16:00 [INFO]  Kill switch active — blocking non-VPN traffic',
  ]);
  const logsRef = useRef<HTMLDivElement>(null);

  const connected = tunnels.find(t => t.connected);

  useEffect(() => {
    if (!connected) return;
    const id = setInterval(() => {
      setTunnels(prev => prev.map(t => t.connected ? {
        ...t,
        rxBytes: t.rxBytes + Math.floor(Math.random() * 50000),
        txBytes: t.txBytes + Math.floor(Math.random() * 15000),
      } : t));
      const ts = new Date().toISOString().replace('T', ' ').slice(0, 19);
      const msgs = [
        `[DEBUG] Keepalive → ${connected.server}`,
        `[DEBUG] Rx +${Math.floor(Math.random() * 50)} KB`,
        `[DEBUG] DNS query resolved via ${connected.dns.split(',')[0].trim()}`,
      ];
      setLogLines(l => [...l.slice(-200), `${ts} ${msgs[Math.floor(Math.random() * msgs.length)]}`]);
    }, 3000);
    return () => clearInterval(id);
  }, [connected]);

  useEffect(() => { logsRef.current?.scrollTo(0, 99999); }, [logLines]);

  const toggleTunnel = (id: string) => {
    const t = tunnels.find(x => x.id === id)!;
    if (t.connected) {
      setTunnels(prev => prev.map(x => x.id === id ? { ...x, connected: false, uptime: '—', rxBytes: 0, txBytes: 0 } : x));
      const ts = new Date().toISOString().replace('T', ' ').slice(0, 19);
      setLogLines(l => [...l, `${ts} [INFO]  Tunnel ${t.name} disconnected`]);
    } else {
      setConnectingId(id);
      setTimeout(() => {
        setTunnels(prev => prev.map(x => x.id === id ? { ...x, connected: true, uptime: '0s', lastHandshake: '1s ago' } : x));
        setConnectingId(null);
        const ts = new Date().toISOString().replace('T', ' ').slice(0, 19);
        setLogLines(l => [...l, `${ts} [INFO]  Tunnel ${t.name} connected — ${t.localIp}`]);
      }, 2000);
    }
  };

  const connectServer = (id: string) => {
    setServers(prev => prev.map(s => ({ ...s, status: s.id === id ? 'connecting' : s.status === 'connected' ? 'disconnected' : s.status })));
    setTimeout(() => {
      setServers(prev => prev.map(s => s.id === id ? { ...s, status: 'connected' } : s.status === 'connecting' ? s : s));
    }, 1800);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Tab bar */}
      <div style={{ display: 'flex', borderBottom: `1px solid ${C.border}`, background: C.panel2, padding: '0 16px', flexShrink: 0 }}>
        {(['dashboard', 'tunnels', 'servers', 'logs', 'settings'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '11px 14px', background: 'none', border: 'none',
            borderBottom: `2px solid ${tab === t ? C.accent : 'transparent'}`,
            color: tab === t ? C.accent : C.muted,
            cursor: 'pointer', fontWeight: tab === t ? 700 : 400,
            fontSize: 12, textTransform: 'capitalize', transition: 'all 0.15s',
          }}>{t}</button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'thin', scrollbarColor: `${C.border} transparent` }}>

        {tab === 'dashboard' && (
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Status hero */}
            <div style={{
              borderRadius: 14, padding: 20, display: 'flex', alignItems: 'center', gap: 20,
              background: connected
                ? `linear-gradient(135deg, ${C.green}18, ${C.accent}10, ${C.panel2})`
                : `linear-gradient(135deg, ${C.red}18, ${C.panel2})`,
              border: `1px solid ${connected ? C.green + '44' : C.red + '33'}`,
            }}>
              <div style={{
                width: 64, height: 64, borderRadius: '50%', flexShrink: 0,
                background: connected ? `radial-gradient(circle, ${C.green}44, ${C.green}11)` : `radial-gradient(circle, ${C.red}33, ${C.red}11)`,
                border: `2px solid ${connected ? C.green + '66' : C.red + '44'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28,
                boxShadow: connected ? `0 0 24px ${C.green}44` : 'none',
                animation: connected ? 'pulse 2.5s ease-in-out infinite' : 'none',
              }}>🛡</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: connected ? C.green : C.red, marginBottom: 4 }}>
                  {connected ? 'VPN Connected' : 'VPN Disconnected'}
                </div>
                <div style={{ fontSize: 12, color: C.textSub, marginBottom: 8 }}>
                  {connected ? `Tunnel: ${connected.name} · ${connected.localIp} → ${connected.server}` : 'All traffic routed via ISP'}
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {connected && <StatBadge icon="⬇" label="Rx" value={fmtBytes(connected.rxBytes)} color={C.green} />}
                  {connected && <StatBadge icon="⬆" label="Tx" value={fmtBytes(connected.txBytes)} color={C.orange} />}
                  {connected && <StatBadge icon="⏱" label="Uptime" value={connected.uptime} color={C.blue} />}
                  {connected && connected.killSwitch && <StatBadge icon="🔒" label="Kill Switch" value="ON" color={C.accent} />}
                </div>
              </div>
            </div>

            {/* Tunnels quick cards */}
            <div>
              <div style={{ fontSize: 11, color: C.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Active Tunnels</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {tunnels.map(t => (
                  <TunnelCard key={t.id} tunnel={t} connecting={connectingId === t.id} onToggle={() => toggleTunnel(t.id)} />
                ))}
              </div>
            </div>

            {/* Security overview */}
            <div style={{ background: C.panel2, borderRadius: 12, border: `1px solid ${C.border}`, padding: 16 }}>
              <div style={{ fontSize: 11, color: C.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Security Status</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                {[
                  { label: 'Kill Switch', value: connected?.killSwitch ? 'Enabled' : 'Off', icon: '🔒', color: connected?.killSwitch ? C.green : C.muted },
                  { label: 'DNS Leak', value: 'Protected', icon: '🛡', color: C.green },
                  { label: 'IPv6 Leak', value: 'Blocked', icon: '🚧', color: C.green },
                  { label: 'Firewall', value: 'Active', icon: '🔥', color: C.accent },
                  { label: 'Split Tunnel', value: tunnels.some(t => t.splitTunnel) ? 'Partial' : 'Off', icon: '↔', color: C.yellow },
                  { label: 'Encryption', value: connected ? 'ChaCha20-Poly1305' : '—', icon: '🔑', color: C.blue },
                ].map(r => (
                  <div key={r.label} style={{ background: C.panel3, borderRadius: 8, padding: '10px 12px' }}>
                    <div style={{ fontSize: 16, marginBottom: 4 }}>{r.icon}</div>
                    <div style={{ fontSize: 10, color: C.muted }}>{r.label}</div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: r.color }}>{r.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === 'tunnels' && (
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {tunnels.map(t => (
              <div key={t.id} style={{ background: C.panel2, borderRadius: 12, border: `1px solid ${t.connected ? C.green + '44' : C.border}`, padding: 16, transition: 'all 0.2s' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: `linear-gradient(135deg, ${t.type === 'WireGuard' ? C.accent : C.blue}33, ${C.panel})`, border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
                    {t.type === 'WireGuard' ? '⚡' : '🔐'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                      {t.name}
                      <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 4, background: (t.type === 'WireGuard' ? C.accent : C.blue) + '22', color: t.type === 'WireGuard' ? C.accent : C.blue, fontWeight: 700 }}>{t.type}</span>
                    </div>
                    <div style={{ fontSize: 11, color: C.muted }}>{t.server} · {t.localIp}</div>
                  </div>
                  <button onClick={() => toggleTunnel(t.id)} style={{
                    padding: '7px 16px', borderRadius: 8, border: 'none', fontWeight: 700, fontSize: 12, cursor: 'pointer',
                    background: t.connected ? C.redDim : C.greenDim,
                    color: t.connected ? C.red : C.green,
                    transition: 'all 0.2s',
                  }}>
                    {connectingId === t.id ? 'Connecting...' : t.connected ? 'Disconnect' : 'Connect'}
                  </button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                  {[
                    ['RX', fmtBytes(t.rxBytes)],
                    ['TX', fmtBytes(t.txBytes)],
                    ['Uptime', t.uptime],
                    ['Handshake', t.lastHandshake],
                    ['DNS', t.dns],
                    ['Kill Switch', t.killSwitch ? 'ON' : 'OFF'],
                    ['Split Tunnel', t.splitTunnel ? 'ON' : 'OFF'],
                    ['Remote IP', t.remoteIp],
                  ].map(([k, v]) => (
                    <div key={k} style={{ background: C.panel3, borderRadius: 6, padding: '7px 10px' }}>
                      <div style={{ fontSize: 9, color: C.muted }}>{k}</div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: C.text, fontFamily: 'monospace' }}>{v}</div>
                    </div>
                  ))}
                </div>
                {t.type === 'WireGuard' && t.publicKey && (
                  <div style={{ marginTop: 10, padding: '8px 12px', background: C.panel3, borderRadius: 7, fontFamily: 'monospace', fontSize: 10, color: C.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    Public Key: {t.publicKey}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {tab === 'servers' && (
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {servers.map(s => (
              <div key={s.id} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 10,
                background: s.status === 'connected' ? C.greenDim : C.panel2,
                border: `1px solid ${s.status === 'connected' ? C.green + '44' : C.border}`,
                transition: 'all 0.15s',
              }}>
                <span style={{ fontSize: 22 }}>{s.flag}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{s.name}</div>
                  <div style={{ fontSize: 10, color: C.muted, fontFamily: 'monospace' }}>{s.ip}:{s.port} · {s.protocol}</div>
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 9, color: C.muted, textAlign: 'center' }}>Ping</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: s.ping < 20 ? C.green : s.ping < 60 ? C.yellow : C.red }}>{s.ping}ms</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 9, color: C.muted, textAlign: 'center' }}>Load</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: s.load < 40 ? C.green : s.load < 70 ? C.yellow : C.red }}>{s.load}%</div>
                  </div>
                </div>
                {s.status === 'connected' ? (
                  <span style={{ fontSize: 11, color: C.green, fontWeight: 700 }}>● Connected</span>
                ) : s.status === 'connecting' ? (
                  <span style={{ fontSize: 11, color: C.yellow }}>Connecting...</span>
                ) : (
                  <button onClick={() => connectServer(s.id)} style={{ padding: '6px 14px', borderRadius: 7, background: C.accentDim, border: `1px solid ${C.accent}44`, color: C.accent, cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>Connect</button>
                )}
              </div>
            ))}
          </div>
        )}

        {tab === 'logs' && (
          <div ref={logsRef} style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: 11, lineHeight: '1.7', height: '100%', overflowY: 'auto' }}>
            {logLines.map((l, i) => (
              <div key={i} style={{ color: l.includes('[ERROR]') ? C.red : l.includes('[WARN]') ? C.yellow : l.includes('[INFO]') ? C.accent : C.muted }}>{l}</div>
            ))}
          </div>
        )}

        {tab === 'settings' && (
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Section title="General">
              <Toggle label="Start on boot" defaultChecked />
              <Toggle label="Auto-reconnect on connection drop" defaultChecked />
              <Toggle label="Show desktop notifications" defaultChecked />
            </Section>
            <Section title="Security">
              <Toggle label="Kill switch — block internet if VPN drops" defaultChecked />
              <Toggle label="Block IPv6 to prevent leaks" defaultChecked />
              <Toggle label="DNS leak protection" defaultChecked />
              <Toggle label="Block LAN access when connected" />
            </Section>
            <Section title="WireGuard">
              <InfoRow label="Interface" value="wg0" />
              <InfoRow label="Listen Port" value="51820" />
              <InfoRow label="MTU" value="1420" />
              <InfoRow label="PersistentKeepalive" value="25s" />
            </Section>
          </div>
        )}
      </div>

      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}`}</style>
    </div>
  );
}

function TunnelCard({ tunnel, connecting, onToggle }: { tunnel: VpnTunnel; connecting: boolean; onToggle: () => void }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 10,
      background: tunnel.connected ? C.greenDim : C.panel2,
      border: `1px solid ${tunnel.connected ? C.green + '44' : C.border}`,
    }}>
      <span style={{ fontSize: 20 }}>{tunnel.type === 'WireGuard' ? '⚡' : '🔐'}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: 12 }}>{tunnel.name}</div>
        <div style={{ fontSize: 10, color: C.muted }}>{tunnel.localIp} → {tunnel.server}</div>
      </div>
      {tunnel.connected && <span style={{ fontSize: 10, color: C.muted }}>↓{fmtBytes(tunnel.rxBytes)} ↑{fmtBytes(tunnel.txBytes)}</span>}
      <button onClick={onToggle} style={{
        padding: '5px 12px', borderRadius: 7, border: 'none', fontSize: 11, fontWeight: 600, cursor: 'pointer',
        background: tunnel.connected ? C.redDim : C.greenDim,
        color: tunnel.connected ? C.red : C.green,
      }}>
        {connecting ? '...' : tunnel.connected ? 'Stop' : 'Start'}
      </button>
    </div>
  );
}

function StatBadge({ icon, label, value, color }: { icon: string; label: string; value: string; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: color + '15', border: `1px solid ${color}33`, borderRadius: 6, padding: '4px 10px' }}>
      <span style={{ fontSize: 12 }}>{icon}</span>
      <div>
        <div style={{ fontSize: 9, color: C.muted }}>{label}</div>
        <div style={{ fontSize: 11, fontWeight: 700, color }}>{value}</div>
      </div>
    </div>
  );
}

function Toggle({ label, defaultChecked }: { label: string; defaultChecked?: boolean }) {
  const [on, setOn] = useState(!!defaultChecked);
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 0', borderBottom: `1px solid ${C.border}22` }}>
      <span style={{ fontSize: 12, color: C.text }}>{label}</span>
      <div onClick={() => setOn(v => !v)} style={{
        width: 36, height: 20, borderRadius: 10, cursor: 'pointer', position: 'relative',
        background: on ? C.accent : C.subtle, transition: 'background 0.2s',
      }}>
        <div style={{ position: 'absolute', top: 2, left: on ? 18 : 2, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: C.panel2, borderRadius: 10, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
      <div style={{ padding: '8px 14px', borderBottom: `1px solid ${C.border}`, fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 1 }}>{title}</div>
      <div style={{ padding: '0 14px' }}>{children}</div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: `1px solid ${C.border}22`, fontSize: 12 }}>
      <span style={{ color: C.muted }}>{label}</span>
      <span style={{ color: C.text, fontFamily: 'monospace' }}>{value}</span>
    </div>
  );
}

import React from 'react';
