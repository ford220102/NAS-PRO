import { useState } from 'react';
import { C } from '../data/theme';

export default function BackupCenter() {
  const [activeJob, setActiveJob] = useState<string | null>(null);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: C.panel, overflowY: 'auto' }}>
      <div style={{ display: 'flex', gap: 12, padding: '12px 20px', borderBottom: `1px solid ${C.border}`, background: C.panel2, flexShrink: 0 }}>
        <button style={{ padding: '7px 16px', borderRadius: 8, background: C.accent, color: '#000', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 12 }}>+ New Job</button>
        <button style={{ padding: '7px 16px', borderRadius: 8, background: 'transparent', border: `1px solid ${C.border}`, color: C.textSub, cursor: 'pointer', fontSize: 12 }}>Restore...</button>
      </div>

      <div style={{ flex: 1, padding: 20, display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto', scrollbarWidth: 'thin', scrollbarColor: `${C.border} transparent` }}>

        {/* Backup jobs */}
        <div>
          <div style={{ fontSize: 12, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Backup Jobs</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { id: 'job1', name: 'Volume 2 → External USB', schedule: 'Daily 03:00', lastRun: '2024-11-15 03:00', status: 'success', size: '42.1 GB', type: 'Incremental' },
              { id: 'job2', name: 'Documents → Backblaze B2', schedule: 'Weekly Sun 02:00', lastRun: '2024-11-10 02:00', status: 'success', size: '8.3 GB', type: 'Full' },
              { id: 'job3', name: 'Photos → Google Drive', schedule: 'Daily 22:00', lastRun: 'Running...', status: 'running', size: '—', type: 'Incremental' },
              { id: 'job4', name: 'System Config → NAS Internal', schedule: 'Hourly', lastRun: '2024-11-15 10:00', status: 'success', size: '124 MB', type: 'Full' },
            ].map(job => (
              <div
                key={job.id}
                onClick={() => setActiveJob(activeJob === job.id ? null : job.id)}
                style={{
                  background: C.panel2, borderRadius: 12,
                  border: `1px solid ${activeJob === job.id ? C.accent + '66' : C.border}`,
                  padding: 16, cursor: 'pointer', transition: 'all 0.15s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 24 }}>
                    {job.status === 'running' ? '⟳' : job.status === 'success' ? '✅' : '❌'}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{job.name}</div>
                    <div style={{ fontSize: 11, color: C.muted }}>{job.schedule} · {job.type}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 11, color: C.text }}>{job.size}</div>
                    <div style={{ fontSize: 10, color: C.muted }}>{job.lastRun}</div>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); }}
                    style={{
                      padding: '5px 12px', borderRadius: 7,
                      background: job.status === 'running' ? '#f59e0b15' : C.accentDim,
                      color: job.status === 'running' ? C.yellow : C.accent,
                      border: `1px solid ${job.status === 'running' ? C.yellow + '44' : C.accent + '44'}`,
                      cursor: 'pointer', fontSize: 11, fontWeight: 600,
                    }}
                  >
                    {job.status === 'running' ? 'Cancel' : 'Run Now'}
                  </button>
                </div>
                {job.status === 'running' && (
                  <div style={{ marginTop: 12 }}>
                    <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>Syncing... 2,341 / 3,218 files</div>
                    <div style={{ height: 4, background: C.subtle, borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ width: '73%', height: '100%', background: C.accent, borderRadius: 2, animation: 'progress-anim 2s infinite' }} />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Sync tasks */}
        <div>
          <div style={{ fontSize: 12, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Sync Tasks</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { name: 'Rsync: Volume 1 → Volume 3', direction: '→', status: 'idle', lastSync: '2024-11-15 08:00' },
              { name: 'Two-way: Downloads ↔ PC', direction: '↔', status: 'idle', lastSync: '2024-11-15 09:30' },
            ].map(task => (
              <div key={task.name} style={{ background: C.panel2, borderRadius: 10, border: `1px solid ${C.border}`, padding: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 20 }}>🔄</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 12 }}>{task.name}</div>
                  <div style={{ fontSize: 11, color: C.muted }}>Last: {task.lastSync}</div>
                </div>
                <span style={{ fontSize: 11, color: C.muted, background: C.subtle, padding: '2px 8px', borderRadius: 5 }}>Idle</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      <style>{`
        @keyframes progress-anim {
          0% { width: 65%; } 50% { width: 78%; } 100% { width: 65%; }
        }
      `}</style>
    </div>
  );
}
