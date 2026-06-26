#!/bin/bash
set -e

echo "=== NAS-PRO CLEAN ISO BUILDER (STABLE) ==="

WORKDIR=/tmp/nas-pro
ROOTFS=$WORKDIR/rootfs
ISO=$WORKDIR/iso
OUTPUT=nas-pro.iso

rm -rf $WORKDIR
mkdir -p $ROOTFS $ISO/boot/grub $ISO/live

# -----------------------------
# 1. BASE SYSTEM
# -----------------------------
debootstrap --arch=amd64 bookworm $ROOTFS http://deb.debian.org/debian

cat > $ROOTFS/etc/apt/sources.list <<EOF
deb http://deb.debian.org/debian bookworm main contrib non-free non-free-firmware
deb http://security.debian.org/debian-security bookworm-security main contrib non-free non-free-firmware
EOF

chroot $ROOTFS apt-get update

chroot $ROOTFS apt-get install -y \
  linux-image-amd64 \
  initramfs-tools \
  systemd systemd-sysv dbus sudo \
  nginx openssh-server curl wget git \
  samba nfs-kernel-server \
  live-boot live-config

# -----------------------------
# 2. UI SETUP (NAS OS WEB UI)
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
  <title>NAS-PRO OS</title>
  <style>
    body { font-family: sans-serif; background:#0f172a; color:white; text-align:center; padding-top:80px; }
  </style>
</head>
<body>
  <h1>NAS-PRO OS</h1>
  <p>System booted successfully</p>
</body>
</html>
EOF
fi

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

cat > $ROOTFS/etc/systemd/system/nas-ui.service <<EOF
[Unit]
Description=NAS-PRO UI
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
# 3. KERNEL + INITRAMFS SAFE PICK
# -----------------------------
chroot $ROOTFS update-initramfs -u -k all

VMLINUX=$(find $ROOTFS/boot -name "vmlinuz*" | head -n1)
INITRD=$(find $ROOTFS/boot -name "initrd.img*" | head -n1)

if [ -z "$VMLINUX" ] || [ -z "$INITRD" ]; then
    echo "ERROR: kernel missing in rootfs"
    exit 1
fi

cp "$VMLINUX" $ISO/boot/vmlinuz
cp "$INITRD" $ISO/boot/initrd.img

# -----------------------------
# 4. SQUASHFS
# -----------------------------
mksquashfs $ROOTFS $ISO/live/filesystem.squashfs -e boot

# -----------------------------
# 5. GRUB BOOT
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