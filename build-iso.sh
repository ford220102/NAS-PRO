#!/bin/bash
set -e

echo "=== NAS-PRO FULL ISO BUILDER (STABLE) ==="

WORKDIR=/tmp/nas-pro
ROOTFS=$WORKDIR/rootfs
ISO=$WORKDIR/iso
OUTPUT=nas-pro.iso

rm -rf $WORKDIR
mkdir -p $ROOTFS $ISO/boot/grub $ISO/live

# -----------------------------
# 1. ROOTFS (NO KERNEL HERE!)
# -----------------------------
debootstrap --arch=amd64 bookworm $ROOTFS http://deb.debian.org/debian

cat > $ROOTFS/etc/apt/sources.list <<EOF
deb http://deb.debian.org/debian bookworm main contrib non-free non-free-firmware
deb http://security.debian.org/debian-security bookworm-security main contrib non-free non-free-firmware
EOF

chroot $ROOTFS apt-get update

chroot $ROOTFS apt-get install -y \
  systemd systemd-sysv dbus sudo \
  nginx openssh-server curl wget git \
  samba nfs-kernel-server \
  initramfs-tools live-boot live-config

# -----------------------------
# 2. NAS-PRO UI (WEB OS)
# -----------------------------
echo "nas-pro" > $ROOTFS/etc/hostname

mkdir -p $ROOTFS/var/www/nas-pro

if [ -d "dist" ]; then
    cp -r dist/* $ROOTFS/var/www/nas-pro/
else
    cat > $ROOTFS/var/www/nas-pro/index.html <<EOF
<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>NAS-PRO OS</title>
  <style>
    body {
      margin:0;
      background:#0b1220;
      color:white;
      font-family:Arial;
      display:flex;
      align-items:center;
      justify-content:center;
      height:100vh;
      flex-direction:column;
    }
    .card {
      padding:20px;
      background:#111827;
      border-radius:12px;
    }
  </style>
</head>
<body>
  <div class="card">
    <h1>NAS-PRO OS</h1>
    <p>System running ✔</p>
  </div>
</body>
</html>
EOF
fi

# nginx config (OS UI root)
cat > $ROOTFS/etc/nginx/sites-available/default <<EOF
server {
    listen 80 default_server;
    root /var/www/nas-pro;
    index index.html;

    location / {
        try_files \$uri /index.html;
    }
}
EOF

# systemd service (UI AUTO START)
cat > $ROOTFS/etc/systemd/system/nas-ui.service <<EOF
[Unit]
Description=NAS-PRO UI Layer
After=network.target

[Service]
ExecStart=/usr/sbin/nginx -g 'daemon off;'
Restart=always

[Install]
WantedBy=multi-user.target
EOF

chroot $ROOTFS systemctl enable nas-ui.service
chroot $ROOTFS systemctl enable ssh

# -----------------------------
# 3. KERNEL + INITRAMFS (HOST SAFE)
# -----------------------------
chroot $ROOTFS update-initramfs -u -k all

VMLINUX=$(find /boot -name "vmlinuz*" | head -n1)
INITRD=$(find /boot -name "initrd.img*" | head -n1)

if [ -z "$VMLINUX" ] || [ -z "$INITRD" ]; then
    echo "ERROR: kernel not found on host"
    exit 1
fi

cp "$VMLINUX" $ISO/boot/vmlinuz
cp "$INITRD" $ISO/boot/initrd.img

# -----------------------------
# 4. SQUASHFS (LIVE SYSTEM)
# -----------------------------
mksquashfs $ROOTFS $ISO/live/filesystem.squashfs -e boot

# -----------------------------
# 5. GRUB BOOT MENU
# -----------------------------
cat > $ISO/boot/grub/grub.cfg <<EOF
set timeout=3
set default=0

menuentry "NAS-PRO OS" {
    linux /boot/vmlinuz boot=live quiet
    initrd /boot/initrd.img
}

menuentry "NAS-PRO Debug" {
    linux /boot/vmlinuz boot=live debug
    initrd /boot/initrd.img
}
EOF

# -----------------------------
# 6. BUILD ISO
# -----------------------------
grub-mkrescue -o $OUTPUT $ISO

echo "=== SUCCESS ==="
ls -lh $OUTPUT