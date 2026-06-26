#!/bin/bash
set -e

echo "=== NAS-PRO BUILDER v2 STABLE ==="

WORKDIR=/tmp/nas-pro
ROOTFS=$WORKDIR/rootfs
ISO=$WORKDIR/iso
OUTPUT=nas-pro.iso

rm -rf $WORKDIR
mkdir -p $ROOTFS $ISO/boot/grub $ISO/live

# -------------------------
# 1. ROOTFS (MINIMAL FIXED)
# -------------------------
debootstrap --arch=amd64 bookworm $ROOTFS http://deb.debian.org/debian

cat > $ROOTFS/etc/apt/sources.list <<EOF
deb http://deb.debian.org/debian bookworm main contrib non-free non-free-firmware
deb http://security.debian.org/debian-security bookworm-security main contrib non-free non-free-firmware
EOF

chroot $ROOTFS apt-get update

# ❌ NIE INSTALUJ linux-image-amd64 (BUG SOURCE)
chroot $ROOTFS apt-get install -y \
  systemd systemd-sysv dbus sudo \
  nginx openssh-server curl wget git \
  live-boot live-config \
  initramfs-tools

# -------------------------
# 2. UI (REACT BUILD / FALLBACK)
# -------------------------
mkdir -p $ROOTFS/var/www/nas-pro

if [ -d "dist" ]; then
  cp -r dist/* $ROOTFS/var/www/nas-pro/
else
  cat > $ROOTFS/var/www/nas-pro/index.html <<EOF
<!DOCTYPE html>
<html>
<head>
  <title>NAS-PRO</title>
  <style>
    body { font-family: Arial; background:#0f172a; color:white; text-align:center; }
    .box { margin-top:20vh; }
  </style>
</head>
<body>
  <div class="box">
    <h1>NAS-PRO SYSTEM</h1>
    <p>UI BOOT ACTIVE</p>
  </div>
</body>
</html>
EOF
fi

# -------------------------
# 3. HOST CONFIG
# -------------------------
echo "nas-pro" > $ROOTFS/etc/hostname

cat > $ROOTFS/etc/systemd/system/nas-pro.service <<EOF
[Unit]
Description=NAS-PRO UI
After=network.target

[Service]
ExecStart=/usr/sbin/nginx -g 'daemon off;'
Restart=always

[Install]
WantedBy=multi-user.target
EOF

chroot $ROOTFS systemctl enable nas-pro.service
chroot $ROOTFS systemctl enable ssh

# -------------------------
# 4. INITRAMFS (SAFE)
# -------------------------
chroot $ROOTFS update-initramfs -c -k all || true

VMLINUX=$(find $ROOTFS/boot -name "vmlinuz*" | head -n1)
INITRD=$(find $ROOTFS/boot -name "initrd.img*" | head -n1)

cp "$VMLINUX" $ISO/boot/vmlinuz
cp "$INITRD" $ISO/boot/initrd.img

# -------------------------
# 5. SQUASHFS
# -------------------------
mksquashfs $ROOTFS $ISO/live/filesystem.squashfs -e boot

# -------------------------
# 6. GRUB (BOOT UI)
# -------------------------
cat > $ISO/boot/grub/grub.cfg <<EOF
set timeout=3
set default=0

menuentry "NAS-PRO UI SYSTEM" {
    linux /boot/vmlinuz boot=live quiet
    initrd /boot/initrd.img
}

menuentry "NAS-PRO DEBUG" {
    linux /boot/vmlinuz boot=live debug
    initrd /boot/initrd.img
}
EOF

# -------------------------
# 7. ISO BUILD
# -------------------------
grub-mkrescue -o $OUTPUT $ISO

echo "=== DONE NAS-PRO v2 ==="
ls -lh $OUTPUT