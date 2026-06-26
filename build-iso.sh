#!/bin/bash
set -e

echo "=== NAS-PRO PRO MODE BUILDER ==="

WORKDIR=/tmp/nas-pro-pro
CONFIG=$WORKDIR/config
OUTPUT=nas-pro.iso

rm -rf $WORKDIR
mkdir -p $CONFIG

cd $CONFIG

# -----------------------------
# LIVE BUILD CONFIG (CORE OS)
# -----------------------------
lb config \
  --architectures amd64 \
  --debian-installer live \
  --archive-areas "main contrib non-free non-free-firmware" \
  --bootloader grub-efi \
  --binary-images iso-hybrid \
  --distribution bookworm

# -----------------------------
# PACKAGES (NAS SYSTEM)
# -----------------------------
mkdir -p config/package-lists

cat > config/package-lists/nas-pro.list.chroot <<EOF
systemd
systemd-sysv
dbus
sudo
nginx
openssh-server
curl
wget
git
samba
nfs-kernel-server
live-boot
live-config
initramfs-tools
EOF

# -----------------------------
# CUSTOM UI ROOT
# -----------------------------
mkdir -p config/includes.chroot/var/www/nas-pro

cat > config/includes.chroot/var/www/nas-pro/index.html <<EOF
<!DOCTYPE html>
<html>
<head>
  <title>NAS-PRO PRO MODE</title>
  <style>
    body {
      margin:0;
      background:#0b1220;
      color:#00ff99;
      font-family:Arial;
    }
    .center {
      position:absolute;
      top:50%;
      left:50%;
      transform:translate(-50%,-50%);
      text-align:center;
    }
    h1 { font-size:40px; }
  </style>
</head>
<body>
  <div class="center">
    <h1>NAS-PRO PRO MODE</h1>
    <p>TrueNAS-style system booted</p>
  </div>
</body>
</html>
EOF

# -----------------------------
# ENABLE NGINX SERVICE
# -----------------------------
mkdir -p config/includes.chroot/etc/systemd/system

cat > config/includes.chroot/etc/systemd/system/nas-ui.service <<EOF
[Unit]
Description=NAS-PRO UI
After=network.target

[Service]
ExecStart=/usr/sbin/nginx -g 'daemon off;'
Restart=always

[Install]
WantedBy=multi-user.target
EOF

# -----------------------------
# BUILD ISO
# -----------------------------
lb build

mv live-image-amd64.hybrid.iso ../../nas-pro.iso

echo "=== DONE PRO MODE ==="