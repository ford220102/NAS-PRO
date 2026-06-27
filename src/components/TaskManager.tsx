import { useState, useEffect, useRef, useCallback } from 'react';
import { C } from '../data/theme';
import { SensorData } from '../data/catalog';

interface Process {
  pid: number;
  name: string;
  user: string;
  cpu: number;
  mem: number;
  status: 'running' | 'sleeping' | 'zombie';
  started: string;
}

interface LogEntry {
  time: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  source: string;
  message: string;
}

const rb = (a: number, b: number) => Math.random() * (b - a) + a;
const rbi = (a: number, b: number) => Math.floor(rb(a, b));

const INITIAL_PROCS: Process[] = [
  { pid: 1,    name: 'systemd',        user: 'root',  cpu: 0.1, mem: 12,  status: 'sleeping', started: '5d ago' },
  { pid: 412,  name: 'dockerd',       user: 'root',  cpu: 2.1, mem: 48,  status: 'running',  started: '5d ago' },
  { pid: 891,  name: 'ugos-web',      user: 'admin', cpu: 0.8, mem: 32,  status: 'running',  started: '5d ago' },
  { pid: 1024, name: 'sshd',          user: 'root',  cpu: 0.3, mem: 18,  status: 'sleeping', started: '5d ago' },
  { pid: 2048, name: 'bash',          user: 'admin', cpu: 0.1, mem: 14,  status: 'sleeping', started: '2h ago' },
  { pid: 3104, name: 'jellyfin',      user: 'admin', cpu: 4.2, mem: 256, status: 'running',  started: '3d ago' },
  { pid: 3208, name: 'qbittorrent',   user: 'admin', cpu: 1.8, mem: 128, status: 'running',  started: '5d ago' },
  { pid: 3312, name: 'portainer',     user: 'root',  cpu: 0.5, mem: 64,  status: 'running',  started: '5d ago' },
  { pid: 3420, name: 'homeassistant', user: 'root',  cpu: 3.1, mem: 192, status: 'running',  started: '2d ago' },
  { pid: 3518, name: 'nginx',         user: 'root',  cpu: 0.4, mem: 24,  status: 'running',  started: '14h ago' },
  { pid: 3622, name: 'clamd',         user: 'clamav',cpu: 0.2, mem: 512, status: 'sleeping', started: '5d ago' },
  { pid: 3730, name: 'fail2ban',      user: 'root',  cpu: 0.1, mem: 28,  status: 'sleeping', started: '5d ago' },
  { pid: 3844, name: 'node_exporter', user: 'root',  cpu: 0.3, mem: 16,  status: 'running',  started: '5d ago' },
  { pid: 3950, name: 'cron',          user: 'root',  cpu: 0.0, mem: 8,   status: 'sleeping', started: '5d ago' },
  { pid: 4060, name: 'rsyslogd',      user: 'root',  cpu: 0.1, mem: 12,  status: 'running',  started: '5d ago' },
];

const INITIAL_LOGS: LogEntry[] = [
  { time: '14:32:08', level: 'info',  source: 'systemd',     message: 'Started Session 142 of user admin.' },
  { time: '14:31:55', level: 'info',  source: 'docker',     message: 'Container jellyfin: healthy' },
  { time: '14:30:12', level: 'warn',  source: 'fail2ban',   message: 'Banned IP 203.0.113.42 for 1h (5 failed attempts)' },
  { time: '14:28:03', level: 'info',  source: 'sshd',       message: 'Accepted publickey for admin from 192.168.1.42' },
  { time: '14:25:44', level: 'error', source: 'qbittorrent', message: 'Tracker timeout: udp://tracker.example.com' },
  { time: '14:22:18', level: 'info',  source: 'kernel',     message: 'TCP: request_sock_TCP: Possible SYN flooding on port 8096' },
  { time: '14:20:01', level: 'debug', source: 'clamd',      message: 'Self-check: 12400 files scanned, 0 threats' },
  { time: '14:18:33', level: 'info',  source: 'nginx',      message: '192.168.1.42 - GET /api/system 200 12ms' },
  { time: '14:15:09', level: 'warn',  source: 'kernel',     message: 'CPU temperature: 68°C (threshold 75°C)' },
  { time: '14:12:44', level: 'info',  source: 'docker',     message: 'Container homeassistant: healthy' },
  { time: '14:10:22', level: 'error', source: 'sshd',       message: 'Failed password for root from 203.0.113.99' },
  { time: '14:08:15', level: 'info',  source: 'systemd',    message: 'Started Daily apt download activities.' },
  { time: '14:05:03', level: 'debug', source: 'ugos-web',   message: 'GET /api/sensors 200 8ms' },
  { time: '14:02:48', level: 'info',  source: 'cron',       message: 'Job: /etc/cron.daily/backup executed successfully' },
  { time: '14:00:01', level: 'info',  source: 'rsyslogd',   message: 'Log rotation completed for /var/log/syslog' },
];

const LOG_SOURCES = ['systemd', 'docker', 'sshd', 'kernel', 'nginx', 'clamd', 'fail2ban', 'cron', 'ugos-web', 'rsyslogd'];
const LOG_MESSAGES: Record<string, string[]> = {
  systemd: ['Started Session X of user admin.', 'Reloading configuration.', 'Stopping service...'],
  docker: ['Container jellyfin: healthy', 'Container nginx: restarted', 'Image pull complete: alpine:3.19'],
  sshd: ['Accepted publickey for admin from 192.168.1.42', 'Failed password for root from 203.0.113.99', 'Connection closed by 10.0.0.5'],
  kernel: ['CPU temperature: 68°C (threshold 75°C)', 'TCP: Possible SYN flooding on port 8096', 'EXT4-fs: mounted with ordered data mode'],
  nginx: ['192.168.1.42 - GET /api/system 200 12ms', '192.168.1.42 - POST /api/upload 201 45ms', 'upstream timed out: 172.17.0.3:8096'],
  clamd: ['Self-check: 12400 files scanned, 0 threats', 'Database update: 842 new signatures', 'Scanning /data/docker/...'],
  fail2ban: ['Banned IP 203.0.113.42 for 1h (5 failed attempts)', 'Unbanned IP 198.51.100.12', 'Found 203.0.113.99 in sshd.log'],
  cron: ['Job: /etc/cron.daily/backup executed successfully', 'Job: /etc/cron.hourly/logrotate started'],
  'ugos-web': ['GET /api/sensors 200 8ms', 'POST /api/docker/restart 200 120ms', 'WebSocket: client connected from 192.168.1.42'],
  rsyslogd: ['Log rotation completed for /var/log/syslog', 'imuxsock: begin new file for /var/log/auth.log'],
};

const LEVEL_COLORS: Record<string, string> = {
  info: C.blue,
  warn: C.yellow,
  error: C.red,
  debug: C.muted,
};

type Tab = 'processes' | 'performance' | 'logs' | 'services';

export default function TaskManager({ sensors }: { sensors: SensorData }) {
  const [tab, setTab] = useState<Tab>('processes');
  const [procs, setProcs] = useState<Process[]>(INITIAL_PROCS);
  const [logs, setLogs] = useState<LogEntry[]>(INITIAL_LOGS);
  const [logFilter, setLogFilter] = useState<'all' | 'info' | 'warn' | 'error'>('all');
  const [selectedProc, setSelectedProc] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<'cpu' | 'mem' | 'pid' | 'name'>('cpu');
  const logRef = useRef<HTMLDivElement>(null);

  const addLog = useCallback(() => {
    const src = LOG_SOURCES[rbi(0, LOG_SOURCES.length)];
    const msgs = LOG_MESSAGES[src];
    const msg = msgs[rbi(0, msgs.length)].replace('X', String(rbi(100, 999)));
    const levels: LogEntry['level'][] = ['info', 'info', 'info', 'warn', 'error', 'debug'];
    const level = levels[rbi(0, levels.length)];
    const now = new Date();
    const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    setLogs(prev => [...prev.slice(-200), { time, level, source: src, message: msg }]);
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      setProcs(prev => prev.map(p => ({
        ...p,
        cpu: Math.max(0, Math.min(100, p.cpu + rb(-1.5, 1.5))),
        mem: Math.max(4, p.mem + rb(-2, 2)),
      })));
      if (Math.random() > 0.6) addLog();
    }, 2000);
    return () => clearInterval(id);
  }, [addLog]);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logs]);

  const sortedProcs = [...procs].sort((a, b) => {
    if (sortBy === 'cpu') return b.cpu - a.cpu;
    if (sortBy === 'mem') return b.mem - a.mem;
    if (sortBy === 'pid') return a.pid - b.pid;
    return a.name.localeCompare(b.name);
  });

  const filteredLogs = logFilter === 'all' ? logs : logs.filter(l => l.level === logFilter);
  const totalCpu = procs.reduce((s, p) => s + p.cpu, 0);
  const totalMem = procs.reduce((s, p) => s + p.mem, 0);

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'processes', label: 'Procesy', icon: '📋' },
    { id: 'performance', label: 'Wydajność', icon: '📈' },
    { id: 'logs', label: 'Logi systemowe', icon: '📜' },
    { id: 'services', label: 'Usługi', icon: '⚙' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 0 }}>
      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 2, borderBottom: `1px solid ${C.border}`, paddingBottom: 0 }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: '8px 14px', fontSize: 12, fontWeight: 600,
            background: tab === t.id ? C.panel2 : 'none', border: 'none', borderBottom: tab === t.id ? `2px solid ${C.accent}` : '2px solid transparent',
            color: tab === t.id ? C.accent : C.muted, cursor: 'pointer', transition: 'all 0.15s',
            display: 'flex', alignItems: 'center', gap: 6, borderRadius: '6px 6px 0 0',
          }}>
            <span>{t.icon}</span>{t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: 12 }}>
        {/* ── PROCESSES ── */}
        {tab === 'processes' && (
          <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 10, fontSize: 11 }}>
              <span style={{ color: C.muted }}>Sortuj:</span>
              {(['cpu', 'mem', 'pid', 'name'] as const).map(s => (
                <button key={s} onClick={() => setSortBy(s)} style={{
                  background: sortBy === s ? C.accent + '22' : 'none', border: `1px solid ${sortBy === s ? C.accent : C.border}`,
                  borderRadius: 5, padding: '2px 8px', color: sortBy === s ? C.accent : C.muted, cursor: 'pointer', fontSize: 11,
                }}>
                  {s === 'cpu' ? 'CPU' : s === 'mem' ? 'RAM' : s === 'pid' ? 'PID' : 'Nazwa'}
                </button>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr 80px 60px 60px 80px 80px', gap: 0, fontSize: 10, color: C.muted, padding: '6px 10px', borderBottom: `1px solid ${C.border}`, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              <span>PID</span><span>Nazwa</span><span>Użytkownik</span><span>CPU%</span><span>RAM MB</span><span>Status</span><span>Uruchomiono</span>
            </div>
            {sortedProcs.map(p => (
              <div key={p.pid} onClick={() => setSelectedProc(selectedProc === p.pid ? null : p.pid)} style={{
                display: 'grid', gridTemplateColumns: '60px 1fr 80px 60px 60px 80px 80px', gap: 0, fontSize: 11,
                padding: '6px 10px', borderBottom: `1px solid ${C.subtle}`, cursor: 'pointer',
                background: selectedProc === p.pid ? C.panel2 : 'transparent', transition: 'background 0.1s',
              }}>
                <span style={{ color: C.muted, fontFamily: 'monospace' }}>{p.pid}</span>
                <span style={{ color: C.text, fontWeight: 600 }}>{p.name}</span>
                <span style={{ color: C.muted }}>{p.user}</span>
                <span style={{ color: p.cpu > 5 ? C.red : p.cpu > 2 ? C.yellow : C.accent, fontFamily: 'monospace' }}>{p.cpu.toFixed(1)}</span>
                <span style={{ color: C.textSub, fontFamily: 'monospace' }}>{p.mem.toFixed(0)}</span>
                <span style={{ color: p.status === 'running' ? C.green : p.status === 'zombie' ? C.red : C.muted }}>{p.status === 'running' ? '●' : '○'}</span>
                <span style={{ color: C.muted }}>{p.started}</span>
              </div>
            ))}
            {selectedProc !== null && (
              <div style={{ marginTop: 12, padding: 12, background: C.panel2, borderRadius: 8, border: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>PID {selectedProc} — {procs.find(p => p.pid === selectedProc)?.name}</div>
                <button style={{ background: C.redDim, border: `1px solid ${C.red}44`, color: C.red, borderRadius: 6, padding: '5px 12px', fontSize: 11, cursor: 'pointer' }}>Zakończ proces</button>
                <button style={{ background: C.panel3, border: `1px solid ${C.border}`, color: C.muted, borderRadius: 6, padding: '5px 12px', fontSize: 11, cursor: 'pointer', marginLeft: 8 }}>Restart</button>
              </div>
            )}
          </div>
        )}

        {/* ── PERFORMANCE ── */}
        {tab === 'performance' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <PerfCard label="CPU" value={`${sensors.cpuUsage.toFixed(0)}%`} detail={`${sensors.cpuTemp.toFixed(0)}°C · ${totalCpu.toFixed(0)}% aktywnych`} color={C.accent} pct={sensors.cpuUsage} />
            <PerfCard label="Pamięć RAM" value={`${sensors.ramUsed.toFixed(1)} / ${sensors.ramTotal} GB`} detail={`${totalMem.toFixed(0)} MB w procesach`} color={C.blue} pct={(sensors.ramUsed / sensors.ramTotal) * 100} />
            <PerfCard label="Sieć (RX)" value={`${sensors.networkRx.toFixed(0)} Mbps`} detail={`TX: ${sensors.networkTx.toFixed(0)} Mbps`} color={C.green} pct={Math.min(100, (sensors.networkRx / 1000) * 100)} />
            <div style={{ background: C.panel2, borderRadius: 10, border: `1px solid ${C.border}`, padding: 14 }}>
              <div style={{ fontSize: 11, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Czas pracy systemu</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: C.accent }}>{sensors.uptime}</div>
            </div>
          </div>
        )}

        {/* ── LOGS ── */}
        {tab === 'logs' && (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
              {(['all', 'info', 'warn', 'error'] as const).map(f => (
                <button key={f} onClick={() => setLogFilter(f)} style={{
                  background: logFilter === f ? C.accent + '22' : 'none', border: `1px solid ${logFilter === f ? C.accent : C.border}`,
                  borderRadius: 5, padding: '3px 10px', color: logFilter === f ? C.accent : C.muted, cursor: 'pointer', fontSize: 11, fontWeight: 600,
                }}>
                  {f === 'all' ? 'Wszystkie' : f === 'info' ? 'Info' : f === 'warn' ? 'Ostrzeżenia' : 'Błędy'}
                </button>
              ))}
              <span style={{ marginLeft: 'auto', fontSize: 10, color: C.muted, alignSelf: 'center' }}>{filteredLogs.length} wpisów</span>
            </div>
            <div ref={logRef} style={{ flex: 1, overflow: 'auto', background: '#0a0a14', borderRadius: 8, border: `1px solid ${C.border}`, padding: 10, fontFamily: 'monospace' }}>
              {filteredLogs.map((l, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, padding: '3px 0', fontSize: 11, borderBottom: `1px solid ${C.subtle}` }}>
                  <span style={{ color: C.muted, flexShrink: 0 }}>{l.time}</span>
                  <span style={{ color: LEVEL_COLORS[l.level], fontWeight: 700, flexShrink: 0, width: 42 }}>{l.level.toUpperCase()}</span>
                  <span style={{ color: C.accent, flexShrink: 0, width: 80 }}>{l.source}</span>
                  <span style={{ color: C.textSub }}>{l.message}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── SERVICES ── */}
        {tab === 'services' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[
              { name: 'sshd', desc: 'Serwer SSH', active: true },
              { name: 'dockerd', desc: 'Docker daemon', active: true },
              { name: 'nginx', desc: 'Serwer HTTP/HTTPS', active: true },
              { name: 'clamd', desc: 'Antivirus (ClamAV)', active: true },
              { name: 'fail2ban', desc: 'Ochrona SSH', active: true },
              { name: 'cron', desc: 'Harmonogram zadań', active: true },
              { name: 'rsyslogd', desc: 'Logi systemowe', active: true },
              { name: 'node_exporter', desc: 'Metryki Prometheus', active: true },
              { name: 'smbd', desc: 'Udostępnianie plików (SMB)', active: false },
              { name: 'nfsd', desc: 'NFS server', active: false },
            ].map(s => (
              <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: C.panel2, borderRadius: 8, border: `1px solid ${C.border}` }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.active ? C.green : C.muted, boxShadow: s.active ? `0 0 6px ${C.green}` : 'none' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: C.text, fontFamily: 'monospace' }}>{s.name}</div>
                  <div style={{ fontSize: 10, color: C.muted }}>{s.desc}</div>
                </div>
                <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: s.active ? C.greenDim : C.subtle, color: s.active ? C.green : C.muted }}>
                  {s.active ? 'Aktywny' : 'Zatrzymany'}
                </span>
                <button style={{ background: C.panel3, border: `1px solid ${C.border}`, borderRadius: 5, padding: '3px 8px', fontSize: 10, color: C.muted, cursor: 'pointer' }}>
                  {s.active ? 'Stop' : 'Start'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function PerfCard({ label, value, detail, color, pct }: { label: string; value: string; detail: string; color: string; pct: number }) {
  return (
    <div style={{ background: C.panel2, borderRadius: 10, border: `1px solid ${C.border}`, padding: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 11, color: C.muted, textTransform: 'uppercase', letterSpacing: 1 }}>{label}</span>
        <span style={{ fontSize: 18, fontWeight: 800, color }}>{value}</span>
      </div>
      <div style={{ height: 6, background: C.subtle, borderRadius: 3, overflow: 'hidden', marginBottom: 6 }}>
        <div style={{ width: `${Math.min(100, pct)}%`, height: '100%', borderRadius: 3, background: color, transition: 'width 1s', boxShadow: `0 0 6px ${color}66` }} />
      </div>
      <div style={{ fontSize: 10, color: C.muted }}>{detail}</div>
    </div>
  );
}
