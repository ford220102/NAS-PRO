#!/bin/bash
set -e

echo "=== NAS-PRO CLEAN ISO BUILDER ==="

WORKDIR=/tmp/nas-pro
ROOTFS=$WORKDIR/rootfs
ISO=$WORKDIR/iso
OUTPUT=nas-pro.iso

rm -rf $WORKDIR
mkdir -p $ROOTFS $ISO/boot/grub $ISO/live

# -----------------------------
# 1. ROOTFS (Debian)
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
  live-boot live-config

# -----------------------------
# 2. CONFIG SYSTEM
# -----------------------------
echo "nas-pro" > $ROOTFS/etc/hostname

mkdir -p $ROOTFS/var/www/nas-pro
cp -r dist/* $ROOTFS/var/www/nas-pro/ 2>/dev/null || true

cat > $ROOTFS/etc/systemd/system/nas-pro.service <<EOF
[Unit]
Description=NAS-PRO Web UI
After=network.target

[Service]
ExecStart=/usr/sbin/nginx -g 'daemon off;'
Restart=always

[Install]
WantedBy=multi-user.target
EOF

chroot $ROOTFS systemctl enable nas-pro.service
chroot $ROOTFS systemctl enable ssh

# -----------------------------
# 3. SQUASHFS
# -----------------------------
mksquashfs $ROOTFS $ISO/live/filesystem.squashfs -e boot

cp $ROOTFS/boot/vmlinuz-* $ISO/boot/vmlinuz
cp $ROOTFS/boot/initrd.img-* $ISO/boot/initrd.img

# -----------------------------
# 4. GRUB (ONLY BOOTLOADER)
# -----------------------------
cat > $ISO/boot/grub/grub.cfg <<EOF
set timeout=3
set default=0

menuentry "NAS-PRO Boot" {
    linux /boot/vmlinuz boot=live quiet
    initrd /boot/initrd.img
}

menuentry "NAS-PRO Debug" {
    linux /boot/vmlinuz boot=live debug
    initrd /boot/initrd.img
}
EOF

# -----------------------------
# 5. BUILD ISO (CLEAN)
# -----------------------------
grub-mkrescue -o $OUTPUT $ISO

echo "DONE -> $OUTPUT"
ls -lh $OUTPUT