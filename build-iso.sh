#!/bin/bash
set -euo pipefail

echo "=== NAS-PRO v3 STABLE BUILDER ==="

DIST=bookworm
ARCH=amd64
LB_DIR=lb
OUTPUT=nas-pro.iso

rm -rf $LB_DIR
mkdir -p $LB_DIR
cd $LB_DIR

# -------------------------
# LIVE-BUILD CONFIG
# -------------------------
lb config \
  --distribution $DIST \
  --architecture $ARCH \
  --binary-images iso-hybrid \
  --bootloader grub-efi \
  --debian-installer false \
  --archive-areas "main contrib non-free non-free-firmware" \
  --firmware-chroot true \
  --initsystem systemd

# -------------------------
# PACKAGES (NO KERNEL!)
# -------------------------
mkdir -p config/package-lists

cat > config/package-lists/naspro.list.chroot <<EOF
systemd
systemd-sysv
dbus
sudo
nginx
openssh-server
network-manager
curl
wget
git
nodejs
npm
live-boot
live-config
EOF

# -------------------------
# UI INJECTION (React/Vite)
# -------------------------
mkdir -p config/includes.chroot/var/www/nas-pro

if [ -d "../dist" ]; then
  cp -r ../dist/* config/includes.chroot/var/www/nas-pro/
else
  echo "<h1>NAS-PRO v3 UI</h1>" > config/includes.chroot/var/www/nas-pro/index.html
fi

# -------------------------
# NGINX CONFIG
# -------------------------
mkdir -p config/includes.chroot/etc/nginx/sites-available

cat > config/includes.chroot/etc/nginx/sites-available/default <<EOF
server {
  listen 80;
  root /var/www/nas-pro;
  index index.html;

  location / {
    try_files \$uri \$uri/ /index.html;
  }

  location /api {
    proxy_pass http://localhost:3000;
  }
}
EOF

# -------------------------
# BACKEND (NODE API)
# -------------------------
mkdir -p config/includes.chroot/opt/naspro

cat > config/includes.chroot/opt/naspro/server.js <<EOF
const http = require('http');

http.createServer((req,res)=>{
  res.writeHead(200, {'Content-Type':'application/json'});
  res.end(JSON.stringify({status:'ok', system:'NAS-PRO v3'}));
}).listen(3000);
EOF

# -------------------------
# SYSTEMD API
# -------------------------
mkdir -p config/includes.chroot/etc/systemd/system

cat > config/includes.chroot/etc/systemd/system/naspro.service <<EOF
[Unit]
Description=NAS-PRO API
After=network.target

[Service]
ExecStart=/usr/bin/node /opt/naspro/server.js
Restart=always

[Install]
WantedBy=multi-user.target
EOF

# -------------------------
# BUILD ISO
# -------------------------
lb build

cd ..

ISO_FILE=$(ls lb/live-image-amd64.hybrid.iso 2>/dev/null || true)

if [ -f "$ISO_FILE" ]; then
  mv "$ISO_FILE" $OUTPUT
  echo "SUCCESS: $OUTPUT"
else
  echo "FAILED BUILD"
  exit 1
fi