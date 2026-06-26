#!/bin/bash
# ============================================================
# NAS-PRO ISO Builder v5 — Kiosk Mode (auto X11 + Chromium)
# Wymaga: Ubuntu/Debian z sudo
# Użycie:  chmod +x build-iso.sh && sudo ./build-iso.sh
# ============================================================
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
log()  { echo -e "${GREEN}[OK]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
err()  { echo -e "${RED}[ERR]${NC} $1"; exit 1; }
step() { echo -e "\n${CYAN}=== $1 ===${NC}"; }

[ "$EUID" -ne 0 ] && err "Uruchom jako root: sudo ./build-iso.sh"

WORKDIR=/tmp/nas-pro-build
ROOTFS=$WORKDIR/rootfs
ISO=$WORKDIR/iso
OUTPUT="${1:-nas-pro.iso}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

rm -rf "$WORKDIR"
mkdir -p "$ROOTFS" "$ISO/boot/grub" "$ISO/live"
log "Katalogi robocze gotowe"

# ── 1. Narzędzia hosta ───────────────────────────────────
step "1/9 — Instalacja narzędzi"
apt-get update -qq
apt-get install -y -qq \
  debootstrap squashfs-tools xorriso \
  grub-pc-bin grub-efi-amd64-bin mtools dosfstools curl
log "Narzędzia gotowe"

# ── 2. Bootstrap Debian Bookworm ─────────────────────────
step "2/9 — Bootstrap Debian Bookworm"
debootstrap --arch=amd64 --variant=minbase bookworm "$ROOTFS" \
  http://deb.debian.org/debian || err "debootstrap nie powiodło się"
log "Debian Bookworm zabootstrapowany"

# ── 3. APT sources ───────────────────────────────────────
step "3/9 — Konfiguracja APT"
cp /etc/resolv.conf "$ROOTFS/etc/resolv.conf"
cat > "$ROOTFS/etc/apt/sources.list" <<'EOF'
deb http://deb.debian.org/debian bookworm main contrib non-free non-free-firmware
deb http://security.debian.org/debian-security bookworm-security main contrib non-free non-free-firmware
deb http://deb.debian.org/debian bookworm-updates main contrib non-free non-free-firmware
EOF

# ── 4. Instalacja pakietów ───────────────────────────────
step "4/9 — Instalacja pakietów systemowych"
chroot "$ROOTFS" /bin/bash -c "
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq

# Rdzeń systemu
apt-get install -y -qq \
  linux-image-amd64 initramfs-tools \
  systemd systemd-sysv dbus \
  live-boot live-config live-config-systemd \
  sudo bash coreutils util-linux procps \
  iproute2 iputils-ping net-tools \
  openssh-server curl wget ca-certificates gnupg \
  nginx nodejs npm \
  samba samba-common-bin nfs-kernel-server \
  minidlna ufw htop nano

# X11 + kiosk (bez pełnego DE — tylko to co potrzebne)
apt-get install -y -qq \
  xserver-xorg-core xserver-xorg-input-all \
  xserver-xorg-video-fbdev xserver-xorg-video-vesa \
  xterm openbox chromium \
  xinit x11-xserver-utils

# Instalacja Dockera
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/debian/gpg \
  -o /etc/apt/keyrings/docker.asc 2>/dev/null || true
chmod a+r /etc/apt/keyrings/docker.asc 2>/dev/null || true

if [ -f /etc/apt/keyrings/docker.asc ]; then
  echo 'deb [arch=amd64 signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/debian bookworm stable' \
    > /etc/apt/sources.list.d/docker.list
  apt-get update -qq 2>/dev/null
  apt-get install -y -qq docker-ce docker-ce-cli containerd.io || echo '[WARN] Docker opcjonalny'
fi
" || err "Instalacja pakietów nie powiodła się"
log "Pakiety systemowe zainstalowane"

# ── 5. Użytkownicy ───────────────────────────────────────
step "5/9 — Użytkownicy i hostname"
echo "nas-pro" > "$ROOTFS/etc/hostname"
cat > "$ROOTFS/etc/hosts" <<'EOF'
127.0.0.1  localhost
127.0.1.1  nas-pro nas-pro.local
EOF

chroot "$ROOTFS" /bin/bash -c "
useradd -m -s /bin/bash -G sudo naspro 2>/dev/null || true
echo 'naspro:naspro' | chpasswd
echo 'root:naspro'   | chpasswd
groupadd -f docker 2>/dev/null || true
usermod -aG docker naspro 2>/dev/null || true
groupadd -f nasusers 2>/dev/null || true
usermod -aG nasusers naspro 2>/dev/null || true
# Pozwól naspro uruchamiać X bez hasła sudo
echo 'naspro ALL=(ALL) NOPASSWD:ALL' >> /etc/sudoers.d/naspro
"

# ── 6. Kiosk: auto-login + auto X11 + Chromium ──────────
step "6/9 — Konfiguracja kiosk mode"

# Auto-login na TTY1
mkdir -p "$ROOTFS/etc/systemd/system/getty@tty1.service.d"
cat > "$ROOTFS/etc/systemd/system/getty@tty1.service.d/override.conf" <<'EOF'
[Service]
ExecStart=
ExecStart=-/sbin/agetty --autologin naspro --noclear %I $TERM
Type=idle
EOF

# .bash_profile — startuje X jeśli na TTY1
cat > "$ROOTFS/home/naspro/.bash_profile" <<'EOF'
# Startuj kiosk tylko na TTY1
if [ -z "$DISPLAY" ] && [ "$(tty)" = "/dev/tty1" ]; then
  exec startx /home/naspro/.xinitrc -- vt1 2>/var/log/naspro-x.log
fi
EOF

# .xinitrc — X11 startuje Openbox + Chromium kiosk
cat > "$ROOTFS/home/naspro/.xinitrc" <<'EOF'
#!/bin/bash
# Wyłącz wygaszacz i blank
xset s off
xset s noblank
xset -dpms

# Ukryj kursor myszy po 1 sekundzie nieaktywności
# (wymaga unclutter, opcjonalny)
unclutter -idle 1 -root &>/dev/null &

# Openbox jako WM (bez paska, bez menu)
openbox &

# Poczekaj na nginx/api
sleep 3

# Chromium w trybie kiosk fullscreen
exec chromium \
  --kiosk \
  --no-first-run \
  --disable-translate \
  --disable-infobars \
  --disable-features=TranslateUI \
  --disable-session-crashed-bubble \
  --disable-restore-session-state \
  --autoplay-policy=no-user-gesture-required \
  --start-fullscreen \
  --app=http://localhost \
  2>/var/log/naspro-chromium.log
EOF
chmod +x "$ROOTFS/home/naspro/.xinitrc"

# Openbox config — brak dekoracji, brak menu
mkdir -p "$ROOTFS/home/naspro/.config/openbox"
cat > "$ROOTFS/home/naspro/.config/openbox/rc.xml" <<'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<openbox_config xmlns="http://openbox.org/3.4/rc">
  <applications>
    <application class="*">
      <decor>no</decor>
      <maximized>yes</maximized>
    </application>
  </applications>
  <mouse>
    <context name="Desktop">
      <mousebind button="Right" action="Press"></mousebind>
    </context>
  </mouse>
</openbox_config>
EOF

chroot "$ROOTFS" chown -R naspro:naspro /home/naspro

# ── 7. React UI → nginx ──────────────────────────────────
step "7/9 — Instalacja React UI"
mkdir -p "$ROOTFS/var/www/nas-pro"

if [ -d "$SCRIPT_DIR/dist" ] && [ -f "$SCRIPT_DIR/dist/index.html" ]; then
  cp -r "$SCRIPT_DIR/dist/." "$ROOTFS/var/www/nas-pro/"
  log "Skopiowano React build z dist/"
else
  warn "Brak dist/ — używam fallback login UI"
  # Minimalne UI (wygląd jak UGOS Pro)
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
       min-height:100vh;display:flex;align-items:center;justify-content:center;
       user-select:none}
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
         font-weight:800;cursor:pointer;margin-bottom:20px;letter-spacing:.3px;
         transition:opacity .15s}
  button:hover{opacity:.9}
  .hint{background:#131c28;border:1px solid #1a2535;border-radius:10px;
        padding:14px;font-size:12px;color:#64748b;line-height:2;text-align:left}
  .hint b{color:#94a3b8}
  .status{position:fixed;top:16px;right:20px;display:flex;align-items:center;
          gap:8px;font-size:12px;color:#22c55e}
  .dot{width:7px;height:7px;border-radius:50%;background:#22c55e;animation:pulse 2s infinite}
  @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
  .ip{position:fixed;bottom:16px;right:20px;font-size:11px;color:#1a2535}
</style>
</head>
<body>
<div class="status"><div class="dot"></div> System online</div>
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
    admin / admin &nbsp;(+ 2FA: 123456)<br>
    user / user123
  </div>
</div>
<div class="ip" id="ipaddr"></div>
<script>
function login(){
  const u=document.getElementById('u').value;
  const p=document.getElementById('p').value;
  if((u==='admin'&&p==='admin')||(u==='user'&&p==='user123')){
    document.body.innerHTML='<div style="color:#00c2a8;font-size:24px;font-weight:800;position:fixed;top:50%;left:50%;transform:translate(-50%,-50%)">Ładowanie UGOS Pro...</div>';
    setTimeout(()=>location.reload(),2000);
  } else {
    document.querySelector('input[type=password]').style.borderColor='#ef4444';
    setTimeout(()=>document.querySelector('input[type=password]').style.borderColor='#1a2535',1500);
  }
}
document.addEventListener('keydown',e=>{ if(e.key==='Enter') login(); });

fetch('/api/status').then(r=>r.json()).then(d=>{
  document.getElementById('ipaddr').textContent='IP: '+(d.ip||'N/A');
}).catch(()=>{});
</script>
</body>
</html>
HTMLEOF
fi

# ── 8. Serwisy ───────────────────────────────────────────
step "8/9 — Konfiguracja serwisów"

# Nginx
cat > "$ROOTFS/etc/nginx/sites-available/default" <<'EOF'
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    root /var/www/nas-pro;
    index index.html;
    server_name _;
    gzip on;
    gzip_types text/plain text/css application/json application/javascript;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:3000/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
EOF

# API Node.js
mkdir -p "$ROOTFS/opt/naspro"
cat > "$ROOTFS/opt/naspro/server.js" <<'EOF'
const http = require('http');
const os   = require('os');
const { execSync } = require('child_process');

function safeExec(cmd) {
  try { return execSync(cmd, { encoding: 'utf8' }).trim(); }
  catch { return 'N/A'; }
}

const server = http.createServer((req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.url === '/status' || req.url === '/') {
    res.end(JSON.stringify({
      system:        'UGOS Pro',
      version:       '3.2.0',
      status:        'online',
      hostname:      os.hostname(),
      uptime:        os.uptime(),
      cpus:          os.cpus().length,
      totalMem:      os.totalmem(),
      freeMem:       os.freemem(),
      dockerVersion: safeExec('docker --version'),
      ip:            safeExec("hostname -I | awk '{print $1}'"),
    }));
  } else {
    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Not found' }));
  }
});

server.listen(3000, '127.0.0.1', () => {
  console.log('[UGOS Pro API] Nasłuchuje na :3000');
});
EOF

# Serwis API
cat > "$ROOTFS/etc/systemd/system/naspro-api.service" <<'EOF'
[Unit]
Description=UGOS Pro API Backend
After=network.target
Wants=network.target

[Service]
Type=simple
User=naspro
ExecStart=/usr/bin/node /opt/naspro/server.js
Restart=on-failure
RestartSec=5
StandardOutput=journal
StandardError=journal
SyslogIdentifier=naspro-api

[Install]
WantedBy=multi-user.target
EOF

# Sieć
cat > "$ROOTFS/etc/systemd/network/10-eth.network" <<'EOF'
[Match]
Name=e*

[Network]
DHCP=yes
EOF
ln -sf /run/systemd/resolve/stub-resolv.conf "$ROOTFS/etc/resolv.conf" 2>/dev/null || true

# Samba / NFS
mkdir -p "$ROOTFS/srv/nas/public/video" "$ROOTFS/srv/nas/public/music" \
         "$ROOTFS/srv/nas/public/photos" "$ROOTFS/srv/nas/data"
chmod 777 "$ROOTFS/srv/nas/public"

cat > "$ROOTFS/etc/samba/smb.conf" <<'EOF'
[global]
   workgroup = WORKGROUP
   server string = UGOS Pro NAS
   netbios name = NAS-PRO
   security = user
   map to guest = Bad User

[Public]
   path = /srv/nas/public
   browsable = yes
   writable = yes
   guest ok = yes

[Data]
   path = /srv/nas/data
   browsable = yes
   writable = yes
   valid users = @nasusers
EOF

cat > "$ROOTFS/etc/exports" <<'EOF'
/srv/nas/public  *(rw,sync,no_subtree_check,no_root_squash)
EOF

cat > "$ROOTFS/etc/minidlna.conf" <<'EOF'
media_dir=V,/srv/nas/public/video
media_dir=A,/srv/nas/public/music
media_dir=P,/srv/nas/public/photos
friendly_name=UGOS Pro Media
inotify=yes
EOF

# Włącz serwisy
chroot "$ROOTFS" /bin/bash -c "
systemctl enable ssh                 2>/dev/null || true
systemctl enable nginx               2>/dev/null || true
systemctl enable naspro-api          2>/dev/null || true
systemctl enable docker              2>/dev/null || true
systemctl enable smbd nmbd           2>/dev/null || true
systemctl enable minidlna            2>/dev/null || true
systemctl enable nfs-kernel-server   2>/dev/null || true
systemctl enable systemd-networkd    2>/dev/null || true
systemctl enable systemd-resolved    2>/dev/null || true
" || warn "Część usług pominięta"
log "Serwisy skonfigurowane"

# ── 9. Kernel + SquashFS + GRUB ─────────────────────────
step "9/9 — Kernel, SquashFS, GRUB"

KERNEL=$(ls "$ROOTFS/boot"/vmlinuz-* 2>/dev/null | head -n1)
INITRD=$(ls "$ROOTFS/boot"/initrd.img-* 2>/dev/null | head -n1)
[ -z "$KERNEL" ] && err "Brak kernela!"
[ -z "$INITRD" ] && err "Brak initrd!"
cp "$KERNEL" "$ISO/boot/vmlinuz"
cp "$INITRD" "$ISO/boot/initrd.img"
log "Kernel: $(basename $KERNEL)"

mksquashfs "$ROOTFS" "$ISO/live/filesystem.squashfs" \
  -e boot -comp zstd -Xcompression-level 9 \
  -noappend -progress || \
mksquashfs "$ROOTFS" "$ISO/live/filesystem.squashfs" \
  -e boot -comp gzip -noappend -progress
log "SquashFS gotowy"

cat > "$ISO/boot/grub/grub.cfg" <<'EOF'
set default=0
set timeout=5
set gfxmode=auto
insmod all_video
insmod gfxterm
terminal_output gfxterm

menuentry "UGOS Pro v3.2 — Start (kiosk)" {
    linux  /boot/vmlinuz boot=live components quiet splash \
           hostname=nas-pro username=naspro \
           keyboard-layouts=pl locales=pl_PL.UTF-8
    initrd /boot/initrd.img
}

menuentry "UGOS Pro — tryb diagnostyczny (konsola)" {
    linux  /boot/vmlinuz boot=live components \
           hostname=nas-pro username=naspro
    initrd /boot/initrd.img
}

menuentry "Uruchom z dysku twardego" {
    chainloader +1
}
EOF

grub-mkrescue -o "$OUTPUT" "$ISO" -- -volid "NAS-PRO-v3" 2>/dev/null || \
grub-mkrescue -o "$OUTPUT" "$ISO"

log "ISO gotowy: $OUTPUT"
ls -lh "$OUTPUT"

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   UGOS Pro ISO zbudowany!                                ║${NC}"
echo -e "${GREEN}║                                                          ║${NC}"
echo -e "${GREEN}║   ► Auto-login jako: naspro                              ║${NC}"
echo -e "${GREEN}║   ► X11 + Chromium kiosk startuje automatycznie         ║${NC}"
echo -e "${GREEN}║   ► Web UI: http://localhost (pełny ekran)               ║${NC}"
echo -e "${GREEN}║   ► SSH:    ssh naspro@<IP>  (hasło: naspro)            ║${NC}"
echo -e "${GREEN}║   ► SMB:    \\\\nas-pro\\Public                           ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════╝${NC}"