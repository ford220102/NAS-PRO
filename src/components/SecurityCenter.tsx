import { useState, useEffect, useRef, useCallback } from 'react';
import { C } from '../data/theme';

type ScanType = 'quick' | 'full' | 'docker' | 'memory' | 'custom';
type ScanState = 'idle' | 'scanning' | 'completed' | 'threats';

interface Threat {
  id: string;
  file: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  action: 'quarantined' | 'removed' | 'ignored';
}

interface ScanResult {
  type: ScanType;
  filesScanned: number;
  threatsFound: number;
  duration: string;
  date: string;
}

const SCAN_CONFIG: Record<ScanType, { label: string; icon: string; desc: string; color: string; duration: number; files: number }> = {
  quick:   { label: 'Szybkie skanowanie',    icon: '⚡', desc: 'Krytyczne pliki systemowe i pamięć',           color: C.accent, duration: 8,  files: 12400 },
  full:    { label: 'Pełne skanowanie',      icon: '💿', desc: 'Wszystkie dyski, partycje i udostępnione foldery', color: C.blue,   duration: 45, files: 487000 },
  docker:  { label: 'Skanowanie Dockera',    icon: '🐳', desc: 'Kontenery, obrazy i wolumeny Docker',          color: C.purple, duration: 15, files: 32000 },
  memory:  { label: 'Skanowanie pamięci',    icon: '🧠', desc: 'RAM i procesy aktywne',                        color: C.yellow, duration: 5,  files: 2400 },
  custom:   { label: 'Skanowanie własne',    icon: '📁', desc: 'Wybrany folder lub dysk',                      color: C.green,  duration: 20, files: 89000 },
};

const SAMPLE_THREATS: Threat[] = [
  { id: 't1', file: '/tmp/suspicious_script.sh', type: 'Trojan.Linux.ShellBash', severity: 'high', action: 'quarantined' },
  { id: 't2', file: '/mnt/volume1/Downloads/crack.exe', type: 'Win32.Packer.UPX', severity: 'medium', action: 'quarantined' },
  { id: 't3', file: '/var/lib/docker/overlay2/ab3.../bin/crypto_miner', type: 'CoinMiner.XMRig', severity: 'critical', action: 'removed' },
];

const SCAN_HISTORY: ScanResult[] = [
  { type: 'full',   filesScanned: 487213, threatsFound: 0, duration: '42 min', date: 'Dzisiaj 03:00' },
  { type: 'quick',  filesScanned: 12400,  threatsFound: 0, duration: '6 min',  date: 'Wczoraj 14:22' },
  { type: 'docker', filesScanned: 32100,  threatsFound: 1, duration: '12 min', date: '2 dni temu' },
  { type: 'full',   filesScanned: 487000, threatsFound: 2, duration: '45 min', date: '5 dni temu' },
];

export default function SecurityCenter() {
  const [firewallEnabled, setFirewallEnabled] = useState(true);
  const [dosEnabled, setDosEnabled] = useState(true);
  const [autoBlock, setAutoBlock] = useState(true);
  const [antivirusEnabled, setAntivirusEnabled] = useState(true);
  const [realTimeProtection, setRealTimeProtection] = useState(true);
  const [scanState, setScanState] = useState<ScanState>('idle');
  const [activeScan, setActiveScan] = useState<ScanType | null>(null);
  const [scanProgress, setScanProgress] = useState(0);
  const [filesScanned, setFilesScanned] = useState(0);
  const [threats, setThreats] = useState<Threat[]>([]);
  const [scanHistory] = useState<ScanResult[]>(SCAN_HISTORY);
  const [autoScan, setAutoScan] = useState(true);
  const [scanSchedule, setScanSchedule] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [scanTime, setScanTime] = useState('03:00');
  const [lastUpdate, setLastUpdate] = useState('2024-11-15');
  const [definitionsVersion, setDefinitionsVersion] = useState('v2024.11.15.842');
  const [updating, setUpdating] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startScan = useCallback((type: ScanType) => {
    if (scanState === 'scanning') return;
    setActiveScan(type);
    setScanState('scanning');
    setScanProgress(0);
    setFilesScanned(0);
    setThreats([]);
    const cfg = SCAN_CONFIG[type];
    const totalFiles = cfg.files;
    const tickMs = 100;
    const filesPerTick = Math.ceil(totalFiles / (cfg.duration * 1000 / tickMs));

    intervalRef.current = setInterval(() => {
      setScanProgress(p => {
        const next = p + (100 / (cfg.duration * 1000 / tickMs));
        if (next >= 100) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          setScanState('threats');
          setThreats(type === 'full' || type === 'docker' ? SAMPLE_THREATS : []);
          return 100;
        }
        return next;
      });
      setFilesScanned(f => Math.min(totalFiles, f + filesPerTick));
    }, tickMs);
  }, [scanState]);

  const cancelScan = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setScanState('idle');
    setActiveScan(null);
    setScanProgress(0);
    setFilesScanned(0);
  };

  const updateDefinitions = () => {
    setUpdating(true);
    setTimeout(() => {
      setUpdating(false);
      setLastUpdate(new Date().toISOString().slice(0, 10));
      setDefinitionsVersion(`v${new Date().toISOString().slice(0, 10).replace(/-/g, '.')}.${Math.floor(Math.random() * 999)}`);
    }, 2000);
  };

  useEffect(() => {
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  const threatCount = threats.length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: C.panel, overflowY: 'auto' }}>
      <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Security Score */}
        <div style={{
          background: C.panel2, borderRadius: 14, border: `1px solid ${C.green}44`,
          padding: 20, display: 'flex', alignItems: 'center', gap: 20,
        }}>
          <div style={{ position: 'relative', width: 80, height: 80 }}>
            <svg width="80" height="80" viewBox="0 0 80 80">
              <circle cx="40" cy="40" r="32" fill="none" stroke={C.subtle} strokeWidth="7" />
              <circle cx="40" cy="40" r="32" fill="none" stroke={C.green}
                strokeWidth="7" strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 32}`}
                strokeDashoffset={`${2 * Math.PI * 32 * 0.14}`}
                transform="rotate(-90 40 40)"
                style={{ filter: `drop-shadow(0 0 8px ${C.green}66)` }}
              />
            </svg>
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{ fontSize: 20, fontWeight: 900, color: C.green }}>86</div>
            </div>
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 4 }}>Security Score: Good</div>
            <div style={{ fontSize: 12, color: C.muted, marginBottom: 8 }}>2 recommendations to improve security</div>
            <div style={{ fontSize: 11, color: C.yellow }}>⚠ Enable 2FA for user account</div>
          </div>
        </div>

        {/* ── ANTIVIRUS ────────────────────────────────────────── */}
        <div style={{ background: C.panel2, borderRadius: 14, border: `1px solid ${antivirusEnabled ? C.green : C.border}`, padding: 18 }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div style={{ width: 44, height: 44, borderRadius: 11, background: antivirusEnabled ? C.greenDim : C.subtle, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>🛡</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 800 }}>Antivirus</div>
              <div style={{ fontSize: 10, color: C.muted }}>ClamAV · {definitionsVersion} · Aktualizacja: {lastUpdate}</div>
            </div>
            <Toggle value={antivirusEnabled} onChange={setAntivirusEnabled} color={C.green} />
          </div>

          {antivirusEnabled && (
            <>
              {/* Real-time protection */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: C.panel3, borderRadius: 8, marginBottom: 14 }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>Ochrona w czasie rzeczywistym</div>
                  <div style={{ fontSize: 10, color: C.muted }}>Skanowanie plików przy zapisie/odczycie</div>
                </div>
                <Toggle value={realTimeProtection} onChange={setRealTimeProtection} color={C.accent} />
              </div>

              {/* Scan progress */}
              {scanState === 'scanning' && activeScan && (
                <div style={{ background: C.panel3, borderRadius: 10, border: `1px solid ${SCAN_CONFIG[activeScan].color}44`, padding: 14, marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <span style={{ fontSize: 18 }}>{SCAN_CONFIG[activeScan].icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: SCAN_CONFIG[activeScan].color }}>{SCAN_CONFIG[activeScan].label}</div>
                      <div style={{ fontSize: 10, color: C.muted }}>{filesScanned.toLocaleString()} plików przeskanowanych</div>
                    </div>
                    <button onClick={cancelScan} style={{ background: C.redDim, border: `1px solid ${C.red}44`, color: C.red, borderRadius: 6, padding: '4px 10px', fontSize: 11, cursor: 'pointer' }}>Anuluj</button>
                  </div>
                  <div style={{ height: 8, background: C.subtle, borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ width: `${scanProgress}%`, height: '100%', borderRadius: 4, background: SCAN_CONFIG[activeScan].color, transition: 'width 0.1s', boxShadow: `0 0 6px ${SCAN_CONFIG[activeScan].color}66` }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: C.muted, marginTop: 4 }}>
                    <span>{scanProgress.toFixed(0)}%</span>
                    <span>~{Math.max(0, Math.ceil((100 - scanProgress) / 100 * SCAN_CONFIG[activeScan].duration))}s pozostało</span>
                  </div>
                </div>
              )}

              {/* Scan results */}
              {scanState === 'threats' && (
                <div style={{ background: C.panel3, borderRadius: 10, border: `1px solid ${threatCount > 0 ? C.red : C.green}44`, padding: 14, marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <span style={{ fontSize: 18 }}>{threatCount > 0 ? '⚠️' : '✅'}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: threatCount > 0 ? C.red : C.green }}>
                        {threatCount > 0 ? `Znaleziono ${threatCount} zagrożeń` : 'Skanowanie zakończone — brak zagrożeń'}
                      </div>
                      <div style={{ fontSize: 10, color: C.muted }}>{filesScanned.toLocaleString()} plików · {activeScan ? SCAN_CONFIG[activeScan].label : ''}</div>
                    </div>
                    <button onClick={() => { setScanState('idle'); setActiveScan(null); }} style={{ background: C.subtle, border: `1px solid ${C.border}`, color: C.muted, borderRadius: 6, padding: '4px 10px', fontSize: 11, cursor: 'pointer' }}>Zamknij</button>
                  </div>
                  {threats.map(t => (
                    <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: C.panel, borderRadius: 7, marginBottom: 6, border: `1px solid ${C.border}` }}>
                      <span style={{ fontSize: 14 }}>{t.severity === 'critical' ? '🔴' : t.severity === 'high' ? '🟠' : '🟡'}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: C.text, fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.file}</div>
                        <div style={{ fontSize: 10, color: C.muted }}>{t.type}</div>
                      </div>
                      <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, fontWeight: 700, background: t.action === 'removed' ? C.redDim : C.yellowDim, color: t.action === 'removed' ? C.red : C.yellow }}>
                        {t.action === 'removed' ? 'Usunięto' : 'Kwarantanna'}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Scan buttons */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', gap: 8, marginBottom: 14 }}>
                {(Object.keys(SCAN_CONFIG) as ScanType[]).map(type => {
                  const cfg = SCAN_CONFIG[type];
                  const disabled = scanState === 'scanning';
                  return (
                    <button key={type} onClick={() => startScan(type)} disabled={disabled}
                      style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                        padding: '10px 6px', borderRadius: 10,
                        background: disabled ? C.panel3 : `${cfg.color}10`,
                        border: `1px solid ${disabled ? C.border : `${cfg.color}33`}`,
                        cursor: disabled ? 'not-allowed' : 'pointer', transition: 'all 0.15s',
                        opacity: disabled ? 0.4 : 1,
                      }}>
                      <span style={{ fontSize: 20 }}>{cfg.icon}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, color: cfg.color, textAlign: 'center', lineHeight: 1.2 }}>{cfg.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Update definitions */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: C.panel3, borderRadius: 8, marginBottom: 14 }}>
                <span style={{ fontSize: 16 }}>{updating ? '⏳' : '🔄'}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, fontWeight: 600 }}>Bazy sygnatur wirusów</div>
                  <div style={{ fontSize: 10, color: C.muted }}>{definitionsVersion} · {updating ? 'Aktualizowanie...' : 'Aktualne'}</div>
                </div>
                <button onClick={updateDefinitions} disabled={updating}
                  style={{ background: C.accent, color: '#000', border: 'none', borderRadius: 6, padding: '5px 12px', fontSize: 11, fontWeight: 700, cursor: updating ? 'wait' : 'pointer', opacity: updating ? 0.6 : 1 }}>
                  {updating ? '...' : 'Aktualizuj'}
                </button>
              </div>

              {/* Schedule */}
              <div style={{ background: C.panel3, borderRadius: 8, padding: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div style={{ fontSize: 11, fontWeight: 600 }}>Harmonogram skanowań</div>
                  <Toggle value={autoScan} onChange={setAutoScan} color={C.accent} />
                </div>
                {autoScan && (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <select value={scanSchedule} onChange={e => setScanSchedule(e.target.value as 'daily' | 'weekly' | 'monthly')}
                      style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 6, padding: '5px 8px', color: C.text, fontSize: 11, outline: 'none' }}>
                      <option value="daily">Codziennie</option>
                      <option value="weekly">Co tydzień</option>
                      <option value="monthly">Co miesiąc</option>
                    </select>
                    <input type="time" value={scanTime} onChange={e => setScanTime(e.target.value)}
                      style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 6, padding: '5px 8px', color: C.text, fontSize: 11, outline: 'none' }} />
                    <span style={{ fontSize: 10, color: C.muted }}>Pełne skanowanie</span>
                  </div>
                )}
              </div>

              {/* Scan history */}
              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 11, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Historia skanowań</div>
                {scanHistory.map((r, i) => {
                  const cfg = SCAN_CONFIG[r.type];
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 10px', background: C.panel3, borderRadius: 7, marginBottom: 5 }}>
                      <span style={{ fontSize: 14 }}>{cfg.icon}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: C.text }}>{cfg.label}</div>
                        <div style={{ fontSize: 9, color: C.muted }}>{r.filesScanned.toLocaleString()} plików · {r.duration}</div>
                      </div>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: r.threatsFound > 0 ? C.redDim : C.greenDim, color: r.threatsFound > 0 ? C.red : C.green }}>
                        {r.threatsFound > 0 ? `${r.threatsFound} zagrożenia` : 'Czysto'}
                      </span>
                      <span style={{ fontSize: 9, color: C.muted, fontFamily: 'monospace' }}>{r.date}</span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Firewall */}
        <div style={{ background: C.panel2, borderRadius: 12, border: `1px solid ${C.border}`, padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 13 }}>Firewall</div>
              <div style={{ fontSize: 11, color: C.muted }}>Block unauthorized access to NAS ports</div>
            </div>
            <Toggle value={firewallEnabled} onChange={setFirewallEnabled} color={C.green} />
          </div>
          {firewallEnabled && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { port: '22 (SSH)', action: 'Allow', from: '192.168.1.0/24' },
                { port: '5000-5001 (Web UI)', action: 'Allow', from: 'Any' },
                { port: '445 (SMB)', action: 'Allow', from: '192.168.1.0/24' },
                { port: 'All others', action: 'Deny', from: 'Any' },
              ].map(rule => (
                <div key={rule.port} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px',
                  background: C.panel3, borderRadius: 7, fontSize: 11,
                }}>
                  <span style={{ fontFamily: 'monospace', color: C.accent, minWidth: 140 }}>{rule.port}</span>
                  <span style={{
                    padding: '1px 8px', borderRadius: 4, fontWeight: 700,
                    background: rule.action === 'Allow' ? C.greenDim : C.redDim,
                    color: rule.action === 'Allow' ? C.green : C.red,
                  }}>{rule.action}</span>
                  <span style={{ color: C.muted }}>from {rule.from}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Auto-block */}
        <div style={{ background: C.panel2, borderRadius: 12, border: `1px solid ${C.border}`, padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 13 }}>Auto Block (Brute-force Protection)</div>
              <div style={{ fontSize: 11, color: C.muted }}>Block IPs after 5 failed login attempts in 10 minutes</div>
            </div>
            <Toggle value={autoBlock} onChange={setAutoBlock} color={C.accent} />
          </div>
          {autoBlock && (
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 11, color: C.muted, marginBottom: 8 }}>Recently blocked:</div>
              {[
                { ip: '192.168.50.22', attempts: 12, time: '2h ago' },
                { ip: '45.33.92.108', attempts: 28, time: '1d ago' },
              ].map(entry => (
                <div key={entry.ip} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '7px 10px',
                  background: C.redDim, borderRadius: 7, marginBottom: 6,
                  border: `1px solid ${C.red}22`,
                }}>
                  <span style={{ fontFamily: 'monospace', fontSize: 11, color: C.red, flex: 1 }}>{entry.ip}</span>
                  <span style={{ fontSize: 11, color: C.muted }}>{entry.attempts} attempts · {entry.time}</span>
                  <button style={{ padding: '2px 8px', borderRadius: 5, background: C.subtle, border: 'none', color: C.muted, cursor: 'pointer', fontSize: 10 }}>Unblock</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* DoS protection */}
        <div style={{ background: C.panel2, borderRadius: 12, border: `1px solid ${C.border}`, padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13 }}>DoS Protection</div>
            <div style={{ fontSize: 11, color: C.muted }}>Rate-limit connections to prevent denial-of-service attacks</div>
          </div>
          <Toggle value={dosEnabled} onChange={setDosEnabled} color={C.accent} />
        </div>

        {/* Certificate */}
        <div style={{ background: C.panel2, borderRadius: 12, border: `1px solid ${C.border}`, padding: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12 }}>SSL Certificate</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 24 }}>🔒</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>Let's Encrypt — Auto-renewal</div>
              <div style={{ fontSize: 11, color: C.muted }}>mynasync.duckdns.org · Expires: 2025-02-14</div>
            </div>
            <span style={{ fontSize: 11, color: C.green, background: C.greenDim, padding: '3px 10px', borderRadius: 7, fontWeight: 600 }}>Valid</span>
          </div>
        </div>

        {/* Login history */}
        <div style={{ background: C.panel2, borderRadius: 12, border: `1px solid ${C.border}`, padding: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12 }}>Recent Login Activity</div>
          {[
            { user: 'admin', ip: '192.168.1.55', time: '2024-11-15 09:41', result: 'Success', method: '2FA' },
            { user: 'user', ip: '192.168.1.20', time: '2024-11-14 18:22', result: 'Success', method: 'Password' },
            { user: 'admin', ip: '45.33.92.108', time: '2024-11-14 03:12', result: 'Failed', method: 'Password' },
            { user: 'root', ip: '45.33.92.108', time: '2024-11-14 03:11', result: 'Failed', method: 'Password' },
          ].map((entry, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '8px 0', borderBottom: `1px solid ${C.border}22`, fontSize: 11,
            }}>
              <span style={{
                padding: '1px 7px', borderRadius: 4, fontWeight: 700, minWidth: 52, textAlign: 'center',
                background: entry.result === 'Success' ? C.greenDim : C.redDim,
                color: entry.result === 'Success' ? C.green : C.red,
              }}>{entry.result}</span>
              <span style={{ color: C.text, fontWeight: 600 }}>{entry.user}</span>
              <span style={{ color: C.muted, fontFamily: 'monospace' }}>{entry.ip}</span>
              <span style={{ color: C.muted, marginLeft: 'auto' }}>{entry.time}</span>
              <span style={{ color: C.muted, background: C.subtle, padding: '1px 6px', borderRadius: 4 }}>{entry.method}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Toggle({ value, onChange, color }: { value: boolean; onChange: (v: boolean) => void; color: string }) {
  return (
    <div
      onClick={() => onChange(!value)}
      style={{
        width: 44, height: 24, borderRadius: 12, cursor: 'pointer',
        background: value ? color : C.subtle,
        position: 'relative', transition: 'background 0.3s', flexShrink: 0,
        boxShadow: value ? `0 0 8px ${color}55` : 'none',
      }}
    >
      <div style={{
        position: 'absolute', left: value ? 22 : 2, top: 2,
        width: 20, height: 20, borderRadius: '50%', background: '#fff',
        transition: 'left 0.3s', boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
      }} />
    </div>
  );
}
