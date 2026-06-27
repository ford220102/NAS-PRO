import { useState } from 'react';
import { C } from '../data/theme';
import { HardwareInfo, SensorData } from '../data/catalog';
import { useSensors, useScreenInfo } from '../data/hooks';
import FanMonitor from './FanMonitor';

interface ControlPanelProps {
  hardware: HardwareInfo;
}

type Tab = 'overview' | 'tasks' | 'users' | 'notifications' | 'system' | 'ups' | 'fan' | 'ssh';

const MOCK_TASKS = [
  { id: 1, name: 'Photo AI Indexing', progress: 72, status: 'running', type: 'AI', eta: '4 min' },
  { id: 2, name: 'Daily Backup (Volume 2)', progress: 100, status: 'done', type: 'Backup', eta: 'Done' },
  { id: 3, name: 'S.M.A.R.T. Check (sde)', progress: 15, status: 'running', type: 'Health', eta: '12 min' },
  { id: 4, name: 'Docker Image Pull: jellyfin', progress: 44, status: 'running', type: 'Docker', eta: '2 min' },
];

export default function ControlPanel({ hardware }: ControlPanelProps) {
  const sensors = useSensors();
  const screen = useScreenInfo();
  const [tab, setTab] = useState<Tab>('overview');
  const [users] = useState([
    { name: 'admin', role: 'Administrator', lastLogin: '2024-11-15 09:41', twofa: true, active: true },
    { name: 'user', role: 'Standard User', lastLogin: '2024-11-14 18:22', twofa: false, active: true },
    { name: 'guest', role: 'Guest', lastLogin: '2024-11-10 11:05', twofa: false, active: false },
  ]);

  const cpuColor = sensors.cpuTemp > 70 ? C.red : sensors.cpuTemp > 55 ? C.yellow : C.accent;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: C.panel }}>
      <div style={{ display: 'flex', borderBottom: `1px solid ${C.border}`, background: C.panel2, padding: '0 20px' }}>
        {([
          { id: 'overview', label: 'Overview' },
          { id: 'tasks', label: 'Task Manager' },
          { id: 'users', label: 'Users & Permissions' },
          { id: 'notifications', label: 'Notifications' },
          { id: 'system', label: 'System' },
          { id: 'ups', label: 'UPS' },
          { id: 'fan', label: 'Fan Control' },
          { id: 'ssh', label: 'SSH' },
        ] as const).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: '12px 16px', background: 'none', border: 'none',
            borderBottom: `2px solid ${tab === t.id ? C.accent : 'transparent'}`,
            color: tab === t.id ? C.accent : C.muted,
            cursor: 'pointer', fontWeight: tab === t.id ? 700 : 400, fontSize: 12,
          }}>{t.label}</button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 20, scrollbarWidth: 'thin', scrollbarColor: `${C.border} transparent` }}>

        {tab === 'overview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Stats row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
              <StatCard label="CPU Temp" value={`${sensors.cpuTemp.toFixed(1)}°C`} color={cpuColor} icon="🌡" sub={hardware.cpuModel} />
              <StatCard label="CPU Load" value={`${sensors.cpuUsage.toFixed(0)}%`} color={C.blue} icon="⚡" sub={`${hardware.cores} cores`} />
              <StatCard label="Memory" value={`${sensors.ramUsed.toFixed(1)} GB`} color={C.purple} icon="💾" sub={`of ${sensors.ramTotal} GB`} />
              <StatCard label="Uptime" value={sensors.uptime} color={C.teal} icon="⏱" sub="System runtime" />
            </div>

            {/* CPU + RAM bars */}
            <div style={{ background: C.panel2, borderRadius: 12, border: `1px solid ${C.border}`, padding: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 14, color: C.textSub }}>Live Resource Monitor</div>
              <LiveBar label="CPU Usage" val={sensors.cpuUsage} max={100} color={C.blue} unit="%" />
              <div style={{ height: 10 }} />
              <LiveBar label="RAM Usage" val={sensors.ramUsed} max={sensors.ramTotal} color={C.purple} unit=" GB" decimals={1} />
              <div style={{ height: 10 }} />
              <LiveBar label="Network Rx" val={Math.min(sensors.networkRx, 1000)} max={1000} color={C.green} unit=" KB/s" decimals={0} />
            </div>

            {/* Fan monitor */}
            <FanMonitor sensors={sensors} />

            {/* Active tasks preview */}
            <div style={{ background: C.panel2, borderRadius: 12, border: `1px solid ${C.border}`, padding: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 12, color: C.textSub }}>Running Tasks</div>
              {MOCK_TASKS.filter(t => t.status === 'running').map(task => (
                <div key={task.id} style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                    <span style={{ color: C.text }}>{task.name}</span>
                    <span style={{ color: C.muted }}>ETA: {task.eta}</span>
                  </div>
                  <div style={{ height: 4, background: C.subtle, borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ width: `${task.progress}%`, height: '100%', background: C.accent, borderRadius: 2, transition: 'width 1s' }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Network */}
            <div style={{ background: C.panel2, borderRadius: 12, border: `1px solid ${C.border}`, padding: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 12, color: C.textSub }}>Network</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 11, color: C.green }}>↓ Download</div>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>
                    {sensors.networkRx < 1024 ? `${sensors.networkRx.toFixed(0)} KB/s` : `${(sensors.networkRx / 1024).toFixed(1)} MB/s`}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: C.orange }}>↑ Upload</div>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>
                    {sensors.networkTx < 1024 ? `${sensors.networkTx.toFixed(0)} KB/s` : `${(sensors.networkTx / 1024).toFixed(1)} MB/s`}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === 'tasks' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>Background Tasks</div>
              <span style={{ fontSize: 11, color: C.muted }}>{MOCK_TASKS.filter(t => t.status === 'running').length} running</span>
            </div>
            {MOCK_TASKS.map(task => (
              <div key={task.id} style={{ background: C.panel2, borderRadius: 12, border: `1px solid ${C.border}`, padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{
                    fontSize: 10, padding: '2px 8px', borderRadius: 5, fontWeight: 700,
                    background: task.type === 'AI' ? C.purpleDim : task.type === 'Backup' ? C.accentDim : task.type === 'Docker' ? C.blueDim : C.subtle,
                    color: task.type === 'AI' ? C.purple : task.type === 'Backup' ? C.accent : task.type === 'Docker' ? C.blue : C.muted,
                  }}>{task.type}</span>
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{task.name}</span>
                  <span style={{
                    fontSize: 10, padding: '2px 8px', borderRadius: 5,
                    background: task.status === 'running' ? C.accentDim : C.greenDim,
                    color: task.status === 'running' ? C.accent : C.green,
                  }}>{task.status === 'running' ? 'Running' : 'Completed'}</span>
                </div>
                <div style={{ marginTop: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: C.muted, marginBottom: 4 }}>
                    <span>{task.progress}%</span>
                    <span>ETA: {task.eta}</span>
                  </div>
                  <div style={{ height: 5, background: C.subtle, borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{
                      width: `${task.progress}%`, height: '100%',
                      background: task.status === 'done' ? C.green : C.accent,
                      borderRadius: 3, transition: 'width 1s',
                    }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'users' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>User Accounts</div>
              <button style={{
                padding: '7px 16px', borderRadius: 8, background: C.accent,
                color: '#000', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 12,
              }}>+ Add User</button>
            </div>
            {users.map(user => (
              <div key={user.name} style={{ background: C.panel2, borderRadius: 12, border: `1px solid ${C.border}`, padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: '50%',
                    background: `linear-gradient(135deg, ${C.accent}33, ${C.panel3})`,
                    border: `1px solid ${C.accent}44`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: C.accent, fontWeight: 700, fontSize: 16,
                  }}>
                    {user.name[0].toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                      {user.name}
                      <span style={{
                        fontSize: 10, padding: '1px 7px', borderRadius: 4,
                        background: user.role === 'Administrator' ? C.accentDim : C.subtle,
                        color: user.role === 'Administrator' ? C.accent : C.muted,
                      }}>{user.role}</span>
                      {user.twofa && (
                        <span style={{ fontSize: 10, padding: '1px 7px', borderRadius: 4, background: '#22c55e15', color: C.green }}>2FA</span>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: C.muted }}>Last login: {user.lastLogin}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{
                      fontSize: 10, padding: '2px 8px', borderRadius: 6,
                      background: user.active ? C.greenDim : C.subtle,
                      color: user.active ? C.green : C.muted, fontWeight: 600,
                    }}>{user.active ? 'Active' : 'Disabled'}</span>
                    <button style={{ padding: '5px 10px', borderRadius: 6, background: 'transparent', border: `1px solid ${C.border}`, color: C.textSub, cursor: 'pointer', fontSize: 11 }}>Edit</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'notifications' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { icon: '⚠', text: 'Volume 3 (sde): S.M.A.R.T. advisory — consider replacing', time: '2 hours ago', level: 'warning' },
              { icon: 'ℹ', text: 'Docker image pull complete: jellyfin/jellyfin:latest', time: '4 hours ago', level: 'info' },
              { icon: '✓', text: 'Daily backup completed successfully — Volume 2', time: '6 hours ago', level: 'success' },
              { icon: 'ℹ', text: 'UGOS Pro update available: v3.2.2 → v3.3.0', time: '1 day ago', level: 'info' },
              { icon: '✓', text: 'S.M.A.R.T. health check passed: sda, sdb, sdc, sdd', time: '1 day ago', level: 'success' },
            ].map((n, i) => (
              <div key={i} style={{
                background: C.panel2, borderRadius: 10, padding: '12px 16px',
                border: `1px solid ${n.level === 'warning' ? C.yellow + '44' : n.level === 'success' ? C.green + '22' : C.border}`,
                display: 'flex', alignItems: 'flex-start', gap: 12,
              }}>
                <span style={{ fontSize: 18 }}>{n.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12 }}>{n.text}</div>
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 3 }}>{n.time}</div>
                </div>
                <button style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 14 }}>✕</button>
              </div>
            ))}
          </div>
        )}

        {tab === 'system' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ background: C.panel2, borderRadius: 12, border: `1px solid ${C.border}`, padding: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 12 }}>System Information</div>
              {[
                { label: 'UGOS Version', value: 'UGOS Pro v3.2.1 (build 20241115)' },
                { label: 'Kernel', value: 'Linux 6.9.12-ugos-pro' },
                { label: 'OS', value: hardware.osDetail },
                { label: 'CPU', value: `${hardware.cpuModel} (${hardware.cores} cores)` },
                { label: 'GPU', value: hardware.gpuModel },
                { label: 'RAM', value: `${hardware.ramGB} GB DDR4` },
                { label: 'Docker', value: `Docker Engine v${hardware.dockerVersion}` },
                { label: 'Environment', value: hardware.isVM ? 'Virtual Machine' : 'Bare Metal' },
              ].map(row => (
                <div key={row.label} style={{ display: 'flex', padding: '8px 0', borderBottom: `1px solid ${C.border}22`, gap: 12 }}>
                  <div style={{ fontSize: 12, color: C.muted, minWidth: 130 }}>{row.label}</div>
                  <div style={{ fontSize: 12, fontFamily: 'monospace', color: C.text }}>{row.value}</div>
                </div>
              ))}

              {/* Display / Screen section */}
              <div style={{ fontSize: 12, fontWeight: 700, marginTop: 20, marginBottom: 12, color: C.text }}>🖥 Display</div>
              {[
                { label: 'Resolution',         value: screen.label },
                { label: 'Device type',       value: screen.width < 768 ? '📱 Mobilne' : screen.width < 1280 ? '💻 Tablet' : '🖥 Desktop' },
                { label: 'Physical pixels',    value: `${screen.physicalWidth} × ${screen.physicalHeight} px` },
                { label: 'Logical size',       value: `${screen.width} × ${screen.height} px` },
                { label: 'Device pixel ratio', value: `${screen.dpr}× (HiDPI ${screen.dpr >= 2 ? '✓' : '✗'})` },
                { label: 'Est. PPI',           value: `~${screen.dpiEstimate} dpi` },
                { label: 'Color depth',        value: `${screen.colorDepth}-bit` },
                { label: 'Orientation',        value: screen.orientation },
                { label: 'Viewport',           value: `${window.innerWidth} × ${window.innerHeight} px` },
                { label: 'Touch support',      value: 'ontouchstart' in window ? '✓ Tak' : '✗ Nie' },
              ].map(row => (
                <div key={row.label} style={{ display: 'flex', padding: '8px 0', borderBottom: `1px solid ${C.border}22`, gap: 12 }}>
                  <div style={{ fontSize: 12, color: C.muted, minWidth: 130 }}>{row.label}</div>
                  <div style={{ fontSize: 12, fontFamily: 'monospace', color: C.text }}>{row.value}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button style={{ flex: 1, padding: '10px', borderRadius: 9, background: '#f59e0b15', color: C.yellow, border: `1px solid ${C.yellow}44`, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>Restart System</button>
              <button style={{ flex: 1, padding: '10px', borderRadius: 9, background: C.redDim, color: C.red, border: `1px solid ${C.red}44`, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>Shutdown</button>
              <button style={{ flex: 1, padding: '10px', borderRadius: 9, background: C.accentDim, color: C.accent, border: `1px solid ${C.accent}44`, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>Check Updates</button>
            </div>
          </div>
        )}

        {tab === 'ups' && <UpsTab />}
        {tab === 'fan' && <FanTab sensors={sensors} />}
        {tab === 'ssh' && <SshTab />}
      </div>
    </div>
  );
}

function StatCard({ label, value, color, icon, sub }: { label: string; value: string; color: string; icon: string; sub: string }) {
  return (
    <div style={{ background: C.panel2, borderRadius: 12, border: `1px solid ${C.border}`, padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 18 }}>{icon}</span>
        <span style={{ fontSize: 11, color: C.muted }}>{label}</span>
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: 10, color: C.muted, marginTop: 3 }}>{sub}</div>
    </div>
  );
}

function LiveBar({ label, val, max, color, unit, decimals = 0 }: { label: string; val: number; max: number; color: string; unit: string; decimals?: number }) {
  const pct = Math.min(100, (val / max) * 100);
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 5 }}>
        <span style={{ color: C.muted }}>{label}</span>
        <span style={{ color, fontWeight: 700 }}>{val.toFixed(decimals)}{unit} / {max}{unit}</span>
      </div>
      <div style={{ height: 5, background: C.subtle, borderRadius: 3, overflow: 'hidden' }}>
        <div style={{
          width: `${pct}%`, height: '100%', borderRadius: 3,
          background: color, transition: 'width 1.5s ease',
          boxShadow: `0 0 6px ${color}66`,
        }} />
      </div>
    </div>
  );
}

// ── UPS Tab ─────────────────────────────────────────────────────
function UpsTab() {
  const [batteryPct] = useState(87);
  const [onBattery, setOnBattery] = useState(false);
  const [loadPct] = useState(34);
  const [estimatedRuntime] = useState(42);
  const [upsModel] = useState('APC Back-UPS Pro 1500VA');
  const [firmware] = useState('UPS 09.8 / ID: 18');
  const [selfTest, setSelfTest] = useState<'idle' | 'running' | 'passed' | 'failed'>('idle');

  const runSelfTest = () => {
    setSelfTest('running');
    setTimeout(() => setSelfTest('passed'), 2000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Status header */}
      <div style={{ background: C.panel2, borderRadius: 12, border: `1px solid ${onBattery ? C.yellow : C.green}`, padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 11, background: onBattery ? C.yellowDim : C.greenDim, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
            {onBattery ? '🔋' : '🔌'}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 800 }}>{upsModel}</div>
            <div style={{ fontSize: 10, color: C.muted }}>Firmware: {firmware}</div>
          </div>
          <div style={{
            fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 6,
            background: onBattery ? C.yellowDim : C.greenDim,
            color: onBattery ? C.yellow : C.green,
          }}>
            {onBattery ? 'NA BATERII' : 'ZASILANIE SIECIOWE'}
          </div>
        </div>

        {/* Battery bar */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 5 }}>
            <span style={{ color: C.muted }}>Poziom baterii</span>
            <span style={{ fontWeight: 700, color: batteryPct > 50 ? C.green : batteryPct > 20 ? C.yellow : C.red }}>{batteryPct}%</span>
          </div>
          <div style={{ height: 10, background: C.subtle, borderRadius: 6, overflow: 'hidden' }}>
            <div style={{
              width: `${batteryPct}%`, height: '100%', borderRadius: 6,
              background: batteryPct > 50 ? C.green : batteryPct > 20 ? C.yellow : C.red,
              transition: 'width 1s', boxShadow: `0 0 8px ${batteryPct > 50 ? C.green : C.yellow}66`,
            }} />
          </div>
        </div>

        {/* Stats grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          <UpsStat label="Obciążenie" value={`${loadPct}%`} icon="⚡" color={C.blue} />
          <UpsStat label="Czas pracy" value={`${estimatedRuntime} min`} icon="⏱" color={C.accent} />
          <UpsStat label="Napięcie" value="230V" icon="🔌" color={C.green} />
        </div>
      </div>

      {/* Controls */}
      <div style={{ background: C.panel2, borderRadius: 12, border: `1px solid ${C.border}`, padding: 16 }}>
        <div style={{ fontSize: 11, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Akcje</div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <UpsBtn label="Test baterii" icon="🧪" onClick={runSelfTest} disabled={selfTest === 'running'} />
          <UpsBtn label="Kalibracja" icon="⚖" onClick={() => {}} />
          <UpsBtn label="Wyłącz dźwięk" icon="🔇" onClick={() => {}} />
          <UpsBtn label="Bezpieczne wyłączenie" icon="🛑" onClick={() => {}} color={C.red} />
        </div>
        {selfTest === 'running' && <div style={{ fontSize: 11, color: C.yellow, marginTop: 10 }}>⏳ Trwa test baterii...</div>}
        {selfTest === 'passed' && <div style={{ fontSize: 11, color: C.green, marginTop: 10 }}>✓ Test zakończony pomyślnie — bateria OK</div>}
      </div>

      {/* Power events log */}
      <div style={{ background: C.panel2, borderRadius: 12, border: `1px solid ${C.border}`, padding: 16 }}>
        <div style={{ fontSize: 11, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Historia zasilania</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <UpsEvent time="Dzisiaj 14:32" event="Zanik napięcia — przejście na baterię" color={C.yellow} />
          <UpsEvent time="Dzisiaj 14:35" event="Przywrócone zasilanie sieciowe" color={C.green} />
          <UpsEvent time="Wczoraj 03:12" event="Test automatyczny baterii — OK" color={C.accent} />
          <UpsEvent time="3 dni temu 18:44" event="Niski poziom baterii (12%)" color={C.red} />
        </div>
      </div>

      {/* Toggle for demo */}
      <button onClick={() => setOnBattery(v => !v)} style={{
        background: C.panel3, border: `1px solid ${C.border}`, borderRadius: 8,
        padding: '8px 14px', color: C.muted, fontSize: 11, cursor: 'pointer', alignSelf: 'flex-start',
      }}>
        Symuluj: {onBattery ? 'przywróć zasilanie' : 'odłącz zasilanie'}
      </button>
    </div>
  );
}

function UpsStat({ label, value, icon, color }: { label: string; value: string; icon: string; color: string }) {
  return (
    <div style={{ background: C.panel3, borderRadius: 8, border: `1px solid ${color}22`, padding: '10px 12px', textAlign: 'center' }}>
      <div style={{ fontSize: 16, marginBottom: 4 }}>{icon}</div>
      <div style={{ fontSize: 14, fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: 9, color: C.muted }}>{label}</div>
    </div>
  );
}

function UpsBtn({ label, icon, onClick, color, disabled }: { label: string; icon: string; onClick: () => void; color?: string; disabled?: boolean }) {
  const [hov, setHov] = useState(false);
  return (
    <button onClick={onClick} disabled={disabled} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
        background: hov ? C.panel3 : C.panel3, border: `1px solid ${color ?? C.border}`,
        borderRadius: 8, color: color ?? C.text, fontSize: 11, fontWeight: 600,
        cursor: disabled ? 'wait' : 'pointer', opacity: disabled ? 0.5 : 1, transition: 'all 0.12s',
      }}>
      <span>{icon}</span>{label}
    </button>
  );
}

function UpsEvent({ time, event, color }: { time: string; event: string; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: `1px solid ${C.subtle}` }}>
      <div style={{ width: 6, height: 6, borderRadius: '50%', background: color, boxShadow: `0 0 4px ${color}`, flexShrink: 0 }} />
      <span style={{ fontSize: 10, color: C.muted, fontFamily: 'monospace', flexShrink: 0 }}>{time}</span>
      <span style={{ fontSize: 11, color: C.text }}>{event}</span>
    </div>
  );
}

// ── Fan Control Tab ─────────────────────────────────────────────
type FanMode = 'silent' | 'auto' | 'performance' | 'boost';

function FanTab({ sensors }: { sensors: SensorData }) {
  const [mode, setMode] = useState<FanMode>('auto');
  const [customPct, setCustomPct] = useState(50);

  const modeConfig: Record<FanMode, { label: string; icon: string; color: string; desc: string; pct: number }> = {
    silent:      { label: 'Cichy',        icon: '🤫', color: C.blue,   desc: 'Minimalne obroty, najcichsza praca', pct: 30 },
    auto:        { label: 'Automatyczny', icon: '🤖', color: C.accent, desc: 'Inteligentna regulacja wg temperatury', pct: 0 },
    performance: { label: 'Wydajność',    icon: '🚀', color: C.yellow, desc: 'Wyższe obroty, lepsze chłodzenie', pct: 70 },
    boost:       { label: 'Turbo',        icon: '💨', color: C.red,    desc: 'Maksymalne obroty — awaryjne chłodzenie', pct: 100 },
  };

  const effectivePct = mode === 'auto' ? Math.min(100, Math.max(20, (sensors.cpuTemp / 80) * 100)) : modeConfig[mode].pct;
  void effectivePct;
  const fanLabels = ['CPU Fan', 'System Fan', 'HDD Fan 1', 'HDD Fan 2'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Mode selector */}
      <div style={{ background: C.panel2, borderRadius: 12, border: `1px solid ${C.border}`, padding: 16 }}>
        <div style={{ fontSize: 11, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Tryb pracy wentylatorów</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8 }}>
          {(Object.keys(modeConfig) as FanMode[]).map(m => {
            const cfg = modeConfig[m];
            const active = mode === m;
            return (
              <button key={m} onClick={() => setMode(m)}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                  padding: '12px 8px', borderRadius: 10,
                  background: active ? `${cfg.color}15` : C.panel3,
                  border: `1px solid ${active ? cfg.color : C.border}`,
                  cursor: 'pointer', transition: 'all 0.15s',
                }}>
                <span style={{ fontSize: 22 }}>{cfg.icon}</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: active ? cfg.color : C.text }}>{cfg.label}</span>
                <span style={{ fontSize: 9, color: C.muted, textAlign: 'center', lineHeight: 1.3 }}>{cfg.desc}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Custom slider (only in non-auto modes) */}
      {mode !== 'auto' && (
        <div style={{ background: C.panel2, borderRadius: 12, border: `1px solid ${C.border}`, padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 8 }}>
            <span style={{ color: C.muted }}>Ręczna regulacja</span>
            <span style={{ fontWeight: 700, color: modeConfig[mode].color }}>{customPct}%</span>
          </div>
          <input type="range" min={20} max={100} value={customPct} onChange={e => setCustomPct(+e.target.value)}
            style={{ width: '100%', accentColor: modeConfig[mode].color, cursor: 'pointer' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: C.muted, marginTop: 4 }}>
            <span>20%</span><span>50%</span><span>100%</span>
          </div>
        </div>
      )}

      {/* Fan gauges */}
      <div style={{ background: C.panel2, borderRadius: 12, border: `1px solid ${C.border}`, padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <span style={{ color: C.accent, fontSize: 11 }}>◉</span>
          <span style={{ fontSize: 11, color: C.muted, textTransform: 'uppercase', letterSpacing: 1 }}>Obroty wentylatorów</span>
          <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: `${modeConfig[mode].color}22`, color: modeConfig[mode].color }}>
            {modeConfig[mode].label}
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12 }}>
          {sensors.fanSpeeds.map((rpm: number, i: number) => {
            const adjustedRpm = mode === 'auto' ? rpm : Math.round((customPct / 100) * (i === 0 ? 2400 : 3200));
            const maxRpm = i === 0 ? 2400 : 3200;
            const pct = Math.min(1, adjustedRpm / maxRpm);
            const color = adjustedRpm === 0 ? C.muted : pct > 0.8 ? C.red : pct > 0.6 ? C.yellow : C.accent;
            return (
              <div key={i} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 18, fontWeight: 800, color }}>{adjustedRpm === 0 ? '—' : adjustedRpm}</div>
                <div style={{ fontSize: 9, color: C.muted }}>RPM</div>
                <div style={{ fontSize: 10, color: C.textSub, marginTop: 2 }}>{fanLabels[i]}</div>
                <div style={{ height: 4, background: C.subtle, borderRadius: 2, marginTop: 6, overflow: 'hidden' }}>
                  <div style={{ width: `${pct * 100}%`, height: '100%', background: color, borderRadius: 2, transition: 'width 0.5s' }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Temperature thresholds (auto mode) */}
      {mode === 'auto' && (
        <div style={{ background: C.panel2, borderRadius: 12, border: `1px solid ${C.border}`, padding: 16 }}>
          <div style={{ fontSize: 11, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Progi temperatury (auto)</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <FanThreshold label="Cichy (< 45°C)" temp="< 45°C" color={C.blue} pct={30} />
            <FanThreshold label="Normalny (45-60°C)" temp="45-60°C" color={C.accent} pct={50} />
            <FanThreshold label="Wysoki (60-75°C)" temp="60-75°C" color={C.yellow} pct={75} />
            <FanThreshold label="Krytyczny (> 75°C)" temp="> 75°C" color={C.red} pct={100} />
          </div>
          <div style={{ marginTop: 12, padding: '8px 12px', background: C.panel3, borderRadius: 8, fontSize: 11, color: C.muted }}>
            Aktualna temp. CPU: <span style={{ fontWeight: 700, color: sensors.cpuTemp > 70 ? C.red : sensors.cpuTemp > 55 ? C.yellow : C.accent }}>{sensors.cpuTemp.toFixed(0)}°C</span>
          </div>
        </div>
      )}
    </div>
  );
}

function FanThreshold({ label, temp, color, pct }: { label: string; temp: string; color: string; pct: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0' }}>
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
      <span style={{ fontSize: 11, color: C.text, flex: 1 }}>{label}</span>
      <span style={{ fontSize: 10, color: C.muted, fontFamily: 'monospace' }}>{temp}</span>
      <div style={{ width: 60, height: 4, background: C.subtle, borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 2 }} />
      </div>
    </div>
  );
}

// ── SSH Tab ─────────────────────────────────────────────────────
function SshTab() {
  const [enabled, setEnabled] = useState(true);
  const [port, setPort] = useState(22);
  const [passwordAuth, setPasswordAuth] = useState(false);
  const [rootLogin, setRootLogin] = useState(false);
  const [fail2ban, setFail2ban] = useState(true);
  const [keys, setKeys] = useState([
    { id: 'k1', name: 'admin@laptop', fingerprint: 'SHA256:Ax9k...mQ2P', date: '2024-11-12', lastUsed: '2h temu' },
    { id: 'k2', name: 'admin@desktop', fingerprint: 'SHA256:Bk7m...nR4L', date: '2024-09-03', lastUsed: '5d temu' },
    { id: 'k3', name: 'backup@nas', fingerprint: 'SHA256:Cm3p...tK8W', date: '2024-06-21', lastUsed: '14d temu' },
  ]);
  const [showAddKey, setShowAddKey] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyData, setNewKeyData] = useState('');

  const addKey = () => {
    if (!newKeyName || !newKeyData) return;
    setKeys(prev => [...prev, {
      id: `k${Date.now()}`,
      name: newKeyName,
      fingerprint: `SHA256:${newKeyData.slice(0, 4)}...${newKeyData.slice(-4)}`,
      date: new Date().toISOString().slice(0, 10),
      lastUsed: 'nigdy',
    }]);
    setNewKeyName('');
    setNewKeyData('');
    setShowAddKey(false);
  };

  const removeKey = (id: string) => setKeys(prev => prev.filter(k => k.id !== id));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* SSH Server status */}
      <div style={{ background: C.panel2, borderRadius: 12, border: `1px solid ${enabled ? C.green : C.border}`, padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 11, background: enabled ? C.greenDim : C.subtle, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
            🔑
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 800 }}>Serwer SSH</div>
            <div style={{ fontSize: 10, color: C.muted }}>OpenSSH 9.6p1 · {enabled ? 'Aktywny' : 'Wyłączony'}</div>
          </div>
          <Toggle on={enabled} onChange={setEnabled} />
        </div>

        {/* Connection info */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div style={{ background: C.panel3, borderRadius: 8, padding: '10px 12px' }}>
            <div style={{ fontSize: 9, color: C.muted, marginBottom: 3 }}>Adres połączenia</div>
            <div style={{ fontSize: 12, fontFamily: 'monospace', color: C.accent }}>ssh admin@nas.local</div>
          </div>
          <div style={{ background: C.panel3, borderRadius: 8, padding: '10px 12px' }}>
            <div style={{ fontSize: 9, color: C.muted, marginBottom: 3 }}>Port</div>
            <input type="number" value={port} onChange={e => setPort(+e.target.value)} disabled={!enabled}
              style={{ fontSize: 12, fontFamily: 'monospace', color: C.text, background: 'none', border: 'none', width: 60, outline: 'none' }} />
          </div>
        </div>
      </div>

      {/* Security settings */}
      <div style={{ background: C.panel2, borderRadius: 12, border: `1px solid ${C.border}`, padding: 16 }}>
        <div style={{ fontSize: 11, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Ustawienia bezpieczeństwa</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <SshToggleRow label="Uwierzytelnianie kluczem" desc="Logowanie tylko za pomocą kluczy SSH (zalecane)" on={true} onChange={() => {}} recommended />
          <SshToggleRow label="Logowanie hasłem" desc="Zezwalaj na logowanie hasłem (mniej bezpieczne)" on={passwordAuth} onChange={setPasswordAuth} warning />
          <SshToggleRow label="Logowanie jako root" desc="Zezwalaj na bezpośrednie logowanie root (niezalecane)" on={rootLogin} onChange={setRootLogin} warning />
          <SshToggleRow label="Fail2Ban" desc="Automatyczne blokowanie IP po nieudanych logowaniach" on={fail2ban} onChange={setFail2ban} recommended />
        </div>
      </div>

      {/* Authorized keys */}
      <div style={{ background: C.panel2, borderRadius: 12, border: `1px solid ${C.border}`, padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <span style={{ fontSize: 11, color: C.muted, textTransform: 'uppercase', letterSpacing: 1 }}>Autoryzowane klucze</span>
          <span style={{ fontSize: 10, color: C.accent, background: C.accent + '22', padding: '1px 8px', borderRadius: 6, fontWeight: 700 }}>{keys.length}</span>
          <button onClick={() => setShowAddKey(v => !v)} style={{
            marginLeft: 'auto', background: C.accent, color: '#000', border: 'none',
            borderRadius: 6, padding: '4px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer',
          }}>+ Dodaj klucz</button>
        </div>

        {showAddKey && (
          <div style={{ background: C.panel3, borderRadius: 10, border: `1px solid ${C.accent}44`, padding: 12, marginBottom: 10 }}>
            <input type="text" placeholder="Nazwa (np. admin@laptop)" value={newKeyName} onChange={e => setNewKeyName(e.target.value)}
              style={{ width: '100%', background: C.panel, border: `1px solid ${C.border}`, borderRadius: 6, padding: '8px 10px', color: C.text, fontSize: 12, marginBottom: 8, outline: 'none' }} />
            <textarea placeholder="ssh-ed25519 AAAA..." value={newKeyData} onChange={e => setNewKeyData(e.target.value)} rows={3}
              style={{ width: '100%', background: C.panel, border: `1px solid ${C.border}`, borderRadius: 6, padding: '8px 10px', color: C.text, fontSize: 11, fontFamily: 'monospace', marginBottom: 8, outline: 'none', resize: 'none' }} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={addKey} style={{ background: C.accent, color: '#000', border: 'none', borderRadius: 6, padding: '6px 14px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>Zapisz</button>
              <button onClick={() => setShowAddKey(false)} style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 6, padding: '6px 14px', fontSize: 11, color: C.muted, cursor: 'pointer' }}>Anuluj</button>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {keys.map(k => (
            <div key={k.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: C.panel3, borderRadius: 8, border: `1px solid ${C.border}` }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: C.accent + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>🔑</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{k.name}</div>
                <div style={{ fontSize: 10, color: C.muted, fontFamily: 'monospace' }}>{k.fingerprint}</div>
                <div style={{ fontSize: 9, color: C.muted }}>Dodano: {k.date} · Ostatnio użyty: {k.lastUsed}</div>
              </div>
              <button onClick={() => removeKey(k.id)} style={{
                background: 'none', border: `1px solid ${C.red}44`, color: C.red,
                borderRadius: 6, padding: '4px 8px', fontSize: 10, cursor: 'pointer', flexShrink: 0,
              }}>Usuń</button>
            </div>
          ))}
          {keys.length === 0 && <div style={{ textAlign: 'center', padding: 20, color: C.muted, fontSize: 12 }}>Brak autoryzowanych kluczy</div>}
        </div>
      </div>

      {/* Active sessions */}
      <div style={{ background: C.panel2, borderRadius: 12, border: `1px solid ${C.border}`, padding: 16 }}>
        <div style={{ fontSize: 11, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Aktywne sesje</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <SshSession user="admin" from="192.168.1.42" since="14:22" active />
          <SshSession user="backup" from="10.0.0.5" since="08:15" />
        </div>
      </div>
    </div>
  );
}

function SshToggleRow({ label, desc, on, onChange, recommended, warning }: { label: string; desc: string; on: boolean; onChange: (v: boolean) => void; recommended?: boolean; warning?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: `1px solid ${C.subtle}` }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: C.text, display: 'flex', alignItems: 'center', gap: 6 }}>
          {label}
          {recommended && <span style={{ fontSize: 9, color: C.green, background: C.greenDim, padding: '1px 6px', borderRadius: 4 }}>Zalecane</span>}
          {warning && <span style={{ fontSize: 9, color: C.yellow, background: C.yellowDim, padding: '1px 6px', borderRadius: 4 }}>Ostrzeżenie</span>}
        </div>
        <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>{desc}</div>
      </div>
      <Toggle on={on} onChange={onChange} />
    </div>
  );
}

function SshSession({ user, from, since, active }: { user: string; from: string; since: string; active?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: C.panel3, borderRadius: 8 }}>
      <div style={{ width: 6, height: 6, borderRadius: '50%', background: active ? C.green : C.muted, boxShadow: active ? `0 0 6px ${C.green}` : 'none' }} />
      <span style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{user}</span>
      <span style={{ fontSize: 10, color: C.muted, fontFamily: 'monospace' }}>{from}</span>
      <span style={{ fontSize: 10, color: C.muted, marginLeft: 'auto' }}>od {since}</span>
    </div>
  );
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <div onClick={() => onChange(!on)} style={{
      width: 38, height: 22, borderRadius: 11, background: on ? C.accent : C.subtle,
      cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0,
    }}>
      <div style={{
        position: 'absolute', top: 2, left: on ? 18 : 2,
        width: 18, height: 18, borderRadius: '50%', background: '#fff',
        transition: 'left 0.2s', boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
      }} />
    </div>
  );
}
