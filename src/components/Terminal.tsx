import { useState, useRef, useEffect, useCallback } from 'react';
import { C } from '../data/theme';

interface Line {
  type: 'input' | 'output' | 'error' | 'system' | 'progress';
  text: string;
  progress?: number;
}

interface BuildState {
  stage: string;
  progress: number;
  running: boolean;
  startTime: number | null;
  logs: string[];
}

const BANNER = `
██╗   ██╗██████╗  ██████╗ ██████╗  ██████╗ ██╗  ██╗██╗   ██╗
██║   ██║██╔══██╗██╔═══██╗██╔══██╗██╔═══██╗██║ ██╔╝██║   ██║
██║   ██║██████╔╝██║   ██║██████╔╝██║   ██║█████╔╝ ██║   ██║
╚██╗ ██╔╝██╔══██╗██║   ██║██╔══██╗██║   ██║██╔═██╗ ██║   ██║
 ╚████╔╝ ██║  ██║╚██████╔╝██║  ██║╚██████╔╝██║  ██╗╚██████╔╝
  ╚═══╝  ╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═╝ ╚═════╝
  UGOS Pro NASWare v3.2.0 · Kernel 6.9.12-ugos-pro
  Debian 13 (Trixie) Build Environment Ready
`;

const HELP = `Dostępne komendy:
  help              - Pokaż tę pomoc
  ls [dir]          - Wylistuj pliki
  cd <dir>          - Zmień katalog
  pwd               - Pokaż aktualny katalog
  cat <file>        - Wyświetl plik
  mkdir <dir>       - Utwórz katalog
  rm <file|dir>     - Usuń plik/katalog
  cp <src> <dst>    - Kopiuj plik
  mv <src> <dst>    - Przenieś plik
  touch <file>      - Utwórz pusty plik
  echo <text>       - Wypisz tekst
  chmod <mode> <f>  - Zmień uprawnienia
  df                - Wolne miejsce na dyskach
  free              - Zużycie pamięci
  top               - Procesy i CPU
  docker            - Status kontenerów
  ps                - Lista procesów
  uname             - Informacje o systemie
  uptime            - Czas pracy systemu
  whoami            - Aktualny użytkownik
  ip                - Konfiguracja sieci
  date              - Aktualna data i czas
  clear             - Wyczyść terminal
  reboot            - Uruchom ponownie (symulacja)
  exit              - Zamknij terminal

=== DEBIAN 13 ISO BUILD ===
  apt-get <cmd>     - Zarządzanie pakietami
  debootstrap       - Buduj bazowy system Debian
  lb config         - Konfiguruj Live Build
  lb build          - Buduj ISO Debian 13
  lb clean          - Wyczyść build
  mkisofs           - Utwórz obraz ISO
  xorriso           - Zaawansowane narzędzie ISO
  cdebootstrap      - Alternatywny debootstrap
  squashfs-tools    - Narzędzia SquashFS
  genisoimage       - Generuj obrazy ISO
  build-status      - Status aktualnego build
  build-log         - Pokaż log build
  build-iso         - Pełny proces budowania ISO
  install-deps      - Zainstaluj zależności build
  configure-iso     - Konfiguruj parametry ISO
`;

interface FileSystem {
  [path: string]: {
    type: 'dir' | 'file';
    content?: string;
    permissions?: string;
    size?: number;
  };
}

const FS: FileSystem = {
  '/': { type: 'dir', permissions: 'drwxr-xr-x' },
  '/bin': { type: 'dir', permissions: 'drwxr-xr-x' },
  '/boot': { type: 'dir', permissions: 'drwxr-xr-x' },
  '/dev': { type: 'dir', permissions: 'drwxr-xr-x' },
  '/etc': { type: 'dir', permissions: 'drwxr-xr-x' },
  '/home': { type: 'dir', permissions: 'drwxr-xr-x' },
  '/lib': { type: 'dir', permissions: 'drwxr-xr-x' },
  '/mnt': { type: 'dir', permissions: 'drwxr-xr-x' },
  '/opt': { type: 'dir', permissions: 'drwxr-xr-x' },
  '/proc': { type: 'dir', permissions: 'drwxr-xr-x' },
  '/root': { type: 'dir', permissions: 'drwx------' },
  '/srv': { type: 'dir', permissions: 'drwxr-xr-x' },
  '/tmp': { type: 'dir', permissions: 'drwxrwxrwt' },
  '/usr': { type: 'dir', permissions: 'drwxr-xr-x' },
  '/var': { type: 'dir', permissions: 'drwxr-xr-x' },
  '/data': { type: 'dir', permissions: 'drwxr-xr-x' },
  '/build': { type: 'dir', permissions: 'drwxr-xr-x' },
  '/build/debian-iso': { type: 'dir', permissions: 'drwxr-xr-x' },
  '/build/debian-iso/config': { type: 'dir', permissions: 'drwxr-xr-x' },
  '/build/debian-iso/chroot': { type: 'dir', permissions: 'drwxr-xr-x' },
  '/build/debian-iso/binary': { type: 'dir', permissions: 'drwxr-xr-x' },
  '/build/output': { type: 'dir', permissions: 'drwxr-xr-x' },
  '/home/admin': { type: 'dir', permissions: 'drwxr-xr-x' },
  '/home/backup': { type: 'dir', permissions: 'drwxr-xr-x' },
  '/home/shared': { type: 'dir', permissions: 'drwxr-xr-x' },
  '/home/media': { type: 'dir', permissions: 'drwxr-xr-x' },
  '/data/docker': { type: 'dir', permissions: 'drwxr-xr-x' },
  '/data/volumes': { type: 'dir', permissions: 'drwxr-xr-x' },
  '/data/backups': { type: 'dir', permissions: 'drwxr-xr-x' },
  '/data/photos': { type: 'dir', permissions: 'drwxr-xr-x' },
  '/data/videos': { type: 'dir', permissions: 'drwxr-xr-x' },
  '/data/music': { type: 'dir', permissions: 'drwxr-xr-x' },
  '/data/documents': { type: 'dir', permissions: 'drwxr-xr-x' },
  '/mnt/volume1': { type: 'dir', permissions: 'drwxr-xr-x' },
  '/mnt/volume2': { type: 'dir', permissions: 'drwxr-xr-x' },
  '/mnt/usb': { type: 'dir', permissions: 'drwxr-xr-x' },
  '/mnt/nfs': { type: 'dir', permissions: 'drwxr-xr-x' },
  '/etc/hostname': { type: 'file', content: 'nas-ugospro\n', permissions: '-rw-r--r--', size: 12 },
  '/etc/hosts': { type: 'file', content: '127.0.0.1   localhost\n192.168.1.100 nas.local nas\n', permissions: '-rw-r--r--', size: 48 },
  '/etc/fstab': { type: 'file', content: '/dev/sda1  /     ext4  defaults  0 1\n/dev/sdb1  /data  ext4  defaults  0 2\n', permissions: '-rw-r--r--', size: 68 },
  '/root/.bashrc': { type: 'file', content: 'export PS1="\\u@\\h:\\w# "\nalias ll="ls -la"\nalias docker="docker ps"\nalias build="lb build"\n', permissions: '-rw-r--r--', size: 86 },
  '/build/debian-iso/config/package-lists': { type: 'dir', permissions: 'drwxr-xr-x' },
  '/build/debian-iso/config/hooks': { type: 'dir', permissions: 'drwxr-xr-x' },
  '/build/debian-iso/config/includes.chroot': { type: 'dir', permissions: 'drwxr-xr-x' },
};


function normalizePath(cwd: string, path: string): string {
  if (path.startsWith('/')) {
    let p = path.replace(/\/+/g, '/');
    if (p !== '/' && p.endsWith('/')) p = p.slice(0, -1);
    return p;
  }
  const parts = cwd.split('/').filter(Boolean);
  const rel = path.split('/').filter(Boolean);
  for (const part of rel) {
    if (part === '..') {
      if (parts.length > 0) parts.pop();
    } else if (part !== '.') {
      parts.push(part);
    }
  }
  const result = '/' + parts.join('/');
  return result === '' ? '/' : result;
}

function listDir(fs: FileSystem, path: string): string[] {
  const items: string[] = [];
  const prefix = path === '/' ? '/' : path + '/';
  for (const p in fs) {
    if (p === path) continue;
    if (p.startsWith(prefix)) {
      const rest = p.slice(prefix.length);
      if (!rest.includes('/')) {
        items.push(rest);
      }
    }
  }
  return items.sort();
}

export default function Terminal() {
  const [lines, setLines] = useState<Line[]>([
    { type: 'system', text: BANNER },
    { type: 'system', text: 'Wpisz "help" aby zobaczyć dostępne komendy.\n' },
    { type: 'system', text: 'Wpisz "install-deps" aby zainstalować narzędzia do budowania ISO.\n' },
  ]);
  const [input, setInput] = useState('');
  const [cwd, setCwd] = useState('/root');
  const [history, setHistory] = useState<string[]>([]);
  const [histIdx, setHistIdx] = useState(-1);
  const [fs, setFs] = useState<FileSystem>(FS);
  const [buildState, setBuildState] = useState<BuildState>({
    stage: '',
    progress: 0,
    running: false,
    startTime: null,
    logs: [],
  });
  const [installedPkgs, setInstalledPkgs] = useState<Set<string>>(new Set([
    'build-essential', 'dpkg-dev', 'debhelper', 'fakeroot',
  ]));
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const prompt = `root@nas:${cwd}# `;

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [lines]);

  const exec = useCallback((cmd: string): void => {
    const parts = cmd.trim().split(/\s+/);
    const c = parts[0];
    const args = parts.slice(1);
    const arg = args.join(' ');

    const output: Line[] = [];

    switch (c) {
      case 'help':
        output.push({ type: 'output', text: HELP });
        break;

      case 'ls': {
        const target = args[0] ? normalizePath(cwd, args[0]) : cwd;
        const items = listDir(fs, target);
        if (items.length === 0) {
          const entry = fs[target];
          if (entry && entry.type === 'dir') {
            output.push({ type: 'output', text: '(pusty katalog)' });
          } else {
            output.push({ type: 'error', text: `ls: nie ma dostępu do '${args[0] || cwd}': Nie ma takiego pliku ani katalogu` });
          }
        } else {
          const formatted = items.map(item => {
            const itemPath = target === '/' ? `/${item}` : `${target}/${item}`;
            const entry = fs[itemPath];
            const perm = entry?.permissions?.slice(0, 1) || '-';
            return perm === 'd' ? `\x1b[34m${item}/\x1b[0m` : item;
          }).join('  ');
          output.push({ type: 'output', text: formatted.replace(/\x1b\[[0-9;]*m/g, '') });
        }
        break;
      }

      case 'cd': {
        if (!arg || arg === '~') {
          setCwd('/root');
          break;
        }
        const target = normalizePath(cwd, arg);
        if (fs[target] && fs[target].type === 'dir') {
          setCwd(target);
        } else {
          output.push({ type: 'error', text: `cd: ${arg}: Nie ma takiego katalogu` });
        }
        break;
      }

      case 'pwd':
        output.push({ type: 'output', text: cwd });
        break;

      case 'cat': {
        if (!args[0]) {
          output.push({ type: 'error', text: 'cat: brak argumentu' });
          break;
        }
        const fpath = normalizePath(cwd, args[0]);
        const entry = fs[fpath];
        if (entry && entry.type === 'file') {
          output.push({ type: 'output', text: entry.content || '' });
        } else if (entry && entry.type === 'dir') {
          output.push({ type: 'error', text: `cat: ${args[0]}: Jest katalogiem` });
        } else {
          output.push({ type: 'error', text: `cat: ${args[0]}: Nie ma takiego pliku` });
        }
        break;
      }

      case 'mkdir': {
        if (!args[0]) {
          output.push({ type: 'error', text: 'mkdir: brak operandu' });
          break;
        }
        const target = normalizePath(cwd, args[0]);
        if (fs[target]) {
          output.push({ type: 'error', text: `mkdir: nie można utworzyć katalogu '${args[0]}': Plik istnieje` });
        } else {
          setFs(prev => ({ ...prev, [target]: { type: 'dir', permissions: 'drwxr-xr-x' } }));
          output.push({ type: 'system', text: '' });
        }
        break;
      }

      case 'rm': {
        const flags = args.filter(a => a.startsWith('-'));
        const targets = args.filter(a => !a.startsWith('-'));
        const recursive = flags.includes('-r') || flags.includes('-rf') || flags.includes('-fr');

        if (targets.length === 0) {
          output.push({ type: 'error', text: 'rm: brak operandu' });
          break;
        }

        for (const t of targets) {
          const target = normalizePath(cwd, t);
          const entry = fs[target];
          if (!entry) {
            output.push({ type: 'error', text: `rm: nie można usunąć '${t}': Nie ma takiego pliku ani katalogu` });
          } else if (entry.type === 'dir' && !recursive) {
            output.push({ type: 'error', text: `rm: nie można usunąć '${t}': Jest katalogiem (użyj -r)` });
          } else {
            setFs(prev => {
              const next = { ...prev };
              if (entry.type === 'dir' && recursive) {
                const prefix = target === '/' ? '/' : target + '/';
                for (const p in next) {
                  if (p === target || p.startsWith(prefix)) {
                    delete next[p];
                  }
                }
              } else {
                delete next[target];
              }
              return next;
            });
          }
        }
        break;
      }

      case 'touch': {
        if (!args[0]) {
          output.push({ type: 'error', text: 'touch: brak operandu' });
          break;
        }
        const target = normalizePath(cwd, args[0]);
        if (!fs[target]) {
          setFs(prev => ({ ...prev, [target]: { type: 'file', content: '', permissions: '-rw-r--r--', size: 0 } }));
        }
        break;
      }

      case 'echo': {
        output.push({ type: 'output', text: arg });
        break;
      }

      case 'cp': {
        if (args.length < 2) {
          output.push({ type: 'error', text: 'cp: brakujący operand po docelowym' });
          break;
        }
        const src = normalizePath(cwd, args[0]);
        const dst = normalizePath(cwd, args[1]);
        const srcEntry = fs[src];
        if (!srcEntry) {
          output.push({ type: 'error', text: `cp: nie można wykonać stat na '${args[0]}': Nie ma takiego pliku` });
        } else if (srcEntry.type === 'dir') {
          output.push({ type: 'error', text: `cp: pomijanie katalogu '${args[0]}'` });
        } else {
          setFs(prev => ({ ...prev, [dst]: { ...srcEntry } }));
          output.push({ type: 'system', text: '' });
        }
        break;
      }

      case 'mv': {
        if (args.length < 2) {
          output.push({ type: 'error', text: 'mv: brakujący operand po docelowym' });
          break;
        }
        const src = normalizePath(cwd, args[0]);
        const dst = normalizePath(cwd, args[1]);
        const srcEntry = fs[src];
        if (!srcEntry) {
          output.push({ type: 'error', text: `mv: nie można wykonać stat na '${args[0]}': Nie ma takiego pliku` });
        } else {
          setFs(prev => {
            const next = { ...prev, [dst]: srcEntry };
            delete next[src];
            if (srcEntry.type === 'dir') {
              const prefix = src === '/' ? '/' : src + '/';
              for (const p in prev) {
                if (p.startsWith(prefix)) {
                  const newP = p.replace(prefix, dst + '/');
                  next[newP] = prev[p];
                  delete next[p];
                }
              }
            }
            return next;
          });
        }
        break;
      }

      case 'chmod': {
        if (args.length < 2) {
          output.push({ type: 'error', text: 'chmod: brakujący operand' });
          break;
        }
        const mode = args[0];
        const target = normalizePath(cwd, args[1]);
        const entry = fs[target];
        if (!entry) {
          output.push({ type: 'error', text: `chmod: nie można dostać się do '${args[1]}': Nie ma takiego pliku` });
        } else {
          const typeChar = entry.permissions?.[0] || '-';
          setFs(prev => ({
            ...prev,
            [target]: { ...entry, permissions: typeChar + mode }
          }));
        }
        break;
      }

      case 'df':
        output.push({ type: 'output', text: `System plików     1K-bloków    Użyte   Dostępne  Użycie% Zamontowane na
/dev/sda1         52428800  18321920  34106880      35% /
/dev/sdb1        104857600  42194688  62662912      41% /data
/dev/sdc1         52428800   8923648  43505152      18% /mnt/volume2
tmpfs              4194304         0   4194304       0% /dev/shm` });
        break;

      case 'free':
        output.push({ type: 'output', text: `              razem   użyte  wolne  współ.  bufor  dostępne
Pamięć:       8192M   3214M  4978M    39%    256M   4722M
Swap:         4096M      0M  4096M     0%` });
        break;

      case 'top':
        output.push({ type: 'output', text: `top - ${new Date().toLocaleTimeString()} up 5d 14:22,  2 users,  load average: 0.42, 0.38, 0.31
Zadania: 142 total,   1 running, 141 sleeping, 0 stopped, 0 zombie
%Cpu(s): 12.4 us,  3.2 sy,  0.0 ni, 83.8 id,  0.6 wa
MiB Mem: 8192 total, 4978 free, 3214 used, 256 buff/cache

  PID  USER      PR  NI    VIRT    RES   %CPU  %MEM  CZAS+  KOMENDA
    1   root      20   0   168M    12M    0.0   0.1  0:08  systemd
  412   root      20   0   324M    48M    2.1   0.6  5:22  docker
  891   admin     20   0   256M    32M    0.8   0.4  2:14  ugos-web
 1024   root      20   0   128M    18M    0.3   0.2  0:42  sshd
 2048   admin     20   0    96M    14M    0.1   0.2  0:08  bash${buildState.running ? `
 3105   root      20   0   512M   128M   45.2  12.5  0:32  lb build` : ''}` });
        break;

      case 'docker':
        output.push({ type: 'output', text: `CONTAINER ID   IMAGE              STATUS         PORTS                  NAMES
a3f2c1b8d4e7   jellyfin/jellyfin  Up 3d 2h      8096/tcp               jellyfin
b7e4a2f9c1d3   linuxserver/qbitt  Up 5d 14h     8080, 6881/tcp         qbittorrent
c1d8b6a3e2f5   portainer/portai  Up 5d 14h     9000/tcp               portainer
d2a9c4b7f1e8   homeassistant/h   Up 2d 8h      8123/tcp               homeassistant
e5b3d8a1c6f2   nginx:latest      Up 14h        80/tcp, 443/tcp        nginx-proxy` });
        break;

      case 'ps':
        output.push({ type: 'output', text: `  PID TTY          TIME CMD
    1 ?        00:00:08 systemd
  412 ?        00:05:22 docker
  891 ?        00:02:14 ugos-web
 1024 ?        00:00:42 sshd
 2048 pts/0    00:00:08 bash${buildState.running ? `
 3105 pts/0    00:00:32 lb build` : ''}` });
        break;

      case 'uname':
        if (args.includes('-a')) {
          output.push({ type: 'output', text: 'Linux nas.ugospro 6.9.12-ugos-pro #1 SMP PREEMPT_DYNAMIC x86_64 GNU/Linux' });
        } else {
          output.push({ type: 'output', text: 'Linux' });
        }
        break;

      case 'uptime':
        output.push({ type: 'output', text: ` ${new Date().toLocaleTimeString()} up 5d 14:22, 2 users, load average: 0.42, 0.38, 0.31` });
        break;

      case 'whoami':
        output.push({ type: 'output', text: 'root' });
        break;

      case 'ip':
        output.push({ type: 'output', text: `1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN group default qlen 1000
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
    inet 127.0.0.1/8 scope host lo
2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc mq state UP group default qlen 1000
    link/ether 00:15:17:3a:8b:9c brd ff:ff:ff:ff:ff:ff
    inet 192.168.1.100/24 brd 192.168.1.255 scope global eth0
3: docker0: <NO-CARRIER,BROADCAST,MULTICAST,UP> mtu 1500
    inet 172.17.0.1/16 brd 172.17.255.255 scope global docker0` });
        break;

      case 'date':
        output.push({ type: 'output', text: new Date().toString() });
        break;

      case 'clear':
        setLines([]);
        return;

      case 'reboot':
        output.push({ type: 'system', text: 'Restartowanie systemu...\nPołączenie zostanie utracone.' });
        break;

      case 'exit':
        output.push({ type: 'system', text: 'Zamykanie terminala...' });
        break;

      case 'apt-get': {
        const subCmd = args[0];
        const pkgs = args.slice(1).filter(a => !a.startsWith('-'));

        if (subCmd === 'update') {
          output.push({ type: 'output', text: `Pobieranie:1 http://deb.debian.org/debian trixie InRelease [156 kB]
Pobieranie:2 http://deb.debian.org/debian trixie-updates InRelease [46 kB]
Pobieranie:3 http://security.debian.org/debian-security trixie-security InRelease [32 kB]
Czytanie list pakietów... Gotowe
Tworzenie drzewa zależności... Gotowe
Pobrano 234 kB w 1s (234 kB/s)
Czytanie informacji o stanie... Gotowe
Wszystkie pakiety są aktualne.` });
        } else if (subCmd === 'install' || subCmd === '-y') {
          const toInstall = subCmd === '-y' ? pkgs : pkgs.filter(p => !p.startsWith('-'));
          if (toInstall.length === 0) {
            output.push({ type: 'error', text: 'E: Nie podano pakietów do instalacji' });
          } else {
            const installLog = toInstall.map(pkg => {
              setInstalledPkgs(prev => new Set(prev).add(pkg));
              return `Czytanie list pakietów... Gotowe
Tworzenie drzewa zależności... Gotowe
Czytanie informacji o stanie... Gotowe
Zostaną zainstalowane następujące NOWE pakiety:
  ${pkg}
0 aktualizowanych, 1 nowo zainstalowanych, 0 usuwanych i 0 nieaktualizowanych.
Pobieranie:1 http://deb.debian.org/debian trixie/main amd64 ${pkg} amd64 [${Math.floor(Math.random() * 1000) + 100} kB]
Pobrano ${Math.floor(Math.random() * 1000) + 100} kB w 1s
Wybieranie wcześniej nieselekcjonowanego pakietu ${pkg}.
(Odczytywanie bazy danych ... 142000 plików lub katalogów obecnie zainstalowanych.)
Przygotowywanie do rozpakowania pakietu ${pkg} ...
Rozpakowywanie pakietu ${pkg} ...
Konfigurowanie pakietu ${pkg} (${Math.floor(Math.random() * 10) + 1}.0-1) ...`;
            }).join('\n');
            output.push({ type: 'output', text: installLog });
          }
        } else if (subCmd === 'remove') {
          if (pkgs.length === 0) {
            output.push({ type: 'error', text: 'E: Nie podano pakietów do usunięcia' });
          } else {
            pkgs.forEach(pkg => setInstalledPkgs(prev => {
              const next = new Set(prev);
              next.delete(pkg);
              return next;
            }));
            output.push({ type: 'output', text: `Pakiety zostaną USUNIĘTE:
  ${pkgs.join(' ')}
0 aktualizowanych, 0 nowo zainstalowanych, ${pkgs.length} usuwanych i 0 nieaktualizowanych.` });
          }
        } else if (subCmd === 'search') {
          output.push({ type: 'output', text: `live-build/trixie 1:20240626 all
  narzędzie do budowania systemów live

debootstrap/trixie 1.0.134 all
  budowa bazowego systemu Debian

squashfs-tools/trixie 1:4.6.1-1 amd64
  narzędzia do tworzenia systemów plików squashfs

xorriso/trixie 1.5.6-1 amd64
  narzędzie do tworzenia obrazów ISO

genisoimage/trixie 1:1.1.11-5 amd64
  tworzenie obrazów ISO` });
        } else {
          output.push({ type: 'error', text: `E: Nieznana komenda: ${subCmd}` });
        }
        break;
      }

      case 'install-deps': {
        const deps = ['debootstrap', 'live-build', 'squashfs-tools', 'xorriso', 'genisoimage', 'isolinux', 'syslinux-common'];
        deps.forEach(d => setInstalledPkgs(prev => new Set(prev).add(d)));
        output.push({ type: 'output', text: `[*] Aktualizacja listy pakietów...
Czytanie list pakietów... Gotowe
[*] Instalacja zależności do budowania ISO Debian 13...

Zostaną zainstalowane następujące NOWE pakiety:
  debootstrap live-build squashfs-tools xorriso genisoimage isolinux syslinux-common

Pobieranie pakietów... Gotowe
Rozpakowywanie... Gotowe
Konfigurowanie... Gotowe

[OK] Zależności zainstalowane pomyślnie.
[INFO] Możesz teraz uruchomić 'lb config' aby skonfigurować build,
       lub 'build-iso' aby uruchomić pełny proces.` });
        break;
      }

      case 'debootstrap': {
        const suite = args[0] || 'trixie';
        const target = args[1] || './chroot';

        if (!installedPkgs.has('debootstrap')) {
          output.push({ type: 'error', text: 'debootstrap: komenda nie znaleziona. Uruchom: install-deps' });
        } else {
          const targetPath = normalizePath(cwd, target);
          setFs(prev => ({
            ...prev,
            [targetPath]: { type: 'dir', permissions: 'drwxr-xr-x' },
            [`${targetPath}/bin`]: { type: 'dir', permissions: 'drwxr-xr-x' },
            [`${targetPath}/etc`]: { type: 'dir', permissions: 'drwxr-xr-x' },
            [`${targetPath}/var`]: { type: 'dir', permissions: 'drwxr-xr-x' },
          }));
          output.push({ type: 'output', text: `I: Retrieving InRelease
I: Retrieving Release
I: Retrieving Release.gpg
I: Checking Release signature
I: Validating '${suite}' ...
I: Retrieving Packages.xz
I: Retrieving core packages...
I: Extracting base-files...
I: Extracting base-passwd...
I: Extracting bash...
I: Extracting coreutils...
I: Extracting debianutils...
I: Extracting diffutils...
I: Extracting dpkg...
I: Extracting findutils...
I: Extracting grep...
I: Extracting gzip...
I: Extracting hostname...
I: Extracting init-system-helpers...
I: Extracting init...
I: Extracting libc-bin...
I: Extracting libc6...
I: Extracting login...
I: Extracting mawk...
I: Extracting ncurses-base...
I: Extracting ncurses-bin...
I: Extracting passwd...
I: Extracting perl-base...
I: Extracting sed...
I: Extracting sysvinit-utils...
I: Extracting tar...
I: Extracting util-linux...

I: Base system installed successfully in ${target}` });
        }
        break;
      }

      case 'lb': {
        const subCmd = args[0];

        if (!installedPkgs.has('live-build')) {
          output.push({ type: 'error', text: 'lb: komenda nie znaleziona. Uruchom: install-deps' });
          break;
        }

        if (subCmd === 'config') {
          const options = args.slice(1);
          output.push({ type: 'output', text: `[.] Tworzenie konfiguracji Live Build...
P: Tworzenie katalogu 'config'
P: Tworzenie katalogu 'local'
P: Tworzenie katalogu 'local/bin'
P: Tworzenie katalogu 'local/hooks'
P: Tworzenie katalogu 'local/includes.chroot'
P: Tworzenie katalogu 'local/packages.chroot'
P: Tworzenie katalogu 'local/package-lists'

Konfiguracja: ${options.length > 0 ? options.join(' ') : '(domyślna)'}
  --distribution trixie
  --architectures amd64
  --binary-images iso-hybrid
  --bootappend-live "boot=live components quiet splash"

[OK] Konfiguracja utworzona w ./config` });
        } else if (subCmd === 'build') {
          if (buildState.running) {
            output.push({ type: 'error', text: 'lb build: build już trwa' });
          } else {
            output.push({ type: 'output', text: `[START] Rozpoczynanie budowania ISO Debian 13 (Trixie)...
[INFO] To może potrwać od 15 minut do kilku godzin w zależności od sprzętu.` });
            setBuildState({
              stage: 'bootstrap',
              progress: 0,
              running: true,
              startTime: Date.now(),
              logs: ['[0%] Inicjalizacja środowiska build...'],
            });
          }
        } else if (subCmd === 'clean') {
          output.push({ type: 'output', text: `P: Czyszczenie katalogów build...
P: Usuwanie chroot/
P: Usuwanie binary/
P: Usuwanie .stage/
[OK] Build wyczyszczony.` });
          setBuildState({ stage: '', progress: 0, running: false, startTime: null, logs: [] });
        } else {
          output.push({ type: 'error', text: `lb: nieznana podkomenda: ${subCmd}` });
        }
        break;
      }

      case 'build-iso': {
        if (buildState.running) {
          output.push({ type: 'error', text: 'Build już trwa. Użyj build-status aby sprawdzić postęp.' });
        } else {
          output.push({ type: 'output', text: `
╔══════════════════════════════════════════════════════════════╗
║          DEBIAN 13 (TRIXIE) ISO BUILDER v1.0                 ║
╚══════════════════════════════════════════════════════════════╝

[UWAGA] Ten proces symuluje budowanie ISO Debian 13.
        W prawdziwym środowisku potrwałoby to 20-60 minut.

[1/7] Sprawdzanie zależności...
[OK] debootstrap: ${installedPkgs.has('debootstrap') ? 'zainstalowany' : 'BRAK'}
[OK] live-build: ${installedPkgs.has('live-build') ? 'zainstalowany' : 'BRAK'}
[OK] squashfs-tools: ${installedPkgs.has('squashfs-tools') ? 'zainstalowany' : 'BRAK'}
[OK] xorriso: ${installedPkgs.has('xorriso') ? 'zainstalowany' : 'BRAK'}

[2/7] Konfiguracja Live Build...
[OK] Arch: amd64
[OK] Dystrybucja: trixie
[OK] Typ obrazu: iso-hybrid

[3/7] Rozpoczynanie pełnego procesu build...
` });
          setBuildState({
            stage: 'full',
            progress: 0,
            running: true,
            startTime: Date.now(),
            logs: ['[0%] Uruchamianie lb build...'],
          });
        }
        break;
      }

      case 'mkisofs':
      case 'genisoimage':
      case 'xorriso': {
        if (!installedPkgs.has('xorriso')) {
          output.push({ type: 'error', text: `${c}: komenda nie znaleziona. Uruchom: install-deps` });
        } else {
          output.push({ type: 'output', text: `I: -input-charset not specified, using utf-8 (detected in locale)
I: Writing to   'output.iso'
I: Size of output: 4.7 GiB
I: Elapsed time: 2m 34s
I: Done.` });
        }
        break;
      }

      case 'build-status': {
        if (!buildState.running) {
          output.push({ type: 'output', text: 'Brak aktywnego build. Uruchom "lb build" lub "build-iso".' });
        } else {
          const elapsed = buildState.startTime ? Math.floor((Date.now() - buildState.startTime) / 1000) : 0;
          const mins = Math.floor(elapsed / 60);
          const secs = elapsed % 60;
          output.push({ type: 'output', text: `
Status build: AKTYWNY
Etap: ${buildState.stage}
Postęp: ${buildState.progress}%
Czas: ${mins}m ${secs}s
Log ostatnich operacji:
${buildState.logs.slice(-5).join('\n')}` });
        }
        break;
      }

      case 'build-log': {
        if (buildState.logs.length === 0) {
          output.push({ type: 'output', text: 'Brak logów. Uruchom build aby rozpocząć.' });
        } else {
          output.push({ type: 'output', text: buildState.logs.join('\n') });
        }
        break;
      }

      case 'configure-iso': {
        output.push({ type: 'output', text: `
Konfiguracja ISO Debian 13:

[OK] Dystrybucja: trixie (Debian 13)
[OK] Architektura: amd64
[OK] Typ obrazu: iso-hybrid (USB + CD)
[OK] Środowisko: GNOME Desktop (domyślne)
[OK] Jądro: linux-image-amd64

Edytuj pliki konfiguracyjne:
  config/package-lists/custom.list.chroot
  config/hooks/custom.hook.chroot
  config/includes.chroot/

Przykładowe pakiety do dodania:
  => firefox-esr
  => libreoffice
  => vlc
  => gimp
  => inkscape
  => audacity
  => vscode
  => docker.io
  => podman

Użyj 'build-iso' aby rozpocząć build.` });
        break;
      }

      case '':
        break;

      default:
        output.push({ type: 'error', text: `${c}: komenda nie znaleziona. Wpisz "help".` });
    }

    if (output.length > 0) {
      setLines(prev => [...prev, { type: 'input', text: `${prompt}${cmd}` }, ...output]);
    } else {
      setLines(prev => [...prev, { type: 'input', text: `${prompt}${cmd}` }]);
    }
  }, [cwd, fs, buildState, installedPkgs, prompt]);

  // Simulate build progress
  useEffect(() => {
    if (!buildState.running) return;

    const stages = [
      'bootstrap', 'packages', 'chroot', 'rootfs',
      'squashfs', 'iso', 'finalizing'
    ];

    const interval = setInterval(() => {
      setBuildState(prev => {
        if (!prev.running) return prev;

        const newProgress = Math.min(prev.progress + Math.random() * 3 + 1, 100);
        const stageIdx = Math.min(Math.floor(newProgress / 14.3), stages.length - 1);
        const newStage = stages[stageIdx];

        const messages: Record<string, string[]> = {
          bootstrap: [
            `[${Math.floor(newProgress)}%] Pobieranie podstawowego systemu...`,
            `[${Math.floor(newProgress)}%] Rozpakowywanie pakietów base...`,
            `[${Math.floor(newProgress)}%] Konfiguracja APT...`,
          ],
          packages: [
            `[${Math.floor(newProgress)}%] Pobieranie pakietów systemowych...`,
            `[${Math.floor(newProgress)}%] Instalacja xorg-server...`,
            `[${Math.floor(newProgress)}%] Instalacja gnome-shell...`,
            `[${Math.floor(newProgress)}%] Pobieranie ${Math.floor(Math.random() * 200) + 100} pakietów...`,
          ],
          chroot: [
            `[${Math.floor(newProgress)}%] Konfiguracja chroot...`,
            `[${Math.floor(newProgress)}%] Uruchamianie skryptów hooks...`,
            `[${Math.floor(newProgress)}%] Konfiguracja użytkowników...`,
          ],
          rootfs: [
            `[${Math.floor(newProgress)}%] Tworzenie systemu plików root...`,
            `[${Math.floor(newProgress)}%] Kompresja filesystem.squashfs...`,
          ],
          squashfs: [
            `[${Math.floor(newProgress)}%] Tworzenie squashfs...`,
            `[${Math.floor(newProgress)}%] Kompresja danych (${Math.floor(Math.random() * 50 + 50)}% ratio)...`,
          ],
          iso: [
            `[${Math.floor(newProgress)}%] Generowanie bootloadera isolinux...`,
            `[${Math.floor(newProgress)}%] Tworzenie struktury ISO...`,
            `[${Math.floor(newProgress)}%] Zapisywanie obrazu ISO...`,
          ],
          finalizing: [
            `[${Math.floor(newProgress)}%] Generowanie checksum...`,
            `[${Math.floor(newProgress)}%] Finalizacja...`,
          ],
        };

        const stageMsgs = messages[newStage] || [`[${Math.floor(newProgress)}%] Przetwarzanie...`];
        const msg = stageMsgs[Math.floor(Math.random() * stageMsgs.length)];

        const newLogs = [...prev.logs, msg].slice(-50);

        if (newProgress >= 100) {
          // Build complete - create the ISO file in simulated filesystem
          const buildStartTime = prev.startTime;
          setFs(f => ({
            ...f,
            '/build/output/debian-13.0-amd64.iso': {
              type: 'file',
              content: '[BINARY ISO IMAGE - 4.7 GB]',
              permissions: '-rw-r--r--',
              size: 5046586572,
            },
            '/build/output/SHA256SUMS': {
              type: 'file',
              content: `a3f2b8c1d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1  debian-13.0-amd64.iso\n`,
              permissions: '-rw-r--r--',
              size: 86,
            },
          }));

          setTimeout(() => {
            const elapsed = buildStartTime ? Math.floor((Date.now() - buildStartTime) / 60000) : 0;
            setLines(l => [...l,
              { type: 'system', text: '' },
              { type: 'output', text: `
╔══════════════════════════════════════════════════════════════╗
║             BUILD ZAKOŃCZONY POMYŚLNIE!                      ║
╚══════════════════════════════════════════════════════════════╝

[OK] Obraz ISO wygenerowany: /build/output/debian-13.0-amd64.iso
[OK] Rozmiar: 4.7 GiB (5,046,586,572 bajtów)
[OK] Czas trwania: ${elapsed} minut
[OK] Checksum SHA256: a3f2b8c1d4e5...d8e9f0a1

Aby nagrać na USB:
  # dd if=debian-13.0-amd64.iso of=/dev/sdX bs=4M status=progress && sync

Lista plików w katalogu output:
  debian-13.0-amd64.iso
  SHA256SUMS
` }
            ]);
          }, 100);

          return { ...prev, progress: 100, running: false, logs: newLogs };
        }

        setLines(l => {
          const last = l[l.length - 1];
          if (last?.type === 'output' && last.text.startsWith('[')) {
            return [...l.slice(0, -1), { type: 'output', text: msg }];
          }
          return [...l, { type: 'output', text: msg }];
        });

        return { ...prev, progress: newProgress, stage: newStage, logs: newLogs };
      });
    }, 800);

    return () => clearInterval(interval);
  }, [buildState.running]);

  const submit = () => {
    exec(input);
    if (input.trim()) {
      setHistory(h => [...h, input]);
    }
    setHistIdx(-1);
    setInput('');
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      submit();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length === 0) return;
      const idx = histIdx === -1 ? history.length - 1 : Math.max(0, histIdx - 1);
      setHistIdx(idx);
      setInput(history[idx]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (histIdx === -1) return;
      const idx = Math.min(history.length - 1, histIdx + 1);
      if (idx >= history.length) {
        setHistIdx(-1);
        setInput('');
      } else {
        setHistIdx(idx);
        setInput(history[idx]);
      }
    } else if (e.key === 'l' && e.ctrlKey) {
      e.preventDefault();
      setLines([]);
    } else if (e.key === 'c' && e.ctrlKey) {
      e.preventDefault();
      setLines(prev => [...prev, { type: 'input', text: `${prompt}${input}^C` }]);
      setInput('');
    }
  };

  return (
    <div
      ref={scrollRef}
      onClick={() => inputRef.current?.focus()}
      style={{
        width: '100%',
        height: '100%',
        overflow: 'auto',
        background: 'linear-gradient(180deg, #0a0a14 0%, #0d1117 100%)',
        borderRadius: 10,
        padding: 14,
        fontFamily: '"JetBrains Mono", "Fira Code", "Consolas", monospace',
        fontSize: 13,
        lineHeight: 1.5,
        cursor: 'text',
      }}
    >
      {lines.map((l, i) => (
        <div
          key={i}
          style={{
            color: l.type === 'input'
              ? C.text
              : l.type === 'error'
                ? '#ff6b6b'
                : l.type === 'system'
                  ? '#4ecdc4'
                  : '#a0aec0',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            marginBottom: l.type === 'system' && l.text.includes('██')
              ? 0
              : l.text === ''
                ? 0
                : 2,
          }}
        >
          {l.text}
        </div>
      ))}
      <div style={{ display: 'flex', alignItems: 'center', marginTop: 2 }}>
        <span style={{ color: '#50fa7b', fontWeight: 700, whiteSpace: 'pre' }}>
          {prompt}
        </span>
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={onKey}
          autoFocus
          spellCheck={false}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          style={{
            flex: 1,
            background: 'none',
            border: 'none',
            outline: 'none',
            color: C.text,
            fontFamily: 'inherit',
            fontSize: 13,
            caretColor: '#4ecdc4',
            padding: 0,
          }}
        />
        {buildState.running && (
          <span style={{ color: '#ffa500', fontSize: 11, marginLeft: 8 }}>
            [{Math.floor(buildState.progress)}%]
          </span>
        )}
      </div>
    </div>
  );
}
