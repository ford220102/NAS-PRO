export interface Volume {
  id: string;
  name: string;
  path: string;
  total: string;
  totalGB: number;
  freeGB: number;
  free: string;
  type: 'SSD' | 'HDD' | 'NVMe';
  raid?: string;
  health: 'Good' | 'Warning' | 'Critical';
}

export interface AppTemplate {
  id: string;
  cat: string;
  name: string;
  icon: string;
  desc: string;
  version: string;
  image: string;
  port: string;
  tags?: string[];
  author?: string;
  stars?: number;
  needsGpu?: boolean;
}

export interface InstalledApp extends AppTemplate {
  selectedVolumeId: string;
  selectedVolumePath: string;
  gpuEnabled: boolean;
  puid: string;
  pgid: string;
  selectedPort: string;
  installedAt: string;
  status: 'running' | 'stopped' | 'error';
  cpuUsage: number;
  memUsageMB: number;
  uptime: string;
}

export interface GpuDevice {
  slot: string;
  vendor: string;
  vendorId: string;
  deviceId: string;
  pciId: string;
  model: string;
  fullName: string;
  driver: string;
  driverVersion: string;
  kernelModule: string;
  vramMB: number;
  sharedVramMB: number;
  busWidth: number;
  pciGen: number;
  pciLanes: number;
  encoders: string[];
  decoders: string[];
  quickSync: boolean;
  vaapi: boolean;
  currentFreqMHz: number;
  maxFreqMHz: number;
  euCount: number;
  powerDraw: number;
  temperature: number;
  memUsedMB: number;
  openclVersion: string;
  vulkanVersion: string;
  vaapiFormats: string[];
  drmNode: string;
  renderNode: string;
  subsystemId: string;
  revision: string;
  iommuGroup: number;
}

export interface HardwareInfo {
  os: string;
  osDetail: string;
  isVM: boolean;
  isDocker: boolean;
  platform: 'linux' | 'windows' | 'macos' | 'unknown';
  cores: number;
  cpuModel: string;
  ramGB: number;
  hasIGPU: boolean;
  gpuModel: string;
  gpus: GpuDevice[];
  networkInterfaces: string[];
  dockerVersion: string;
}

export interface SensorData {
  cpuTemp: number;
  cpuUsage: number;
  ramUsed: number;
  ramTotal: number;
  fanSpeeds: number[];
  networkRx: number;
  networkTx: number;
  uptime: string;
}

export const DETECTED_VOLUMES: Volume[] = [
  {
    id: 'volume1',
    name: 'Volume 1 — NVMe SSD',
    path: '/mnt/volume1',
    total: '2.0 TB',
    totalGB: 2000,
    freeGB: 1420,
    free: '1.42 TB',
    type: 'NVMe',
    health: 'Good',
  },
  {
    id: 'volume2',
    name: 'Volume 2 — RAID-5 Array',
    path: '/mnt/volume2',
    total: '16.0 TB',
    totalGB: 16000,
    freeGB: 11200,
    free: '11.2 TB',
    type: 'HDD',
    raid: 'RAID-5',
    health: 'Good',
  },
  {
    id: 'volume3',
    name: 'Volume 3 — HDD Backup',
    path: '/mnt/volume3',
    total: '8.0 TB',
    totalGB: 8000,
    freeGB: 3800,
    free: '3.8 TB',
    type: 'HDD',
    health: 'Warning',
  },
];

export const APP_CATALOG: AppTemplate[] = [
  { id: 'jellyfin', cat: 'Media', name: 'Jellyfin', icon: '🎬', desc: 'Open-source media server — movies, music, photos', version: '10.8.13', image: 'jellyfin/jellyfin:latest', port: '8096', tags: ['media', 'streaming'], author: 'jellyfin', stars: 28400, needsGpu: true },
  { id: 'plex', cat: 'Media', name: 'Plex Media Server', icon: '🎞', desc: 'Premium media server with transcoding and mobile sync', version: 'latest', image: 'plexinc/pms-docker:latest', port: '32400', tags: ['media', 'streaming'], author: 'Plex Inc', stars: 41200, needsGpu: true },
  { id: 'pihole', cat: 'Network', name: 'Pi-hole', icon: '🕳', desc: 'Network-wide ad blocking and DNS filtering', version: '2024.02', image: 'pihole/pihole:latest', port: '80', tags: ['network', 'dns', 'security'], author: 'Pi-hole', stars: 47100 },
  { id: 'homeassistant', cat: 'Smart Home', name: 'Home Assistant', icon: '🏠', desc: 'Open-source home automation platform', version: 'stable', image: 'homeassistant/home-assistant:stable', port: '8123', tags: ['iot', 'automation'], author: 'Home Assistant', stars: 68200 },
  { id: 'nextcloud', cat: 'Files', name: 'Nextcloud', icon: '☁', desc: 'Self-hosted cloud storage — files, calendar, contacts', version: '28.0', image: 'nextcloud:latest', port: '8080', tags: ['storage', 'sync', 'cloud'], author: 'Nextcloud GmbH', stars: 25600 },
  { id: 'vaultwarden', cat: 'Security', name: 'Vaultwarden', icon: '🔐', desc: 'Self-hosted Bitwarden-compatible password manager', version: '1.30.1', image: 'vaultwarden/server:latest', port: '8090', tags: ['security', 'passwords'], author: 'dani-garcia', stars: 34200 },
  { id: 'portainer', cat: 'System', name: 'Portainer', icon: '🐳', desc: 'Docker container management web UI', version: '2.19', image: 'portainer/portainer-ce:latest', port: '9000', tags: ['docker', 'management'], author: 'Portainer.io', stars: 28900 },
  { id: 'gitea', cat: 'Development', name: 'Gitea', icon: '🔧', desc: 'Self-hosted Git service — lightweight GitHub alternative', version: '1.21', image: 'gitea/gitea:latest', port: '3000', tags: ['git', 'dev'], author: 'Gitea', stars: 41500 },
  { id: 'immich', cat: 'Media', name: 'Immich', icon: '📸', desc: 'High-performance self-hosted photo & video backup', version: '1.98', image: 'ghcr.io/immich-app/immich-server:release', port: '2283', tags: ['photos', 'backup'], author: 'immich-app', stars: 38100, needsGpu: true },
  { id: 'traefik', cat: 'Network', name: 'Traefik', icon: '🔀', desc: 'Reverse proxy and load balancer with Let\'s Encrypt SSL', version: '2.11', image: 'traefik:latest', port: '8080', tags: ['proxy', 'ssl', 'network'], author: 'Traefik Labs', stars: 48900 },
  { id: 'syncthing', cat: 'Files', name: 'Syncthing', icon: '🔄', desc: 'Continuous file synchronization between devices', version: '1.27', image: 'syncthing/syncthing:latest', port: '8384', tags: ['sync', 'p2p'], author: 'Syncthing', stars: 58700 },
  { id: 'grafana', cat: 'Monitoring', name: 'Grafana', icon: '📊', desc: 'Analytics and monitoring dashboards', version: '10.3', image: 'grafana/grafana:latest', port: '3001', tags: ['monitoring', 'analytics'], author: 'Grafana Labs', stars: 59200 },
];
