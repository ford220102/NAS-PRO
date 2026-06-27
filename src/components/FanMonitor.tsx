import { C } from '../data/theme';
import { SensorData } from '../data/catalog';

interface FanMonitorProps {
  sensors: SensorData;
}

function FanGauge({ rpm, label, maxRpm = 3200 }: { rpm: number; label: string; maxRpm?: number }) {
  const pct = Math.min(1, rpm / maxRpm);
  const angle = pct * 270 - 135;
  const color = rpm === 0 ? C.muted : pct > 0.8 ? C.red : pct > 0.6 ? C.yellow : C.accent;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <div style={{ position: 'relative', width: 80, height: 56 }}>
        {/* Arc background */}
        <svg width="80" height="56" viewBox="0 0 80 56" fill="none">
          <path d="M 8 50 A 32 32 0 0 1 72 50" stroke={C.subtle} strokeWidth="5" strokeLinecap="round" fill="none" />
          {rpm > 0 && (
            <path
              d={`M 8 50 A 32 32 0 ${pct > 0.5 ? '1' : '0'} 1 ${40 + 32 * Math.cos((angle * Math.PI) / 180)} ${50 - 32 * Math.sin(((angle + 180) * Math.PI) / 180)}`}
              stroke={color}
              strokeWidth="5"
              strokeLinecap="round"
              fill="none"
              style={{ filter: `drop-shadow(0 0 4px ${color})` }}
            />
          )}
        </svg>
        {/* RPM indicator dot */}
        {rpm > 0 && (
          <div style={{
            position: 'absolute',
            left: 40 + 28 * Math.cos(((angle - 90) * Math.PI) / 180) - 4,
            top: 56 - 28 * Math.sin(((angle - 90 + 180) * Math.PI) / 180) - 4 - 16,
            width: 8, height: 8, borderRadius: '50%',
            background: color,
            boxShadow: `0 0 6px ${color}`,
          }} />
        )}
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: rpm === 0 ? C.muted : color }}>
          {rpm === 0 ? '—' : `${rpm} RPM`}
        </div>
        <div style={{ fontSize: 10, color: C.muted }}>{label}</div>
        {rpm === 0 && <div style={{ fontSize: 9, color: C.muted }}>Not detected</div>}
      </div>
    </div>
  );
}

export default function FanMonitor({ sensors }: FanMonitorProps) {
  const fanLabels = ['CPU Fan', 'System Fan', 'HDD Fan 1', 'HDD Fan 2'];

  return (
    <div style={{
      background: C.panel2, borderRadius: 12,
      border: `1px solid ${C.border}`, padding: 16,
    }}>
      <div style={{ fontSize: 11, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ color: C.accent }}>◉</span> Fan Control
        <span style={{ marginLeft: 'auto', fontSize: 10, color: C.green, background: C.greenDim, padding: '2px 8px', borderRadius: 6 }}>Auto</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12 }}>
        {sensors.fanSpeeds.map((rpm, i) => (
          <FanGauge key={i} rpm={rpm} label={fanLabels[i]} maxRpm={i === 0 ? 2400 : 3200} />
        ))}
      </div>
    </div>
  );
}
