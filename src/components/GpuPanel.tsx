import { useState, useEffect } from 'react';
import { C } from '../data/theme';
import { GpuDevice, SensorData } from '../data/catalog';

interface GpuPanelProps {
  gpus: GpuDevice[];
  sensors: SensorData;
  compact?: boolean;
}

export default function GpuPanel({ gpus, compact = false }: GpuPanelProps) {
  const [liveGpu, setLiveGpu] = useState<GpuDevice[]>(gpus);
  const [tab, setTab] = useState<'overview' | 'lspci' | 'vaapi' | 'encoders' | 'opencl'>('overview');

  useEffect(() => {
    setLiveGpu(gpus.map(g => ({
      ...g,
      currentFreqMHz: g.currentFreqMHz,
      temperature: g.temperature,
      memUsedMB: g.memUsedMB,
      powerDraw: g.powerDraw,
    })));
  }, [gpus]);

  useEffect(() => {
    const id = setInterval(() => {
      setLiveGpu(prev => prev.map(g => ({
        ...g,
        currentFreqMHz: Math.max(100, Math.min(g.maxFreqMHz, (g.currentFreqMHz ?? 400) + (Math.random() * 60 - 30))),
        temperature: Math.max(35, Math.min(80, (g.temperature ?? 48) + (Math.random() * 3 - 1.5))),
        memUsedMB: Math.max(64, Math.min(g.sharedVramMB, (g.memUsedMB ?? 256) + (Math.random() * 32 - 16))),
        powerDraw: Math.max(2, Math.min(30, (g.powerDraw ?? 6) + (Math.random() * 2 - 1))),
      })));
    }, 2000);
    return () => clearInterval(id);
  }, []);

  if (gpus.length === 0) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: C.muted }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>⚠</div>
        <div>No GPU detected</div>
      </div>
    );
  }

  const gpu = liveGpu[0];
  const freqPct = ((gpu.currentFreqMHz ?? 0) / gpu.maxFreqMHz) * 100;
  const memPct = gpu.sharedVramMB > 0 ? ((gpu.memUsedMB ?? 0) / gpu.sharedVramMB) * 100 : 0;
  void freqPct; void memPct;
  const tempColor = (gpu.temperature ?? 0) > 70 ? C.red : (gpu.temperature ?? 0) > 58 ? C.yellow : C.accent;

  const TABS = [
    { id: 'overview', label: 'Overview' },
    { id: 'lspci',    label: 'lspci -v' },
    { id: 'vaapi',    label: 'VAAPI' },
    { id: 'encoders', label: 'Encoders' },
    { id: 'opencl',   label: 'OpenCL / Vulkan' },
  ] as const;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* GPU identity header */}
      <div style={{
        padding: compact ? '12px 16px' : '16px 20px',
        background: `linear-gradient(135deg, ${C.blue}18, ${C.panel2})`,
        borderBottom: `1px solid ${C.border}`,
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: compact ? 40 : 52, height: compact ? 40 : 52, borderRadius: 12, flexShrink: 0,
            background: `linear-gradient(135deg, #1a4a8a, #2563eb)`,
            border: `2px solid ${C.blue}55`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: compact ? 20 : 26,
            boxShadow: `0 0 20px ${C.blue}44`,
          }}>
            {gpu.vendorId === '8086' ? '🔵' : gpu.vendorId === '10de' ? '💚' : '🔴'}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: compact ? 12 : 14, color: C.text }}>{gpu.fullName}</div>
            <div style={{ fontSize: 10, color: C.muted, fontFamily: 'monospace', marginTop: 2 }}>
              PCI {gpu.slot} · {gpu.pciId} · Rev {gpu.revision} · IOMMU Group {gpu.iommuGroup}
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
              {gpu.quickSync && <Badge label="Intel QuickSync" color={C.blue} />}
              {gpu.vaapi && <Badge label="VAAPI" color={C.accent} />}
              <Badge label={`${gpu.euCount} EU`} color={C.purple} />
              <Badge label={`PCIe ${gpu.pciGen}.0 x${gpu.pciLanes}`} color={C.teal} />
              <Badge label={gpu.kernelModule} color={C.muted} />
            </div>
          </div>
          {/* Live temp + freq */}
          <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
            <LivePill label="Temp" value={`${(gpu.temperature ?? 0).toFixed(0)}°C`} color={tempColor} />
            <LivePill label="Freq" value={`${(gpu.currentFreqMHz ?? 0).toFixed(0)} MHz`} color={C.blue} />
            <LivePill label="TDP" value={`${(gpu.powerDraw ?? 0).toFixed(1)} W`} color={C.yellow} />
          </div>
        </div>
      </div>

      {/* Tabs */}
      {!compact && (
        <div style={{ display: 'flex', borderBottom: `1px solid ${C.border}`, background: C.panel2, flexShrink: 0 }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              padding: '9px 16px', background: 'none', border: 'none',
              borderBottom: `2px solid ${tab === t.id ? C.blue : 'transparent'}`,
              color: tab === t.id ? C.blue : C.muted,
              cursor: 'pointer', fontWeight: tab === t.id ? 700 : 400,
              fontSize: 11, transition: 'all 0.15s',
            }}>{t.label}</button>
          ))}
        </div>
      )}

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'thin', scrollbarColor: `${C.border} transparent` }}>

        {(tab === 'overview' || compact) && (
          <div style={{ padding: compact ? 12 : 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Live bars */}
            <Section title="Live Performance">
              <GpuBar label="GPU Frequency" value={gpu.currentFreqMHz ?? 0} max={gpu.maxFreqMHz} unit=" MHz" color={C.blue} />
              <div style={{ height: 10 }} />
              <GpuBar label={`Memory Used (shared, ${gpu.sharedVramMB} MB limit)`} value={gpu.memUsedMB ?? 0} max={gpu.sharedVramMB} unit=" MB" color={C.purple} />
            </Section>

            {/* ID table */}
            <Section title="Device Identification">
              <InfoTable rows={[
                ['Vendor',         `${gpu.vendor} [${gpu.vendorId}]`],
                ['Device',         `${gpu.fullName} [${gpu.deviceId}]`],
                ['Subsystem',      gpu.subsystemId],
                ['PCI Address',    gpu.slot],
                ['PCI ID',         gpu.pciId],
                ['Revision',       gpu.revision],
                ['PCIe',           `Gen ${gpu.pciGen}.0 x${gpu.pciLanes}`],
                ['IOMMU Group',    String(gpu.iommuGroup)],
              ]} />
            </Section>

            {/* Driver */}
            <Section title="Driver & Kernel">
              <InfoTable rows={[
                ['Kernel Module',  gpu.kernelModule],
                ['Driver',        gpu.driver],
                ['Driver Version', gpu.driverVersion],
                ['DRM Node',       gpu.drmNode],
                ['Render Node',    gpu.renderNode],
              ]} />
            </Section>

            {/* Compute */}
            <Section title="Graphics / Compute">
              <InfoTable rows={[
                ['Execution Units', `${gpu.euCount} EU`],
                ['Max Frequency',   `${gpu.maxFreqMHz} MHz`],
                ['Bus Width',       `${gpu.busWidth}-bit`],
                ['OpenCL',          gpu.openclVersion],
                ['Vulkan',          gpu.vulkanVersion],
                ['Shared VRAM',     `${gpu.sharedVramMB} MB (system RAM)`],
              ]} />
            </Section>
          </div>
        )}

        {!compact && tab === 'lspci' && (
          <div style={{ height: '100%', background: '#020508' }}>
            <LspciOutput gpu={gpu} />
          </div>
        )}

        {!compact && tab === 'vaapi' && (
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Section title="VA-API Status">
              <InfoTable rows={[
                ['Status',        gpu.vaapi ? 'Enabled ✓' : 'Not Available'],
                ['Device',        gpu.renderNode],
                ['Driver',        `${gpu.kernelModule} (libva-intel-driver)`],
                ['API Version',   '1.21.0'],
                ['VA Profile Count', '32'],
              ]} />
            </Section>
            <Section title="Supported Pixel Formats">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {gpu.vaapiFormats.map(f => (
                  <span key={f} style={{ fontFamily: 'monospace', fontSize: 11, padding: '3px 9px', borderRadius: 5, background: C.panel3, border: `1px solid ${C.border}`, color: C.accent }}>{f}</span>
                ))}
              </div>
            </Section>
            <Section title="vainfo Output (simulated)">
              <MonoBlock text={[
                `libva info: VA-API version 1.21.0`,
                `libva info: Trying to open ${gpu.renderNode}`,
                `libva info: Found init function __vaDriverInit_1_21`,
                `libva info: va_openDriver() returns 0`,
                `vainfo: VA-API version: 1.21 (libva 2.21.0)`,
                `vainfo: Driver version: Intel iHD driver for Intel(R) Gen Graphics - 24.1.5 (80e90b8)`,
                `vainfo: Supported profile and entry points`,
                ...gpu.decoders.map(d => `  VAProfile${d.replace(/[\s()]/g, '')} : VAEntrypointVLD`),
                ...gpu.encoders.map(e => `  VAProfile${e.replace(/[\s()]/g, '')} : VAEntrypointEncSlice`),
                `  VAProfileNone : VAEntrypointVideoProc`,
              ].join('\n')} />
            </Section>
          </div>
        )}

        {!compact && tab === 'encoders' && (
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Section title="Hardware Video Encoders">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {gpu.encoders.map(enc => (
                  <EncoderRow key={enc} codec={enc} type="encode" />
                ))}
              </div>
            </Section>
            <Section title="Hardware Video Decoders">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {gpu.decoders.map(dec => (
                  <EncoderRow key={dec} codec={dec} type="decode" />
                ))}
              </div>
            </Section>
            <Section title="Intel QuickSync Capabilities">
              <InfoTable rows={[
                ['QuickSync Video', gpu.quickSync ? 'Supported ✓' : 'Not Available'],
                ['Low Power Encode', 'Supported ✓'],
                ['Multi-session', 'Unlimited concurrent sessions'],
                ['Max Resolution', '8192 x 8192 px'],
                ['AV1 Encode', gpu.encoders.includes('AV1') ? 'Supported ✓' : 'Not Available'],
                ['10-bit HDR', 'Supported ✓'],
              ]} />
            </Section>
          </div>
        )}

        {!compact && tab === 'opencl' && (
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Section title="OpenCL Platform">
              <InfoTable rows={[
                ['Platform',       'Intel(R) OpenCL HD Graphics'],
                ['Version',        gpu.openclVersion],
                ['Device Type',    'GPU'],
                ['Max Compute Units', `${gpu.euCount}`],
                ['Max Work Group', '512'],
                ['Global Memory',  `${gpu.sharedVramMB} MB`],
                ['Extensions',     'cl_intel_unified_shared_memory, cl_khr_fp64, cl_khr_gl_sharing'],
              ]} />
            </Section>
            <Section title="Vulkan Instance">
              <InfoTable rows={[
                ['API Version',    gpu.vulkanVersion],
                ['Driver Version', gpu.driverVersion],
                ['Device Name',    gpu.fullName],
                ['Device Type',    'Integrated GPU'],
                ['Memory Heaps',   '2 (device + system)'],
                ['Queue Families', '3 (graphics, compute, transfer)'],
                ['Extensions',     'VK_KHR_swapchain, VK_KHR_video_decode_queue, VK_KHR_video_encode_queue'],
              ]} />
            </Section>
            <Section title="clinfo Output (simulated)">
              <MonoBlock text={[
                `Number of platforms: 1`,
                `Platform Name:       Intel(R) OpenCL HD Graphics`,
                `Platform Version:    ${gpu.openclVersion}`,
                `Platform Profile:    FULL_PROFILE`,
                ``,
                `  Device Name:       ${gpu.fullName}`,
                `  Device Vendor:     ${gpu.vendor}`,
                `  Device Version:    ${gpu.openclVersion}`,
                `  Driver Version:    ${gpu.driverVersion}`,
                `  Device Type:       GPU`,
                `  Max Compute Units: ${gpu.euCount}`,
                `  Global Mem Size:   ${gpu.sharedVramMB * 1024 * 1024} (${gpu.sharedVramMB} MB)`,
                `  Max Clock Freq:    ${gpu.maxFreqMHz} MHz`,
                `  Max Work Group:    512`,
                `  Preferred Work Grp: 64 (float), 64 (double)`,
              ].join('\n')} />
            </Section>
          </div>
        )}
      </div>
    </div>
  );
}

// ── lspci -v output ───────────────────────────────────────────
function LspciOutput({ gpu }: { gpu: GpuDevice }) {
  const lines = [
    `${gpu.slot} VGA compatible controller: ${gpu.fullName} (rev ${gpu.revision.replace('0x', '')})`,
    `\tSubsystem: ${gpu.vendor} ${gpu.subsystemId}`,
    `\tFlags: bus master, fast devsel, latency 0, IRQ 148, IOMMU group ${gpu.iommuGroup}`,
    `\tMemory at 4000000000 (64-bit, non-prefetchable) [size=16M]`,
    `\tMemory at 4010000000 (64-bit, prefetchable) [size=256M]`,
    `\tI/O ports at 5000 [size=64]`,
    `\tExpansion ROM at 000c0000 [virtual] [disabled] [size=128K]`,
    `\tCapabilities: <access denied>`,
    `\tKernel driver in use: ${gpu.kernelModule}`,
    `\tKernel modules: ${gpu.kernelModule}`,
    ``,
    `# lspci -k (kernel driver details):`,
    `${gpu.slot} VGA compatible controller: ${gpu.fullName}`,
    `\tKernel driver in use: ${gpu.kernelModule}`,
    `\tKernel modules: ${gpu.kernelModule}`,
    ``,
    `# lspci -vvv (verbose):`,
    `${gpu.slot} VGA compatible controller: ${gpu.fullName} (rev ${gpu.revision.replace('0x', '')}) (prog-if 00 [VGA controller])`,
    `\tControl: I/O+ Mem+ BusMaster+ SpecCycle- MemWINV- VGASnoop- ParErr- Stepping- SERR- FastB2B- DisINTx+`,
    `\tStatus: Cap+ 66MHz- UDF- FastB2B- ParErr- DEVSEL=fast >TAbort- <TAbort- <MAbort- >SERR- <PERR- INTx-`,
    `\tLatency: 0`,
    `\tInterrupt: pin A routed to IRQ 148`,
    `\tIOMU group: ${gpu.iommuGroup}`,
    `\tRegion 0: Memory at 4000000000 (64-bit, non-prefetchable) [size=16M]`,
    `\tRegion 2: Memory at 4010000000 (64-bit, prefetchable) [size=256M]`,
    `\tRegion 4: I/O ports at 5000 [size=64]`,
    `\tExpansion ROM at 000c0000 [virtual] [disabled] [size=128K]`,
    `\tCapabilities: [40] Vendor Specific Information: Len=0c <?>`,
    `\tCapabilities: [70] Express (v2) Root Complex Integrated Endpoint, MSI 00`,
    `\t\tDevCap:\tMaxPayload 128 bytes, PhantFunc 0`,
    `\t\t\tExtTag+ RBE+`,
    `\t\tDevCtl:\tCorrErr- NonFatalErr- FatalErr- UnsupReq-`,
    `\t\t\tRlxdOrd+ ExtTag+ PhantFunc- AuxPwr- NoSnoop+`,
    `\t\t\tMaxPayload 128 bytes, MaxReadReq 128 bytes`,
    `\t\tDevSta:\tCorrErr- NonFatalErr- FatalErr- UnsupReq- AuxPwr+ TransPend-`,
    `\t\tLnkCap:\tPort #0, Speed ${gpu.pciGen}.0GT/s, Width x${gpu.pciLanes}, ASPM L1, Exit Latency L1 <16us`,
    `\t\t\tClockPM+ Surprise- LLActRep- BwNot- ASPMOptComp+`,
    `\t\tLnkCtl:\tASPM L1 Enabled; RCB 64 bytes, Disabled- CommClk+`,
    `\t\t\tExtSynch- ClockPM+ AutWidDis- BWInt- AutBWInt-`,
    `\t\tLnkSta:\tSpeed ${gpu.pciGen}.0GT/s, Width x${gpu.pciLanes}`,
    `\t\t\tTrErr- Train- SlotClk+ DLActive- BWMgmt- ABWMgmt-`,
    `\tKernel driver in use: ${gpu.kernelModule}`,
    `\tKernel modules: ${gpu.kernelModule}`,
  ];

  return (
    <div style={{ padding: '12px 16px', fontFamily: '"JetBrains Mono", "Fira Code", monospace', fontSize: 11, lineHeight: '1.65', overflowY: 'auto', height: '100%', scrollbarWidth: 'thin', scrollbarColor: `${C.border} transparent` }}>
      {lines.map((line, i) => {
        const col =
          line.startsWith('#') ? C.muted :
          line.includes('Kernel driver') ? C.accent :
          line.includes('Memory') || line.includes('I/O') ? C.blue :
          line.includes('IOMMU') ? C.yellow :
          i === 0 ? C.text :
          '#6b7fa3';
        return (
          <div key={i} style={{ color: col, whiteSpace: 'pre' }}>{line || '\u00a0'}</div>
        );
      })}
    </div>
  );
}

// ── helpers ───────────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: C.panel2, borderRadius: 10, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
      <div style={{ padding: '8px 14px', borderBottom: `1px solid ${C.border}`, fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 1 }}>{title}</div>
      <div style={{ padding: 14 }}>{children}</div>
    </div>
  );
}

function InfoTable({ rows }: { rows: [string, string][] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {rows.map(([k, v], i) => (
        <div key={k} style={{
          display: 'flex', gap: 12, padding: '6px 0',
          borderBottom: i < rows.length - 1 ? `1px solid ${C.border}22` : 'none',
        }}>
          <span style={{ fontSize: 11, color: C.muted, minWidth: 160, flexShrink: 0 }}>{k}</span>
          <span style={{ fontSize: 11, color: C.text, fontFamily: 'monospace', wordBreak: 'break-all' }}>{v}</span>
        </div>
      ))}
    </div>
  );
}

function GpuBar({ label, value, max, unit, color }: { label: string; value: number; max: number; unit: string; color: string }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 5 }}>
        <span style={{ color: C.muted }}>{label}</span>
        <span style={{ color, fontWeight: 700 }}>{value.toFixed(0)}{unit} / {max}{unit}</span>
      </div>
      <div style={{ height: 7, background: C.subtle, borderRadius: 4, overflow: 'hidden' }}>
        <div style={{
          width: `${pct}%`, height: '100%', borderRadius: 4,
          background: `linear-gradient(90deg, ${color}, ${color}cc)`,
          transition: 'width 1.2s ease',
          boxShadow: `0 0 8px ${color}55`,
        }} />
      </div>
    </div>
  );
}

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 4, background: color + '18', border: `1px solid ${color}44`, color, fontWeight: 600 }}>{label}</span>
  );
}

function LivePill({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ background: C.panel3, border: `1px solid ${color}33`, borderRadius: 8, padding: '6px 12px', textAlign: 'center' }}>
      <div style={{ fontSize: 9, color: C.muted, marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 800, color, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
    </div>
  );
}

function MonoBlock({ text }: { text: string }) {
  return (
    <pre style={{
      background: '#020508', border: `1px solid ${C.border}`, borderRadius: 8,
      padding: '12px 14px', fontFamily: '"JetBrains Mono", monospace', fontSize: 11,
      color: '#94a3b8', whiteSpace: 'pre-wrap', margin: 0, lineHeight: '1.7',
    }}>{text}</pre>
  );
}

function EncoderRow({ codec, type }: { codec: string; type: 'encode' | 'decode' }) {
  const fpsMap: Record<string, string> = {
    'H.264 (AVC)': '4K@60fps', 'H.265 (HEVC)': '4K@60fps', 'AV1': '4K@60fps',
    'VP9': '4K@30fps', 'VP8': '1080p@60fps', 'MPEG-2': '1080p@30fps', 'JPEG': '4K@60fps',
  };
  const bitDepth: Record<string, string> = {
    'H.264 (AVC)': '8-bit', 'H.265 (HEVC)': '10-bit HDR', 'AV1': '10-bit HDR',
    'VP9': '10-bit', 'VP8': '8-bit', 'MPEG-2': '8-bit', 'JPEG': '8-bit',
  };
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      background: C.panel3, borderRadius: 8, padding: '10px 14px',
      border: `1px solid ${C.border}`,
    }}>
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: type === 'encode' ? C.orange : C.green, flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12, fontWeight: 700 }}>{codec}</div>
        <div style={{ fontSize: 10, color: C.muted }}>Intel QuickSync {type === 'encode' ? 'Encoder' : 'Decoder'} · {bitDepth[codec] ?? '8-bit'}</div>
      </div>
      <span style={{ fontSize: 10, color: type === 'encode' ? C.orange : C.green, background: (type === 'encode' ? C.orange : C.green) + '15', padding: '2px 8px', borderRadius: 5, fontWeight: 600 }}>
        {fpsMap[codec] ?? '1080p@30fps'}
      </span>
      <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 4, background: C.blue + '18', border: `1px solid ${C.blue}44`, color: C.blue, fontWeight: 600 }}>
        HW
      </span>
    </div>
  );
}

import React from 'react';
