#!/bin/bash
# ============================================================
# NAS-PRO ISO Builder v4 — poprawiony
# Wymaga: Ubuntu/Debian z sudo
# Użycie:  chmod +x build-iso.sh && sudo ./build-iso.sh
# ============================================================
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
log()  { echo -e "${GREEN}[OK]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
err()  { echo -e "${RED}[ERR]${NC} $1"; exit 1; }
step() { echo -e "\n${CYAN}=== $1 ===${NC}"; }

# ── Sprawdzenie root ─────────────────────────────────────
if [ "$EUID" -ne 0 ]; then
  err "Uruchom jako root: sudo ./build-iso.sh"
fi

# ── Katalogi robocze ─────────────────────────────────────
WORKDIR=/tmp/nas-pro-build
ROOTFS=$WORKDIR/rootfs
ISO=$WORKDIR/iso
OUTPUT="${1:-nas-pro.iso}"

rm -rf "$WORKDIR"
mkdir -p "$ROOTFS" "$ISO/boot/grub" "$ISO/live" "$ISO/EFI/boot"
log "Katalogi robocze: $WORKDIR"

# ── 1. Instalacja zależności hosta ───────────────────────
step "1/9 — Instalacja narzędzi"
apt-get update -qq
apt-get install -y -qq \
  debootstrap squashfs-tools xorriso \
  grub-pc-bin grub-efi-amd64-bin mtools \
  dosfstools curl || err "Nie można zainstalować narzędzi"
log "Narzędzia gotowe"

# ── 2. Bootstrap Debian Bookworm ─────────────────────────
step "2/9 — Bootstrap Debian Bookworm"
debootstrap --arch=amd64 --variant=minbase bookworm "$ROOTFS" \
  http://deb.debian.org/debian || err "debootstrap nie powiodło się"
log "Debian Bookworm zabootstrapowany"

# ── 3. Konfiguracja APT ──────────────────────────────────
step "3/9 — Konfiguracja APT"
cp /etc/resolv.conf "$ROOTFS/etc/resolv.conf"

cat > "$ROOTFS/etc/apt/sources.list" <<'EOF'
deb http://deb.debian.org/debian bookworm main contrib non-free non-free-firmware
deb http://security.debian.org/debian-security bookworm-security main contrib non-free non-free-firmware
deb http://deb.debian.org/debian bookworm-updates main contrib non-free non-free-firmware
EOF

# ── 4. Instalacja pakietów systemowych ──────────────────
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
  openssh-server curl wget \
  nginx nodejs npm \
  samba samba-common-bin nfs-kernel-server \
  minidlna ufw \
  htop nano vim \
  ca-certificates gnupg

# Instalacja Dockera
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/debian/gpg \
  -o /etc/apt/keyrings/docker.asc 2>/dev/null || true
chmod a+r /etc/apt/keyrings/docker.asc || true

if [ -f /etc/apt/keyrings/docker.asc ]; then
  echo \"deb [arch=amd64 signed-by=/etc/apt/keyrings/docker.asc] \
    https://download.docker.com/linux/debian bookworm stable\" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update -qq 2>/dev/null
  apt-get install -y -qq docker-ce docker-ce-cli containerd.io || warn 'Docker opcjonalny — pominięty'
fi
" || err "Instalacja pakietów nie powiodła się"
log "Pakiety systemowe zainstalowane"

# ── 5. Użytkownicy i konfiguracja ───────────────────────
step "5/9 — Użytkownicy i konfiguracja"
echo "nas-pro" > "$ROOTFS/etc/hostname"

cat > "$ROOTFS/etc/hosts" <<'EOF'
127.0.0.1  localhost
127.0.1.1  nas-pro nas-pro.local
EOF

chroot "$ROOTFS" /bin/bash -c "
# Użytkownik systemowy
useradd -m -s /bin/bash -G sudo,docker naspro 2>/dev/null || true
echo 'naspro:naspro' | chpasswd
echo 'root:naspro' | chpasswd

# Samba użytkownik
(echo naspro; echo naspro) | smbpasswd -a -s naspro 2>/dev/null || true

# Grupy
groupadd -f nasusers
usermod -aG nasusers naspro 2>/dev/null || true
"

# ── 6. Sieć ─────────────────────────────────────────────
cat > "$ROOTFS/etc/systemd/network/10-eth.network" <<'EOF'
[Match]
Name=e*

[Network]
DHCP=yes
EOF

ln -sf /run/systemd/resolve/stub-resolv.conf \
  "$ROOTFS/etc/resolv.conf" 2>/dev/null || true

# ── 7. Web UI (React build lub fallback) ─────────────────
step "6/9 — Instalacja Web UI"
mkdir -p "$ROOTFS/var/www/nas-pro"
mkdir -p "$ROOTFS/usr/share/naspro"

if [ -d "dist" ] && [ -f "dist/index.html" ]; then
  cp -r dist/* "$ROOTFS/var/www/nas-pro/"
  log "Skopiowano React build (dist/)"
else
  warn "Brak folderu dist/ — używam minimalnego UI"
  cat > "$ROOTFS/var/www/nas-pro/index.html" <<'HTMLEOF'
<!DOCTYPE html>
<html lang="pl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>UGOS Pro — NAS Management</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Inter',system-ui,sans-serif;background:#05070b;color:#e2eaf5;min-height:100vh;display:flex;align-items:center;justify-content:center}
  .card{background:#0f1521;border:1px solid #1a2535;border-radius:20px;padding:40px;width:380px;text-align:center;box-shadow:0 32px 80px rgba(0,0,0,.6)}
  .logo{width:60px;height:60px;background:linear-gradient(135deg,#00c2a8,#14b8a6);border-radius:16px;display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:900;color:#000;margin:0 auto 20px}
  h1{font-size:26px;font-weight:800;margin-bottom:4px}
  h1 span{color:#00c2a8}
  p{color:#64748b;font-size:13px;margin-bottom:32px}
  label{display:block;text-align:left;font-size:11px;color:#64748b;margin-bottom:6px}
  input{width:100%;padding:11px 14px;background:#0a1018;border:1px solid #1a2535;border-radius:9px;color:#e2eaf5;font-size:13px;margin-bottom:16px;outline:none;font-family:inherit}
  button{width:100%;padding:12px;background:linear-gradient(135deg,#00c2a8,#14b8a6);color:#000;border:none;border-radius:10px;font-size:14px;font-weight:800;cursor:pointer;margin-bottom:16px}
  .hint{background:#131c28;border:1px solid #1a2535;border-radius:10px;padding:12px;font-size:11px;color:#64748b;line-height:1.8;text-align:left}
  .hint b{color:#94a3b8}
</style>
</head>
<body>
<div class="card">
  <div class="logo">UG</div>
  <h1>UGOS <span>Pro</span></h1>
  <p>NAS Management Platform</p>
  <label>Nazwa użytkownika</label>
  <input type="text" placeholder="admin" value="admin">
  <label>Hasło</label>
  <input type="password" placeholder="••••••••" value="admin">
  <button onclick="alert('Zalogowano! Interfejs w budowie.')">Zaloguj się</button>
  <div class="hint">
    <b>Dane demo:</b><br>
    admin / admin<br>
    user / user123
  </div>
</div>
</body>
</html>
HTMLEOF
fi

# ── 8. Usługi systemd ────────────────────────────────────
step "7/9 — Konfiguracja usług"

# Nginx
cat > "$ROOTFS/etc/nginx/sites-available/default" <<'EOF'
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    root /var/www/nas-pro;
    index index.html;
    server_name _;

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

const server = http.createServer((req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.url === '/status' || req.url === '/') {
    res.end(JSON.stringify({
      system: 'UGOS Pro',
      version: '3.2.0',
      status: 'online',
      hostname: os.hostname(),
      uptime: os.uptime(),
      cpus: os.cpus().length,
      totalMem: os.totalmem(),
      freeMem: os.freemem(),
    }));
  } else {
    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Not found' }));
  }
});

server.listen(3000, '127.0.0.1', () => {
  console.log('UGOS Pro API on :3000');
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

[Install]
WantedBy=multi-user.target
EOF

# Autostart UI w przeglądarce przy logowaniu
mkdir -p "$ROOTFS/home/naspro/.config/autostart"
cat > "$ROOTFS/home/naspro/.config/autostart/naspro-ui.desktop" <<'EOF'
[Desktop Entry]
Type=Application
Name=UGOS Pro UI
Exec=chromium --kiosk --app=http://localhost
X-GNOME-Autostart-enabled=true
EOF

# Włączanie usług
chroot "$ROOTFS" /bin/bash -c "
systemctl enable ssh          2>/dev/null || true
systemctl enable nginx        2>/dev/null || true
systemctl enable naspro-api   2>/dev/null || true
systemctl enable docker       2>/dev/null || true
systemctl enable smbd         2>/dev/null || true
systemctl enable nmbd         2>/dev/null || true
systemctl enable minidlna     2>/dev/null || true
systemctl enable nfs-kernel-server 2>/dev/null || true
systemctl enable systemd-networkd  2>/dev/null || true
systemctl enable systemd-resolved  2>/dev/null || true
" || warn "Część usług nie włączona"

# ── Samba ────────────────────────────────────────────────
mkdir -p "$ROOTFS/srv/nas/public" "$ROOTFS/srv/nas/data"
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

# ── NFS ──────────────────────────────────────────────────
cat > "$ROOTFS/etc/exports" <<'EOF'
/srv/nas/public  *(rw,sync,no_subtree_check,no_root_squash)
EOF

# ── miniDLNA ─────────────────────────────────────────────
mkdir -p "$ROOTFS/srv/nas/public/video" \
         "$ROOTFS/srv/nas/public/music" \
         "$ROOTFS/srv/nas/public/photos"

cat > "$ROOTFS/etc/minidlna.conf" <<'EOF'
media_dir=V,/srv/nas/public/video
media_dir=A,/srv/nas/public/music
media_dir=P,/srv/nas/public/photos
friendly_name=UGOS Pro Media
inotify=yes
EOF

# ── UFW Firewall ─────────────────────────────────────────
chroot "$ROOTFS" /bin/bash -c "
ufw --force reset            2>/dev/null || true
ufw default deny incoming    2>/dev/null || true
ufw default allow outgoing   2>/dev/null || true
ufw allow 22/tcp   comment 'SSH'
ufw allow 80/tcp   comment 'Web UI'
ufw allow 443/tcp  comment 'HTTPS'
ufw allow 139/tcp  comment 'Samba'
ufw allow 445/tcp  comment 'Samba'
ufw allow 2049/tcp comment 'NFS'
ufw allow 8200/tcp comment 'miniDLNA'
ufw --force enable           2>/dev/null || true
" || warn "UFW nie skonfigurowane"

# ── 9. Kernel + initrd ───────────────────────────────────
step "8/9 — Kopiowanie kernela i initrd"
KERNEL=$(ls "$ROOTFS/boot"/vmlinuz-* 2>/dev/null | head -n1 || true)
INITRD=$(ls "$ROOTFS/boot"/initrd.img-* 2>/dev/null | head -n1 || true)

[ -z "$KERNEL" ] && err "Brak kernela w $ROOTFS/boot/"
[ -z "$INITRD" ] && err "Brak initrd w $ROOTFS/boot/"

cp "$KERNEL" "$ISO/boot/vmlinuz"
cp "$INITRD" "$ISO/boot/initrd.img"
log "Kernel: $KERNEL"
log "Initrd: $INITRD"

# ── SquashFS ─────────────────────────────────────────────
step "Tworzenie SquashFS rootfs"
mksquashfs "$ROOTFS" "$ISO/live/filesystem.squashfs" \
  -e boot -comp zstd -Xcompression-level 9 \
  -noappend -progress || \
mksquashfs "$ROOTFS" "$ISO/live/filesystem.squashfs" \
  -e boot -comp gzip -noappend -progress
log "SquashFS gotowy"

# ── GRUB config ──────────────────────────────────────────
cat > "$ISO/boot/grub/grub.cfg" <<'EOF'
set default=0
set timeout=5
set gfxmode=auto

insmod all_video
insmod gfxterm

terminal_output gfxterm

menuentry "UGOS Pro v3.2 — Start" {
    linux  /boot/vmlinuz boot=live components quiet splash \
           hostname=nas-pro username=naspro \
           keyboard-layouts=pl locales=pl_PL.UTF-8
    initrd /boot/initrd.img
}

menuentry "UGOS Pro — tryb diagnostyczny" {
    linux  /boot/vmlinuz boot=live components \
           hostname=nas-pro username=naspro
    initrd /boot/initrd.img
}

menuentry "Uruchom z dysku twardego" {
    chainloader +1
}
EOF

# ── Budowanie ISO ────────────────────────────────────────
step "9/9 — Budowanie ISO"
grub-mkrescue \
  --output="$OUTPUT" \
  --compress=xz \
  "$ISO" \
  -- -volid "NAS-PRO-v3" 2>/dev/null || \
grub-mkrescue -o "$OUTPUT" "$ISO"

log "ISO gotowy: $OUTPUT"
ls -lh "$OUTPUT"

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   UGOS Pro ISO zbudowany pomyślnie!          ║${NC}"
echo -e "${GREEN}║                                              ║${NC}"
echo -e "${GREEN}║   Plik:  $OUTPUT                 ║${NC}"
echo -e "${GREEN}║   Login: admin / admin                       ║${NC}"
echo -e "${GREEN}║   Web:   http://nas-pro.local  lub :80       ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════╝${NC}"
