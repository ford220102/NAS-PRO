import { useState, useEffect, useRef } from 'react';
import { C, sleep } from '../data/theme';
import { useHardwareDetection } from '../data/hooks';
import { HardwareInfo } from '../data/catalog';

interface BootScreenProps {
  onComplete: (hw: HardwareInfo) => void;
}

export default function BootScreen({ onComplete }: BootScreenProps) {
  const [logs, setLogs] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState('');
  const hw = useHardwareDetection();
  const logRef = useRef<HTMLDivElement>(null);
  const ran = useRef(false);

  useEffect(() => {
    if (!hw || ran.current) return;
    ran.current = true;

    const run = async () => {
      const add = (msg: string) => setLogs(prev => [...prev, msg]);

      add('[ OK ] Starting UGOS Pro NASware kernel v3.2.1...');
      setPhase('Kernel Init'); setProgress(5);
      await sleep(300);

      add(`[ OK ] Detected host environment: ${hw.osDetail} ${hw.isVM ? '[VIRTUAL MACHINE]' : '[BARE-METAL]'}`);
      setProgress(12);
      await sleep(250);

      if (hw.isVM) {
        add('[ INFO ] Hypervisor mode detected — adjusting I/O scheduler for VM passthrough');
        await sleep(200);
      }

      add(`[ OK ] CPU: ${hw.cpuModel} (${hw.cores} logical cores)`);
      setPhase('Hardware Detection'); setProgress(20);
      await sleep(200);

      add(`[ OK ] RAM: ${hw.ramGB} GB DDR4 detected`);
      setProgress(28);
      await sleep(150);

      add(`[ OK ] iGPU: ${hw.gpuModel} — hardware transcoding available`);
      setProgress(36);
      await sleep(200);

      add('[ OK ] Scanning NVMe/SATA controllers... Found: 3 storage devices');
      setPhase('Storage Init'); setProgress(44);
      await sleep(250);

      add('[ OK ] Volume 1: NVMe SSD — 2.0 TB (healthy)');
      setProgress(50);
      await sleep(150);

      add('[ OK ] Volume 2: RAID-5 array — 16.0 TB (healthy)');
      setProgress(56);
      await sleep(150);

      add('[ WARNING ] Volume 3: HDD Backup — 8.0 TB (S.M.A.R.T. advisory)');
      setProgress(62);
      await sleep(200);

      add('[ OK ] Fan controllers: 2 fans detected (System fan, CPU fan)');
      setPhase('Sensor Init'); setProgress(68);
      await sleep(200);

      add('[ OK ] Thermal sensors: CPU 42°C, Ambient 28°C');
      setProgress(73);
      await sleep(150);

      add(`[ OK ] Docker Engine v${hw.dockerVersion} — daemon connected`);
      setPhase('Docker'); setProgress(80);
      await sleep(250);

      add('[ OK ] Network interfaces: eth0 (1Gbps), eth1 (1Gbps), docker0');
      setProgress(88);
      await sleep(200);

      add('[ OK ] Loading UGOS Pro UI framework...');
      setPhase('Starting UI'); setProgress(95);
      await sleep(300);

      add('[ OK ] System ready.');
      setProgress(100);
      await sleep(500);

      onComplete(hw);
    };

    run();
  }, [hw, onComplete]);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logs]);

  return (
    <div style={{
      minHeight: '100vh',
      background: C.bg,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: '"JetBrains Mono", "Cascadia Code", "Fira Code", monospace',
      color: C.text,
      overflow: 'hidden',
      position: 'relative',
    }}>
      {/* Background grid */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `linear-gradient(${C.border}22 1px, transparent 1px), linear-gradient(90deg, ${C.border}22 1px, transparent 1px)`,
        backgroundSize: '40px 40px',
        opacity: 0.4,
      }} />

      <div style={{ width: 560, position: 'relative', zIndex: 1 }}>
        {/* Logo */}
        <div style={{ marginBottom: 32, textAlign: 'center' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 12,
            padding: '10px 24px', borderRadius: 12,
            border: `1px solid ${C.accent}44`,
            background: `linear-gradient(135deg, ${C.panel2}, ${C.panel})`,
            boxShadow: `0 0 40px ${C.accent}22`,
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: 8,
              background: `linear-gradient(135deg, ${C.accent}, ${C.teal})`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 20, fontWeight: 900,
            }}>
              <span style={{ color: '#000', fontFamily: 'sans-serif', fontWeight: 900, fontSize: 13 }}>UG</span>
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, color: C.text, letterSpacing: 2, fontFamily: 'system-ui' }}>
                UGOS <span style={{ color: C.accent }}>Pro</span>
              </div>
              <div style={{ fontSize: 10, color: C.muted, letterSpacing: 3, textTransform: 'uppercase' }}>NASware v3.2</div>
            </div>
          </div>
        </div>

        {/* Phase indicator */}
        <div style={{ fontSize: 11, color: C.accent, marginBottom: 8, letterSpacing: 1, textTransform: 'uppercase' }}>
          {phase || 'Initializing...'}
        </div>

        {/* Progress bar */}
        <div style={{ height: 3, background: C.subtle, borderRadius: 2, overflow: 'hidden', marginBottom: 16 }}>
          <div style={{
            width: `${progress}%`, height: '100%',
            background: `linear-gradient(90deg, ${C.accent}, ${C.teal})`,
            transition: 'width 0.4s ease',
            boxShadow: `0 0 8px ${C.accent}`,
          }} />
        </div>

        {/* Log console */}
        <div ref={logRef} style={{
          background: C.panel3,
          padding: 16, borderRadius: 10,
          border: `1px solid ${C.border}`,
          height: 220,
          overflowY: 'auto',
          fontSize: 11,
          lineHeight: '1.8',
          scrollbarWidth: 'thin',
          scrollbarColor: `${C.border} transparent`,
        }}>
          {logs.map((l, i) => (
            <div key={i} style={{
              color: l.includes('WARNING') ? C.yellow : l.includes('ERROR') ? C.red : l.includes('OK') ? C.green : C.textSub,
            }}>
              {l}
            </div>
          ))}
          {progress < 100 && (
            <div style={{ color: C.accent }}>
              <BlinkCursor />
            </div>
          )}
        </div>

        <div style={{ marginTop: 16, fontSize: 10, color: C.muted, textAlign: 'center', letterSpacing: 1 }}>
          UGREEN Technology — Enterprise NAS Platform
        </div>
      </div>
    </div>
  );
}

function BlinkCursor() {
  const [vis, setVis] = useState(true);
  useEffect(() => {
    const id = setInterval(() => setVis(v => !v), 500);
    return () => clearInterval(id);
  }, []);
  return <span style={{ opacity: vis ? 1 : 0 }}>_</span>;
}
