import { useState } from 'react';
import { C } from '../data/theme';

type Tab = 'interfaces' | 'smb' | 'protocols' | 'ddns';

export default function NetworkCenter() {
  const [tab, setTab] = useState<Tab>('interfaces');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: C.panel }}>
      <div style={{ display: 'flex', borderBottom: `1px solid ${C.border}`, background: C.panel2, padding: '0 20px' }}>
        {([
          { id: 'interfaces', label: 'Interfaces' },
          { id: 'smb', label: 'File Sharing (SMB/NFS)' },
          { id: 'protocols', label: 'Protocols' },
          { id: 'ddns', label: 'DDNS & Remote' },
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
        {tab === 'interfaces' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              { iface: 'eth0', ip: '192.168.1.100', mask: '255.255.255.0', gw: '192.168.1.1', dns: '1.1.1.1, 8.8.8.8', speed: '1 Gbps', mac: 'AA:BB:CC:DD:EE:01', dhcp: true, up: true },
              { iface: 'eth1', ip: '10.0.0.1', mask: '255.0.0.0', gw: '10.0.0.254', dns: '1.1.1.1', speed: '1 Gbps', mac: 'AA:BB:CC:DD:EE:02', dhcp: false, up: true },
            ].map(nic => (
              <div key={nic.iface} style={{ background: C.panel2, borderRadius: 14, border: `1px solid ${C.border}`, padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 10, fontSize: 22,
                    background: `linear-gradient(135deg, ${C.accent}22, ${C.panel3})`,
                    border: `1px solid ${C.accent}33`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>🌐</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{nic.iface}</div>
                    <div style={{ fontSize: 11, color: C.muted }}>{nic.speed} · MAC: {nic.mac}</div>
                  </div>
                  <span style={{
                    fontSize: 11, padding: '3px 10px', borderRadius: 8, fontWeight: 700,
                    background: nic.up ? C.greenDim : C.redDim,
                    color: nic.up ? C.green : C.red,
                  }}>{nic.up ? 'UP' : 'DOWN'}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                  {[
                    { label: 'IP Address', value: nic.ip },
                    { label: 'Subnet Mask', value: nic.mask },
                    { label: 'Gateway', value: nic.gw },
                    { label: 'DNS', value: nic.dns },
                    { label: 'DHCP', value: nic.dhcp ? 'Enabled' : 'Static' },
                    { label: 'Speed', value: nic.speed },
                  ].map(item => (
                    <div key={item.label} style={{ background: C.panel3, borderRadius: 8, padding: '8px 12px' }}>
                      <div style={{ fontSize: 10, color: C.muted }}>{item.label}</div>
                      <div style={{ fontSize: 12, fontWeight: 600, fontFamily: 'monospace', marginTop: 2 }}>{item.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'smb' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>Shared Folders</div>
              <button style={{ padding: '7px 14px', borderRadius: 8, background: C.accent, color: '#000', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 12 }}>+ Add Share</button>
            </div>
            {[
              { name: 'Media', path: '/media', protocol: 'SMB + NFS', access: 'admin, user', guests: false },
              { name: 'Downloads', path: '/downloads', protocol: 'SMB', access: 'admin', guests: false },
              { name: 'Public', path: '/home/public', protocol: 'SMB', access: 'everyone', guests: true },
            ].map(share => (
              <div key={share.name} style={{ background: C.panel2, borderRadius: 12, border: `1px solid ${C.border}`, padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 24 }}>📁</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                      {share.name}
                      <span style={{ fontSize: 10, color: C.blue, background: C.blueDim, padding: '1px 6px', borderRadius: 4 }}>{share.protocol}</span>
                      {share.guests && <span style={{ fontSize: 10, color: C.yellow, background: '#f59e0b15', padding: '1px 6px', borderRadius: 4 }}>Guest</span>}
                    </div>
                    <div style={{ fontSize: 11, color: C.muted, fontFamily: 'monospace' }}>{share.path} · Access: {share.access}</div>
                  </div>
                  <button style={{ padding: '5px 12px', borderRadius: 6, background: 'transparent', border: `1px solid ${C.border}`, color: C.textSub, cursor: 'pointer', fontSize: 11 }}>Edit</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'protocols' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { name: 'SMB / CIFS', desc: 'Windows file sharing (Samba)', enabled: true, port: '445' },
              { name: 'NFS', desc: 'Network File System for Linux/macOS', enabled: true, port: '2049' },
              { name: 'FTP', desc: 'File Transfer Protocol', enabled: false, port: '21' },
              { name: 'SFTP', desc: 'Secure FTP over SSH', enabled: true, port: '22' },
              { name: 'WebDAV', desc: 'Web-based Distributed Authoring', enabled: false, port: '5005' },
              { name: 'Rsync', desc: 'File synchronization daemon', enabled: true, port: '873' },
              { name: 'iSCSI', desc: 'Block-level network storage', enabled: false, port: '3260' },
            ].map(proto => (
              <div key={proto.name} style={{
                background: C.panel2, borderRadius: 10, border: `1px solid ${C.border}`, padding: 14,
                display: 'flex', alignItems: 'center', gap: 14,
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                    {proto.name}
                    <span style={{ fontSize: 10, fontFamily: 'monospace', color: C.muted }}>:{proto.port}</span>
                  </div>
                  <div style={{ fontSize: 11, color: C.muted }}>{proto.desc}</div>
                </div>
                <div style={{
                  width: 44, height: 24, borderRadius: 12, cursor: 'pointer',
                  background: proto.enabled ? C.accent : C.subtle,
                  position: 'relative', transition: 'background 0.3s',
                }}>
                  <div style={{
                    position: 'absolute', left: proto.enabled ? 22 : 2, top: 2,
                    width: 20, height: 20, borderRadius: '50%', background: '#fff',
                    transition: 'left 0.3s',
                  }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'ddns' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ background: C.panel2, borderRadius: 12, border: `1px solid ${C.border}`, padding: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16 }}>DDNS Configuration</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  { label: 'Provider', value: 'Cloudflare DNS' },
                  { label: 'Domain', value: 'mynasync.duckdns.org' },
                  { label: 'Current IP', value: '82.129.44.101' },
                  { label: 'Last Updated', value: '2024-11-15 09:45' },
                  { label: 'Status', value: 'Active' },
                ].map(row => (
                  <div key={row.label} style={{ display: 'flex', gap: 12, padding: '8px 0', borderBottom: `1px solid ${C.border}22` }}>
                    <div style={{ fontSize: 12, color: C.muted, minWidth: 120 }}>{row.label}</div>
                    <div style={{ fontSize: 12, fontFamily: 'monospace', color: row.label === 'Status' ? C.green : C.text }}>{row.value}</div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ background: C.panel2, borderRadius: 12, border: `1px solid ${C.border}`, padding: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Quick Connect</div>
              <div style={{ fontSize: 12, color: C.muted, marginBottom: 12 }}>Access your NAS remotely without VPN:</div>
              <div style={{ background: C.panel3, borderRadius: 8, padding: '10px 14px', fontFamily: 'monospace', fontSize: 12, color: C.accent }}>
                https://mynasync.duckdns.org:5001
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
