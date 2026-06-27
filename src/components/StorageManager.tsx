import { useState } from 'react';
import { C } from '../data/theme';
import { DETECTED_VOLUMES } from '../data/catalog';

type Tab = 'overview' | 'disks' | 'raid' | 'snapshots';

const DISK_DATA = [
  { id: 'sda', model: 'Samsung 980 Pro NVMe', serial: 'S5EVNX0T', size: '2.0 TB', type: 'NVMe SSD', temp: 38, health: 100, power: '8201 h', status: 'Healthy', vol: 'Volume 1' },
  { id: 'sdb', model: 'WD Red Plus 6TB', serial: 'WD-WCDH1T3B', size: '6.0 TB', type: 'HDD SATA', temp: 32, health: 97, power: '12450 h', status: 'Healthy', vol: 'Volume 2 (RAID)' },
  { id: 'sdc', model: 'WD Red Plus 6TB', serial: 'WD-WCDH1T3C', size: '6.0 TB', type: 'HDD SATA', temp: 33, health: 97, power: '12451 h', status: 'Healthy', vol: 'Volume 2 (RAID)' },
  { id: 'sdd', model: 'WD Red Plus 6TB', serial: 'WD-WCDH1T3D', size: '6.0 TB', type: 'HDD SATA', temp: 31, health: 97, power: '12449 h', status: 'Healthy', vol: 'Volume 2 (RAID)' },
  { id: 'sde', model: 'Seagate IronWolf 8TB', serial: 'ZAL8BJQF', size: '8.0 TB', type: 'HDD SATA', temp: 35, health: 78, power: '21330 h', status: 'Warning', vol: 'Volume 3' },
];

export default function StorageManager() {
  const [tab, setTab] = useState<Tab>('overview');
  const [selectedDisk, setSelectedDisk] = useState<string | null>(null);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: C.panel }}>
      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: `1px solid ${C.border}`, background: C.panel2, padding: '0 20px' }}>
        {([
          { id: 'overview', label: 'Overview' },
          { id: 'disks', label: 'Disk Health' },
          { id: 'raid', label: 'RAID Arrays' },
          { id: 'snapshots', label: 'Snapshots' },
        ] as const).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: '12px 18px', background: 'none', border: 'none',
            borderBottom: `2px solid ${tab === t.id ? C.accent : 'transparent'}`,
            color: tab === t.id ? C.accent : C.muted,
            cursor: 'pointer', fontWeight: tab === t.id ? 700 : 400, fontSize: 13,
          }}>{t.label}</button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 20, scrollbarWidth: 'thin', scrollbarColor: `${C.border} transparent` }}>

        {/* OVERVIEW */}
        {tab === 'overview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
              {DETECTED_VOLUMES.map(vol => {
                const pct = ((vol.totalGB - vol.freeGB) / vol.totalGB) * 100;
                const color = pct > 85 ? C.red : pct > 65 ? C.yellow : C.accent;
                return (
                  <div key={vol.id} style={{ background: C.panel2, borderRadius: 14, border: `1px solid ${C.border}`, padding: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                      <div style={{
                        width: 40, height: 40, borderRadius: 10, fontSize: 20,
                        background: vol.type === 'NVMe' ? `linear-gradient(135deg, ${C.blue}, ${C.accent})` : `linear-gradient(135deg, ${C.purple}, ${C.blue})`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>{vol.type === 'NVMe' ? '⚡' : '💽'}</div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 13 }}>{vol.name.split(' — ')[0]}</div>
                        <div style={{ fontSize: 11, color: C.muted }}>{vol.type}{vol.raid ? ` · ${vol.raid}` : ''}</div>
                      </div>
                    </div>

                    {/* Donut-style usage */}
                    <div style={{ position: 'relative', width: 90, height: 90, margin: '0 auto 16px' }}>
                      <svg width="90" height="90" viewBox="0 0 90 90">
                        <circle cx="45" cy="45" r="35" fill="none" stroke={C.subtle} strokeWidth="8" />
                        <circle cx="45" cy="45" r="35" fill="none" stroke={color}
                          strokeWidth="8" strokeLinecap="round"
                          strokeDasharray={`${2 * Math.PI * 35}`}
                          strokeDashoffset={`${2 * Math.PI * 35 * (1 - pct / 100)}`}
                          transform="rotate(-90 45 45)"
                          style={{ filter: `drop-shadow(0 0 6px ${color}88)` }}
                        />
                      </svg>
                      <div style={{
                        position: 'absolute', inset: 0,
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <div style={{ fontSize: 16, fontWeight: 800, color }}>{pct.toFixed(0)}%</div>
                        <div style={{ fontSize: 9, color: C.muted }}>used</div>
                      </div>
                    </div>

                    <div style={{ fontSize: 12, textAlign: 'center', marginBottom: 6 }}>
                      <span style={{ color: C.text, fontWeight: 600 }}>{vol.free}</span>
                      <span style={{ color: C.muted }}> free of {vol.total}</span>
                    </div>

                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center',
                      fontSize: 10, padding: '2px 10px', borderRadius: 12, margin: '0 auto',
                      background: vol.health === 'Good' ? C.greenDim : '#f59e0b15',
                      color: vol.health === 'Good' ? C.green : C.yellow,
                    }}>
                      <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor', display: 'inline-block' }} />
                      {vol.health}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* DISK HEALTH */}
        {tab === 'disks' && (
          <div style={{ display: 'flex', gap: 16 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {DISK_DATA.map(disk => (
                  <div
                    key={disk.id}
                    onClick={() => setSelectedDisk(disk.id === selectedDisk ? null : disk.id)}
                    style={{
                      background: selectedDisk === disk.id ? C.accentDim : C.panel2,
                      border: `1px solid ${selectedDisk === disk.id ? C.accent + '66' : C.border}`,
                      borderRadius: 12, padding: 16, cursor: 'pointer', transition: 'all 0.15s',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <div style={{
                        width: 44, height: 44, borderRadius: 10, fontSize: 22,
                        background: disk.type.includes('NVMe') ? `linear-gradient(135deg, ${C.blue}33, ${C.panel3})` : `linear-gradient(135deg, ${C.purple}33, ${C.panel3})`,
                        border: `1px solid ${C.border}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {disk.type.includes('NVMe') ? '⚡' : '💽'}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 2 }}>{disk.model}</div>
                        <div style={{ fontSize: 11, color: C.muted }}>{disk.type} · {disk.size} · {disk.vol}</div>
                      </div>
                      <div style={{ textAlign: 'right', display: 'flex', gap: 16, alignItems: 'center' }}>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: disk.temp > 50 ? C.red : disk.temp > 40 ? C.yellow : C.accent }}>{disk.temp}°C</div>
                          <div style={{ fontSize: 10, color: C.muted }}>Temp</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: disk.health > 90 ? C.green : disk.health > 70 ? C.yellow : C.red }}>{disk.health}%</div>
                          <div style={{ fontSize: 10, color: C.muted }}>Health</div>
                        </div>
                        <span style={{
                          fontSize: 11, padding: '3px 10px', borderRadius: 8, fontWeight: 600,
                          background: disk.status === 'Healthy' ? C.greenDim : '#f59e0b15',
                          color: disk.status === 'Healthy' ? C.green : C.yellow,
                        }}>{disk.status}</span>
                      </div>
                    </div>

                    {selectedDisk === disk.id && (
                      <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${C.border}` }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                          {[
                            { label: 'Serial', value: disk.serial },
                            { label: 'Power-On Hours', value: disk.power },
                            { label: 'Temperature', value: `${disk.temp}°C` },
                            { label: 'S.M.A.R.T.', value: disk.status },
                          ].map(item => (
                            <div key={item.label} style={{ background: C.panel3, borderRadius: 8, padding: '8px 10px' }}>
                              <div style={{ fontSize: 10, color: C.muted }}>{item.label}</div>
                              <div style={{ fontSize: 12, fontWeight: 600, fontFamily: 'monospace', marginTop: 2 }}>{item.value}</div>
                            </div>
                          ))}
                        </div>
                        <div style={{ marginTop: 10 }}>
                          <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>Health Score</div>
                          <div style={{ height: 6, background: C.subtle, borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{
                              width: `${disk.health}%`, height: '100%', borderRadius: 3,
                              background: disk.health > 90 ? C.green : disk.health > 70 ? C.yellow : C.red,
                            }} />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* RAID */}
        {tab === 'raid' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ background: C.panel2, borderRadius: 14, border: `1px solid ${C.border}`, padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>Volume 2 — RAID-5 Array</div>
                  <div style={{ fontSize: 12, color: C.muted }}>3 × 6TB WD Red Plus · Effective: 16.0 TB</div>
                </div>
                <span style={{ fontSize: 11, color: C.green, background: C.greenDim, padding: '4px 12px', borderRadius: 8, fontWeight: 700 }}>Healthy</span>
              </div>
              <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                {['sdb', 'sdc', 'sdd'].map((d, i) => (
                  <div key={d} style={{
                    flex: 1, background: C.panel3, borderRadius: 10,
                    border: `1px solid ${C.green}44`, padding: '12px',
                    textAlign: 'center',
                  }}>
                    <div style={{ fontSize: 28 }}>💽</div>
                    <div style={{ fontSize: 12, fontWeight: 600, marginTop: 6 }}>Disk {i + 1}</div>
                    <div style={{ fontSize: 10, color: C.muted }}>6.0 TB · Active</div>
                    <div style={{ fontSize: 10, color: C.green, marginTop: 2 }}>● Online</div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                {[
                  { label: 'RAID Level', value: 'RAID-5' },
                  { label: 'Total Capacity', value: '16.0 TB' },
                  { label: 'Fault Tolerance', value: '1 drive failure' },
                ].map(item => (
                  <div key={item.label} style={{ background: C.panel3, borderRadius: 8, padding: '10px 14px' }}>
                    <div style={{ fontSize: 10, color: C.muted }}>{item.label}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, marginTop: 3 }}>{item.value}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background: C.panel2, borderRadius: 14, border: `1px solid ${C.border}`, padding: 20 }}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12 }}>Volume 1 — Single NVMe</div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <div style={{ fontSize: 28 }}>⚡</div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>Samsung 980 Pro 2TB NVMe</div>
                  <div style={{ fontSize: 11, color: C.muted }}>Basic · No redundancy · 2.0 TB total</div>
                </div>
                <span style={{ marginLeft: 'auto', fontSize: 11, color: C.green, background: C.greenDim, padding: '3px 10px', borderRadius: 7, fontWeight: 600 }}>Healthy</span>
              </div>
            </div>
          </div>
        )}

        {/* SNAPSHOTS */}
        {tab === 'snapshots' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>Volume Snapshots</div>
              <button style={{
                padding: '7px 16px', borderRadius: 8, background: C.accent,
                color: '#000', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 12,
              }}>+ Create Snapshot</button>
            </div>
            {[
              { id: 'snap1', vol: 'Volume 1', date: '2024-11-15 03:00', size: '22.4 GB', type: 'Auto', desc: 'Scheduled daily snapshot' },
              { id: 'snap2', vol: 'Volume 1', date: '2024-11-14 03:00', size: '21.8 GB', type: 'Auto', desc: 'Scheduled daily snapshot' },
              { id: 'snap3', vol: 'Volume 2', date: '2024-11-15 04:00', size: '156.2 GB', type: 'Auto', desc: 'Scheduled daily snapshot' },
              { id: 'snap4', vol: 'Volume 1', date: '2024-11-10 15:32', size: '20.1 GB', type: 'Manual', desc: 'Before system update' },
            ].map(snap => (
              <div key={snap.id} style={{ background: C.panel2, borderRadius: 12, border: `1px solid ${C.border}`, padding: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ fontSize: 24 }}>📸</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{snap.vol} — {snap.date}</div>
                  <div style={{ fontSize: 11, color: C.muted }}>{snap.desc}</div>
                </div>
                <div style={{ textAlign: 'right', display: 'flex', gap: 12, alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>{snap.size}</div>
                    <div style={{ fontSize: 10, color: C.muted }}>{snap.type}</div>
                  </div>
                  <button style={{
                    padding: '5px 12px', borderRadius: 6, background: C.accentDim,
                    color: C.accent, border: `1px solid ${C.accent}44`, cursor: 'pointer', fontSize: 11, fontWeight: 600,
                  }}>Restore</button>
                  <button style={{
                    padding: '5px 10px', borderRadius: 6, background: C.redDim,
                    color: C.red, border: `1px solid ${C.red}44`, cursor: 'pointer', fontSize: 11,
                  }}>✕</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
