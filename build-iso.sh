#!/bin/bash
set -e

echo "=== NAS-PRO PRO MODE v2 FIXED ==="

WORKDIR=/tmp/nas-pro-pro
CONFIG=$WORKDIR/config
OUTPUT=nas-pro.iso

rm -rf $WORKDIR
mkdir -p $CONFIG
cd $CONFIG

# -----------------------------
# FORCE CHECK live-build
# -----------------------------
if ! command -v lb >/dev/null 2>&1; then
    echo "Installing live-build..."
    sudo apt-get update
    sudo apt-get install -y live-build
fi

# -----------------------------
# CONFIG
# -----------------------------
lb config \
  --architectures amd64 \
  --distribution bookworm \
  --archive-areas "main contrib non-free non-free-firmware" \
  --binary-images iso-hybrid \
  --bootloader grub-efi

# -----------------------------
# PACKAGES
# -----------------------------
mkdir -p config/package-lists

cat > config/package-lists/nas.list.chroot <<EOF
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
EOF

# -----------------------------
# UI (UGREEN STYLE BASE)
# -----------------------------
mkdir -p config/includes.chroot/var/www/nas-pro

cat > config/includes.chroot/var/www/nas-pro/index.html <<EOF
<!DOCTYPE html>
<html>
<head>
  <title>NAS-PRO PRO MODE</title>
  <style>
    body { margin:0; background:#0a0f1f; color:#00ffcc; font-family:Arial; }
    .center { position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); text-align:center; }
    h1 { font-size:42px; }
  </style>
</head>
<body>
  <div class="center">
    <h1>NAS-PRO PRO MODE</h1>
    <p>Booted like TrueNAS / UGREEN</p>
  </div>
</body>
</html>
EOF

# -----------------------------
# SERVICE
# -----------------------------
mkdir -p config/includes.chroot/etc/systemd/system

cat > config/includes.chroot/etc/systemd/system/nas-ui.service <<EOF
[Unit]
Description=NAS UI
After=network.target

[Service]
ExecStart=/usr/sbin/nginx -g 'daemon off;'
Restart=always

[Install]
WantedBy=multi-user.target
EOF

# -----------------------------
# BUILD ISO (SAFE)
# -----------------------------
lb build

ISO_FILE=$(ls *.iso 2>/dev/null | head -n1)

if [ -z "$ISO_FILE" ]; then
    echo "ERROR: ISO not generated"
    exit 1
fi

mv "$ISO_FILE" ../../nas-pro.iso

echo "=== DONE PRO MODE ==="
ls -lh ../../nas-pro.iso