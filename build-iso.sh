#!/bin/bash
# ============================================================
# NAS-PRO ISO Builder v5.1 — Kiosk + VM-fix (VMware/VBox/QEMU)
# Użycie: chmod +x build-iso-v5.sh && sudo ./build-iso-v5.sh
# ============================================================
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'
log()  { echo -e "${GREEN}[OK]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
err()  { echo -e "${RED}[ERR]${NC} $1"; exit 1; }
step() { echo -e "\n${CYAN}${BOLD}=== $1 ===${NC}"; }

[ "$EUID" -ne 0 ] && err "Uruchom jako root: sudo ./build-iso-v5.sh"

WORKDIR=/tmp/nas-pro-build
ROOTFS=$WORKDIR/rootfs
ISO=$WORKDIR/iso
OUTPUT="${1:-nas-pro.iso}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

rm -rf "$WORKDIR"
mkdir -p "$ROOTFS" "$ISO/boot/grub" "$ISO/live"
log "Katalogi robocze gotowe: $WORKDIR"

# ─────────────────────────────────────────────────────────────
step "1/9 — Narzędzia hosta"
apt-get update -qq
apt-get install -y -qq \
  debootstrap squashfs-tools xorriso \
  grub-pc-bin grub-efi-amd64-bin mtools dosfstools curl
log "Narzędzia OK"

# ─────────────────────────────────────────────────────────────
step "2/9 — Bootstrap Debian Bookworm"
debootstrap --arch=amd64 --variant=minbase bookworm "$ROOTFS" \
  http://deb.debian.org/debian || err "debootstrap nie powiodło się"
log "Debian Bookworm gotowy"

# ─────────────────────────────────────────────────────────────
step "3/9 — APT sources"
cp /etc/resolv.conf "$ROOTFS/etc/resolv.conf"
cat > "$ROOTFS/etc/apt/sources.list" <<'EOF'
deb http://deb.debian.org/debian bookworm main contrib non-free non-free-firmware
deb http://security.debian.org/debian-security bookworm-security main contrib non-free non-free-firmware
deb http://deb.debian.org/debian bookworm-updates main contrib non-free non-free-firmware
EOF

# ─────────────────────────────────────────────────────────────
step "4/9 — Instalacja pakietów (może chwilę potrwać...)"
chroot "$ROOTFS" /bin/bash << 'CHROOT'
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq

# ── Rdzeń ───────────────────────────────────────────────────
apt-get install -y -qq \
  linux-image-amd64 initramfs-tools \
  systemd systemd-sysv dbus \
  live-boot live-config live-config-systemd \
  sudo bash coreutils util-linux procps \
  iproute2 iputils-ping net-tools \
  openssh-server curl wget ca-certificates gnupg \
  nginx nodejs npm \
  samba samba-common-bin nfs-kernel-server \
  minidlna ufw htop nano vim \
  rsync zip unzip lsof

# ── X11 + sterowniki (metal + VM) ────────────────────────────
apt-get install -y -qq \
  xserver-xorg-core \
  xserver-xorg-input-all \
  xserver-xorg-video-fbdev \
  xserver-xorg-video-vesa \
  xserver-xorg-video-vmware \
  xserver-xorg-video-qxl \
  xserver-xorg-video-nouveau \
  xserver-xorg-video-intel \
  xinit x11-xserver-utils \
  openbox \
  chromium \
  fonts-noto fonts-noto-color-emoji \
  xterm \
  dbus-x11 \
  libgl1-mesa-dri \
  mesa-utils || true

# ── Docker ───────────────────────────────────────────────────
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/debian/gpg \
  -o /etc/apt/keyrings/docker.asc 2>/dev/null || true
chmod a+r /etc/apt/keyrings/docker.asc 2>/dev/null || true

if [ -f /etc/apt/keyrings/docker.asc ]; then
  echo 'deb [arch=amd64 signed-by=/etc/apt/keyrings/docker.asc] \
    https://download.docker.com/linux/debian bookworm stable' \
    > /etc/apt/sources.list.d/docker.list
  apt-get update -qq 2>/dev/null
  apt-get install -y -qq docker-ce docker-ce-cli containerd.io \
    docker-compose-plugin || echo '[WARN] Docker opcjonalny'
fi

apt-get clean
CHROOT
log "Pakiety zainstalowane"

# ─────────────────────────────────────────────────────────────
step "5/9 — Użytkownicy, hostname, sudoers"
echo "nas-pro" > "$ROOTFS/etc/hostname"
cat > "$ROOTFS/etc/hosts" <<'EOF'
127.0.0.1   localhost
127.0.1.1   nas-pro nas-pro.local
EOF

chroot "$ROOTFS" /bin/bash <<'CHROOT'
useradd -m -s /bin/bash naspro 2>/dev/null || true
echo "naspro:naspro" | chpasswd
echo "root:naspro"   | chpasswd
for g in sudo adm docker video audio plugdev; do
  groupadd -f $g 2>/dev/null || true
  usermod -aG $g naspro 2>/dev/null || true
done
groupadd -f nasusers 2>/dev/null || true
usermod -aG nasusers naspro 2>/dev/null || true
echo "naspro ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/naspro
chmod 440 /etc/sudoers.d/naspro
CHROOT
log "Użytkownicy OK"

# ─────────────────────────────────────────────────────────────
step "6/9 — Kiosk mode (auto-login → X11 → Chromium fullscreen)"

# Auto-login TTY1
mkdir -p "$ROOTFS/etc/systemd/system/getty@tty1.service.d"
cat > "$ROOTFS/etc/systemd/system/getty@tty1.service.d/autologin.conf" <<'EOF'
[Service]
ExecStart=
ExecStart=-/sbin/agetty --autologin naspro --noclear %I $TERM
Type=idle
RestartSec=0
TimeoutStopSec=0
EOF

# .bash_profile → startx na TTY1
cat > "$ROOTFS/home/naspro/.bash_profile" <<'EOF'
# Auto-start X na TTY1
if [ -z "$DISPLAY" ] && [ "$(tty)" = "/dev/tty1" ]; then
  # Ustaw zmienne środowiskowe
  export XAUTHORITY=/home/naspro/.Xauthority
  export HOME=/home/naspro
  # Czekaj na nginx (max 10s)
  for i in $(seq 1 10); do
    systemctl is-active nginx &>/dev/null && break
    sleep 1
  done
  # Startuj X
  exec startx /home/naspro/.xinitrc -- vt1 \
    -nolisten tcp \
    2>/var/log/naspro-x.log
fi
EOF

# .xinitrc → Openbox + Chromium kiosk
cat > "$ROOTFS/home/naspro/.xinitrc" <<'EOF'
#!/bin/bash
export DISPLAY=:0
export HOME=/home/naspro

# Wyłącz DPMS/blanking
xset s off
xset s noblank
xset -dpms
xset r rate 500 30

# Ustawienie rozdzielczości (auto)
if command -v xrandr &>/dev/null; then
  # Próbuj 1920x1080, fallback 1280x720
  xrandr --auto 2>/dev/null || true
fi

# Uruchom Openbox w tle
openbox --config-file /home/naspro/.config/openbox/rc.xml &
OPENBOX_PID=$!

# Czekaj aż Openbox wystartuje
sleep 1

# Czekaj aż nginx odpowiada (max 30s)
for i in $(seq 1 30); do
  curl -sf http://localhost/ &>/dev/null && break
  sleep 1
done

# Chromium kiosk fullscreen
exec chromium \
  --kiosk \
  --no-first-run \
  --no-default-browser-check \
  --disable-translate \
  --disable-infobars \
  --disable-features=TranslateUI,OverscrollHistoryNavigation \
  --disable-session-crashed-bubble \
  --disable-restore-session-state \
  --disable-background-networking \
  --disable-sync \
  --disable-default-apps \
  --disable-extensions \
  --autoplay-policy=no-user-gesture-required \
  --start-fullscreen \
  --window-size=1920,1080 \
  --window-position=0,0 \
  --user-data-dir=/tmp/chromium-kiosk \
  --app=http://localhost \
  2>/var/log/naspro-chromium.log
EOF
chmod +x "$ROOTFS/home/naspro/.xinitrc"

# Openbox minimal config
mkdir -p "$ROOTFS/home/naspro/.config/openbox"
cat > "$ROOTFS/home/naspro/.config/openbox/rc.xml" <<'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<openbox_config xmlns="http://openbox.org/3.4/rc">
  <theme>
    <name>Clearlooks</name>
  </theme>
  <desktops>
    <number>1</number>
  </desktops>
  <applications>
    <application class="*">
      <decor>no</decor>
      <maximized>yes</maximized>
      <focus>yes</focus>
    </application>
  </applications>
  <keyboard>
    <!-- Ctrl+Alt+T → xterm (do debugowania) -->
    <keybind key="C-A-t">
      <action name="Execute">
        <command>xterm</command>
      </action>
    </keybind>
    <!-- Ctrl+Alt+F2 → przełącz na TTY2 -->
    <keybind key="C-A-F2">
      <action name="Execute">
        <command>chvt 2</command>
      </action>
    </keybind>
  </keyboard>
  <mouse>
    <context name="Desktop">
      <mousebind button="Right" action="Press"></mousebind>
      <mousebind button="Middle" action="Press"></mousebind>
    </context>
  </mouse>
</openbox_config>
EOF

# Xorg config — wymuszony fbdev/vesa jako fallback (działa w każdej VM)
mkdir -p "$ROOTFS/etc/X11/xorg.conf.d"
cat > "$ROOTFS/etc/X11/xorg.conf.d/10-nas-pro.conf" <<'EOF'
Section "ServerFlags"
    Option "AutoAddDevices" "true"
    Option "AllowEmptyInput" "false"
EndSection

Section "Device"
    Identifier "VideoCard"
    Driver     "modesetting"
    Option     "AccelMethod" "none"
EndSection

Section "Screen"
    Identifier "Screen0"
    Device     "VideoCard"
    DefaultDepth 24
    SubSection "Display"
        Depth 24
        Modes "1920x1080" "1280x720" "1024x768"
    EndSubSection
EndSection

Section "InputDevice"
    Identifier "Keyboard"
    Driver     "evdev"
    Option     "XkbLayout" "pl"
EndSection
EOF

chroot "$ROOTFS" chown -R naspro:naspro /home/naspro
log "Kiosk mode skonfigurowany"

# ─────────────────────────────────────────────────────────────
step "7/9 — React UI + nginx + API"

mkdir -p "$ROOTFS/var/www/nas-pro"

if [ -d "$SCRIPT_DIR/dist" ] && [ -f "$SCRIPT_DIR/dist/index.html" ]; then
  cp -r "$SCRIPT_DIR/dist/." "$ROOTFS/var/www/nas-pro/"
  log "Skopiowano React build (dist/)"
else
  warn "Brak dist/ — używam fallback UI"
  mkdir -p "$ROOTFS/var/www/nas-pro"
  cat > "$ROOTFS/var/www/nas-pro/index.html" <<'HTMLEOF'
<!DOCTYPE html>
<html lang="pl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>UGOS Pro</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:system-ui,sans-serif;background:#05070b;color:#e2eaf5;
       min-height:100vh;display:flex;align-items:center;justify-content:center}
  .card{background:#0f1521;border:1px solid #1a2535;border-radius:20px;
        padding:44px 40px;width:400px;text-align:center;
        box-shadow:0 32px 80px rgba(0,0,0,.7)}
  .logo{width:64px;height:64px;background:linear-gradient(135deg,#00c2a8,#14b8a6);
        border-radius:18px;display:flex;align-items:center;justify-content:center;
        font-size:22px;font-weight:900;color:#000;margin:0 auto 20px}
  h1{font-size:28px;font-weight:800;margin-bottom:4px}
  h1 span{color:#00c2a8}
  .sub{color:#64748b;font-size:13px;margin-bottom:36px}
  label{display:block;text-align:left;font-size:11px;color:#64748b;
        text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px}
  input{width:100%;padding:12px 16px;background:#0a1018;
        border:1.5px solid #1a2535;border-radius:10px;color:#e2eaf5;
        font-size:14px;margin-bottom:18px;outline:none;font-family:inherit;
        transition:border-color .15s}
  input:focus{border-color:#00c2a8}
  button{width:100%;padding:13px;background:linear-gradient(135deg,#00c2a8,#14b8a6);
         color:#000;border:none;border-radius:11px;font-size:15px;
         font-weight:800;cursor:pointer;margin-bottom:20px;letter-spacing:.3px}
  .hint{background:#131c28;border:1px solid #1a2535;border-radius:10px;
        padding:14px;font-size:12px;color:#64748b;line-height:2;text-align:left}
  .hint b{color:#94a3b8}
</style>
</head>
<body>
<div class="card">
  <div class="logo">UG</div>
  <h1>UGOS <span>Pro</span></h1>
  <p class="sub">NAS Management Platform</p>
  <label>Nazwa użytkownika</label>
  <input type="text" id="u" value="admin" autocomplete="off">
  <label>Hasło</label>
  <input type="password" id="p" value="admin">
  <button onclick="login()">Zaloguj się</button>
  <div class="hint">
    <b>Dane demo:</b><br>
    admin / admin (+ 2FA: 123456)<br>
    user / user123
  </div>
</div>
<script>
function login(){
  const u=document.getElementById('u').value;
  const p=document.getElementById('p').value;
  if((u==='admin'&&p==='admin')||(u==='user'&&p==='user123')){
    document.body.innerHTML='<div style="color:#00c2a8;font-size:24px;font-weight:800;position:fixed;top:50%;left:50%;transform:translate(-50%,-50%)">Ładowanie UGOS Pro...</div>';
  } else {
    document.querySelector('input[type=password]').style.borderColor='#ef4444';
    setTimeout(()=>document.querySelector('input[type=password]').style.borderColor='#1a2535',1500);
  }
}
document.addEventListener('keydown',e=>{ if(e.key==='Enter') login(); });
</script>
</body>
</html>
HTMLEOF
fi

# Nginx config
cat > "$ROOTFS/etc/nginx/sites-available/default" <<'EOF'
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    root /var/www/nas-pro;
    index index.html;
    server_name _;
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:3000/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
EOF

# API Node.js backend
mkdir -p "$ROOTFS/opt/naspro"
cat > "$ROOTFS/opt/naspro/server.js" <<'EOF'
const http = require('http');
const os   = require('os');
const { execSync } = require('child_process');
const fs   = require('fs');
const url  = require('url');

function safeExec(cmd) {
  try { return execSync(cmd, { encoding: 'utf8', timeout: 3000 }).trim(); }
  catch { return 'N/A'; }
}

function getStatus() {
  return {
    system:        'UGOS Pro',
    version:       '3.2.0',
    status:        'online',
    hostname:      os.hostname(),
    uptime:        os.uptime(),
    cpus:          os.cpus().length,
    cpuModel:      os.cpus()[0]?.model || 'Unknown',
    totalMem:      os.totalmem(),
    freeMem:       os.freemem(),
    platform:      os.platform(),
    arch:          os.arch(),
    loadAvg:       os.loadavg(),
    dockerVersion: safeExec('docker --version'),
    ip:            safeExec("hostname -I | awk '{print $1}'"),
    diskInfo:      safeExec("df -h /srv/nas 2>/dev/null | tail -1"),
    nasPath:       '/srv/nas',
  };
}

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    res.writeHead(204); res.end(); return;
  }

  const pathname = url.parse(req.url).pathname;

  if (pathname === '/status' || pathname === '/') {
    res.end(JSON.stringify(getStatus()));
  } else if (pathname === '/disks') {
    res.end(JSON.stringify({
      disks: safeExec("lsblk -J -o NAME,SIZE,TYPE,MOUNTPOINT 2>/dev/null")
    }));
  } else if (pathname === '/docker/ps') {
    res.end(JSON.stringify({
      containers: safeExec("docker ps --format '{{json .}}' 2>/dev/null")
    }));
  } else {
    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Not found' }));
  }
});

server.listen(3000, '127.0.0.1', () => {
  console.log('[UGOS Pro API] :3000');
});
EOF

# Systemd serwis API
cat > "$ROOTFS/etc/systemd/system/naspro-api.service" <<'EOF'
[Unit]
Description=UGOS Pro API Backend
After=network.target
Wants=network.target

[Service]
Type=simple
User=naspro
WorkingDirectory=/opt/naspro
ExecStart=/usr/bin/node /opt/naspro/server.js
Restart=always
RestartSec=3
StandardOutput=journal
StandardError=journal
SyslogIdentifier=naspro-api

[Install]
WantedBy=multi-user.target
EOF

# ─────────────────────────────────────────────────────────────
step "8/9 — Sieć, SMB, NFS, DLNA, Firewall, Serwisy"

# Sieć
cat > "$ROOTFS/etc/systemd/network/10-eth.network" <<'EOF'
[Match]
Name=e*

[Network]
DHCP=yes
DNS=8.8.8.8
DNS=1.1.1.1
EOF
ln -sf /run/systemd/resolve/stub-resolv.conf \
  "$ROOTFS/etc/resolv.conf" 2>/dev/null || true

# Foldery NAS
mkdir -p "$ROOTFS/srv/nas/public/video" \
         "$ROOTFS/srv/nas/public/music"  \
         "$ROOTFS/srv/nas/public/photos" \
         "$ROOTFS/srv/nas/data"
chmod 777 "$ROOTFS/srv/nas/public"

# Samba
chroot "$ROOTFS" /bin/bash -c "
groupadd -f nasusers 2>/dev/null || true
(echo naspro; echo naspro) | smbpasswd -a -s naspro 2>/dev/null || true
"
cat > "$ROOTFS/etc/samba/smb.conf" <<'EOF'
[global]
   workgroup = WORKGROUP
   server string = UGOS Pro NAS
   netbios name = NAS-PRO
   security = user
   map to guest = Bad User
   log level = 1

[Public]
   path = /srv/nas/public
   browsable = yes
   writable = yes
   guest ok = yes
   create mask = 0666
   directory mask = 0777

[Data]
   path = /srv/nas/data
   browsable = yes
   writable = yes
   valid users = @nasusers
   create mask = 0660
   directory mask = 0770
EOF

# NFS
cat > "$ROOTFS/etc/exports" <<'EOF'
/srv/nas/public  *(rw,sync,no_subtree_check,no_root_squash)
EOF

# miniDLNA
cat > "$ROOTFS/etc/minidlna.conf" <<'EOF'
media_dir=V,/srv/nas/public/video
media_dir=A,/srv/nas/public/music
media_dir=P,/srv/nas/public/photos
friendly_name=UGOS Pro Media
inotify=yes
notify_interval=300
EOF

# Włącz serwisy
chroot "$ROOTFS" /bin/bash -c "
systemctl enable ssh                2>/dev/null || true
systemctl enable nginx              2>/dev/null || true
systemctl enable naspro-api         2>/dev/null || true
systemctl enable docker             2>/dev/null || true
systemctl enable smbd               2>/dev/null || true
systemctl enable nmbd               2>/dev/null || true
systemctl enable minidlna           2>/dev/null || true
systemctl enable nfs-kernel-server  2>/dev/null || true
systemctl enable systemd-networkd   2>/dev/null || true
systemctl enable systemd-resolved   2>/dev/null || true
"

# UFW firewall
chroot "$ROOTFS" /bin/bash -c "
ufw --force reset          2>/dev/null || true
ufw default deny incoming  2>/dev/null || true
ufw default allow outgoing 2>/dev/null || true
ufw allow 22/tcp   2>/dev/null || true
ufw allow 80/tcp   2>/dev/null || true
ufw allow 443/tcp  2>/dev/null || true
ufw allow 137/udp  2>/dev/null || true
ufw allow 138/udp  2>/dev/null || true
ufw allow 139/tcp  2>/dev/null || true
ufw allow 445/tcp  2>/dev/null || true
ufw allow 2049/tcp 2>/dev/null || true
ufw allow 8200/tcp 2>/dev/null || true
ufw --force enable 2>/dev/null || true
" || warn "UFW opcjonalny"

log "Serwisy skonfigurowane"

# ─────────────────────────────────────────────────────────────
step "9/9 — Kernel, SquashFS, GRUB, ISO"

KERNEL=$(ls "$ROOTFS/boot"/vmlinuz-* 2>/dev/null | head -n1)
INITRD=$(ls "$ROOTFS/boot"/initrd.img-* 2>/dev/null | head -n1)
[ -z "$KERNEL" ] && err "Brak kernela!"
[ -z "$INITRD" ] && err "Brak initrd!"

cp "$KERNEL" "$ISO/boot/vmlinuz"
cp "$INITRD" "$ISO/boot/initrd.img"
log "Kernel: $(basename $KERNEL)"

echo "Tworzenie SquashFS (może potrwać kilka minut)..."
mksquashfs "$ROOTFS" "$ISO/live/filesystem.squashfs" \
  -e boot \
  -comp zstd -Xcompression-level 9 \
  -noappend -progress || \
mksquashfs "$ROOTFS" "$ISO/live/filesystem.squashfs" \
  -e boot \
  -comp gzip \
  -noappend -progress
log "SquashFS gotowy"

cat > "$ISO/boot/grub/grub.cfg" <<'EOF'
set default=0
set timeout=5
set gfxmode=auto
insmod all_video
insmod gfxterm
terminal_output gfxterm

menuentry "UGOS Pro v3.2 — Kiosk Mode (zalecany)" --class nas {
    linux  /boot/vmlinuz boot=live components quiet splash \
           hostname=nas-pro username=naspro \
           keyboard-layouts=pl locales=pl_PL.UTF-8 \
           nomodeset
    initrd /boot/initrd.img
}

menuentry "UGOS Pro — tryb graficzny KMS" --class nas {
    linux  /boot/vmlinuz boot=live components quiet \
           hostname=nas-pro username=naspro \
           keyboard-layouts=pl locales=pl_PL.UTF-8
    initrd /boot/initrd.img
}

menuentry "UGOS Pro — konsola diagnostyczna" --class nas {
    linux  /boot/vmlinuz boot=live components \
           hostname=nas-pro username=naspro
    initrd /boot/initrd.img
}

menuentry "Uruchom z dysku twardego" {
    chainloader +1
}
EOF

echo "Budowanie ISO..."
grub-mkrescue -o "$OUTPUT" "$ISO" -- -volid "NAS-PRO-v3" 2>/dev/null || \
grub-mkrescue -o "$OUTPUT" "$ISO"

ls -lh "$OUTPUT"

echo ""
echo -e "${GREEN}${BOLD}"
echo "╔══════════════════════════════════════════════════════════╗"
echo "║   UGOS Pro ISO — GOTOWY!                                ║"
echo "╠══════════════════════════════════════════════════════════╣"
echo "║                                                          ║"
echo "║   ► Uruchom ISO w VMware/VirtualBox/QEMU                ║"
echo "║   ► Wybierz: 'Kiosk Mode (zalecany)'                    ║"
echo "║   ► System auto-loguje → X11 startuje → Chromium       ║"
echo "║   ► UI pojawia się na pełnym ekranie automatycznie      ║"
echo "║                                                          ║"
echo "║   Login web UI:  admin / admin  (2FA: 123456)           ║"
echo "║   SSH:           ssh naspro@<IP>  (hasło: naspro)      ║"
echo "║   SMB:           \\\\nas-pro\\Public                     ║"
echo "║   NFS:           <IP>:/srv/nas/public                   ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo -e "${NC}"