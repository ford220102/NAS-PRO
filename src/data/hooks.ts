import { useState, useEffect, useRef, useCallback } from 'react';
import { GpuDevice, SensorData, HardwareInfo } from '../data/catalog';

const rb = (a: number, b: number) => Math.random() * (b - a) + a;
const rbi = (a: number, b: number) => Math.floor(rb(a, b));

const GPU_DB: Record<string, GpuDevice> = {
  'intel-n100': {
    slot: '00:02.0', vendor: 'Intel Corporation', vendorId: '8086', deviceId: '46d4',
    pciId: '8086:46d4', subsystemId: '8086:2212', revision: '0x0c',
    model: 'Intel UHD Graphics (Alder Lake-N)', fullName: 'Intel Corporation Alder Lake-N [UHD Graphics]',
    driver: 'i915', driverVersion: '6.9.12-ugos-pro', kernelModule: 'i915',
    vramMB: 0, sharedVramMB: 2048, busWidth: 64, pciGen: 3, pciLanes: 16, euCount: 32,
    encoders: ['H.264 (AVC)', 'H.265 (HEVC)', 'AV1', 'JPEG', 'VP9'],
    decoders: ['H.264 (AVC)', 'H.265 (HEVC)', 'AV1', 'VP8', 'VP9', 'MPEG-2', 'JPEG'],
    quickSync: true, vaapi: true,
    currentFreqMHz: 400, maxFreqMHz: 750,
    powerDraw: 6, temperature: 48, memUsedMB: 256,
    openclVersion: 'OpenCL 3.0', vulkanVersion: '1.3.277',
    vaapiFormats: ['NV12', 'P010', 'YUY2', 'AYUV', 'Y410', 'Y416'],
    drmNode: '/dev/dri/card0', renderNode: '/dev/dri/renderD128',
    iommuGroup: 0,
  },
  'intel-i7': {
    slot: '00:02.0', vendor: 'Intel Corporation', vendorId: '8086', deviceId: '9bc8',
    pciId: '8086:9bc8', subsystemId: '1462:7c91', revision: '0x03',
    model: 'Intel UHD Graphics 630', fullName: 'Intel Corporation CometLake-S GT2 [UHD Graphics 630]',
    driver: 'i915', driverVersion: '6.9.12-ugos-pro', kernelModule: 'i915',
    vramMB: 0, sharedVramMB: 1024, busWidth: 64, pciGen: 3, pciLanes: 16, euCount: 24,
    encoders: ['H.264 (AVC)', 'H.265 (HEVC)', 'JPEG'],
    decoders: ['H.264 (AVC)', 'H.265 (HEVC)', 'VP8', 'VP9', 'MPEG-2', 'JPEG'],
    quickSync: true, vaapi: true,
    currentFreqMHz: 350, maxFreqMHz: 1200,
    powerDraw: 15, temperature: 52, memUsedMB: 128,
    openclVersion: 'OpenCL 3.0', vulkanVersion: '1.3.277',
    vaapiFormats: ['NV12', 'P010', 'YUY2'],
    drmNode: '/dev/dri/card0', renderNode: '/dev/dri/renderD128',
    iommuGroup: 0,
  },
  'intel-i9': {
    slot: '00:02.0', vendor: 'Intel Corporation', vendorId: '8086', deviceId: 'a780',
    pciId: '8086:a780', subsystemId: '1458:d000', revision: '0x04',
    model: 'Intel UHD Graphics 770', fullName: 'Intel Corporation Raptor Lake-S GT1 [UHD Graphics 770]',
    driver: 'i915', driverVersion: '6.9.12-ugos-pro', kernelModule: 'i915',
    vramMB: 0, sharedVramMB: 4096, busWidth: 64, pciGen: 4, pciLanes: 16, euCount: 32,
    encoders: ['H.264 (AVC)', 'H.265 (HEVC)', 'AV1', 'JPEG', 'VP9'],
    decoders: ['H.264 (AVC)', 'H.265 (HEVC)', 'AV1', 'VP8', 'VP9', 'MPEG-2', 'JPEG'],
    quickSync: true, vaapi: true,
    currentFreqMHz: 450, maxFreqMHz: 1550,
    powerDraw: 22, temperature: 58, memUsedMB: 512,
    openclVersion: 'OpenCL 3.0', vulkanVersion: '1.3.277',
    vaapiFormats: ['NV12', 'P010', 'YUY2', 'AYUV', 'Y410', 'Y416', 'ARGB'],
    drmNode: '/dev/dri/card0', renderNode: '/dev/dri/renderD128',
    iommuGroup: 0,
  },
};

function pickGpu(cores: number): GpuDevice {
  if (cores >= 16) return GPU_DB['intel-i9'];
  if (cores >= 8) return GPU_DB['intel-i7'];
  return GPU_DB['intel-n100'];
}

export function useHardwareDetection(): HardwareInfo | null {
  const [hw, setHw] = useState<HardwareInfo | null>(null);

  useEffect(() => {
    const ua = navigator.userAgent;
    const isVM = /VirtualBox|VMware|KVM|Hyper-V|QEMU|Xen/i.test(ua) || (navigator.hardwareConcurrency || 4) <= 2;
    const isDocker = /Docker|container/i.test(ua);

    let platform: HardwareInfo['platform'] = 'linux';
    let os = 'Linux';
    let osDetail = 'Ubuntu 24.04 LTS';

    if (/Win/i.test(ua)) {
      platform = 'windows'; os = 'Windows';
      osDetail = /Windows NT 10/.test(ua) ? 'Windows 10/11' : 'Windows Server';
    } else if (/Mac/i.test(ua)) {
      platform = 'macos'; os = 'macOS'; osDetail = 'macOS Sonoma';
    }

    const cores = navigator.hardwareConcurrency || 4;
    let cpuModel = 'Intel N100 (4-core)';
    if (cores >= 16) cpuModel = 'Intel Core i9-13900 / Ryzen 9 7950X';
    else if (cores >= 8) cpuModel = 'Intel Core i7-10700 / Ryzen 7 5700G';
    else if (cores >= 4) cpuModel = 'Intel N100 / Celeron J4125';
    else cpuModel = 'Intel Celeron J3455';

    const ramGB = Math.max(4, Math.pow(2, Math.ceil(Math.log2(Math.max(4, cores * 2)))));
    const gpu = pickGpu(cores);

    setHw({
      os, osDetail, isVM, isDocker, platform, cores, cpuModel, ramGB,
      hasIGPU: true,
      gpuModel: gpu.model,
      gpus: [gpu],
      networkInterfaces: ['eth0', 'eth1', 'docker0'],
      dockerVersion: '26.1.4',
    });
  }, []);

  return hw;
}

export function useSensors(): SensorData {
  const [data, setData] = useState<SensorData>({
    cpuTemp: 42, cpuUsage: 12, ramUsed: 3.2, ramTotal: 8,
    fanSpeeds: [850, 1200, 0, 0], networkRx: 1.2, networkTx: 0.4,
    uptime: '5d 14h 22m',
  });

  const uptimeRef = useRef({ days: 5, hours: 14, minutes: 22 });

  const tick = useCallback(() => {
    uptimeRef.current.minutes++;
    if (uptimeRef.current.minutes >= 60) { uptimeRef.current.minutes = 0; uptimeRef.current.hours++; }
    if (uptimeRef.current.hours >= 24) { uptimeRef.current.hours = 0; uptimeRef.current.days++; }
    const { days, hours, minutes } = uptimeRef.current;

    setData(prev => ({
      cpuTemp: Math.max(38, Math.min(72, prev.cpuTemp + rb(-1.5, 1.5))),
      cpuUsage: Math.max(4, Math.min(88, prev.cpuUsage + rb(-8, 8))),
      ramUsed: Math.max(2.1, Math.min(prev.ramTotal * 0.85, prev.ramUsed + rb(-0.2, 0.2))),
      ramTotal: prev.ramTotal,
      fanSpeeds: [
        Math.max(600, Math.min(2400, prev.fanSpeeds[0] + rbi(-80, 80))),
        Math.max(800, Math.min(3200, prev.fanSpeeds[1] + rbi(-100, 100))),
        0, 0,
      ],
      networkRx: Math.max(0.1, Math.min(950, prev.networkRx + rb(-30, 30))),
      networkTx: Math.max(0.05, Math.min(450, prev.networkTx + rb(-15, 15))),
      uptime: `${days}d ${hours}h ${minutes}m`,
    }));
  }, []);

  useEffect(() => {
    const id = setInterval(tick, 2000);
    return () => clearInterval(id);
  }, [tick]);

  return data;
}

export interface ScreenInfo {
  width: number;
  height: number;
  dpr: number;
  physicalWidth: number;
  physicalHeight: number;
  label: string;       // e.g. "4K UHD", "1080p FHD", "1440p QHD"
  dpiEstimate: number; // estimated PPI (rough)
  colorDepth: number;
  orientation: string;
}

function getScreenLabel(w: number, h: number, dpr: number): string {
  const pw = w * dpr;
  const ph = h * dpr;
  if (pw >= 7680 || ph >= 4320) return '8K UHD (7680×4320)';
  if (pw >= 3840 || ph >= 2160) return '4K UHD (3840×2160)';
  if (pw >= 2560 || ph >= 1440) return '1440p QHD (2560×1440)';
  if (pw >= 1920 || ph >= 1080) return '1080p FHD (1920×1080)';
  if (pw >= 1280 || ph >= 720)  return '720p HD (1280×720)';
  return `${pw}×${ph}`;
}

export function useScreenInfo(): ScreenInfo {
  const getInfo = (): ScreenInfo => {
    const w = screen.width;
    const h = screen.height;
    const dpr = window.devicePixelRatio || 1;
    const pw = Math.round(w * dpr);
    const ph = Math.round(h * dpr);
    // rough PPI estimate assuming ~24" diagonal
    const diagPx = Math.sqrt(pw * pw + ph * ph);
    const dpiEstimate = Math.round(diagPx / 24);
    return {
      width: w, height: h, dpr,
      physicalWidth: pw, physicalHeight: ph,
      label: getScreenLabel(w, h, dpr),
      dpiEstimate,
      colorDepth: screen.colorDepth || 24,
      orientation: screen.orientation?.type ?? (w > h ? 'landscape' : 'portrait'),
    };
  };

  const [info, setInfo] = useState<ScreenInfo>(getInfo);

  useEffect(() => {
    const handler = () => setInfo(getInfo());
    window.addEventListener('resize', handler);
    screen.orientation?.addEventListener('change', handler);
    return () => {
      window.removeEventListener('resize', handler);
      screen.orientation?.removeEventListener('change', handler);
    };
  }, []);

  return info;
}
