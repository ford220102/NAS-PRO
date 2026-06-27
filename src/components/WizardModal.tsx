import { useState } from 'react';
import { C } from '../data/theme';
import { AppTemplate, InstalledApp, Volume, DETECTED_VOLUMES } from '../data/catalog';

interface WizardModalProps {
  app: AppTemplate;
  onClose: () => void;
  onConfirm: (app: InstalledApp) => void;
}

const STEPS = ['Volume', 'Hardware', 'Permissions', 'Review'];

export default function WizardModal({ app, onClose, onConfirm }: WizardModalProps) {
  const [step, setStep] = useState(0);
  const [selectedVol, setSelectedVol] = useState<Volume>(DETECTED_VOLUMES[0]);
  const [useGpu, setUseGpu] = useState(app.needsGpu ?? false);
  const [puid, setPuid] = useState('1000');
  const [pgid, setPgid] = useState('1000');
  const [appPort, setAppPort] = useState(app.port);
  const [tz, setTz] = useState('Europe/Warsaw');
  const [restart, setRestart] = useState<'unless-stopped' | 'always' | 'no'>('unless-stopped');
  const [memLimit, setMemLimit] = useState('512');

  const usedPct = ((selectedVol.totalGB - selectedVol.freeGB) / selectedVol.totalGB) * 100;
  void usedPct;

  const handleConfirm = () => {
    const now = new Date();
    onConfirm({
      ...app,
      selectedVolumeId: selectedVol.id,
      selectedVolumePath: selectedVol.path,
      gpuEnabled: useGpu,
      puid,
      pgid,
      selectedPort: appPort,
      installedAt: now.toISOString(),
      status: 'running',
      cpuUsage: 0,
      memUsageMB: 0,
      uptime: '0m',
    });
  };

  const canNext = () => {
    if (step === 3) return true;
    return true;
  };

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.75)',
      backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 9999,
    }}>
      <div style={{
        background: C.panel,
        border: `1px solid ${C.border}`,
        borderRadius: 20,
        width: 620,
        maxHeight: '90vh',
        display: 'flex', flexDirection: 'column',
        boxShadow: `0 32px 80px rgba(0,0,0,0.9), 0 0 0 1px ${C.border}`,
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '18px 24px',
          borderBottom: `1px solid ${C.border}`,
          background: C.panel2,
          display: 'flex', alignItems: 'center', gap: 14,
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: `linear-gradient(135deg, ${C.panel3}, ${C.panel})`,
            border: `1px solid ${C.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22,
          }}>
            {app.icon}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 15 }}>Install {app.name}</div>
            <div style={{ fontSize: 11, color: C.muted }}>
              {app.image} · v{app.version}
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', color: C.muted,
            cursor: 'pointer', fontSize: 18, padding: 4,
            borderRadius: 6, transition: 'color 0.2s',
          }}>✕</button>
        </div>

        {/* Step indicator */}
        <div style={{
          display: 'flex', alignItems: 'center',
          padding: '12px 24px',
          borderBottom: `1px solid ${C.border}`,
          gap: 0,
        }}>
          {STEPS.map((s, i) => (
            <div key={s} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? 1 : 0 }}>
              <div
                onClick={() => i < step && setStep(i)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  cursor: i < step ? 'pointer' : 'default',
                }}
              >
                <div style={{
                  width: 24, height: 24, borderRadius: '50%',
                  background: i < step ? C.accent : i === step ? C.accent : C.subtle,
                  color: i <= step ? '#000' : C.muted,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 700,
                  boxShadow: i === step ? `0 0 12px ${C.accent}66` : 'none',
                  transition: 'all 0.3s',
                }}>
                  {i < step ? '✓' : i + 1}
                </div>
                <span style={{ fontSize: 11, color: i === step ? C.text : C.muted, fontWeight: i === step ? 700 : 400 }}>{s}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div style={{ flex: 1, height: 1, background: i < step ? C.accent : C.subtle, margin: '0 8px', transition: 'background 0.3s' }} />
              )}
            </div>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24, scrollbarWidth: 'thin', scrollbarColor: `${C.border} transparent` }}>
          
          {/* STEP 0: Volume selection */}
          {step === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <SectionHeader color={C.accent} label="Select Installation Volume" sub="Choose where container data and configuration will be stored" />
              
              {DETECTED_VOLUMES.map(vol => {
                const pct = ((vol.totalGB - vol.freeGB) / vol.totalGB) * 100;
                const selected = vol.id === selectedVol.id;
                return (
                  <div
                    key={vol.id}
                    onClick={() => setSelectedVol(vol)}
                    style={{
                      padding: 16, borderRadius: 12,
                      border: `2px solid ${selected ? C.accent : C.border}`,
                      background: selected ? C.accentDim : C.panel2,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      boxShadow: selected ? `0 0 16px ${C.accentGlow}` : 'none',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: 8,
                        background: vol.type === 'NVMe' ? `linear-gradient(135deg, ${C.blue}, ${C.accent})` : `linear-gradient(135deg, ${C.purple}, ${C.blue})`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
                      }}>
                        {vol.type === 'NVMe' ? '⚡' : '💽'}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                          {vol.name}
                          {vol.raid && <span style={{ fontSize: 10, color: C.blue, background: C.blueDim, padding: '1px 6px', borderRadius: 4 }}>{vol.raid}</span>}
                          <span style={{
                            fontSize: 10, padding: '1px 6px', borderRadius: 4,
                            color: vol.health === 'Good' ? C.green : vol.health === 'Warning' ? C.yellow : C.red,
                            background: vol.health === 'Good' ? C.greenDim : vol.health === 'Warning' ? '#f59e0b12' : C.redDim,
                          }}>
                            {vol.health}
                          </span>
                        </div>
                        <div style={{ fontSize: 11, color: C.muted, fontFamily: 'monospace' }}>{vol.path}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 13, fontWeight: 700 }}>{vol.free}</div>
                        <div style={{ fontSize: 10, color: C.muted }}>free of {vol.total}</div>
                      </div>
                    </div>
                    <div style={{ height: 4, background: C.subtle, borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{
                        width: `${pct}%`, height: '100%',
                        background: pct > 85 ? C.red : pct > 65 ? C.yellow : C.accent,
                        borderRadius: 2, transition: 'width 0.5s',
                      }} />
                    </div>
                    <div style={{ fontSize: 10, color: C.muted, marginTop: 4 }}>
                      {pct.toFixed(1)}% used
                      {selected && (
                        <span style={{ color: C.accent, marginLeft: 8 }}>
                          → Data path: <span style={{ fontFamily: 'monospace' }}>{vol.path}/appdata/{app.id}/config</span>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* STEP 1: Hardware acceleration */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <SectionHeader color={C.blue} label="Hardware Acceleration" sub="Configure iGPU passthrough and resource limits" />

              <ToggleCard
                active={useGpu}
                onToggle={() => setUseGpu(v => !v)}
                color={C.blue}
                icon="🖥"
                title="Intel QuickSync / AMD iGPU Transcoding"
                sub="Pass /dev/dri device to container for hardware-accelerated video encoding/decoding. Reduces CPU load by 80%."
                badge={useGpu ? 'Enabled' : 'Disabled'}
                badgeColor={useGpu ? C.green : C.muted}
              >
                {useGpu && (
                  <div style={{ marginTop: 10, padding: 10, background: C.panel3, borderRadius: 8, fontSize: 11, color: C.muted }}>
                    <div style={{ marginBottom: 4 }}>Docker flag: <code style={{ color: C.accent }}>--device /dev/dri:/dev/dri</code></div>
                    <div>Intel UHD Graphics (QuickSync) — H.264, H.265/HEVC, AV1 support detected</div>
                  </div>
                )}
              </ToggleCard>

              <div style={{ background: C.panel2, borderRadius: 12, border: `1px solid ${C.border}`, padding: 16 }}>
                <div style={{ fontSize: 11, color: C.purple, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
                  Memory Limit
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <input
                    type="range" min="128" max="4096" step="128"
                    value={memLimit}
                    onChange={e => setMemLimit(e.target.value)}
                    style={{ flex: 1, accentColor: C.accent }}
                  />
                  <div style={{ minWidth: 70, textAlign: 'right', fontFamily: 'monospace', fontSize: 13, fontWeight: 700, color: C.text }}>
                    {memLimit} MB
                  </div>
                </div>
                <div style={{ fontSize: 10, color: C.muted, marginTop: 6 }}>
                  Container will be restricted to {memLimit} MB of RAM. Recommended: 512 MB+
                </div>
              </div>

              <div style={{ background: C.panel2, borderRadius: 12, border: `1px solid ${C.border}`, padding: 16 }}>
                <div style={{ fontSize: 11, color: C.yellow, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
                  Restart Policy
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {(['unless-stopped', 'always', 'no'] as const).map(policy => (
                    <button
                      key={policy}
                      onClick={() => setRestart(policy)}
                      style={{
                        flex: 1, padding: '8px 0', borderRadius: 8,
                        border: `1px solid ${restart === policy ? C.yellow : C.border}`,
                        background: restart === policy ? '#f59e0b15' : 'transparent',
                        color: restart === policy ? C.yellow : C.muted,
                        cursor: 'pointer', fontSize: 11, fontWeight: restart === policy ? 700 : 400,
                        transition: 'all 0.2s',
                      }}
                    >
                      {policy}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Permissions & Network */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <SectionHeader color={C.purple} label="Permissions & Network" sub="Configure user/group IDs, port mapping, and timezone" />

              <div style={{ background: C.panel2, borderRadius: 12, border: `1px solid ${C.border}`, padding: 16 }}>
                <div style={{ fontSize: 11, color: C.purple, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
                  Linux File Permissions
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <LabeledInput label="PUID (User ID)" value={puid} onChange={setPuid} placeholder="1000" help="Run container as this Linux user ID" />
                  <LabeledInput label="PGID (Group ID)" value={pgid} onChange={setPgid} placeholder="1000" help="Run container with this Linux group ID" />
                </div>
                <div style={{ marginTop: 10, padding: 10, background: C.panel3, borderRadius: 8, fontSize: 11, color: C.muted }}>
                  Value <code style={{ color: C.accent }}>1000</code> maps to the first non-root user — prevents SMB/permission errors on shared drives.
                </div>
              </div>

              <div style={{ background: C.panel2, borderRadius: 12, border: `1px solid ${C.border}`, padding: 16 }}>
                <div style={{ fontSize: 11, color: C.orange, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
                  Network Port Mapping
                </div>
                <LabeledInput label={`Host Port → Container Port ${app.port}`} value={appPort} onChange={setAppPort} placeholder={app.port} help={`Access via http://nas-ip:${appPort}`} />
                <div style={{ marginTop: 8, fontSize: 11, color: C.muted }}>
                  Web UI will be available at: <code style={{ color: C.accent }}>http://&lt;NAS-IP&gt;:{appPort}</code>
                </div>
              </div>

              <div style={{ background: C.panel2, borderRadius: 12, border: `1px solid ${C.border}`, padding: 16 }}>
                <LabeledInput label="Timezone (TZ)" value={tz} onChange={setTz} placeholder="Europe/Warsaw" help="Set correct timezone for scheduled tasks and logs" />
              </div>
            </div>
          )}

          {/* STEP 3: Review */}
          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <SectionHeader color={C.accent} label="Review Configuration" sub="Confirm settings before deploying the container" />

              <ReviewRow label="Image" value={app.image} mono />
              <ReviewRow label="Volume" value={`${selectedVol.path}/appdata/${app.id}`} mono />
              <ReviewRow label="Host Port" value={`0.0.0.0:${appPort} → ${app.port}/tcp`} mono />
              <ReviewRow label="iGPU" value={useGpu ? 'Enabled (/dev/dri passthrough)' : 'Disabled'} color={useGpu ? C.green : C.muted} />
              <ReviewRow label="Memory Limit" value={`${memLimit} MB`} />
              <ReviewRow label="Restart Policy" value={restart} />
              <ReviewRow label="PUID/PGID" value={`${puid}:${pgid}`} mono />
              <ReviewRow label="Timezone" value={tz} />

              <div style={{ marginTop: 8, padding: 14, background: C.panel3, borderRadius: 10, border: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 11, color: C.muted, marginBottom: 8, fontWeight: 700 }}>Generated docker-compose fragment:</div>
                <pre style={{ fontSize: 10, color: C.accent, margin: 0, overflowX: 'auto', lineHeight: '1.6' }}>{`version: "3.8"
services:
  ${app.id}:
    image: ${app.image}
    ports:
      - "${appPort}:${app.port}"
    volumes:
      - ${selectedVol.path}/appdata/${app.id}/config:/config
    environment:
      - PUID=${puid}
      - PGID=${pgid}
      - TZ=${tz}
    restart: ${restart}${useGpu ? `\n    devices:\n      - /dev/dri:/dev/dri` : ''}${memLimit !== '0' ? `\n    mem_limit: ${memLimit}m` : ''}`}</pre>
              </div>
            </div>
          )}
        </div>

        {/* Footer buttons */}
        <div style={{
          display: 'flex', gap: 10, padding: '16px 24px',
          borderTop: `1px solid ${C.border}`,
          background: C.panel2,
        }}>
          <button onClick={onClose} style={{
            padding: '10px 20px', borderRadius: 8,
            background: 'transparent', border: `1px solid ${C.border}`,
            color: C.muted, cursor: 'pointer', fontWeight: 600, fontSize: 13,
            transition: 'all 0.2s',
          }}>
            Cancel
          </button>
          {step > 0 && (
            <button onClick={() => setStep(s => s - 1)} style={{
              padding: '10px 20px', borderRadius: 8,
              background: C.subtle, border: 'none',
              color: C.text, cursor: 'pointer', fontWeight: 600, fontSize: 13,
              transition: 'all 0.2s',
            }}>
              ← Back
            </button>
          )}
          <div style={{ flex: 1 }} />
          {step < STEPS.length - 1 ? (
            <button onClick={() => setStep(s => s + 1)} disabled={!canNext()} style={{
              padding: '10px 24px', borderRadius: 8,
              background: C.accent, border: 'none',
              color: '#000', cursor: 'pointer', fontWeight: 700, fontSize: 13,
              boxShadow: `0 0 16px ${C.accentGlow}`,
              transition: 'all 0.2s',
            }}>
              Next →
            </button>
          ) : (
            <button onClick={handleConfirm} style={{
              padding: '10px 28px', borderRadius: 8,
              background: `linear-gradient(135deg, ${C.accent}, ${C.teal})`,
              border: 'none',
              color: '#000', cursor: 'pointer', fontWeight: 800, fontSize: 13,
              boxShadow: `0 0 20px ${C.accentGlow}`,
              letterSpacing: 0.5,
            }}>
              Deploy Container
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function SectionHeader({ color, label, sub }: { color: string; label: string; sub: string }) {
  return (
    <div style={{ marginBottom: 4 }}>
      <div style={{ fontSize: 14, fontWeight: 800, color, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 12, color: C.muted }}>{sub}</div>
    </div>
  );
}

function ToggleCard({ active, onToggle, color, icon, title, sub, badge, badgeColor, children }: {
  active: boolean; onToggle: () => void; color: string; icon: string;
  title: string; sub: string; badge: string; badgeColor: string;
  children?: React.ReactNode;
}) {
  return (
    <div style={{
      padding: 16, borderRadius: 12,
      border: `1px solid ${active ? color + '66' : C.border}`,
      background: active ? color + '0a' : C.panel2,
      transition: 'all 0.2s',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ fontSize: 22, marginTop: 2 }}>{icon}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
            {title}
            <span style={{ fontSize: 10, color: badgeColor, background: badgeColor + '22', padding: '1px 6px', borderRadius: 4 }}>{badge}</span>
          </div>
          <div style={{ fontSize: 11, color: C.muted, lineHeight: '1.5' }}>{sub}</div>
          {children}
        </div>
        <div
          onClick={onToggle}
          style={{
            width: 44, height: 24, borderRadius: 12,
            background: active ? color : C.subtle,
            position: 'relative', cursor: 'pointer',
            transition: 'background 0.3s',
            boxShadow: active ? `0 0 10px ${color}44` : 'none',
          }}
        >
          <div style={{
            position: 'absolute',
            left: active ? 22 : 2, top: 2,
            width: 20, height: 20, borderRadius: '50%',
            background: '#fff',
            transition: 'left 0.3s',
            boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
          }} />
        </div>
      </div>
    </div>
  );
}

function LabeledInput({ label, value, onChange, placeholder, help }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; help?: string;
}) {
  return (
    <div>
      <label style={{ fontSize: 11, color: C.muted, display: 'block', marginBottom: 5 }}>{label}</label>
      <input
        type="text" value={value} placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
        style={{
          width: '100%', padding: '8px 12px', borderRadius: 8,
          background: C.panel3, border: `1px solid ${C.border}`,
          color: C.text, fontSize: 13, fontFamily: 'monospace',
          outline: 'none', boxSizing: 'border-box',
        }}
      />
      {help && <div style={{ fontSize: 10, color: C.muted, marginTop: 4 }}>{help}</div>}
    </div>
  );
}

function ReviewRow({ label, value, mono, color }: { label: string; value: string; mono?: boolean; color?: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 12,
      padding: '10px 14px', borderRadius: 8,
      background: C.panel2, border: `1px solid ${C.border}`,
    }}>
      <div style={{ fontSize: 12, color: C.muted, minWidth: 120, flexShrink: 0 }}>{label}</div>
      <div style={{
        fontSize: 12, color: color ?? C.text,
        fontFamily: mono ? 'monospace' : 'inherit',
        wordBreak: 'break-all',
      }}>
        {value}
      </div>
    </div>
  );
}
